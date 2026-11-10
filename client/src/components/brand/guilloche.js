/**
 * Guilloché generators: the fine interference linework printed on banknotes and cheques.
 * Pure functions that return SVG path strings.
 */

/** Horizontal bands of interfering sine waves. */
export function wavePaths({ width, height, count = 16, step = 6 }) {
  const paths = [];
  for (let i = 0; i < count; i += 1) {
    const y0 = height * (0.08 + (0.84 * i) / (count - 1));
    let d = '';
    for (let x = 0; x <= width; x += step) {
      const y =
        y0 +
        7 * Math.sin(x / 38 + i * 0.42) +
        4 * Math.sin(x / 17 - i * 0.27) +
        2.5 * Math.sin(x / 9 + i * 0.9);
      d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)} `;
    }
    paths.push(d.trim());
  }
  return paths;
}

/** A hypotrochoid rosette centred on (cx, cy). */
export function rosettePath({ cx, cy, R = 80, r = 29, d = 52, turns = 29, steps = 1400 }) {
  const k = (R - r) / r;
  let path = '';
  for (let s = 0; s <= steps; s += 1) {
    const t = (s / steps) * Math.PI * 2 * turns;
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(k * t);
    path += `${s === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return path.trim();
}
