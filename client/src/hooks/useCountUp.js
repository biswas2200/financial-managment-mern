import { useEffect, useRef, useState } from 'react';
import { easeOutCubic, prefersReducedMotion } from '../lib/motion.js';

/** Animates a number from its previous value (0 on first render) to `target`. */
export function useCountUp(target, { duration = 900 } = {}) {
  const reduce = prefersReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const fromRef = useRef(reduce ? target : 0);

  useEffect(() => {
    if (reduce || !Number.isFinite(target)) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }
    const from = fromRef.current;
    let start;
    let frame;
    const step = (now) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      const next = t >= 1 ? target : Math.round(from + (target - from) * easeOutCubic(t));
      fromRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduce]);

  return value;
}
