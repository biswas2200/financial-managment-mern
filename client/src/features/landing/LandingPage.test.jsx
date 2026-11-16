import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../app/theme.jsx';
import LandingPage from './LandingPage.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <LandingPage />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe('Landing page', () => {
  it('opens with what Kosha is for, and a way to start', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Know where every rupee goes.' })).toBeInTheDocument();
    const hero = screen.getByRole('region', { name: 'Kosha' });
    expect(within(hero).getByRole('link', { name: 'Create your account' })).toHaveAttribute('href', '/register');
    expect(within(hero).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('has the same two links in the header', () => {
    renderPage();
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(within(header).getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
  });

  it('shows the live sketch of Indian cities', () => {
    renderPage();
    expect(screen.getByRole('img', { name: /Mumbai, Delhi, Kolkata, Hyderabad, Bengaluru and Chennai/ })).toBeInTheDocument();
  });

  it('describes the four parts of the app, in the same domains as the sidebar', () => {
    renderPage();
    for (const name of ['Money', 'Invest', 'Learn & talk', 'Assistant']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByText(/NSE and AMFI/)).toBeInTheDocument();
    expect(screen.getByText(/UPI/)).toBeInTheDocument();
  });

  it('is plain about what it will not do', () => {
    renderPage();
    const honest = screen.getByRole('region', { name: 'What Kosha is honest about' });
    expect(honest).toHaveTextContent(/end-of-day/i);
    expect(honest).toHaveTextContent(/instead of showing made-up numbers/i);
    expect(honest).toHaveTextContent(/offline engine/i);
    expect(honest).toHaveTextContent(/delete your account/i);
    expect(honest).toHaveTextContent(/not advice/i);
  });

  it('ends with another way in, and the legal links', () => {
    renderPage();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(within(footer).getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms');
    expect(screen.getAllByRole('link', { name: /Create (your )?account/ }).length).toBeGreaterThanOrEqual(3);
  });

  it('lets people choose a theme', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Switch to (dark|light) theme/ })).toBeInTheDocument();
  });
});
