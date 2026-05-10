import { useRef, useCallback } from 'react';

const useDoubleClickPrevention = (delayMs = 500) => {
  const lastClickTimeRef = useRef(0);

  const canClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < delayMs) {
      return false;
    }
    lastClickTimeRef.current = now;
    return true;
  }, [delayMs]);

  return canClick;
};

export default useDoubleClickPrevention;
