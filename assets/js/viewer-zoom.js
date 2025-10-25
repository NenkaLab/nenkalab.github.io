(function(window) {
    'use strict';

    /**
     * 이미지 줌, 패닝, 회전을 관리하는 클래스
     */
    class ZoomController {
        constructor(imageWrapper, image, options) {
            this.wrapper = imageWrapper; // 줌/패닝이 적용될 래퍼 요소
            this.image = image;         // 이미지 요소 (크기 계산용)
            this.options = Object.assign({
                minScale: 1,
                maxScale: 50,
                scaleStep: 0.1, // 버튼 클릭 시 줌 단계
                doubleTapScale: 3,
                animationDuration: 200
            }, options);
            
            // 상태 변수
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
            
            this.updateTransform(false); // 초기 변환 적용
        }
        
        /**
         * 래퍼 요소에 CSS transform을 적용
         */
        updateTransform(animate = false) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            
            // requestAnimationFrame을 사용하여 부드러운 렌더링
            this.animationFrame = requestAnimationFrame(() => {
                // 핀치 줌, 드래그 시에는 애니메이션(transition) 비활성화
                if (animate) {
                    this.wrapper.style.transition = `transform ${this.options.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                } else {
                    this.wrapper.style.transition = 'none';
                }
                
                const transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale}) rotate(${this.rotation}deg)`;
                this.wrapper.style.transform = transform;
            });
        }
        
        /**
         * 지정된 스케일로 줌 레벨 설정
         * @param {number} newScale - 새로운 스케일 값
         * @param {number} centerX - 줌의 중심 X 좌표 (화면 기준)
         * @param {number} centerY - 줌의 중심 Y 좌표 (화면 기준)
         * @param {boolean} animate - 애니메이션 적용 여부
         */
        setZoom(newScale, centerX, centerY, animate = true) {
            // 스케일 최소/최대 제한
            newScale = Math.max(this.options.minScale, Math.min(this.options.maxScale, newScale));
            
            const oldScale = this.scale;
            
            if (centerX !== undefined && centerY !== undefined) {
                // 줌 중심점을 기준으로 translate 값 보정
                // (참고: https://medium.com/s/zooming-and-panning-in-javascript/a87310821c23)
                const rect = this.wrapper.getBoundingClientRect();
                
                // 래퍼 기준의 마우스 포인터 위치
                const mouseX = centerX - rect.left;
                const mouseY = centerY - rect.top;

                // 이미지 기준의 마우스 포인터 위치 (현재 스케일과 translate 고려)
                const imgX = (mouseX - this.translateX) / oldScale;
                const imgY = (mouseY - this.translateY) / oldScale;

                // 새로운 translate 값 계산
                this.translateX = mouseX - imgX * newScale;
                this.translateY = mouseY - imgY * newScale;

            } else if (this.scale > this.options.minScale) {
                 // 핀치 줌 (제스처 핸들러에서 넘어옴)
                 // (이전 로직 제거 - setZoom 로직이 통합 처리)
                 // 이 부분은 제스처 핸들러에서 이미 계산된 scale을 받아 pinchZoom을 통해 호출됨
            }
            
            this.scale = newScale;
            
            if (this.scale <= this.options.minScale) {
                // 줌 아웃 시 최소 스케일이면 중앙 정렬
                this.translateX = 0;
                this.translateY = 0;
            } else {
                // 줌 상태일 때 패닝 범위 제한
                this.constrainPan();
            }
            
            this.updateTransform(animate);
            
            return this.scale;
        }
        
        /**
         * 핀치 줌 (제스처 핸들러에서 호출)
         * @param {number} scale - 이전 프레임 대비 스케일 배율 (예: 1.05)
         * @param {number} centerX - 핀치 중심 X
         * @param {number} centerY - 핀치 중심 Y
         */
        pinchZoom(scale, centerX, centerY) {
            // (수정) 제스처 핸들러에서 받은 *상대* 스케일을 현재 스케일에 곱함
            const newScale = this.scale * scale;
            
            // setZoom을 호출하여 위치 보정 및 적용 (애니메이션 없음)
            return this.setZoom(newScale, centerX, centerY, false);
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
            // this.rotation = 0; // 회전값은 유지
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
        
        /**
         * 드래그(패닝) 시작
         */
        startDrag(x, y) {
            // 줌 상태일 때만 드래그 가능
            if (this.scale <= this.options.minScale) return false;
            
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
            this.lastTranslateX = this.translateX;
            this.lastTranslateY = this.translateY;
            
            return true;
        }
        
        /**
         * 드래그(패닝) 중
         */
        drag(x, y) {
            if (!this.isDragging || this.scale <= this.options.minScale) return false;
            
            const deltaX = x - this.dragStartX;
            const deltaY = y - this.dragStartY;
            
            this.translateX = this.lastTranslateX + deltaX;
            this.translateY = this.lastTranslateY + deltaY;
            
            this.constrainPan(); // 패닝 범위 제한
            this.updateTransform(false); // 애니메이션 없이 즉시 적용
            
            return true;
        }
        
        /**
         * 드래그(패닝) 종료
         */
        endDrag() {
            this.isDragging = false;
            return true;
        }
        
        /**
         * 이미지가 뷰포트 밖으로 벗어나지 않도록 패닝 범위 제한
         */
        constrainPan() {
            if (this.scale <= this.options.minScale) {
                this.translateX = 0;
                this.translateY = 0;
                return;
            }
            
            // 뷰포트(컨테이너) 크기
            const wrapperRect = this.wrapper.parentElement.getBoundingClientRect();
            
            // 이미지 래퍼의 현재 렌더링된 크기 (스케일 적용)
            const scaledWidth = this.wrapper.offsetWidth * this.scale;
            const scaledHeight = this.wrapper.offsetHeight * this.scale;

            // 뷰포트 밖으로 나갈 수 있는 최대/최소 translate 값
            // (이미지 크기가 뷰포트보다 작을 경우 0)
            const maxX = Math.max(0, (scaledWidth - wrapperRect.width) / 2);
            const maxY = Math.max(0, (scaledHeight - wrapperRect.height) / 2);

            this.translateX = Math.max(-maxX, Math.min(maxX, this.translateX));
            this.translateY = Math.max(-maxY, Math.min(maxY, this.translateY));
        }
        
        /**
         * 이미지 회전
         */
        rotate(degrees = 90) {
            this.rotation = (this.rotation + degrees) % 360;
            this.updateTransform(true);
        }
        
        /**
         * 현재 줌 상태 반환
         */
        getState() {
            return {
                scale: this.scale,
                translateX: this.translateX,
                translateY: this.translateY,
                rotation: this.rotation,
                isZoomed: this.scale > this.options.minScale
            };
        }
        
        /**
         * 줌 상태 완전 리셋 (이미지 변경 시 호출)
         */
        reset() {
            this.scale = this.options.minScale;
            this.translateX = 0;
            this.translateY = 0;
            // this.rotation = 0; // 회전값은 유지하도록 주석 처리
            this.isDragging = false;
            this.updateTransform(false);
        }
        
        /**
         * 컨트롤러 파괴
         */
        destroy() {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            // 래퍼 스타일 초기화
            if (this.wrapper) {
                this.wrapper.style.transform = '';
                this.wrapper.style.transition = '';
            }
        }
    }
    
    window.ZoomController = ZoomController;
    
})(window);
