(function() {
    'use strict';
    
    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerImageWrapper = document.getElementById('viewer-image-wrapper');
    const viewerContainer = document.getElementById('viewer-container');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerLoading = document.getElementById('viewer-loading');
    
    const closeBtn = document.getElementById('viewer-close');
    const hideBtn = document.getElementById('viewer-hide-controls');
    const prevBtn = document.getElementById('viewer-prev');
    const nextBtn = document.getElementById('viewer-next');
    const downloadBtn = document.getElementById('viewer-download');
    const shareBtn = document.getElementById('viewer-share');
    const rotateBtn = document.getElementById('viewer-rotate');
    const fullscreenBtn = document.getElementById('viewer-fullscreen');
    const zoomInBtn = document.getElementById('viewer-zoom-in');
    const zoomOutBtn = document.getElementById('viewer-zoom-out');
    const zoomResetBtn = document.getElementById('viewer-zoom-reset');
    const zoomLevelDisplay = document.getElementById('viewer-zoom-level');
    
    const filterToggleBtn = document.getElementById('viewer-filter-toggle');
    const filterMenu = document.getElementById('viewer-filter-menu');
    const applyToAllBtn = document.getElementById('viewer-apply-to-all');
    const resetEffectsBtn = document.getElementById('viewer-reset-effects');
    const imageRenderingSelect = document.getElementById('image-rendering');
    
    const filterControls = {
        grayscale: { slider: document.getElementById('filter-grayscale'), input: document.getElementById('filter-grayscale-input'), default: 0 },
        sepia: { slider: document.getElementById('filter-sepia'), input: document.getElementById('filter-sepia-input'), default: 0 },
        invert: { slider: document.getElementById('filter-invert'), input: document.getElementById('filter-invert-input'), default: 0 },
        saturate: { slider: document.getElementById('filter-saturate'), input: document.getElementById('filter-saturate-input'), default: 100 },
        contrast: { slider: document.getElementById('filter-contrast'), input: document.getElementById('filter-contrast-input'), default: 100 },
        brightness: { slider: document.getElementById('filter-brightness'), input: document.getElementById('filter-brightness-input'), default: 100 },
        blur: { slider: document.getElementById('filter-blur'), input: document.getElementById('filter-blur-input'), default: 0 },
        hue: { slider: document.getElementById('filter-hue'), input: document.getElementById('filter-hue-input'), default: 0 }
    };
    
    let images = [];
    let currentIndex = 0;
    let zoomController = null;
    let gestureHandler = null;
    let isFullscreen = false;
    let imageEffects = [];
    
    // 슬라이드 관련 변수
    let slideContainer = null;
    let slideImages = {
        prev: null,
        current: null,
        next: null
    };
    let isSliding = false;
    let slideOffset = 0;
    
    function initImageViewer() {
        const articleImages = document.querySelectorAll('.prose img');
        if (articleImages.length === 0) return;
        
        images = Array.from(articleImages);
        imageEffects = images.map(() => getDefaultEffects());
        
        images.forEach((img, index) => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => openViewer(index));
        });
        
        setupSlideContainer();
        setupEventListeners();
    }
    
    function setupSlideContainer() {
        // 기존 이미지 컨테이너를 슬라이드 컨테이너로 변환
        slideContainer = document.createElement('div');
        slideContainer.className = 'slide-container';
        slideContainer.style.cssText = `
            display: flex;
            width: 300%;
            height: 100%;
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;
        
        // 3개의 이미지 슬롯 생성
        ['prev', 'current', 'next'].forEach(key => {
            const slot = document.createElement('div');
            slot.className = `slide-slot slide-${key}`;
            slot.style.cssText = `
                width: 33.333%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            `;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'viewer-image-wrapper zooming';
            wrapper.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            `;
            
            const img = document.createElement('img');
            img.className = 'viewer-image';
            img.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                user-select: none;
            `;
            
            wrapper.appendChild(img);
            slot.appendChild(wrapper);
            slideContainer.appendChild(slot);
            
            slideImages[key] = {
                slot: slot,
                wrapper: wrapper,
                img: img
            };
        });
        
        // 기존 구조 대체
        viewerContainer.innerHTML = '';
        viewerContainer.appendChild(slideContainer);
        
        // 초기 위치 설정 (중앙)
        slideContainer.style.transform = 'translateX(-33.333%)';
    }
    
    function getDefaultEffects() {
        return {
            grayscale: 0,
            sepia: 0,
            invert: 0,
            saturate: 100,
            contrast: 100,
            brightness: 100,
            blur: 0,
            hue: 0,
            rendering: 'auto'
        };
    }
    
    function showControls() {
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.remove('hide'));
    }

    function hideControls(e) {
        e.stopPropagation();
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.add('hide'));
    }

    function setupEventListeners() {
        closeBtn.addEventListener('click', closeViewer);
        prevBtn.addEventListener('click', showPrev);
        nextBtn.addEventListener('click', showNext);

        viewer.addEventListener('click', showControls);
        hideBtn.addEventListener('click', hideControls);
        
        zoomInBtn.addEventListener('click', () => {
            if (zoomController) {
                const rect = viewerContainer.getBoundingClientRect();
                const scale = zoomController.zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                updateZoomDisplay(scale);
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            if (zoomController) {
                const rect = viewerContainer.getBoundingClientRect();
                const scale = zoomController.zoomOut(rect.left + rect.width / 2, rect.top + rect.height / 2);
                updateZoomDisplay(scale);
            }
        });
        
        zoomResetBtn.addEventListener('click', () => {
            if (zoomController) {
                const scale = zoomController.resetZoom();
                updateZoomDisplay(scale);
            }
        });
        
        rotateBtn.addEventListener('click', () => {
            if (zoomController) zoomController.rotate(90);
        });
        
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        downloadBtn.addEventListener('click', downloadImage);
        shareBtn.addEventListener('click', shareImage);
        
        filterToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterMenu.classList.toggle('hidden');
        });
        
        Object.keys(filterControls).forEach(key => {
            const control = filterControls[key];
            
            control.slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                control.input.value = value;
                updateFilterValue(key, value);
            });
            
            control.input.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    control.slider.value = value;
                    updateFilterValue(key, value);
                }
            });
        });
        
        imageRenderingSelect.addEventListener('change', (e) => {
            imageEffects[currentIndex].rendering = e.target.value;
            applyStoredEffect();
        });
        
        applyToAllBtn.addEventListener('click', applyEffectToAll);
        resetEffectsBtn.addEventListener('click', resetEffects);
        
        document.addEventListener('click', (e) => {
            if (!filterMenu.contains(e.target) && e.target !== filterToggleBtn) {
                filterMenu.classList.add('hidden');
            }
        });
        
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer || e.target === viewerContainer) {
                if (zoomController && zoomController.getState().isZoomed) {
                    const scale = zoomController.resetZoom();
                    updateZoomDisplay(scale);
                } else {
                    closeViewer();
                }
            }
        });
        
        document.addEventListener('keydown', handleKeyboard);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }
    
    function updateFilterValue(key, value) {
        imageEffects[currentIndex][key] = value;
        applyStoredEffect();
    }

    function closeOnBack() {
        closeViewer();
    }
    
    function openViewer(index) {
        currentIndex = index;
        showLoading();

        window.addEventListener('popstate', closeOnBack);
        history.pushState({ imageViewer: true }, '', '#viewer');
        
        loadSlideImages();
        
        viewer.classList.remove('hidden');
        viewer.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        updateViewer();
        hideLoading();
        
        initGestureHandler();
    }
    
    function loadSlideImages() {
        // 현재 이미지
        const currentImg = images[currentIndex];
        slideImages.current.img.src = currentImg.src;
        slideImages.current.img.alt = currentImg.alt || '';
        
        // 이전 이미지
        if (currentIndex > 0) {
            const prevImg = images[currentIndex - 1];
            slideImages.prev.img.src = prevImg.src;
            slideImages.prev.img.alt = prevImg.alt || '';
            slideImages.prev.slot.style.visibility = 'visible';
        } else {
            slideImages.prev.img.src = '';
            slideImages.prev.slot.style.visibility = 'hidden';
        }
        
        // 다음 이미지
        if (currentIndex < images.length - 1) {
            const nextImg = images[currentIndex + 1];
            slideImages.next.img.src = nextImg.src;
            slideImages.next.img.alt = nextImg.alt || '';
            slideImages.next.slot.style.visibility = 'visible';
        } else {
            slideImages.next.img.src = '';
            slideImages.next.slot.style.visibility = 'hidden';
        }
        
        // 슬라이드 위치 리셋
        slideContainer.style.transition = 'none';
        slideContainer.style.transform = 'translateX(-33.333%)';
        slideOffset = 0;
        
        // 트랜지션 복원
        requestAnimationFrame(() => {
            slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
    }
    
    function initGestureHandler() {
        if (gestureHandler) {
            gestureHandler.destroy();
        }
        
        if (zoomController) {
            zoomController.destroy();
        }
        
        zoomController = new ZoomController(
            slideImages.current.wrapper,
            slideImages.current.img
        );
        
        gestureHandler = new GestureHandler(viewerContainer, {
            onDoubleTap: (point) => {
                if (zoomController) {
                    const scale = zoomController.toggleZoom(point.x, point.y);
                    updateZoomDisplay(scale);
                }
            },
            
            onPinchStart: (center) => {
                if (zoomController) {
                    // 핀치 시작
                }
            },
            
            onPinch: (scale, center, lastScale) => {
                if (zoomController) {
                    const newScale = zoomController.pinchZoom(scale, center, lastScale);
                    updateZoomDisplay(newScale);
                }
            },
            
            onPinchEnd: () => {
                if (zoomController) {
                    // 핀치 종료
                }
            },
            
            onDragStart: (point) => {
                if (zoomController) {
                    const started = zoomController.startDrag(point.x, point.y);
                    return started; // true면 드래그, false면 슬라이드
                }
                return false;
            },
            
            onDrag: (data) => {
                if (zoomController) {
                    return zoomController.drag(data.x, data.y);
                }
                return false;
            },
            
            onDragEnd: () => {
                if (zoomController) {
                    zoomController.endDrag();
                }
            },
            
            onSlide: (data) => {
                if (!isSliding && zoomController && !zoomController.getState().isZoomed) {
                    isSliding = true;
                    
                    // 슬라이드 오프셋 적용
                    const containerWidth = viewerContainer.getBoundingClientRect().width;
                    const progress = data.deltaX / containerWidth;
                    const offset = -33.333 + (progress * 33.333);
                    
                    slideContainer.style.transition = 'none';
                    slideContainer.style.transform = `translateX(${offset}%)`;
                    slideOffset = data.deltaX;
                }
            },
            
            onSlideEnd: (data) => {
                if (isSliding) {
                    const containerWidth = viewerContainer.getBoundingClientRect().width;
                    const threshold = containerWidth * 0.3;
                    const velocity = data.velocity;
                    
                    // 속도 또는 거리 기준으로 슬라이드 결정
                    const shouldSlide = Math.abs(data.deltaX) > threshold || Math.abs(velocity) > 0.5;
                    
                    if (shouldSlide) {
                        if (data.direction === 'right' && currentIndex > 0) {
                            // 이전 이미지로
                            slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                            slideContainer.style.transform = 'translateX(0)';
                            
                            setTimeout(() => {
                                currentIndex--;
                                loadSlideImages();
                                updateViewer();
                            }, 300);
                        } else if (data.direction === 'left' && currentIndex < images.length - 1) {
                            // 다음 이미지로
                            slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                            slideContainer.style.transform = 'translateX(-66.666%)';
                            
                            setTimeout(() => {
                                currentIndex++;
                                loadSlideImages();
                                updateViewer();
                            }, 300);
                        } else {
                            // 원위치
                            slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                            slideContainer.style.transform = 'translateX(-33.333%)';
                        }
                    } else {
                        // 원위치
                        slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                        slideContainer.style.transform = 'translateX(-33.333%)';
                    }
                    
                    isSliding = false;
                    slideOffset = 0;
                }
            },
            
            onWheel: (scale, center) => {
                if (zoomController) {
                    const currentScale = zoomController.getState().scale;
                    const newScale = currentScale * scale;
                    zoomController.setZoom(newScale, center.x, center.y, false);
                    updateZoomDisplay(newScale);
                }
            }
        });
    }
    
    function closeViewer() {
        viewer.classList.remove('flex');
        viewer.classList.add('hidden');
        document.body.style.overflow = '';
        
        if (gestureHandler) {
            gestureHandler.destroy();
            gestureHandler = null;
        }
        
        if (zoomController) {
            zoomController.destroy();
            zoomController = null;
        }

        window.removeEventListener('popstate', closeOnBack);
        
        if (window.location.hash === '#viewer') {
            history.back();
        }
    }
    
    function showPrev() {
        if (currentIndex > 0 && !isSliding) {
            slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            slideContainer.style.transform = 'translateX(0)';
            
            setTimeout(() => {
                currentIndex--;
                loadSlideImages();
                updateViewer();
            }, 300);
        }
    }
    
    function showNext() {
        if (currentIndex < images.length - 1 && !isSliding) {
            slideContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            slideContainer.style.transform = 'translateX(-66.666%)';
            
            setTimeout(() => {
                currentIndex++;
                loadSlideImages();
                updateViewer();
            }, 300);
        }
    }
    
    function updateViewer() {
        viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === images.length - 1;
        
        if (zoomController) {
            zoomController.reset();
            updateZoomDisplay(1);
        }
        
        loadEffectsToUI();
        applyStoredEffect();
    }
    
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        zoomLevelDisplay.textContent = `${percentage}%`;
    }
    
    function loadEffectsToUI() {
        const effect = imageEffects[currentIndex];
        
        Object.keys(filterControls).forEach(key => {
            const control = filterControls[key];
            const value = effect[key];
            control.slider.value = value;
            control.input.value = value;
        });
        
        imageRenderingSelect.value = effect.rendering || 'auto';
    }
    
    function applyStoredEffect() {
        const effect = imageEffects[currentIndex];
        const img = slideImages.current.img;
        
        const filters = [];
        if (effect.grayscale > 0) filters.push(`grayscale(${effect.grayscale}%)`);
        if (effect.sepia > 0) filters.push(`sepia(${effect.sepia}%)`);
        if (effect.invert > 0) filters.push(`invert(${effect.invert}%)`);
        if (effect.saturate !== 100) filters.push(`saturate(${effect.saturate}%)`);
        if (effect.contrast !== 100) filters.push(`contrast(${effect.contrast}%)`);
        if (effect.brightness !== 100) filters.push(`brightness(${effect.brightness}%)`);
        if (effect.blur > 0) filters.push(`blur(${effect.blur}px)`);
        if (effect.hue > 0) filters.push(`hue-rotate(${effect.hue}deg)`);
        
        img.style.filter = filters.length > 0 ? filters.join(' ') : '';
        img.style.imageRendering = effect.rendering;
    }
    
    function applyEffectToAll() {
        const currentEffect = { ...imageEffects[currentIndex] };
        
        for (let i = 0; i < imageEffects.length; i++) {
            imageEffects[i] = { ...currentEffect };
        }
        
        showToast('현재 효과가 모든 이미지에 적용되었습니다', 'success');
    }
    
    function resetEffects() {
        imageEffects[currentIndex] = getDefaultEffects();
        loadEffectsToUI();
        applyStoredEffect();
        showToast('효과가 초기화되었습니다', 'info');
    }
    
    function showToast(message, type) {
        const bgColor = type === 'success' ? 'bg-green-600' : 'bg-blue-600';
        const toast = document.createElement('div');
        toast.className = `fixed top-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[1001]`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }
    
    async function downloadImage() {
        try {
            const img = images[currentIndex];
            const response = await fetch(img.src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = img.alt || `image-${currentIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('다운로드 실패:', error);
            alert('이미지 다운로드에 실패했습니다.');
        }
    }
    
    async function shareImage() {
        const img = images[currentIndex];
        
        if (navigator.share) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const file = new File([blob], img.alt || 'image.jpg', { type: blob.type });
                
                await navigator.share({
                    title: img.alt || '이미지',
                    files: [file]
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('공유 실패:', error);
                    fallbackShare(img);
                }
            }
        } else {
            fallbackShare(img);
        }
    }
    
    function fallbackShare(img) {
        const url = img.src;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                alert('이미지 URL이 클립보드에 복사되었습니다.');
            }).catch(err => {
                console.error('복사 실패:', err);
                prompt('이미지 URL:', url);
            });
        } else {
            prompt('이미지 URL:', url);
        }
    }
    
    function toggleFullscreen() {
        if (!isFullscreen) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }
    
    function enterFullscreen() {
        const elem = viewer;
        
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }
    
    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
    
    function handleFullscreenChange() {
        isFullscreen = !!(document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement);
        
        const icon = fullscreenBtn.querySelector('.material-symbols-outlined');
        icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
    }
    
    function handleKeyboard(e) {
        if (viewer.classList.contains('hidden')) return;
        
        switch(e.key) {
            case 'Escape':
                if (zoomController && zoomController.getState().isZoomed) {
                    const scale = zoomController.resetZoom();
                    updateZoomDisplay(scale);
                } else {
                    closeViewer();
                }
                break;
            case 'ArrowLeft':
                showPrev();
                break;
            case 'ArrowRight':
                showNext();
                break;
            case '+':
            case '=':
                if (zoomController) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = zoomController.zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '-':
            case '_':
                if (zoomController) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = zoomController.zoomOut(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '0':
                if (zoomController) {
                    const scale = zoomController.resetZoom();
                    updateZoomDisplay(scale);
                }
                break;
            case 'r':
            case 'R':
                if (zoomController) zoomController.rotate(90);
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
        }
    }
    
    function showLoading() {
        viewerLoading.classList.remove('hidden');
    }
    
    function hideLoading() {
        viewerLoading.classList.add('hidden');
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImageViewer);
    } else {
        initImageViewer();
    }
    
})();