"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  lazy,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faChevronUp,
  faChevronDown,
  faUser,
  faVolumeUp,
  faVolumeMute,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { Analytics } from "@vercel/analytics/react";

// 자체 훅과 상수 임포트
import { useGameState } from "../hooks/useGameState";
import { usePopupMessage } from "../hooks/usePopupMessage";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { Character, CHARACTER_INFO, GAME_VERSION } from "./models/constants";

// Rive 컴포넌트 지연 로딩
const RiveComponentWrapper = lazy(() => import("../components/RiveWrapper"));
import type { RiveWrapperHandle } from "../components/RiveWrapper";

// 팝업 메시지 컴포넌트
import { PopupMessage } from "./PopupMessage";

const ClickerGame: React.FC = () => {
  // 게임 상태 관리 훅
  const {
    gameState,
    incrementClickCount,
    changeCharacter,
    updateAvgSps,
    resetStats,
  } = useGameState();

  // 팝업 메시지 훅
  const { popups, addPopup, removePopup } = usePopupMessage();

  // 오디오 플레이어 훅
  const { playSound, initializeAudio } = useAudioPlayer(
    true,
    [1200, 1000, 1800, 1000], // 각 캐릭터별 페이드 아웃 시간
    Object.values(CHARACTER_INFO).map((char) => char.sound),
    50 // 기본 볼륨
  );

  // Ref들
  const clickAreaRef = useRef<HTMLDivElement>(null);
  const riveWrapperRef = useRef<RiveWrapperHandle>(null);
  const clickTimestampsRef = useRef<number[]>([]);
  const isClickingRef = useRef(false);
  const isAudioInitializedRef = useRef(false);
  const pendingPlayRef = useRef<number | null>(null);

  // 상태 변수들
  const [animateCount, setAnimateCount] = useState(false);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [statsOpen, setStatsOpen] = useState(true);
  const [volumeSliderVisible, setVolumeSliderVisible] = useState(false);
  const [volume, setVolume] = useState(50);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [isRiveLoaded, setIsRiveLoaded] = useState(false);

  // 클릭 핸들러
  const handleClick = useCallback(async () => {
    // 클릭 상태 방지
    if (isClickingRef.current) return;
    isClickingRef.current = true;

    const currentCharacter = gameState.currentCharacter;
    const characterInfo = CHARACTER_INFO[currentCharacter];

    // 클릭 카운트 증가
    incrementClickCount();

    // 클릭 타임스탬프 추가 및 SPS 계산
    const now = Date.now();
    clickTimestampsRef.current.push(now);
    const recentClicks = clickTimestampsRef.current.filter(
      (ts) => now - ts <= 1000
    );
    const currentSps = recentClicks.length;
    updateAvgSps(currentSps);

    // 오디오 초기화 및 재생
    if (!isAudioInitializedRef.current) {
      pendingPlayRef.current = currentCharacter;
      try {
        await initializeAudio();
        isAudioInitializedRef.current = true;
        playSound(currentCharacter);
        pendingPlayRef.current = null;
      } catch (err) {
        console.error("오디오 초기화 오류:", err);
      }
    } else {
      playSound(currentCharacter);
    }

    // Rive 트리거
    if (riveWrapperRef.current) {
      riveWrapperRef.current.fireTrigger();
    }

    // 시각적 효과
    setRotateAngle(Math.random() < 0.5 ? 10 : -10);
    setAnimateCount(true);
    setTimeout(() => setAnimateCount(false), 300);

    // 팝업 메시지 추가
    if (clickAreaRef.current) {
      // Use a type assertion to ensure non-null ref
      addPopup(
        characterInfo.popupMessage,
        clickAreaRef as React.RefObject<HTMLDivElement>
      );
    }

    // 클릭 상태 초기화
    const upHandler = () => {
      isClickingRef.current = false;
      window.removeEventListener("pointerup", upHandler);
    };
    window.addEventListener("pointerup", upHandler);
  }, [
    gameState.currentCharacter,
    incrementClickCount,
    updateAvgSps,
    initializeAudio,
    playSound,
    addPopup,
  ]);

  // 볼륨 및 기타 부수 효과
  useEffect(() => {
    document.body.style.backgroundColor =
      CHARACTER_INFO[gameState.currentCharacter].color;

    // Rive 컴포넌트 로딩
    setTimeout(() => setIsRiveLoaded(true), 500);
  }, [gameState.currentCharacter]);

  // 기타 핸들러들
  const handleOpenInfo = useCallback(() => setInfoModalOpen(true), []);
  const handleCloseInfo = useCallback(() => setInfoModalOpen(false), []);
  const handleResetStats = useCallback(() => {
    if (window.confirm("통계를 초기화 하시겠습니까?")) {
      resetStats();
    }
  }, [resetStats]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(Number(e.target.value));
    },
    []
  );

  return (
    <>
      {/* SPS 패널 */}
      <div className="fixed top-1 right-1 bg-semi-transparent-dark p-1 rounded-md text-white text-base z-10">
        <div>SPS: {gameState.avgSps.toFixed(2)}</div>
        <Analytics />
      </div>

      {/* 통계 패널 */}
      <div className="fixed top-1 left-1 bg-semi-transparent-dark p-1 rounded-md text-white text-base z-10">
        <div className="flex justify-between items-center">
          <div className="font-bold">
            <FontAwesomeIcon icon={faChartBar} /> 통계
          </div>
          <button
            className="bg-transparent border-0 text-white text-base cursor-pointer"
            onClick={() => setStatsOpen((prev) => !prev)}
            aria-label="통계 토글"
          >
            {statsOpen ? (
              <FontAwesomeIcon icon={faChevronUp} />
            ) : (
              <FontAwesomeIcon icon={faChevronDown} />
            )}
          </button>
        </div>
        {statsOpen && (
          <>
            {Object.values(Character)
              .filter((char) => typeof char === "number")
              .map((char) => (
                <div key={char} className="flex justify-between items-center">
                  <span>{CHARACTER_INFO[char as Character].name}</span>
                  <span>{gameState.clickCounts[char as Character] || 0}</span>
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

      {/* 메인 게임 컨테이너 */}
      <div className="container w-full min-h-screen m-0 py-2.5 px-0 flex flex-col items-center justify-center max-w-full overflow-hidden">
        {/* 상단 컨텐츠: 캐릭터 이름 및 카운터 */}
        <div className="w-full max-w-36r flex flex-col items-center relative z-10 mb-4">
          {/* 캐릭터 이름 */}
          <div className="text-white text-3xl md:text-2xl xs:text-xl tiny:text-lg mb-1 leading-tight font-bold">
            {CHARACTER_INFO[gameState.currentCharacter].name}
          </div>

          {/* 클릭 카운터 */}
          <div className="relative inline-block w-auto m-0">
            <div
              className="text-6xl md:text-5xl xs:text-4xl tiny:text-3xl font-extrabold text-white transition-transform duration-300 select-none"
              style={
                animateCount
                  ? { transform: `scale(1.2) rotate(${rotateAngle}deg)` }
                  : {}
              }
            >
              {gameState.clickCounts[gameState.currentCharacter] || 0}
            </div>
          </div>
        </div>

        {/* Rive 컨테이너 */}
        <div className="w-full flex justify-center items-center relative">
          <div
            ref={clickAreaRef}
            className="w-full max-w-36r aspect-square relative mx-auto md:max-w-[90%] 2xl:max-w-42r"
            style={{
              maxHeight: "min(70vh, 600px)",
            }}
          >
            {isRiveLoaded ? (
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-white text-2xl bg-semi-transparent rounded-xl cursor-pointer">
                    캐릭터 로딩 중...
                  </div>
                }
              >
                <RiveComponentWrapper
                  ref={riveWrapperRef}
                  src={`/asset/shibuki/shibuki.riv?v=${GAME_VERSION.replace(
                    /\./g,
                    ""
                  )}`}
                  stateMachine="State Machine 1"
                  artboard="Artboard"
                  onPointerDown={handleClick}
                  numberValue={gameState.currentCharacter}
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

            {/* 팝업 메시지 */}
            <PopupMessage
              popups={popups}
              onRemove={removePopup}
              characterColor={CHARACTER_INFO[gameState.currentCharacter].color}
            />
          </div>
        </div>

        {/* 버튼 컨테이너 - 위치 조정 */}
        <div className="flex gap-3 md:gap-2.5 xs:gap-1.5 flex-wrap justify-center w-full max-w-lg p-0 px-2.5 relative z-10 mt-4 mb-3 md:mb-5 xs:mb-4 landscape:absolute landscape:right-0 landscape:top-1/2 landscape:-translate-y-1/2 landscape:flex-col landscape:w-auto landscape:h-auto landscape:m-0 landscape:gap-3 landscape:bg-semi-transparent landscape:p-1 landscape:rounded-l-md">
          {/* 캐릭터 변경 버튼 */}
          <button
            className="bg-transparent border-0 p-0 cursor-pointer text-2xl md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200"
            onClick={changeCharacter}
            aria-label="캐릭터 변경"
          >
            <FontAwesomeIcon icon={faUser} />
          </button>

          {/* 볼륨 컨트롤 */}
          <div className="relative flex items-center">
            <button
              className="bg-transparent border-0 p-0 cursor-pointer text-2xl md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200 z-20"
              onClick={() => setVolumeSliderVisible((prev) => !prev)}
              aria-label="볼륨 조절"
            >
              <FontAwesomeIcon
                icon={volume === 0 ? faVolumeMute : faVolumeUp}
              />
            </button>

            <div
              className="volume-slider-container overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                width: volumeSliderVisible ? "96px" : "0px",
                opacity: volumeSliderVisible ? 1 : 0,
                marginLeft: volumeSliderVisible ? "8px" : "0px",
              }}
            >
              <input
                type="range"
                className="h-1.5 rounded-lg appearance-none bg-gray-700 cursor-pointer w-24"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                aria-label="볼륨 조절 슬라이더"
              />
            </div>
          </div>
          {/* 정보 버튼 */}
          <button
            className="bg-transparent border-0 p-0 cursor-pointer text-2xl md:text-xl xs:text-lg text-white flex items-center justify-center transition-colors w-10 h-10 md:w-9 md:h-9 xs:w-8 xs:h-8 tiny:w-6 tiny:h-6 hover:text-gray-200"
            onClick={handleOpenInfo}
            aria-label="정보 열기"
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
