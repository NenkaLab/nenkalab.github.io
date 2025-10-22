
document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const hashBtn = document.getElementById('hashBtn');
    const outputText = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    const shaVersion = document.getElementById('shaVersion');
    const autoHash = document.getElementById('autoHash');
    const historyList = document.getElementById('historyList');
    const clearHistory = document.getElementById('clearHistory');
    
    const originalCopyBtnHTML = copyBtn.innerHTML;
    let historySaveTimeout;

    localforage.config({
        name: 'ShaHasher',
        storeName: 'history'
    });

    function performHash() {
        const text = inputText.value;
        const version = shaVersion.value;

        if (!text) {
            outputText.value = '';
            return;
        }

        try {
            const hashResult = ShaHelper.calculateHash(text, version);
            outputText.value = hashResult;

            if (autoHash.checked) {
                clearTimeout(historySaveTimeout);
                historySaveTimeout = setTimeout(() => {
                    saveToHistory(text, hashResult, version);
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

    async function saveToHistory(input, output, version) {
        if (!input || !output) return;

        const timestamp = Date.now();
        const entry = {
            id: timestamp,
            input: input.substring(0, 100), // 미리보기용
            output: output.substring(0, 100), // 미리보기용
            fullInput: input, // 복원용
            fullOutput: output, // 복원용
            version: version,
            timestamp: timestamp,
        };

        try {
            await localforage.setItem(`sha_history_${timestamp}`, entry);
            loadHistory(); 
        } catch (e) {
            console.error("히스토리 저장 실패:", e);
        }
    }

    async function loadHistory() {
        try {
            const keys = await localforage.keys();
            const historyKeys = keys.filter(k => k.startsWith('sha_history_')).sort().reverse();
            
            if (historyKeys.length === 0) {
                historyList.innerHTML = '<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">아직 변환 기록이 없습니다</p>';
                return;
            }

            const entries = await Promise.all(
                historyKeys.slice(0, 10).map(k => localforage.getItem(k)) // 최근 10개
            );

            historyList.innerHTML = entries.filter(Boolean).map(entry => `
                <div class="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 hover:border-green-400 dark:hover:border-green-500 transition-colors cursor-pointer"
                     data-input="${escapeHtml(entry.fullInput)}"
                     data-output="${escapeHtml(entry.fullOutput)}"
                     data-version="${escapeHtml(entry.version)}">
                    
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
                            <span class="text-xs font-semibold text-green-600 dark:text-green-500">${escapeHtml(entry.version.toUpperCase())}</span>
                            <span class="text-xs text-zinc-400 dark:text-zinc-600">${formatTime(entry.timestamp)}</span>
                        </div>
                    </div>
                </div>
            `).join('');

            historyList.querySelectorAll('[data-input]').forEach(item => {
                item.addEventListener('click', () => {
                    inputText.value = item.dataset.input;
                    outputText.value = item.dataset.output;
                    shaVersion.value = item.dataset.version;
                });
            });
        } catch (e) {
            console.error("히스토리 로드 실패:", e);
        }
    }

    async function clearAllHistory() {
        if (!confirm('모든 SHA 변환 기록을 삭제하시겠습니까?')) return;
        
        try {
            const keys = await localforage.keys();
            const historyKeys = keys.filter(k => k.startsWith('sha_history_'));
            
            await Promise.all(historyKeys.map(k => localforage.removeItem(k)));
            loadHistory(); 
        } catch (e) {
            console.error("히스토리 삭제 실패:", e);
        }
    }

    hashBtn.addEventListener('click', () => {
        performHash();
        if (!autoHash.checked) {
            saveToHistory(inputText.value, outputText.value, shaVersion.value);
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

    loadHistory();
});

