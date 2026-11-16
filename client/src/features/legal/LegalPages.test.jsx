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

describe('Privacy Policy: community, watchlist and market data', () => {
  it('says what other members see: a first name and initial, an icon, never a photo or the money data', () => {
    renderPage(<PrivacyPage />);
    const text = document.body.textContent;
    expect(text).toMatch(/first name and the first letter of your last name/i);
    expect(text).toMatch(/uploaded photos are never shown to other members/i);
    expect(text).toMatch(/never visible to other members/i);
  });

  it('lists posts, comments, reactions and the watchlist among the data collected', () => {
    renderPage(<PrivacyPage />);
    for (const item of [/posts, comments and reactions/i, /watchlist/i]) expect(screen.getAllByText(item).length, String(item)).toBeGreaterThan(0);
  });

  it('explains where market figures come from, and that nothing about you goes to those sources', () => {
    renderPage(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 2, name: /market data and guides/i })).toBeInTheDocument();
    const text = document.body.textContent;
    expect(text).toMatch(/NSE India/);
    expect(text).toMatch(/AMFI/);
    expect(text).toMatch(/nothing about you is sent/i);
    expect(text).toMatch(/end-of-day/i);
  });

  it('says deleting the account removes what you posted, commented, reacted to and watched', () => {
    renderPage(<PrivacyPage />);
    expect(document.body.textContent).toMatch(/posts, comments, reactions and watchlist/i);
  });
});

describe('Terms of Use: community and markets', () => {
  it('sets the community rules: respect, no personal details, no tips to buy, and that posts can be removed', () => {
    renderPage(<TermsPage />);
    expect(screen.getByRole('heading', { level: 2, name: /community/i })).toBeInTheDocument();
    const text = document.body.textContent;
    expect(text).toMatch(/personal or financial details/i);
    expect(text).toMatch(/specific investment/i);
    expect(text).toMatch(/may remove/i);
  });

  it('says market data and guides are education, end-of-day and possibly wrong, and not advice', () => {
    renderPage(<TermsPage />);
    expect(screen.getByRole('heading', { level: 2, name: /markets and guides/i })).toBeInTheDocument();
    const text = document.body.textContent;
    expect(text).toMatch(/not investment advice/i);
    expect(text).toMatch(/end-of-day/i);
    expect(text).toMatch(/SEBI-registered/i);
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
