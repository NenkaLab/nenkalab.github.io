document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const hashBtn = document.getElementById('hashBtn');
    const outputText = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    const hashAlgorithm = document.getElementById('hashAlgorithm');
    const autoHash = document.getElementById('autoHash');
    const hashMode = document.getElementById('hashMode');
    const charEncoding = document.getElementById('charEncoding');
    const hmacOptions = document.getElementById('hmacOptions');
    const hmacKey = document.getElementById('hmacKey');
    const pbkdf2Options = document.getElementById('pbkdf2Options');
    const pbkdf2Salt = document.getElementById('pbkdf2Salt');
    const pbkdf2Iterations = document.getElementById('pbkdf2Iterations');
    const pbkdf2KeySize = document.getElementById('pbkdf2KeySize');
    const historyList = document.getElementById('historyList');
    const clearHistory = document.getElementById('clearHistory');
    
    const originalCopyBtnHTML = copyBtn.innerHTML;
    let historySaveTimeout;

    localforage.config({
        name: 'HashHelper',
        storeName: 'history'
    });
    
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

    // 모드 변경 처리
    hashMode.addEventListener('change', () => {
        const mode = hashMode.value;
        hmacOptions.classList.toggle('hidden', mode !== 'hmac');
        pbkdf2Options.classList.toggle('hidden', mode !== 'pbkdf2');
        
        if (autoHash.checked || outputText.value) {
            performHash();
        }
    });

    function performHash() {
        const text = inputText.value;
        const algorithm = hashAlgorithm.value;
        const mode = hashMode.value;

        if (!text) {
            outputText.value = '';
            return;
        }

        try {
            let hashResult;

            let enc = EncodingHelper.bytesToString(
                EncodingHelper.stringToBytes(text, charEncoding.value), 
                'utf-8'
            );
            
            if (mode === 'hash') {
                hashResult = HashHelper.calculateHash(enc, algorithm);
            } else if (mode === 'hmac') {
                const key = hmacKey.value || '';
                hashResult = HashHelper.calculateHMAC(enc, key, algorithm);
            } else if (mode === 'pbkdf2') {
                const salt = pbkdf2Salt.value || 'salt';
                const iterations = parseInt(pbkdf2Iterations.value) || 10000;
                const keySize = parseInt(pbkdf2KeySize.value) || 8;
                hashResult = HashHelper.calculatePBKDF2(enc, salt, iterations, keySize, algorithm);
            }
            
            outputText.value = hashResult;

            if (autoHash.checked) {
                clearTimeout(historySaveTimeout);
                historySaveTimeout = setTimeout(() => {
                    saveToHistory(text, hashResult, algorithm, mode);
                }, 1000); 
            }

        } catch (e) {
            console.error("해시 생성 오류:", e);
            outputText.value = "오류: " + e.message;
        }
    }

    function copyToClipboard() {
        if (!outputText.value) return;

        try {
            outputText.select();
            document.execCommand('copy');

            copyBtn.innerHTML = '복사 완료!';
            setTimeout(() => {
                copyBtn.innerHTML = originalCopyBtnHTML;
            }, 2000);

        } catch (e) {
            console.error("복사 실패:", e);
            copyBtn.innerHTML = '복사 실패';
             setTimeout(() => {
                copyBtn.innerHTML = originalCopyBtnHTML;
            }, 2000);
        }
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
        return date.toLocaleDateString('ko-KR');
    }

    function getAlgorithmLabel(algo) {
        const labels = {
            'md5': 'MD5',
            'sha1': 'SHA-1', 'sha-1': 'SHA-1',
            'sha224': 'SHA-224', 'sha-224': 'SHA-224',
            'sha256': 'SHA-256', 'sha-256': 'SHA-256',
            'sha384': 'SHA-384', 'sha-384': 'SHA-384',
            'sha512': 'SHA-512', 'sha-512': 'SHA-512',
            'sha3-224': 'SHA3-224', 'sha3-256': 'SHA3-256',
            'sha3-384': 'SHA3-384', 'sha3-512': 'SHA3-512',
            'keccak224': 'Keccak-224', 'keccak-224': 'Keccak-224',
            'keccak256': 'Keccak-256', 'keccak-256': 'Keccak-256',
            'keccak384': 'Keccak-384', 'keccak-384': 'Keccak-384',
            'keccak512': 'Keccak-512', 'keccak-512': 'Keccak-512',
            'shake128': 'SHAKE128', 'shake256': 'SHAKE256',
            'ripemd160': 'RIPEMD-160', 'ripemd-160': 'RIPEMD-160',
            'blake2b': 'BLAKE2b-512', 'blake2b-512': 'BLAKE2b-512',
            'blake2b-256': 'BLAKE2b-256',
            'blake2s': 'BLAKE2s-256', 'blake2s-256': 'BLAKE2s-256'
        };
        return labels[algo.toLowerCase()] || algo.toUpperCase();
    }

    function getModeLabel(mode) {
        const labels = {
            'hash': 'Hash',
            'hmac': 'HMAC',
            'pbkdf2': 'PBKDF2'
        };
        return labels[mode] || mode;
    }

    async function saveToHistory(input, output, algorithm, mode) {
        if (!input || !output) return;

        const timestamp = Date.now();
        const entry = {
            id: timestamp,
            input: input.substring(0, 100),
            output: output.substring(0, 100),
            fullInput: input,
            fullOutput: output,
            algorithm: algorithm,
            charEncoding: charEncoding.value,
            mode: mode,
            timestamp: timestamp,
        };

        try {
            await localforage.setItem(`hash_complete_history_${timestamp}`, entry);
            loadHistory(); 
        } catch (e) {
            console.error("히스토리 저장 실패:", e);
        }
    }

    async function loadHistory() {
        try {
            const keys = await localforage.keys();
            const historyKeys = keys.filter(k => k.startsWith('hash_complete_history_')).sort().reverse();
            
            if (historyKeys.length === 0) {
                historyList.innerHTML = '<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">아직 변환 기록이 없습니다</p>';
                return;
            }

            const entries = await Promise.all(
                historyKeys.slice(0, 10).map(k => localforage.getItem(k))
            );

            historyList.innerHTML = entries.filter(Boolean).map(entry => `
                <div class="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer"
                     data-input="${escapeHtml(entry.fullInput)}"
                     data-output="${escapeHtml(entry.fullOutput)}"
                     data-algorithm="${escapeHtml(entry.algorithm)}"
                     data-mode="${escapeHtml(entry.mode || 'hash')}"
                     data-char-encoding="${escapeHtml(entry.charEncoding)}">
                    
                    <div class="flex items-start justify-between gap-4 mb-2">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm text-zinc-600 dark:text-zinc-400 truncate mb-1">
                                입력: ${escapeHtml(entry.input)}${entry.input.length > 100 ? '...' : ''}
                            </div>
                            <div class="text-xs text-zinc-500 dark:text-zinc-500 truncate font-mono">
                                출력: ${escapeHtml(entry.output)}${entry.output.length > 100 ? '...' : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="text-xs font-semibold text-purple-600 dark:text-purple-400">${escapeHtml(getModeLabel(entry.mode || 'hash'))}</span>
                            <span class="text-xs font-semibold text-green-600 dark:text-green-500">${escapeHtml(getAlgorithmLabel(entry.algorithm))}</span>
                            <span class="text-xs text-zinc-400 dark:text-zinc-600">${formatTime(entry.timestamp)}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            historyList.querySelectorAll('[data-input]').forEach(item => {
                item.addEventListener('click', () => {
                    inputText.value = item.dataset.input;
                    outputText.value = item.dataset.output;
                    hashAlgorithm.value = item.dataset.algorithm;
                    hashMode.value = item.dataset.mode || 'hash';
                    charEncoding.value = item.dataset.charEncoding || 'utf-8';
                    
                    // 모드에 따라 옵션 표시
                    const mode = item.dataset.mode || 'hash';
                    hmacOptions.classList.toggle('hidden', mode !== 'hmac');
                    pbkdf2Options.classList.toggle('hidden', mode !== 'pbkdf2');
                });
            });
        } catch (e) {
            console.error("히스토리 로드 실패:", e);
        }
    }

    async function clearAllHistory() {
        if (!confirm('모든 해시 변환 기록을 삭제하시겠습니까?')) return;
        
        try {
            const keys = await localforage.keys();
            const historyKeys = keys.filter(k => k.startsWith('hash_complete_history_'));
            
            await Promise.all(historyKeys.map(k => localforage.removeItem(k)));
            loadHistory(); 
        } catch (e) {
            console.error("히스토리 삭제 실패:", e);
        }
    }

    hashBtn.addEventListener('click', () => {
        performHash();
        if (!autoHash.checked) {
            const mode = hashMode.value;
            saveToHistory(inputText.value, outputText.value, hashAlgorithm.value, mode);
        }
    });

    copyBtn.addEventListener('click', copyToClipboard);
    clearHistory.addEventListener('click', clearAllHistory);

    autoHash.addEventListener('change', () => {
        if (autoHash.checked) {
            performHash();
        }
    });

    inputText.addEventListener('input', () => {
        if (autoHash.checked) {
            performHash();
        }
    });

    hashAlgorithm.addEventListener('change', () => {
        if (autoHash.checked || outputText.value) {
            performHash();
        }
    });

    // HMAC/PBKDF2 옵션 변경 시 재계산
    [hmacKey, pbkdf2Salt, pbkdf2Iterations, pbkdf2KeySize].forEach(el => {
        el.addEventListener('input', () => {
            if (autoHash.checked || outputText.value) {
                performHash();
            }
        });
    });

    encodingSetup();
    loadHistory();
});