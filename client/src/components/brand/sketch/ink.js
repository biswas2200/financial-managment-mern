/**
 * Tools for drawing like a person with a pen. Every shape is an SVG path string. Straight edges wobble a
 * little, using a seeded random generator, so the same seed always draws the same picture.
 */

/** A small, fast seeded random number generator: numbers from 0 up to (not including) 1. */
export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

export function makeInk(seed = 1) {
  const rnd = mulberry32(seed);
  const jit = (amp) => (rnd() - 0.5) * 2 * amp;

  /** The curve segments of a wobbly straight edge, continuing from (x1, y1). */
  function edge(x1, y1, x2, y2, amp) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.01) return ` L${f(x2)},${f(y2)}`;
    const steps = Math.max(1, Math.round(len / 16));
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    let d = '';
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const tm = (i - 0.5) / steps;
      const end = i === steps ? jit(amp / 2) : jit(amp);
      const mid = jit(amp);
      d += ` Q${f(x1 + (x2 - x1) * tm + nx * mid)},${f(y1 + (y2 - y1) * tm + ny * mid)} ${f(x1 + (x2 - x1) * t + nx * end)},${f(y1 + (y2 - y1) * t + ny * end)}`;
    }
    return d;
  }

  const line = (x1, y1, x2, y2, amp = 0.8) => `M${f(x1)},${f(y1)}${edge(x1, y1, x2, y2, amp)}`;

  function poly(points, closed = false, amp = 0.8) {
    let d = `M${f(points[0][0])},${f(points[0][1])}`;
    for (let i = 1; i < points.length; i += 1) d += edge(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], amp);
    if (closed) d += edge(points.at(-1)[0], points.at(-1)[1], points[0][0], points[0][1], amp) + ' Z';
    return d;
  }

  const rect = (x, y, w, h, amp = 0.8) =>
    poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, amp);

  /** An arched opening or doorway: straight sides up to `spring`, a half circle over the top. */
  function arch(cx, base, hw, spring) {
    const r = hw + jit(0.3);
    return `M${f(cx - hw)},${f(base)}${edge(cx - hw, base, cx - hw, spring, 0.5)} A${f(r)},${f(r)} 0 0 1 ${f(cx + hw)},${f(spring)}${edge(cx + hw, spring, cx + hw, base, 0.5)} Z`;
  }

  /** A half-round dome sitting on `base`. */
  const dome = (cx, base, r) => `M${f(cx - r)},${f(base)} A${f(r + jit(0.4))},${f(r)} 0 0 1 ${f(cx + r)},${f(base)} Z`;

  const circle = (cx, cy, r) =>
    `M${f(cx - r)},${f(cy)} A${f(r + jit(0.5))},${f(r + jit(0.5))} 0 1 1 ${f(cx + r)},${f(cy)} A${f(r + jit(0.5))},${f(r + jit(0.5))} 0 1 1 ${f(cx - r)},${f(cy)} Z`;

  /** An onion dome: wide shoulders, tapering to a point. */
  const onion = (cx, base, r, h) =>
    `M${f(cx - r)},${f(base)} C${f(cx - r * 1.35)},${f(base - h * 0.4)} ${f(cx - r * 0.35)},${f(base - h * 0.62)} ${f(cx)},${f(base - h)} C${f(cx + r * 0.35)},${f(base - h * 0.62)} ${f(cx + r * 1.35)},${f(base - h * 0.4)} ${f(cx + r)},${f(base)} Z`;

  /**
   * A row of waves. Each q/t segment spans `span` and the bumps alternate up and down, so sliding the row sideways by
   * exactly two spans looks seamless.
   */
  function wave(x0, x1, y, span = 24, amp = 3) {
    const count = Math.max(1, Math.ceil((x1 - x0) / span));
    let d = `M${f(x0)},${f(y)} q${f(span / 2)},${f(-amp * 2)} ${f(span)},0`;
    for (let i = 1; i < count; i += 1) d += ` t${f(span)},0`;
    return d;
  }

  return { line, poly, rect, arch, dome, circle, onion, wave, jit };
}
