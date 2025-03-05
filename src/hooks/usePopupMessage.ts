import { useState, useCallback, useRef } from 'react';

interface Popup {
  id: number;
  message: string;
  x: number;
  y: number;
}

export const usePopupMessage = () => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const popupIdRef = useRef(0);

  const addPopup = useCallback((message: string, ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) return;

    // 랜덤한 위치 생성
    const rect = ref.current.getBoundingClientRect();
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;

    const newPopup: Popup = {
      id: popupIdRef.current++,
      message,
      x,
      y
    };

    setPopups(prevPopups => [...prevPopups, newPopup]);
  }, []);

  const removePopup = useCallback((id: number) => {
    setPopups(prevPopups => prevPopups.filter(popup => popup.id !== id));
  }, []);

  return { popups, addPopup, removePopup };
};