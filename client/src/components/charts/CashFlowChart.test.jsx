import { describe, it, expect } from 'vitest';
import { monthIndexAt } from './CashFlowChart.jsx';

describe('monthIndexAt (which month a click on the chart means)', () => {
  // 12 months across 658 px with a 58 px axis on the left: each slot is 50 px wide.
  const at = (x) => monthIndexAt({ x, width: 658, count: 12 });

  it('maps a click to the slot it lands in', () => {
    expect(at(58 + 5)).toBe(0);
    expect(at(58 + 49)).toBe(0);
    expect(at(58 + 50)).toBe(1);
    expect(at(658 - 1)).toBe(11);
    expect(at(658 - 75)).toBe(10);
  });

  it('ignores clicks on the value axis', () => {
    expect(at(10)).toBe(-1);
    expect(at(57)).toBe(-1);
  });

  it('ignores clicks past the right edge', () => {
    expect(at(700)).toBe(-1);
  });
});
