import { CityStrip } from './CityStrip.jsx';
import { SketchSky } from './SketchSky.jsx';

/**
 * The city sketch from the landing page, standing still, faint, behind every page of the app. It is fixed to the
 * window (starting beside the sidebar on a laptop), takes no clicks, and is invisible to screen readers. The cards sit
 * on top of it; it shows in the margins and below short pages. Ink and paper follow the light or dark theme.
 */
export function AppBackdrop() {
  return (
    <div
      aria-hidden="true"
      data-still="true"
      className="sketch-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden lg:left-64"
      style={{ '--sk-h': 'clamp(96px, 15vw, 280px)' }}
    >
      <SketchSky still />
      <CityStrip still decorative labels={false} className="absolute inset-x-0 bottom-0" />
    </div>
  );
}
