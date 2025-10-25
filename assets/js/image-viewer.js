(function() {
  document.addEventListener('DOMContentLoaded', initImageViewer);

  let allImages = [];
  let currentIndex = 0;
  let isViewerOpen = false;
  let activeImgEl;

  let transformState = {
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotate: 0
  };
  let filtersState = {};

  let activePointers = [];
  let lastTapTime = 0;
  let doubleTapTimer = null;
  let initialPinch = { dist: 0, angle: 0 };
  let initialTransform = { ...transformState };
  let isPanning = false;

  let isControlsVisible = true;
  let controlsHideTimer = null;

  const viewer = document.getElementById('image-viewer-container');
  const wrapper = document.getElementById('iv-image-wrapper');
  const img1 = document.getElementById('iv-image-1');
  const img2 = document.getElementById('iv-image-2');
  
  const topBar = document.getElementById('iv-top-bar');
  const bottomBar = document.getElementById('iv-bottom-bar');
  const pageNumEl = document.getElementById('iv-page-number');
  const prevBtn = document.getElementById('iv-prev-button');
  const nextBtn = document.getElementById('iv-next-button');

  const zoomInBtn = document.getElementById('iv-zoom-in');
  const zoomOutBtn = document.getElementById('iv-zoom-out');
  const zoomPercentEl = document.getElementById('iv-zoom-percent');
  const rotateLeftBtn = document.getElementById('iv-rotate-left');
  const rotateRightBtn = document.getElementById('iv-rotate-right');
  const rotateResetBtn = document.getElementById('iv-rotate-reset');
  const posResetBtn = document.getElementById('iv-position-reset');

  const closeBtnLeft = document.getElementById('iv-close-left');
  const closeBtnRight = document.getElementById('iv-close-right');
  const fullscreenBtn = document.getElementById('iv-fullscreen-button');
  const effectsBtn = document.getElementById('iv-effects-button');
  
  const effectsPopup = document.getElementById('iv-effects-popup');
  const effectsListEl = document.getElementById('iv-effects-list');
  const effectResetCurrentBtn = document.getElementById('iv-effect-reset-current');
  const effectApplyAllBtn = document.getElementById('iv-effect-apply-all');
  const effectResetAllBtn = document.getElementById('iv-effect-reset-all');

  const filterDefinitions = {
    brightness: { name: '밝기', min: 0, max: 200, value: 100, unit: '%', cssValue: (v) => v / 100 },
    contrast: { name: '대비', min: 0, max: 200, value: 100, unit: '%', cssValue: (v) => v / 100 },
    saturate: { name: '채도', min: 0, max: 200, value: 100, unit: '%', cssValue: (v) => v / 100 },
    grayscale: { name: '흑백', min: 0, max: 100, value: 0, unit: '%', cssValue: (v) => v / 100 },
    sepia: { name: '세피아', min: 0, max: 100, value: 0, unit: '%', cssValue: (v) => v / 100 },
    invert: { name: '반전', min: 0, max: 100, value: 0, unit: '%', cssValue: (v) => v / 100 },
    blur: { name: '흐림', min: 0, max: 10, value: 0, unit: 'px', cssValue: (v) => v },
    'hue-rotate': { name: '색조', min: 0, max: 360, value: 0, unit: 'deg', cssValue: (v) => v },
  };

  function initImageViewer() {
    if (!viewer) return;

    const proseImages = document.querySelectorAll('.post.prose img');
    if (proseImages.length === 0) return;

    allImages = Array.from(proseImages).map(img => ({
      src: img.src,
      alt: img.alt,
      filters: {}
    }));

    proseImages.forEach((img, index) => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => openViewer(index));
    });

    bindViewerEvents();
    initEffectsPopup();
  }

  function openViewer(index) {
    if (isViewerOpen) return;
    isViewerOpen = true;

    currentIndex = index;
    viewer.style.display = 'flex';
    
    document.body.style.overflow = 'hidden';

    activeImgEl = img1;
    img2.style.opacity = 0;
    loadCurrentImage(true);

    showControls();
    updatePageNumber();
    updateFullscreenIcon();

    document.addEventListener('keydown', handleKeyDown);
  }

  function closeViewer() {
    if (!isViewerOpen) return;
    isViewerOpen = false;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    viewer.style.display = 'none';
    document.body.style.overflow = '';
    
    img1.style.opacity = 0;
    img1.src = '';
    img2.style.opacity = 0;
    img2.src = '';
    
    effectsPopup.style.display = 'none';
    document.removeEventListener('keydown', handleKeyDown);
    resetAllPointers();
  }

  function loadCurrentImage(forceReset = false) {
    if (currentIndex < 0 || currentIndex >= allImages.length) return;

    const imageData = allImages[currentIndex];
    
    const inactiveImgEl = (activeImgEl === img1) ? img2 : img1;

    inactiveImgEl.src = imageData.src;
    inactiveImgEl.alt = imageData.alt;
    
    activeImgEl.style.opacity = 0;
    
    inactiveImgEl.style.opacity = 1;
    activeImgEl = inactiveImgEl;

    if (forceReset || !imageData.transform) {
      imageData.transform = { zoom: 1, pan: { x: 0, y: 0 }, rotate: 0 };
      imageData.filters = imageData.filters || {};
    }
    
    transformState = { ...imageData.transform };
    filtersState = { ...imageData.filters };
    
    applyAllTransforms();
    updateZoomUI();
  }

  function applyAllTransforms() {
    if (!activeImgEl) return;
    
    const { zoom, pan, rotate } = transformState;
    const filterString = Object.values(filtersState).join(' ');
    
    activeImgEl.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotate}deg)`;
    activeImgEl.style.filter = filterString || 'none';
    
    wrapper.classList.toggle('is-zoomed', zoom > 1);
    
    if (allImages[currentIndex]) {
      allImages[currentIndex].transform = { ...transformState };
      allImages[currentIndex].filters = { ...filtersState };
    }
  }

  function navigate(direction) {
    let newIndex = currentIndex + direction;

    if (newIndex < 0) {
      newIndex = allImages.length - 1;
    } else if (newIndex >= allImages.length) {
      newIndex = 0;
    }

    currentIndex = newIndex;
    loadCurrentImage();
    updatePageNumber();
  }

  function updatePageNumber() {
    pageNumEl.textContent = `${currentIndex + 1} / ${allImages.length}`;
  }

  function updateZoomUI() {
    zoomPercentEl.textContent = `${Math.round(transformState.zoom * 100)}%`;
  }

  function showControls() {
    if (effectsPopup.style.display === 'block') return;

    isControlsVisible = true;
    viewer.classList.remove('iv-controls-hidden');
    startControlsHideTimer();
  }

  function hideControls() {
    if (effectsPopup.style.display === 'block') return;

    isControlsVisible = false;
    viewer.classList.add('iv-controls-hidden');
  }

  function toggleControls() {
    if (isControlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  }

  function startControlsHideTimer() {
    clearTimeout(controlsHideTimer);
    if (activePointers.length > 0 || (activePointers.length === 0 && !isHoverDevice())) {
    } else {
      controlsHideTimer = setTimeout(hideControls, 3000);
    }
  }

  function isHoverDevice() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function updateFullscreenIcon() {
    if (document.fullscreenElement) {
      fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen_exit</span>';
    } else {
      fullscreenBtn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
    }
  }

  function bindViewerEvents() {
    closeBtnLeft.addEventListener('click', closeViewer);
    closeBtnRight.addEventListener('click', closeViewer);
    
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) {
        closeViewer();
      }
    });
    
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));

    zoomInBtn.addEventListener('click', () => setZoom(transformState.zoom * 1.25));
    zoomOutBtn.addEventListener('click', () => setZoom(transformState.zoom / 1.25));
    zoomPercentEl.addEventListener('click', () => setZoom(1));

    rotateLeftBtn.addEventListener('click', (e) => setRotate(transformState.rotate - (e.ctrlKey ? 10 : 90)));
    rotateRightBtn.addEventListener('click', (e) => setRotate(transformState.rotate + (e.ctrlKey ? 10 : 90)));
    rotateResetBtn.addEventListener('click', () => setRotate(0));

    posResetBtn.addEventListener('click', () => {
      transformState.pan = { x: 0, y: 0 };
      transformState.zoom = 1;
      transformState.rotate = 0;
      applyAllTransforms();
      updateZoomUI();
    });
    
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        viewer.requestFullscreen().catch(err => console.error(err));
      } else {
        document.exitFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', updateFullscreenIcon);

    effectsBtn.addEventListener('click', toggleEffectsPopup);

    wrapper.addEventListener('pointerdown', handlePointerDown);
    wrapper.addEventListener('pointermove', handlePointerMove);
    wrapper.addEventListener('pointerup', handlePointerUp);
    wrapper.addEventListener('pointercancel', handlePointerUp);
    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    
    [topBar, bottomBar, prevBtn, nextBtn].forEach(el => {
      el.addEventListener('pointermove', (e) => {
        e.stopPropagation();
        if (isHoverDevice()) {
          showControls();
        }
      });
    });
  }
  
  function handleKeyDown(e) {
    if (!isViewerOpen) return;

    switch (e.key) {
      case 'Escape':
        closeViewer();
        break;
      case 'ArrowLeft':
        navigate(-1);
        break;
      case 'ArrowRight':
        navigate(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setZoom(transformState.zoom * 1.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setZoom(transformState.zoom / 1.1);
        break;
      case ' ':
        e.preventDefault();
        toggleControls();
        break;
    }
  }
  
  function handlePointerDown(e) {
    if (e.target.closest('.iv-button, input[type="range"]')) return;
    e.preventDefault();
    
    try {
      wrapper.setPointerCapture(e.pointerId);
    } catch (err) { }

    activePointers.push({
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: e.clientX,
      initialY: e.clientY
    });

    if (activePointers.length === 1) {
      isPanning = false;
      initialTransform.pan = { ...transformState.pan };
    } 
    else if (activePointers.length === 2) {
      isPanning = false;
      const p1 = activePointers[0];
      const p2 = activePointers[1];
      
      initialPinch.dist = getPointerDistance(p1, p2);
      initialPinch.angle = getPointerAngle(p1, p2);
      
      initialTransform = { ...transformState };
    }
    
    clearTimeout(controlsHideTimer);
  }

  function handlePointerMove(e) {
    if (activePointers.length === 0) {
      if (isHoverDevice()) {
        showControls();
      }
      return;
    }
    
    e.preventDefault();
    
    const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (index === -1) return;
    
    const lastEvent = { ...activePointers[index] };
    activePointers[index].clientX = e.clientX;
    activePointers[index].clientY = e.clientY;
    
    if (activePointers.length === 1) {
      const p0 = activePointers[0];
      const deltaX = p0.clientX - lastEvent.clientX;
      const deltaY = p0.clientY - lastEvent.clientY;

      if (!isPanning) {
          const moveX = p0.clientX - p0.initialX;
          const moveY = p0.clientY - p0.initialY;
          if (Math.sqrt(moveX*moveX + moveY*moveY) > 5) {
             isPanning = true;
             if (transformState.zoom > 1) {
               wrapper.style.cursor = 'grabbing';
             }
          }
      }
      
      if (isPanning && transformState.zoom > 1) {
          transformState.pan.x += deltaX;
          transformState.pan.y += deltaY;
          applyAllTransforms();
      }
    } 
    else if (activePointers.length === 2) {
      isPanning = false;
      
      const p1 = activePointers[0];
      const p2 = activePointers[1];

      const newDist = getPointerDistance(p1, p2);
      const newAngle = getPointerAngle(p1, p2);

      const zoomRatio = newDist / initialPinch.dist;
      setZoom(initialTransform.zoom * zoomRatio, false);
      
      const angleDiff = newAngle - initialPinch.angle;
      setRotate(initialTransform.rotate + angleDiff, false);

      applyAllTransforms();
    }
  }

  function handlePointerUp(e) {
    const index = activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (index === -1) return;

    activePointers.splice(index, 1);
    
    try {
      wrapper.releasePointerCapture(e.pointerId);
    } catch(err) {}

    if (activePointers.length === 0) {
      if (isPanning) {
        isPanning = false;
        wrapper.style.cursor = 'grab';
        checkPanBounds();
      } else {
        handleTap();
      }
      startControlsHideTimer();
      
    } else if (activePointers.length === 1) {
      initialTransform.pan = { ...transformState.pan };
      activePointers[0].initialX = activePointers[0].clientX;
      activePointers[0].initialY = activePointers[0].clientY;
    }
  }

  function resetAllPointers() {
      activePointers.forEach(p => {
           try { wrapper.releasePointerCapture(p.pointerId); } catch(err) {}
      });
      activePointers = [];
      isPanning = false;
  }

  function handleTap() {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastTapTime;

    clearTimeout(doubleTapTimer);

    if (timeDiff > 10 && timeDiff < 300) {
      handleDoubleTapZoom();
      lastTapTime = 0;
    } else {
      lastTapTime = currentTime;
      doubleTapTimer = setTimeout(() => {
        if (lastTapTime !== 0) {
          toggleControls();
          lastTapTime = 0;
        }
      }, 300);
    }
  }

  function handleDoubleTapZoom() {
    let currentZoom = transformState.zoom;
    let nextZoom;

    if (Math.abs(currentZoom - 2) < 0.1) {
      nextZoom = 3;
    } else if (Math.abs(currentZoom - 3) < 0.1) {
      nextZoom = 4;
    } else if (Math.abs(currentZoom - 4) < 0.1) {
      nextZoom = 1;
    } else if (currentZoom > 1.1) {
      nextZoom = 1;
    } else {
      nextZoom = 2;
    }
    
    setZoom(nextZoom);
    
    if (nextZoom === 1) {
      transformState.pan = { x: 0, y: 0 };
      applyAllTransforms();
    }
  }

  function getPointerDistance(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getPointerAngle(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  function checkPanBounds() {
  }

  function handleWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -1 : 1;

    if (e.ctrlKey) {
      const rotateAmount = delta * (e.shiftKey ? 1 : 5);
      setRotate(transformState.rotate + rotateAmount);
    } else {
      const zoomAmount = 1 + delta * 0.1;
      setZoom(transformState.zoom * zoomAmount);
    }
    
    showControls();
  }
  
  function setZoom(newZoom, updateUI = true) {
    transformState.zoom = Math.max(0.1, Math.min(newZoom, 10));
    
    if (transformState.zoom === 1) {
      transformState.pan = { x: 0, y: 0 };
    }
    
    if (updateUI) {
      applyAllTransforms();
      updateZoomUI();
    }
  }

  function setRotate(newRotate, updateUI = true) {
    transformState.rotate = newRotate;
    
    if (updateUI) {
      applyAllTransforms();
    }
  }
  
  function initEffectsPopup() {
    effectsListEl.innerHTML = '';
    
    for (const [filterKey, props] of Object.entries(filterDefinitions)) {
      const item = document.createElement('div');
      item.className = 'iv-effect-item';
      item.dataset.filter = filterKey;
      
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">${props.name}</label>
          <div class="flex items-center gap-2">
            <span class="iv-effect-value text-xs text-zinc-400">${props.value}${props.unit}</span>
            <button class="iv-effect-reset-btn text-xs text-blue-400 opacity-0" title="초기화">초기화</button>
          </div>
        </div>
        <input type="range" min="${props.min}" max="${props.max}" value="${props.value}" step="${props.step || (props.max > 100 ? 1 : 0.1)}" class="mt-1 h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white">
      `;
      
      const slider = item.querySelector('input[type="range"]');
      const valueEl = item.querySelector('.iv-effect-value');
      const resetBtn = item.querySelector('.iv-effect-reset-btn');
      
      slider.addEventListener('input', () => {
        let value = parseFloat(slider.value);
        if (filterKey === 'blur') value = value.toFixed(1);
        
        valueEl.textContent = `${value}${props.unit}`;
        resetBtn.style.opacity = (value !== props.value) ? '1' : '0';
        
        const cssValue = props.cssValue(value);
        if (value === props.value) {
          delete filtersState[filterKey];
        } else {
          filtersState[filterKey] = `${filterKey}(${cssValue}${props.unit === '%' ? '' : props.unit})`;
        }
        applyAllTransforms();
      });
      
      resetBtn.addEventListener('click', () => {
        slider.value = props.value;
        slider.dispatchEvent(new Event('input'));
      });
      
      effectsListEl.appendChild(item);
    }
    
    effectResetCurrentBtn.addEventListener('click', () => {
      resetFilters(currentIndex);
      loadEffectsUI(currentIndex);
    });
    
    effectApplyAllBtn.addEventListener('click', () => {
      const currentFilters = allImages[currentIndex].filters;
      allImages.forEach(img => {
        img.filters = { ...currentFilters };
      });
    });
    
    effectResetAllBtn.addEventListener('click', () => {
      allImages.forEach((img, i) => resetFilters(i));
      loadEffectsUI(currentIndex);
    });
  }

  function toggleEffectsPopup() {
    const isHidden = effectsPopup.style.display === 'none' || effectsPopup.style.display === '';
    if (isHidden) {
      loadEffectsUI(currentIndex);
      effectsPopup.style.display = 'block';
      clearTimeout(controlsHideTimer);
      viewer.classList.remove('iv-controls-hidden');
    } else {
      effectsPopup.style.display = 'none';
      startControlsHideTimer();
    }
  }
  
  function loadEffectsUI(index) {
    if (!allImages[index]) return;
    const imageFilters = allImages[index].filters || {};
    
    effectsListEl.querySelectorAll('.iv-effect-item').forEach(item => {
      const filterKey = item.dataset.filter;
      const props = filterDefinitions[filterKey];
      const filterStr = imageFilters[filterKey];

      let currentValue = props.value;
      
      if (filterStr) {
        const match = filterStr.match(/\(([^)]+)\)/);
        if (match) {
           let val = parseFloat(match[1]);
           if (props.cssValue(100) === 1) val *= 100;
           currentValue = val;
        }
      }
      
      const slider = item.querySelector('input[type="range"]');
      const valueEl = item.querySelector('.iv-effect-value');
      const resetBtn = item.querySelector('.iv-effect-reset-btn');

      slider.value = currentValue;
      if (filterKey === 'blur') currentValue = currentValue.toFixed(1);
      valueEl.textContent = `${currentValue}${props.unit}`;
      resetBtn.style.opacity = (parseFloat(slider.value) !== props.value) ? '1' : '0';
    });
  }
  
  function resetFilters(index) {
    if (!allImages[index]) return;
    allImages[index].filters = {};
    if (index === currentIndex) {
      filtersState = {};
      applyAllTransforms();
    }
  }
  
})();
