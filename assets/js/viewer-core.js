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
        history.pushState({ imageViewer: true }, '');
        
        const img = images[currentIndex];
        const tempImage = new Image();
        
        tempImage.onload = () => {
            viewerImage.src = tempImage.src;
            viewerImage.alt = img.alt || '';
            
            updateViewer();
            viewer.classList.remove('hidden');
            viewer.classList.add('flex');
            document.body.style.overflow = 'hidden';
            
            initZoomController();
            initGestureHandler();
            loadEffectsToUI();
            applyStoredEffect();
            
            hideLoading();
        };
        
        tempImage.onerror = () => {
            hideLoading();
            console.error('이미지 로드 실패:', img.src);
        };
        
        tempImage.src = img.src;
    }
    
    function closeViewer() {
        viewer.classList.remove('flex');
        viewer.classList.add('hidden');
        document.body.style.overflow = '';
        filterMenu.classList.add('hidden');
        
        if (zoomController) {
            zoomController.destroy();
            zoomController = null;
        }
        
        if (gestureHandler) {
            gestureHandler.destroy();
            gestureHandler = null;
        }
        
        if (isFullscreen) exitFullscreen();
        
        window.removeEventListener('popstate', closeOnBack);
        if (history.state && history.state.imageViewer) {
            history.back();
        }
    }
    
    function updateViewer() {
        if (images.length === 0) return;
        
        viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < images.length - 1 ? 'flex' : 'none';
        
        if (zoomController) {
            zoomController.reset();
            updateZoomDisplay(1);
        }
    }
    
    function showPrev() {
        if (currentIndex > 0 && (!zoomController || !zoomController.getState().isZoomed)) {
            currentIndex--;
            openViewer(currentIndex);
        }
    }
    
    function showNext() {
        if (currentIndex < images.length - 1 && (!zoomController || !zoomController.getState().isZoomed)) {
            currentIndex++;
            openViewer(currentIndex);
        }
    }
    
    function initZoomController() {
        if (zoomController) zoomController.destroy();
        
        zoomController = new window.ZoomController(viewerImageWrapper, viewerImage, {
            minScale: 1, maxScale: 5, scaleStep: 0.5, doubleTapScale: 2.5
        });
        
        updateZoomDisplay(1);
    }
    
    function initGestureHandler() {
        if (gestureHandler) gestureHandler.destroy();
        
        gestureHandler = new window.GestureHandler(viewerContainer, {
            onDoubleTap: (point) => {
                if (zoomController) {
                    const scale = zoomController.toggleZoom(point.x, point.y);
                    updateZoomDisplay(scale);
                }
            },
            onPinch: (scale, center) => {
                if (zoomController) {
                    const newScale = zoomController.pinchZoom(scale, center.x, center.y);
                    updateZoomDisplay(newScale);
                }
            },
            onDragStart: (point) => {
                if (zoomController) zoomController.startDrag(point.x, point.y);
            },
            onDrag: (data) => {
                if (zoomController && zoomController.getState().isZoomed) {
                    zoomController.drag(data.x, data.y);
                    return true;
                }
                return false;
            },
            onDragEnd: () => {
                if (zoomController) zoomController.endDrag();
            },
            onSwipeLeft: () => {
                if (zoomController && !zoomController.getState().isZoomed) showNext();
            },
            onSwipeRight: () => {
                if (zoomController && !zoomController.getState().isZoomed) showPrev();
            },
            onWheel: (scale, point) => {
                if (zoomController) {
                    const currentScale = zoomController.getState().scale;
                    const newScale = zoomController.setZoom(currentScale * scale, point.x, point.y);
                    updateZoomDisplay(newScale);
                }
            }
        });
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
        
        imageRenderingSelect.value = effect.rendering;
    }
    
    function applyStoredEffect() {
        const effect = imageEffects[currentIndex];
        
        const filters = [];
        if (effect.grayscale > 0) filters.push(`grayscale(${effect.grayscale}%)`);
        if (effect.sepia > 0) filters.push(`sepia(${effect.sepia}%)`);
        if (effect.invert > 0) filters.push(`invert(${effect.invert}%)`);
        if (effect.saturate !== 100) filters.push(`saturate(${effect.saturate}%)`);
        if (effect.contrast !== 100) filters.push(`contrast(${effect.contrast}%)`);
        if (effect.brightness !== 100) filters.push(`brightness(${effect.brightness}%)`);
        if (effect.blur > 0) filters.push(`blur(${effect.blur}px)`);
        if (effect.hue > 0) filters.push(`hue-rotate(${effect.hue}deg)`);
        
        viewerImage.style.filter = filters.length > 0 ? filters.join(' ') : '';
        viewerImage.style.imageRendering = effect.rendering;
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