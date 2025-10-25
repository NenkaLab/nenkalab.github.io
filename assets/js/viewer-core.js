(function() {
    'use strict';
    
    // --- 기본 요소 ---
    const viewer = document.getElementById('image-viewer');
    const viewerContainer = document.getElementById('viewer-container');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerLoading = document.getElementById('viewer-loading');
    
    // --- 컨트롤 버튼 ---
    const closeBtn = document.getElementById('viewer-close');
    const hideBtn = document.getElementById('viewer-hide-controls');
    const prevBtn = document.getElementById('viewer-prev');
    const nextBtn = document.getElementById('viewer-next');
    const downloadBtn = document.getElementById('viewer-download');
    const shareBtn = document.getElementById('viewer-share');
    const rotateBtn = document.getElementById('viewer-rotate');
    const fullscreenBtn = document.getElementById('viewer-fullscreen');
    
    // --- 줌 버튼 ---
    const zoomInBtn = document.getElementById('viewer-zoom-in');
    const zoomOutBtn = document.getElementById('viewer-zoom-out');
    const zoomResetBtn = document.getElementById('viewer-zoom-reset');
    const zoomLevelDisplay = document.getElementById('viewer-zoom-level');
    
    // --- 필터 버튼 및 메뉴 ---
    const filterToggleBtn = document.getElementById('viewer-filter-toggle');
    const filterMenu = document.getElementById('viewer-filter-menu');
    const applyToAllBtn = document.getElementById('viewer-apply-to-all');
    const resetEffectsBtn = document.getElementById('viewer-reset-effects');
    const imageRenderingSelect = document.getElementById('image-rendering');
    
    // --- 필터 컨트롤 객체 ---
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
    
    // --- 상태 변수 ---
    let articleImages = []; // 원본 <img> 요소들
    let viewerImages = [];  // 뷰어 내부의 <img> 요소들
    let viewerZoomTargets = []; // 뷰어 내부의 줌/패닝 대상 래퍼들
    
    let currentIndex = 0;
    let zoomController = null;
    let gestureHandler = null;
    let isFullscreen = false;
    let imageEffects = [];
    let isTransitioning = false; // 이미지 전환(페이드) 중인지 여부

    const VT_PREFIX = 'viewer-img-'; // View Transition 이름 접두사
    
    /**
     * 뷰어 초기화
     */
    function initImageViewer() {
        const imagesNodeList = document.querySelectorAll('.prose img');
        if (imagesNodeList.length === 0) return;
        
        articleImages = Array.from(imagesNodeList);
        imageEffects = articleImages.map(() => getDefaultEffects());
        
        // 뷰어 DOM 미리 생성
        createViewerDOM(); 
        
        articleImages.forEach((img, index) => {
            img.style.cursor = 'pointer';
            // View Transition API를 위해 고유 이름 할당
            img.style.viewTransitionName = `${VT_PREFIX}${index}`;
            img.addEventListener('click', () => openViewer(index));
        });
        
        setupEventListeners();
    }
    
    /**
     * (신규) 뷰어 내부에 모든 이미지 래퍼/엘리먼트를 미리 생성
     */
    function createViewerDOM() {
        viewerContainer.innerHTML = ''; // 혹시 모를 기존 내용 삭제
        viewerImages = [];
        viewerZoomTargets = [];

        for (let i = 0; i < articleImages.length; i++) {
            // 1. 최상위 래퍼 (페이드 인/아웃 대상)
            const wrapper = document.createElement('div');
            wrapper.className = 'viewer-image-instance-wrapper';
            
            // 2. 줌/패닝/회전 대상
            const zoomTarget = document.createElement('div');
            zoomTarget.className = 'viewer-zoom-target';

            // 3. 실제 이미지
            const imgEl = new Image();
            imgEl.className = 'viewer-image-instance';
            imgEl.alt = articleImages[i].alt || '';
            imgEl.draggable = false;
            imgEl.oncontextmenu = () => false;
            
            // View Transition API 이름 준비
            imgEl.style.viewTransitionName = `${VT_PREFIX}${i}`;

            zoomTarget.appendChild(imgEl);
            wrapper.appendChild(zoomTarget);
            viewerContainer.appendChild(wrapper);

            viewerImages.push(imgEl);
            viewerZoomTargets.push(zoomTarget);
        }
    }
    
    /**
     * 기본 효과 객체 반환
     */
    function getDefaultEffects() {
        return {
            grayscale: 0, sepia: 0, invert: 0,
            saturate: 100, contrast: 100, brightness: 100,
            blur: 0, hue: 0, rendering: 'auto'
        };
    }
    
    function showControls() {
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.remove('hide'));
    }

    function hideControls(e) {
        if (e) e.stopPropagation();
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.add('hide'));
    }

    /**
     * 모든 이벤트 리스너 설정
     */
    function setupEventListeners() {
        closeBtn.addEventListener('click', closeViewer);
        prevBtn.addEventListener('click', showPrev);
        nextBtn.addEventListener('click', showNext);

        viewer.addEventListener('click', showControls);
        hideBtn.addEventListener('click', hideControls);
        
        // 줌 버튼 (중앙 줌 버그 수정됨)
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
            applyStoredEffect(viewerImages[currentIndex]);
        });
        
        applyToAllBtn.addEventListener('click', applyEffectToAll);
        resetEffectsBtn.addEventListener('click', resetEffects);
        
        document.addEventListener('click', (e) => {
            if (!filterMenu.contains(e.target) && e.target !== filterToggleBtn) {
                filterMenu.classList.add('hidden');
            }
        });
        
        // 뷰어 배경 클릭 시 (줌 리셋 또는 닫기)
        viewer.addEventListener('click', (e) => {
            // .viewer-image-instance-wrapper 가 클릭됐을 때 (즉, 이미지 바깥의 빈 공간)
            if (e.target.classList.contains('viewer-image-instance-wrapper')) {
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
        applyStoredEffect(viewerImages[currentIndex]);
    }

    function closeOnBack() {
        closeViewer();
    }
    
    /**
     * 뷰어 열기
     */
    function openViewer(index) {
        if (isTransitioning) return;
        currentIndex = index;
        showLoading();

        window.addEventListener('popstate', closeOnBack);
        history.pushState({ imageViewer: true }, '', '#viewer');
        
        const currentWrapper = viewerZoomTargets[currentIndex].parentElement;
        const currentImage = viewerImages[currentIndex];
        const currentZoomTarget = viewerZoomTargets[currentIndex];
        
        // 이미지 로드 (이미 로드됐으면 캐시 사용)
        currentImage.src = articleImages[currentIndex].src;
        
        currentImage.onload = () => {
            // 로드 완료 후 줌 컨트롤러 초기화
            initZoomController(currentZoomTarget, currentImage);
            initGestureHandler();
            loadEffectsToUI();
            applyStoredEffect(currentImage);
            updateViewer(); // 카운터, 버튼 업데이트
            
            // View Transition API 적용
            const transitionName = `${VT_PREFIX}${currentIndex}`;
            // 썸네일과 뷰어 이미지의 transition-name이 일치하는지 확인
            articleImages[currentIndex].style.viewTransitionName = transitionName;
            currentImage.style.viewTransitionName = transitionName;

            const runOpenAnimation = () => {
                viewer.classList.remove('hidden');
                viewer.classList.add('flex');
                document.body.style.overflow = 'hidden';
                currentWrapper.classList.add('active'); // 페이드 인
                hideLoading();
            };

            if (document.startViewTransition) {
                document.startViewTransition(runOpenAnimation);
            } else {
                runOpenAnimation();
            }
            
            // (신규) 이전/다음 이미지 미리 로드
            preloadNeighbors();
        };
        
        currentImage.onerror = () => {
            hideLoading();
            console.error('이미지 로드 실패:', articleImages[currentIndex].src);
        };
    }
    
    /**
     * 뷰어 닫기
     */
    function closeViewer() {
        if (isTransitioning) return;

        const currentWrapper = viewerZoomTargets[currentIndex].parentElement;
        const currentImage = viewerImages[currentIndex];
        
        // View Transition API 적용
        const transitionName = `${VT_PREFIX}${currentIndex}`;
        articleImages[currentIndex].style.viewTransitionName = transitionName;
        currentImage.style.viewTransitionName = transitionName;

        const runCloseAnimation = () => {
            viewer.classList.remove('flex');
            viewer.classList.add('hidden');
            document.body.style.overflow = '';
            filterMenu.classList.add('hidden');
            currentWrapper.classList.remove('active'); // 페이드 아웃
        };

        const cleanup = () => {
            if (zoomController) {
                zoomController.destroy();
                zoomController = null;
            }
            if (gestureHandler) {
                gestureHandler.destroy();
                gestureHandler = null;
            }
            if (isFullscreen) exitFullscreen();
            
            // transition-name 초기화
            currentImage.style.viewTransitionName = 'none';
            articleImages[currentIndex].style.viewTransitionName = 'none';
            
            window.removeEventListener('popstate', closeOnBack);
            if (history.state && history.state.imageViewer) {
                history.back();
            }
        };

        if (document.startViewTransition) {
            const transition = document.startViewTransition(runCloseAnimation);
            transition.finished.then(cleanup);
        } else {
            runCloseAnimation();
            cleanup();
        }
    }
    
    /**
     * (신규) 이전/다음 이미지 미리 로드
     */
    function preloadNeighbors() {
        if (currentIndex > 0) {
            viewerImages[currentIndex - 1].src = articleImages[currentIndex - 1].src;
        }
        if (currentIndex < articleImages.length - 1) {
            viewerImages[currentIndex + 1].src = articleImages[currentIndex + 1].src;
        }
    }

    /**
     * 뷰어 UI 업데이트 (카운터, 버튼)
     */
    function updateViewer() {
        if (articleImages.length === 0) return;
        
        viewerCounter.textContent = `${currentIndex + 1} / ${articleImages.length}`;
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < articleImages.length - 1 ? 'flex' : 'none';
        
        updateZoomDisplay(1);
    }
    
    /**
     * (수정) 이전 이미지로 페이드
     */
    function showPrev() {
        if (currentIndex > 0 && !isTransitioning && (!zoomController || !zoomController.getState().isZoomed)) {
            isTransitioning = true;
            
            // 1. 현재 줌 리셋 및 컨트롤러 파괴
            if (zoomController) {
                zoomController.resetZoom(false); // 애니메이션 없이 리셋
                zoomController.destroy();
                zoomController = null;
            }
            
            // 2. 현재 래퍼 페이드 아웃
            const oldWrapper = viewerZoomTargets[currentIndex].parentElement;
            oldWrapper.classList.remove('active');
            
            // 3. 인덱스 변경
            currentIndex--;
            
            // 4. 새 요소들 가져오기
            const newWrapper = viewerZoomTargets[currentIndex].parentElement;
            const newImage = viewerImages[currentIndex];
            const newZoomTarget = viewerZoomTargets[currentIndex];
            
            // 5. 새 이미지 로드 (필요시) 및 컨트롤러 재초기화
            newImage.src = articleImages[currentIndex].src; // 이미 로드됐으면 캐시 사용
            newImage.onload = () => {
                initZoomController(newZoomTarget, newImage);
                loadEffectsToUI();
                applyStoredEffect(newImage);
                updateViewer();
                
                // 6. 새 래퍼 페이드 인
                newWrapper.classList.add('active');
                
                // 7. 이웃 미리 로드
                preloadNeighbors();
                
                // 트랜지션 시간(200ms) 후 상태 해제
                setTimeout(() => { isTransitioning = false; }, 200);
            };
            newImage.onerror = () => {
                console.error('이미지 로드 실패:', articleImages[currentIndex].src);
                isTransitioning = false;
            }
        }
    }
    
    /**
     * (수정) 다음 이미지로 페이드
     */
    function showNext() {
        if (currentIndex < articleImages.length - 1 && !isTransitioning && (!zoomController || !zoomController.getState().isZoomed)) {
            isTransitioning = true;
            
            if (zoomController) {
                zoomController.resetZoom(false);
                zoomController.destroy();
                zoomController = null;
            }
            
            const oldWrapper = viewerZoomTargets[currentIndex].parentElement;
            oldWrapper.classList.remove('active');
            
            currentIndex++;
            
            const newWrapper = viewerZoomTargets[currentIndex].parentElement;
            const newImage = viewerImages[currentIndex];
            const newZoomTarget = viewerZoomTargets[currentIndex];
            
            newImage.src = articleImages[currentIndex].src;
            newImage.onload = () => {
                initZoomController(newZoomTarget, newImage);
                loadEffectsToUI();
                applyStoredEffect(newImage);
                updateViewer();
                
                newWrapper.classList.add('active');
                
                preloadNeighbors();
                
                setTimeout(() => { isTransitioning = false; }, 200);
            };
            newImage.onerror = () => {
                console.error('이미지 로드 실패:', articleImages[currentIndex].src);
                isTransitioning = false;
            }
        }
    }
    
    /**
     * (수정) 줌 컨트롤러 초기화
     */
    function initZoomController(zoomTarget, imageEl) {
        if (zoomController) zoomController.destroy();
        
        zoomController = new window.ZoomController(zoomTarget, imageEl, {
            minScale: 1, maxScale: 5, scaleStep: 0.5, doubleTapScale: 2.5
        });
        
        updateZoomDisplay(1);
    }
    
    /**
     * (수정) 제스처 핸들러 초기화
     */
    function initGestureHandler() {
        if (gestureHandler) gestureHandler.destroy();
        
        // 제스처는 뷰어 전체(배경 포함)에서 감지
        gestureHandler = new window.GestureHandler(viewer, {
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
                    return true; // preventDefault
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
            },
            onPenRotate: (delta, point) => {
                if (zoomController) {
                    const currentScale = zoomController.getState().scale;
                    const scaleFactor = 1 + (delta * 0.5); 
                    const newScale = zoomController.setZoom(currentScale * scaleFactor, point.x, point.y, false);
                    updateZoomDisplay(newScale);
                }
            }
        });
    }
    
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        zoomLevelDisplay.textContent = `${percentage}%`;
    }
    
    /**
     * (수정) 현재 이미지의 효과를 UI 컨트롤에 로드
     */
    function loadEffectsToUI() {
        const effect = imageEffects[currentIndex] || getDefaultEffects();
        
        Object.keys(filterControls).forEach(key => {
            const control = filterControls[key];
            const value = effect[key];
            control.slider.value = value;
            control.input.value = value;
        });
        
        imageRenderingSelect.value = effect.rendering;
    }
    
    /**
     * (수정) 지정된 이미지 요소에 현재 저장된 효과 적용
     */
    function applyStoredEffect(imageElement) {
        if (!imageElement) return;
        const effect = imageEffects[currentIndex] || getDefaultEffects();
        
        const filters = [];
        if (effect.grayscale > 0) filters.push(`grayscale(${effect.grayscale}%)`);
        if (effect.sepia > 0) filters.push(`sepia(${effect.sepia}%)`);
        if (effect.invert > 0) filters.push(`invert(${effect.invert}%)`);
        if (effect.saturate !== 100) filters.push(`saturate(${effect.saturate}%)`);
        if (effect.contrast !== 100) filters.push(`contrast(${effect.contrast}%)`);
        if (effect.brightness !== 100) filters.push(`brightness(${effect.brightness}%)`);
        if (effect.blur > 0) filters.push(`blur(${effect.blur}px)`);
        if (effect.hue > 0) filters.push(`hue-rotate(${effect.hue}deg)`);
        
        imageElement.style.filter = filters.length > 0 ? filters.join(' ') : '';
        imageElement.style.imageRendering = effect.rendering;
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
        applyStoredEffect(viewerImages[currentIndex]);
        showToast('효과가 초기화되었습니다', 'info');
    }
    
    function showToast(message, type) {
        const bgColor = type === 'success' ? 'bg-green-600' : 'bg-blue-600';
        const toast = document.createElement('div');
        toast.className = `fixed top-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[1001]`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 2000);
    }
    
    async function downloadImage() {
        try {
            const img = articleImages[currentIndex];
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
        const img = articleImages[currentIndex];
        if (navigator.share) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const file = new File([blob], img.alt || 'image.jpg', { type: blob.type });
                await navigator.share({ title: img.alt || '이미지', files: [file] });
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
        if (!isFullscreen) enterFullscreen();
        else exitFullscreen();
    }
    
    function enterFullscreen() {
        const elem = viewer;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    }
    
    function exitFullscreen() {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }
    
    function handleFullscreenChange() {
        isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        const icon = fullscreenBtn.querySelector('.material-symbols-outlined');
        icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
    }
    
    function handleKeyboard(e) {
        if (viewer.classList.contains('hidden') || isTransitioning) return;

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

