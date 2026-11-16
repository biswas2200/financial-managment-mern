import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { useScrollCue } from './useScrollCue.js';

function Box() {
  const ref = useRef(null);
  const more = useScrollCue(ref);
  return <div ref={ref} data-testid="box" data-more={String(more)} />;
}

const metrics = (el, values) => Object.entries(values).forEach(([k, v]) => Object.defineProperty(el, k, { configurable: true, value: v }));

describe('useScrollCue', () => {
  it('is true while there is more to scroll to below, and false once you reach the end', () => {
    render(<Box />);
    const box = screen.getByTestId('box');
    metrics(box, { scrollHeight: 900, clientHeight: 500, scrollTop: 0 });
    fireEvent.scroll(box);
    expect(box).toHaveAttribute('data-more', 'true');
    metrics(box, { scrollTop: 398 });
    fireEvent.scroll(box);
    expect(box).toHaveAttribute('data-more', 'false');
  });

  it('is false when everything fits', () => {
    render(<Box />);
    const box = screen.getByTestId('box');
    metrics(box, { scrollHeight: 500, clientHeight: 500, scrollTop: 0 });
    fireEvent.scroll(box);
    expect(box).toHaveAttribute('data-more', 'false');
  });

  it('measures again when the window is resized', () => {
    render(<Box />);
    const box = screen.getByTestId('box');
    metrics(box, { scrollHeight: 900, clientHeight: 500, scrollTop: 0 });
    fireEvent(window, new Event('resize'));
    expect(box).toHaveAttribute('data-more', 'true');
  });
});
