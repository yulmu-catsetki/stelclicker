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

  // 화면 크기 변경에 따른 Rive 크기 조정
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isLandscape = viewportWidth > viewportHeight;
        
        let size: number;
        if (isLandscape) {
          // 가로 모드: 더 큰 크기로 조정
          size = Math.min(viewportHeight * 0.70, viewportWidth * 0.55, 1000);
        } else {
          // 세로 모드: 더 큰 크기로 조정
          size = Math.min(viewportWidth * 0.95, viewportHeight * 0.55, 1000);
        }
        
        // 매우 작은 화면일 경우 추가 조정
        if (viewportHeight < 400) {
          size = Math.min(size, viewportWidth * 0.65);
        }
        
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

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    artboard,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Contain, 
      alignment: Alignment.Center
    })
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

  // 클릭 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    if (triggerInput) {
      triggerInput.fire();
    }
    onPointerDown(e);
  };

  return (
    <div 
      ref={containerRef} 
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
          height: '100%'
        }}
      />
    </div>
  );
});

// 컴포넌트에 표시 이름 추가
RiveWrapper.displayName = 'RiveWrapper';

export default RiveWrapper;
