"use client";

import React, { useState, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

const ClickerGame = () => {
  const [clickCount, setClickCount] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);  
  
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

  const handleClick = () => {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-purple-600">
      {/* Click Counter */}
      <div className="text-4xl font-bold mb-8 text-white">
        {clickCount}
      </div>
      
      {/* Rive Animation Container */}
      <div 
        className="w-64 h-64 cursor-pointer"
        onClick={handleClick}
      >
        <RiveComponent />
      </div>
    </div>
  );
};

export default ClickerGame;

