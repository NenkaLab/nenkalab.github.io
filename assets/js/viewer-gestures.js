(function(window) {
    'use strict';
    
    class GestureHandler {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks || {};
            
            // 포인터 관리
            this.pointers = new Map();
            this.primaryPointer = null;
            
            // 제스처 상태
            this.lastTapTime = 0;
            this.doubleTapDelay = 300;
            this.moveThreshold = 10;
            
            // 핀치/회전 추적
            this.initialDistance = 0;
            this.currentDistance = 0;
            this.initialAngle = 0;
            this.currentAngle = 0;
            this.isPinching = false;
            this.isRotating = false;
            
            // 드래그 추적
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.hasMoved = false;
            
            // 속도 추적
            this.velocityTracker = [];
            
            // 입력 타입 감지
            this.inputType = null;
            
            this.init();
        }
        
        init() {
            this.element.style.touchAction = 'none';
            this.element.style.userSelect = 'none';
            
            this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
            this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
            this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
            this.element.addEventListener('pointercancel', this.handlePointerCancel.bind(this));
            this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }
        
        detectInputType(e) {
            switch(e.pointerType) {
                case 'mouse': return 'mouse';
                case 'pen': return 'pen';
                case 'touch':
                default: return 'touch';
            }
        }
        
        getDistance(p1, p2) {
            const dx = p2.clientX - p1.clientX;
            const dy = p2.clientY - p1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        getAngle(p1, p2) {
            return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX) * 180 / Math.PI;
        }
        
        getCenter(p1, p2) {
            return {
                x: (p1.clientX + p2.clientX) / 2,
                y: (p1.clientY + p2.clientY) / 2
            };
        }
        
        trackVelocity(x, time) {
            this.velocityTracker.push({ x, time });
            if (this.velocityTracker.length > 10) {
                this.velocityTracker.shift();
            }
        }
        
        getVelocity() {
            if (this.velocityTracker.length < 2) return 0;
            const recent = this.velocityTracker.slice(-5);
            const first = recent[0];
            const last = recent[recent.length - 1];
            const dt = last.time - first.time;
            if (dt === 0) return 0;
            return (last.x - first.x) / dt;
        }
        
        handlePointerDown(e) {
            e.preventDefault();
            this.inputType = this.detectInputType(e);
            
            this.pointers.set(e.pointerId, {
                pointerId: e.pointerId,
                clientX: e.clientX,
                clientY: e.clientY,
                startX: e.clientX,
                startY: e.clientY,
                button: e.button,
                pressure: e.pressure
            });
            
            if (!this.primaryPointer) {
                this.primaryPointer = e.pointerId;
            }
            
            this.hasMoved = false;
            this.velocityTracker = [];
            
            if (this.pointers.size === 2) {
                const pointers = Array.from(this.pointers.values());
                this.initialDistance = this.getDistance(pointers[0], pointers[1]);
                this.currentDistance = this.initialDistance;
                this.initialAngle = this.getAngle(pointers[0], pointers[1]);
                this.currentAngle = this.initialAngle;
                this.isPinching = true;
                
                const center = this.getCenter(pointers[0], pointers[1]);
                if (this.callbacks.onPinchStart) {
                    this.callbacks.onPinchStart(center);
                }
            } else if (this.pointers.size === 1) {
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.trackVelocity(e.clientX, Date.now());
                
                const now = Date.now();
                if (now - this.lastTapTime < this.doubleTapDelay) {
                    if (this.callbacks.onDoubleTap) {
                        this.callbacks.onDoubleTap({
                            x: e.clientX,
                            y: e.clientY,
                            inputType: this.inputType
                        });
                    }
                    this.lastTapTime = 0;
                } else {
                    this.lastTapTime = now;
                }
            }
        }
        
        handlePointerMove(e) {
            e.preventDefault();
            if (!this.pointers.has(e.pointerId)) return;
            
            const oldPointer = this.pointers.get(e.pointerId);
            this.pointers.set(e.pointerId, {
                ...oldPointer,
                clientX: e.clientX,
                clientY: e.clientY,
                pressure: e.pressure
            });
            
            const moveDistance = Math.sqrt(
                Math.pow(e.clientX - oldPointer.startX, 2) + 
                Math.pow(e.clientY - oldPointer.startY, 2)
            );
            
            if (moveDistance > this.moveThreshold) {
                this.hasMoved = true;
            }
            
            if (this.isPinching && this.pointers.size === 2) {
                const pointers = Array.from(this.pointers.values());
                this.currentDistance = this.getDistance(pointers[0], pointers[1]);
                this.currentAngle = this.getAngle(pointers[0], pointers[1]);
                
                const scale = this.currentDistance / this.initialDistance;
                const rotation = this.currentAngle - this.initialAngle;
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.inputType === 'touch') {
                    if (this.callbacks.onPinch) {
                        this.callbacks.onPinch({
                            scale: scale,
                            rotation: rotation,
                            center: center,
                            distance: this.currentDistance,
                            inputType: this.inputType
                        });
                    }
                } else if (this.inputType === 'pen') {
                    const hasButton = Array.from(this.pointers.values()).some(p => p.button === 5 || p.button === 2);
                    if (hasButton && this.callbacks.onRotate) {
                        this.callbacks.onRotate(rotation, center);
                    } else if (this.callbacks.onPinch) {
                        this.callbacks.onPinch({
                            scale: scale,
                            rotation: 0,
                            center: center,
                            distance: this.currentDistance,
                            inputType: this.inputType
                        });
                    }
                }
            } else if (this.pointers.size === 1 && !this.isPinching) {
                const deltaX = e.clientX - this.dragStartX;
                const deltaY = e.clientY - this.dragStartY;
                
                this.trackVelocity(e.clientX, Date.now());
                
                if (!this.isDragging && this.hasMoved) {
                    this.isDragging = true;
                    if (this.callbacks.onDragStart) {
                        this.callbacks.onDragStart({
                            x: e.clientX,
                            y: e.clientY,
                            inputType: this.inputType
                        });
                    }
                }
                
                if (this.isDragging && this.callbacks.onDrag) {
                    this.callbacks.onDrag({
                        x: e.clientX,
                        y: e.clientY,
                        deltaX: deltaX,
                        deltaY: deltaY,
                        inputType: this.inputType
                    });
                }
            }
        }
        
        handlePointerUp(e) {
            e.preventDefault();
            if (!this.pointers.has(e.pointerId)) return;
            
            if (this.isDragging && this.pointers.size === 1) {
                const velocity = this.getVelocity();
                const deltaX = e.clientX - this.dragStartX;
                
                if (this.callbacks.onDragEnd) {
                    this.callbacks.onDragEnd({
                        deltaX: deltaX,
                        velocity: velocity,
                        inputType: this.inputType
                    });
                }
            }
            
            if (this.isPinching && this.pointers.size === 2) {
                if (this.callbacks.onPinchEnd) {
                    this.callbacks.onPinchEnd();
                }
            }
            
            this.pointers.delete(e.pointerId);
            
            if (e.pointerId === this.primaryPointer) {
                this.primaryPointer = this.pointers.size > 0 ? 
                    Array.from(this.pointers.keys())[0] : null;
            }
            
            if (this.pointers.size < 2) {
                this.isPinching = false;
                this.isRotating = false;
            }
            
            if (this.pointers.size === 0) {
                this.isDragging = false;
                this.hasMoved = false;
                this.velocityTracker = [];
            }
        }
        
        handlePointerCancel(e) {
            this.handlePointerUp(e);
        }
        
        handleWheel(e) {
            e.preventDefault();
            
            if (e.ctrlKey || e.metaKey) {
                const delta = -e.deltaY;
                const rotation = delta * 0.5;
                
                if (this.callbacks.onRotate) {
                    this.callbacks.onRotate(rotation, {
                        x: e.clientX,
                        y: e.clientY
                    });
                }
            } else {
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
            this.primaryPointer = null;
            this.isPinching = false;
            this.isRotating = false;
            this.isDragging = false;
            this.hasMoved = false;
            this.velocityTracker = [];
        }
        
        destroy() {
            this.reset();
            this.element.style.touchAction = '';
            this.element.style.userSelect = '';
        }
    }
    
    window.GestureHandler = GestureHandler;
    
})(window);