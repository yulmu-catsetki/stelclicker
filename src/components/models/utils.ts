import React from 'react';

// 랜덤 팝업 위치 계산 함수
export function calculateRandomPopupPosition(containerRef: React.RefObject<HTMLDivElement>): { top: string; left: string } {
  if (!containerRef.current) {
    return { top: '50%', left: '50%' }; // 기본값
  }
  
  const edgeBuffer = 0.1 + Math.random() * 0.1; // 10-20% 버퍼
  const left = edgeBuffer + Math.random() * (1 - 2 * edgeBuffer);
  const top = edgeBuffer + Math.random() * (1 - 2 * edgeBuffer);
  
  return { 
    top: `${top * 100}%`, 
    left: `${left * 100}%` 
  };
}
