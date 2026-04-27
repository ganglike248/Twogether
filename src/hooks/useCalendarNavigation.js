import { useState, useRef, useCallback } from 'react';

export const useCalendarNavigation = (currentDate, setCurrentDate) => {
  const [dragX, setDragX] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const touchStartXRef = useRef(null);
  const sliderViewRef = useRef(null);

  const getViewWidth = useCallback(
    () => sliderViewRef.current?.offsetWidth || window.innerWidth,
    []
  );

  const doNavigate = useCallback((dir, duration = 320) => {
    setTransitionDuration(duration);
    setDragX(dir === 'next' ? -getViewWidth() : getViewWidth());
    setTimeout(() => {
      setTransitionDuration(0);
      setCurrentDate(prev =>
        new Date(prev.getFullYear(), prev.getMonth() + (dir === 'next' ? 1 : -1), 1)
      );
      setDragX(0);
      setIsNavigating(false);
    }, duration);
  }, [getViewWidth, setCurrentDate]);

  const navigate = useCallback((dir) => {
    if (isNavigating) return;
    setIsNavigating(true);
    doNavigate(dir, 450);
  }, [isNavigating, doNavigate]);

  const goToday = useCallback(() => {
    const today = new Date();
    const todayFirst = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentDate(todayFirst);
  }, [setCurrentDate]);

  const handleTouchStart = useCallback((e) => {
    if (isNavigating) return;
    touchStartXRef.current = e.touches[0].clientX;
    setTransitionDuration(0);
  }, [isNavigating]);

  const handleTouchMove = useCallback((e) => {
    if (touchStartXRef.current === null) return;
    const diff = e.touches[0].clientX - touchStartXRef.current;
    setDragX(diff);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    const threshold = getViewWidth() * 0.22;
    if (Math.abs(diff) > threshold && !isNavigating) {
      setIsNavigating(true);
      const remaining = getViewWidth() - Math.abs(diff);
      const duration = Math.max(350, Math.round(remaining / getViewWidth() * 500));
      doNavigate(diff < 0 ? 'next' : 'prev', duration);
    } else {
      setTransitionDuration(800);
      setDragX(0);
      setTimeout(() => setTransitionDuration(0), 800);
    }
    touchStartXRef.current = null;
  }, [getViewWidth, isNavigating, doNavigate]);

  const sliderStyle = {
    transform: `translateX(calc(-33.3333% + ${dragX}px))`,
    transition: transitionDuration > 0
      ? `transform ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : 'none',
  };

  return {
    dragX,
    transitionDuration,
    isNavigating,
    sliderViewRef,
    sliderStyle,
    navigate,
    goToday,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
