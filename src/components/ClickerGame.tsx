"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
// useStateMachineInput 제거 - 더이상 직접 사용하지 않음
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faChevronUp, faChevronDown, faPaintBrush, faUser, faVolumeUp, faVolumeMute, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import "./ClickerGame.css";

// Rive 컴포넌트 지연 로딩 및 타입 가져오기
const RiveComponentWrapper = lazy(() => import('../components/RiveWrapper').then(mod => ({ default: mod.default })));
import type { RiveWrapperHandle } from '../components/RiveWrapper';

const GAME_VERSION = "0.18.4";
const CHAR_NAMES = ["텐코 시부키", "하나코 나나", "유즈하 리코", "아오쿠모 린"];
const CHAR_SOUNDS = [
  "/asset/shibuki/debakbak.mp3",
  "/asset/shibuki/gomapdei.mp3",
  "/asset/shibuki/hiyongsa.mp3",
  "/asset/shibuki/nyo.mp3",
];
const CHAR_COLORS = ["#C2AFE6", "#DF7685", "#A6D0A6", "#2B66C0"];
const CHAR_POPUP_MESSAGES = ["+대박박", "+고맙데이", "+하이용사", "+뇨!"];
const SPECIAL_THRESHOLDS: { [key: number]: number[] } = {
  0: [1000, 2000, 3000], // 텐코 시부키
  1: [1000, 2000, 3000], // 하나코 나나
  2: [1000, 2000, 3000], // 유즈하 리코
  3: [1000, 2000, 3000] // 아오쿠모 린
};
type Popup = { id: number; top: string; left: string; message: string };

function adjustColor(hex: string, factor: number): string {
  const r = Math.min(255, Math.floor(parseInt(hex.slice(1,3), 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(hex.slice(3,5), 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(hex.slice(5,7), 16) * factor));
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}

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

const ClickerGame = () => {
  const [clickCounts, setClickCounts] = useState<{ [key: number]: number }>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("clickCounts");
      return stored ? JSON.parse(stored) : { 0: 0, 1: 0, 2: 0, 3: 0 };
    }
    return { 0: 0, 1: 0, 2: 0, 3: 0 };
  });
  //캐릭터 인덱스별로 도달한 임계값(배열) 저장
  const [specialTriggered, setSpecialTriggered] = useState<{ [key: number]: number[] }>({
    0: [],
    1: [],
    2: [],
    3: [],
  });
  const [animateCount, setAnimateCount] = useState(false);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [numberValue, setNumberValue] = useState<number>(() => Math.floor(Math.random() * 4)); // 변경된 초기값
  const [statsOpen, setStatsOpen] = useState(true);
  const [soundEnabled] = useState(true);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 50; // 서버에서는 기본값 50 반환
    const stored = localStorage.getItem("volume");
    return stored ? Number(stored) : 50;
  });
  const [volumeSliderVisible, setVolumeSliderVisible] = useState(false);
  const [avgSps, setAvgSps] = useState(0);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [fireworks, setFireworks] = useState<{ id: number; particles: { dx: number; dy: number }[] }[]>([]);
  const [isRiveLoaded, setIsRiveLoaded] = useState(false);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);

  const clickTimestampsRef = useRef<number[]>([]);
  const isClickingRef = useRef(false);
  const fadeDurations = [1200, 1000, 1800, 1000];  // 캐릭터 별로 다른 fadeout duration (밀리초)

  // 새 커스텀 훅 사용
  const { playSound, initializeAudio } = useAudioPlayer(soundEnabled, fadeDurations, CHAR_SOUNDS, volume);

  // RiveWrapper의 ref 추가
  const riveWrapperRef = useRef<RiveWrapperHandle>(null);

  // clickCounts 로컬 저장
  useEffect(() => {
    localStorage.setItem("clickCounts", JSON.stringify(clickCounts));
  }, [clickCounts]);

  // localStorage에 볼륨 저장
  useEffect(() => {
    localStorage.setItem("volume", volume.toString());
  }, [volume]);

  useEffect(() => {
    document.body.style.backgroundColor = CHAR_COLORS[numberValue];
    
    // IntersectionObserver를 사용하여 Rive 컴포넌트 뷰포트에 보이면 로드
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // 10ms 지연 후 Rive 로드 (초기 레이아웃 계산에 방해되지 않도록)
          setTimeout(() => setIsRiveLoaded(true), 10);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    const container = document.querySelector('.game-container');
    if (container) {
      observer.observe(container);
    }

    return () => observer.disconnect();
  }, [numberValue]);

  const handleInteraction = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (isClickingRef.current) return;
    isClickingRef.current = true;

    // 필요한 경우 ref를 통해 트리거 호출 가능
    // if (riveWrapperRef.current) {
    //   riveWrapperRef.current.fireTrigger();
    // }
    
    playSound(numberValue);
    setClickCounts(prev => ({ ...prev, [numberValue]: (prev[numberValue] || 0) + 1 }));
    clickTimestampsRef.current.push(Date.now());
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
  }, [playSound, numberValue]);

  // 최초 사용자 상호작용 시 오디오 초기화를 시도한 후 handleInteraction 호출
  const handleFirstInteraction = useCallback(async (e: React.PointerEvent) => {
    if (isFirstInteraction) {
      await initializeAudio();
      setIsFirstInteraction(false);
    }
    handleInteraction(e);
  }, [initializeAudio, handleInteraction, isFirstInteraction]);

  // SPS (Stel Per Second, 초당 클릭 수) 계산
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      clickTimestampsRef.current = clickTimestampsRef.current.filter(ts => now - ts <= 1000); // 최근 1초 클릭 수 계산
      const currentSps = clickTimestampsRef.current.length;
      setAvgSps(prev => prev * 0.9 + currentSps * 0.1); // 지수 가중 이동 평균 계산 (0.9, 0.1은 가중치)
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // 클릭 수 변경 시 모든 임계값 체크
  useEffect(() => {
    const currentCount = clickCounts[numberValue] || 0;
    const thresholds = SPECIAL_THRESHOLDS[numberValue] || [];
    thresholds.forEach(threshold => {
      if (currentCount === threshold && !specialTriggered[numberValue].includes(threshold)) {
        console.log(`${CHAR_NAMES[numberValue]}: 특수 이벤트 발생! (${threshold} 만큼 클릭)`);
        setSpecialTriggered(prev => ({
          ...prev,
          [numberValue]: [...prev[numberValue], threshold],
        }));
        // 각 입자는 랜덤 각도와 속도(80~150px)를 계산
        const particles = Array.from({ length: 8 }, () => {
          const angleRad = Math.random() * 2 * Math.PI;
          const speed = 80 + Math.random() * 70;
          return { dx: Math.cos(angleRad) * speed, dy: Math.sin(angleRad) * speed };
        });
        setFireworks(prev => [...prev, { id: Date.now(), particles }]);
      }
    });
  }, [clickCounts, numberValue, specialTriggered]);

  const handleSkinChange = useCallback(() => {
    // console.log("Change Skin 버튼 클릭"); // 제거
  }, []);

  const handleChangeCharacter = useCallback(() => {
    setNumberValue(prev => (prev + 1) % 4);
  }, []);

  const handleResetStats = useCallback(() => {
    if (window.confirm("통계를 초기화 하시겠습니까?")) {
      setClickCounts({ 0: 0, 1: 0, 2: 0, 3: 0 });
    }
  }, []);

  // 정보 모달 열기/닫기 핸들러
  const handleOpenInfo = useCallback(() => {
    setInfoModalOpen(true);
  }, []);
  const handleCloseInfo = useCallback(() => {
    setInfoModalOpen(false);
  }, []);

  return (
    <>
      <div className="sps-panel">
        <div>SPS: {avgSps.toFixed(1)}</div>
      </div>
      <div className="stats-panel">
        <div className="stats-header">
            <div style={{ fontWeight: "bold" }}>
            <FontAwesomeIcon icon={faChartBar} />클릭 통계
            </div>
          <button className="toggle-stats-button" 
            onClick={() => setStatsOpen(prev => !prev)}
            aria-label="통계 토글">
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
        <div className="character-name">{CHAR_NAMES[numberValue]}</div>
        <div className="clickCounterWrapper" style={{ position: "relative", display: "inline-block" }}>
          <div className="clickCounter" style={animateCount ? { transform: `scale(1.2) rotate(${rotateAngle}deg)` } : {}}>
            {clickCounts[numberValue] || 0}
          </div>
          {fireworks.map(fw => (
            <div
              key={fw.id}
              className="fireworks-container"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                "--bright-color": adjustColor(CHAR_COLORS[numberValue], 1.3)
              } as React.CSSProperties}
              onAnimationEnd={() => setFireworks(old => old.filter(f => f.id !== fw.id))}
            >
              {fw.particles.map((p, idx) => (
                <span
                  key={idx}
                  className="firework"
                  style={{
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`
                  } as React.CSSProperties}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="riveContainer">
          {isRiveLoaded ? (
            <Suspense fallback={<div className="rive-loading">캐릭터 로딩 중...</div>}>
              <RiveComponentWrapper 
                ref={riveWrapperRef}
                src="/asset/shibuki/shibuki.riv"
                stateMachine="State Machine 1"
                artboard="Artboard"
                onPointerDown={handleFirstInteraction}
                numberValue={numberValue}
              />
            </Suspense>
          ) : (
            <div 
              className="rive-placeholder" 
              onClick={() => setIsRiveLoaded(true)}
            >
              클릭하여 캐릭터 로드
            </div>
          )}
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
          <button className="buttonSkin" 
            onClick={handleSkinChange}
            style={{ backgroundColor: adjustColor(CHAR_COLORS[numberValue], 0.7) }}
            aria-label="스킨 변경">
            <FontAwesomeIcon icon={faPaintBrush} /> 스킨 변경
          </button>
          <button className="buttonCharacter" 
            onClick={handleChangeCharacter}
            style={{ backgroundColor: adjustColor(CHAR_COLORS[numberValue], 0.7) }}
            aria-label="캐릭터 변경">
            <FontAwesomeIcon icon={faUser} /> 캐릭터 변경
          </button>
          <div style={{ position: "relative", display: "inline-block", top: "10px" }}>
            <button className="buttonSpeaker" 
              onClick={() => setVolumeSliderVisible(prev => !prev)}
              aria-label="볼륨 조절">
              <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
            </button>
            {volumeSliderVisible && (
              <input
                type="range"
                className="volume-slider" // 추가된 클래스
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="볼륨 조절 슬라이더"
                style={{ 
                  position: "absolute", 
                  bottom: "230%",
                  left: "50%", 
                  transform: "translateX(-50%) rotate(-90deg)",
                  width: "100px",
                  background: adjustColor(CHAR_COLORS[numberValue], 0.7) // 캐릭터 배경보다 어두운 색
                }}
              />
            )}
          </div>
          <button className="buttonInfo" 
            onClick={handleOpenInfo}
            aria-label="정보 열기">
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
        </div>
      </div>
      {infoModalOpen && (
        <>
          <div className="info-overlay" onClick={handleCloseInfo} />
          <div className="info-modal" role="dialog" aria-modal="true">
            <button className="close-button" onClick={handleCloseInfo} aria-label="모달 닫기">×</button>
            <h2>
              <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: "0.5rem" }} />
              스텔클릭커 정보
            </h2>
            <p>스텔라이브 3기생들을 클릭하는 게임입니다.</p>
            <p>여러 기능들을 경험해 보세요!</p>
            <p>버전 {GAME_VERSION} # 웹사이트 성능 최적화 (린 아직 미구현)</p>
            <div style={{ position: "absolute", bottom: "10px", right: "10px" }}>
              <a href="https://github.com/yulmu-catsetki/stelclicker" target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faGithub}/>
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ClickerGame;