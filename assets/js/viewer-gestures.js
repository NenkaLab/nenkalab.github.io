(function(window) {
    'use strict';
    
    class GestureHandler {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks || {};
            
            this.pointers = new Map();
            this.pointerType = null;
            this.isZooming = false;
            this.isRotating = false;
            this.isDragging = false;
            this.lastTap = 0;
            this.doubleTapDelay = 300;
            
            this.startDistance = 0;
            this.currentDistance = 0;
            this.lastDistance = 0;
            
            this.startAngle = 0;
            this.currentAngle = 0;
            this.lastAngle = 0;
            
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.lastDragX = 0;
            this.lastDragY = 0;
            
            this.velocityTracker = [];
            this.dragThreshold = 10;
            this.rotationThreshold = 5;
            this.isPenButtonPressed = false;
            
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
            this.element.addEventListener('dblclick', this.handleDoubleClick.bind(this));
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
        
        normalizeAngle(angle) {
            while (angle > 180) angle -= 360;
            while (angle < -180) angle += 360;
            return angle;
        }
        
        handlePointerDown(e) {
            this.pointerType = e.pointerType;
            this.isPenButtonPressed = e.buttons === 32;
            
            this.pointers.set(e.pointerId, {
                id: e.pointerId,
                clientX: e.clientX,
                clientY: e.clientY,
                startX: e.clientX,
                startY: e.clientY,
                type: e.pointerType
            });
            
            this.velocityTracker = [];
            
            if (this.pointers.size === 2 && this.pointerType === 'touch') {
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                
                this.startDistance = this.getDistance(pointers[0], pointers[1]);
                this.lastDistance = this.startDistance;
                this.currentDistance = this.startDistance;
                
                this.startAngle = this.getAngle(pointers[0], pointers[1]);
                this.lastAngle = this.startAngle;
                this.currentAngle = this.startAngle;
                
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinchStart) {
                    this.callbacks.onPinchStart(center);
                }
            } else if (this.pointers.size === 1) {
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.lastDragX = e.clientX;
                this.lastDragY = e.clientY;
                
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
                ...oldPointer,
                clientX: e.clientX,
                clientY: e.clientY
            });
            
            const now = Date.now();
            this.velocityTracker.push({
                x: e.clientX,
                y: e.clientY,
                time: now
            });
            if (this.velocityTracker.length > 10) {
                this.velocityTracker.shift();
            }
            
            if (this.pointers.size === 2 && this.pointerType === 'touch') {
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                
                this.currentDistance = this.getDistance(pointers[0], pointers[1]);
                const scale = this.currentDistance / this.lastDistance;
                
                this.currentAngle = this.getAngle(pointers[0], pointers[1]);
                let angleDelta = this.normalizeAngle(this.currentAngle - this.lastAngle);
                
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinch && Math.abs(scale - 1) > 0.001) {
                    this.callbacks.onPinch({
                        scale: scale,
                        center: center,
                        distance: this.currentDistance,
                        startDistance: this.startDistance
                    });
                }
                
                if (this.callbacks.onRotate && Math.abs(angleDelta) > 0.1) {
                    this.callbacks.onRotate({
                        angle: angleDelta,
                        totalAngle: this.normalizeAngle(this.currentAngle - this.startAngle),
                        center: center
                    });
                }
                
                this.lastDistance = this.currentDistance;
                this.lastAngle = this.currentAngle;
                
                this.isZooming = true;
                this.isRotating = true;
            } else if (this.pointers.size === 1 && this.pointerType === 'pen') {
                const pointer = this.pointers.get(e.pointerId);
                const dx = e.clientX - pointer.startX;
                const dy = e.clientY - pointer.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (this.isPenButtonPressed && distance > this.dragThreshold) {
                    e.preventDefault();
                    
                    if (!this.isRotating && this.callbacks.onPenRotateStart) {
                        this.callbacks.onPenRotateStart({ x: e.clientX, y: e.clientY });
                        this.isRotating = true;
                    }
                    
                    if (this.callbacks.onPenRotate) {
                        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                        this.callbacks.onPenRotate({
                            angle: angle,
                            center: { x: e.clientX, y: e.clientY }
                        });
                    }
                } else if (!this.isPenButtonPressed && distance > this.dragThreshold) {
                    if (!this.isDragging) {
                        const canDrag = this.callbacks.onDragStart ? 
                            this.callbacks.onDragStart({ x: e.clientX, y: e.clientY }) : 
                            false;
                        
                        if (canDrag) {
                            this.isDragging = true;
                        } else {
                            if (this.callbacks.onPenZoom) {
                                const centerX = this.element.getBoundingClientRect().left + this.element.getBoundingClientRect().width / 2;
                                const centerY = this.element.getBoundingClientRect().top + this.element.getBoundingClientRect().height / 2;
                                const scale = 1 + dy * 0.01;
                                
                                this.callbacks.onPenZoom({
                                    scale: scale,
                                    center: { x: centerX, y: centerY }
                                });
                            }
                        }
                    }
                    
                    if (this.isDragging && this.callbacks.onDrag) {
                        this.callbacks.onDrag({
                            x: e.clientX,
                            y: e.clientY,
                            deltaX: e.clientX - this.lastDragX,
                            deltaY: e.clientY - this.lastDragY
                        });
                    }
                    
                    this.lastDragX = e.clientX;
                    this.lastDragY = e.clientY;
                }
            } else if (this.pointers.size === 1) {
                const pointer = this.pointers.get(e.pointerId);
                const dx = e.clientX - pointer.startX;
                const dy = e.clientY - pointer.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > this.dragThreshold && !this.isDragging) {
                    const canDrag = this.callbacks.onDragStart ? 
                        this.callbacks.onDragStart({ x: e.clientX, y: e.clientY }) : 
                        false;
                    
                    this.isDragging = canDrag;
                }
                
                if (this.isDragging && this.callbacks.onDrag) {
                    const shouldPrevent = this.callbacks.onDrag({
                        x: e.clientX,
                        y: e.clientY,
                        deltaX: e.clientX - this.lastDragX,
                        deltaY: e.clientY - this.lastDragY,
                        totalDeltaX: e.clientX - this.dragStartX,
                        totalDeltaY: e.clientY - this.dragStartY
                    });
                    
                    if (shouldPrevent) {
                        e.preventDefault();
                    }
                }
                
                this.lastDragX = e.clientX;
                this.lastDragY = e.clientY;
            }
        }
        
        handlePointerUp(e) {
            const pointer = this.pointers.get(e.pointerId);
            if (!pointer) return;
            
            if (this.pointers.size === 2) {
                if (this.callbacks.onPinchEnd) {
                    this.callbacks.onPinchEnd();
                }
            } else if (this.pointers.size === 1) {
                if (this.isDragging) {
                    const velocity = this.getVelocity();
                    
                    if (this.callbacks.onDragEnd) {
                        this.callbacks.onDragEnd({
                            velocityX: velocity.x,
                            velocityY: velocity.y,
                            totalDeltaX: e.clientX - this.dragStartX,
                            totalDeltaY: e.clientY - this.dragStartY
                        });
                    }
                }
                
                if (this.isRotating && this.callbacks.onPenRotateEnd) {
                    this.callbacks.onPenRotateEnd();
                }
            }
            
            this.pointers.delete(e.pointerId);
            this.isDragging = false;
            this.isZooming = false;
            this.isRotating = false;
            this.isPenButtonPressed = false;
            this.velocityTracker = [];
        }
        
        handlePointerCancel(e) {
            this.handlePointerUp(e);
        }
        
        handleWheel(e) {
            e.preventDefault();
            
            if (e.ctrlKey || e.metaKey) {
                if (this.callbacks.onWheelRotate) {
                    const delta = -e.deltaY;
                    const angleDelta = delta * 0.5;
                    
                    this.callbacks.onWheelRotate({
                        angle: angleDelta,
                        center: { x: e.clientX, y: e.clientY }
                    });
                }
            } else {
                if (this.callbacks.onWheel) {
                    const delta = -e.deltaY;
                    const scale = delta > 0 ? 1.1 : 0.9;
                    
                    this.callbacks.onWheel({
                        scale: scale,
                        center: { x: e.clientX, y: e.clientY }
                    });
                }
            }
        }
        
        handleDoubleClick(e) {
            // pointerdown에서 이미 처리됨
        }
        
        getVelocity() {
            if (this.velocityTracker.length < 2) return { x: 0, y: 0 };
            
            const recent = this.velocityTracker.slice(-5);
            const first = recent[0];
            const last = recent[recent.length - 1];
            
            const dt = last.time - first.time;
            if (dt === 0) return { x: 0, y: 0 };
            
            return {
                x: (last.x - first.x) / dt,
                y: (last.y - first.y) / dt
            };
        }
        
        reset() {
            this.pointers.clear();
            this.isDragging = false;
            this.isZooming = false;
            this.isRotating = false;
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