import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { AppBackdrop } from './AppBackdrop.jsx';
import { CityStrip } from './CityStrip.jsx';
import { SketchSky } from './SketchSky.jsx';

const MOVING = /\bsk-(pan|draw|fill|ripple|bob|sway|vehicle|twinkle|sun|ring|rays|cloud|fly|flap)\b/;
const classesOf = (container) => [...container.querySelectorAll('[class]')].map((el) => el.getAttribute('class')).join(' ');

describe('a still skyline', () => {
  it('has no animation at all: nothing pans, draws in, ripples, bobs, sways, drifts or flies', () => {
    const { container } = render(<CityStrip still />);
    expect(classesOf(container)).not.toMatch(MOVING);
    expect(container.querySelector('[data-motion]')).toHaveAttribute('data-motion', 'still');
  });

  it('is still the same six-city design, drawn once and fitted to the width', () => {
    render(<CityStrip still />);
    const img = screen.getByRole('img', { name: /Mumbai, Delhi, Kolkata, Hyderabad, Bengaluru and Chennai/ });
    expect(img.getAttribute('preserveAspectRatio')).toBe('xMidYMax slice');
    expect(img.querySelectorAll('path').length).toBeGreaterThan(300);
  });

  it('keeps boats and details where they belong, without moving them', () => {
    const { container } = render(<CityStrip still />);
    expect(container.querySelector('g[transform^="translate("] > path')).toBeInTheDocument();
  });

  it('can leave the captions out and be hidden from screen readers', () => {
    const { container } = render(<CityStrip still labels={false} decorative />);
    expect(container.querySelector('text')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('a still sky', () => {
  it('shows the sun and the clouds and nothing that moves, and no birds', () => {
    const { container } = render(<SketchSky still />);
    expect(container.querySelector('[data-sun]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-cloud]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('[data-bird]')).toHaveLength(0);
    expect(classesOf(container)).not.toMatch(MOVING);
  });
});

describe('AppBackdrop', () => {
  it('is a quiet, fixed picture behind the page that takes no clicks and says nothing to screen readers', () => {
    const { container } = render(<AppBackdrop />);
    const root = container.firstChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveAttribute('data-still', 'true');
    expect(root.className).toMatch(/fixed/);
    expect(root.className).toMatch(/pointer-events-none/);
    expect(root.className).toMatch(/-z-10/);
    expect(root.className).toMatch(/sketch-backdrop/);
  });

  it('is the same sketch as the landing page, standing still', () => {
    const { container } = render(<AppBackdrop />);
    expect(container.querySelector('[data-sun]')).toBeInTheDocument();
    expect(container.querySelector('[data-motion="still"]')).toBeInTheDocument();
    expect(classesOf(container)).not.toMatch(MOVING);
  });

  it('starts to the right of the sidebar on a laptop, so the sidebar is not drawn over', () => {
    const { container } = render(<AppBackdrop />);
    expect(container.firstChild.className).toMatch(/lg:left-64/);
  });
});

describe('page background', () => {
  const css = readFileSync(path.resolve(__dirname, '../../../styles/index.css'), 'utf8');

  it('is flat paper: no soft blue glow behind the page', () => {
    const body = /\n  body \{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(body).toContain('var(--paper)');
    expect(body).not.toMatch(/radial-gradient/);
  });

  it('draws the backdrop faintly, in ink that suits each theme', () => {
    expect(css).toMatch(/\.sketch-backdrop \{[^}]*opacity: 0\.\d+/);
    expect(css).toMatch(/\[data-theme='dark'\] \.sketch-backdrop/);
  });
});
