const iconv = require('iconv-lite');
const { Buffer } = require('buffer/');

/**
 * 문자열을 지정된 인코딩의 바이트 배열(Uint8Array)로 변환합니다.
 * @param {string} str - 변환할 문자열.
 * @param {string} encoding - 사용할 인코딩 (예: 'utf8', 'utf16le', 'euc-kr').
 * @returns {Uint8Array} 변환된 바이트 배열.
 */
function stringToBytes(str, encoding) {
    const normalizedEncoding = encoding.toLowerCase().replace(/[^a-z0-9]/g, '');

    switch(normalizedEncoding) {
        case 'utf8':
        case 'utf-8':
            return new TextEncoder().encode(str);
        
        case 'utf16le': {
            const buffer16le = new ArrayBuffer(str.length * 2);
            const view16le = new Uint16Array(buffer16le);
            for (let i = 0; i < str.length; i++) {
                view16le[i] = str.charCodeAt(i);
            }
            return new Uint8Array(buffer16le);
        }
        case 'utf16be': {
            const buffer16be = new ArrayBuffer(str.length * 2);
            const view16be = new DataView(buffer16be);
            for (let i = 0; i < str.length; i++) {
                view16be.setUint16(i * 2, str.charCodeAt(i), false); // big-endian
            }
            return new Uint8Array(buffer16be);
        }
        
        case 'utf32le': {
            const codePoints = Array.from(str).map(char => char.codePointAt(0));
            const buffer32le = new ArrayBuffer(codePoints.length * 4);
            const view32le = new DataView(buffer32le);
            for (let i = 0; i < codePoints.length; i++) {
                view32le.setUint32(i * 4, codePoints[i], true); // little-endian
            }
            return new Uint8Array(buffer32le);
        }
        case 'utf32be': {
            const codePoints = Array.from(str).map(char => char.codePointAt(0));
            const buffer32be = new ArrayBuffer(codePoints.length * 4);
            const view32be = new DataView(buffer32be);
            for (let i = 0; i < codePoints.length; i++) {
                view32be.setUint32(i * 4, codePoints[i], false); // big-endian
            }
            return new Uint8Array(buffer32be);
        }

        case 'latin1':
        case 'iso88591':
        case 'ascii': {
            const latin1Array = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
                latin1Array[i] = str.charCodeAt(i) & 0xFF;
            }
            return latin1Array;
        }
        
        default:
            try {
                const buffer = iconv.encode(str, encoding);
                return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            } catch (e) {
                console.warn(`[stringToBytes] '${encoding}' 인코딩 실패. UTF-8로 대체.`, e.message);
                return new TextEncoder().encode(str);
            }
    }
}

/**
 * 바이트 배열(Uint8Array)을 지정된 인코딩의 문자열로 변환합니다.
 * @param {Uint8Array} uint8Array - 변환할 바이트 배열.
 * @param {string} encoding - 사용할 인코딩 (예: 'utf8', 'euc-kr').
 * @returns {string} 변환된 문자열.
 */
function bytesToString(uint8Array, encoding) {
    const normalizedEncoding = encoding.toLowerCase().replace(/[^a-z0-9]/g, '');

    switch(normalizedEncoding) {
        case 'utf8':
        case 'utf-8':
        case 'utf16le':
        case 'utf16be':
        case 'latin1':
        case 'iso88591':
        case 'ascii':
            try {
                return new TextDecoder(encoding).decode(uint8Array);
            } catch (e) {
                 console.warn(`[bytesToString] 네이티브 디코딩 실패. iconv로 대체.`, e.message);
            }
        
        case 'utf32le': {
            const view32le = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
            let str = '';
            for (let i = 0; i < view32le.byteLength; i += 4) {
                str += String.fromCodePoint(view32le.getUint32(i, true));
            }
            return str;
        }
        case 'utf32be': {
            const view32be = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
            let str = '';
            for (let i = 0; i < view32be.byteLength; i += 4) {
                str += String.fromCodePoint(view32be.getUint32(i, false));
            }
            return str;
        }

        default:
            try {
                const buffer = Buffer.from(uint8Array);
                return iconv.decode(buffer, encoding);
            } catch (e) {
                console.warn(`[bytesToString] '${encoding}' 디코딩 실패. UTF-8로 대체.`, e.message);
                return new TextDecoder().decode(uint8Array);
            }
    }
}

const allSupportedEncodings = [
    // --- Native (Manual JS) ---
    // 수동 JS 구현으로 가장 빠릅니다.
    { value: 'utf8', label: 'UTF-8', group: 'Unicode', support: 'native' },
    { value: 'utf16le', label: 'UTF-16 LE', group: 'Unicode', support: 'native' },
    { value: 'utf16be', label: 'UTF-16 BE', group: 'Unicode', support: 'native' },
    { value: 'utf32le', label: 'UTF-32 LE', group: 'Unicode', support: 'native' },
    { value: 'utf32be', label: 'UTF-32 BE', group: 'Unicode', support: 'native' },
    { value: 'latin1', label: 'Latin-1 (ISO-8859-1)', group: 'Western European', support: 'native' },
    { value: 'iso-8859-1', label: 'ISO-8859-1', group: 'Western European', support: 'native' },
    { value: 'ascii', label: 'ASCII', group: 'Western European', support: 'native' },
    
    // --- Unicode (iconv) ---
    // BOM 처리 등이 포함된 iconv-lite 버전입니다.
    { value: 'utf16', label: 'UTF-16 (BOM)', group: 'Unicode', support: 'iconv' },
    { value: 'utf32', label: 'UTF-32 (BOM)', group: 'Unicode', support: 'iconv' },
    { value: 'utf7', label: 'UTF-7', group: 'Unicode', support: 'iconv' },
    { value: 'utf7-imap', label: 'UTF-7 IMAP', group: 'Unicode', support: 'iconv' },
    { value: 'cesu8', label: 'CESU-8', group: 'Unicode', support: 'iconv' },

    // --- Data (iconv) ---
    // 텍스트 인코딩은 아니지만 iconv-lite가 지원합니다.
    { value: 'base64', label: 'Base64', group: 'Binary/Data', support: 'iconv' },
    { value: 'hex', label: 'Hex', group: 'Binary/Data', support: 'iconv' },
    { value: 'binary', label: 'Binary', group: 'Binary/Data', support: 'iconv' },

    // --- Asian (Multi-byte, iconv) ---
    { value: 'euc-kr', label: 'EUC-KR (Korean)', group: 'Asian', support: 'iconv' },
    { value: 'cp949', label: 'CP949 (Korean)', group: 'Asian', support: 'iconv' },
    { value: 'windows949', label: 'Windows-949 (Korean)', group: 'Asian', support: 'iconv' },
    { value: 'ks_c_5601', label: 'KS C 5601 (Korean)', group: 'Asian', support: 'iconv' },
    { value: 'shift_jis', label: 'Shift-JIS (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'windows932', label: 'Windows-932 (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'windows-31j', label: 'Windows-31j (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'euc-jp', label: 'EUC-JP (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'iso-2022-jp', label: 'ISO-2022-JP (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'gb2312', label: 'GB2312 (Chinese Simplified)', group: 'Asian', support: 'iconv' },
    { value: 'gbk', label: 'GBK (Chinese)', group: 'Asian', support: 'iconv' },
    { value: 'gb18030', label: 'GB18030 (Chinese)', group: 'Asian', support: 'iconv' },
    { value: 'windows936', label: 'Windows-936 (Chinese)', group: 'Asian', support: 'iconv' },
    { value: 'euc-cn', label: 'EUC-CN (Chinese)', group: 'Asian', support: 'iconv' },
    { value: 'big5', label: 'Big5 (Chinese Traditional)', group: 'Asian', support: 'iconv' },
    { value: 'big5-hkscs', label: 'Big5-HKSCS (Chinese Traditional)', group: 'Asian', support: 'iconv' },
    { value: 'windows950', label: 'Windows-950 (Chinese Traditional)', group: 'Asian', support: 'iconv' },

    // --- Windows (Single-byte, iconv) ---
    { value: 'windows-874', label: 'Windows-874 (Thai)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1250', label: 'Windows-1250 (Central European)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1251', label: 'Windows-1251 (Cyrillic)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1252', label: 'Windows-1252 (Western)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1253', label: 'Windows-1253 (Greek)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1254', label: 'Windows-1254 (Turkish)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1255', label: 'Windows-1255 (Hebrew)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1256', label: 'Windows-1256 (Arabic)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1257', label: 'Windows-1257 (Baltic)', group: 'Windows', support: 'iconv' },
    { value: 'windows-1258', label: 'Windows-1258 (Vietnamese)', group: 'Windows', support: 'iconv' },

    // --- ISO-8859 (Single-byte, iconv) ---
    { value: 'iso-8859-2', label: 'ISO-8859-2 (Central European)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-3', label: 'ISO-8859-3 (South European)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-4', label: 'ISO-8859-4 (North European)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-5', label: 'ISO-8859-5 (Cyrillic)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-6', label: 'ISO-8859-6 (Arabic)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-7', label: 'ISO-8859-7 (Greek)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-8', label: 'ISO-8859-8 (Hebrew)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-9', label: 'ISO-8859-9 (Turkish)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-10', label: 'ISO-8859-10 (Nordic)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-11', label: 'ISO-8859-11 (Thai)', group: 'ISO-8859', support: 'iconv' }, // tis620
    { value: 'iso-8859-13', label: 'ISO-8859-13 (Baltic)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-14', label: 'ISO-8859-14 (Celtic)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-15', label: 'ISO-8859-15 (Western w/ Euro)', group: 'ISO-8859', support: 'iconv' },
    { value: 'iso-8859-16', label: 'ISO-8859-16 (SE European)', group: 'ISO-8859', support: 'iconv' },

    // --- IBM/DOS (Single-byte, iconv) ---
    { value: 'ibm437', label: 'IBM437 (DOS US)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm720', label: 'IBM720 (DOS Arabic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm737', label: 'IBM737 (DOS Greek)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm775', label: 'IBM775 (DOS Baltic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm808', label: 'IBM808', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm850', label: 'IBM850 (DOS Western European)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm852', label: 'IBM852 (DOS Central European)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm855', label: 'IBM855 (DOS Cyrillic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm856', label: 'IBM856 (DOS Hebrew)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm857', label: 'IBM857 (DOS Turkish)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm858', label: 'IBM858', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm860', label: 'IBM860 (DOS Portuguese)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm861', label: 'IBM861 (DOS Icelandic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm862', label: 'IBM862 (DOS Hebrew)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm863', label: 'IBM863 (DOS Canadian French)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm864', label: 'IBM864 (DOS Arabic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm865', label: 'IBM865 (DOS Nordic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm866', label: 'IBM866 (DOS Cyrillic)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm869', label: 'IBM869 (DOS Greek)', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm922', label: 'IBM922', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1046', label: 'IBM1046', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1124', label: 'IBM1124', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1125', label: 'IBM1125', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1129', label: 'IBM1129', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1133', label: 'IBM1133', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1161', label: 'IBM1161', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1162', label: 'IBM1162', group: 'IBM/DOS', support: 'iconv' },
    { value: 'ibm1163', label: 'IBM1163', group: 'IBM/DOS', support: 'iconv' },

    // --- Macintosh (Single-byte, iconv) ---
    { value: 'macintosh', label: 'Macintosh (MacRoman)', group: 'Macintosh', support: 'iconv' },
    { value: 'macroman', label: 'MacRoman', group: 'Macintosh', support: 'iconv' },
    { value: 'maccenteuro', label: 'MacCentralEurope', group: 'Macintosh', support: 'iconv' },
    { value: 'maccroatian', label: 'MacCroatian', group: 'Macintosh', support: 'iconv' },
    { value: 'maccyrillic', label: 'MacCyrillic', group: 'Macintosh', support: 'iconv' },
    { value: 'macgreek', label: 'MacGreek', group: 'Macintosh', support: 'iconv' },
    { value: 'maciceland', label: 'MacIceland', group: 'Macintosh', support: 'iconv' },
    { value: 'macromania', label: 'MacRomania', group: 'Macintosh', support: 'iconv' },
    { value: 'macthai', label: 'MacThai', group: 'Macintosh', support: 'iconv' },
    { value: 'macturkish', label: 'MacTurkish', group: 'Macintosh', support: 'iconv' },
    { value: 'macukraine', label: 'MacUkraine', group: 'Macintosh', support: 'iconv' },
    
    // --- KOI8 (Single-byte, iconv) ---
    { value: 'koi8-r', label: 'KOI8-R (Russian)', group: 'KOI8', support: 'iconv' },
    { value: 'koi8-u', label: 'KOI8-U (Ukrainian)', group: 'KOI8', support: 'iconv' },
    { value: 'koi8-ru', label: 'KOI8-RU (Russian/Ukrainian)', group: 'KOI8', support: 'iconv' },
    { value: 'koi8-t', label: 'KOI8-T (Tajik)', group: 'KOI8', support: 'iconv' },
    
    // --- Miscellaneous (iconv) ---
    { value: 'armscii8', label: 'ArmSCII-8 (Armenian)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'rk1048', label: 'RK1048 (Kazakh)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'tcvn', label: 'TCVN-3 (Vietnamese)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'viscii', label: 'VISCII (Vietnamese)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'georgianacademy', label: 'Georgian Academy', group: 'Miscellaneous', support: 'iconv' },
    { value: 'georgianps', label: 'Georgian PS', group: 'Miscellaneous', support: 'iconv' },
    { value: 'pt154', label: 'PT154 (Cyrillic)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'iso646cn', label: 'ISO-646 CN (Chinese)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'iso646jp', label: 'ISO-646 JP (Japanese)', group: 'Miscellaneous', support: 'iconv' },
    { value: 'hproman8', label: 'HP Roman 8', group: 'Miscellaneous', support: 'iconv' },
    { value: 'tis620', label: 'TIS-620 (Thai)', group: 'Miscellaneous', support: 'iconv' },
];

module.exports = {
    stringToBytes,
    bytesToString,
    allSupportedEncodings
};


