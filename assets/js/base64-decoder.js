// assets/js/base64-decoder.js
(function(run) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})(function() {
    'use strict';

    // LocalForage 설정
    localforage.config({
        name: 'Base64Decoder',
        storeName: 'history'
    });

    // DOM 요소
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const decodeBtn = document.getElementById('decodeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const switchToEncodeBtn = document.getElementById('switchToEncodeBtn');
    const encodingType = document.getElementById('encodingType');
    const charEncoding = document.getElementById('charEncoding');
    const autoDecode = document.getElementById('autoDecode');
    const usePassword = document.getElementById('usePassword');
    const passwordOptions = document.getElementById('passwordOptions');
    const password = document.getElementById('password');
    const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');
    const savePassword = document.getElementById('savePassword');
    const clearHistory = document.getElementById('clearHistory');
    const historyList = document.getElementById('historyList');

    let autoDecodeTimeout;

   function encodingSetup() {
        const groups = EncodingHelper.allSupportedEncodings.reduce((acc, enc) => {
            (acc[enc.group] = acc[enc.group] || []).push(enc);
            return acc;
        }, {});

        charEncoding.innerHTML = '';

        const groupOrder = [
            'Unicode', 
            'Western European', 
            'Binary/Data', 
            'Asian', 
            'Windows', 
            'ISO-8859', 
            'IBM/DOS', 
            'Macintosh', 
            'KOI8', 
            'Miscellaneous'
        ];
        
        groupOrder.forEach(groupName => {
            const encodingsInGroup = groups[groupName];
            if (!encodingsInGroup) return; 

            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName; 

            encodingsInGroup.forEach(enc => {
                const option = document.createElement('option');
                option.value = enc.value;
                option.textContent = `  ${enc.label} ${enc.support === 'native' ? '' : '(iconv)'}`.trim();
                optgroup.appendChild(option);
            });

            charEncoding.appendChild(optgroup);
            
            delete groups[groupName];
        });
        
        const remainingGroupNames = Object.keys(groups);
        if (remainingGroupNames.length > 0) {
            const unknownOptgroup = document.createElement('optgroup');
            unknownOptgroup.label = '알 수 없음'; 

            remainingGroupNames.forEach(groupName => {
                const encodingsInGroup = groups[groupName];
                
                encodingsInGroup.forEach(enc => {
                    const option = document.createElement('option');
                    option.value = enc.value;
                    option.textContent = `  ${enc.label} ${enc.support === 'native' ? '' : '(iconv)'}`.trim();
                    unknownOptgroup.appendChild(option);
                });
            });
            
            charEncoding.appendChild(unknownOptgroup);
        }
    }

    // 설정 로드
    function loadSettings() {
        encodingType.value = localStorage.getItem('dec_encodingType') || 'standard';
        charEncoding.value = localStorage.getItem('dec_charEncoding') || 'utf8';
        autoDecode.checked = localStorage.getItem('dec_autoDecode') === 'true';
        usePassword.checked = localStorage.getItem('dec_usePassword') === 'true';
        savePassword.checked = localStorage.getItem('dec_savePassword') === 'true';

        if (usePassword.checked) {
            passwordOptions.classList.remove('hidden');
        }

        if (savePassword.checked) {
            password.value = localStorage.getItem('dec_password') || '';
        }

        // sessionStorage에서 인코더로부터 전달된 데이터 확인
        const decodeInput = sessionStorage.getItem('decodeInput');
        const decodePassword = sessionStorage.getItem('decodePassword');
        
        if (decodeInput) {
            inputText.value = decodeInput;
            sessionStorage.removeItem('decodeInput');
            
            if (decodePassword) {
                password.value = decodePassword;
                usePassword.checked = true;
                passwordOptions.classList.remove('hidden');
                sessionStorage.removeItem('decodePassword');
            }
            
            // 자동으로 디코딩
            setTimeout(() => decodeBase64(), 100);
        }
    }

    // 설정 저장
    function saveSettings() {
        localStorage.setItem('dec_encodingType', encodingType.value);
        localStorage.setItem('dec_charEncoding', charEncoding.value);
        localStorage.setItem('dec_autoDecode', autoDecode.checked);
        localStorage.setItem('dec_usePassword', usePassword.checked);
        localStorage.setItem('dec_savePassword', savePassword.checked);

        if (savePassword.checked && password.value) {
            localStorage.setItem('dec_password', password.value);
        } else {
            localStorage.removeItem('dec_password');
        }
    }

    // SHA-256 해싱
    async function sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hash);
    }

    // XOR 연산 (순환 적용)
    function xorCipher(input, key) {
        const result = new Uint8Array(input.length);
        for (let i = 0; i < input.length; i++) {
            result[i] = input[i] ^ key[i % key.length];
        }
        return result;
    }

    /*// 바이트 배열을 문자열로 변환
    function bytesToString(bytes, encoding) {
        const decoder = new TextDecoder();
        
        switch(encoding) {
            case 'utf8':
                return decoder.decode(bytes);
            
            case 'utf16le':
                const buffer16le = new ArrayBuffer(bytes.length);
                const view16le = new Uint8Array(buffer16le);
                view16le.set(bytes);
                const uint16le = new Uint16Array(buffer16le);
                return String.fromCharCode.apply(null, uint16le);
            
            case 'utf16be':
                const dataView = new DataView(bytes.buffer);
                let result = '';
                for (let i = 0; i < bytes.length; i += 2) {
                    result += String.fromCharCode(dataView.getUint16(i, false));
                }
                return result;
            
            case 'latin1':
                return String.fromCharCode.apply(null, bytes);
            
            default:
                return decoder.decode(bytes);
        }
    }*/

    // Base64 디코딩
    async function decodeBase64() {
        let input = inputText.value.trim();
        if (!input) {
            outputText.value = '';
            return;
        }

        try {
            // 줄바꿈 제거
            input = input.replace(/\s/g, '');

            // URL-safe 변환
            if (encodingType.value === 'urlsafe') {
                input = input.replace(/-/g, '+').replace(/_/g, '/');
            }

            // 패딩 추가 (필요한 경우)
            while (input.length % 4 !== 0) {
                input += '=';
            }

            // Base64 디코딩
            const binaryString = atob(input);
            let bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // 비밀번호 사용 시 XOR 복호화
            if (usePassword.checked && password.value) {
                const passwordHash = await sha256(password.value);
                bytes = xorCipher(bytes, passwordHash);
            }

            // 바이트 배열을 문자열로 변환
            const result = EncodingHelper.bytesToString(bytes, charEncoding.value);
            outputText.value = result;

            // 히스토리 저장 (자동 디코딩 시)
            if (autoDecode.checked) {
                saveToHistory(inputText.value, result);
            }

        } catch (error) {
            console.error('Decoding error:', error);
            outputText.value = '⚠️ 디코딩 실패: 잘못된 Base64 형식이거나 비밀번호가 일치하지 않습니다.';
        }
    }

    // 히스토리 저장
    async function saveToHistory(input, output) {
        const timestamp = Date.now();
        const entry = {
            id: timestamp,
            input: input,
            output: output,
            timestamp: timestamp,
            hasPassword: usePassword.checked && password.value ? true : false
        };

        await localforage.setItem(`history_${timestamp}`, entry);
        loadHistory();
    }

    // 히스토리 로드
    async function loadHistory() {
        const keys = await localforage.keys();
        const historyKeys = keys.filter(k => k.startsWith('history_')).sort().reverse();
        
        if (historyKeys.length === 0) {
            historyList.innerHTML = '<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">아직 변환 기록이 없습니다</p>';
            return;
        }

        const entries = await Promise.all(
            historyKeys.slice(0, 10).map(k => localforage.getItem(k))
        );

        historyList.innerHTML = entries.map(entry => `
            <div class="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer"
                 data-input="${escapeHtml(entry.input)}"
                 data-output="${escapeHtml(entry.output)}">
                <div class="flex items-start justify-between gap-4 mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-zinc-600 dark:text-zinc-400 truncate mb-1 font-jetbrains-mono">
                            입력: ${escapeHtml(entry.input)}${entry.input.length > 100 ? '...' : ''}
                        </div>
                        <div class="text-xs text-zinc-500 dark:text-zinc-500 truncate font-jetbrains-mono">
                            출력: ${escapeHtml(entry.output)}${entry.output.length > 100 ? '...' : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${entry.hasPassword ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : ''}
                        <span class="text-xs text-zinc-400 dark:text-zinc-600">${formatTime(entry.timestamp)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // 히스토리 항목 클릭 이벤트
        historyList.querySelectorAll('[data-input]').forEach(item => {
            item.addEventListener('click', () => {
                inputText.value = item.dataset.input;
                outputText.value = item.dataset.output;
            });
        });
    }

    // HTML 이스케이프
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 시간 포맷
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
        return date.toLocaleDateString('ko-KR');
    }

    // Textarea auto-resize
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // 복사 기능
    function copyToClipboard() {
        if (!outputText.value) return;
        
        outputText.select();
        document.execCommand('copy');
        
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            복사됨!
        `;
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    }

    // 인코딩으로 전환
    function switchToEncode() {
        if (outputText.value) {
            sessionStorage.setItem('encodeInput', outputText.value);
        }
        window.location.href = '/utils/encbase64';
    }

    // 비밀번호 보기 토글
    function togglePassword() {
        const type = password.type === 'password' ? 'text' : 'password';
        password.type = type;
        
        togglePasswordVisibility.innerHTML = type === 'password' 
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    }

    // 히스토리 전체 삭제
    async function clearAllHistory() {
        if (!confirm('모든 변환 기록을 삭제하시겠습니까?')) return;
        
        const keys = await localforage.keys();
        const historyKeys = keys.filter(k => k.startsWith('history_'));
        
        await Promise.all(historyKeys.map(k => localforage.removeItem(k)));
        loadHistory();
    }

    // 이벤트 리스너
    decodeBtn.addEventListener('click', () => {
        decodeBase64();
        if (!autoDecode.checked) {
            saveToHistory(inputText.value, outputText.value);
        }
    });

    copyBtn.addEventListener('click', copyToClipboard);
    switchToEncodeBtn.addEventListener('click', switchToEncode);
    togglePasswordVisibility.addEventListener('click', togglePassword);
    clearHistory.addEventListener('click', clearAllHistory);

    // 자동 디코딩
    inputText.addEventListener('input', () => {
        autoResize(inputText);
        
        if (autoDecode.checked) {
            clearTimeout(autoDecodeTimeout);
            autoDecodeTimeout = setTimeout(() => {
                decodeBase64();
            }, 1000);
        }
    });

    password.addEventListener('input', () => {
        if (autoDecode.checked) {
            clearTimeout(autoDecodeTimeout);
            autoDecodeTimeout = setTimeout(() => {
                decodeBase64();
            }, 1000);
        }
    });

    // 옵션 변경 시
    [encodingType, charEncoding, autoDecode, usePassword, savePassword].forEach(el => {
        el.addEventListener('change', () => {
            saveSettings();
            if (autoDecode.checked && inputText.value) {
                decodeBase64();
            }
        });
    });

    // 비밀번호 옵션 토글
    usePassword.addEventListener('change', () => {
        if (usePassword.checked) {
            passwordOptions.classList.remove('hidden');
        } else {
            passwordOptions.classList.add('hidden');
        }
    });

    // 비밀번호 저장 경고
    savePassword.addEventListener('change', () => {
        if (savePassword.checked) {
            alert('⚠️ 주의: 공공장소(PC방 등)에서는 이 옵션을 사용하지 마세요.\n비밀번호가 브라우저에 평문으로 저장됩니다.');
        }
    });

    // 초기화
    encodingSetup();
    loadSettings();
    loadHistory();
    autoResize(inputText);

});