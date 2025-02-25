import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

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
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    artboard,
    autoplay: true,
  });
  
  const triggerInput = useStateMachineInput(rive, stateMachine, "Trigger 1");
  const numberInput = useStateMachineInput(rive, stateMachine, "number");
  
  // numberValue가 변경될 때마다 업데이트
  useEffect(() => {
    if (numberInput) {
      numberInput.value = numberValue;
    }
  }, [numberValue, numberInput]);

  // 트리거 함수를 노출 - useImperativeHandle 올바르게 사용
  useImperativeHandle(ref, () => ({
    fireTrigger: () => {
      if (triggerInput) {
        triggerInput.fire();
      }
    }
  }));

  // 클릭 핸들러 - 트리거를 발생시키고 상위 컴포넌트의 핸들러를 호출
  const handlePointerDown = (e: React.PointerEvent) => {
    if (triggerInput) {
      triggerInput.fire();
    }
    onPointerDown(e);
  };

  return <RiveComponent onPointerDown={handlePointerDown} />;
});

// 컴포넌트에 표시 이름 추가 (디버깅 도구에서 확인할 때 유용)
RiveWrapper.displayName = 'RiveWrapper';

export default RiveWrapper;
