"use client";

import React, { useState, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import './ClickerGame.css';

type Popup = { id: number; top: string; left: string };

const getRandomPopupPosition = (): { top: string; left: string } => {
  const sides = ["top", "bottom", "left", "right"];
  const side = sides[Math.floor(Math.random() * sides.length)];
  let top = "50%", left = "50%";
  if (side === "top") {
    top = `${Math.random() * 10}%`;
    left = `${10 + Math.random() * 80}%`;
  } else if (side === "bottom") {
    top = `${90 + Math.random() * 10}%`;
    left = `${10 + Math.random() * 80}%`;
  } else if (side === "left") {
    left = `${Math.random() * 10}%`;
    top = `${10 + Math.random() * 80}%`;
  } else if (side === "right") {
    left = `${90 + Math.random() * 10}%`;
    top = `${10 + Math.random() * 80}%`;
  }
  return { top, left };
};

const ClickerGame = () => {
  // 상태 선언
  const [clickCount, setClickCount] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [bgColor, setBgColor] = useState("#C2AFE6");
  const [animateCount, setAnimateCount] = useState(false);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);

  // Effects
  useEffect(() => { document.body.style.backgroundColor = bgColor; }, [bgColor]);
  useEffect(() => {
    const audioElement = new Audio('/asset/shibuki/debakbak.mp3');
    setAudio(audioElement);
  }, []);

  // Rive 초기화
  const { rive, RiveComponent } = useRive({
    src: '/asset/shibuki/shibuki.riv',
    stateMachines: 'State Machine 1',
    artboard: 'Artboard',
    autoplay: true,
  });
  const triggerInput = useStateMachineInput(rive, 'State Machine 1', 'Trigger 1');

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchstart') e.preventDefault();
    if (triggerInput) triggerInput.fire();
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.error('Error playing audio:', err));
    }
    setClickCount(prev => prev + 1);

    // 애니메이션 업데이트 (랜덤 회전만 적용)
    const angle = Math.random() < 0.5 ? 10 : -10;
    setRotateAngle(angle);
    setAnimateCount(true);
    setTimeout(() => {
      setAnimateCount(false);
    }, 300);

    // popup 추가 (랜덤 위치)
    const { top, left } = getRandomPopupPosition();
    const popupId = Date.now();
    setPopups(prev => [...prev, { id: popupId, top, left }]);
  };

  const handleChangeSkin = () => { console.log('Change Skin 버튼 클릭'); };
  const handleChangeCharacter = () => {
    setBgColor(prev => prev === "#C2AFE6" ? "#FFB6C1" : "#C2AFE6");
    console.log('Change Character 버튼 클릭');
  };

  return (
    <div className="container" style={{ backgroundColor: bgColor }}>
      {/* Click Counter */}
      <div
        className="clickCounter"
        style={animateCount ? { transform: `scale(1.2) rotate(${rotateAngle}deg)` } : {}}
      >
        {clickCount}
      </div>
      
      {/* Rive Animation Container with popups */}
      <div className="riveContainer" onClick={handleInteraction} onTouchStart={handleInteraction}>
        <RiveComponent />
        {popups.map(popup => (
          <span
            key={popup.id}
            className="popup"
            style={{ top: popup.top, left: popup.left }}
            onAnimationEnd={() => setPopups(old => old.filter(p => p.id !== popup.id))}
          >
            +1
          </span>
        ))}
      </div>
      
      {/* 스킨 & 캐릭터 변경 버튼 */}
      <div className="buttonContainer">
        <button className="buttonSkin" onClick={handleChangeSkin}>스킨 변경</button>
        <button className="buttonCharacter" onClick={handleChangeCharacter}>캐릭터 변경</button>
      </div>
    </div>
  );
};

export default ClickerGame;