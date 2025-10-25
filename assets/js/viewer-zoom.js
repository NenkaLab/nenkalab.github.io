(function(window) {
    'use strict';
    
    class ZoomController {
        constructor(imageWrapper, image, options) {
            this.wrapper = imageWrapper;
            this.image = image;
            this.options = Object.assign({
                minScale: 1,
                maxScale: 10,
                scaleStep: 0.5,
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
                    setTimeout(() => {
                        this.wrapper.classList.add('zooming');
                    }, this.options.animationDuration);
                }
            });
        }
        
        setZoom(newScale, centerX, centerY, animate = true) {
            newScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            if (centerX !== undefined && centerY !== undefined && this.scale !== this.options.minScale) {
                const rect = this.wrapper.getBoundingClientRect();
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                
                const scaleRatio = newScale / this.scale;
                
                this.translateX = offsetX - (offsetX - this.translateX) * scaleRatio;
                this.translateY = offsetY - (offsetY - this.translateY) * scaleRatio;
            }
            
            this.scale = newScale;
            
            if (this.scale === this.options.minScale) {
                this.translateX = 0;
                this.translateY = 0;
                this.rotation = 0;
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
            this.rotation = 0;
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
            
            const wrapperRect = this.wrapper.parentElement.getBoundingClientRect();
            const imageNaturalWidth = this.image.naturalWidth || this.image.width;
            const imageNaturalHeight = this.image.naturalHeight || this.image.height;
            
            const displayWidth = Math.min(wrapperRect.width, imageNaturalWidth);
            const displayHeight = Math.min(wrapperRect.height, imageNaturalHeight);
            
            const scaledWidth = displayWidth * this.scale;
            const scaledHeight = displayHeight * this.scale;
            
            const maxX = Math.max(0, (scaledWidth - wrapperRect.width) / 2);
            const maxY = Math.max(0, (scaledHeight - wrapperRect.height) / 2);
            
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
            this.rotation = 0;
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