(function(window) {
    'use strict';
    
    class GestureHandler {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks || {};
            
            this.pointers = new Map();
            this.lastTap = 0;
            this.startDistance = 0;
            this.lastScale = 1;
            this.isPinching = false;
            this.isDragging = false;
            this.isSliding = false;
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeThreshold = 50;
            this.dragThreshold = 10;
            this.doubleTapDelay = 300;
            this.hasMoved = false;
            this.slideStartX = 0;
            this.slideDirection = null;
            this.velocityTracker = [];
            this.lastMoveTime = 0;
            
            this.init();
        }
        
        init() {
            this.element.style.touchAction = 'none';
            this.element.style.userSelect = 'none';
            this.element.style.webkitUserSelect = 'none';
            
            this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
            this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
            this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
            this.element.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
            
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
        
        getVelocity() {
            if (this.velocityTracker.length < 2) return 0;
            
            const recent = this.velocityTracker.slice(-5);
            const first = recent[0];
            const last = recent[recent.length - 1];
            
            const dt = last.time - first.time;
            if (dt === 0) return 0;
            
            const dx = last.x - first.x;
            return dx / dt;
        }
        
        handlePointerDown(e) {
            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY
            });
            
            this.hasMoved = false;
            this.velocityTracker = [];
            
            if (this.pointers.size === 2) {
                // 핀치 줌 시작
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                this.isPinching = true;
                this.isDragging = false;
                this.isSliding = false;
                this.startDistance = this.getDistance(pointers[0], pointers[1]);
                this.lastScale = 1;
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinchStart) {
                    this.callbacks.onPinchStart(center);
                }
            } else if (this.pointers.size === 1) {
                this.swipeStartX = e.clientX;
                this.swipeStartY = e.clientY;
                this.slideStartX = e.clientX;
                this.lastMoveTime = Date.now();
                
                // 더블탭 감지
                const now = Date.now();
                if (now - this.lastTap < this.doubleTapDelay) {
                    e.preventDefault();
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
            
            const oldPointer = this.pointers.get(e.pointerId);
            
            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId,
                startX: oldPointer.startX,
                startY: oldPointer.startY
            });
            
            const moveDistance = Math.sqrt(
                Math.pow(e.clientX - oldPointer.startX, 2) + 
                Math.pow(e.clientY - oldPointer.startY, 2)
            );
            
            if (moveDistance > this.dragThreshold) {
                this.hasMoved = true;
            }
            
            // 속도 추적
            const now = Date.now();
            this.velocityTracker.push({
                x: e.clientX,
                time: now
            });
            if (this.velocityTracker.length > 10) {
                this.velocityTracker.shift();
            }
            
            if (this.isPinching && this.pointers.size === 2) {
                // 핀치 줌
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                const currentDistance = this.getDistance(pointers[0], pointers[1]);
                const scale = currentDistance / this.startDistance;
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinch) {
                    this.callbacks.onPinch(scale, center, this.lastScale);
                }
                
                this.lastScale = scale;
            } else if (this.pointers.size === 1 && !this.isPinching) {
                const deltaX = e.clientX - this.swipeStartX;
                const deltaY = e.clientY - this.swipeStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > this.dragThreshold && !this.isDragging && !this.isSliding) {
                    // 드래그 또는 슬라이드 시작
                    if (this.callbacks.onDragStart) {
                        const canDrag = this.callbacks.onDragStart({
                            x: e.clientX,
                            y: e.clientY
                        });
                        
                        if (canDrag) {
                            this.isDragging = true;
                        } else {
                            // 줌이 안되어있으면 슬라이드
                            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                                this.isSliding = true;
                                this.slideDirection = deltaX > 0 ? 'right' : 'left';
                            }
                        }
                    }
                }
                
                if (this.isDragging) {
                    // 드래그
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
                } else if (this.isSliding) {
                    // 슬라이드
                    e.preventDefault();
                    if (this.callbacks.onSlide) {
                        this.callbacks.onSlide({
                            deltaX: e.clientX - this.slideStartX,
                            direction: this.slideDirection
                        });
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
                if (this.isSliding) {
                    // 슬라이드 종료
                    const velocity = this.getVelocity();
                    const deltaX = e.clientX - this.slideStartX;
                    
                    if (this.callbacks.onSlideEnd) {
                        this.callbacks.onSlideEnd({
                            deltaX: deltaX,
                            velocity: velocity,
                            direction: this.slideDirection
                        });
                    }
                } else if (this.isDragging) {
                    // 드래그 종료
                    if (this.callbacks.onDragEnd) {
                        this.callbacks.onDragEnd();
                    }
                }
            }
            
            this.pointers.delete(e.pointerId);
            this.isDragging = false;
            this.isSliding = false;
            this.slideDirection = null;
            this.hasMoved = false;
            this.velocityTracker = [];
            
            if (this.pointers.size < 2) {
                this.isPinching = false;
            }
        }
        
        handlePointerCancel(e) {
            this.handlePointerUp(e);
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
        
        reset() {
            this.pointers.clear();
            this.isPinching = false;
            this.isDragging = false;
            this.isSliding = false;
            this.hasMoved = false;
            this.velocityTracker = [];
        }
        
        destroy() {
            this.reset();
        }
    }
    
    window.GestureHandler = GestureHandler;
    
})(window);