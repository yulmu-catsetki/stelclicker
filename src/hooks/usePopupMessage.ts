// usePopupMessage.ts
import { useState, useCallback } from 'react';
import { calculateRandomPopupPosition } from '../components/models/utils';

// 팝업 타입 정의
export interface Popup {
  id: number;
  top: string;
  left: string;
  message: string;
  rotation: number;
  scale: number;
}

export function usePopupMessage() {
  // 팝업 메시지 상태
  const [popups, setPopups] = useState<Popup[]>([]);

  // 팝업 추가 함수
  const addPopup = useCallback((message: string, containerRef: React.RefObject<HTMLDivElement>) => {
    // 랜덤 위치 계산
    const { top, left } = calculateRandomPopupPosition(containerRef);
    
    // 고유 ID 생성
    const popupId = Date.now();
    
    // 회전과 크기에 랜덤성 부여
    const rotation = Math.random() * 30 - 15; // -15도에서 15도 사이
    const scale = 0.8 + Math.random() * 0.4; // 0.8에서 1.2 사이
    
    // 팝업 배열에 새 팝업 추가
    setPopups(prev => [...prev, { 
      id: popupId, 
      top, 
      left, 
      message,
      rotation,
      scale
    }]);
  }, []);

  // 특정 팝업 제거 함수
  const removePopup = useCallback((id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  // 모든 팝업 초기화 함수
  const clearPopups = useCallback(() => {
    setPopups([]);
  }, []);

  // 훅에서 상태와 함수들 반환
  return { 
    popups, 
    addPopup, 
    removePopup,
    clearPopups 
  };
}