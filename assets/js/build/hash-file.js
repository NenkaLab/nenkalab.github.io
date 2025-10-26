// 모든 해시 알고리즘 지원 파일 해싱 (browserify로 빌드)
const CryptoJS = require('crypto-js');
const sha3 = require('js-sha3');
const blake2 = require('blakejs');
const createHash = require('create-hash');
const xxhash = require('xxhashjs');

/**
 * ArrayBuffer를 Uint8Array로 변환
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Uint8Array}
 */
function arrayBufferToUint8Array(arrayBuffer) {
    return new Uint8Array(arrayBuffer);
}

/**
 * ArrayBuffer를 해시하는 함수 (모든 알고리즘)
 * @param {ArrayBuffer} arrayBuffer - 해시할 파일 데이터
 * @param {string} algorithm - 해시 알고리즘
 * @returns {string} Hex 인코딩된 해시 문자열
 */
function calculateFileHash(arrayBuffer, algorithm) {
    const uint8Array = arrayBufferToUint8Array(arrayBuffer);
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const buffer = Buffer.from(uint8Array);
    let hash;
    
    switch (algorithm.toLowerCase()) {
        // ========== MD Family ==========
        case 'md4':
            return createHash('md4').update(buffer).digest('hex');
        case 'md5':
            hash = CryptoJS.MD5(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
            
        // ========== SHA-0 / SHA-1 ==========
        case 'sha':
        case 'sha0':
            console.warn('SHA-0 not available, using SHA-1');
            hash = CryptoJS.SHA1(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha1':
        case 'sha-1':
            hash = CryptoJS.SHA1(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
            
        // ========== SHA-2 Family ==========
        case 'sha224':
        case 'sha-224':
            hash = CryptoJS.SHA224(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha256':
        case 'sha-256':
            hash = CryptoJS.SHA256(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha384':
        case 'sha-384':
            hash = CryptoJS.SHA384(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha512':
        case 'sha-512':
            hash = CryptoJS.SHA512(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
        case 'sha512-224':
        case 'sha512/224':
            return createHash('sha512-224').update(buffer).digest('hex');
        case 'sha512-256':
        case 'sha512/256':
            return createHash('sha512-256').update(buffer).digest('hex');
            
        // ========== SHA-3 Family ==========
        case 'sha3-224':
            return sha3.sha3_224(uint8Array);
        case 'sha3-256':
            return sha3.sha3_256(uint8Array);
        case 'sha3-384':
            return sha3.sha3_384(uint8Array);
        case 'sha3-512':
            return sha3.sha3_512(uint8Array);
            
        // ========== Keccak ==========
        case 'keccak224':
        case 'keccak-224':
            return sha3.keccak224(uint8Array);
        case 'keccak256':
        case 'keccak-256':
            return sha3.keccak256(uint8Array);
        case 'keccak384':
        case 'keccak-384':
            return sha3.keccak384(uint8Array);
        case 'keccak512':
        case 'keccak-512':
            return sha3.keccak512(uint8Array);
            
        // ========== SHAKE ==========
        case 'shake128':
            return sha3.shake128(uint8Array, 256);
        case 'shake256':
            return sha3.shake256(uint8Array, 512);
            
        // ========== BLAKE2 ==========
        case 'blake2b':
        case 'blake2b-512':
            return blake2.blake2bHex(uint8Array);
        case 'blake2b-256':
            return blake2.blake2bHex(uint8Array, null, 32);
        case 'blake2b-384':
            return blake2.blake2bHex(uint8Array, null, 48);
        case 'blake2s':
        case 'blake2s-256':
            return blake2.blake2sHex(uint8Array);
        case 'blake2s-224':
            return blake2.blake2sHex(uint8Array, null, 28);
        case 'blake2s-160':
            return blake2.blake2sHex(uint8Array, null, 20);
        case 'blake2s-128':
            return blake2.blake2sHex(uint8Array, null, 16);
            
        // ========== RIPEMD Family ==========
        case 'ripemd':
        case 'ripemd160':
        case 'ripemd-160':
            hash = CryptoJS.RIPEMD160(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
        case 'rmd160':
            return createHash('rmd160').update(buffer).digest('hex');
            
        // ========== Whirlpool ==========
        case 'whirlpool':
            return createHash('whirlpool').update(buffer).digest('hex');
            
        // ========== 비암호학적 해시 (체크섬/고속) ==========
        case 'xxhash32':
        case 'xxh32':
            return xxhash.h32(buffer, 0).toString(16).padStart(8, '0');
        case 'xxhash64':
        case 'xxh64':
            return xxhash.h64(buffer, 0).toString(16).padStart(16, '0');
            
        default:
            // 기본값: SHA-256
            hash = CryptoJS.SHA256(wordArray);
            return hash.toString(CryptoJS.enc.Hex);
    }
}

module.exports = {
    calculateFileHash
};