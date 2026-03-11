import { useState, useRef, useCallback, useEffect } from 'react';

export function useAnimatedScroll() {
  const [progress, setProgress] = useState(0);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const isAnimating = useRef(false);
  const rafId = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const scrollTo = useCallback((value: number) => {
    targetRef.current = value;
    if (isAnimating.current) return;
    isAnimating.current = true;

    const tick = () => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 0.001) {
        currentRef.current = targetRef.current;
        setProgress(targetRef.current);
        isAnimating.current = false;
        return;
      }
      currentRef.current += diff * 0.08;
      setProgress(currentRef.current);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  }, []);

  return { progress, scrollTo };
}
