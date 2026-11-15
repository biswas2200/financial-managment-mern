const clamp01 = (v) => Math.min(1, Math.max(0, v));
const round = (v) => Math.round(v * 100) / 100 + 0; // + 0 turns -0 into 0

/**
 * Converts a pointer position over an element into a 3D tilt.
 * rx/ry are degrees (the hovered corner comes towards the viewer);
 * gx/gy place the light sheen, in percent of the element.
 */
export function tiltFromPointer(rect, x, y, max = 8) {
  if (!rect.width || !rect.height) return { rx: 0, ry: 0, gx: 50, gy: 50 };
  const px = clamp01((x - rect.left) / rect.width);
  const py = clamp01((y - rect.top) / rect.height);
  return {
    rx: round((0.5 - py) * 2 * max),
    ry: round((px - 0.5) * 2 * max),
    gx: round(px * 100),
    gy: round(py * 100),
  };
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches)
    : false;
}
