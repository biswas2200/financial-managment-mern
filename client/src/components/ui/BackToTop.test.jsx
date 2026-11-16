import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackToTop } from './BackToTop.jsx';

const scrollTo = vi.fn();

function scrollPageTo(y) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

function reducedMotion(on) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: on && /reduce/.test(query), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
}

beforeEach(() => {
  scrollTo.mockReset();
  window.scrollTo = scrollTo;
  reducedMotion(false);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});
afterEach(() => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

describe('BackToTop', () => {
  it('is not there at the top of a page', () => {
    render(<BackToTop />);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
  });

  it('is not there after only a little scrolling either', () => {
    render(<BackToTop />);
    scrollPageTo(200);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
  });

  it('appears once the page has been scrolled a good way, and goes again on the way back up', () => {
    render(<BackToTop />);
    scrollPageTo(900);
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
    scrollPageTo(40);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
  });

  it('shows if the page is already scrolled when it first loads (after a reload, say)', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1500 });
    render(<BackToTop />);
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });

  it('scrolls smoothly to the top when pressed', async () => {
    render(<BackToTop />);
    scrollPageTo(900);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to top' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('jumps instead of gliding for people who asked their device for less motion', async () => {
    reducedMotion(true);
    render(<BackToTop />);
    scrollPageTo(900);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to top' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('moves the keyboard to the start of the page, so Tab carries on from the top', async () => {
    render(
      <>
        <a href="#main">Skip to content</a>
        <main id="main" tabIndex={-1}>
          <BackToTop />
        </main>
      </>,
    );
    scrollPageTo(900);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back to top' }));
    expect(document.getElementById('main')).toHaveFocus();
  });

  it('can be placed by the page that uses it, so it never sits on top of another control', () => {
    render(<BackToTop className="bottom-24 right-4" />);
    scrollPageTo(900);
    expect(screen.getByRole('button', { name: 'Back to top' })).toHaveClass('bottom-24', 'right-4');
  });

  it('stops listening when it is removed', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<BackToTop />);
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    remove.mockRestore();
  });

  it('does nothing while the scroll position is unchanged, so scrolling does not redraw it over and over', () => {
    let renders = 0;
    function Probe() {
      renders += 1;
      return <BackToTop />;
    }
    render(<Probe />);
    scrollPageTo(900);
    const after = renders;
    for (let y = 910; y < 1000; y += 10) fireEvent.scroll(window, { target: { scrollY: y } });
    expect(renders).toBe(after);
  });
});
