import React, { useEffect, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';

// ref를 통해 노출할 메서드 타입 정의
export interface RiveWrapperHandle {
  fireTrigger: () => void;
}

interface RiveWrapperProps {
  src: string;
  stateMachine: string;
  artboard: string;
  onPointerDown: (e: React.PointerEvent) => void;
  numberValue: number;
}

// forwardRef로 컴포넌트 감싸기
const RiveWrapper = forwardRef<RiveWrapperHandle, RiveWrapperProps>(({
  src,
  stateMachine,
  artboard,
  onPointerDown,
  numberValue
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [riveError, setRiveError] = useState(false); // 에러 상태 추가

  // 화면 크기 변경에 따른 Rive 크기 조정
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // 더 작은 값에 맞춘 정사각형 크기 계산
        const size = Math.min(containerWidth, containerHeight);
        
        setDimensions({ width: size, height: size });
      }
    };

    // 초기 및 리사이즈 시 크기 업데이트
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // useRive 훅을 호출할 때 onError 속성 제거하고 별도의 에러 처리 추가
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    artboard,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain, 
      alignment: Alignment.Center
    }),
    // 에러 처리를 위한 onLoadError 콜백 추가
    onLoadError: (err) => {
      console.error("Rive 로딩 에러:", err);
      setRiveError(true);
    }
  });

  const triggerInput = useStateMachineInput(rive, stateMachine, "Trigger 1");
  const numberInput = useStateMachineInput(rive, stateMachine, "number");
  
  // numberValue가 변경될 때마다 업데이트
  useEffect(() => {
    if (numberInput) {
      numberInput.value = numberValue;
    }
  }, [numberValue, numberInput]);

  // 트리거 함수를 노출
  useImperativeHandle(ref, () => ({
    fireTrigger: () => {
      if (triggerInput) {
        triggerInput.fire();
      }
    }
  }));

  // 클릭 핸들러 수정 - 기존 순서 반대로
  const handlePointerDown = (e: React.PointerEvent) => {
    // Canvas 요소 내에서만 이벤트 처리
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'canvas') {
      // 먼저 트리거 실행
      if (triggerInput) {
        triggerInput.fire();
      }
      
      // 그 다음 상위 컴포넌트에 이벤트 전달
      onPointerDown(e);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full" 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {!riveError ? (
        <div
          style={{
            width: dimensions.width > 0 ? `${dimensions.width}px` : '100%',
            height: dimensions.height > 0 ? `${dimensions.height}px` : '100%',
            margin: '0 auto'
          }}
        >
          <RiveComponent 
            onPointerDown={handlePointerDown}
            style={{ 
              width: '100%', 
              height: '100%',
              cursor: 'pointer',
              display: 'block',
              outline: 'none'
            }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-red-500 bg-opacity-20 rounded-xl text-white">
          캐릭터를 불러올 수 없습니다
        </div>
      )}
    </div>
  );
});

// 컴포넌트에 표시 이름 추가
RiveWrapper.displayName = 'RiveWrapper';

export default RiveWrapper;
