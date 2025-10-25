(function() {
    'use strict';
    
    // --- 기본 요소 ---
    const viewer = document.getElementById('image-viewer');
    const viewerContainer = document.getElementById('viewer-container');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerLoading = document.getElementById('viewer-loading');

    // --- 슬라이더 요소 (신규) ---
    const sliderTrack = document.getElementById('viewer-slider-track');
    const slidePrev = document.getElementById('viewer-slide-prev');
    const slideCurrent = document.getElementById('viewer-slide-current');
    const slideNext = document.getElementById('viewer-slide-next');

    // --- 이미지 요소 (viewerImage는 현재 이미지를 가리킴) ---
    const viewerImageWrapper = document.getElementById('viewer-image-wrapper');
    const viewerImage = document.getElementById('viewer-image');
    const imagePrev = document.getElementById('viewer-image-prev');
    const imageNext = document.getElementById('viewer-image-next');
    
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
    let images = [];
    let currentIndex = 0;
    let zoomController = null;
    let gestureHandler = null;
    let isFullscreen = false;
    let imageEffects = [];
    let isSliding = false; // (신규) 슬라이드 애니메이션 중인지 여부
    
    /**
     * 뷰어 초기화
     */
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
    
    /**
     * 컨트롤 UI 표시
     */
    function showControls() {
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.remove('hide'));
    }

    /**
     * 컨트롤 UI 숨김
     */
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
        
        // 줌 버튼
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
        
        // 기타 버튼
        rotateBtn.addEventListener('click', () => {
            if (zoomController) zoomController.rotate(90);
        });
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        downloadBtn.addEventListener('click', downloadImage);
        shareBtn.addEventListener('click', shareImage);
        
        // 필터 메뉴 토글
        filterToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterMenu.classList.toggle('hidden');
        });
        
        // 필터 컨트롤 (슬라이더 및 입력)
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
        
        // 이미지 렌더링
        imageRenderingSelect.addEventListener('change', (e) => {
            imageEffects[currentIndex].rendering = e.target.value;
            applyStoredEffect(viewerImage); // 현재 이미지에만 적용
        });
        
        // 효과 버튼
        applyToAllBtn.addEventListener('click', applyEffectToAll);
        resetEffectsBtn.addEventListener('click', resetEffects);
        
        // 외부 클릭 시 필터 메뉴 닫기
        document.addEventListener('click', (e) => {
            if (!filterMenu.contains(e.target) && e.target !== filterToggleBtn) {
                filterMenu.classList.add('hidden');
            }
        });
        
        // 뷰어 배경 클릭 시 (줌 리셋 또는 닫기)
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
        
        // 키보드 및 전체화면 이벤트
        document.addEventListener('keydown', handleKeyboard);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    }
    
    /**
     * 필터 값 업데이트 및 적용
     */
    function updateFilterValue(key, value) {
        imageEffects[currentIndex][key] = value;
        applyStoredEffect(viewerImage);
    }

    /**
     * 브라우저 뒤로가기 버튼으로 닫기
     */
    function closeOnBack() {
        closeViewer();
    }
    
    /**
     * 뷰어 열기
     */
    function openViewer(index) {
        currentIndex = index;
        showLoading();

        window.addEventListener('popstate', closeOnBack);
        history.pushState({ imageViewer: true }, '', '#viewer');
        
        // (수정) 슬라이더 트랙 즉시 리셋
        sliderTrack.classList.add('no-transition');
        sliderTrack.style.transform = 'translateX(-100%)';
        sliderTrack.offsetHeight; // Reflow
        sliderTrack.classList.remove('no-transition');
        
        const img = images[currentIndex];
        const tempImage = new Image(); // 현재 이미지만 사전 로드
        
        tempImage.onload = () => {
            // (신규) 3개 슬라이드 이미지 로드
            loadSlideImages(currentIndex); 
            
            updateViewer(); // 카운터 및 버튼 업데이트
            viewer.classList.remove('hidden');
            viewer.classList.add('flex');
            document.body.style.overflow = 'hidden';
            
            // (수정) 줌/제스처 핸들러는 항상 중앙 슬라이드를 기준으로 초기화
            initZoomController(); 
            initGestureHandler();
            
            hideLoading();
        };
        
        tempImage.onerror = () => {
            hideLoading();
            console.error('이미지 로드 실패:', img.src);
            // 여기에 사용자에게 피드백을 주는 로직 추가 가능
        };
        
        tempImage.src = img.src;
    }

    /**
     * (신규) 3개의 슬라이드(이전, 현재, 다음)에 이미지 로드
     */
    function loadSlideImages(index) {
        const currentImg = images[index];
        const prevImg = images[index - 1];
        const nextImg = images[index + 1];

        // 현재 이미지 로드
        viewerImage.src = currentImg.src;
        viewerImage.alt = currentImg.alt || '';
        
        // 이전 이미지 로드
        if (prevImg) {
            imagePrev.src = prevImg.src;
            imagePrev.alt = prevImg.alt || '';
            slidePrev.style.visibility = 'visible';
        } else {
            imagePrev.src = ''; // src를 비워 메모리 절약
            slidePrev.style.visibility = 'hidden';
        }
        
        // 다음 이미지 로드
        if (nextImg) {
            imageNext.src = nextImg.src;
            imageNext.alt = nextImg.alt || '';
            slideNext.style.visibility = 'visible';
        } else {
            imageNext.src = '';
            slideNext.style.visibility = 'hidden';
        }

        // 현재 이미지에 대한 효과 로드 및 적용
        loadEffectsToUI();
        applyStoredEffect(viewerImage);
    }
    
    /**
     * 뷰어 닫기
     */
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
        
        // (수정) 슬라이드 이미지 소스 비우기
        viewerImage.src = '';
        imagePrev.src = '';
        imageNext.src = '';
        
        window.removeEventListener('popstate', closeOnBack);
        if (history.state && history.state.imageViewer) {
            history.back();
        }
    }
    
    /**
     * 뷰어 UI 업데이트 (카운터, 버튼)
     */
    function updateViewer() {
        if (images.length === 0) return;
        
        viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < images.length - 1 ? 'flex' : 'none';
        
        // 줌 리셋은 initZoomController에서 처리
        updateZoomDisplay(1);
    }
    
    /**
     * (수정) 이전 이미지로 슬라이드
     */
    function showPrev() {
        // 줌 상태가 아니거나 슬라이딩 중이 아닐 때
        if (currentIndex > 0 && !isSliding && (!zoomController || !zoomController.getState().isZoomed)) {
            isSliding = true;
            sliderTrack.style.transform = 'translateX(0%)'; // 왼쪽으로 슬라이드
            
            // 애니메이션 종료 후 (300ms)
            setTimeout(() => {
                currentIndex--;
                
                // 줌 컨트롤러 파괴
                if (zoomController) {
                    zoomController.destroy();
                    zoomController = null;
                }
                
                // 새 이미지 로드 및 UI 업데이트
                loadSlideImages(currentIndex);
                updateViewer();
                
                // 새 줌 컨트롤러 초기화 (리셋된 상태로)
                initZoomController(); 
                
                // 슬라이더 트랙 위치 즉시 리셋
                sliderTrack.classList.add('no-transition');
                sliderTrack.style.transform = 'translateX(-100%)';
                sliderTrack.offsetHeight; // Reflow
                sliderTrack.classList.remove('no-transition');
                
                isSliding = false;
            }, 300); // CSS transition duration과 일치
        }
    }
    
    /**
     * (수정) 다음 이미지로 슬라이드
     */
    function showNext() {
        // 줌 상태가 아니거나 슬라이딩 중이 아닐 때
        if (currentIndex < images.length - 1 && !isSliding && (!zoomController || !zoomController.getState().isZoomed)) {
            isSliding = true;
            sliderTrack.style.transform = 'translateX(-200%)'; // 오른쪽으로 슬라이드
            
            // 애니메이션 종료 후 (300ms)
            setTimeout(() => {
                currentIndex++;
                
                if (zoomController) {
                    zoomController.destroy();
                    zoomController = null;
                }
                
                loadSlideImages(currentIndex);
                updateViewer();
                initZoomController();
                
                sliderTrack.classList.add('no-transition');
                sliderTrack.style.transform = 'translateX(-100%)';
                sliderTrack.offsetHeight; // Reflow
                sliderTrack.classList.remove('no-transition');
                
                isSliding = false;
            }, 300); // CSS transition duration과 일치
        }
    }
    
    /**
     * (수정) 줌 컨트롤러 초기화 (항상 중앙 슬라이드 기준)
     */
    function initZoomController() {
        if (zoomController) zoomController.destroy();
        
        // viewerImageWrapper와 viewerImage는 항상 중앙 슬라이드의 요소
        zoomController = new window.ZoomController(viewerImageWrapper, viewerImage, {
            minScale: 1, maxScale: 5, scaleStep: 0.5, doubleTapScale: 2.5
        });
        
        updateZoomDisplay(1);
    }
    
    /**
     * (수정) 제스처 핸들러 초기화 (전체 컨테이너 기준)
     */
    function initGestureHandler() {
        if (gestureHandler) gestureHandler.destroy();
        
        // 제스처는 viewerContainer 전체에서 감지
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
                // (수정) 줌 상태일 때만 드래그(패닝) 활성화
                if (zoomController && zoomController.getState().isZoomed) {
                    zoomController.drag(data.x, data.y);
                    return true; // preventDefault
                }
                return false; // 줌 아닐 땐 기본 동작 (슬라이드)
            },
            onDragEnd: () => {
                if (zoomController) zoomController.endDrag();
            },
            onSwipeLeft: () => {
                // (수정) 줌 아닐 때만 다음 이미지
                if (zoomController && !zoomController.getState().isZoomed) showNext();
            },
            onSwipeRight: () => {
                // (수정) 줌 아닐 때만 이전 이미지
                if (zoomController && !zoomController.getState().isZoomed) showPrev();
            },
            onWheel: (scale, point) => {
                if (zoomController) {
                    const currentScale = zoomController.getState().scale;
                    const newScale = zoomController.setZoom(currentScale * scale, point.x, point.y);
                    updateZoomDisplay(newScale);
                }
            },
            // (신규) 펜 회전으로 줌
            onPenRotate: (delta, point) => {
                if (zoomController) {
                    const currentScale = zoomController.getState().scale;
                    // delta > 0: 시계방향 (줌인), delta < 0: 반시계방향 (줌아웃)
                    const scaleFactor = 1 + (delta * 0.5); // 0.5는 민감도
                    const newScale = zoomController.setZoom(currentScale * scaleFactor, point.x, point.y, false);
                    updateZoomDisplay(newScale);
                }
            }
        });
    }
    
    /**
     * 줌 레벨 표시 업데이트
     */
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        zoomLevelDisplay.textContent = `${percentage}%`;
    }
    
    /**
     * 현재 이미지의 효과를 UI 컨트롤에 로드
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
    
    /**
     * 현재 효과를 모든 이미지에 적용
     */
    function applyEffectToAll() {
        const currentEffect = { ...imageEffects[currentIndex] };
        for (let i = 0; i < imageEffects.length; i++) {
            imageEffects[i] = { ...currentEffect };
        }
        showToast('현재 효과가 모든 이미지에 적용되었습니다', 'success');
    }
    
    /**
     * 현재 이미지 효과 리셋
     */
    function resetEffects() {
        imageEffects[currentIndex] = getDefaultEffects();
        loadEffectsToUI();
        applyStoredEffect(viewerImage);
        showToast('효과가 초기화되었습니다', 'info');
    }
    
    /**
     * 토스트 메시지 표시
     */
    function showToast(message, type) {
        const bgColor = type === 'success' ? 'bg-green-600' : 'bg-blue-600';
        const toast = document.createElement('div');
        toast.className = `fixed top-20 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[1001]`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 2000);
    }
    
    /**
     * 이미지 다운로드
     */
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
    
    /**
     * 이미지 공유
     */
    async function shareImage() {
        const img = images[currentIndex];
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
    
    /**
     * 대체 공유 (클립보드 복사)
     */
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
    
    /**
     * 전체화면 토글
     */
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
    
    /**
     * 키보드 이벤트 처리
     */
    function handleKeyboard(e) {
        if (viewer.classList.contains('hidden')) return;
        if (isSliding) return; // 슬라이드 중에는 키보드 입력 무시

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
    
    // DOM 로드 후 뷰어 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImageViewer);
    } else {
        initImageViewer();
    }
    
})();
