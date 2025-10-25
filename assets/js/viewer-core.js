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
    const performanceSelect = document.getElementById('performance-mode');
    
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
    let zoomControllers = new Map();
    let gestureHandler = null;
    let isFullscreen = false;
    let imageEffects = [];
    let performanceMode = 'performance';
    
    function initImageViewer() {
        const articleImages = document.querySelectorAll('.prose img, article img, .content img');
        if (articleImages.length === 0) return;
        
        images = Array.from(articleImages);
        imageEffects = images.map(() => getDefaultEffects());
        
        images.forEach((img, index) => {
            img.classList.add('cursor-pointer', 'transition-transform', 'duration-200', 'hover:scale-105');
            img.addEventListener('click', () => openViewer(index));
        });
        
        setupEventListeners();
        loadPerformanceMode();
    }
    
    function loadPerformanceMode() {
        const saved = localStorage.getItem('imageViewerPerformance');
        if (saved) {
            performanceMode = saved;
            if (performanceSelect) {
                performanceSelect.value = performanceMode;
            }
        }
    }
    
    function savePerformanceMode() {
        localStorage.setItem('imageViewerPerformance', performanceMode);
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
        controls.forEach(control => {
            control.classList.remove('opacity-0', 'pointer-events-none');
        });
    }

    function hideControls(e) {
        e.stopPropagation();
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => {
            control.classList.add('opacity-0', 'pointer-events-none');
        });
    }

    function setupEventListeners() {
        closeBtn.addEventListener('click', closeViewer);
        prevBtn.addEventListener('click', showPrev);
        nextBtn.addEventListener('click', showNext);

        viewer.addEventListener('click', showControls);
        hideBtn.addEventListener('click', hideControls);
        
        zoomInBtn.addEventListener('click', () => {
            const controller = zoomControllers.get(currentIndex);
            if (controller) {
                const rect = viewerContainer.getBoundingClientRect();
                const scale = controller.zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                updateZoomDisplay(scale);
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            const controller = zoomControllers.get(currentIndex);
            if (controller) {
                const rect = viewerContainer.getBoundingClientRect();
                const scale = controller.zoomOut(rect.left + rect.width / 2, rect.top + rect.height / 2);
                updateZoomDisplay(scale);
            }
        });
        
        zoomResetBtn.addEventListener('click', () => {
            const controller = zoomControllers.get(currentIndex);
            if (controller) {
                const scale = controller.resetZoom();
                updateZoomDisplay(scale);
            }
        });
        
        rotateBtn.addEventListener('click', () => {
            const controller = zoomControllers.get(currentIndex);
            if (controller) controller.rotate(90);
        });
        
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        downloadBtn.addEventListener('click', downloadImage);
        shareBtn.addEventListener('click', shareImage);
        
        if (filterToggleBtn) {
            filterToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filterMenu.classList.toggle('hidden');
            });
        }
        
        Object.keys(filterControls).forEach(key => {
            const control = filterControls[key];
            if (!control.slider || !control.input) return;
            
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
        
        if (imageRenderingSelect) {
            imageRenderingSelect.addEventListener('change', (e) => {
                imageEffects[currentIndex].rendering = e.target.value;
                applyStoredEffect();
            });
        }
        
        if (performanceSelect) {
            performanceSelect.addEventListener('change', (e) => {
                performanceMode = e.target.value;
                savePerformanceMode();
                applyPerformanceMode();
            });
        }
        
        if (applyToAllBtn) {
            applyToAllBtn.addEventListener('click', applyEffectToAll);
        }
        
        if (resetEffectsBtn) {
            resetEffectsBtn.addEventListener('click', resetEffects);
        }
        
        document.addEventListener('click', (e) => {
            if (filterMenu && !filterMenu.contains(e.target) && e.target !== filterToggleBtn) {
                filterMenu.classList.add('hidden');
            }
        });
        
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer || e.target === viewerContainer) {
                const controller = zoomControllers.get(currentIndex);
                if (controller && controller.getState().isZoomed) {
                    const scale = controller.resetZoom();
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
    
    function applyPerformanceMode() {
        imageStack.forEach((item) => {
            if (performanceMode === 'quality') {
                item.wrapper.style.imageRendering = 'auto';
                item.img.style.imageRendering = 'auto';
            } else {
                item.wrapper.style.imageRendering = 'optimizeSpeed';
                item.img.style.imageRendering = 'optimizeSpeed';
            }
        });
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
        viewerContainer.innerHTML = '';
        imageStack = [];
        zoomControllers.clear();
        
        images.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'absolute inset-0 flex items-center justify-center transition-opacity duration-300';
            wrapper.style.pointerEvents = index === currentIndex ? 'auto' : 'none';
            wrapper.style.opacity = index === currentIndex ? '1' : '0';
            wrapper.style.visibility = index === currentIndex ? 'visible' : 'hidden';
            wrapper.style.zIndex = index === currentIndex ? '10' : '1';
            
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'w-full h-full flex items-center justify-center';
            
            const image = document.createElement('img');
            image.src = img.src;
            image.alt = img.alt || '';
            image.className = 'max-w-full max-h-full object-contain select-none';
            image.draggable = false;
            
            imageWrapper.appendChild(image);
            wrapper.appendChild(imageWrapper);
            viewerContainer.appendChild(wrapper);
            
            imageStack.push({
                wrapper: wrapper,
                imageWrapper: imageWrapper,
                img: image,
                index: index
            });
            
            const controller = new ZoomController(imageWrapper, image);
            zoomControllers.set(index, controller);
        });
        
        applyPerformanceMode();
    }
    
    function switchImage(newIndex, direction = 0) {
        if (newIndex < 0 || newIndex >= images.length || newIndex === currentIndex) return;
        
        const oldItem = imageStack[currentIndex];
        const newItem = imageStack[newIndex];
        
        oldItem.wrapper.style.pointerEvents = 'none';
        oldItem.wrapper.style.zIndex = '1';
        oldItem.wrapper.classList.add('opacity-0');
        oldItem.wrapper.style.visibility = 'hidden';
        
        newItem.wrapper.style.pointerEvents = 'auto';
        newItem.wrapper.style.zIndex = '10';
        newItem.wrapper.classList.remove('opacity-0');
        newItem.wrapper.style.visibility = 'visible';
        
        currentIndex = newIndex;
        updateViewer();
    }
    
    function initGestureHandler() {
        if (gestureHandler) {
            gestureHandler.destroy();
        }
        
        gestureHandler = new GestureHandler(viewerContainer, {
            onDoubleTap: (data) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    const scale = controller.toggleZoom(data.x, data.y);
                    updateZoomDisplay(scale);
                }
            },
            
            onPinchStart: (center) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    controller.startPinchZoom(0, center);
                }
            },
            
            onPinch: (data) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    const scale = controller.pinchZoom(data.distance, data.center);
                    updateZoomDisplay(scale);
                    
                    if (data.rotation && data.inputType === 'touch') {
                        controller.setRotation(controller.getState().rotation + data.rotation * 0.5);
                    }
                }
            },
            
            onPinchEnd: () => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    controller.endPinchZoom();
                }
            },
            
            onDragStart: (data) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    return controller.startDrag(data.x, data.y);
                }
                return false;
            },
            
            onDrag: (data) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller && controller.getState().isZoomed) {
                    return controller.drag(data.x, data.y);
                }
                return false;
            },
            
            onDragEnd: (data) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    if (controller.getState().isZoomed) {
                        controller.endDrag();
                    } else {
                        const containerWidth = viewerContainer.getBoundingClientRect().width;
                        const threshold = containerWidth * 0.3;
                        const shouldSlide = Math.abs(data.deltaX) > threshold || Math.abs(data.velocity) > 0.5;
                        
                        if (shouldSlide) {
                            if (data.deltaX > 0 && currentIndex > 0) {
                                showPrev();
                            } else if (data.deltaX < 0 && currentIndex < images.length - 1) {
                                showNext();
                            }
                        }
                    }
                }
            },
            
            onWheel: (scale, center) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    const currentScale = controller.getState().scale;
                    const newScale = currentScale * scale;
                    controller.setZoom(newScale, center.x, center.y, false);
                    updateZoomDisplay(newScale);
                }
            },
            
            onRotate: (rotation, center) => {
                const controller = zoomControllers.get(currentIndex);
                if (controller) {
                    controller.rotate(rotation);
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
        
        zoomControllers.forEach(controller => controller.destroy());
        zoomControllers.clear();
        
        imageStack = [];
        viewerContainer.innerHTML = '';

        window.removeEventListener('popstate', closeOnBack);
        
        if (window.location.hash === '#viewer') {
            history.back();
        }
    }
    
    function showPrev() {
        if (currentIndex > 0) {
            switchImage(currentIndex - 1, -1);
        }
    }
    
    function showNext() {
        if (currentIndex < images.length - 1) {
            switchImage(currentIndex + 1, 1);
        }
    }
    
    function updateViewer() {
        viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === images.length - 1;
        
        const controller = zoomControllers.get(currentIndex);
        if (controller) {
            updateZoomDisplay(controller.getState().scale);
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
            if (!control.slider || !control.input) return;
            const value = effect[key];
            control.slider.value = value;
            control.input.value = value;
        });
        
        if (imageRenderingSelect) {
            imageRenderingSelect.value = effect.rendering || 'auto';
        }
    }
    
    function applyStoredEffect() {
        const effect = imageEffects[currentIndex];
        const item = imageStack[currentIndex];
        if (!item) return;
        
        const filters = [];
        if (effect.grayscale > 0) filters.push(`grayscale(${effect.grayscale}%)`);
        if (effect.sepia > 0) filters.push(`sepia(${effect.sepia}%)`);
        if (effect.invert > 0) filters.push(`invert(${effect.invert}%)`);
        if (effect.saturate !== 100) filters.push(`saturate(${effect.saturate}%)`);
        if (effect.contrast !== 100) filters.push(`contrast(${effect.contrast}%)`);
        if (effect.brightness !== 100) filters.push(`brightness(${effect.brightness}%)`);
        if (effect.blur > 0) filters.push(`blur(${effect.blur}px)`);
        if (effect.hue > 0) filters.push(`hue-rotate(${effect.hue}deg)`);
        
        item.img.style.filter = filters.length > 0 ? filters.join(' ') : '';
        item.img.style.imageRendering = effect.rendering;
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
        if (icon) {
            icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
        }
    }
    
    function handleKeyboard(e) {
        if (viewer.classList.contains('hidden')) return;
        
        switch(e.key) {
            case 'Escape':
                const controller = zoomControllers.get(currentIndex);
                if (controller && controller.getState().isZoomed) {
                    const scale = controller.resetZoom();
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
                if (zoomControllers.has(currentIndex)) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = zoomControllers.get(currentIndex).zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '-':
            case '_':
                if (zoomControllers.has(currentIndex)) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = zoomControllers.get(currentIndex).zoomOut(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '0':
                if (zoomControllers.has(currentIndex)) {
                    const scale = zoomControllers.get(currentIndex).resetZoom();
                    updateZoomDisplay(scale);
                }
                break;
            case 'r':
            case 'R':
                if (zoomControllers.has(currentIndex)) {
                    zoomControllers.get(currentIndex).rotate(90);
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