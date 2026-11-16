import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { CityStrip } from './CityStrip.jsx';
import { SketchSky } from './SketchSky.jsx';

/**
 * The sky and the skyline together: black ink on white paper (and the reverse on the dark theme).
 * Put text above it with a higher z-index; the scene itself never takes clicks.
 * Its animations pause while it is scrolled out of view, to spare the processor and the battery.
 */
export function CityScene({ className, variant = 'wide', height, labels = true, decorative = false }) {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof globalThis.IntersectionObserver !== 'function') return undefined;
    const observer = new globalThis.IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-paused={String(paused)} className={clsx('sketch-scene pointer-events-none absolute inset-0 isolate overflow-hidden', className)}>
      <SketchSky variant={variant} />
      <CityStrip className="absolute inset-x-0 bottom-0" height={height} labels={labels} decorative={decorative} />
    </div>
  );
}
