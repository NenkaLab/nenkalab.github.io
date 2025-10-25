(function(window) {
    'use strict';
    
    class GestureHandler {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks || {};
            
            this.pointers = new Map();
            this.lastTap = 0;
            this.startDistance = 0;
            this.isPinching = false;
            this.isDragging = false;
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeThreshold = 50;
            this.dragThreshold = 5;
            this.doubleTapDelay = 300;
            this.hasMoved = false;
            
            this.init();
        }
        
        init() {
            this.element.style.touchAction = 'none';
            
            this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
            this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
            this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
            this.element.addEventListener('pointercancel', this.handlePointerUp.bind(this));
            
            this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }
        
        getDistance(pointer1, pointer2) {
            const dx = pointer2.clientX - pointer1.clientX;
            const dy = pointer2.clientY - pointer1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        getCenter(pointer1, pointer2) {
            return {
                x: (pointer1.clientX + pointer2.clientX) / 2,
                y: (pointer1.clientY + pointer2.clientY) / 2
            };
        }
        
        handlePointerDown(e) {
            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId
            });
            
            this.hasMoved = false;
            
            if (this.pointers.size === 2) {
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                this.isPinching = true;
                this.isDragging = false;
                this.startDistance = this.getDistance(pointers[0], pointers[1]);
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinchStart) {
                    this.callbacks.onPinchStart(center);
                }
            } else if (this.pointers.size === 1) {
                this.swipeStartX = e.clientX;
                this.swipeStartY = e.clientY;
                
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
        }
        
        handlePointerMove(e) {
            if (!this.pointers.has(e.pointerId)) return;
            
            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId
            });
            
            this.hasMoved = true;
            
            if (this.isPinching && this.pointers.size === 2) {
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                const currentDistance = this.getDistance(pointers[0], pointers[1]);
                const scale = currentDistance / this.startDistance;
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinch) {
                    this.callbacks.onPinch(scale, center);
                }
            } else if (this.pointers.size === 1 && !this.isPinching) {
                const deltaX = e.clientX - this.swipeStartX;
                const deltaY = e.clientY - this.swipeStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > this.dragThreshold) {
                    this.isDragging = true;
                }
                
                if (this.callbacks.onDrag) {
                    const shouldPrevent = this.callbacks.onDrag({
                        x: e.clientX,
                        y: e.clientY,
                        deltaX: deltaX,
                        deltaY: deltaY
                    });
                    
                    if (shouldPrevent) {
                        e.preventDefault();
                    }
                }
            }
        }
        
        handlePointerUp(e) {
            const pointer = this.pointers.get(e.pointerId);
            
            if (!pointer) return;
            
            if (this.isPinching && this.pointers.size === 2) {
                this.isPinching = false;
                if (this.callbacks.onPinchEnd) {
                    this.callbacks.onPinchEnd();
                }
            } else if (this.pointers.size === 1 && !this.isPinching) {
                const deltaX = e.clientX - this.swipeStartX;
                const deltaY = e.clientY - this.swipeStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (this.isDragging && distance > this.dragThreshold) {
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
                        if (deltaX > 0 && this.callbacks.onSwipeRight) {
                            this.callbacks.onSwipeRight();
                        } else if (deltaX < 0 && this.callbacks.onSwipeLeft) {
                            this.callbacks.onSwipeLeft();
                        }
                    }
                }
                
                if (this.callbacks.onDragEnd) {
                    this.callbacks.onDragEnd();
                }
            }
            
            this.pointers.delete(e.pointerId);
            this.isDragging = false;
            this.hasMoved = false;
            
            if (this.pointers.size < 2) {
                this.isPinching = false;
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
            this.pointers.clear();
        }
    }
    
    window.GestureHandler = GestureHandler;
    
})(window);