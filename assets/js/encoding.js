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
                latin1Array[i] = str.charCodeAt(i) & 0xFF; // 0xFF 초과분은 잘림
            }
            return latin1Array;
        }
        
        default:
            if (typeof iconv === 'undefined') {
                console.error(
                    `[stringToBytes] iconv-lite 라이브러리가 없습니다. '${encoding}'를 UTF-8로 대체합니다.` +
                    `HTML에 <script src="https://cdn.jsdelivr.net/npm/iconv-lite@0.6.3/dist/iconv-lite.min.js"></script> 를 추가하세요.`
                );
                return new TextEncoder().encode(str);
            }

            try {
                const buffer = iconv.encode(str, encoding);
                return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            } catch (e) {
                console.warn(`[stringToBytes] '${encoding}' 인코딩 실패. UTF-8로 대체.`, e.message);
                return new TextEncoder().encode(str);
            }
    }
}

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
            if (typeof iconv === 'undefined') {
                console.error(
                    `[bytesToString] iconv-lite 라이브러리가 없습니다. '${encoding}'를 UTF-8로 대체합니다.` +
                    `HTML에 <script src="https://cdn.jsdelivr.net/npm/iconv-lite@0.6.3/dist/iconv-lite.min.js"></script> 를 추가하세요.`
                );
                return new TextDecoder().decode(uint8Array);
            }

            try {
                // iconv-lite가 Uint8Array를 직접 받지 못하므로 Buffer로 변환
                const buffer = Buffer.from(uint8Array);
                return iconv.decode(buffer, encoding);
            } catch (e) {
                console.warn(`[bytesToString] '${encoding}' 디코딩 실패. UTF-8로 대체.`, e.message);
                return new TextDecoder().decode(uint8Array);
            }
    }
}

const allSupportedEncodings = [
    { value: 'utf8', label: 'UTF-8', group: 'Unicode', support: 'native' },
    { value: 'utf16le', label: 'UTF-16 LE', group: 'Unicode', support: 'native' },
    { value: 'utf16be', label: 'UTF-16 BE', group: 'Unicode', support: 'native' },
    { value: 'utf32le', label: 'UTF-32 LE', group: 'Unicode', support: 'native' },
    { value: 'utf32be', label: 'UTF-32 BE', group: 'Unicode', support: 'native' },
    
    { value: 'latin1', label: 'Latin-1 (ISO-8859-1)', group: 'Western European', support: 'native' },
    { value: 'iso-8859-1', label: 'ISO-8859-1', group: 'Western European', support: 'native' },
    { value: 'iso-8859-15', label: 'ISO-8859-15', group: 'Western European', support: 'iconv' },
    { value: 'windows-1252', label: 'Windows-1252', group: 'Western European', support: 'iconv' },
    { value: 'ascii', label: 'ASCII', group: 'Western European', support: 'native' },
    
    { value: 'euc-kr', label: 'EUC-KR (Korean)', group: 'Asian', support: 'iconv' },
    { value: 'cp949', label: 'CP949 (Korean)', group: 'Asian', support: 'iconv' },
    { value: 'shift_jis', label: 'Shift-JIS (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'euc-jp', label: 'EUC-JP (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'iso-2022-jp', label: 'ISO-2022-JP (Japanese)', group: 'Asian', support: 'iconv' },
    { value: 'gb2312', label: 'GB2312 (Chinese Simplified)', group: 'Asian', support: 'iconv' },
    { value: 'gbk', label: 'GBK (Chinese)', group: 'Asian', support: 'iconv' },
    { value: 'gb18030', label: 'GB18030 (Chinese)', group: 'Asian', support: 'iconv' },
    { value: 'big5', label: 'Big5 (Chinese Traditional)', group: 'Asian', support: 'iconv' },
    
    { value: 'iso-8859-5', label: 'ISO-8859-5 (Cyrillic)', group: 'Cyrillic', support: 'iconv' },
    { value: 'windows-1251', label: 'Windows-1251 (Cyrillic)', group: 'Cyrillic', support: 'iconv' },
    { value: 'koi8-r', label: 'KOI8-R (Russian)', group: 'Cyrillic', support: 'iconv' },
    { value: 'koi8-u', label: 'KOI8-U (Ukrainian)', group: 'Cyrillic', support: 'iconv' },
    
    { value: 'iso-8859-2', label: 'ISO-8859-2 (Central European)', group: 'Other', support: 'iconv' },
    { value: 'iso-8859-3', label: 'ISO-8859-3 (South European)', group: 'Other', support: 'iconv' },
    { value: 'iso-8859-4', label: 'ISO-8859-4 (North European)', group: 'Other', support: 'iconv' },
    { value: 'iso-8859-6', label: 'ISO-8859-6 (Arabic)', group: 'Other', support: 'iconv' },
    { value: 'iso-8859-7', label: 'ISO-8859-7 (Greek)', group: 'Other', support: 'iconv' },
    { value: 'iso-8859-8', label: 'ISO-8859-8 (Hebrew)', group: 'Other', support: 'iconv' },
    { value: 'windows-1250', label: 'Windows-1250 (Central European)', group: 'Other', support: 'iconv' },
    { value: 'windows-1253', label: 'Windows-1253 (Greek)', group: 'Other', support: 'iconv' },
    { value: 'windows-1254', label: 'Windows-1254 (Turkish)', group: 'Other', support: 'iconv' },
    { value: 'windows-1255', label: 'Windows-1255 (Hebrew)', group: 'Other', support: 'iconv' },
    { value: 'windows-1256', label: 'Windows-1256 (Arabic)', group: 'Other', support: 'iconv' },
    { value: 'windows-1257', label: 'Windows-1257 (Baltic)', group: 'Other', support: 'iconv' },
    { value: 'windows-1258', label: 'Windows-1258 (Vietnamese)', group: 'Other', support: 'iconv' }
].filter(enc => 
    enc.support === 'native' || 
    enc.support === 'iconv' && (typeof iconv !== 'undefined')
);