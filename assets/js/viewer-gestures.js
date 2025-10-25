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
            this.dragHandled = false; // (신규) 드래그가 onDrag 콜백에 의해 처리되었는지 여부
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeThreshold = 50; // 스와이프로 인정할 최소 픽셀
            this.dragThreshold = 5; // 드래그로 인정할 최소 픽셀
            this.doubleTapDelay = 300;
            this.hasMoved = false;

            // (신규) 펜 회전(twist) 상태
            this.lastPenTwist = 0;
            this.penTwistThreshold = 10; // 펜 회전 민감도 (도)
            
            this.init();
        }
        
        init() {
            this.element.style.touchAction = 'none';
            
            // (수정) bind(this)를 변수에 저장하여 removeEventListener에서 동일한 참조 사용
            this.boundHandlePointerDown = this.handlePointerDown.bind(this);
            this.boundHandlePointerMove = this.handlePointerMove.bind(this);
            this.boundHandlePointerUp = this.handlePointerUp.bind(this);
            this.boundHandleWheel = this.handleWheel.bind(this);

            this.element.addEventListener('pointerdown', this.boundHandlePointerDown);
            this.element.addEventListener('pointermove', this.boundHandlePointerMove);
            this.element.addEventListener('pointerup', this.boundHandlePointerUp);
            this.element.addEventListener('pointercancel', this.boundHandlePointerUp);
            
            this.element.addEventListener('wheel', this.boundHandleWheel, { passive: false });
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
            this.dragHandled = false; // 드래그 핸들 플래그 초기화
            
            if (e.pointerType === 'pen') {
                this.lastPenTwist = e.twist; // (신규) 펜 시작 각도 저장
            }

            if (this.pointers.size === 2) {
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                this.isPinching = true;
                this.isDragging = false; // 핀치 시 드래그 중지
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
            
            const originalPointer = this.pointers.get(e.pointerId);
            const dx = e.clientX - originalPointer.clientX;
            const dy = e.clientY - originalPointer.clientY;
            
            if (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold) {
                this.hasMoved = true;
            }

            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId
            });
            
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
                
                if (this.hasMoved) { // (수정) dragThreshold 이상 움직였을 때만
                    this.isDragging = true;
                }
                
                if (this.isDragging && this.callbacks.onDrag) {
                    const shouldPrevent = this.callbacks.onDrag({
                        x: e.clientX,
                        y: e.clientY,
                        deltaX: deltaX,
                        deltaY: deltaY
                    });
                    
                    if (shouldPrevent) {
                        this.dragHandled = true; // (신규) 줌/패닝이 드래그를 처리했음
                        e.preventDefault();
                    }
                }
            }
            
            // (신규) 펜 회전(Twist) 지원
            if (e.pointerType === 'pen' && e.twist !== this.lastPenTwist && this.callbacks.onPenRotate) {
                e.preventDefault();
                const deltaTwist = e.twist - this.lastPenTwist;
                
                // 각도 랩 어라운드 처리 (e.g., 359 -> 1)
                let normalizedDelta = deltaTwist;
                if (Math.abs(deltaTwist) > 180) {
                    normalizedDelta = deltaTwist > 0 ? deltaTwist - 360 : deltaTwist + 360;
                }

                if (Math.abs(normalizedDelta) > this.penTwistThreshold) {
                    this.callbacks.onPenRotate(normalizedDelta, { x: e.clientX, y: e.clientY });
                    this.lastPenTwist = e.twist; // 각도 업데이트
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
                
                // (수정) 줌/패닝이 드래그를 처리하지 않았을 때만 스와이프 검사
                if (this.isDragging && !this.dragHandled && distance > this.swipeThreshold) {
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
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
            this.hasMoved = false; // hasMoved도 초기화
            this.dragHandled = false; // dragHandled 초기화
            
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
            // (신규) 이벤트 리스너 제거
            this.element.removeEventListener('pointerdown', this.boundHandlePointerDown);
            this.element.removeEventListener('pointermove', this.boundHandlePointerMove);
            this.element.removeEventListener('pointerup', this.boundHandlePointerUp);
            this.element.removeEventListener('pointercancel', this.boundHandlePointerUp);
            this.element.removeEventListener('wheel', this.boundHandleWheel);
            
            this.pointers.clear();
        }
    }
    
    window.GestureHandler = GestureHandler;
    
})(window);

