(function(window) {
    'use strict';
    
    class ZoomController {
        constructor(imageWrapper, image, options) {
            this.wrapper = imageWrapper;
            this.image = image;
            this.options = Object.assign({
                minScale: 1,
                maxScale: 50,
                scaleStep: 0.2,
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
            
            this.isPinching = false;
            this.pinchStartScale = 1;
            this.pinchStartDistance = 0;
            
            this.animationFrame = null;
            
            this.updateTransform();
        }
        
        updateTransform(animate = false) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            
            this.animationFrame = requestAnimationFrame(() => {
                if (animate) {
                    this.wrapper.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                } else {
                    this.wrapper.style.transition = 'none';
                }
                
                const transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale}) rotate(${this.rotation}deg)`;
                this.wrapper.style.transform = transform;
                this.wrapper.style.willChange = 'transform';
            });
        }
        
        setZoom(newScale, centerX, centerY, animate = true) {
            newScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            if (centerX !== undefined && centerY !== undefined) {
                const rect = this.wrapper.getBoundingClientRect();
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                const scaleRatio = newScale / this.scale;
                
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
        
        startPinchZoom(distance, center) {
            this.isPinching = true;
            this.pinchStartScale = this.scale;
            this.pinchStartDistance = distance;
        }
        
        pinchZoom(distance, center) {
            if (!this.isPinching || this.pinchStartDistance === 0) return this.scale;
            
            const scaleRatio = distance / this.pinchStartDistance;
            const newScale = this.pinchStartScale * scaleRatio;
            const clampedScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            const rect = this.wrapper.getBoundingClientRect();
            const offsetX = center.x - rect.left - rect.width / 2;
            const offsetY = center.y - rect.top - rect.height / 2;
            
            const scaleChange = clampedScale / this.scale;
            this.translateX = offsetX - (offsetX - this.translateX) * scaleChange;
            this.translateY = offsetY - (offsetY - this.translateY) * scaleChange;
            
            this.scale = clampedScale;
            this.constrainPan();
            this.updateTransform(false);
            
            return this.scale;
        }
        
        endPinchZoom() {
            this.isPinching = false;
            this.pinchStartScale = this.scale;
            this.pinchStartDistance = 0;
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
            
            const imageAspect = imageNaturalWidth / imageNaturalHeight;
            const containerAspect = wrapperRect.width / wrapperRect.height;
            
            let displayWidth, displayHeight;
            if (imageAspect > containerAspect) {
                displayWidth = Math.min(wrapperRect.width, imageNaturalWidth);
                displayHeight = displayWidth / imageAspect;
            } else {
                displayHeight = Math.min(wrapperRect.height, imageNaturalHeight);
                displayWidth = displayHeight * imageAspect;
            }
            
            const scaledWidth = displayWidth * this.scale;
            const scaledHeight = displayHeight * this.scale;
            
            const maxX = Math.max(0, (scaledWidth - wrapperRect.width) / 2);
            const maxY = Math.max(0, (scaledHeight - wrapperRect.height) / 2);
            
            this.translateX = Math.max(-maxX, Math.min(maxX, this.translateX));
            this.translateY = Math.max(-maxY, Math.min(maxY, this.translateY));
        }
        
        rotate(degrees) {
            this.rotation = (this.rotation + degrees) % 360;
            this.updateTransform(true);
        }
        
        setRotation(degrees) {
            this.rotation = degrees % 360;
            this.updateTransform(false);
        }
        
        resetRotation(animate = true) {
            this.rotation = 0;
            this.updateTransform(animate);
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
        
        reset(keepRotation = false) {
            this.scale = this.options.minScale;
            this.translateX = 0;
            this.translateY = 0;
            if (!keepRotation) {
                this.rotation = 0;
            }
            this.isDragging = false;
            this.isPinching = false;
            this.updateTransform(false);
        }
        
        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            this.wrapper.style.willChange = '';
            this.wrapper.style.transition = '';
            this.wrapper.style.transform = '';
        }
    }
    
    window.ZoomController = ZoomController;
    
})(window);