document.addEventListener('DOMContentLoaded', () => {
    const fileDropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameEl = document.getElementById('fileName');
    const hashBtn = document.getElementById('hashBtn');
    const outputText = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    const hashAlgorithm = document.getElementById('hashAlgorithm');
    const historyList = document.getElementById('historyList');
    const clearHistory = document.getElementById('clearHistory');

    let currentFileBuffer = null;
    let currentFileName = null;
    const originalHashBtnHTML = hashBtn.innerHTML;
    const originalCopyBtnHTML = copyBtn.innerHTML;

    localforage.config({
        name: 'FileHashHelper',
        storeName: 'history'
    });

    function handleFileSelect(file) {
        if (!file) return;

        currentFileName = file.name;
        fileNameEl.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        
        hashBtn.disabled = true;
        hashBtn.innerHTML = '파일 읽는 중...';
        outputText.value = '';
        currentFileBuffer = null;

        const reader = new FileReader();
        
        reader.onload = (e) => {
            currentFileBuffer = e.target.result;
            hashBtn.disabled = false;
            hashBtn.innerHTML = originalHashBtnHTML;
            outputText.value = '파일 준비 완료. 버튼을 눌러 해시하세요.';
        };
        
        reader.onerror = (e) => {
            fileNameEl.textContent = '파일 읽기 오류';
            console.error("FileReader error:", e);
            hashBtn.disabled = true;
            hashBtn.innerHTML = originalHashBtnHTML;
            currentFileBuffer = null;
            currentFileName = null;
        };
        
        reader.readAsArrayBuffer(file);
    }

    fileDropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        fileDropZone.addEventListener(eventName, () => {
            fileDropZone.classList.add('border-green-500', 'bg-zinc-100', 'dark:bg-zinc-700');
        }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        fileDropZone.addEventListener(eventName, () => {
            fileDropZone.classList.remove('border-green-500', 'bg-zinc-100', 'dark:bg-zinc-700');
        }, false);
    });

    fileDropZone.addEventListener('drop', (e) => {
        handleFileSelect(e.dataTransfer.files[0]);
    }, false);

    function performHash() {
        if (!currentFileBuffer) {
            outputText.value = '먼저 파일을 선택하세요.';
            return;
        }
        const algorithm = hashAlgorithm.value;

        outputText.value = '해시 계산 중... (파일 크기에 따라 시간이 걸릴 수 있습니다)';
        hashBtn.disabled = true;
        
        setTimeout(() => {
            try {
                const hashResult = FileHashHelper.calculateFileHash(currentFileBuffer, algorithm);
                outputText.value = hashResult;
                saveToHistory(currentFileName, hashResult, algorithm);
            } catch (e) {
                console.error("해시 생성 오류:", e);
                outputText.value = "오류: " + e.message;
            } finally {
                hashBtn.disabled = false;
            }
        }, 10);
    }

    function copyToClipboard() {
        if (!outputText.value || outputText.value.startsWith('해시 계산 중') || outputText.value.startsWith('먼저') || outputText.value.startsWith('파일 준비')) {
            return;
        }
        try {
            outputText.select();
            document.execCommand('copy');
            copyBtn.innerHTML = '복사 완료!';
            setTimeout(() => { copyBtn.innerHTML = originalCopyBtnHTML; }, 2000);
        } catch (e) {
            console.error("복사 실패:", e);
            copyBtn.innerHTML = '복사 실패';
            setTimeout(() => { copyBtn.innerHTML = originalCopyBtnHTML; }, 2000);
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
        return date.toLocaleString('ko-KR');
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

    async function saveToHistory(fileName, output, algorithm) {
        if (!fileName || !output) return;
        const timestamp = Date.now();
        const entry = {
            id: timestamp,
            fileName: fileName.substring(0, 100),
            output: output,
            algorithm: algorithm,
            timestamp: timestamp,
        };
        try {
            await localforage.setItem(`file_hash_complete_history_${timestamp}`, entry);
            loadHistory();
        } catch (e) { 
            console.error("히스토리 저장 실패:", e); 
        }
    }

    async function loadHistory() {
        try {
            const keys = await localforage.keys();
            const historyKeys = keys.filter(k => k.startsWith('file_hash_complete_history_')).sort().reverse();
            
            if (historyKeys.length === 0) {
                historyList.innerHTML = '<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">아직 변환 기록이 없습니다</p>';
                return;
            }

            const entries = await Promise.all(historyKeys.slice(0, 10).map(k => localforage.getItem(k)));

            historyList.innerHTML = entries.filter(Boolean).map(entry => `
                <div class="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer"
                     data-filename="${escapeHtml(entry.fileName)}"
                     data-output="${escapeHtml(entry.output)}"
                     data-algorithm="${escapeHtml(entry.algorithm)}">
                    
                    <div class="flex items-start justify-between gap-4 mb-2">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm text-zinc-600 dark:text-zinc-400 truncate mb-1">
                                파일: ${escapeHtml(entry.fileName)}
                            </div>
                            <div class="text-xs text-zinc-500 dark:text-zinc-500 truncate font-mono">
                                해시: ${escapeHtml(entry.output)}
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span class="text-xs font-semibold text-green-600 dark:text-green-500">${escapeHtml(getAlgorithmLabel(entry.algorithm))}</span>
                            <span class="text-xs text-zinc-400 dark:text-zinc-600">${formatTime(entry.timestamp)}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            historyList.querySelectorAll('[data-output]').forEach(item => {
                item.addEventListener('click', () => {
                    fileNameEl.textContent = `(기록) ${item.dataset.filename}`;
                    outputText.value = item.dataset.output;
                    hashAlgorithm.value = item.dataset.algorithm;
                    
                    currentFileBuffer = null; 
                    currentFileName = null;
                    hashBtn.disabled = true;
                });
            });
        } catch (e) { 
            console.error("히스토리 로드 실패:", e); 
        }
    }

    async function clearAllHistory() {
        if (!confirm('모든 파일 해시 기록을 삭제하시겠습니까?')) return;
        try {
            const keys = await localforage.keys();
            const historyKeys = keys.filter(k => k.startsWith('file_hash_complete_history_'));
            await Promise.all(historyKeys.map(k => localforage.removeItem(k)));
            loadHistory();
        } catch (e) { 
            console.error("히스토리 삭제 실패:", e); 
        }
    }

    hashBtn.addEventListener('click', performHash);
    copyBtn.addEventListener('click', copyToClipboard);
    clearHistory.addEventListener('click', clearAllHistory);
    
    hashAlgorithm.addEventListener('change', () => {
        if(currentFileBuffer) {
            performHash();
        }
    });

    loadHistory();
});