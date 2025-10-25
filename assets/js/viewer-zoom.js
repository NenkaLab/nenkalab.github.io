(function(window) {
    'use strict';
    
    class ZoomController {
        constructor(imageWrapper, image, options) {
            this.wrapper = imageWrapper;
            this.image = image;
            this.options = Object.assign({
                minScale: 1,
                maxScale: 50,
                scaleStep: 0.1,
                doubleTapScale: 3,
                animationDuration: 200
            }, options);
            
            this.scale = 1;
            this.translateX = 0;
            this.translateY = 0;
            this.rotation = 0;
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.lastTranslateX = 0;
            this.lastTranslateY = 0;
            this.animationFrame = null;
            this.lastPinchCenter = null;
            
            this.updateTransform();
        }
        
        updateTransform(animate = false) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            
            this.animationFrame = requestAnimationFrame(() => {
                // 애니메이션 클래스 제어
                if (animate) {
                    this.wrapper.classList.remove('zooming');
                    void this.wrapper.offsetWidth; // 리플로우 강제
                    this.wrapper.classList.add('zooming');
                } else {
                    this.wrapper.classList.remove('zooming');
                }
                
                const transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale}) rotate(${this.rotation}deg)`;
                this.wrapper.style.transform = transform;
                this.wrapper.style.willChange = 'transform';
            });
        }
        
        setZoom(newScale, centerX, centerY, animate = true) {
            newScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            // 줌 중심점 계산
            if (centerX !== undefined && centerY !== undefined) {
                const rect = this.wrapper.getBoundingClientRect();
                
                // 컨테이너 중심점에서의 오프셋
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                
                // 스케일 비율
                const scaleRatio = newScale / this.scale;
                
                // 새로운 translate 계산 (줌 중심점 기준)
                this.translateX = centerX - rect.left - rect.width / 2 - (centerX - rect.left - rect.width / 2 - this.translateX) * scaleRatio;
                this.translateY = centerY - rect.top - rect.height / 2 - (centerY - rect.top - rect.height / 2 - this.translateY) * scaleRatio;
            }
            
            this.scale = newScale;
            
            if (this.scale === this.options.minScale) {
                this.translateX = 0;
                this.translateY = 0;
            } else {
                this.constrainPan();
            }
            
            this.updateTransform(animate);
            
            return this.scale;
        }
        
        zoomIn(centerX, centerY) {
            return this.setZoom(this.scale + this.options.scaleStep, centerX, centerY);
        }
        
        zoomOut(centerX, centerY) {
            return this.setZoom(this.scale - this.options.scaleStep, centerX, centerY);
        }
        
        resetZoom(animate = true) {
            this.scale = this.options.minScale;
            this.translateX = 0;
            this.translateY = 0;
            this.updateTransform(animate);
            return this.scale;
        }
        
        toggleZoom(centerX, centerY) {
            if (this.scale > this.options.minScale) {
                return this.resetZoom();
            } else {
                return this.setZoom(this.options.doubleTapScale, centerX, centerY);
            }
        }
        
        pinchZoom(scale, center, lastScale) {
            // 연속적인 핀치 줌
            const scaleChange = scale / lastScale;
            const newScale = this.scale * scaleChange;
            
            const clampedScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            if (clampedScale !== newScale) {
                // 최대/최소 스케일에 도달
                return this.scale;
            }
            
            // 핀치 중심점 기준으로 줌
            const rect = this.wrapper.getBoundingClientRect();
            const offsetX = center.x - rect.left - rect.width / 2;
            const offsetY = center.y - rect.top - rect.height / 2;
            
            // translate 조정 (핀치 중심점이 고정되도록)
            this.translateX = offsetX - (offsetX - this.translateX) * scaleChange;
            this.translateY = offsetY - (offsetY - this.translateY) * scaleChange;
            
            this.scale = clampedScale;
            this.lastPinchCenter = center;
            
            this.constrainPan();
            this.updateTransform(false);
            
            return this.scale;
        }
        
        startDrag(x, y) {
            if (this.scale <= this.options.minScale) return false;
            
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
            this.lastTranslateX = this.translateX;
            this.lastTranslateY = this.translateY;
            
            return true;
        }
        
        drag(x, y) {
            if (!this.isDragging || this.scale <= this.options.minScale) return false;
            
            const deltaX = x - this.dragStartX;
            const deltaY = y - this.dragStartY;
            
            this.translateX = this.lastTranslateX + deltaX;
            this.translateY = this.lastTranslateY + deltaY;
            
            this.constrainPan();
            this.updateTransform(false);
            
            return true;
        }
        
        endDrag() {
            this.isDragging = false;
            return true;
        }
        
        constrainPan() {
            if (this.scale <= this.options.minScale) {
                this.translateX = 0;
                this.translateY = 0;
                return;
            }
            
            const wrapperRect = this.wrapper.parentElement.getBoundingClientRect();
            const imageNaturalWidth = this.image.naturalWidth || this.image.width;
            const imageNaturalHeight = this.image.naturalHeight || this.image.height;
            
            // 이미지의 실제 표시 크기 계산
            const imageAspect = imageNaturalWidth / imageNaturalHeight;
            const containerAspect = wrapperRect.width / wrapperRect.height;
            
            let displayWidth, displayHeight;
            
            if (imageAspect > containerAspect) {
                // 이미지가 더 넓음 (가로가 기준)
                displayWidth = Math.min(wrapperRect.width, imageNaturalWidth);
                displayHeight = displayWidth / imageAspect;
            } else {
                // 이미지가 더 높음 (세로가 기준)
                displayHeight = Math.min(wrapperRect.height, imageNaturalHeight);
                displayWidth = displayHeight * imageAspect;
            }
            
            const scaledWidth = displayWidth * this.scale;
            const scaledHeight = displayHeight * this.scale;
            
            // 최대 이동 거리 계산
            const maxX = Math.max(0, (scaledWidth - wrapperRect.width) / 2);
            const maxY = Math.max(0, (scaledHeight - wrapperRect.height) / 2);
            
            // 이동 제한
            this.translateX = Math.max(-maxX, Math.min(maxX, this.translateX));
            this.translateY = Math.max(-maxY, Math.min(maxY, this.translateY));
        }
        
        rotate(degrees = 90) {
            this.rotation = (this.rotation + degrees) % 360;
            this.updateTransform(true);
        }
        
        getState() {
            return {
                scale: this.scale,
                translateX: this.translateX,
                translateY: this.translateY,
                rotation: this.rotation,
                isZoomed: this.scale > this.options.minScale
            };
        }
        
        reset() {
            this.scale = this.options.minScale;
            this.translateX = 0;
            this.translateY = 0;
            this.isDragging = false;
            this.lastPinchCenter = null;
            this.updateTransform(false);
        }
        
        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            this.wrapper.style.willChange = '';
        }
    }
    
    window.ZoomController = ZoomController;
    
})(window);