import { useEffect, useRef, useCallback, useState } from "react";

// 오디오 캐시를 위한 공유 객체 - 앱 전체에서 재사용
const audioCache: { [url: string]: AudioBuffer } = {};

export function useAudioPlayer(
  soundEnabled: boolean,
  fadeDurations: number[],
  charSounds: string[],
  volume: number  // 네 번째 인자 추가
): { playSound: (index: number) => Promise<void>, initializeAudio: () => Promise<void> } {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<AudioBuffer[]>([]);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isInitializedRef = useRef(false);
  const fadeOutTimerRef = useRef<number | null>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsReady(true);
    }
  }, []);

  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current || !soundEnabled) return;
    
    // 이미 로딩 중이라면 해당 Promise 반환
    if (loadingPromiseRef.current) return loadingPromiseRef.current;
    
    loadingPromiseRef.current = new Promise<void>(async (resolve) => {
      try {
        // iOS/Safari 호환성 개선: 오디오 컨텍스트를 resume 상태로 시작
        // any 타입 사용 대신 적절한 타입 지정
        const AudioContextClass = window.AudioContext || 
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          
        if (!AudioContextClass) {
          console.error("AudioContext not supported in this browser");
          return resolve();
        }
        
        audioContextRef.current = new AudioContextClass();
        
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
        
        // 오디오 데이터 미리 로드
        const loadPromises = charSounds.map(async (url, index) => {
          try {
            // 캐시에 있는지 확인
            if (audioCache[url]) {
              audioBuffersRef.current[index] = audioCache[url];
              return;
            }
            
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
            
            // 캐시에 저장
            audioCache[url] = audioBuffer;
            audioBuffersRef.current[index] = audioBuffer;
          } catch (err) {
            console.error(`Failed to load audio ${url}:`, err);
          }
        });
        
        await Promise.all(loadPromises);
        
        // 사일런트 오디오 재생 (일부 브라우저에서 오디오 활성화 트릭)
        const silentBuffer = audioContextRef.current.createBuffer(1, 1, 22050);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
        
        isInitializedRef.current = true;
        resolve();
      } catch (error) {
        console.error("Audio initialization failed:", error);
        resolve(); // 에러가 있어도 Promise는 완료
      } finally {
        loadingPromiseRef.current = null;
      }
    });
    
    return loadingPromiseRef.current;
  }, [charSounds, soundEnabled]);

  useEffect(() => {
    const handleFocus = async () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        try {
          await audioContextRef.current.resume();
          console.log("Audio context resumed on focus.");
        } catch (error) {
          console.error("Audio context resume failed:", error);
        }
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const playSound = useCallback(
    async (index: number) => {
      // 호출 즉시 오디오 초기화 시도 (이미 초기화된 경우는 무시됨)
      if (!isInitializedRef.current) {
        await initializeAudio();
      }
      
      if (!isReady || !soundEnabled || !isInitializedRef.current) return;
      if (volume === 0) return; // 볼륨이 0이면 소리를 재생하지 않음 (완전 침묵)
      try {
        // 항상 resume 시도
        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }
        if (fadeOutTimerRef.current !== null) {
          clearTimeout(fadeOutTimerRef.current);
          fadeOutTimerRef.current = null;
        }
        if (currentAudioSourceRef.current) {
          try {
            currentAudioSourceRef.current.stop();
            currentAudioSourceRef.current.disconnect();
          } catch {
            // 이미 정지된 소스에 대한 에러 무시
          }
          currentAudioSourceRef.current = null;
        }
        
        // 버퍼 존재 여부 확인
        if (!audioBuffersRef.current[index]) {
          console.warn(`Audio buffer at index ${index} not loaded yet`);
          return;
        }

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffersRef.current[index];
        currentAudioSourceRef.current = source;
        const gainNode = audioContextRef.current!.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);

        const volumeFactor = volume / 200; // 볼륨 조절
        gainNode.gain.setValueAtTime(0.001, audioContextRef.current!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          volumeFactor,
          audioContextRef.current!.currentTime + 0.01
        );
        source.start(0, 0);
        const fadeDuration = fadeDurations[index] / 1000;
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContextRef.current!.currentTime + fadeDuration * 1.2
        );
        fadeOutTimerRef.current = window.setTimeout(() => {
          try {
            source.stop();
          } catch {
            // 이미 정지된 소스에 대한 에러 무시
          }
          source.disconnect();
          gainNode.disconnect();
          currentAudioSourceRef.current = null;
          fadeOutTimerRef.current = null;
        }, fadeDuration * 1.2 * 1000);
      } catch (error) {
        console.error("Sound playback error:", error);
      }
    },
    [isReady, soundEnabled, fadeDurations, volume, initializeAudio] // volume dependency 추가
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (fadeOutTimerRef.current !== null) {
        clearTimeout(fadeOutTimerRef.current);
      }
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop();
          currentAudioSourceRef.current.disconnect();
        } catch {
          // 무시
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  return { playSound, initializeAudio };
}

export function useAudioPlayerSingle(audioFile: string) { // export function으로 변경
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  useEffect(() => {
    const initializeAudio = async () => {
      if (typeof window !== 'undefined') {
        const context = new AudioContext();
        setAudioContext(context);

        try {
          const response = await fetch(audioFile);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = await context.decodeAudioData(arrayBuffer);
          setAudioBuffer(buffer);
        } catch (error) {
          console.error("Error loading audio:", error);
        }
      }
    };

    initializeAudio();
  }, [audioFile]);

  const playAudio = () => {
    if (audioContext && audioBuffer) {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  };

  return { playAudio };
}
