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
            this.dragStartTranslateX = 0;
            this.dragStartTranslateY = 0;
            
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
            
            if (centerX !== undefined && centerY !== undefined && this.scale !== this.options.minScale) {
                const rect = this.wrapper.getBoundingClientRect();
                
                const rad = -this.rotation * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                
                const rotatedOffsetX = offsetX * cos - offsetY * sin;
                const rotatedOffsetY = offsetX * sin + offsetY * cos;
                
                const scaleRatio = newScale / this.scale;
                
                this.translateX = rotatedOffsetX - (rotatedOffsetX - this.translateX) * scaleRatio;
                this.translateY = rotatedOffsetY - (rotatedOffsetY - this.translateY) * scaleRatio;
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
        
        startPinch(distance, center) {
            this.isPinching = true;
            this.pinchStartScale = this.scale;
            this.pinchStartDistance = distance;
        }
        
        pinchZoom(data) {
            if (!this.isPinching) {
                this.startPinch(data.startDistance, data.center);
            }
            
            const scaleRatio = data.distance / this.pinchStartDistance;
            const newScale = this.pinchStartScale * scaleRatio;
            
            const clampedScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            const rect = this.wrapper.getBoundingClientRect();
            
            const rad = -this.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const offsetX = data.center.x - rect.left - rect.width / 2;
            const offsetY = data.center.y - rect.top - rect.height / 2;
            
            const rotatedOffsetX = offsetX * cos - offsetY * sin;
            const rotatedOffsetY = offsetX * sin + offsetY * cos;
            
            const currentScaleRatio = clampedScale / this.scale;
            
            this.translateX = rotatedOffsetX - (rotatedOffsetX - this.translateX) * currentScaleRatio;
            this.translateY = rotatedOffsetY - (rotatedOffsetY - this.translateY) * currentScaleRatio;
            
            this.scale = clampedScale;
            
            this.constrainPan();
            this.updateTransform(false);
            
            return this.scale;
        }
        
        endPinch() {
            this.isPinching = false;
        }
        
        rotate(angleDelta, animate = false) {
            this.rotation += angleDelta;
            this.rotation = this.rotation % 360;
            this.updateTransform(animate);
        }
        
        setRotation(angle, animate = false) {
            this.rotation = angle % 360;
            this.updateTransform(animate);
        }
        
        zoomIn(centerX, centerY) {
            return this.setZoom(this.scale + this.options.scaleStep, centerX, centerY, true);
        }
        
        zoomOut(centerX, centerY) {
            return this.setZoom(this.scale - this.options.scaleStep, centerX, centerY, true);
        }
        
        resetZoom(animate = true) {
            this.scale = this.options.minScale;
            this.translateX = 0;
            this.translateY = 0;
            this.updateTransform(animate);
            return this.scale;
        }
        
        resetRotation(animate = true) {
            this.rotation = 0;
            this.updateTransform(animate);
        }
        
        reset(animate = false) {
            this.scale = this.options.minScale;
            this.translateX = 0;
            this.translateY = 0;
            this.rotation = 0;
            this.isPinching = false;
            this.isDragging = false;
            this.updateTransform(animate);
        }
        
        toggleZoom(centerX, centerY) {
            if (this.scale > this.options.minScale) {
                return this.resetZoom(true);
            } else {
                return this.setZoom(this.options.doubleTapScale, centerX, centerY, true);
            }
        }
        
        startDrag(x, y) {
            if (this.scale <= this.options.minScale) return false;
            
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
            this.dragStartTranslateX = this.translateX;
            this.dragStartTranslateY = this.translateY;
            
            return true;
        }
        
        drag(deltaX, deltaY) {
            if (!this.isDragging || this.scale <= this.options.minScale) return false;
            
            this.translateX = this.dragStartTranslateX + deltaX;
            this.translateY = this.dragStartTranslateY + deltaY;
            
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
            
            const rad = Math.abs(this.rotation * Math.PI / 180);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const rotatedWidth = displayWidth * cos + displayHeight * sin;
            const rotatedHeight = displayWidth * sin + displayHeight * cos;
            
            const scaledWidth = rotatedWidth * this.scale;
            const scaledHeight = rotatedHeight * this.scale;
            
            const maxX = Math.max(0, (scaledWidth - wrapperRect.width) / 2);
            const maxY = Math.max(0, (scaledHeight - wrapperRect.height) / 2);
            
            this.translateX = Math.max(-maxX, Math.min(maxX, this.translateX));
            this.translateY = Math.max(-maxY, Math.min(maxY, this.translateY));
        }
        
        getState() {
            return {
                scale: this.scale,
                translateX: this.translateX,
                translateY: this.translateY,
                rotation: this.rotation,
                isZoomed: this.scale > this.options.minScale,
                isDragging: this.isDragging,
                isPinching: this.isPinching
            };
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