(function() {
    'use strict';
    
    // --- 기본 요소 ---
    const viewer = document.getElementById('image-viewer');
    const viewerContainer = document.getElementById('viewer-container');
    const viewerCounter = document.getElementById('viewer-counter');
    const viewerLoading = document.getElementById('viewer-loading');
    
    // --- 버튼 ---
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
    
    // --- 필터 ---
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
    
    // --- 상태 변수 ---
    let articleImages = []; // 본문의 원본 <img> 요소 목록
    let viewerImages = []; // 뷰어 내부의 <img> 요소 목록
    let viewerZoomTargets = []; // 뷰어 <img>의 부모 (줌/패닝 대상)
    
    let currentIndex = 0;
    let zoomController = null;
    let gestureHandler = null;
    let isFullscreen = false;
    let imageEffects = [];
    let isTransitioning = false; // 애니메이션(VT 또는 레거시) 중복 방지 플래그
    
    const VT_NAME = 'viewer-transition'; // View Transition API용 고유 이름
    
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
            // (신규) 썸네일에도 view-transition-name 준비 (초기엔 'none')
            img.style.viewTransitionName = 'none';
            img.addEventListener('click', () => openViewer(index));
        });
        
        setupEventListeners();
    }
    
    /**
     * (신규) 뷰어 내부에 모든 이미지 래퍼와 img 태그를 미리 생성
     */
    function createViewerDOM() {
        viewerContainer.innerHTML = ''; // 혹시 모를 기존 내용 삭제
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < articleImages.length; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'viewer-image-instance-wrapper';
            
            const zoomTarget = document.createElement('div');
            zoomTarget.className = 'viewer-zoom-target';
            
            const imgEl = document.createElement('img');
            imgEl.className = 'viewer-image-instance';
            imgEl.alt = articleImages[i].alt || '';
            imgEl.draggable = false;
            imgEl.oncontextmenu = () => false;
            // (신규) 뷰어 이미지에도 view-transition-name 준비 (초기엔 'none')
            imgEl.style.viewTransitionName = 'none';

            zoomTarget.appendChild(imgEl);
            wrapper.appendChild(zoomTarget);
            fragment.appendChild(wrapper);
            
            viewerImages[i] = imgEl;
            viewerZoomTargets[i] = zoomTarget;
        }
        
        viewerContainer.appendChild(fragment);
    }
    
    /**
     * 기본 효과 객체 반환
     */
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
    
    /**
     * UI 컨트롤 숨김
     */
    function showControls() {
        const controls = viewer.querySelectorAll('.control-hide');
        controls.forEach(control => control.classList.remove('hide'));
    }

    /**
     * UI 컨트롤 표시
     */
    function hideControls(e) {
        e.stopPropagation();
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
        
        zoomInBtn.addEventListener('click', () => {
            if (zoomController) {
                // (수정) viewerContainer가 아닌, 현재 줌 대상의 래퍼 기준
                const rect = viewerZoomTargets[currentIndex].getBoundingClientRect(); 
                const scale = zoomController.zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                updateZoomDisplay(scale);
            }
        });
        
        zoomOutBtn.addEventListener('click', () => {
            if (zoomController) {
                // (수정) viewerContainer가 아닌, 현재 줌 대상의 래퍼 기준
                const rect = viewerZoomTargets[currentIndex].getBoundingClientRect();
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
        
        // 필터 컨트롤 이벤트
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
        
        // 뷰어 배경 클릭 시 닫기 (줌 상태면 줌 리셋)
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
        
        // (신규) 뒤로가기 버튼(popstate) 이벤트
        window.addEventListener('popstate', closeOnBack);
    }
    
    /**
     * 필터 값 변경 시
     */
    function updateFilterValue(key, value) {
        imageEffects[currentIndex][key] = value;
        applyStoredEffect(viewerImages[currentIndex]);
    }

    /**
     * popstate 이벤트 핸들러 (뒤로가기 버튼)
     */
    function closeOnBack() {
        // 'hidden' 클래스로 뷰어 활성화 상태 체크
        if (!viewer.classList.contains('hidden')) {
            _performCloseAnimation();
        }
    }

    /**
     * 실제 닫기 애니메이션 및 정리 작업을 수행하는 내부 함수
     */
    function _performCloseAnimation() {
        if (isTransitioning) return;
        isTransitioning = true;

        const currentWrapper = viewerZoomTargets[currentIndex]?.parentElement;
        const currentImage = viewerImages[currentIndex];
        const articleImage = articleImages[currentIndex];

        // 뷰 트랜지션 준비
        const startTransition = () => {
            // 1. 닫기 애니메이션 시작
            currentWrapper.classList.remove('active');

            // 2. JS가 DOM을 업데이트한 후 브라우저에 알림
            return Promise.resolve().then(() => {
                // 3. 뷰어 숨김 및 정리
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
            });
        };

        // View Transition API 실행
        if (document.startViewTransition) {
            // 트랜지션할 요소에만 이름 할당
            articleImage.style.viewTransitionName = VT_NAME;
            currentImage.style.viewTransitionName = VT_NAME;

            document.startViewTransition(startTransition).finally(() => {
                // 트랜지션 완료 후 이름 해제 (버그 수정)
                articleImage.style.viewTransitionName = 'none';
                currentImage.style.viewTransitionName = 'none';
                isTransitioning = false;
            });
        } else {
            // API 미지원 시 폴백
            startTransition().finally(() => {
                isTransitioning = false;
            });
        }
    }

    
    /**
     * 뷰어 열기
     */
    function openViewer(index) {
        if (isTransitioning) return;
        
        currentIndex = index;
        showLoading();

        // (신규) 브라우저 히스토리 추가
        window.addEventListener('popstate', closeOnBack);
        history.pushState({ imageViewer: true }, '', '#viewer');
        
        const currentWrapper = viewerZoomTargets[currentIndex].parentElement;
        const currentImage = viewerImages[currentIndex];
        const currentZoomTarget = viewerZoomTargets[currentIndex];
        const articleImage = articleImages[currentIndex]; // 썸네일
        
        // 이미지 로드 (이미 로드됐으면 캐시 사용)
        currentImage.src = articleImage.src;
        
        currentImage.onload = () => {
            // 로드 완료 후 줌 컨트롤러 초기화
            initZoomController(currentZoomTarget, currentImage);
            initGestureHandler();
            loadEffectsToUI(); // UI에 현재 이미지 효과 로드
            applyStoredEffect(currentImage); // 이미지에 CSS 효과 적용
            updateViewer(); // 카운터, 버튼 업데이트
            
            const runOpenAnimation = () => {
                // DOM 변경 로직
                document.body.style.overflow = 'hidden';
                viewer.classList.remove('hidden');
                viewer.classList.add('flex');
                
                // 래퍼 페이드 인 (VT가 처리)
                currentWrapper.classList.add('active'); 
                hideLoading();
                
                // 이전/다음 이미지 미리 로드
                preloadNeighbors();
            };

            // View Transition API 적용
            if (document.startViewTransition) {
                isTransitioning = true;
                // 트랜지션할 요소에만 이름 할당
                articleImage.style.viewTransitionName = VT_NAME;
                currentImage.style.viewTransitionName = VT_NAME;
                
                document.startViewTransition(runOpenAnimation).finally(() => {
                    // 트랜지션 완료 후 이름 해제 (버그 수정)
                    articleImage.style.viewTransitionName = 'none';
                    currentImage.style.viewTransitionName = 'none';
                    isTransitioning = false;
                });
            } else {
                runOpenAnimation(); // API 미지원 시 즉시 실행
            }
        };
        
        currentImage.onerror = () => {
            hideLoading();
            console.error('이미지 로드 실패:', articleImages[currentIndex].src);
        };
    }
    
    /**
     * 뷰어 닫기 (버튼/키보드용)
     */
    function closeViewer() {
        if (isTransitioning) return;

        // (수정) popstate 이벤트를 트리거하기 위해 history.back() 호출
        if (history.state?.imageViewer) {
            history.back();
        } else {
            // history state가 없는 비정상적인 경우, 직접 닫기 실행
            _performCloseAnimation();
        }
    }
    
    /**
     * 뷰어 상태 업데이트 (카운터, 버튼)
     */
    function updateViewer() {
        if (articleImages.length === 0) return;
        
        viewerCounter.textContent = `${currentIndex + 1} / ${articleImages.length}`;
        prevBtn.style.display = currentIndex > 0 ? 'flex' : 'none';
        nextBtn.style.display = currentIndex < articleImages.length - 1 ? 'flex' : 'none';
        
        if (zoomController) {
            // updateZoomDisplay는 zoomController.reset() 등에서 호출됨
        } else {
            updateZoomDisplay(1);
        }
    }
    
    /**
     * (수정) 이전 이미지로 페이드 (View Transition API 적용)
     */
    function showPrev() {
        if (currentIndex > 0 && !isTransitioning && (!zoomController || !zoomController.getState().isZoomed)) {
            isTransitioning = true;
            
            // (신규) VT API 미지원 시 폴백
            if (!document.startViewTransition) {
                _performLegacyImageTransition(currentIndex - 1);
                return;
            }

            const oldIndex = currentIndex;
            const newIndex = currentIndex - 1;

            const oldWrapper = viewerZoomTargets[oldIndex].parentElement;
            const oldImage = viewerImages[oldIndex];
            const newWrapper = viewerZoomTargets[newIndex].parentElement;
            const newImage = viewerImages[newIndex];
            const newZoomTarget = viewerZoomTargets[newIndex];

            // 뷰 트랜지션 실행
            document.startViewTransition(() => {
                // 1. 줌 리셋 (즉시)
                if (zoomController) {
                    zoomController.resetZoom(false); // 애니메이션 없이 리셋
                    zoomController.destroy();
                    zoomController = null;
                }
            
                // 2. 이전 래퍼 숨김
                oldWrapper.classList.remove('active');
                oldImage.style.viewTransitionName = 'none'; // 이름 해제

                // 3. 인덱스 변경
                currentIndex = newIndex;

                // 4. 새 이미지 로드 (필요시) 및 컨트롤러 재초기화
                newImage.src = articleImages[currentIndex].src; // 이미 로드됐으면 캐시 사용
                newImage.onload = () => { // 로드가 필요해도 VT가 대기
                    initZoomController(newZoomTarget, newImage);
                    loadEffectsToUI();
                    applyStoredEffect(newImage);
                    updateViewer();
                    preloadNeighbors();
                };
                
                // 5. 새 래퍼 표시 및 VT 이름 할당
                newWrapper.classList.add('active');
                newImage.style.viewTransitionName = VT_NAME; // 이름 할당

            }).finally(() => {
                // 6. 완료 후 새 이미지의 VT 이름 해제 (다음을 위해)
                newImage.style.viewTransitionName = 'none';
                isTransitioning = false;
            });
        }
    }
    
    /**
     * (수정) 다음 이미지로 페이드 (View Transition API 적용)
     */
    function showNext() {
        if (currentIndex < articleImages.length - 1 && !isTransitioning && (!zoomController || !zoomController.getState().isZoomed)) {
            isTransitioning = true;
            
            // VT API 미지원 시 폴백
            if (!document.startViewTransition) {
                _performLegacyImageTransition(currentIndex + 1);
                return;
            }

            const oldIndex = currentIndex;
            const newIndex = currentIndex + 1;

            const oldWrapper = viewerZoomTargets[oldIndex].parentElement;
            const oldImage = viewerImages[oldIndex];
            const newWrapper = viewerZoomTargets[newIndex].parentElement;
            const newImage = viewerImages[newIndex];
            const newZoomTarget = viewerZoomTargets[newIndex];

            // 뷰 트랜지션 실행
            document.startViewTransition(() => {
                if (zoomController) {
                    zoomController.resetZoom(false);
                    zoomController.destroy();
                    zoomController = null;
                }
                
                oldWrapper.classList.remove('active');
                oldImage.style.viewTransitionName = 'none';

                currentIndex = newIndex;

                newImage.src = articleImages[currentIndex].src;
                newImage.onload = () => {
                    initZoomController(newZoomTarget, newImage);
                    loadEffectsToUI();
                    applyStoredEffect(newImage);
                    updateViewer();
                    preloadNeighbors();
                };
                
                newWrapper.classList.add('active');
                newImage.style.viewTransitionName = VT_NAME;

            }).finally(() => {
                newImage.style.viewTransitionName = 'none';
                isTransitioning = false;
            });
        }
    }

    /**
     * (신규) View Transition API 미지원 시 사용할 레거시 전환 로직 (Gap 버그 수정됨)
     */
    function _performLegacyImageTransition(newIndex) {
        if (zoomController) {
            zoomController.resetZoom(false);
            zoomController.destroy();
            zoomController = null;
        }

        const oldIndex = currentIndex;
        currentIndex = newIndex;

        const newWrapper = viewerZoomTargets[currentIndex].parentElement;
        const newImage = viewerImages[currentIndex];
        const newZoomTarget = viewerZoomTargets[currentIndex];

        newImage.src = articleImages[currentIndex].src;
        newImage.onload = () => {
            // (수정) 새 이미지 로드 완료 후 이전 이미지 숨김 (Gap 버그 수정)
            const oldWrapper = viewerZoomTargets[oldIndex].parentElement;
            oldWrapper.classList.remove('active');

            initZoomController(newZoomTarget, newImage);
            loadEffectsToUI();
            applyStoredEffect(newImage);
            updateViewer();
            
            newWrapper.classList.add('active');
            
            preloadNeighbors();
            
            // 페이드 트랜지션 시간(200ms) 후 상태 해제 (CSS transition에 의존)
            // (참고: VT API 미지원 시 html <style>에 opacity transition을 다시 추가해야 함)
            setTimeout(() => { isTransitioning = false; }, 200); 
        };
        newImage.onerror = () => {
            console.error('이미지 로드 실패:', articleImages[currentIndex].src);
            isTransitioning = false;
            currentIndex = oldIndex; // 실패 시 인덱스 복구
        }
    }

    /**
     * (신규) 이전/다음 이미지 미리 로드
     */
    function preloadNeighbors() {
        if (currentIndex > 0) {
            const prevImg = viewerImages[currentIndex - 1];
            if (!prevImg.src) prevImg.src = articleImages[currentIndex - 1].src;
        }
        if (currentIndex < articleImages.length - 1) {
            const nextImg = viewerImages[currentIndex + 1];
            if (!nextImg.src) nextImg.src = articleImages[currentIndex + 1].src;
        }
    }
    
    /**
     * (수정) 줌 컨트롤러 초기화
     */
    function initZoomController(zoomTarget, image) {
        if (zoomController) zoomController.destroy();
        
        zoomController = new window.ZoomController(zoomTarget, image, {
            minScale: 1, maxScale: 5, scaleStep: 0.5, doubleTapScale: 2.5
        });
        
        updateZoomDisplay(1);
    }
    
    /**
     * (수정) 제스처 핸들러 초기화
     */
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
                    return true; // (중요) 드래그를 처리했음을 gesture.js에 알림
                }
                return false; // 드래그를 처리하지 않음 (스와이프 가능)
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
    
    /**
     * 줌 레벨 UI 업데이트
     */
    function updateZoomDisplay(scale) {
        const percentage = Math.round(scale * 100);
        zoomLevelDisplay.textContent = `${percentage}%`;
    }
    
    /**
     * 필터 UI에 현재 이미지 효과 로드
     */
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
    
    /**
     * (수정) 이미지에 CSS 필터 및 렌더링 적용
     */
    function applyStoredEffect(imageElement) {
        if (!imageElement) return;
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
     * 현재 이미지 효과 초기화
     */
    function resetEffects() {
        imageEffects[currentIndex] = getDefaultEffects();
        loadEffectsToUI();
        applyStoredEffect(viewerImages[currentIndex]);
        showToast('효과가 초기화되었습니다', 'info');
    }
    
    /**
     * 간단한 토스트 메시지 표시
     */
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
    
    /**
     * 이미지 다운로드
     */
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
    
    /**
     * 이미지 공유 (Web Share API)
     */
    async function shareImage() {
        const img = articleImages[currentIndex];
        
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
    
    /**
     * 공유 폴백 (URL 복사)
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
        if (!isFullscreen) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
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
        isFullscreen = !!(document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement || 
                         document.msFullscreenElement);
        
        const icon = fullscreenBtn.querySelector('.material-symbols-outlined');
        icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
    }
    
    /**
     * 키보드 이벤트 핸들러
     */
    function handleKeyboard(e) {
        // 'hidden' 클래스로 뷰어 활성화 상태 체크
        if (isTransitioning || viewer.classList.contains('hidden')) return;

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
                    // (수정) 현재 줌 대상의 래퍼 기준
                    const rect = viewerZoomTargets[currentIndex].getBoundingClientRect();
                    const scale = zoomController.zoomIn(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    updateZoomDisplay(scale);
                }
                break;
            case '-':
            case '_':
                if (zoomController) {
                    // (수정) 현재 줌 대상의 래퍼 기준
                    const rect = viewerZoomTargets[currentIndex].getBoundingClientRect();
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
    
    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImageViewer);
    } else {
        initImageViewer();
    }
    
})();

