// useGameState.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { Character } from '../components/models/constants';

interface GameState {
  clickCounts: Record<Character, number>;
  currentCharacter: Character;
  avgSps: number;
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>({
    clickCounts: {
      [Character.TenkoShibuki]: 0,
      [Character.HanakoNana]: 0,
      [Character.YuzuhaRiko]: 0,
      [Character.AokumoriRin]: 0
    },
    currentCharacter: Character.TenkoShibuki,
    avgSps: 0
  });

  const clickTimestampsRef = useRef<number[]>([]);

  const incrementClickCount = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      clickCounts: {
        ...prev.clickCounts,
        [prev.currentCharacter]: (prev.clickCounts[prev.currentCharacter] || 0) + 1
      }
    }));
    clickTimestampsRef.current.push(Date.now());
  }, []);

  const changeCharacter = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentCharacter: (prev.currentCharacter + 1) % 4 as Character
    }));
  }, []);

  const updateAvgSps = useCallback((newSps: number) => {
    setGameState(prev => ({
      ...prev,
      avgSps: prev.avgSps * 0.9 + newSps * 0.1
    }));
  }, []);

  const resetStats = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      clickCounts: {
        [Character.TenkoShibuki]: 0,
        [Character.HanakoNana]: 0,
        [Character.YuzuhaRiko]: 0,
        [Character.AokumoriRin]: 0
      }
    }));
    clickTimestampsRef.current = [];
  }, []);

  // SPS (Stel Per Second, 초당 클릭 수) 계산
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      clickTimestampsRef.current = clickTimestampsRef.current.filter(ts => now - ts <= 1000); // 최근 1초 클릭 수 계산
      const currentSps = clickTimestampsRef.current.length;
      updateAvgSps(currentSps); // 지수 가중 이동 평균 계산 (0.9, 0.1은 가중치)
    }, 200);
    return () => clearInterval(interval);
  }, [updateAvgSps]);

  return {
    gameState,
    incrementClickCount,
    changeCharacter,
    updateAvgSps,
    resetStats
  };
}