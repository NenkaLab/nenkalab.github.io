// 이 파일은 순수 해시 계산 로직만 담당합니다.
// 'crypto-js'가 필요합니다. (npm install crypto-js)
const CryptoJS = require('crypto-js');

/**
 * 텍스트와 버전을 받아 SHA 해시를 계산하는 순수 함수
 * @param {string} text - 해시할 텍스트
 * @param {string} version - SHA 알고리즘 버전 (e.g., 'sha256')
 * @returns {string} Hex로 인코딩된 해시 문자열
 */
function calculateHash(text, version) {
    let hash;
    switch (version) {
        case 'sha1':
            hash = CryptoJS.SHA1(text);
            break;
        case 'sha224':
            hash = CryptoJS.SHA224(text);
            break;
        case 'sha256':
            hash = CryptoJS.SHA256(text);
            break;
        case 'sha384':
            hash = CryptoJS.SHA384(text);
            break;
        case 'sha512':
            hash = CryptoJS.SHA512(text);
            break;
        case 'sha3-512':
            hash = CryptoJS.SHA3(text, { outputLength: 512 });
            break;
        case 'sha3-384':
            hash = CryptoJS.SHA3(text, { outputLength: 384 });
            break;
        case 'sha3-256':
            hash = CryptoJS.SHA3(text, { outputLength: 256 });
            break;
        case 'sha3-224':
            hash = CryptoJS.SHA3(text, { outputLength: 224 });
            break;
        default:
            hash = CryptoJS.SHA256(text); // 기본값
    }
    // 결과를 Hex 문자열로 반환
    return hash.toString(CryptoJS.enc.Hex);
}

// CommonJS 방식으로 함수를 내보냅니다.
module.exports = {
    calculateHash
};
