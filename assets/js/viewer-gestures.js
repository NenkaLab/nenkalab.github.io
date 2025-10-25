
(function(window) {
    'use strict';
    
    class GestureHandler {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks || {};
            
            
            this.touches = [];
            this.lastTap = 0;
            this.startDistance = 0;
            this.startScale = 1;
            this.isPinching = false;
            this.isSwiping = false;
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeThreshold = 50;
            this.doubleTapDelay = 300;
            
            this.init();
        }
        
        init() {
            
            this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
            
            
            this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.element.addEventListener('mouseleave', this.handleMouseUp.bind(this));
            
            
            this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }
        
        
        getDistance(touch1, touch2) {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        
        getCenter(touch1, touch2) {
            return {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        }
        
        handleTouchStart(e) {
            this.touches = Array.from(e.touches);
            
            if (this.touches.length === 2) {
                
                e.preventDefault();
                this.isPinching = true;
                this.startDistance = this.getDistance(this.touches[0], this.touches[1]);
                const center = this.getCenter(this.touches[0], this.touches[1]);
                
                if (this.callbacks.onPinchStart) {
                    this.callbacks.onPinchStart(center);
                }
            } else if (this.touches.length === 1) {
                
                this.swipeStartX = this.touches[0].clientX;
                this.swipeStartY = this.touches[0].clientY;
                
                if (this.callbacks.onDragStart) {
                    this.callbacks.onDragStart({
                        x: this.swipeStartX,
                        y: this.swipeStartY
                    });
                }
            }
        }
        
        handleTouchMove(e) {
            if (this.touches.length === 0) return;
            
            this.touches = Array.from(e.touches);
            
            if (this.isPinching && this.touches.length === 2) {
                e.preventDefault();
                const currentDistance = this.getDistance(this.touches[0], this.touches[1]);
                const scale = currentDistance / this.startDistance;
                const center = this.getCenter(this.touches[0], this.touches[1]);
                
                if (this.callbacks.onPinch) {
                    this.callbacks.onPinch(scale, center);
                }
            } else if (this.touches.length === 1) {
                const deltaX = this.touches[0].clientX - this.swipeStartX;
                const deltaY = this.touches[0].clientY - this.swipeStartY;
                
                if (this.callbacks.onDrag) {
                    this.callbacks.onDrag({
                        x: this.touches[0].clientX,
                        y: this.touches[0].clientY,
                        deltaX: deltaX,
                        deltaY: deltaY
                    });
                }
                
                
                if (Math.abs(deltaX) > this.swipeThreshold || Math.abs(deltaY) > this.swipeThreshold) {
                    this.isSwiping = true;
                }
            }
        }
        
        handleTouchEnd(e) {
            if (this.isPinching) {
                this.isPinching = false;
                if (this.callbacks.onPinchEnd) {
                    this.callbacks.onPinchEnd();
                }
            } else if (this.touches.length === 1) {
                const deltaX = this.touches[0].clientX - this.swipeStartX;
                const deltaY = this.touches[0].clientY - this.swipeStartY;
                
                
                const now = Date.now();
                if (now - this.lastTap < this.doubleTapDelay && !this.isSwiping) {
                    if (this.callbacks.onDoubleTap) {
                        this.callbacks.onDoubleTap({
                            x: this.touches[0].clientX,
                            y: this.touches[0].clientY
                        });
                    }
                    this.lastTap = 0;
                } else {
                    this.lastTap = now;
                }
                
                
                if (this.isSwiping) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        
                        if (deltaX > this.swipeThreshold && this.callbacks.onSwipeRight) {
                            this.callbacks.onSwipeRight();
                        } else if (deltaX < -this.swipeThreshold && this.callbacks.onSwipeLeft) {
                            this.callbacks.onSwipeLeft();
                        }
                    }
                }
                
                if (this.callbacks.onDragEnd) {
                    this.callbacks.onDragEnd();
                }
            }
            
            this.touches = Array.from(e.touches);
            this.isSwiping = false;
        }
        
        
        handleMouseDown(e) {
            if (e.button !== 0) return; 
            
            this.isMouseDown = true;
            this.mouseStartX = e.clientX;
            this.mouseStartY = e.clientY;
            
            if (this.callbacks.onDragStart) {
                this.callbacks.onDragStart({
                    x: e.clientX,
                    y: e.clientY
                });
            }
            
            
            const now = Date.now();
            if (now - this.lastTap < this.doubleTapDelay) {
                if (this.callbacks.onDoubleTap) {
                    this.callbacks.onDoubleTap({
                        x: e.clientX,
                        y: e.clientY
                    });
                }
                this.lastTap = 0;
            } else {
                this.lastTap = now;
            }
        }
        
        handleMouseMove(e) {
            if (!this.isMouseDown) return;
            
            const deltaX = e.clientX - this.mouseStartX;
            const deltaY = e.clientY - this.mouseStartY;
            
            if (this.callbacks.onDrag) {
                this.callbacks.onDrag({
                    x: e.clientX,
                    y: e.clientY,
                    deltaX: deltaX,
                    deltaY: deltaY
                });
            }
        }
        
        handleMouseUp(e) {
            this.isMouseDown = false;
            
            if (this.callbacks.onDragEnd) {
                this.callbacks.onDragEnd();
            }
        }
        
        handleWheel(e) {
            if (e.ctrlKey || e.metaKey) {
                
                e.preventDefault();
                
                const delta = -e.deltaY;
                const scale = delta > 0 ? 1.1 : 0.9;
                
                if (this.callbacks.onWheel) {
                    this.callbacks.onWheel(scale, {
                        x: e.clientX,
                        y: e.clientY
                    });
                }
            }
        }
        
        destroy() {
            
        }
    }
    
    
    window.GestureHandler = GestureHandler;
    
})(window);