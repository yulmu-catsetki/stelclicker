import React from 'react';

// 색상 조정 함수
export function adjustColor(hex: string, factor: number): string {
  const r = Math.min(255, Math.floor(parseInt(hex.slice(1,3), 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(hex.slice(3,5), 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(hex.slice(5,7), 16) * factor));
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}

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

// 추가 유틸리티 함수들...
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}