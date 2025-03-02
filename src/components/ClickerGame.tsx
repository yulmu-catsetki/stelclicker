"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faChevronUp, faChevronDown, faPaintBrush, faUser, faVolumeUp, faVolumeMute, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { Analytics } from "@vercel/analytics/react";

// Rive 컴포넌트 지연 로딩 변경 - dynamic import로 수정
const RiveComponentWrapper = lazy(() => 
  import('../components/RiveWrapper')
);
import type { RiveWrapperHandle } from '../components/RiveWrapper';

const GAME_VERSION = "1.3.1"; // 버전 업데이트
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
  3: [1000, 2000, 3000]  // 아오쿠모 린
};
type Popup = { 
  id: number; 
  top: string; 
  left: string; 
  message: string;
  rotation: number; // 회전 각도 추가
  scale: number;    // 크기 추가 
};

function adjustColor(hex: string, factor: number): string {
  const r = Math.min(255, Math.floor(parseInt(hex.slice(1,3), 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(hex.slice(3,5), 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(hex.slice(5,7), 16) * factor));
  return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
}

const ClickerGame = () => {
  const [clickCounts, setClickCounts] = useState<{ [key: number]: number }>(() => {
    try {
      if (typeof window !== "undefined") {
        const storedVersion = localStorage.getItem("gameVersion");
        const stored = localStorage.getItem("clickCounts");
        // 버전이 다르거나 없으면 캐시를 초기화하되 클릭 통계는 유지
        if (!storedVersion || storedVersion !== GAME_VERSION) {
          console.log("게임 버전이 변경되어 캐시를 초기화합니다.");
          const tempClickCounts = stored ? JSON.parse(stored) : { 0: 0, 1: 0, 2: 0, 3: 0 };
          // 모든 캐시 초기화
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== "clickCounts") {
              localStorage.removeItem(key);
            }
          }
          // 클릭 통계와 새 버전 저장
          localStorage.setItem("clickCounts", JSON.stringify(tempClickCounts));
          localStorage.setItem("gameVersion", GAME_VERSION);
          return tempClickCounts;
        } 
        return stored ? JSON.parse(stored) : { 0: 0, 1: 0, 2: 0, 3: 0 };
      } 
    } catch (error) {
      console.error("캐시 초기화 중 오류 발생:", error);
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
  const [isLandscape, setIsLandscape] = useState(false);
  const clickTimestampsRef = useRef<number[]>([]);
  const isClickingRef = useRef(false);
  const fadeDurations = [1200, 1000, 1800, 1000];  // 캐릭터 별로 다른 fadeout duration (밀리초)
  // 새 커스텀 훅 사용
  const { playSound, initializeAudio } = useAudioPlayer(soundEnabled, fadeDurations, CHAR_SOUNDS, volume);
  // RiveWrapper의 ref 추가
  const riveWrapperRef = useRef<RiveWrapperHandle>(null);
  // riv 파일 URL에 버전 추가하는 함수
  const getRivePath = useCallback(() => {
    return `/asset/shibuki/shibuki.riv?v=${GAME_VERSION.replace(/\./g, '')}`;
  }, []);
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
    
    // IntersectionObserver 코드 간소화
    setTimeout(() => {
      // 페이지 로드 즉시 Rive 컴포넌트 로드 시작
      setIsRiveLoaded(true);
    }, 500); // 약간의 지연 추가
    
  }, [numberValue]);
    
  // 이벤트 핸들러 통합 (모든 클릭 이벤트 처리를 한 곳에서)
  const clickAreaRef = useRef<HTMLDivElement>(null); // 클릭 영역 ref 추가
  
  // 업데이트된 팝업 위치 계산 함수 - Rive 컴포넌트 내부에 표시
  const getRandomPopupPosition = useCallback((): { top: string; left: string } => {
    if (!clickAreaRef.current) {
      return { top: '50%', left: '50%' }; // 기본값
    }
    
    // 가장자리에서 10-20% 안쪽으로 위치하도록 설정
    const edgeBuffer = 0.1 + Math.random() * 0.1; // 10-20% 버퍼
    
    // 랜덤 위치 계산 (가장자리에서 안쪽으로)
    const left = edgeBuffer + Math.random() * (1 - 2 * edgeBuffer);
    const top = edgeBuffer + Math.random() * (1 - 2 * edgeBuffer);
    
    return { 
      top: `${top * 100}%`, 
      left: `${left * 100}%` 
    };
  }, []);
  
  // 첫 클릭 시 소리 재생 문제 해결을 위한 상태 추가
  const isAudioInitializedRef = useRef(false);
  const pendingPlayRef = useRef<number | null>(null);

  // 페이지 로드 시 오디오 시스템 준비
  useEffect(() => {
    if (isRiveLoaded && !isAudioInitializedRef.current) {
      const userInteractionHandler = async () => {
        try {
          await initializeAudio();
          isAudioInitializedRef.current = true;
          
          // 초기화 후 대기 중인 소리 재생 처리
          if (pendingPlayRef.current !== null) {
            playSound(pendingPlayRef.current);
            pendingPlayRef.current = null;
          }
          
          // 한 번만 실행되도록 이벤트 리스너 제거
          ['click', 'touchstart', 'pointerdown'].forEach(event => {
            document.removeEventListener(event, userInteractionHandler);
          });
        } catch (err) {
          console.warn("오디오 초기화 실패:", err);
        }
      };
      
      // 사용자 상호작용을 감지하는 이벤트 리스너 추가
      ['click', 'touchstart', 'pointerdown'].forEach(event => {
        document.addEventListener(event, userInteractionHandler, { once: true });
      });
      
      return () => {
        ['click', 'touchstart', 'pointerdown'].forEach(event => {
          document.removeEventListener(event, userInteractionHandler);
        });
      };
    }
  }, [isRiveLoaded, initializeAudio, playSound]);

  // 업데이트된 클릭 핸들러
  const handleClickWithAnimation = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    
    // 이미 클릭 상태면 무시
    if (isClickingRef.current) return;
    isClickingRef.current = true;
    
    console.log("클릭 이벤트 감지!");
    
    // Rive 트리거 호출
    if (riveWrapperRef.current) {
      riveWrapperRef.current.fireTrigger();
    }
    
    // 오디오 처리 - 사용자 상호작용 내에서 오디오 초기화 및 재생
    if (!isAudioInitializedRef.current) {
      // 아직 초기화되지 않았다면, 초기화 후 재생
      pendingPlayRef.current = numberValue;
      initializeAudio()
        .then(() => {
          isAudioInitializedRef.current = true;
          playSound(numberValue);
          pendingPlayRef.current = null;
        })
        .catch(err => {
          console.error("오디오 초기화 중 오류:", err);
        });
    } else {
      // 이미 초기화된 경우 바로 소리 재생
      playSound(numberValue);
    }
    
    // 카운트 증가 및 나머지 처리
    setClickCounts(prev => ({ ...prev, [numberValue]: (prev[numberValue] || 0) + 1 }));
    clickTimestampsRef.current.push(Date.now());
    
    // 시각 효과
    setRotateAngle(Math.random() < 0.5 ? 10 : -10);
    setAnimateCount(true);
    setTimeout(() => setAnimateCount(false), 300);
    
    // 팝업 메시지
    const { top, left } = getRandomPopupPosition();
    const popupId = Date.now();
    const rotation = Math.random() * 30 - 15;
    const scale = 0.8 + Math.random() * 0.4;
    
    setPopups(prev => [...prev, { 
      id: popupId, 
      top, 
      left, 
      message: CHAR_POPUP_MESSAGES[numberValue],
      rotation,
      scale
    }]);
    
    // 클릭 상태 초기화
    const upHandler = () => {
      isClickingRef.current = false;
      window.removeEventListener("pointerup", upHandler);
    };
    window.addEventListener("pointerup", upHandler);
  }, [playSound, numberValue, initializeAudio, riveWrapperRef, getRandomPopupPosition]);

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
    // console.log("Change Skin 버튼 클릭"); // 언젠가...?
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

  // 볼륨 슬라이더 관련 상태
  const [volumeSliderWidth, setVolumeSliderWidth] = useState(0);
  const volumeSliderRef = useRef<HTMLInputElement>(null);
  
  // 볼륨 버튼 클릭 핸들러 개선 - duration은 CSS에서 관리
  const handleVolumeClick = useCallback(() => {
    setVolumeSliderVisible(prev => !prev);
    
    if (!volumeSliderVisible && volumeSliderRef.current) {
      setVolumeSliderWidth(0);
      requestAnimationFrame(() => {
        setVolumeSliderWidth(100);
      });
    } else {
      setVolumeSliderWidth(0);
    }
  }, [volumeSliderVisible]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  return (
    <>
      {/* SPS 패널 */}
      <div className="fixed top-1 right-1 bg-semi-transparent-dark p-1 rounded-md text-white text-base z-10">
        <div>SPS: {avgSps.toFixed(2)}</div>
        <Analytics />
      </div>

      {/* 통계 패널 */}
      <div className="fixed top-1 left-1 bg-semi-transparent-dark p-1 rounded-md text-white text-base z-10">
        <div className="flex justify-between items-center">
          <div className="font-bold">
            <FontAwesomeIcon icon={faChartBar} />
          </div>
          <button 
            className="bg-transparent border-0 text-white text-base cursor-pointer"
            onClick={() => setStatsOpen(prev => !prev)}
            aria-label="통계 토글"
          >
            {statsOpen ? <FontAwesomeIcon icon={faChevronUp} /> : <FontAwesomeIcon icon={faChevronDown} />}
          </button>
        </div>
        {statsOpen && (
          <>
            {CHAR_NAMES.map((name, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span>{idx === 0 ? "시부키" : idx === 1 ? "나나" : idx === 2 ? "리코" : "린"}</span>
                <span>{clickCounts[idx] || 0}</span>
              </div>
            ))}
            <div>
              <button 
                className="bg-transparent border-0 text-white text-inherit cursor-pointer p-0 underline"
                onClick={handleResetStats}
              >
                통계 초기화
              </button>
            </div>
          </>
        )}
      </div>

      {/* 메인 게임 컨테이너 - 전체 화면 높이 및 flex 구조 수정 */}
      <div className="container w-full min-h-screen m-0 py-2.5 px-0 flex flex-col items-center justify-center max-w-full overflow-hidden">
        {/* 상단 컨텐츠: 캐릭터 이름 및 카운터 */}
        <div className="w-full max-w-36r flex flex-col items-center relative z-10 mb-4">
          {/* 캐릭터 이름 */}
          <div className="text-white text-3xl md:text-2xl xs:text-xl tiny:text-lg mb-1 leading-tight font-bold">
            {CHAR_NAMES[numberValue]}
          </div>
          
          {/* 클릭 카운터 */}
          <div className="relative inline-block w-auto m-0">
            <div 
              className="text-6xl md:text-5xl xs:text-4xl tiny:text-3xl font-extrabold text-white transition-transform duration-300 select-none"
              style={animateCount ? { transform: `scale(1.2) rotate(${rotateAngle}deg)` } : {}}
            >
              {clickCounts[numberValue] || 0}
            </div>
            
            {/* 폭죽 효과 */}
            {fireworks.map(fw => (
              <div
                key={fw.id}
                className="fireworks-container pointer-events-none absolute top-0 left-0 w-full h-full"
                style={{ "--bright-color": adjustColor(CHAR_COLORS[numberValue], 1.3) } as React.CSSProperties}
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
        </div>
        
        {/* Rive 컨테이너 - 짤림 문제 해결 및 중앙 정렬 */}
        <div className="w-full flex justify-center items-center relative">
          <div 
            ref={clickAreaRef}
            className="w-full max-w-36r aspect-square relative mx-auto md:max-w-[90%] 2xl:max-w-42r"
            style={{ 
              maxHeight: 'min(70vh, 600px)',  // 높이 제한을 vh와 절대값 중 작은 값으로 설정
            }}
          >
            {isRiveLoaded ? (
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center text-white text-2xl bg-semi-transparent rounded-xl cursor-pointer">
                  캐릭터 로딩 중...
                </div>
              }>
                <RiveComponentWrapper 
                  ref={riveWrapperRef}
                  src={getRivePath()}
                  stateMachine="State Machine 1"
                  artboard="Artboard"
                  onPointerDown={handleClickWithAnimation} 
                  numberValue={numberValue}
                />
              </Suspense>
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white text-2xl bg-semi-transparent rounded-xl cursor-pointer border-2 border-dashed border-opacity-30 border-white"
                onClick={() => setIsRiveLoaded(true)}
              >
                클릭하여 캐릭터 로드
              </div>
            )}
            
            {/* 팝업 메시지 - 스타일 및 애니메이션 개선 */}
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
                  fontWeight: 'bold' 
                }}
                onAnimationEnd={() => setPopups(old => old.filter(p => p.id !== popup.id))}
              >
                {popup.message}
              </span>
            ))}
          </div>
        </div>
        
        {/* 버튼 컨테이너 - 위치 조정 */}
        <div className="flex gap-3 md:gap-2.5 xs:gap-1.5 flex-wrap justify-center w-full max-w-lg p-0 px-2.5 relative z-10 mt-4 mb-3 md:mb-5 xs:mb-4 landscape:absolute landscape:right-0 landscape:top-1/2 landscape:-translate-y-1/2 landscape:flex-col landscape:w-auto landscape:h-auto landscape:m-0 landscape:gap-3 landscape:bg-semi-transparent landscape:p-1 landscape:rounded-l-md">
          {/* 스킨 변경 버튼 */}
          <button 
            className="bg-transparent border-0 p-0 cursor-pointer text-2xl md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200"
            onClick={handleSkinChange}
            aria-label="스킨 변경"
          >
            <FontAwesomeIcon icon={faPaintBrush} />
          </button>
          
          {/* 캐릭터 변경 버튼 */}
          <button 
            className="bg-transparent border-0 p-0 cursor-pointer text-2xl md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200"
            onClick={handleChangeCharacter}
            aria-label="캐릭터 변경"
          >
            <FontAwesomeIcon icon={faUser} />
          </button>
          
          {/* 볼륨 컨트롤 - 개선된 레이아웃 */}
          <div className="relative flex items-center">
            <button 
              className="bg-transparent border-0 p-0 cursor-pointer text-2xl md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200 z-20"
              onClick={handleVolumeClick}
              aria-label="볼륨 조절"
            >
              <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
            </button>
            
            {/* 절대 위치로 변경, 버튼 레이아웃에 영향 X */}
            <div 
              className={`absolute overflow-hidden transition-all duration-300 ease-in-out flex items-center
                ${volumeSliderVisible ? 'opacity-100' : 'opacity-0'}
                ${isLandscape ? '-left-32 top-1/2 -translate-y-1/2' : 'left-full top-1/2 -translate-y-1/2'}
              `}
              style={{ 
                width: volumeSliderVisible ? (
                  isLandscape ? '8rem' : `${volumeSliderWidth}px`
                ) : '0px'
              }}
            >
              <input
                ref={volumeSliderRef}
                type="range"
                className={`
                  h-1.5 rounded-lg appearance-none bg-gray-700 
                  landscape:w-24 landscape:transform landscape:rotate-0
                  cursor-pointer w-24 mx-2
                `}
                style={{ 
                  outline: 'none',
                  boxShadow: '0 0 3px rgba(0,0,0,0.2)',
                  accentColor: '#555',
                }}
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="볼륨 조절 슬라이더"
              />
            </div>
          </div>
          
          {/* 정보 버튼 */}
          <button 
            className={`
              bg-transparent border-0 p-0 cursor-pointer text-2xl
              md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200
              ${(!isLandscape && volumeSliderVisible) ? 'ml-24' : ''}
            `}
            onClick={handleOpenInfo}
            aria-label="정보 열기"
            style={{ transition: 'margin 0.3s ease-in-out' }}
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </button>
        </div>
      </div>

      {/* 정보 모달 */}
      {infoModalOpen && (
        <>
          <div 
            className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[1100]" 
            onClick={handleCloseInfo} 
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg z-[1200] w-[500px] max-w-[95%] text-black" 
            role="dialog" 
            aria-modal="true"
          >
            <button 
              className="absolute top-2 right-3 bg-transparent border-0 text-lg cursor-pointer" 
              onClick={handleCloseInfo} 
              aria-label="모달 닫기"
            >
              ×
            </button>
            <h2 className="flex items-center text-xl font-bold mb-4">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              스텔클릭커 정보
            </h2>
            <p className="mb-2">스텔라이브 3기생들을 클릭하는 게임입니다.</p>
            <p className="mb-2">여러 기능들을 경험해 보세요!</p>
            <p>버전 {GAME_VERSION}</p>
            <div className="absolute bottom-2.5 right-2.5">
              <a 
                href="https://github.com/yulmu-catsetki/stelclicker" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-700 hover:text-black"
              >
                <FontAwesomeIcon icon={faGithub} size="lg" />
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ClickerGame;