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
            
            this.updateTransform();
        }
        
        updateTransform(animate = false) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            
            this.animationFrame = requestAnimationFrame(() => {
                if (animate) {
                    this.wrapper.classList.remove('zooming');
                } else {
                    this.wrapper.classList.add('zooming');
                }
                
                const transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale}) rotate(${this.rotation}deg)`;
                this.wrapper.style.transform = transform;
                
                if (animate) {
                    // (수정) 애니메이션이 끝난 후 'zooming' 클래스를 다시 추가
                    setTimeout(() => {
                        this.wrapper.classList.add('zooming');
                    }, this.options.animationDuration);
                }
            });
        }
        
        /**
         * (수정) 줌 중심점 계산 로직 수정
         * 줌 버튼(중앙)과 핀치/더블탭(포인터)에서 모두 올바르게 작동
         */
        setZoom(newScale, centerX, centerY, animate = true) {
            newScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            if (centerX !== undefined && centerY !== undefined) {
                const rect = this.wrapper.getBoundingClientRect();
                
                // 1. 래퍼(부모) 기준 포인터의 상대 좌표
                const relativeX = centerX - rect.left;
                const relativeY = centerY - rect.top;

                // 2. 현재 스케일/패닝 상태에서, 포인터가 이미지의 어느 지점을 가리키는지 계산
                const imageX = (relativeX - this.translateX) / this.scale;
                const imageY = (relativeY - this.translateY) / this.scale;

                // 3. 새 스케일이 적용된 후, 2번의 지점이 다시 포인터 아래(1번)에 위치하도록
                //    새로운 translateX/Y 값을 계산
                this.translateX = relativeX - (imageX * newScale);
                this.translateY = relativeY - (imageY * newScale);
            }
            
            this.scale = newScale;
            
            if (this.scale === this.options.minScale) {
                this.translateX = 0;
                this.translateY = 0;
                // this.rotation = 0; // 회전은 줌 리셋 시 초기화하지 않음
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
            // this.rotation = 0; // 회전은 유지
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
        
        pinchZoom(scale, centerX, centerY) {
            const newScale = this.scale * scale;
            return this.setZoom(newScale, centerX, centerY, false);
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
            
            // (수정) 래퍼의 부모(viewer-container)가 아닌, 래퍼 자체의 크기를 기준으로 계산
            const wrapperRect = this.wrapper.getBoundingClientRect();
            const imageRect = this.image.getBoundingClientRect();

            // (수정) 회전을 고려하여 패닝 제한 계산 (복잡성을 줄이기 위해 AABB (축 정렬 경계 상자) 기반으로 단순화)
            // 이미지가 래퍼보다 클 때만 패닝 제한
            const scaledWidth = imageRect.width;
            const scaledHeight = imageRect.height;

            // 이미지가 래퍼보다 얼마나 튀어나왔는지 (양쪽 합)
            const overscrollX = scaledWidth - wrapperRect.width;
            const overscrollY = scaledHeight - wrapperRect.height;
            
            // 한쪽 방향으로 최대로 움직일 수 있는 거리 (중앙 정렬이므로 / 2)
            const maxX = Math.max(0, overscrollX / 2);
            const maxY = Math.max(0, overscrollY / 2);
            
            // (참고) 이 방식은 회전 시 완벽하지 않을 수 있으나, 대부분의 경우에 잘 작동합니다.
            // 더 정확하려면 OBB(방향성 경계 상자) 계산이 필요합니다.
            
            this.translateX = Math.max(-maxX, Math.min(maxX, this.translateX));
            this.translateY = Math.max(-maxY, Math.min(maxY, this.translateY));
        }
        
        rotate(degrees = 90) {
            this.rotation = (this.rotation + degrees) % 360;
            // (신규) 회전 후 패닝을 다시 제한
            this.constrainPan();
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
            // this.rotation = 0; // 회전은 리셋 시 초기화하지 않음
            this.isDragging = false;
            this.updateTransform(false);
        }
        
        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
        }
    }
    
    window.ZoomController = ZoomController;
    
})(window);

