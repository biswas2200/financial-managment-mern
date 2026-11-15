import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom has no PointerEvent; a MouseEvent subclass keeps clientX/clientY in tests.
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
    }
  };
}

// jsdom has no matchMedia. Default to reduced motion so counters show final values;
// motion tests replace this stub.
window.matchMedia ??= (query) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});

// jsdom has no modal <dialog>: open it with the same attribute the browser sets.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.show ??= function show() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
