import { describe, it, expect } from 'vitest';
import { CITIES, TILE } from './cities.js';

const KINDS = new Set(['solid', 'cut', 'line', 'hatch', 'water', 'detail']);
const LIVE = new Set(['ripple', 'bob', 'sway', 'vehicle', 'twinkle']);
const coords = (d) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('the city sketches', () => {
  it('cover six of India\'s largest cities, each with a landmark', () => {
    expect(CITIES.map((c) => c.id)).toEqual(['mumbai', 'delhi', 'kolkata', 'hyderabad', 'bengaluru', 'chennai']);
    expect(CITIES.map((c) => c.name)).toEqual(['Mumbai', 'Delhi', 'Kolkata', 'Hyderabad', 'Bengaluru', 'Chennai']);
    expect(CITIES.map((c) => c.landmark)).toEqual(['Gateway of India', 'India Gate', 'Howrah Bridge', 'Charminar', 'Vidhana Soudha', 'Kapaleeshwarar Temple']);
  });

  it.each(CITIES.map((c) => [c.name, c]))('%s is drawn from valid paths that stay inside its tile', (_name, city) => {
    const items = city.build();
    expect(items.length).toBeGreaterThan(12);
    for (const item of items) {
      expect(KINDS.has(item.kind), `kind ${item.kind}`).toBe(true);
      expect(typeof item.d).toBe('string');
      expect(item.d, `${city.name} ${item.kind}`).not.toMatch(/NaN|undefined|Infinity/);
      expect(item.d.startsWith('M')).toBe(true);
      const nums = coords(item.d);
      expect(nums.length).toBeGreaterThan(3);
      for (const n of nums) {
        expect(n).toBeGreaterThan(-40);
        expect(n).toBeLessThan(TILE.width + 40);
      }
    }
  });

  it.each(CITIES.map((c) => [c.name, c]))('%s has solid shapes, line work and something that moves', (_name, city) => {
    const items = city.build();
    expect(items.some((i) => i.kind === 'solid')).toBe(true);
    expect(items.some((i) => i.kind === 'line')).toBe(true);
    const live = items.filter((i) => i.live);
    expect(live.length).toBeGreaterThanOrEqual(2);
    for (const i of live) expect(LIVE.has(i.live), i.live).toBe(true);
  });

  it('draws the same sketch every time', () => {
    for (const city of CITIES) expect(city.build()).toEqual(city.build());
  });

  it('puts water and a boat or ferry in the coastal and river cities', () => {
    for (const id of ['mumbai', 'kolkata', 'chennai']) {
      const items = CITIES.find((c) => c.id === id).build();
      expect(items.some((i) => i.kind === 'water'), `${id} water`).toBe(true);
    }
    expect(CITIES.find((c) => c.id === 'mumbai').build().some((i) => i.live === 'bob')).toBe(true);
    expect(CITIES.find((c) => c.id === 'kolkata').build().some((i) => i.live === 'vehicle')).toBe(true);
  });

  it('gives every tile the same width so the strip can repeat seamlessly', () => {
    expect(TILE).toEqual({ width: 320, height: 270 });
  });
});
