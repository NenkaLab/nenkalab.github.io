(function() {
    'use strict';
    
    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerImageWrapper = document.getElementById('viewer-image-wrapper');
    const viewerContainer = document.getElementById('viewer-container');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerLoading = document.getElementById('viewer-loading');
    
    const closeBtn = document.getElementById('viewer-close');
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
    const filterOptions = document.querySelectorAll('.filter-option');
    const applyToAllBtn = document.getElementById('viewer-apply-to-all');
    const resetEffectsBtn = document.getElementById('viewer-reset-effects');
    
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
        imageEffects = images.map(() => ({ filter: 'none', blend: 'normal' }));
        
        images.forEach((img, index) => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => openViewer(index));
        });
        
        setupEventListeners();
    }
    
    function setupEventListeners() {
        closeBtn.addEventListener('click', closeViewer);
        prevBtn.addEventListener('click', showPrev);
        nextBtn.addEventListener('click', showNext);
        
        zoomInBtn.addEventListener('click', () => {
            if (zoomController) {
                const rect = viewerContainer.getBoundingClientRect();
                const scale = zoomController.zoomIn(rect.width / 2, rect.height / 2);
                updateZoomDisplay(scale);
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            if (zoomController) {
                const rect = viewerContainer.getBoundingClientRect();
                const scale = zoomController.zoomOut(rect.width / 2, rect.height / 2);
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
        
        filterOptions.forEach(option => {
            option.addEventListener('click', () => {
                const type = option.dataset.type;
                const value = option.dataset.value;
                applyEffect(type, value);
                updateFilterUI();
            });
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
    
    function openViewer(index) {
        currentIndex = index;
        showLoading();
        
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
                }
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
                    const rect = viewerContainer.getBoundingClientRect();
                    const centerX = point.x || rect.width / 2;
                    const centerY = point.y || rect.height / 2;
                    const currentScale = zoomController.getState().scale;
                    const newScale = zoomController.setZoom(currentScale * scale, centerX, centerY);
                    updateZoomDisplay(newScale);
                }
            }
        });
    }
    
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        zoomLevelDisplay.textContent = `${percentage}%`;
    }
    
    function applyEffect(type, value) {
        const effect = imageEffects[currentIndex];
        
        if (type === 'filter') {
            effect.filter = value;
        } else if (type === 'blend') {
            effect.blend = value;
        }
        
        applyStoredEffect();
    }
    
    function applyStoredEffect() {
        const effect = imageEffects[currentIndex];
        
        if (effect.filter === 'none') {
            viewerImage.style.filter = '';
        } else {
            viewerImage.style.filter = effect.filter;
        }
        
        viewerImage.style.mixBlendMode = effect.blend;
        
        updateFilterUI();
    }
    
    function applyEffectToAll() {
        const currentEffect = { ...imageEffects[currentIndex] };
        
        for (let i = 0; i < imageEffects.length; i++) {
            imageEffects[i] = { ...currentEffect };
        }
        
        const message = document.createElement('div');
        message.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        message.textContent = '현재 효과가 모든 이미지에 적용되었습니다';
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 2000);
    }
    
    function resetEffects() {
        imageEffects[currentIndex] = { filter: 'none', blend: 'normal' };
        applyStoredEffect();
        
        const message = document.createElement('div');
        message.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        message.textContent = '효과가 초기화되었습니다';
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 2000);
    }
    
    function updateFilterUI() {
        const effect = imageEffects[currentIndex];
        
        filterOptions.forEach(option => {
            const type = option.dataset.type;
            const value = option.dataset.value;
            
            if ((type === 'filter' && effect.filter === value) ||
                (type === 'blend' && effect.blend === value)) {
                option.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
            } else {
                option.style.backgroundColor = '';
            }
        });
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
                    const scale = zoomController.zoomIn(rect.width / 2, rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '-':
            case '_':
                if (zoomController) {
                    const rect = viewerContainer.getBoundingClientRect();
                    const scale = zoomController.zoomOut(rect.width / 2, rect.height / 2);
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