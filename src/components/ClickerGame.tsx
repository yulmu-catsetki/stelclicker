"use client";

import React, { useState, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import './ClickerGame.css';

const ClickerGame = () => {
  const [clickCount, setClickCount] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [bgColor, setBgColor] = useState("#C2AFE6");

  // body 배경색 업데이트 (양옆 배경까지 커버)
  useEffect(() => {
    document.body.style.backgroundColor = bgColor;
  }, [bgColor]);

  // Initialize audio on component mount
  useEffect(() => {
    const audioElement = new Audio('/asset/shibuki/debakbak.mp3');
    setAudio(audioElement);
  }, []);

  const { rive, RiveComponent } = useRive({
    src: '/asset/shibuki/shibuki.riv',
    stateMachines: 'State Machine 1',
    artboard: 'Artboard',
    autoplay: true,
  });

  const triggerInput = useStateMachineInput(
    rive,
    'State Machine 1',
    'Trigger 1'
  );

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default touch behavior
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    // Trigger Rive animation
    if (triggerInput) {
      triggerInput.fire();
    }

    // Play sound
    if (audio) {
      // Reset the audio to start if it's already playing
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }

    // Increment counter
    setClickCount(prev => prev + 1);
  };

  // 스킨 변경 버튼 클릭 핸들러
  const handleChangeSkin = () => {
    // 스킨 변경 로직 추가
    console.log('Change Skin 버튼 클릭');
  };

  // 캐릭터 변경 버튼 클릭 핸들러
  const handleChangeCharacter = () => {
    // 캐릭터에 따라 임의로 배경색 변경
    setBgColor(bgColor === "#C2AFE6" ? "#FFB6C1" : "#C2AFE6");
    console.log('Change Character 버튼 클릭');
  };

  return (
    <div className="container" style={{ backgroundColor: bgColor }}>
      {/* Click Counter */}
      <div className="clickCounter">
        {clickCount}
      </div>
      
      {/* Rive Animation Container */}
      <div 
        className="riveContainer"
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        <RiveComponent />
      </div>
      
      {/* 스킨 & 캐릭터 변경 버튼 컨테이너 */}
      <div className="buttonContainer">
        <button 
          className="buttonSkin"
          onClick={handleChangeSkin}
        >
          스킨 변경
        </button>
        <button 
          className="buttonCharacter"
          onClick={handleChangeCharacter}
        >
          캐릭터 변경
        </button>
      </div>
    </div>
  );
};

export default ClickerGame;