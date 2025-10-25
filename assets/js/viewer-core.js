(function() {
    'use strict';
    
    const viewer = document.getElementById('image-viewer');
    const viewerContainer = document.getElementById('viewer-container');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerLoading = document.getElementById('viewer-loading');
    
    const closeBtn = document.getElementById('viewer-close');
    const hideBtn = document.getElementById('viewer-hide-controls');
    const prevBtn = document.getElementById('viewer-prev');
    const nextBtn = document.getElementById('viewer-next');
    const downloadBtn = document.getElementById('viewer-download');
    const shareBtn = document.getElementById('viewer-share');
    const rotateLeftBtn = document.getElementById('viewer-rotate-left');
    const rotateRightBtn = document.getElementById('viewer-rotate-right');
    const fullscreenBtn = document.getElementById('viewer-fullscreen');
    const zoomInBtn = document.getElementById('viewer-zoom-in');
    const zoomOutBtn = document.getElementById('viewer-zoom-out');
    const zoomResetBtn = document.getElementById('viewer-zoom-reset');
    const rotateResetBtn = document.getElementById('viewer-rotate-reset');
    const zoomLevelDisplay = document.getElementById('viewer-zoom-level');
    const rotateLevelDisplay = document.getElementById('viewer-rotate-level');
    
    const filterToggleBtn = document.getElementById('viewer-filter-toggle');
    const filterMenu = document.getElementById('viewer-filter-menu');
    const applyToAllBtn = document.getElementById('viewer-apply-to-all');
    const resetEffectsBtn = document.getElementById('viewer-reset-effects');
    const imageRenderingSelect = document.getElementById('image-rendering');
    const performanceModeSelect = document.getElementById('performance-mode');
    
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
    let imageStack = [];
    let gestureHandler = null;
    let isFullscreen = false;
    let imageEffects = [];
    let performanceMode = 'performance';
    
    function initImageViewer() {
        const articleImages = document.querySelectorAll('.prose img');
        if (articleImages.length === 0) return;
        
        images = Array.from(articleImages);
        imageEffects = images.map(() => getDefaultEffects());
        
        images.forEach((img, index) => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => openViewer(index));
        });
        
        setupEventListeners();
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
        controls.forEach(control => control.classList.remove('opacity-0', 'pointer-events-none'));
    }

    function hideControls(e) {
        e.stopPropagation();
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.add('opacity-0', 'pointer-events-none'));
    }

    function setupEventListeners() {
        closeBtn.addEventListener('click', closeViewer);
        prevBtn.addEventListener('click', showPrev);
        nextBtn.addEventListener('click', showNext);

        viewer.addEventListener('click', showControls);
        hideBtn.addEventListener('click', hideControls);
        
        zoomInBtn.addEventListener('click', () => {
            const current = getCurrentZoomController();
            if (current) {
                const rect = viewerContainer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const scale = current.zoomIn(centerX, centerY);
                updateZoomDisplay(scale);
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            const current = getCurrentZoomController();
            if (current) {
                const rect = viewerContainer.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const scale = current.zoomOut(centerX, centerY);
                updateZoomDisplay(scale);
            }
        });
        
        zoomResetBtn.addEventListener('click', () => {
            const current = getCurrentZoomController();
            if (current) {
                const scale = current.resetZoom(true);
                updateZoomDisplay(scale);
            }
        });
        
        rotateLeftBtn.addEventListener('click', () => {
            const current = getCurrentZoomController();
            if (current) {
                current.rotate(-90, true);
                updateRotateDisplay(current.getState().rotation);
            }
        });
        
        rotateRightBtn.addEventListener('click', () => {
            const current = getCurrentZoomController();
            if (current) {
                current.rotate(90, true);
                updateRotateDisplay(current.getState().rotation);
            }
        });
        
        rotateResetBtn.addEventListener('click', () => {
            const current = getCurrentZoomController();
            if (current) {
                current.resetRotation(true);
                updateRotateDisplay(0);
            }
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
        
        performanceModeSelect.addEventListener('change', (e) => {
            performanceMode = e.target.value;
            applyPerformanceMode();
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
                const current = getCurrentZoomController();
                if (current && current.getState().isZoomed) {
                    const scale = current.resetZoom(true);
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
        
        createImageStack();
        
        viewer.classList.remove('hidden');
        viewer.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        updateViewer();
        hideLoading();
        
        initGestureHandler();
    }
    
    function createImageStack() {
        imageStack.forEach(item => {
            if (item.zoomController) {
                item.zoomController.destroy();
            }
            if (item.wrapper) {
                item.wrapper.remove();
            }
        });
        imageStack = [];
        viewerContainer.innerHTML = '';
        
        images.forEach((srcImg, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'absolute inset-0 flex items-center justify-center';
            wrapper.style.willChange = 'transform';
            wrapper.style.transition = 'none';
            
            const img = document.createElement('img');
            img.src = srcImg.src;
            img.alt = srcImg.alt || '';
            img.className = 'max-w-full max-h-full object-contain select-none';
            img.style.pointerEvents = 'none';
            img.draggable = false;
            
            wrapper.appendChild(img);
            
            if (index === currentIndex) {
                wrapper.style.opacity = '1';
                wrapper.style.visibility = 'visible';
                wrapper.style.zIndex = '1';
                wrapper.style.pointerEvents = 'auto';
            } else {
                wrapper.style.opacity = '0';
                wrapper.style.visibility = 'hidden';
                wrapper.style.zIndex = '0';
                wrapper.style.pointerEvents = 'none';
            }
            
            viewerContainer.appendChild(wrapper);
            
            const zoomController = new ZoomController(wrapper, img, {
                minScale: 1,
                maxScale: 50,
                scaleStep: 0.2,
                doubleTapScale: 3
            });
            
            imageStack.push({
                wrapper: wrapper,
                img: img,
                zoomController: zoomController
            });
        });
    }
    
    function getCurrentZoomController() {
        return imageStack[currentIndex]?.zoomController;
    }
    
    function switchToImage(newIndex) {
        if (newIndex < 0 || newIndex >= images.length) return;
        
        const oldIndex = currentIndex;
        
        const oldItem = imageStack[oldIndex];
        if (oldItem) {
            oldItem.wrapper.style.opacity = '0';
            oldItem.wrapper.style.visibility = 'hidden';
            oldItem.wrapper.style.zIndex = '0';
            oldItem.wrapper.style.pointerEvents = 'none';
            
            oldItem.zoomController.reset(false);
        }
        
        currentIndex = newIndex;
        const newItem = imageStack[currentIndex];
        if (newItem) {
            newItem.wrapper.style.opacity = '1';
            newItem.wrapper.style.visibility = 'visible';
            newItem.wrapper.style.zIndex = '1';
            newItem.wrapper.style.pointerEvents = 'auto';
        }
        
        updateViewer();
    }
    
    function initGestureHandler() {
        if (gestureHandler) {
            gestureHandler.destroy();
        }
        
        gestureHandler = new GestureHandler(viewerContainer, {
            onDoubleTap: (point) => {
                const current = getCurrentZoomController();
                if (current) {
                    const scale = current.toggleZoom(point.x, point.y);
                    updateZoomDisplay(scale);
                }
            },
            
            onPinchStart: (center) => {
                const current = getCurrentZoomController();
                if (current) {
                    // Handled in pinchZoom
                }
            },
            
            onPinch: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    const scale = current.pinchZoom(data);
                    updateZoomDisplay(scale);
                }
            },
            
            onPinchEnd: () => {
                const current = getCurrentZoomController();
                if (current) {
                    current.endPinch();
                }
            },
            
            onRotate: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    current.rotate(data.angle, false);
                    updateRotateDisplay(current.getState().rotation);
                }
            },
            
            onDragStart: (point) => {
                const current = getCurrentZoomController();
                if (current) {
                    const started = current.startDrag(point.x, point.y);
                    return started;
                }
                return false;
            },
            
            onDrag: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    const isDragging = current.drag(data.deltaX, data.deltaY);
                    
                    if (!isDragging && !current.getState().isZoomed) {
                        const progress = data.totalDeltaX / viewerContainer.offsetWidth;
                        
                        if (Math.abs(progress) > 0.3) {
                            const opacity = 1 - Math.abs(progress) * 0.5;
                            imageStack[currentIndex].wrapper.style.opacity = opacity.toString();
                        }
                    }
                    
                    return isDragging;
                }
                return false;
            },
            
            onDragEnd: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    current.endDrag();
                    
                    if (!current.getState().isZoomed) {
                        const threshold = viewerContainer.offsetWidth * 0.3;
                        const velocity = Math.abs(data.velocityX);
                        
                        if (Math.abs(data.totalDeltaX) > threshold || velocity > 0.5) {
                            if (data.totalDeltaX > 0) {
                                showPrev();
                            } else {
                                showNext();
                            }
                        } else {
                            imageStack[currentIndex].wrapper.style.opacity = '1';
                        }
                    }
                }
            },
            
            onWheel: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    const currentScale = current.getState().scale;
                    const newScale = currentScale * data.scale;
                    current.setZoom(newScale, data.center.x, data.center.y, false);
                    updateZoomDisplay(newScale);
                }
            },
            
            onWheelRotate: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    current.rotate(data.angle, false);
                    updateRotateDisplay(current.getState().rotation);
                }
            },
            
            onPenZoom: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    const currentScale = current.getState().scale;
                    const newScale = currentScale * data.scale;
                    current.setZoom(newScale, data.center.x, data.center.y, false);
                    updateZoomDisplay(newScale);
                }
            },
            
            onPenRotate: (data) => {
                const current = getCurrentZoomController();
                if (current) {
                    current.setRotation(data.angle, false);
                    updateRotateDisplay(current.getState().rotation);
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
        
        imageStack.forEach(item => {
            if (item.zoomController) {
                item.zoomController.destroy();
            }
        });
        imageStack = [];
        viewerContainer.innerHTML = '';

        window.removeEventListener('popstate', closeOnBack);
        
        if (window.location.hash === '#viewer') {
            history.back();
        }
    }
    
    function showPrev() {
        if (currentIndex > 0) {
            switchToImage(currentIndex - 1);
        }
    }
    
    function showNext() {
        if (currentIndex < images.length - 1) {
            switchToImage(currentIndex + 1);
        }
    }
    
    function updateViewer() {
        viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === images.length - 1;
        
        const current = getCurrentZoomController();
        if (current) {
            const state = current.getState();
            updateZoomDisplay(state.scale);
            updateRotateDisplay(state.rotation);
        }
        
        loadEffectsToUI();
        applyStoredEffect();
    }
    
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        zoomLevelDisplay.textContent = `${percentage}%`;
    }
    
    function updateRotateDisplay(rotation) {
        const normalized = ((rotation % 360) + 360) % 360;
        rotateLevelDisplay.textContent = `${Math.round(normalized)}°`;
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
        const img = imageStack[currentIndex]?.img;
        if (!img) return;
        
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
    
    function applyPerformanceMode() {
        imageStack.forEach(item => {
            if (performanceMode === 'performance') {
                item.img.style.imageRendering = 'auto';
                item.wrapper.style.willChange = 'transform';
            } else {
                item.img.style.imageRendering = 'high-quality';
                item.wrapper.style.willChange = 'auto';
            }
        });
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
        toast.className = `fixed top-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[1001] transition-opacity duration-300`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
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
                showToast('이미지 URL이 클립보드에 복사되었습니다', 'info');
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
        if (icon) {
            icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
        }
    }
    
    function handleKeyboard(e) {
        if (viewer.classList.contains('hidden')) return;
        
        const current = getCurrentZoomController();
        
        switch(e.key) {
            case 'Escape':
                if (current && current.getState().isZoomed) {
                    const scale = current.resetZoom(true);
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
                if (current) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = current.zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '-':
            case '_':
                if (current) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = current.zoomOut(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '0':
                if (current) {
                    const scale = current.resetZoom(true);
                    updateZoomDisplay(scale);
                }
                break;
            case 'r':
            case 'R':
                if (current) {
                    current.rotate(e.shiftKey ? -90 : 90, true);
                    updateRotateDisplay(current.getState().rotation);
                }
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