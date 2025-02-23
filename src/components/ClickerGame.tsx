"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faChevronUp, faChevronDown, faPaintBrush, faUser } from "@fortawesome/free-solid-svg-icons";
import "./ClickerGame.css";

type Popup = { id: number; top: string; left: string; message: string };

const getRandomPopupPosition = (): { top: string; left: string } => {
  const sides = ["top", "bottom", "left", "right"];
  const side = sides[Math.floor(Math.random() * sides.length)];
  let top = "50%", left = "50%";
  if (side === "top") {
    top = `${Math.random() * 10 + 10}%`;
    left = `${10 + Math.random() * 80}%`;
  } else if (side === "bottom") {
    top = `${Math.random() * 10 + 70}%`;
    left = `${10 + Math.random() * 80}%`;
  } else if (side === "left") {
    left = `${Math.random() * 10 + 10}%`;
    top = `${10 + Math.random() * 80}%`;
  } else {
    left = `${Math.random() * 10 + 70}%`;
    top = `${10 + Math.random() * 80}%`;
  }
  return { top, left };
};

const CHAR_SOUNDS = [
  "/asset/shibuki/debakbak.mp3",
  "/asset/shibuki/gomapdei.mp3",
  "/asset/shibuki/hiyongsa.mp3",
  "/asset/shibuki/nyo.mp3",
];
const CHAR_COLORS = ["#C2AFE6", "#DF7685", "#A6D0A6", "#2B66C0"];
const CHAR_POPUP_MESSAGES = ["+대박박", "+고맙데이", "+최고야!", "+쩌네!"];

const ClickerGame = () => {
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
  const [numberValue, setNumberValue] = useState<number>(() => Math.floor(Math.random() * 4)); // 변경된 초기값
  const [statsOpen, setStatsOpen] = useState(true);

  const fadeOutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isClickingRef = useRef(false);

  // 캐릭터 별로 다른 fadeout duration (밀리초)
  const fadeDurations = [1200, 1000, 1500, 1000];

  // clickCounts 로컬 저장
  useEffect(() => {
    localStorage.setItem("clickCounts", JSON.stringify(clickCounts));
  }, [clickCounts]);

  // 오디오 페이드아웃 함수
  const fadeOutAudio = useCallback((audio: HTMLAudioElement, duration = 1200) => {
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    const steps = 20, stepTime = duration / steps, fadeStep = audio.volume / steps;
    fadeOutIntervalRef.current = setInterval(() => {
      if (audio.volume > fadeStep) {
        audio.volume = Math.max(0, audio.volume - fadeStep);
      } else {
        audio.volume = 0;
        clearInterval(fadeOutIntervalRef.current!);
        fadeOutIntervalRef.current = null;
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      }
    }, stepTime);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = CHAR_COLORS[numberValue];
  }, [numberValue]);

  useEffect(() => {
    const audioEl = new Audio(CHAR_SOUNDS[numberValue]);
    audioEl.preload = "auto";
    setAudio(audioEl);
  }, [numberValue]);

  const { rive, RiveComponent } = useRive({
    src: "/asset/shibuki/shibuki.riv",
    stateMachines: "State Machine 1",
    artboard: "Artboard",
    autoplay: true,
  });
  const triggerInput = useStateMachineInput(rive, "State Machine 1", "Trigger 1");
  const numberInput = useStateMachineInput(rive, "State Machine 1", "number");

  useEffect(() => {
    if (numberInput) {
      numberInput.value = numberValue;
    }
  }, [numberValue, numberInput]);

  const handleInteraction = (e: React.PointerEvent) => {
    e.preventDefault();
    if (isClickingRef.current) return;
    if (triggerInput) {
      isClickingRef.current = true;
      triggerInput.fire();
      if (audio) {
        if (window.AudioContext) {
          const ctx = new AudioContext();
          if (ctx.state === "suspended") ctx.resume();
        }
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        audio.volume = 1;
        audio.currentTime = 0;
        audio.play().catch(err => console.error("Error playing audio:", err));
        // 전달하는 fadeout duration을 캐릭터별로 다르게 설정
        fadeOutAudio(audio, fadeDurations[numberValue]);
      }
      setClickCounts(prev => ({ ...prev, [numberValue]: (prev[numberValue] || 0) + 1 }));
      setRotateAngle(Math.random() < 0.5 ? 10 : -10);
      setAnimateCount(true);
      setTimeout(() => setAnimateCount(false), 300);
      const { top, left } = getRandomPopupPosition();
      const popupId = Date.now();
      setPopups(prev => [...prev, { id: popupId, top, left, message: CHAR_POPUP_MESSAGES[numberValue] }]);
      const pointerUpHandler = () => {
        isClickingRef.current = false;
        window.removeEventListener("pointerup", pointerUpHandler);
      };
      window.addEventListener("pointerup", pointerUpHandler);
    }
  };

  const handleChangeSkin = useCallback(() => {
    console.log("Change Skin 버튼 클릭");
  }, []);

  const handleChangeCharacter = useCallback(() => {
    setNumberValue(prev => (prev + 1) % 4);
  }, []);

  const handleResetStats = useCallback(() => {
    if (window.confirm("통계를 초기화 하시겠습니까?")) {
      setClickCounts({ 0: 0, 1: 0, 2: 0, 3: 0 });
    }
  }, []);

  return (
    <>
      <div className="stats-panel">
        <div className="stats-header">
            <div style={{ fontWeight: "bold" }}>
            <FontAwesomeIcon icon={faChartBar} />클릭 통계
            </div>
          <button className="toggle-stats-button" onClick={() => setStatsOpen(prev => !prev)}>
            <FontAwesomeIcon icon={statsOpen ? faChevronUp : faChevronDown} />
          </button>
        </div>
        {statsOpen && (
          <>
            <div>
              <span>시부키</span> <span>{clickCounts[0] || 0}</span>
            </div>
            <div>
              <span>나나</span> <span>{clickCounts[1] || 0}</span>
            </div>
            <div>
              <span>리코</span> <span>{clickCounts[2] || 0}</span>
            </div>
            <div>
              <span>린</span> <span>{clickCounts[3] || 0}</span>
            </div>
            <div>
              <button className="reset-button" onClick={handleResetStats}>
                통계 초기화
              </button>
            </div>
          </>
        )}
      </div>

      <div className="container game-container">
        <div className="clickCounter" style={animateCount ? { transform: `scale(1.2) rotate(${rotateAngle}deg)` } : {}}>
          {clickCounts[numberValue] || 0}
        </div>
        <div className="riveContainer">
          <RiveComponent onPointerDown={handleInteraction} />
          {popups.map(popup => (
            <span
              key={popup.id}
              className="popup"
              style={{ top: popup.top, left: popup.left }}
              onAnimationEnd={() => setPopups(old => old.filter(p => p.id !== popup.id))}
            >
              {popup.message}
            </span>
          ))}
        </div>
        <div className="buttonContainer">
          <button className="buttonSkin" onClick={handleChangeSkin}>
            <FontAwesomeIcon icon={faPaintBrush} /> 스킨 변경
          </button>
          <button className="buttonCharacter" onClick={handleChangeCharacter}>
            <FontAwesomeIcon icon={faUser} /> 캐릭터 변경
          </button>
        </div>
      </div>
    </>
  );
};

export default ClickerGame;