// assets/js/base64-encoder.js
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
        name: 'Base64Encoder',
        storeName: 'history'
    });

    // DOM 요소
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const encodeBtn = document.getElementById('encodeBtn');
    const copyBtn = document.getElementById('copyBtn');
    const switchToDecodeBtn = document.getElementById('switchToDecodeBtn');
    const encodingType = document.getElementById('encodingType');
    const charEncoding = document.getElementById('charEncoding');
    const paddingOption = document.getElementById('paddingOption');
    const lineBreak = document.getElementById('lineBreak');
    const autoEncode = document.getElementById('autoEncode');
    const usePassword = document.getElementById('usePassword');
    const passwordOptions = document.getElementById('passwordOptions');
    const password = document.getElementById('password');
    const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');
    const savePassword = document.getElementById('savePassword');
    const clearHistory = document.getElementById('clearHistory');
    const historyList = document.getElementById('historyList');

    let autoEncodeTimeout;

    // 설정 로드
    function loadSettings() {
        encodingType.value = localStorage.getItem('enc_encodingType') || 'standard';
        charEncoding.value = localStorage.getItem('enc_charEncoding') || 'utf8';
        paddingOption.value = localStorage.getItem('enc_paddingOption') || 'yes';
        lineBreak.value = localStorage.getItem('enc_lineBreak') || 'none';
        autoEncode.checked = localStorage.getItem('enc_autoEncode') === 'true';
        usePassword.checked = localStorage.getItem('enc_usePassword') === 'true';
        savePassword.checked = localStorage.getItem('enc_savePassword') === 'true';

        if (usePassword.checked) {
            passwordOptions.classList.remove('hidden');
        }

        if (savePassword.checked) {
            password.value = localStorage.getItem('enc_password') || '';
        }
    }

    // 설정 저장
    function saveSettings() {
        localStorage.setItem('enc_encodingType', encodingType.value);
        localStorage.setItem('enc_charEncoding', charEncoding.value);
        localStorage.setItem('enc_paddingOption', paddingOption.value);
        localStorage.setItem('enc_lineBreak', lineBreak.value);
        localStorage.setItem('enc_autoEncode', autoEncode.checked);
        localStorage.setItem('enc_usePassword', usePassword.checked);
        localStorage.setItem('enc_savePassword', savePassword.checked);

        if (savePassword.checked && password.value) {
            localStorage.setItem('enc_password', password.value);
        } else {
            localStorage.removeItem('enc_password');
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

    // 문자열을 바이트 배열로 변환
    function stringToBytes(str, encoding) {
        const encoder = new TextEncoder();
        
        switch(encoding) {
            case 'utf8':
                return encoder.encode(str);
            
            case 'utf16le':
                const buffer16le = new ArrayBuffer(str.length * 2);
                const view16le = new Uint16Array(buffer16le);
                for (let i = 0; i < str.length; i++) {
                    view16le[i] = str.charCodeAt(i);
                }
                return new Uint8Array(buffer16le);
            
            case 'utf16be':
                const buffer16be = new ArrayBuffer(str.length * 2);
                const view16be = new DataView(buffer16be);
                for (let i = 0; i < str.length; i++) {
                    view16be.setUint16(i * 2, str.charCodeAt(i), false);
                }
                return new Uint8Array(buffer16be);
            
            case 'latin1':
                const latin1Array = new Uint8Array(str.length);
                for (let i = 0; i < str.length; i++) {
                    latin1Array[i] = str.charCodeAt(i) & 0xFF;
                }
                return latin1Array;
            
            default:
                return encoder.encode(str);
        }
    }

    // Base64 인코딩
    async function encodeBase64() {
        const input = inputText.value;
        if (!input) {
            outputText.value = '';
            return;
        }

        try {
            // 입력을 바이트 배열로 변환
            let bytes = stringToBytes(input, charEncoding.value);

            // 비밀번호 사용 시 XOR 적용 (base64 전에!)
            if (usePassword.checked && password.value) {
                const passwordHash = await sha256(password.value);
                bytes = xorCipher(bytes, passwordHash);
            }

            // 바이트 배열을 base64로 변환
            let base64 = btoa(String.fromCharCode.apply(null, bytes));

            // URL-safe 변환
            if (encodingType.value === 'urlsafe') {
                base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
            }

            // 패딩 제거
            if (paddingOption.value === 'no') {
                base64 = base64.replace(/=+$/, '');
            }

            // 줄바꿈 추가
            if (lineBreak.value !== 'none') {
                const lineLength = parseInt(lineBreak.value);
                base64 = base64.match(new RegExp(`.{1,${lineLength}}`, 'g')).join('\n');
            }

            outputText.value = base64;

            // 히스토리 저장 (자동 인코딩 시)
            if (autoEncode.checked) {
                saveToHistory(input, base64);
            }

        } catch (error) {
            console.error('Encoding error:', error);
            alert('인코딩 중 오류가 발생했습니다: ' + error.message);
        }
    }

    // 히스토리 저장
    async function saveToHistory(input, output) {
        const timestamp = Date.now();
        const entry = {
            id: timestamp,
            input: input.substring(0, 100),
            output: output.substring(0, 100),
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
            <div class="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                 data-input="${escapeHtml(entry.input)}"
                 data-output="${escapeHtml(entry.output)}">
                <div class="flex items-start justify-between gap-4 mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-zinc-600 dark:text-zinc-400 truncate mb-1">
                            입력: ${escapeHtml(entry.input)}${entry.input.length > 100 ? '...' : ''}
                        </div>
                        <div class="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                            출력: ${escapeHtml(entry.output)}${entry.output.length > 100 ? '...' : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${entry.hasPassword ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : ''}
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
        document.execCommand('copy', true);
        
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

    // 디코딩으로 전환
    function switchToDecode() {
        if (outputText.value) {
            sessionStorage.setItem('decodeInput', outputText.value);
            if (usePassword.checked && password.value) {
                sessionStorage.setItem('decodePassword', password.value);
            }
        }
        window.location.href = '/utils/decbase64';
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
    encodeBtn.addEventListener('click', () => {
        encodeBase64();
        if (!autoEncode.checked) {
            saveToHistory(inputText.value, outputText.value);
        }
    });

    copyBtn.addEventListener('click', copyToClipboard);
    switchToDecodeBtn.addEventListener('click', switchToDecode);
    togglePasswordVisibility.addEventListener('click', togglePassword);
    clearHistory.addEventListener('click', clearAllHistory);

    // 자동 인코딩
    inputText.addEventListener('input', () => {
        autoResize(inputText);
        
        if (autoEncode.checked) {
            clearTimeout(autoEncodeTimeout);
            autoEncodeTimeout = setTimeout(() => {
                encodeBase64();
            }, 1000);
        }
    });

    password.addEventListener('input', () => {
        if (autoEncode.checked) {
            clearTimeout(autoEncodeTimeout);
            autoEncodeTimeout = setTimeout(() => {
                encodeBase64();
            }, 1000);
        }
    });

    // 옵션 변경 시
    [encodingType, charEncoding, paddingOption, lineBreak, autoEncode, usePassword, savePassword].forEach(el => {
        el.addEventListener('change', () => {
            saveSettings();
            if (autoEncode.checked && inputText.value) {
                encodeBase64();
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
    loadSettings();
    loadHistory();
    autoResize(inputText);

});