// assets/js/link-preview.js
(function() {
    'use strict';

    class LinkPreview {
        constructor() {
            this.activeChips = new Map();
            this.init();
        }

        init() {
            this.attachTriggerListeners();
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

            // 이미 열려있으면 닫기
            if (this.activeChips.has(paragraph)) {
                this.closeChips(paragraph);
                return;
            }

            // 다른 열려있는 chips 닫기
            this.closeAllChips();

            // 새로운 chips 생성
            this.openChips(trigger, paragraph);
        }

        openChips(trigger, paragraph) {
            try {
                const linksData = JSON.parse(trigger.dataset.links);
                
                // Chips 컨테이너 생성
                const container = document.createElement('div');
                container.className = 'link-preview-chips';
                
                linksData.forEach((link, index) => {
                    const chip = this.createChip(link, index);
                    container.appendChild(chip);
                });

                // 문단 바로 다음에 삽입
                paragraph.insertAdjacentElement('afterend', container);
                
                // 활성 상태 저장
                this.activeChips.set(paragraph, container);
                trigger.classList.add('active');

                // 애니메이션
                setTimeout(() => container.classList.add('show'), 10);

            } catch (e) {
                console.error('Failed to parse link data:', e);
            }
        }

        createChip(linkData, index) {
            const chip = document.createElement('div');
            chip.className = 'link-preview-chip';
            chip.dataset.index = index;

            const faviconUrl = `https://www.google.com/s2/favicons?domain=${linkData.domain}&sz=32`;

            chip.innerHTML = `
                <img src="${faviconUrl}" 
                     alt="${linkData.domain}" 
                     class="chip-favicon"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23999%22 d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z%22/%3E%3C/svg%3E'">
                <span class="chip-title">${this.truncate(linkData.title, 30)}</span>
                <svg class="chip-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;

            // 팝업 생성
            const popup = this.createPopup(linkData);
            chip.appendChild(popup);

            // 호버 이벤트
            chip.addEventListener('mouseenter', () => this.showPopup(chip, popup));
            chip.addEventListener('mouseleave', () => this.hidePopup(popup));

            // 클릭 이벤트 - 링크 열기
            chip.addEventListener('click', (e) => {
                if (!e.target.closest('.link-preview-popup')) {
                    window.open(linkData.url, '_blank', 'noopener,noreferrer');
                }
            });

            return chip;
        }

        createPopup(linkData) {
            const popup = document.createElement('div');
            popup.className = 'link-preview-popup';

            const hasImage = linkData.image && linkData.image.length > 0;

            popup.innerHTML = `
                ${hasImage ? `
                    <div class="popup-image">
                        <img src="${linkData.image}" 
                             alt="${linkData.title}"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}
                <div class="popup-content">
                    <h4 class="popup-title">${linkData.title}</h4>
                    ${linkData.description ? `
                        <p class="popup-description">${this.truncate(linkData.description, 150)}</p>
                    ` : ''}
                    <div class="popup-url">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <span>${linkData.domain}</span>
                    </div>
                    <a href="${linkData.url}" target="_blank" rel="noopener noreferrer" class="popup-link">
                        방문하기
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            `;

            return popup;
        }

        showPopup(chip, popup) {
            popup.classList.add('show');
            
            // 위치 조정 (화면 밖으로 나가지 않게)
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
            popup.classList.remove('show');
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

            container.classList.remove('show');
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
                chips.classList.remove('show');
                setTimeout(() => chips.remove(), 200);
            });
            document.querySelectorAll('.link-preview-trigger.active').forEach(trigger => {
                trigger.classList.remove('active');
            });
        }
    });

})();