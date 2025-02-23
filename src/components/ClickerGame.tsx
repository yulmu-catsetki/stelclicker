"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import "./ClickerGame.css";

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

// 중복 제거: 캐릭터별 사운드 경로를 서로 다르게 정의
const CHAR_SOUNDS = [
  "/asset/shibuki/debakbak.mp3",
  "/asset/shibuki/gomapdei.mp3",
  "/asset/shibuki/char2.mp3",
  "/asset/shibuki/char3.mp3"
];

// 캐릭터 배경 컬러
const CHAR_COLORS = [
  "#C2AFE6",
  "#DF7685",
  "#A6D0A6",
  "#2B66C0"
];

const ClickerGame = () => {
  // clickCounts를 4개 인덱스로 초기화
  const [clickCounts, setClickCounts] = useState<{ [key: number]: number }>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("clickCounts");
      return stored ? JSON.parse(stored) : { 0: 0, 1: 0, 2: 0, 3: 0 };
    }
    return { 0: 0, 1: 0, 2: 0, 3: 0 };
  });
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [animateCount, setAnimateCount] = useState(false);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [numberValue, setNumberValue] = useState(0);

  const fadeOutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isClickingRef = useRef(false);

  // 클릭 수를 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("clickCounts", JSON.stringify(clickCounts));
  }, [clickCounts]);

  // 오디오 페이드 아웃
  const fadeOutAudio = (audio: HTMLAudioElement, duration = 1200) => {
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    const steps = 20;
    const stepTime = duration / steps;
    const fadeStep = audio.volume / steps;
    fadeOutIntervalRef.current = setInterval(() => {
      if (audio.volume > fadeStep) {
        audio.volume = Math.max(0, audio.volume - fadeStep);
      } else {
        audio.volume = 0;
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }
    }, stepTime);
  };

  // 캐릭터 변경 시 문서 배경색 변경
  useEffect(() => {
    document.body.style.backgroundColor = CHAR_COLORS[numberValue];
  }, [numberValue]);

  // 캐릭터 변경 시 사운드 로드
  useEffect(() => {
    const audioElement = new Audio(CHAR_SOUNDS[numberValue]);
    setAudio(audioElement);
  }, [numberValue]);

  // Rive 초기화
  const { rive, RiveComponent } = useRive({
    src: "/asset/shibuki/shibuki.riv",
    stateMachines: "State Machine 1",
    artboard: "Artboard",
    autoplay: true,
  });
  const triggerInput = useStateMachineInput(rive, "State Machine 1", "Trigger 1");
  const numberInput = useStateMachineInput(rive, "State Machine 1", "number");

  // 캐릭터 인덱스 업데이트
  useEffect(() => {
    if (numberInput) {
      numberInput.value = numberValue;
    }
  }, [numberValue, numberInput]);

  // 캐릭터 클릭 핸들러
  const handleInteraction = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isClickingRef.current) return;
    
    if (triggerInput) {
      isClickingRef.current = true;
      triggerInput.fire();
      if (audio) {
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        audio.volume = 1;
        audio.currentTime = 0;
        audio.play().catch(err => console.error('Error playing audio:', err));
        fadeOutAudio(audio);
      }
      setClickCounts(prev => ({
        ...prev,
        [numberValue]: (prev[numberValue] || 0) + 1
      }));

      const angle = Math.random() < 0.5 ? 10 : -10;
      setRotateAngle(angle);
      setAnimateCount(true);
      setTimeout(() => {
        setAnimateCount(false);
      }, 300);

      const { top, left } = getRandomPopupPosition();
      const popupId = Date.now();
      setPopups(prev => [...prev, { id: popupId, top, left }]);
      
      const pointerUpHandler = () => {
        isClickingRef.current = false;
        window.removeEventListener('pointerup', pointerUpHandler);
      };
      window.addEventListener('pointerup', pointerUpHandler);
    }
  };

  // 스킨 변경 (목업)
  const handleChangeSkin = () => {
    console.log("Change Skin 버튼 클릭");
  };

  // 캐릭터 변경: 4개 캐릭터 순환
  const handleChangeCharacter = () => {
    setNumberValue((prev) => (prev + 1) % 4);
  };

  return (
    <>
      {/* 통계 패널 */}
      <div className="stats-panel">
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>클릭 통계</div>
        <div><span>시부키:</span> <span>{clickCounts[0] || 0}</span></div>
        <div><span>나나:</span> <span>{clickCounts[1] || 0}</span></div>
        <div><span>리코:</span> <span>{clickCounts[2] || 0}</span></div>
        <div><span>린린:</span> <span>{clickCounts[3] || 0}</span></div>
      </div>

      {/* 게임 영역 */}
      <div className="container game-container">
        <div
          className="clickCounter"
          style={animateCount ? { transform: `scale(1.2) rotate(${rotateAngle}deg)` } : {}}
        >
          {clickCounts[numberValue] || 0}
        </div>

        <div className="riveContainer">
          <RiveComponent onPointerDown={handleInteraction} />
          {popups.map((popup) => (
            <span
              key={popup.id}
              className="popup"
              style={{ top: popup.top, left: popup.left }}
              onAnimationEnd={() => setPopups((old) => old.filter((p) => p.id !== popup.id))}
            >
              +1
            </span>
          ))}
        </div>

        <div className="buttonContainer">
          <button className="buttonSkin" onClick={handleChangeSkin}>
            스킨 변경
          </button>
          <button className="buttonCharacter" onClick={handleChangeCharacter}>
            캐릭터 변경
          </button>
        </div>
      </div>
    </>
  );
};

export default ClickerGame;