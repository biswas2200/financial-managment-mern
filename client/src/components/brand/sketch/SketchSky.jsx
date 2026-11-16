import { useMemo } from 'react';
import { makeInk } from './ink.js';

// Where things sit in each layout. "wide" is for a banner, "tall" for the side panel on the sign-in pages.
const LAYOUTS = {
  wide: { box: '0 0 1200 400', rest: [620, 380, 880], sun: [880, 150, 56], clouds: [[120, 90, 1], [520, 50, 0.8], [760, 120, 1.2]], birds: [[60, 30, 22, -4], [160, 80, 28, -12], [300, 20, 34, -2], [10, 120, 40, -8], [220, 60, 30, -16]] },
  tall: { box: '0 0 600 800', rest: [300, 200, 260], sun: [430, 380, 52], clouds: [[40, 300, 1], [300, 250, 0.9], [90, 470, 1.1]], birds: [[20, 330, 24, -6], [90, 420, 30, -14], [200, 300, 36, -3], [10, 500, 42, -10]] },
};

const CLOUD = 'M0,24 q10,-18 26,-8 q8,-18 28,-6 q18,-10 30,6 q14,-2 14,10 h-98 q-8,0 0,-2 Z';

/** The sky behind the skyline: a red sun with rings that swell and fade, clouds that drift, and birds on the wing. */
export function SketchSky({ className = '', variant = 'wide', still = false }) {
  const layout = LAYOUTS[variant] ?? LAYOUTS.wide;
  const [sx, sy, sr] = layout.sun;
  const sunPath = useMemo(() => makeInk(5).circle(sx, sy, sr), [sx, sy, sr]);
  const rays = useMemo(() => {
    const ink = makeInk(8);
    return Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const r1 = sr + 14;
      const r2 = sr + 26 + (i % 2) * 8;
      return ink.line(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1, sx + Math.cos(a) * r2, sy + Math.sin(a) * r2, 0.6);
    });
  }, [sx, sy, sr]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 ${className}`} style={{ bottom: 'calc(var(--sk-h, 0px) * 0.7)' }}>
      <svg viewBox={layout.box} preserveAspectRatio="xMidYMin slice" className="h-full w-full">
        <g data-sun className={still ? undefined : 'sk-sun'} style={still ? undefined : { transformOrigin: `${sx}px ${sy}px` }}>
          <path d={sunPath} fill="var(--sk-sun)" />
          {!still && <circle cx={sx} cy={sy} r={sr + 10} fill="none" stroke="var(--sk-sun)" strokeWidth="1.4" className="sk-ring" style={{ transformOrigin: `${sx}px ${sy}px` }} />}
          <g className={still ? undefined : 'sk-rays'} stroke="var(--sk-sun)" strokeWidth="1.5" strokeLinecap="round" fill="none">
            {rays.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </g>
        {layout.clouds.map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
            <g
              data-cloud
              className={still ? undefined : 'sk-cloud'}
              style={still ? { transform: `translateX(${layout.rest[i % layout.rest.length]}px)` } : { animationDuration: `${70 + i * 25}s`, animationDelay: `${-i * 22}s`, '--rest': `${layout.rest[i % layout.rest.length]}px` }}
            >
              <path d={CLOUD} fill="none" stroke="var(--sk-ink)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18,34 h40 M70,34 h26" fill="none" stroke="var(--sk-ink)" strokeWidth="1" strokeLinecap="round" opacity=".6" />
            </g>
          </g>
        ))}
        {!still && layout.birds.map(([x, y, s, dy], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <g data-bird className="sk-fly" style={{ animationDuration: `${26 + i * 5}s`, animationDelay: `${-i * 7}s`, '--dy': `${dy * 4}px` }}>
              <path d={`M0,0 q${s / 4},${-s / 3} ${s / 2},0 q${s / 4},${-s / 3} ${s / 2},0`} fill="none" stroke="var(--sk-ink)" strokeWidth="1.6" strokeLinecap="round" className="sk-flap" style={{ animationDelay: `${-i * 0.23}s` }} />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
