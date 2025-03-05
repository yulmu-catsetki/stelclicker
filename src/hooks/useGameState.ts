// useGameState.ts
import { useState, useCallback } from 'react';
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

  const incrementClickCount = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      clickCounts: {
        ...prev.clickCounts,
        [prev.currentCharacter]: (prev.clickCounts[prev.currentCharacter] || 0) + 1
      }
    }));
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
  }, []);

  return {
    gameState,
    incrementClickCount,
    changeCharacter,
    updateAvgSps,
    resetStats
  };
}