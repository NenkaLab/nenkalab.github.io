// assets/js/link-preview.js
(function() {
    'use strict';

    class LinkPreview {
        constructor() {
            this.activeChips = new Map();
            this.popupTimers = new Map();
            this.isMobile = this.detectMobile();
            this.init();
        }

        init() {
            this.initializeTriggers();
            this.attachTriggerListeners();
            this.setupMobileDetection();
        }

        // 트리거 버튼 초기화 - display:none 제거하고 Tailwind 클래스 추가
        initializeTriggers() {
            document.querySelectorAll('.link-preview-trigger').forEach(trigger => {
                // display: none 제거
                trigger.style.display = '';
                
                // Tailwind 클래스 추가
                const classes = [
                    'inline-flex',
                    'items-center',
                    'gap-1',
                    'ml-1.5',
                    'px-2',
                    'py-1',
                    'bg-white',
                    'dark:bg-zinc-900',
                    'border',
                    'border-gray-200',
                    'dark:border-zinc-700',
                    'rounded-md',
                    'cursor-pointer',
                    'transition-all',
                    'duration-200',
                    'align-middle',
                    'text-xs',
                    'text-zinc-500',
                    'dark:text-zinc-400',
                    'hover:border-blue-500',
                    'hover:text-blue-500',
                    'hover:-translate-y-0.5',
                    'hover:shadow-md',
                    'focus-visible:outline-2',
                    'focus-visible:outline-offset-2',
                    'focus-visible:outline-blue-500'
                ];
                
                trigger.className = 'link-preview-trigger ' + classes.join(' ');
                trigger.setAttribute('tabindex', '0');
                trigger.setAttribute('role', 'button');
                trigger.setAttribute('aria-label', `${trigger.dataset.count}개의 링크 보기`);
                
                // SVG와 count에도 스타일 적용
                const svg = trigger.querySelector('svg');
                if (svg) {
                    svg.setAttribute('class', 'w-3.5 h-3.5');
                }
                
                const count = trigger.querySelector('.link-count');
                if (count) {
                    count.className = 'link-count font-semibold text-[11px]';
                }
            });
        }

        detectMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                || window.innerWidth < 768;
        }

        setupMobileDetection() {
            window.addEventListener('resize', () => {
                this.isMobile = this.detectMobile();
            });
        }

        attachTriggerListeners() {
            document.querySelectorAll('.link-preview-trigger').forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleChips(trigger);
                });
                
                // 키보드 접근성
                trigger.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        trigger.click();
                    }
                });
            });
        }

        toggleChips(trigger) {
            const paragraph = trigger.closest('p');
            if (!paragraph) return;

            if (this.activeChips.has(paragraph)) {
                this.closeChips(paragraph);
                return;
            }

            this.closeAllChips();
            this.openChips(trigger, paragraph);
        }

        openChips(trigger, paragraph) {
            try {
                // Base64 디코딩 + UTF-8 처리
                const encodedData = trigger.dataset.links;
                const jsonString = this.base64DecodeUTF8(encodedData);
                const linksData = JSON.parse(jsonString);
                
                const container = document.createElement('div');
                container.className = 'link-preview-chips flex flex-wrap gap-2 my-3 p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg opacity-0 -translate-y-2 transition-all duration-300 ease-out';
                
                linksData.forEach((link, index) => {
                    const chip = this.createChip(link, index);
                    container.appendChild(chip);
                });

                paragraph.insertAdjacentElement('afterend', container);
                
                this.activeChips.set(paragraph, container);
                
                // Active 상태 Tailwind 클래스로 적용
                trigger.classList.add('!bg-blue-500', '!border-blue-500', '!text-white');

                requestAnimationFrame(() => {
                    container.classList.remove('opacity-0', '-translate-y-2');
                    container.classList.add('opacity-100', 'translate-y-0');
                });

            } catch (e) {
                console.error('Failed to parse link data:', e);
            }
        }

        createChip(linkData, index) {
            const chip = document.createElement('div');
            chip.className = 'link-preview-chip relative inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 w-full sm:w-full max-w-[280px] group';
            chip.dataset.index = index;
            chip.setAttribute('tabindex', '0');
            chip.setAttribute('role', 'button');
            chip.setAttribute('aria-label', `링크: ${linkData.title}`);

            const faviconUrl = `https://www.google.com/s2/favicons?domain=${linkData.domain}&sz=32`;

            chip.innerHTML = `
                <img src="${faviconUrl}" 
                     alt="${this.escapeHtml(linkData.domain)}" 
                     class="w-4 h-4 rounded flex-shrink-0 !m-0"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23999%22 d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z%22/%3E%3C/svg%3E'">
                <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">${this.escapeHtml(this.truncate(linkData.title, 30))}</span>
                <svg class="w-3 h-3 text-zinc-500 dark:text-zinc-400 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;

            const popup = this.createPopup(linkData);
            chip.appendChild(popup);

            if (this.isMobile) {
                this.setupMobileInteraction(chip, popup, linkData);
            } else {
                this.setupDesktopInteraction(chip, popup, linkData);
            }

            // 키보드 접근성
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    chip.click();
                }
            });

            return chip;
        }

        setupDesktopInteraction(chip, popup, linkData) {
            let isPopupHovered = false;
            let isChipHovered = false;

            const showPopupHandler = () => {
                isChipHovered = true;
                this.clearPopupTimer(chip);
                this.showPopup(chip, popup);
            };

            const hidePopupHandler = () => {
                isChipHovered = false;
                this.schedulePopupHide(chip, popup, () => !isPopupHovered && !isChipHovered);
            };

            chip.addEventListener('mouseenter', showPopupHandler);
            chip.addEventListener('mouseleave', hidePopupHandler);

            popup.addEventListener('mouseenter', () => {
                isPopupHovered = true;
                this.clearPopupTimer(chip);
            });

            popup.addEventListener('mouseleave', () => {
                isPopupHovered = false;
                this.schedulePopupHide(chip, popup, () => !isPopupHovered && !isChipHovered);
            });

            chip.addEventListener('click', (e) => {
                if (!e.target.closest('.link-preview-popup') && !e.target.closest('.popup-link')) {
                    window.open(linkData.url, '_blank', 'noopener,noreferrer');
                }
            });
        }

        setupMobileInteraction(chip, popup, linkData) {
            let isPopupVisible = false;

            chip.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.target.closest('.popup-link')) {
                    return;
                }

                if (isPopupVisible) {
                    window.open(linkData.url, '_blank', 'noopener,noreferrer');
                } else {
                    this.hideAllPopups();
                    this.showPopup(chip, popup);
                    isPopupVisible = true;

                    const hideHandler = (event) => {
                        if (!chip.contains(event.target) && !popup.contains(event.target)) {
                            this.hidePopup(popup);
                            isPopupVisible = false;
                            document.removeEventListener('click', hideHandler);
                        }
                    };

                    setTimeout(() => {
                        document.addEventListener('click', hideHandler);
                    }, 100);
                }
            });
        }

        schedulePopupHide(chip, popup, condition) {
            const timer = setTimeout(() => {
                if (condition()) {
                    this.hidePopup(popup);
                }
                this.popupTimers.delete(chip);
            }, 200);
            
            this.popupTimers.set(chip, timer);
        }

        clearPopupTimer(chip) {
            const timer = this.popupTimers.get(chip);
            if (timer) {
                clearTimeout(timer);
                this.popupTimers.delete(chip);
            }
        }

        hideAllPopups() {
            document.querySelectorAll('.link-preview-popup').forEach(popup => {
                this.hidePopup(popup);
            });
        }

        createPopup(linkData) {
            const popup = document.createElement('div');
            popup.className = 'link-preview-popup absolute bottom-full left-0 mb-3 w-80 max-w-[90vw] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible translate-y-2 scale-95 transition-all duration-200 ease-out z-150 pointer-events-none cursor-auto';
            popup.setAttribute('role', 'tooltip');

            const hasImage = linkData.image && linkData.image.length > 0;

            const imageHTML = hasImage ? `
                <div class="w-full h-auto overflow-hidden bg-gray-100 dark:bg-zinc-700 aspect-16/9">
                    <img src="${linkData.image}" 
                         alt="${this.escapeHtml(linkData.title)}"
                         class="w-full h-full object-cover dark:brightness-90 !m-0 aspect-16/9"
                         onerror="this.parentElement.style.display='none'">
                </div>
            ` : '';

            const descriptionHTML = linkData.description ? `
                <p class="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3 overflow-hidden" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">${this.escapeHtml(this.truncate(linkData.description, 150))}</p>
            ` : '';

            popup.innerHTML = `
                ${imageHTML}
                <div class="p-4">
                    <h4 class="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug mb-2 overflow-hidden mt-0" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${this.escapeHtml(linkData.title)}</h4>
                    ${descriptionHTML}
                    <div class="flex items-center gap-1.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <svg class="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <span class="truncate">${this.escapeHtml(linkData.domain)}</span>
                    </div>
                    <a href="${this.escapeHtml(linkData.url)}" target="_blank" rel="noopener noreferrer" class="popup-link inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 !text-white text-sm font-medium rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
                        방문하기
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
                <div class="popup-arrow absolute -bottom-2 left-5 w-4 h-4 bg-white dark:bg-zinc-800 border-r border-b border-gray-200 dark:border-zinc-700 rotate-45 pointer-events-none"></div>
            `;

            return popup;
        }

        showPopup(chip, popup) {
            popup.classList.remove('opacity-0', 'invisible', 'translate-y-2', 'scale-95', 'pointer-events-none');
            popup.classList.add('opacity-100', 'visible', 'translate-y-0', 'scale-100', 'pointer-events-auto');
            
            requestAnimationFrame(() => {
                const rect = popup.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const arrow = popup.querySelector('.popup-arrow');
                
                if (rect.right > viewportWidth - 20) {
                    popup.style.left = 'auto';
                    popup.style.right = '0';
                    if (arrow) {
                        arrow.style.left = 'auto';
                        arrow.style.right = '1.25rem';
                    }
                }
                
                if (rect.left < 20) {
                    popup.style.left = '0';
                    popup.style.right = 'auto';
                    if (arrow) {
                        arrow.style.left = '1.25rem';
                        arrow.style.right = 'auto';
                    }
                }
            });
        }

        hidePopup(popup) {
            popup.classList.remove('opacity-100', 'visible', 'translate-y-0', 'scale-100', 'pointer-events-auto');
            popup.classList.add('opacity-0', 'invisible', 'translate-y-2', 'scale-95', 'pointer-events-none');
            popup.style.left = '';
            popup.style.right = '';
            
            const arrow = popup.querySelector('.popup-arrow');
            if (arrow) {
                arrow.style.left = '';
                arrow.style.right = '';
            }
        }

        closeChips(paragraph) {
            const container = this.activeChips.get(paragraph);
            if (!container) return;

            const trigger = paragraph.querySelector('.link-preview-trigger');
            if (trigger) {
                trigger.classList.remove('!bg-blue-500', '!border-blue-500', '!text-white');
            }

            container.classList.remove('opacity-100', 'translate-y-0');
            container.classList.add('opacity-0', '-translate-y-2');
            
            setTimeout(() => {
                container.remove();
                this.activeChips.delete(paragraph);
            }, 300);
        }

        closeAllChips() {
            this.activeChips.forEach((container, paragraph) => {
                this.closeChips(paragraph);
            });
        }

        truncate(text, length) {
            if (!text) return '';
            if (text.length <= length) return text;
            return text.substring(0, length) + '...';
        }

        base64DecodeUTF8(base64String) {
            // Base64 디코딩 후 UTF-8 처리
            const binaryString = atob(base64String);
            const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(bytes);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new LinkPreview());
    } else {
        new LinkPreview();
    }

    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.link-preview-trigger') && 
            !e.target.closest('.link-preview-chips')) {
            document.querySelectorAll('.link-preview-chips').forEach(chips => {
                chips.classList.remove('opacity-100', 'translate-y-0');
                chips.classList.add('opacity-0', '-translate-y-2');
                setTimeout(() => chips.remove(), 300);
            });
            document.querySelectorAll('.link-preview-trigger').forEach(trigger => {
                trigger.classList.remove('!bg-blue-500', '!border-blue-500', '!text-white');
            });
        }
    });

})();