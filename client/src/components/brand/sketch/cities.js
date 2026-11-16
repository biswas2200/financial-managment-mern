/**
 * Six landmarks, drawn as ink: solid black shapes, white hatching, paper-coloured openings and outlines.
 * Each city is a 320 x 270 tile with its ground at y = 200, so the tiles sit side by side in one strip.
 *
 * An item is { kind, d, live?, origin? }:
 *   solid  filled with ink          cut   filled with paper and outlined (arches, windows)
 *   hatch  paper-coloured texture   line  an ink outline
 *   water  rippling rows            detail small ink marks
 * `live` marks a part that moves: ripple, bob, sway, vehicle or twinkle. `origin` is its pivot point.
 */
import { makeInk } from './ink.js';

export const TILE = { width: 320, height: 270 };

function createBuilder(seed) {
  const ink = makeInk(seed);
  const items = [];
  const add = (kind, d, extra = {}) => items.push({ kind, d, ...extra });
  const hatchRows = (x1, x2, y1, y2, step, amp = 0.5) => {
    for (let y = y1; y <= y2; y += step) add('hatch', ink.line(x1, y, x2, y, amp));
  };
  const hatchCols = (x1, x2, y1, y2, step, amp = 0.5) => {
    for (let x = x1; x <= x2; x += step) add('hatch', ink.line(x, y1, x, y2, amp));
  };
  /** Rows of rippling water under the landmark. */
  const water = (rows = 4, y0 = 208, from = -30, to = 350) => {
    for (let i = 0; i < rows; i += 1) add('water', ink.wave(from, to, y0 + i * 9, 20, 2.6 - i * 0.2), { live: 'ripple', delay: i * 0.7 });
  };
  const ground = (y = 201, from = 0, to = 320) => add('line', ink.line(from, y, to, y, 1.1));
  return { ink, add, hatchRows, hatchCols, water, ground, items };
}

// ---------- Mumbai: Gateway of India ----------

function mumbai() {
  const { ink, add, hatchRows, hatchCols, water, items } = createBuilder(11);
  // wings and main block
  add('solid', ink.rect(34, 160, 40, 40));
  add('solid', ink.rect(246, 160, 40, 40));
  add('solid', ink.rect(72, 94, 176, 106));
  // four turrets with domes
  for (const cx of [88, 120, 200, 232]) {
    add('solid', ink.rect(cx - 8, 66, 16, 30));
    add('solid', ink.dome(cx, 66, 9));
    add('line', ink.line(cx, 57, cx, 48, 0.4));
  }
  // crenellations along the roof line
  for (let x = 74; x < 246; x += 10) add('solid', ink.rect(x, 89, 5, 6, 0.3));
  // basalt courses
  hatchRows(76, 244, 102, 196, 6);
  hatchCols(38, 70, 164, 198, 7);
  hatchCols(250, 282, 164, 198, 7);
  // the great arch, with a second arch inside it for depth
  add('cut', ink.arch(160, 200, 29, 144));
  add('line', ink.arch(160, 200, 20, 150), { stroke: 1.2 });
  add('line', ink.line(160, 200, 160, 176, 0.3));
  // upper windows and side arches
  for (const cx of [100, 124, 196, 220]) add('cut', ink.arch(cx, 134, 6, 120));
  for (const cx of [54, 266]) add('cut', ink.arch(cx, 198, 8, 176));
  // cornice
  add('line', ink.line(68, 95, 252, 95, 0.9), { stroke: 1.6 });
  add('line', ink.line(72, 130, 248, 130, 0.9));
  // the sea, and a dhow riding at anchor
  water(4);
  const boat = 'M-20,0 Q0,9 20,0 L15,-5 L-15,-5 Z';
  add('solid', boat, { live: 'bob', origin: [262, 218], at: [262, 218] });
  add('line', 'M0,-5 L0,-30', { live: 'bob', origin: [262, 218], at: [262, 218] });
  add('line', 'M0,-30 L17,-8 L0,-8 Z', { live: 'bob', origin: [262, 218], at: [262, 218] });
  add('detail', 'M44,214 L56,214', { live: 'twinkle' });
  return items;
}

// ---------- Delhi: India Gate ----------

function delhi() {
  const { ink, add, hatchRows, items, ground } = createBuilder(23);
  // stepped base
  add('solid', ink.rect(94, 190, 132, 10));
  add('solid', ink.rect(104, 182, 112, 8));
  add('solid', ink.rect(112, 174, 96, 8));
  // the gate itself
  add('solid', ink.rect(120, 76, 80, 98));
  add('solid', ink.rect(111, 68, 98, 9));
  add('solid', ink.poly([[138, 68], [146, 56], [174, 56], [182, 68]], true));
  add('solid', ink.rect(152, 44, 16, 12));
  add('line', ink.line(160, 44, 160, 32, 0.4));
  hatchRows(124, 196, 82, 106, 6);
  add('cut', ink.arch(160, 174, 22, 118));
  add('line', ink.arch(160, 174, 15, 124));
  add('detail', ink.circle(160, 160, 3));
  add('line', ink.line(108, 77, 212, 77, 0.8), { stroke: 1.4 });
  // trees on the lawn
  for (const [x, r] of [[44, 17], [276, 17], [18, 11], [302, 11]]) {
    add('line', ink.line(x, 200, x, 200 - r - 10, 0.5), { stroke: 2 });
    add('solid', ink.circle(x, 200 - r - 14, r));
    for (let i = -r + 4; i < r - 3; i += 5) add('hatch', ink.line(x + i, 200 - r - 14 - 6, x + i + 2, 200 - r - 14 + 8, 0.4));
  }
  // Rajpath running toward you
  add('line', ink.line(104, 201, 22, 244, 1));
  add('line', ink.line(216, 201, 298, 244, 1));
  for (let i = 0; i < 4; i += 1) add('detail', ink.line(160, 206 + i * 10, 160, 212 + i * 10, 0.3));
  // a kite on a string, swaying
  add('line', 'M258,88 Q242,150 228,201', { live: 'sway', origin: [228, 201], stroke: 0.9 });
  add('solid', 'M258,70 L270,84 L258,98 L246,84 Z', { live: 'sway', origin: [228, 201] });
  add('line', 'M258,98 q-4,10 2,16 q6,6 0,14', { live: 'sway', origin: [228, 201], stroke: 0.9 });
  ground(201, 0, 320);
  return items;
}

// ---------- Kolkata: Howrah Bridge ----------

function kolkata() {
  const { ink, add, water, items } = createBuilder(37);
  const DECK = 172;
  const towers = [92, 228];
  // top chord: rises from each end to a tower, dips between them
  const top = (x) => {
    if (x <= towers[0]) return DECK - 4 - ((x - 6) / (towers[0] - 6)) * (DECK - 4 - 96);
    if (x >= towers[1]) return DECK - 4 - ((314 - x) / (314 - towers[1])) * (DECK - 4 - 96);
    return 96 + 32 * Math.sin((Math.PI * (x - towers[0])) / (towers[1] - towers[0]));
  };
  // the roadway
  add('solid', ink.rect(0, DECK - 2, 320, 6, 0.4));
  // lattice between the chords
  for (let x = 14; x <= 306; x += 11) {
    if (Math.abs(x - towers[0]) < 14 || Math.abs(x - towers[1]) < 14) continue;
    add('line', ink.line(x, top(x), x, DECK - 2, 0.4), { stroke: 0.9 });
    const next = x + 11;
    if (next < 308) add('line', ink.line(x, top(x), next, DECK - 2, 0.4), { stroke: 0.7 });
  }
  // the chords
  const chord = [];
  for (let x = 6; x <= 314; x += 6) chord.push([x, top(x)]);
  add('line', ink.poly(chord, false, 0.5), { stroke: 2.4 });
  // the two towers: tapering legs, cross-bracing, caps
  for (const cx of towers) {
    add('solid', ink.poly([[cx - 16, DECK + 2], [cx - 8, 96], [cx + 8, 96], [cx + 16, DECK + 2], [cx + 9, DECK + 2], [cx + 4, 106], [cx - 4, 106], [cx - 9, DECK + 2]], true, 0.4));
    for (let y = 112; y < DECK; y += 11) {
      const half = 4 + ((y - 96) / (DECK - 96)) * 10;
      add('line', ink.line(cx - half, y, cx + half, y + 11, 0.3), { stroke: 1 });
      add('line', ink.line(cx + half, y, cx - half, y + 11, 0.3), { stroke: 1 });
    }
    add('solid', ink.rect(cx - 10, 90, 20, 7, 0.3));
  }
  // traffic crossing the bridge: a tram and a few cars
  add('solid', 'M0,0 h14 v-8 h-14 Z', { live: 'vehicle', at: [0, DECK - 3], delay: 0 });
  add('solid', 'M0,0 h8 v-5 h-8 Z', { live: 'vehicle', at: [0, DECK - 3], delay: 2.4 });
  add('solid', 'M0,0 h9 v-5 h-9 Z', { live: 'vehicle', at: [0, DECK - 3], delay: 4.6 });
  // the Hooghly, with a ferry
  water(5, 188, -30, 350);
  add('solid', 'M-16,0 Q0,7 16,0 L12,-5 L-12,-5 Z', { live: 'bob', origin: [70, 226], at: [70, 226] });
  add('line', 'M-6,-5 v-8 h12 v8', { live: 'bob', origin: [70, 226], at: [70, 226] });
  add('solid', 'M-12,0 Q0,6 12,0 L9,-4 L-9,-4 Z', { live: 'bob', origin: [262, 236], at: [262, 236], delay: 1.2 });
  return items;
}

// ---------- Hyderabad: Charminar ----------

function hyderabad() {
  const { ink, add, hatchRows, items, ground } = createBuilder(41);
  const minaret = (cx, top, half, solid = true) => {
    add('solid', ink.poly([[cx - half - 2, 200], [cx + half + 2, 200], [cx + half - 1, top + 14], [cx - half + 1, top + 14]], true, 0.4));
    add('solid', ink.rect(cx - half - 4, top + 36, half * 2 + 8, 4, 0.3));
    add('solid', ink.rect(cx - half - 3, top + 22, half * 2 + 6, 4, 0.3));
    add('solid', ink.onion(cx, top + 14, half + 2, 24));
    add('line', ink.line(cx, top - 10, cx, top - 20, 0.3));
    add('solid', ink.circle(cx, top - 22, 2));
    return solid;
  };
  // the back pair, a little shorter, then the building, then the front pair
  minaret(130, 78, 5);
  minaret(190, 78, 5);
  add('solid', ink.rect(98, 118, 124, 82));
  add('solid', ink.rect(94, 110, 132, 9));
  hatchRows(102, 218, 124, 196, 6);
  // roof chhatris
  for (const cx of [128, 160, 192]) {
    add('solid', ink.rect(cx - 7, 98, 14, 12, 0.3));
    add('solid', ink.dome(cx, 98, 8));
    add('line', ink.line(cx, 90, cx, 82, 0.3));
  }
  // arcade and the great arches
  for (let cx = 116; cx <= 204; cx += 14.7) add('cut', ink.arch(cx, 142, 5, 134));
  add('cut', ink.arch(160, 200, 21, 160));
  add('line', ink.arch(160, 200, 14, 166));
  add('cut', ink.arch(122, 200, 10, 172));
  add('cut', ink.arch(198, 200, 10, 172));
  add('line', ink.line(94, 119, 226, 119, 0.7), { stroke: 1.4 });
  minaret(100, 44, 6);
  minaret(220, 44, 6);
  // cobbles
  for (let x = 8; x < 320; x += 22) add('detail', ink.line(x, 207, x + 9, 207, 0.4));
  ground(201, 0, 320);
  // a pennant on the left minaret, and pigeons wheeling over the square
  add('solid', 'M100,22 l15,4 l-15,5 Z', { live: 'sway', origin: [100, 22] });
  add('detail', 'M62,160 l4,-3 l4,3 M64,160 l2,2 l2,-2', { live: 'twinkle' });
  add('detail', 'M252,150 l4,-3 l4,3 M254,150 l2,2 l2,-2', { live: 'twinkle', delay: 1.4 });
  return items;
}

// ---------- Bengaluru: Vidhana Soudha ----------

function bengaluru() {
  const { ink, add, hatchRows, items, ground } = createBuilder(53);
  // platform and the long wings
  add('solid', ink.rect(34, 188, 252, 12));
  add('solid', ink.rect(46, 130, 228, 58));
  hatchRows(50, 270, 136, 186, 6);
  // side pavilions with their domes
  for (const x of [46, 232]) {
    add('solid', ink.rect(x, 108, 42, 24));
    add('solid', ink.dome(x + 21, 108, 15));
    add('line', ink.line(x + 21, 93, x + 21, 84, 0.3));
  }
  // the portico: pediment, then columns against an open back
  add('solid', ink.poly([[96, 130], [160, 96], [224, 130]], true));
  add('cut', ink.poly([[116, 126], [160, 106], [204, 126]], true, 0.4));
  add('cut', ink.rect(102, 134, 116, 52, 0.4));
  for (let x = 106; x <= 208; x += 14.6) add('solid', ink.rect(x, 134, 6, 52, 0.3));
  add('line', ink.line(98, 133, 222, 133, 0.7), { stroke: 1.6 });
  // central dome on its drum
  add('solid', ink.rect(136, 84, 48, 16));
  add('solid', ink.dome(160, 84, 26));
  add('solid', ink.rect(155, 44, 10, 16, 0.3));
  add('solid', ink.dome(160, 44, 7));
  add('line', ink.line(160, 32, 160, 22, 0.3));
  for (let a = -18; a <= 18; a += 9) add('hatch', ink.line(160 + a, 84, 160 + a * 0.4, 62, 0.3));
  // rows of windows in the wings
  for (const x of [54, 70, 232, 248]) for (const y of [142, 160]) add('cut', ink.rect(x, y, 6, 11, 0.2));
  // steps
  for (let i = 0; i < 4; i += 1) add('line', ink.line(104 - i * 3, 200 + i * 4, 216 + i * 3, 200 + i * 4, 0.5));
  // rain trees either side
  for (const x of [16, 304]) {
    add('line', ink.line(x, 200, x, 168, 0.5), { stroke: 2.4 });
    add('solid', ink.circle(x, 158, 14), { live: 'sway', origin: [x, 200] });
    add('solid', ink.circle(x + (x < 100 ? 8 : -8), 166, 9), { live: 'sway', origin: [x, 200] });
  }
  ground(201, 0, 320);
  // a flag on the dome, and a window that lights up
  add('solid', 'M160,22 l15,4 l-15,5 Z', { live: 'sway', origin: [160, 22] });
  add('detail', 'M58,146 l4,0', { live: 'twinkle', stroke: 3 });
  return items;
}

// ---------- Chennai: Kapaleeshwarar Temple gopuram, with palms and the sea ----------

function chennai() {
  const { ink, add, water, items } = createBuilder(67);
  const cx = 160;
  // the tiers of the gopuram, narrowing as they rise
  add('solid', ink.rect(cx - 52, 192, 104, 8));
  for (let i = 0; i < 7; i += 1) {
    const w = 92 - i * 10;
    const yb = 192 - i * 16;
    const yt = yb - 16;
    add('solid', ink.poly([[cx - w / 2, yb], [cx + w / 2, yb], [cx + w / 2 - 3, yt], [cx - w / 2 + 3, yt]], true, 0.4));
    add('line', ink.line(cx - w / 2 - 3, yb, cx + w / 2 + 3, yb, 0.4), { stroke: 1.6 });
    const niches = Math.max(2, Math.floor(w / 15));
    for (let n = 0; n < niches; n += 1) {
      const nx = cx - w / 2 + (w / niches) * (n + 0.5);
      add('cut', ink.arch(nx, yb - 3, 2.8, yb - 9), {});
    }
  }
  // the barrel roof and its three kalasams
  add('solid', 'M142,80 Q142,62 160,62 Q178,62 178,80 Z');
  for (const dx of [-10, 0, 10]) {
    add('line', ink.line(160 + dx, 62, 160 + dx, 50, 0.3), { stroke: 1.2 });
    add('solid', ink.circle(160 + dx, 47, 2.4));
  }
  add('cut', ink.arch(cx, 192, 9, 180));
  // palms, one tall and one short
  const palm = (x, top, lean, scale = 1) => {
    add('line', `M${x},200 Q${x + lean * 0.4},${(200 + top) / 2} ${x + lean},${top}`, { stroke: 3 });
    const fronds = [[-34, 12], [-24, -6], [-8, -16], [10, -16], [26, -6], [36, 12], [-18, 10], [20, 10]];
    for (const [dx, dy] of fronds) {
      add('line', `M${x + lean},${top} Q${x + lean + dx * 0.5 * scale},${top + dy * scale - 10} ${x + lean + dx * scale},${top + dy * scale + 6}`, { stroke: 1.6, live: 'sway', origin: [x + lean, top] });
    }
    add('solid', ink.circle(x + lean, top + 2, 3));
  };
  palm(36, 98, 10);
  palm(288, 124, -8, 0.8);
  // the sea and a catamaran
  water(4, 208);
  add('line', 'M-20,0 L18,-3', { stroke: 2.6, live: 'bob', origin: [250, 226], at: [250, 226] });
  add('line', 'M-14,4 L14,1', { stroke: 2.6, live: 'bob', origin: [250, 226], at: [250, 226] });
  add('line', 'M0,-2 L0,-20 L12,-6', { stroke: 1.2, live: 'bob', origin: [250, 226], at: [250, 226] });
  return items;
}

export const CITIES = [
  { id: 'mumbai', name: 'Mumbai', landmark: 'Gateway of India', build: mumbai },
  { id: 'delhi', name: 'Delhi', landmark: 'India Gate', build: delhi },
  { id: 'kolkata', name: 'Kolkata', landmark: 'Howrah Bridge', build: kolkata },
  { id: 'hyderabad', name: 'Hyderabad', landmark: 'Charminar', build: hyderabad },
  { id: 'bengaluru', name: 'Bengaluru', landmark: 'Vidhana Soudha', build: bengaluru },
  { id: 'chennai', name: 'Chennai', landmark: 'Kapaleeshwarar Temple', build: chennai },
];
