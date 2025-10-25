(function(window) {
    'use strict';
    
    /**
     * 포인터 이벤트(터치, 마우스, 펜)를 감지하여 제스처 콜백을 실행하는 클래스
     */
    class GestureHandler {
        constructor(element, callbacks) {
            this.element = element;
            this.callbacks = callbacks || {};
            
            this.pointers = new Map(); // 활성 포인터 저장
            this.lastTap = 0;
            this.startDistance = 0;
            this.lastDistance = 0; // (수정) 부드러운 핀치줌을 위해 추가
            this.lastTwist = 0; // (신규) 펜 회전을 위해 추가
            
            this.isPinching = false;
            this.isDragging = false;
            
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            
            this.swipeThreshold = 50; // 스와이프로 인정할 최소 거리
            this.dragThreshold = 5;   // 드래그로 인정할 최소 거리
            this.doubleTapDelay = 300; // 더블탭 딜레이
            
            this.init();
        }
        
        /**
         * 이벤트 리스너 초기화
         */
        init() {
            // 'touch-action: none'으로 설정하여 브라우저 기본 터치 동작(스크롤, 줌)을 막음
            this.element.style.touchAction = 'none';
            
            this.element.addEventListener('pointerdown', this.handlePointerDown.bind(this));
            this.element.addEventListener('pointermove', this.handlePointerMove.bind(this));
            this.element.addEventListener('pointerup', this.handlePointerUp.bind(this));
            this.element.addEventListener('pointercancel', this.handlePointerUp.bind(this));
            
            this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        }
        
        /**
         * 두 포인터 사이의 거리 계산
         */
        getDistance(pointer1, pointer2) {
            const dx = pointer2.clientX - pointer1.clientX;
            const dy = pointer2.clientY - pointer1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        /**
         * 두 포인터의 중심점 계산
         */
        getCenter(pointer1, pointer2) {
            return {
                x: (pointer1.clientX + pointer2.clientX) / 2,
                y: (pointer1.clientY + pointer2.clientY) / 2
            };
        }
        
        /**
         * 포인터 다운 이벤트 핸들러
         */
        handlePointerDown(e) {
            // (수정) 제스처가 이미지 래퍼 내부에서 시작됐는지 확인
            // e.target이 .viewer-image-instance-wrapper 또는 그 자식인지 확인
            const wrapper = e.target.closest('.viewer-image-instance-wrapper');
            // 줌이 안된 상태이고, 이미지 바깥(배경)을 클릭한 경우 무시 (core.js에서 별도 처리)
            if (!wrapper && (!this.callbacks.isZoomed || !this.callbacks.isZoomed())) {
                 // core.js의 viewer.addEventListener('click', ...)가 처리하도록 둠
                return;
            }

            // 포인터 정보 저장
            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId
            });
            
            // (신규) 펜 타입일 경우 초기 회전값 저장
            if (e.pointerType === 'pen') {
                this.lastTwist = e.twist || 0;
            }
            
            if (this.pointers.size === 2) {
                // 포인터가 2개 = 핀치 시작
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                this.isPinching = true;
                this.isDragging = false; // 핀치 중에는 드래그 중지
                this.startDistance = this.getDistance(pointers[0], pointers[1]);
                this.lastDistance = this.startDistance; // (수정) lastDistance 초기화
                
                if (this.callbacks.onPinchStart) {
                    this.callbacks.onPinchStart(this.getCenter(pointers[0], pointers[1]));
                }
            } else if (this.pointers.size === 1) {
                // 포인터가 1개 = 드래그 또는 탭 시작
                this.isDragging = false; // (수정) 드래그 상태 초기화
                this.swipeStartX = e.clientX;
                this.swipeStartY = e.clientY;
                
                // 드래그 시작 콜백 (줌 상태가 아니어도 호출됨)
                if (this.callbacks.onDragStart) {
                    this.callbacks.onDragStart({ x: e.clientX, y: e.clientY });
                }
                
                // 더블탭 감지
                const now = Date.now();
                if (now - this.lastTap < this.doubleTapDelay) {
                    if (this.callbacks.onDoubleTap) {
                        this.callbacks.onDoubleTap({ x: e.clientX, y: e.clientY });
                    }
                    this.lastTap = 0; // 더블탭 성공 시 리셋
                } else {
                    this.lastTap = now;
                }
            }
        }
        
        /**
         * 포인터 무브 이벤트 핸들러
         */
        handlePointerMove(e) {
            if (!this.pointers.has(e.pointerId)) return;
            
            // 포인터 정보 업데이트
            this.pointers.set(e.pointerId, {
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId
            });
            
            // (신규) 펜 회전 감지
            if (e.pointerType === 'pen' && e.twist !== undefined) {
                const deltaTwist = e.twist - (this.lastTwist || 0);
                
                // 약 2도 (0.03 rad) 이상 변경 시 콜백
                if (Math.abs(deltaTwist) > 0.03) {
                    if (this.callbacks.onPenRotate) {
                        this.callbacks.onPenRotate(deltaTwist, { x: e.clientX, y: e.clientY });
                    }
                    this.lastTwist = e.twist;
                }
            }
            
            if (this.isPinching && this.pointers.size === 2) {
                // 핀치 줌 로직
                e.preventDefault();
                const pointers = Array.from(this.pointers.values());
                const currentDistance = this.getDistance(pointers[0], pointers[1]);
                
                // (수정) 이전 거리 대비 스케일 계산 (부드러운 줌)
                const scale = currentDistance / this.lastDistance; 
                const center = this.getCenter(pointers[0], pointers[1]);
                
                if (this.callbacks.onPinch) {
                    this.callbacks.onPinch(scale, center);
                }
                
                this.lastDistance = currentDistance; // (수정) 마지막 거리 업데이트
                
            } else if (this.pointers.size === 1 && !this.isPinching) {
                // 드래그 로직
                const deltaX = e.clientX - this.swipeStartX;
                const deltaY = e.clientY - this.swipeStartY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // (수정) 드래그 임계값 넘어야 드래그 상태로 변경
                if (!this.isDragging && distance > this.dragThreshold) {
                    // (수정) 드래그 시작 시 onDragStart를 다시 호출하지 않음 (down에서 이미 호출)
                    this.isDragging = true;
                }
                
                // (수정) 드래그 상태일 때만 onDrag 콜백 호출
                if (this.isDragging && this.callbacks.onDrag) {
                    const shouldPrevent = this.callbacks.onDrag({
                        x: e.clientX,
                        y: e.clientY,
                        deltaX: deltaX, // (수정) core.js에서 delta가 아닌 x, y를 사용하므로 유지
                        deltaY: deltaY
                    });
                    
                    // onDrag 콜백이 true를 반환하면 (예: 줌 패닝) 기본 스크롤 방지
                    if (shouldPrevent) {
                        e.preventDefault();
                    }
                }
            }
        }
        
        /**
         * 포인터 업/캔슬 이벤트 핸들러
         */
        handlePointerUp(e) {
            if (!this.pointers.has(e.pointerId)) return;
            
            if (this.isPinching && this.pointers.size === 2) {
                // 핀치 종료
                this.isPinching = false;
                this.lastDistance = 0; // (수정) 리셋
                if (this.callbacks.onPinchEnd) {
                    this.callbacks.onPinchEnd();
                }
            } else if (this.pointers.size === 1 && !this.isPinching) {
                // 드래그 또는 스와이프 종료
                const deltaX = e.clientX - this.swipeStartX;
                const deltaY = e.clientY - this.swipeStartY;
                
                if (this.isDragging) {
                    // 드래그 상태였다면 스와이프 감지
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
                        if (deltaX > 0 && this.callbacks.onSwipeRight) {
                            this.callbacks.onSwipeRight();
                        } else if (deltaX < 0 && this.callbacks.onSwipeLeft) {
                            this.callbacks.onSwipeLeft();
                        }
                    }
                }
                
                // 드래그 종료 콜백 (항상 호출)
                if (this.callbacks.onDragEnd) {
                    this.callbacks.onDragEnd();
                }
            }
            
            // 포인터 제거 및 상태 리셋
            this.pointers.delete(e.pointerId);
            this.isDragging = false;
            
            if (this.pointers.size < 2) {
                this.isPinching = false;
                this.lastDistance = 0; // (수정) 리셋
            }
            
            if (this.pointers.size === 0) {
                this.lastTwist = 0; // (신규) 펜 회전 리셋
            }
        }
        
        /**
         * 휠 이벤트 핸들러 (마우스 휠 줌)
         */
        handleWheel(e) {
            // (수정) Ctrl/Meta 키 없이도 휠 줌이 되도록 변경 (사용자 선호에 따라)
            // if (e.ctrlKey || e.metaKey) { 
                e.preventDefault();
                
                const delta = -e.deltaY;
                // (수정) 휠 민감도 조절 (더 세밀하게)
                const scale = delta > 0 ? 1.05 : 1 / 1.05; // 5%씩 줌
                
                if (this.callbacks.onWheel) {
                    this.callbacks.onWheel(scale, {
                        x: e.clientX,
                        y: e.clientY
                    });
                }
            // }
        }
        
        /**
         * 핸들러 파괴 (메모리 정리)
         */
        destroy() {
            // 이벤트 리스너 제거 (필요 시)
            // 여기서는 core.js의 closeViewer에서 null로 만드는 것으로 대체
            this.pointers.clear();
        }
    }
    
    window.GestureHandler = GestureHandler;
    
})(window);

