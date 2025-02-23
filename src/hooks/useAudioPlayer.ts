import { useEffect, useRef, useCallback } from "react";

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

  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current || !soundEnabled) return;
    try {
      audioContextRef.current = new AudioContext();
      const buffers = await Promise.all(
        charSounds.map(async (url) => {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          return audioContextRef.current!.decodeAudioData(arrayBuffer);
        })
      );
      audioBuffersRef.current = buffers;
      isInitializedRef.current = true;
    } catch (error) {
      console.error("Audio initialization failed:", error);
    }
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
      if (!soundEnabled || !isInitializedRef.current) return;
      if (volume === 0) return; // 볼륨이 0이면 소리를 재생하지 않음 (완전 침묵)
      try {
        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }
        if (fadeOutTimerRef.current !== null) {
          clearTimeout(fadeOutTimerRef.current);
          fadeOutTimerRef.current = null;
        }
        if (currentAudioSourceRef.current) {
          currentAudioSourceRef.current.stop();
          currentAudioSourceRef.current.disconnect();
          currentAudioSourceRef.current = null;
        }
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffersRef.current[index];
        currentAudioSourceRef.current = source;
        const gainNode = audioContextRef.current!.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);

        const volumeFactor = 0.1 * Math.pow(volume / 100, 1.4); // 볼륨 조절
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
          source.stop();
          source.disconnect();
          gainNode.disconnect();
          currentAudioSourceRef.current = null;
          fadeOutTimerRef.current = null;
        }, fadeDuration * 1.2 * 1000);
      } catch (error) {
        console.error("Sound playback error:", error);
      }
    },
    [soundEnabled, fadeDurations, volume] // volume dependency 추가
  );

  return { playSound, initializeAudio };
}
