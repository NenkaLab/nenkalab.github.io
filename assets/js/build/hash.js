// 모든 해시 알고리즘 지원 (browserify로 빌드)
const CryptoJS = require('crypto-js');
const sha3 = require('js-sha3');
const blake2 = require('blakejs');
const createHash = require('create-hash');
const xxhash = require('xxhashjs');

/**
 * 텍스트의 해시를 계산하는 함수 (모든 알고리즘)
 * @param {string} text - 해시할 텍스트
 * @param {string} algorithm - 해시 알고리즘
 * @returns {string} Hex 인코딩된 해시 문자열
 */
function calculateHash(text, algorithm) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    let hash;
    
    switch (algorithm.toLowerCase()) {
        // ========== MD Family ==========
        case 'md4':
            return createHash('md4').update(text).digest('hex');
        case 'md5':
            hash = CryptoJS.MD5(text);
            return hash.toString(CryptoJS.enc.Hex);
            
        // ========== SHA-0 / SHA-1 ==========
        case 'sha':
        case 'sha0':
            // SHA-0는 거의 구현이 없음, SHA-1로 대체
            console.warn('SHA-0 not available, using SHA-1');
            hash = CryptoJS.SHA1(text);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha1':
        case 'sha-1':
            hash = CryptoJS.SHA1(text);
            return hash.toString(CryptoJS.enc.Hex);
            
        // ========== SHA-2 Family ==========
        case 'sha224':
        case 'sha-224':
            hash = CryptoJS.SHA224(text);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha256':
        case 'sha-256':
            hash = CryptoJS.SHA256(text);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha384':
        case 'sha-384':
            hash = CryptoJS.SHA384(text);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha512':
        case 'sha-512':
            hash = CryptoJS.SHA512(text);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha512-224':
        case 'sha512/224':
            return createHash('sha512-224').update(text).digest('hex');
        case 'sha512-256':
        case 'sha512/256':
            return createHash('sha512-256').update(text).digest('hex');
            
        // ========== SHA-3 Family ==========
        case 'sha3-224':
            return sha3.sha3_224(text);
        case 'sha3-256':
            return sha3.sha3_256(text);
        case 'sha3-384':
            return sha3.sha3_384(text);
        case 'sha3-512':
            return sha3.sha3_512(text);
            
        // ========== Keccak ==========
        case 'keccak224':
        case 'keccak-224':
            return sha3.keccak224(text);
        case 'keccak256':
        case 'keccak-256':
            return sha3.keccak256(text);
        case 'keccak384':
        case 'keccak-384':
            return sha3.keccak384(text);
        case 'keccak512':
        case 'keccak-512':
            return sha3.keccak512(text);
            
        // ========== SHAKE ==========
        case 'shake128':
            return sha3.shake128(text, 256);
        case 'shake256':
            return sha3.shake256(text, 512);
            
        // ========== BLAKE2 ==========
        case 'blake2b':
        case 'blake2b-512':
            return blake2.blake2bHex(text);
        case 'blake2b-256':
            return blake2.blake2bHex(text, null, 32);
        case 'blake2b-384':
            return blake2.blake2bHex(text, null, 48);
        case 'blake2s':
        case 'blake2s-256':
            return blake2.blake2sHex(text);
        case 'blake2s-224':
            return blake2.blake2sHex(text, null, 28);
        case 'blake2s-160':
            return blake2.blake2sHex(text, null, 20);
        case 'blake2s-128':
            return blake2.blake2sHex(text, null, 16);
            
        // ========== RIPEMD Family ==========
        case 'ripemd':
        case 'ripemd160':
        case 'ripemd-160':
            hash = CryptoJS.RIPEMD160(text);
            return hash.toString(CryptoJS.enc.Hex);
        case 'rmd160':
            return createHash('rmd160').update(text).digest('hex');
            
        // ========== Whirlpool ==========
        case 'whirlpool':
            return createHash('whirlpool').update(text).digest('hex');
            
        // ========== 비암호학적 해시 (체크섬/고속) ==========
        case 'xxhash32':
        case 'xxh32':
            return xxhash.h32(text, 0).toString(16).padStart(8, '0');
        case 'xxhash64':
        case 'xxh64':
            return xxhash.h64(text, 0).toString(16).padStart(16, '0');
            
        default:
            // 기본값: SHA-256
            hash = CryptoJS.SHA256(text);
            return hash.toString(CryptoJS.enc.Hex);
    }
}

/**
 * 키 기반 해시 (HMAC)
 * @param {string} text - 해시할 텍스트
 * @param {string} key - HMAC 키
 * @param {string} algorithm - 해시 알고리즘
 * @returns {string} Hex 인코딩된 HMAC
 */
function calculateHMAC(text, key, algorithm) {
    let hmac;
    
    switch (algorithm.toLowerCase()) {
        case 'md5':
            hmac = CryptoJS.HmacMD5(text, key);
            break;
        case 'sha1':
        case 'sha-1':
            hmac = CryptoJS.HmacSHA1(text, key);
            break;
        case 'sha224':
        case 'sha-224':
            hmac = CryptoJS.HmacSHA224(text, key);
            break;
        case 'sha256':
        case 'sha-256':
            hmac = CryptoJS.HmacSHA256(text, key);
            break;
        case 'sha384':
        case 'sha-384':
            hmac = CryptoJS.HmacSHA384(text, key);
            break;
        case 'sha512':
        case 'sha-512':
            hmac = CryptoJS.HmacSHA512(text, key);
            break;
        case 'ripemd160':
        case 'ripemd-160':
            hmac = CryptoJS.HmacRIPEMD160(text, key);
            break;
        default:
            hmac = CryptoJS.HmacSHA256(text, key);
    }
    
    return hmac.toString(CryptoJS.enc.Hex);
}

/**
 * PBKDF2 (패스워드 기반 키 유도)
 * @param {string} password - 패스워드
 * @param {string} salt - 솔트
 * @param {number} iterations - 반복 횟수
 * @param {number} keySize - 키 크기 (워드 단위, 1워드 = 32비트)
 * @param {string} algorithm - 해시 알고리즘
 * @returns {string} Hex 인코딩된 키
 */
function calculatePBKDF2(password, salt, iterations, keySize, algorithm) {
    let hasher;
    
    switch (algorithm.toLowerCase()) {
        case 'sha1':
        case 'sha-1':
            hasher = CryptoJS.algo.SHA1;
            break;
        case 'sha256':
        case 'sha-256':
            hasher = CryptoJS.algo.SHA256;
            break;
        case 'sha512':
        case 'sha-512':
            hasher = CryptoJS.algo.SHA512;
            break;
        default:
            hasher = CryptoJS.algo.SHA256;
    }
    
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: keySize,
        iterations: iterations,
        hasher: hasher
    });
    
    return key.toString(CryptoJS.enc.Hex);
}

/**
 * 패스워드 해싱 함수 (bcrypt, scrypt 등)
 * @param {string} password - 패스워드
 * @param {string} algorithm - 알고리즘
 * @param {object} options - 옵션 (rounds, N, r, p 등)
 * @returns {Promise<string>} 해시된 패스워드
 */
async function calculatePasswordHash(password, algorithm, options = {}) {
    switch (algorithm.toLowerCase()) {
        case 'bcrypt':
            const bcrypt = require('bcryptjs');
            const saltRounds = options.rounds || 10;
            return await bcrypt.hash(password, saltRounds);
            
        case 'scrypt':
            const scrypt = require('scrypt-js');
            const salt = options.salt || new Uint8Array(16);
            const N = options.N || 16384;
            const r = options.r || 8;
            const p = options.p || 1;
            const dkLen = options.dkLen || 32;
            
            const passwordBuffer = new TextEncoder().encode(password);
            const key = await scrypt.scrypt(passwordBuffer, salt, N, r, p, dkLen);
            return Buffer.from(key).toString('hex');
            
        default:
            throw new Error(`Unsupported password hashing algorithm: ${algorithm}`);
    }
}

module.exports = {
    calculateHash,
    calculateHMAC,
    calculatePBKDF2,
    calculatePasswordHash
};