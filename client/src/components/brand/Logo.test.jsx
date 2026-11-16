import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../app/theme.jsx';
import { Logo, LogoMark, LOGO_COLORS } from './Logo.jsx';

const favicon = readFileSync(path.resolve(__dirname, '../../../public/favicon.svg'), 'utf8');

describe('the Kosha logo', () => {
  it('is drawn in fixed colours on a black tile, so it is the same in light and dark mode and on any background', () => {
    const markup = renderToStaticMarkup(<LogoMark />);
    expect(markup).not.toMatch(/var\(/); // nothing that follows the theme
    expect(markup).toContain(`fill="${LOGO_COLORS.tile}"`);
    expect(LOGO_COLORS.tile).toMatch(/^#0[0-9a-f]{5}$/i); // near black
  });

  it('draws the same picture however it is sized or placed', () => {
    const strip = (s) => s.replace(/ (width|height|class)="[^"]*"/g, '');
    expect(strip(renderToStaticMarkup(<LogoMark size={20} />))).toBe(strip(renderToStaticMarkup(<LogoMark size={48} className="x" />)));
  });

  it('is the same under the light and the dark theme', () => {
    const html = (theme) => {
      localStorage.setItem('kosha-theme', theme);
      document.documentElement.dataset.theme = theme;
      const { container, unmount } = render(
        <ThemeProvider>
          <LogoMark />
        </ThemeProvider>,
      );
      const out = container.innerHTML;
      unmount();
      return out;
    };
    expect(html('light')).toBe(html('dark'));
    localStorage.clear();
  });

  it('is the same picture as the favicon', () => {
    for (const colour of Object.values(LOGO_COLORS)) expect(favicon.toLowerCase()).toContain(colour.toLowerCase());
    expect(favicon).not.toMatch(/var\(/);
  });

  it('keeps the name beside the mark, and the mark stays hidden from screen readers', () => {
    render(<Logo />);
    expect(screen.getByText('Kosha')).toBeInTheDocument();
    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
