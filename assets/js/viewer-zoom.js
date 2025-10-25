
(function(window) {
    'use strict';
    
    class ZoomController {
        constructor(imageWrapper, image, options) {
            this.wrapper = imageWrapper;
            this.image = image;
            this.options = Object.assign({
                minScale: 1,
                maxScale: 5,
                scaleStep: 0.5,
                doubleTapScale: 2.5,
                animationDuration: 300
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
                
                const scaleChange = newScale / this.scale;
                this.translateX = centerX - rect.left - (centerX - rect.left - this.translateX) * scaleChange;
                this.translateY = centerY - rect.top - (centerY - rect.top - this.translateY) * scaleChange;
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
            
            this.translateX = this.lastTranslateX + (x - this.dragStartX);
            this.translateY = this.lastTranslateY + (y - this.dragStartY);
            
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
            
            const rect = this.wrapper.getBoundingClientRect();
            const imageRect = this.image.getBoundingClientRect();
            
            const scaledWidth = imageRect.width;
            const scaledHeight = imageRect.height;
            
            const maxTranslateX = Math.max(0, (scaledWidth - rect.width) / 2);
            const maxTranslateY = Math.max(0, (scaledHeight - rect.height) / 2);
            
            this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
            this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
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