import clsx from 'clsx';
import { CityStrip } from './CityStrip.jsx';
import { SketchSky } from './SketchSky.jsx';

/**
 * The sky and the skyline together: black ink on white paper (and the reverse on the dark theme).
 * Put text above it with a higher z-index; the scene itself never takes clicks.
 */
export function CityScene({ className, variant = 'wide', height, labels = true, decorative = false }) {
  return (
    <div className={clsx('sketch-scene pointer-events-none absolute inset-0 isolate overflow-hidden', className)}>
      <SketchSky variant={variant} />
      <CityStrip className="absolute inset-x-0 bottom-0" height={height} labels={labels} decorative={decorative} />
    </div>
  );
}
