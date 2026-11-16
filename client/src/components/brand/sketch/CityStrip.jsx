import { memo, useMemo } from 'react';
import { CITIES, TILE } from './cities.js';
import { makeInk } from './ink.js';

const WIDTH = CITIES.length * TILE.width;
const NAMES = CITIES.map((c) => c.name);
const DESCRIPTION = `Hand-drawn landmarks of ${NAMES.slice(0, -1).join(', ')} and ${NAMES.at(-1)}`;

function Item({ item, delay, draw }) {
  const { kind, d, live, at, origin, stroke } = item;
  let node;
  if (kind === 'solid') {
    node = <path d={d} fill="var(--sk-ink)" className={draw ? 'sk-fill' : undefined} style={draw ? { '--d': `${delay + 0.8}s` } : undefined} />;
  } else if (kind === 'hatch') {
    node = <path d={d} fill="none" stroke="var(--sk-paper)" strokeWidth="1" strokeLinecap="round" className={draw ? 'sk-fill' : undefined} style={draw ? { '--d': `${delay + 1.1}s` } : undefined} />;
  } else if (kind === 'cut') {
    node = <path d={d} fill="var(--sk-paper)" stroke="var(--sk-ink)" strokeWidth="1.3" strokeLinejoin="round" className={draw ? 'sk-fill' : undefined} style={draw ? { '--d': `${delay + 1.2}s` } : undefined} />;
  } else if (kind === 'water') {
    node = <path d={d} fill="none" stroke="var(--sk-ink)" strokeWidth="1.1" strokeLinecap="round" />;
  } else if (kind === 'detail') {
    node = <path d={d} fill="none" stroke="var(--sk-ink)" strokeWidth={stroke ?? 1.2} strokeLinecap="round" strokeLinejoin="round" />;
  } else {
    node = (
      <path
        d={d}
        pathLength="1"
        fill="none"
        stroke="var(--sk-ink)"
        strokeWidth={stroke ?? 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={draw ? 'sk-draw' : undefined}
        style={draw ? { '--d': `${delay}s` } : undefined}
      />
    );
  }
  if (!live) return node;
  const style = { '--d': `${item.delay ?? 0}s`, transformOrigin: at ? '0 0' : `${origin?.[0] ?? 0}px ${origin?.[1] ?? 0}px` };
  const wrapped = (
    <g className={`sk-${live}`} style={style}>
      {node}
    </g>
  );
  return at ? <g transform={`translate(${at[0]},${at[1]})`}>{wrapped}</g> : wrapped;
}

const Tile = memo(function Tile({ city, index, draw, labels }) {
  const items = useMemo(() => city.build(), [city]);
  const base = index * 0.55;
  return (
    <g transform={`translate(${index * TILE.width},0)`}>
      {items.map((item, i) => (
        <Item key={i} item={item} delay={base + Math.min(i, 120) * 0.012} draw={draw} />
      ))}
      {labels && (
        <text x={TILE.width / 2} y="246" textAnchor="middle" className="sk-city" fill="var(--sk-ink)">
          {city.name}
        </text>
      )}
      {labels && (
        <text x={TILE.width / 2} y="262" textAnchor="middle" className="sk-landmark" fill="var(--sk-ink)">
          {city.landmark}
        </text>
      )}
    </g>
  );
});

function Strip({ draw, labels, ...props }) {
  const horizon = useMemo(() => makeInk(99).line(0, 201, WIDTH, 201, 1.2), []);
  return (
    <svg viewBox={`0 0 ${WIDTH} ${TILE.height}`} className="sk-strip block h-[var(--sk-h,220px)] w-auto flex-none" {...props}>
      <path d={horizon} fill="none" stroke="var(--sk-ink)" strokeWidth="1.5" strokeLinecap="round" />
      {CITIES.map((city, i) => (
        <Tile key={city.id} city={city} index={i} draw={draw} labels={labels} />
      ))}
    </svg>
  );
}

/**
 * A panorama of six Indian cities drawn in ink. The outlines draw themselves in once, then the whole strip pans
 * slowly past while water ripples, boats bob, flags sway and traffic crosses. A second copy follows the first so the
 * loop has no seam. With reduced motion the finished drawing simply stands still.
 */
export function CityStrip({ className, labels = true, height, decorative = false }) {
  return (
    <div className={className} style={height ? { '--sk-h': height } : undefined}>
      <div data-motion="pan" className="sk-pan flex w-max">
        <Strip draw labels={labels} {...(decorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': DESCRIPTION })} />
        <Strip draw={false} labels={labels} aria-hidden="true" />
      </div>
    </div>
  );
}
