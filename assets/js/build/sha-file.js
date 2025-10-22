const CryptoJS = require('crypto-js');

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} version
 * @returns {string}
 */
function calculateFileHash(arrayBuffer, version) {
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

    let hash;
    switch (version) {
        case 'sha1':
            hash = CryptoJS.SHA1(wordArray);
            break;
        case 'sha224':
            hash = CryptoJS.SHA224(wordArray);
            break;
        case 'sha256':
            hash = CryptoJS.SHA256(wordArray);
            break;
        case 'sha384':
            hash = CryptoJS.SHA384(wordArray);
            break;
        case 'sha512':
            hash = CryptoJS.SHA512(wordArray);
            break;
        case 'sha3-512':
            hash = CryptoJS.SHA3(wordArray, { outputLength: 512 });
            break;
        case 'sha3-384':
            hash = CryptoJS.SHA3(wordArray, { outputLength: 384 });
            break;
        case 'sha3-256':
            hash = CryptoJS.SHA3(wordArray, { outputLength: 256 });
            break;
        case 'sha3-224':
            hash = CryptoJS.SHA3(wordArray, { outputLength: 224 });
            break;
        default:
            hash = CryptoJS.SHA256(wordArray);
    }
    return hash.toString(CryptoJS.enc.Hex);
}

module.exports = {
    calculateFileHash
};

