import { 
    assemble, 
    disassemble,
    convertHangulToQwerty,
    convertQwertyToHangul,
    numberToHangul,
    numberToHangulMixed,
    romanize,
    standardizePronunciation,
    susa,
    seosusa,
    days
} from 'https://cdn.jsdelivr.net/npm/es-hangul@2.3.8/dist/index.mjs';

// 탭 전환 기능
document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // 모든 탭 버튼 비활성화
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-600', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-zinc-600', 'dark:text-zinc-400');
            });
            
            // 현재 탭 버튼 활성화
            button.classList.add('active', 'border-blue-600', 'text-blue-600');
            button.classList.remove('border-transparent', 'text-zinc-600', 'dark:text-zinc-400');
            
            // 모든 탭 콘텐츠 숨기기
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // 현재 탭 콘텐츠 보이기
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        });
    });

    // 복사 버튼 기능
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetId = button.dataset.target;
            const targetElement = document.getElementById(targetId);
            const text = targetElement.value;

            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalHTML = button.innerHTML;
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    복사됨
                `;
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                }, 2000);
            } catch (err) {
                console.error('복사 실패:', err);
            }
        });
    });

    // 조합/분해 탭
    const assembleBtn = document.getElementById('assembleBtn');
    const assembleInput = document.getElementById('assembleInput');
    const assembleOutput = document.getElementById('assembleOutput');
    const assembleModeRadios = document.querySelectorAll('input[name="assembleMode"]');

    assembleBtn.addEventListener('click', () => {
        const mode = document.querySelector('input[name="assembleMode"]:checked').value;
        const input = assembleInput.value.trim();

        if (!input) {
            assembleOutput.value = '';
            return;
        }

        try {
            let result;
            if (mode === 'assemble') {
                // 배열 형태로 입력된 경우 파싱
                if (input.startsWith('[') && input.endsWith(']')) {
                    const arr = JSON.parse(input);
                    result = assemble(arr);
                } else {
                    // 그냥 문자열인 경우 글자별로 분해 후 조합
                    const chars = input.split('');
                    result = assemble(chars);
                }
            } else {
                result = disassemble(input);
            }
            assembleOutput.value = result;
        } catch (err) {
            assembleOutput.value = `오류: ${err.message}`;
        }
    });

    // 한영 변환 탭
    const convertBtn = document.getElementById('convertBtn');
    const convertInput = document.getElementById('convertInput');
    const convertOutput = document.getElementById('convertOutput');
    const convertModeRadios = document.querySelectorAll('input[name="convertMode"]');

    convertBtn.addEventListener('click', () => {
        const mode = document.querySelector('input[name="convertMode"]:checked').value;
        const input = convertInput.value.trim();

        if (!input) {
            convertOutput.value = '';
            return;
        }

        try {
            let result;
            if (mode === 'hangulToQwerty') {
                result = convertHangulToQwerty(input);
            } else {
                result = convertQwertyToHangul(input);
            }
            convertOutput.value = result;
        } catch (err) {
            convertOutput.value = `오류: ${err.message}`;
        }
    });

    // 숫자 변환 탭
    const numberBtn = document.getElementById('numberBtn');
    const numberInput = document.getElementById('numberInput');
    const numberOutput = document.getElementById('numberOutput');
    const numberModeRadios = document.querySelectorAll('input[name="numberMode"]');
    const numberSpacing = document.getElementById('numberSpacing');
    const numberPrefix = document.getElementById('numberPrefix');
    const numberSuffix = document.getElementById('numberSuffix');

    numberBtn.addEventListener('click', () => {
        const mode = document.querySelector('input[name="numberMode"]:checked').value;
        const input = parseFloat(numberInput.value);

        if (isNaN(input)) {
            numberOutput.value = '';
            return;
        }

        try {
            const options = {
                spacing: numberSpacing.checked
            };

            let result;
            if (mode === 'hangul') {
                result = numberToHangul(input, options);
            } else {
                result = numberToHangulMixed(input, options);
            }

            // 접두사/접미사 추가
            const prefix = numberPrefix.value;
            const suffix = numberSuffix.value;
            result = `${prefix}${result}${suffix}`;

            numberOutput.value = result;
        } catch (err) {
            numberOutput.value = `오류: ${err.message}`;
        }
    });

    // 발음 탭
    const pronBtn = document.getElementById('pronBtn');
    const pronInput = document.getElementById('pronInput');
    const pronOutput = document.getElementById('pronOutput');
    const pronModeRadios = document.querySelectorAll('input[name="pronMode"]');
    const hardConversion = document.getElementById('hardConversion');

    pronBtn.addEventListener('click', () => {
        const mode = document.querySelector('input[name="pronMode"]:checked').value;
        const input = pronInput.value.trim();

        if (!input) {
            pronOutput.value = '';
            return;
        }

        try {
            let result;
            if (mode === 'romanize') {
                result = romanize(input);
            } else {
                const options = {
                    hardConversion: hardConversion.checked
                };
                result = standardizePronunciation(input, options);
            }
            pronOutput.value = result;
        } catch (err) {
            pronOutput.value = `오류: ${err.message}`;
        }
    });

    // 수사/서수사 탭
    const nativeBtn = document.getElementById('nativeBtn');
    const nativeInput = document.getElementById('nativeInput');
    const nativeOutput = document.getElementById('nativeOutput');
    const nativeModeRadios = document.querySelectorAll('input[name="nativeMode"]');
    const useClassifier = document.getElementById('useClassifier');
    const nativePrefix = document.getElementById('nativePrefix');
    const nativeMid = document.getElementById('nativeMid');
    const nativeSuffix = document.getElementById('nativeSuffix');

    nativeBtn.addEventListener('click', () => {
        const mode = document.querySelector('input[name="nativeMode"]:checked').value;
        const input = parseInt(nativeInput.value);

        if (isNaN(input) || input < 1) {
            nativeOutput.value = '';
            return;
        }

        try {
            let result;
            const prefix = nativePrefix.value;
            const mid = nativeMid.value;
            const suffix = nativeSuffix.value;

            if (mode === 'susa') {
                if (input > 100) {
                    throw new Error('수사는 1-100 범위의 숫자만 지원합니다.');
                }
                result = susa(input, useClassifier.checked);
            } else if (mode === 'seosusa') {
                result = seosusa(input);
                // 중간삽입 처리 (서수사 전용)
                if (mid) {
                    // '째' 앞에 중간삽입어 추가
                    result = result.replace(/째$/, `${mid}째`);
                }
            } else {
                if (input > 30) {
                    throw new Error('날짜는 1-30 범위의 숫자만 지원합니다.');
                }
                result = days(input);
            }

            // 접두사/접미사 추가
            result = `${prefix}${result}${suffix}`;

            nativeOutput.value = result;
        } catch (err) {
            nativeOutput.value = `오류: ${err.message}`;
        }
    });

    // Enter 키로 변환 실행
    const addEnterKeyListener = (input, button) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                button.click();
            }
        });
    };

    addEnterKeyListener(assembleInput, assembleBtn);
    addEnterKeyListener(convertInput, convertBtn);
    addEnterKeyListener(numberInput, numberBtn);
    addEnterKeyListener(pronInput, pronBtn);
    addEnterKeyListener(nativeInput, nativeBtn);
});