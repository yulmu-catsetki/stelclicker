import React from 'react';

interface PopupMessageProps {
  popups: Array<{
    id: number;
    message: string;
    x: number;
    y: number;
  }>;
  onRemove: (id: number) => void;
  characterColor: string;
}

export const PopupMessage: React.FC<PopupMessageProps> = ({ 
  popups, 
  onRemove, 
  characterColor 
}) => {
  return (
    <>
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="popup text-lg font-bold"
          style={{
            left: `${popup.x}px`,
            top: `${popup.y}px`,
            color: 'white',
            // 캐릭터의 색상을 기반으로 한 그림자 효과 추가
            textShadow: `
              -1px -1px 0 ${characterColor},
              1px -1px 0 ${characterColor},
              -1px 1px 0 ${characterColor},
              1px 1px 0 ${characterColor}
            `
          }}
          onAnimationEnd={() => onRemove(popup.id)}
        >
          {popup.message}
        </div>
      ))}
    </>
  );
};