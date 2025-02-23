import { useEffect, useRef, useCallback } from "react";

export function useAudioPlayer(
  soundEnabled: boolean,
  fadeDurations: number[],
  charSounds: string[]
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<AudioBuffer[]>([]);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // 오디오 초기화 및 버퍼 로드
  useEffect(() => {
    const initAudio = async () => {
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
      } catch (error) {
        console.error("Audio initialization failed:", error);
      }
    };
    initAudio();
    return () => {
      audioContextRef.current?.close();
    };
  }, [charSounds]);

  const playSound = useCallback(
    async (index: number) => {
      if (
        !soundEnabled ||
        !audioContextRef.current ||
        !audioBuffersRef.current[index]
      )
        return;
      try {
        if (currentAudioSourceRef.current) {
          currentAudioSourceRef.current.stop();
          currentAudioSourceRef.current.disconnect();
          currentAudioSourceRef.current = null;
        }
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffersRef.current[index];
        currentAudioSourceRef.current = source;
        const localSource = source;

        const gainNode = audioContextRef.current.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        gainNode.gain.setValueAtTime(1, audioContextRef.current.currentTime);
        source.start(0);

        const fadeDuration = fadeDurations[index] / 1000;
        if (currentAudioSourceRef.current !== localSource) return;

        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContextRef.current.currentTime + fadeDuration * 1.2
        );

        setTimeout(() => {
          if (currentAudioSourceRef.current === localSource) {
            source.stop();
            source.disconnect();
            gainNode.disconnect();
            currentAudioSourceRef.current = null;
          }
        }, fadeDuration * 1.2 * 1000);
      } catch (error) {
        console.error("Sound playback error:", error);
      }
    },
    [soundEnabled, fadeDurations]
  );

  return { playSound };
}
