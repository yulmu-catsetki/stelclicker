"use client"

import React, { useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

const ClickerGame = () => {
  const [clickCount, setClickCount] = useState(0);
  
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
    if (triggerInput) {
      triggerInput.fire();
    }
    setClickCount(prev => prev + 1);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Click Counter */}
      <div className="text-4xl font-bold mb-8">
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