import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { POLICY_VERSION } from '@kosha/shared';
import { ThemeProvider } from '../../app/theme.jsx';
import { PrivacyPage, TermsPage } from './LegalPages.jsx';

const renderPage = (ui) =>
  render(
    <MemoryRouter>
      <ThemeProvider>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

describe('Privacy Policy', () => {
  it('states the version the user agrees to at sign-up', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(POLICY_VERSION))).toBeInTheDocument();
  });

  it('covers every kind of data Kosha collects, why, who sees it, and how to remove it', () => {
    renderPage(<PrivacyPage />);
    for (const heading of [
      /what we collect/i,
      /why we use it/i,
      /copilot and google gemini/i,
      /who can see it/i,
      /how long we keep it/i,
      /your choices and rights/i,
      /security/i,
      /children/i,
      /changes to this policy/i,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: heading }), String(heading)).toBeInTheDocument();
    }
    for (const item of [/phone number/i, /date of birth/i, /profile picture/i, /transactions/i, /copilot messages/i]) {
      expect(screen.getAllByText(item).length, String(item)).toBeGreaterThan(0);
    }
  });

  it('is honest that it is a student project and not legal advice', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByText(/student project/i)).toBeInTheDocument();
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
  });

  it('links to the Terms and back to the app', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByRole('link', { name: /terms of use/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /back to kosha/i })).toHaveAttribute('href', '/');
  });
});

describe('Terms of Use', () => {
  it('explains that Copilot is not financial advice and can be wrong', () => {
    renderPage(<TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });

  it('links to the Privacy Policy', () => {
    renderPage(<TermsPage />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
  });
});
