import { describe, it, expect } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { CityStrip } from './CityStrip.jsx';
import { SketchSky } from './SketchSky.jsx';
import { CityScene } from './CityScene.jsx';

describe('CityStrip', () => {
  it('is one image described by the cities it shows', () => {
    render(<CityStrip />);
    expect(screen.getByRole('img', { name: /Mumbai, Delhi, Kolkata, Hyderabad, Bengaluru and Chennai/ })).toBeInTheDocument();
  });

  it('names each city and its landmark', () => {
    render(<CityStrip />);
    const img = screen.getByRole('img');
    for (const text of ['Mumbai', 'Gateway of India', 'Howrah Bridge', 'Charminar', 'Vidhana Soudha', 'Kapaleeshwarar Temple']) {
      expect(within(img).getByText(text)).toBeInTheDocument();
    }
  });

  it('can leave the captions out', () => {
    render(<CityStrip labels={false} />);
    expect(within(screen.getByRole('img')).queryByText('Mumbai')).not.toBeInTheDocument();
  });

  it('pans slowly, using a second copy so the loop has no seam, and hides that copy from screen readers', () => {
    const { container } = render(<CityStrip />);
    const pan = container.querySelector('[data-motion="pan"]');
    expect(pan).toBeInTheDocument();
    const copies = pan.querySelectorAll('svg');
    expect(copies).toHaveLength(2);
    expect(copies[1]).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws live details that move: ripples, boats and vehicles', () => {
    const { container } = render(<CityStrip />);
    for (const live of ['ripple', 'bob', 'vehicle']) expect(container.querySelector(`.sk-${live}`), live).toBeInTheDocument();
  });

  it('draws outlines that can be drawn in stroke by stroke', () => {
    const { container } = render(<CityStrip />);
    const stroke = container.querySelector('path[pathLength="1"]');
    expect(stroke).toBeInTheDocument();
    expect(stroke.getAttribute('class')).toMatch(/sk-draw/);
  });
});

describe('SketchSky', () => {
  it('has a red sun, drifting clouds and birds, and is decoration only', () => {
    const { container } = render(<SketchSky />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[data-sun]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-cloud]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('[data-bird]').length).toBeGreaterThanOrEqual(3);
  });
});

describe('CityScene when it scrolls out of view', () => {
  it('pauses its animations off screen and resumes when it comes back, to save the battery', () => {
    let notify;
    const originalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    };
    const { container } = render(<CityScene />);
    const scene = container.querySelector('.sketch-scene');
    expect(scene).toHaveAttribute('data-paused', 'false');
    act(() => notify([{ isIntersecting: false }]));
    expect(scene).toHaveAttribute('data-paused', 'true');
    act(() => notify([{ isIntersecting: true }]));
    expect(scene).toHaveAttribute('data-paused', 'false');
    globalThis.IntersectionObserver = originalObserver;
  });

  it('still works where the browser has no IntersectionObserver', () => {
    const originalObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = undefined;
    const { container } = render(<CityScene />);
    expect(container.querySelector('.sketch-scene')).toHaveAttribute('data-paused', 'false');
    globalThis.IntersectionObserver = originalObserver;
  });
});

describe('CityScene', () => {
  it('layers the sky behind the skyline', () => {
    const { container } = render(<CityScene />);
    expect(container.querySelector('[data-sun]')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mumbai/ })).toBeInTheDocument();
  });
});
