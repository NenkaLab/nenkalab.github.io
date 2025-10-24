// assets/js/link-preview.js
(function() {
    'use strict';

    class LinkPreview {
        constructor() {
            this.activeChips = new Map();
            this.popupTimers = new Map();
            this.isMobile = this.detectMobile();
            this.touchedChips = new Set();
            this.init();
        }

        init() {
            this.attachTriggerListeners();
            this.setupMobileDetection();
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
                const linksData = JSON.parse(trigger.dataset.links);
                
                const container = document.createElement('div');
                container.className = 'link-preview-chips flex flex-wrap gap-2 my-3 p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg opacity-0 -translate-y-2 transition-all duration-300';
                
                linksData.forEach((link, index) => {
                    const chip = this.createChip(link, index);
                    container.appendChild(chip);
                });

                paragraph.insertAdjacentElement('afterend', container);
                
                this.activeChips.set(paragraph, container);
                trigger.classList.add('active');

                setTimeout(() => {
                    container.classList.remove('opacity-0', '-translate-y-2');
                    container.classList.add('opacity-100', 'translate-y-0');
                }, 10);

            } catch (e) {
                console.error('Failed to parse link data:', e);
            }
        }

        createChip(linkData, index) {
            const chip = document.createElement('div');
            chip.className = 'link-preview-chip relative inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 max-w-[280px]';
            chip.dataset.index = index;

            const faviconUrl = `https://www.google.com/s2/favicons?domain=${linkData.domain}&sz=32`;

            chip.innerHTML = `
                <img src="${faviconUrl}" 
                     alt="${linkData.domain}" 
                     class="chip-favicon w-4 h-4 rounded flex-shrink-0"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23999%22 d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z%22/%3E%3C/svg%3E'">
                <span class="chip-title text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">${this.truncate(linkData.title, 30)}</span>
                <svg class="chip-arrow w-3 h-3 text-zinc-500 dark:text-zinc-400 flex-shrink-0 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            popup.className = 'link-preview-popup absolute bottom-full left-0 mb-3 w-80 max-w-[90vw] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible translate-y-2 scale-95 transition-all duration-200 z-[1000] pointer-events-none';

            const hasImage = linkData.image && linkData.image.length > 0;

            popup.innerHTML = `
                ${hasImage ? `
                    <div class="popup-image w-full h-40 overflow-hidden bg-gray-100 dark:bg-zinc-700">
                        <img src="${linkData.image}" 
                             alt="${linkData.title}"
                             class="w-full h-full object-cover"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                <div class="popup-content p-4">
                    <h4 class="popup-title text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug mb-2 line-clamp-2">${linkData.title}</h4>
                    ${linkData.description ? `
                        <p class="popup-description text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3 line-clamp-3">${this.truncate(linkData.description, 150)}</p>
                    ` : ''}
                    <div class="popup-url flex items-center gap-1.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <svg class="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <span class="truncate">${linkData.domain}</span>
                    </div>
                    <a href="${linkData.url}" target="_blank" rel="noopener noreferrer" class="popup-link inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
                        방문하기
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
                <div class="popup-arrow absolute -bottom-2 left-5 w-4 h-4 bg-white dark:bg-zinc-800 border-r border-b border-gray-200 dark:border-zinc-700 rotate-45"></div>
            `;

            return popup;
        }

        showPopup(chip, popup) {
            popup.classList.remove('opacity-0', 'invisible', 'translate-y-2', 'scale-95');
            popup.classList.add('opacity-100', 'visible', 'translate-y-0', 'scale-100', 'pointer-events-auto');
            
            setTimeout(() => {
                const rect = popup.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                
                if (rect.right > viewportWidth - 20) {
                    popup.style.left = 'auto';
                    popup.style.right = '0';
                }
                
                if (rect.left < 20) {
                    popup.style.left = '0';
                    popup.style.right = 'auto';
                }
            }, 10);
        }

        hidePopup(popup) {
            popup.classList.remove('opacity-100', 'visible', 'translate-y-0', 'scale-100', 'pointer-events-auto');
            popup.classList.add('opacity-0', 'invisible', 'translate-y-2', 'scale-95', 'pointer-events-none');
            popup.style.left = '';
            popup.style.right = '';
        }

        closeChips(paragraph) {
            const container = this.activeChips.get(paragraph);
            if (!container) return;

            const trigger = paragraph.querySelector('.link-preview-trigger');
            if (trigger) {
                trigger.classList.remove('active');
            }

            container.classList.remove('opacity-100', 'translate-y-0');
            container.classList.add('opacity-0', '-translate-y-2');
            
            setTimeout(() => {
                container.remove();
                this.activeChips.delete(paragraph);
            }, 200);
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new LinkPreview());
    } else {
        new LinkPreview();
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.link-preview-trigger') && 
            !e.target.closest('.link-preview-chips')) {
            document.querySelectorAll('.link-preview-chips').forEach(chips => {
                chips.classList.remove('opacity-100', 'translate-y-0');
                chips.classList.add('opacity-0', '-translate-y-2');
                setTimeout(() => chips.remove(), 200);
            });
            document.querySelectorAll('.link-preview-trigger.active').forEach(trigger => {
                trigger.classList.remove('active');
            });
        }
    });

})();