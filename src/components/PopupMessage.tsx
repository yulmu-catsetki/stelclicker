// PopupMessage.tsx
import React from 'react';

// 팝업 인터페이스 정의
export interface Popup {
  id: number;
  top: string;
  left: string;
  message: string;
  rotation: number;
  scale: number;
}

// 컴포넌트 Props 인터페이스
interface PopupMessageProps {
  popups: Popup[];
  onRemove: (id: number) => void;
  characterColor: string;
}

export const PopupMessage: React.FC<PopupMessageProps> = ({ 
  popups, 
  onRemove, 

}) => {
  return (
    <>
      {popups.map(popup => (
        <span
          key={popup.id}
          className="popup text-2xl md:text-xl xs:text-base"
          style={{ 
            top: popup.top, 
            left: popup.left, 
            transform: `rotate(${popup.rotation}deg) scale(${popup.scale})`,
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            fontSize: `calc(1em * ${popup.scale})`,
            fontWeight: 'bold',
            color: 'white'
          }}
          onAnimationEnd={() => onRemove(popup.id)}
        >
          {popup.message}
        </span>
      ))}
    </>
  );
};