import iconvLite from 'iconv-lite';

/**
 * 인터페이스 및 타입 정의
 */
interface EncodingOptions {
    /**
     * URL-safe Base64 변형을 사용할지 여부 ('+' 대신 '-', '/' 대신 '_' 사용).
     * 인코딩에만 적용됨. 디코딩은 자동으로 두 변형 모두 처리함.
     */
    urlSafe?: boolean;
    
    /**
     * 인코딩/디코딩에 사용할 인코딩.
     * 지정하지 않으면 기본 인코딩이 사용됩니다.
     */
    encoding?: string;
    
    /**
     * 인코딩/디코딩에 사용할 비밀번호. 
     * 이 값이 제공되면 출력을 암호화하거나 입력을 복호화하는 데 사용됩니다.
     * 브라우저 환경에서는 Web Crypto API를 사용합니다.
     */
    password?: string;

    /**
     * Base64 인코딩 전에 데이터를 압축할지 여부.
     * 이 옵션을 사용하면 큰 텍스트의 경우 출력 크기가 줄어들 수 있습니다.
     */
    compress?: boolean;

    /**
     * Base64 인코딩 시 패딩('=')을 제거할지 여부.
     * URL에 사용할 때 유용할 수 있습니다.
     */
    noPadding?: boolean;

    /**
     * 암호화에 사용되는 PBKDF2 반복 횟수.
     * 기본값은 안전한 값으로 설정되어 있지만, 성능 이유로 조정할 수 있습니다.
     */
    iterations?: number;

    /**
     * SALT 길이 (바이트 단위).
     * 보안과 출력 크기 간의 균형을 조정할 수 있습니다.
     * 최소 8, 최대 32 (권장 16)
     */
    saltLength?: number;

    /**
     * IV(Initialize Vector) 길이 (바이트 단위).
     * AES-GCM의 경우 최소 12바이트를 권장합니다.
     */
    ivLength?: number;

    /**
     * 인코딩/디코딩 시 메타데이터를 포함할지 여부
     * (사용된 인코딩, 압축 여부 등을 추적)
     */
    includeMetadata?: boolean;
}

interface EncodingMetadata {
    encoding: string;
    compressed: boolean;
    version: number;
}

type EncodingResult = string | null;

// --- 상수 및 헬퍼 함수 ---
const DEFAULT_SALT_LENGTH = 8;      // 최소 크기로 조정
const DEFAULT_IV_LENGTH = 12;       // AES-GCM에 필요한 최소값
const DEFAULT_PBKDF2_ITERATIONS = 100000;
const CURRENT_VERSION = 1;          // 메타데이터 버전 관리

// 브라우저 환경에서는 window.crypto 사용
const crypto = window.crypto;

// zlib 모듈 가져오기 (vite-plugin-node-polyfills에서 제공)
import * as zlib from 'zlib';

/**
 * 비밀번호와 솔트로부터 AES-GCM 암호화 키를 안전하게 유도합니다.
 */
async function deriveKeyFromPassword(
    password: string, 
    salt: Uint8Array, 
    iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKeyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
        passwordKeyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
}


/**
 * MultiEncodingBase64Browser 클래스
 * 
 * Svelte/브라우저 환경에서 작동하는 다중 인코딩 Base64 변환기.
 * Web Crypto API를 사용한 암호화 및 폴리필된 zlib을 통한 압축을 제공합니다.
 */
class MultiEncodingBase64Browser {
    private _requestedEncodings: string[] = [];
    private _supportedEncodings: string[] = []; 
    private _defaultEncoding: string | null = 'utf-8';
    private _debugMode: boolean = false;

    /**
     * MultiEncodingBase64Browser 생성자
     * @param debugMode 디버그 메시지를 로그에 출력할지 여부
     */
    constructor(debugMode: boolean = false) {
        this._debugMode = debugMode;
        this._log("MultiEncodingBase64 (Browser version) initialized.");
        
        if (!crypto || !crypto.subtle) {
            this._log("Warning: Web Crypto API is not available in this browser", 'warn');
        }
        
        // 초기 지원 인코딩 설정
        this._ensureUtf8Supported();
    }

    /**
     * 디버그 로그 출력 (debugMode가 활성화된 경우에만)
     */
    private _log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
        if (this._debugMode || level === 'error') {
            switch (level) {
                case 'warn': console.warn(message); break;
                case 'error': console.error(message); break;
                default: console.log(message);
            }
        }
    }

    /**
     * 디버그 모드 설정
     */
    public setDebugMode(enabled: boolean): void {
        this._debugMode = enabled;
        this._log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /** 인코딩이 지원되는지 확인 */
    private _isEncodingSupported(encoding: string): boolean {
        const lowerEnc = encoding.toLowerCase();
        
        // iconv-lite-umd가 지원하는지 확인
        if (iconvLite && iconvLite.encodingExists && iconvLite.encodingExists(lowerEnc)) {
            return true;
        }
        
        // TextDecoder 지원 확인
        try {
            new TextDecoder(lowerEnc);
            return true;
        } catch {
            return false;
        }
    }

    /** UTF-8이 지원되는 경우 지원 목록에 추가 */
    private _ensureUtf8Supported(): void {
        if (this._isEncodingSupported('utf-8') && !this._supportedEncodings.includes('utf-8')) {
            this._supportedEncodings.push('utf-8');
            if (!this._defaultEncoding) this._defaultEncoding = 'utf-8';
        } else if (!this._isEncodingSupported('utf-8')) {
            this._log("CRITICAL: UTF-8 encoding is not supported by this browser!", 'error');
        }
    }

    /**
     * 지원할 인코딩 목록 설정 (환경 지원에 따라 필터링됨)
     */
    public setSupportedEncodings(encodingsList: string[]): void {
        if (!Array.isArray(encodingsList) || encodingsList.some(e => typeof e !== 'string')) {
            this._log("Invalid encodingsList.", 'error');
            return;
        }
        this._requestedEncodings = [...encodingsList];
        const supported = new Set<string>(); // 중복 제거를 위해 Set 사용

        this._log("\nChecking browser support for requested encodings...");

        encodingsList.forEach((enc: string) => {
            const lowerEnc = enc.toLowerCase();
            if (lowerEnc === 'auto-detect') {
                this._log("'AUTO-DETECT' is not supported.", 'warn'); 
                return;
            }
            if (this._isEncodingSupported(lowerEnc)) {
                supported.add(lowerEnc);
                this._log(`✓ '${lowerEnc}' is supported`);
            } else {
                this._log(`✗ '${lowerEnc}' is NOT supported`, 'warn');
            }
        });

        // UTF-8은 항상 추가
        if (this._isEncodingSupported('utf-8')) {
            supported.add('utf-8');
        }

        this._supportedEncodings = Array.from(supported);

        // 지원 여부에 따라 기본 인코딩 재설정
        if (supported.has('utf-8')) {
            this._defaultEncoding = 'utf-8';
        } else if (this._supportedEncodings.length > 0) {
            this._defaultEncoding = this._supportedEncodings[0];
        } else {
            this._defaultEncoding = null;
            this._log("CRITICAL: No supported encodings found!", 'error');
        }

        this._log("\n--- Encoding Support Summary (Browser) ---");
        this._log(`Requested: ${encodingsList.join(', ')}`);
        this._log(`ACTUALLY SUPPORTED: ${this._supportedEncodings.length > 0 ? this._supportedEncodings.join(', ') : 'NONE'}`);
        this._log(`Default encoding: ${this._defaultEncoding || 'None'}`);
        this._log("-------------------------------------------\n");
    }

    /**
     * 현재 환경에서 실제로 지원되는 인코딩 목록 반환
     */
    public getSupportedEncodings(): string[] { 
        return [...this._supportedEncodings]; 
    }

    /**
     * 현재 설정된 기본 인코딩 반환
     */
    public getDefaultEncoding(): string | null { 
        return this._defaultEncoding; 
    }

    /**
     * URL-safe Base64 문자열을 표준 Base64로 변환
     */
    private _urlSafeToStandardBase64(urlSafeBase64: string): string {
        // 패딩 처리 추가 (URL-safe에서 종종 제거됨)
        let base64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
        
        // 패딩이 제거된 경우 복원
        const paddingLength = 4 - (base64.length % 4);
        if (paddingLength < 4) {
            base64 += '='.repeat(paddingLength);
        }
        
        return base64;
    }

    /**
     * 표준 Base64 문자열을 URL-safe Base64로 변환
     */
    private _standardToUrlSafeBase64(standardBase64: string, removePadding: boolean = false): string {
        let result = standardBase64.replace(/\+/g, '-').replace(/\//g, '_');
        
        // 패딩 제거 옵션이 활성화된 경우
        if (removePadding) {
            result = result.replace(/=+$/, '');
        }
        
        return result;
    }

    /**
     * 메타데이터 객체를 바이트 배열로 직렬화
     */
    private _serializeMetadata(metadata: EncodingMetadata): Uint8Array {
        // 간단한 메타데이터 형식: 1바이트 버전 + 1바이트 압축 플래그 + 나머지는 인코딩 문자열
        const encoder = new TextEncoder();
        const encodingBytes = encoder.encode(metadata.encoding);
        const result = new Uint8Array(2 + encodingBytes.length);
        
        result[0] = metadata.version;
        result[1] = metadata.compressed ? 1 : 0;
        result.set(encodingBytes, 2);
        
        return result;
    }

    /**
     * 바이트 배열에서 메타데이터 객체 역직렬화
     */
    private _deserializeMetadata(bytes: Uint8Array): EncodingMetadata | null {
        if (bytes.length < 3) {
            this._log("Invalid metadata format: too short", 'error');
            return null;
        }
        
        try {
            const version = bytes[0];
            const compressed = bytes[1] === 1;
            const encodingBytes = bytes.slice(2);
            const decoder = new TextDecoder('utf-8');
            const encoding = decoder.decode(encodingBytes);
            
            return { version, compressed, encoding };
        } catch (e) {
            this._log(`Error deserializing metadata: ${e}`, 'error');
            return null;
        }
    }

    /**
     * 바이트 배열 압축 (zlib deflate)
     */
    private _compressBytes(bytes: Uint8Array): Uint8Array {
        try {
            // 폴리필된 zlib 사용
            const compressed = zlib.deflateSync(Buffer.from(bytes));
            return new Uint8Array(compressed);
        } catch (e) {
            this._log(`Compression failed: ${e}`, 'error');
            return bytes; // 압축 실패 시 원본 반환
        }
    }

    /**
     * 바이트 배열 압축 해제 (zlib inflate)
     */
    private _decompressBytes(bytes: Uint8Array): Uint8Array {
        try {
            // 폴리필된 zlib 사용
            const decompressed = zlib.inflateSync(Buffer.from(bytes));
            return new Uint8Array(decompressed);
        } catch (e) {
            this._log(`Decompression failed: ${e}`, 'error');
            throw new Error(`Decompression failed: ${e}`);
        }
    }

    /**
     * 바이트 배열을 비밀번호로 암호화
     */
    private async _encryptBytesWithPassword(
        bytes: Uint8Array, 
        password: string, 
        options: EncodingOptions = {}
    ): Promise<Uint8Array | null> {
        if (!crypto || !crypto.subtle) { 
            this._log("Web Crypto API not available.", 'error'); 
            return null; 
        }
        
        if (!password) { 
            this._log("Password empty, returning original bytes.", 'warn'); 
            return bytes; 
        }
        
        if (!bytes || bytes.length === 0) return new Uint8Array();
        
        try {
            // 사용자 지정 값 또는 기본값 사용
            const saltLength = options.saltLength && options.saltLength >= 8 && options.saltLength <= 32
                ? options.saltLength : DEFAULT_SALT_LENGTH;
            const ivLength = options.ivLength && options.ivLength >= 12 && options.ivLength <= 16
                ? options.ivLength : DEFAULT_IV_LENGTH;
            const iterations = options.iterations && options.iterations >= 10000
                ? options.iterations : DEFAULT_PBKDF2_ITERATIONS;
            
            const salt = crypto.getRandomValues(new Uint8Array(saltLength));
            const key = await deriveKeyFromPassword(password, salt, iterations);
            const iv = crypto.getRandomValues(new Uint8Array(ivLength));
            
            this._log(`Encrypting with: Salt=${saltLength}bytes, IV=${ivLength}bytes, Iterations=${iterations}`);
            
            const encryptedContent = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv }, key, bytes
            );
            
            // 구성 메타데이터 추가 (1바이트): saltLength(4비트) | ivLength(4비트)
            const configByte = new Uint8Array(1);
            configByte[0] = ((saltLength - 8) << 4) | (ivLength - 12);
            
            // 결과 조합: configByte + salt + iv + 암호화된 콘텐츠
            const resultBytes = new Uint8Array(1 + saltLength + ivLength + encryptedContent.byteLength);
            resultBytes.set(configByte, 0);
            resultBytes.set(salt, 1);
            resultBytes.set(iv, 1 + saltLength);
            resultBytes.set(new Uint8Array(encryptedContent), 1 + saltLength + ivLength);
            
            return resultBytes;
        } catch (error) { 
            this._log(`Encryption failed: ${error}`, 'error'); 
            return null; 
        }
    }

    /**
     * 암호화된 바이트 배열을 비밀번호로 복호화
     */
    private async _decryptBytesWithPassword(
        encryptedBytesWithMeta: Uint8Array, 
        password: string
    ): Promise<Uint8Array | null> {
        if (!crypto || !crypto.subtle) { 
            this._log("Web Crypto API not available.", 'error'); 
            return null; 
        }
        
        if (!password) { 
            this._log("Password empty, assuming not encrypted.", 'warn'); 
            return encryptedBytesWithMeta; 
        }
        
        if (!encryptedBytesWithMeta || encryptedBytesWithMeta.length < 2) { 
            this._log("Invalid encrypted data: too short.", 'error'); 
            return null; 
        }
        
        try {
            // 구성 바이트 읽기 (첫 번째 바이트)
            const configByte = encryptedBytesWithMeta[0];
            const saltLength = ((configByte >> 4) & 0x0F) + 8;  // 상위 4비트 + 8
            const ivLength = (configByte & 0x0F) + 12;         // 하위 4비트 + 12
            
            this._log(`Decrypting with: Salt=${saltLength}bytes, IV=${ivLength}bytes`);
            
            const expectedMinLength = 1 + saltLength + ivLength;
            if (encryptedBytesWithMeta.length < expectedMinLength) { 
                this._log(`Invalid encrypted data: expected at least ${expectedMinLength} bytes, got ${encryptedBytesWithMeta.length}.`, 'error'); 
                return null; 
            }
            
            const salt = encryptedBytesWithMeta.slice(1, 1 + saltLength);
            const iv = encryptedBytesWithMeta.slice(1 + saltLength, expectedMinLength);
            const ciphertext = encryptedBytesWithMeta.slice(expectedMinLength);
            
            if (ciphertext.length === 0 && encryptedBytesWithMeta.length === expectedMinLength) {
                return new Uint8Array(); // 원본 데이터가 비어있음
            }
            
            if (ciphertext.length === 0) { 
                this._log("Invalid encrypted data: missing ciphertext.", 'error'); 
                return null; 
            }
            
            const key = await deriveKeyFromPassword(password, salt);
            
            try {
                const decryptedContent = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv }, key, ciphertext
                );
                return new Uint8Array(decryptedContent);
            } catch {
                // 복호화 실패 시 더 자세한 오류 메시지
                this._log("Decryption failed. Incorrect password or corrupted data.", 'error');
                return null;
            }
        } catch (error) { 
            this._log(`Decryption process failed: ${error}`, 'error'); 
            return null; 
        }
    }

    /**
     * 문자열을 Base64로 인코딩하고 다양한 옵션 적용 (압축, 암호화 등)
     */
    public async encode(text: string, options: EncodingOptions = {}): Promise<EncodingResult> {
        const targetEncoding = (options?.encoding || this._defaultEncoding || 'utf-8').toLowerCase();

        if (!this._supportedEncodings.includes(targetEncoding)) {
            this._log(`Encoding Error: The encoding '${targetEncoding}' is not supported.`, 'error');
            return null;
        }
        
        if (typeof text !== 'string') { 
            this._log("Input must be a string.", 'error'); 
            return null; 
        }

        try {
            let bytesToProcess: Uint8Array | null = null;

            // 1. 문자열을 바이트로 변환 (iconv-lite-umd 우선)
            if (iconvLite && iconvLite.encode && iconvLite.encodingExists && iconvLite.encodingExists(targetEncoding)) {
                try {
                    bytesToProcess = iconvLite.encode(text, targetEncoding);
                    this._log(`Encoded using iconv-lite-umd (${targetEncoding})`);
                } catch (e) {
                    this._log(`iconv-lite-umd encoding failed: ${e}`, 'error');
                    bytesToProcess = null;
                }
            }

            // TextEncoder 폴백 (주로 UTF-8 또는 iconv가 실패한 경우)
            if (bytesToProcess === null) {
                if (targetEncoding === 'utf-8') {
                    try {
                        const encoder = new TextEncoder();
                        bytesToProcess = encoder.encode(text);
                        this._log(`Encoded using TextEncoder (UTF-8 only)`);
                    } catch (e) {
                        this._log(`TextEncoder encoding failed: ${e}`, 'error');
                    }
                } else {
                    this._log(`Warning: Non-UTF-8 encoding '${targetEncoding}' requested but iconv-lite-umd failed. Falling back to UTF-8.`, 'warn');
                    const encoder = new TextEncoder();
                    bytesToProcess = encoder.encode(text);
                }
            }

            // 모든 방법이 실패한 경우
            if (bytesToProcess === null) {
                this._log(`Failed to convert string to bytes using encoding '${targetEncoding}'.`, 'error');
                return null;
            }

            let processedBytes = bytesToProcess;
            
            // 2. 메타데이터 추가 (옵션으로 활성화된 경우)
            if (options.includeMetadata) {
                const metadata: EncodingMetadata = {
                    encoding: targetEncoding,
                    compressed: !!options.compress,
                    version: CURRENT_VERSION
                };
                
                const metadataBytes = this._serializeMetadata(metadata);
                // 메타데이터 길이(1바이트) + 메타데이터 바이트 + 원본 데이터 바이트
                const combinedBytes = new Uint8Array(1 + metadataBytes.length + processedBytes.length);
                combinedBytes[0] = metadataBytes.length;
                combinedBytes.set(metadataBytes, 1);
                combinedBytes.set(processedBytes, 1 + metadataBytes.length);
                
                processedBytes = combinedBytes;
                this._log(`Added metadata (${metadataBytes.length} bytes)`);
            }

            // 3. 압축 (옵션으로 활성화된 경우)
            if (options.compress) {
                const beforeSize = processedBytes.length;
                processedBytes = this._compressBytes(processedBytes);
                this._log(`Compressed data: ${beforeSize} -> ${processedBytes.length} bytes (${Math.round(processedBytes.length / beforeSize * 100)}%)`);
            }

            // 4. 암호화 (비밀번호가 제공된 경우)
            if (options.password) {
                const encryptedBytes = await this._encryptBytesWithPassword(processedBytes, options.password, options);
                if (encryptedBytes === null) {
                    this._log("Encryption step failed.", 'error');
                    return null;
                }
                processedBytes = encryptedBytes;
                this._log(`Encrypted data (${processedBytes.length} bytes)`);
            }

            // 5. Base64 인코딩 - 브라우저 내장 btoa 사용
            let base64Result = btoa(
                Array.from(processedBytes)
                    .map(byte => String.fromCharCode(byte))
                    .join('')
            );
            
            // 6. URL-safe 및 패딩 옵션 적용
            if (options.urlSafe || options.noPadding) {
                base64Result = this._standardToUrlSafeBase64(base64Result, options.noPadding);
                this._log(`Applied URL-safe${options.noPadding ? ' with no padding' : ''}`);
            }
            
            this._log(`Encoding complete: final size ${base64Result.length} characters`);
            return base64Result;

        } catch (e: unknown) {
            this._log(`Error during encode process: ${e}`, 'error');
            return null;
        }
    }

    /**
     * Base64 문자열을 디코딩하고 다양한 옵션 적용 (압축 해제, 복호화 등)
     */
    public async decode(base64Text: string, options: EncodingOptions = {}): Promise<EncodingResult> {
        let targetEncoding = (options?.encoding || this._defaultEncoding || 'utf-8').toLowerCase();

        if (!this._supportedEncodings.includes(targetEncoding)) {
            this._log(`Decoding Error: The encoding '${targetEncoding}' is not supported.`, 'error');
            return null;
        }
        
        if (typeof base64Text !== 'string') { 
            this._log("Input must be a string.", 'error'); 
            return null; 
        }

        try {
            // 1. Base64 디코딩 - 브라우저 내장 atob 사용
            let processedBytes: Uint8Array;
            try {
                // URL-safe 문자를 표준 Base64로 변환
                const standardBase64 = this._urlSafeToStandardBase64(base64Text);
                
                // atob를 사용하여 디코딩 후 Uint8Array로 변환
                const binaryString = atob(standardBase64);
                processedBytes = new Uint8Array(binaryString.length);
                
                for (let i = 0; i < binaryString.length; i++) {
                    processedBytes[i] = binaryString.charCodeAt(i);
                }
                
                this._log(`Base64 decoded: ${processedBytes.length} bytes`);
            } catch (e) {
                this._log(`Invalid Base64 input: ${e}`, 'error');
                return null;
            }

            // 2. 복호화 (비밀번호가 제공된 경우)
            if (options.password) {
                const decryptedBytes = await this._decryptBytesWithPassword(processedBytes, options.password);
                if (decryptedBytes === null) {
                    this._log("Decryption step failed.", 'error');
                    return null;
                }
                processedBytes = decryptedBytes;
                this._log(`Decrypted data: ${processedBytes.length} bytes`);
            }

            // 3. 메타데이터 확인 및 추출 (첫 바이트가 합리적인 메타데이터 길이인 경우)
            let metadataExtracted = false;
            if (processedBytes.length > 2 && processedBytes[0] > 0 && processedBytes[0] < 30) {
                try {
                    const metadataLength = processedBytes[0];
                    if (processedBytes.length > 1 + metadataLength) {
                        const metadataBytes = processedBytes.slice(1, 1 + metadataLength);
                        const metadata = this._deserializeMetadata(metadataBytes);
                        
                        if (metadata) {
                            this._log(`Found metadata: version=${metadata.version}, encoding=${metadata.encoding}, compressed=${metadata.compressed}`);
                            
                            // 메타데이터에서 압축 및 인코딩 정보 사용
                            if (metadata.compressed) {
                                options.compress = true;
                            }
                            
                            // 메타데이터에서 인코딩 사용 (옵션으로 명시적 지정이 없는 경우)
                            if (!options.encoding && this._supportedEncodings.includes(metadata.encoding)) {
                                targetEncoding = metadata.encoding;
                                this._log(`Using encoding from metadata: ${targetEncoding}`);
                            }
                            
                            // 메타데이터 제거한 데이터 사용
                            processedBytes = processedBytes.slice(1 + metadataLength);
                            metadataExtracted = true;
                        }
                    }
                } catch (e) {
                    // 메타데이터 추출 실패 시 원본 데이터 유지
                    this._log(`Metadata extraction failed: ${e}`, 'warn');
                }
            }
            
            if (!metadataExtracted && options.includeMetadata) {
                this._log(`No metadata found but includeMetadata flag was set`, 'warn');
            }

            // 4. 압축 해제 (압축되었다고 표시된 경우)
            if (options.compress) {
                try {
                    const beforeSize = processedBytes.length;
                    processedBytes = this._decompressBytes(processedBytes);
                    this._log(`Decompressed data: ${beforeSize} -> ${processedBytes.length} bytes`);
                } catch (e) {
                    this._log(`Decompression failed: ${e}. Was this data actually compressed?`, 'error');
                    // 압축 해제 실패 시 원본 바이트를 사용하여 계속 진행
                    // 메타데이터가 삭제되었을 수 있으므로, 원본 데이터가 필요한 경우는 null 반환
                    if (metadataExtracted) {
                        return null;
                    }
                }
            }

            // 5. 바이트를 문자열로 변환 (iconv-lite-umd 우선)
            let decodedString: string | null = null;
            
            if (iconvLite && iconvLite.decode && iconvLite.encodingExists && iconvLite.encodingExists(targetEncoding)) {
                try {
                    decodedString = iconvLite.decode(Buffer.from(processedBytes), targetEncoding);
                    this._log(`Decoded bytes to string using iconv-lite-umd (${targetEncoding})`);
                } catch(e) {
                    this._log(`iconv-lite-umd decoding failed: ${e}`, 'error');
                    decodedString = null;
                }
            }

            // TextDecoder 폴백
            if (decodedString === null) {
                if (targetEncoding === 'utf-8') {
                    try {
                        const decoder = new TextDecoder('utf-8');
                        decodedString = decoder.decode(processedBytes);
                        this._log(`Decoded bytes to string using TextDecoder (UTF-8 only)`);
                    } catch (e) {
                        this._log(`TextDecoder decoding failed: ${e}`, 'error');
                    }
                } else {
                    this._log(`Warning: Non-UTF-8 encoding '${targetEncoding}' requested but iconv-lite-umd failed. Falling back to UTF-8.`, 'warn');
                    try {
                        const decoder = new TextDecoder('utf-8');
                        decodedString = decoder.decode(processedBytes);
                    } catch (e) {
                        this._log(`TextDecoder UTF-8 fallback failed: ${e}`, 'error');
                    }
                }
            }

            // 모든 방법이 실패한 경우
            if (decodedString === null) {
                this._log(`Failed to convert bytes to string using encoding '${targetEncoding}'.`, 'error');
                return null;
            }

            this._log(`Decoding complete: final text length ${decodedString.length} characters`);
            return decodedString;

        } catch (e: unknown) {
            this._log(`Error during decode process: ${e}`, 'error');
            return null;
        }
    }
}

// 모듈로 내보내기
export type { EncodingOptions, EncodingResult, EncodingMetadata };
export default MultiEncodingBase64Browser;