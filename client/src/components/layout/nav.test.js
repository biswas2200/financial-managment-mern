import { describe, it, expect } from 'vitest';
import { NAV_SECTIONS, SETTINGS_ITEM, MOBILE_TABS, MORE_SECTIONS } from './nav.js';
import { pageKey } from './AppShell.jsx';

const flat = NAV_SECTIONS.flatMap((s) => s.items);

describe('navigation', () => {
  it('groups the app into domains', () => {
    expect(NAV_SECTIONS.map((s) => s.label)).toEqual(['Money', 'Invest', 'Learn & talk', 'Assistant']);
    expect(flat.map((i) => i.label)).toEqual([
      'Overview', 'Transactions', 'Analytics', 'Budgets',
      'Markets', 'Stocks', 'Mutual funds', 'Watchlist',
      'Learn', 'Discussions',
      'Copilot',
    ]);
  });

  it('has a unique path for every item, each with an icon', () => {
    const paths = [...flat, SETTINGS_ITEM].map((i) => i.to);
    expect(new Set(paths).size).toBe(paths.length);
    for (const item of [...flat, SETTINGS_ITEM]) {
      expect(item.to.startsWith('/')).toBe(true);
      expect(item.icon, item.label).toBeTruthy();
    }
  });

  it('matches the Overview and Markets links exactly so they are not lit on every page below them', () => {
    expect(flat.find((i) => i.label === 'Overview').end).toBe(true);
    expect(flat.find((i) => i.label === 'Markets').end).toBe(true);
    expect(flat.find((i) => i.label === 'Stocks').end).toBeFalsy();
  });

  it('keeps four everyday places on the phone tab bar, with More for the rest', () => {
    expect(MOBILE_TABS.map((t) => t.label)).toEqual(['Overview', 'Transactions', 'Markets', 'Copilot']);
  });

  it('puts everything that is not on the tab bar behind More, and loses nothing', () => {
    const behindMore = MORE_SECTIONS.flatMap((s) => s.items).map((i) => i.to);
    for (const item of [...flat, SETTINGS_ITEM]) expect(behindMore, item.label).toContain(item.to);
  });
});


describe('pageKey', () => {
  it('keeps one key for a list and the article, post or settings tab opened inside it', () => {
    expect(pageKey('/learn')).toBe('learn');
    expect(pageKey('/learn/emergency-fund')).toBe('learn');
    expect(pageKey('/discussions/64b0c0c0c0c0c0c0c0c0c0c0')).toBe('discussions');
    expect(pageKey('/settings/categories')).toBe('settings');
  });

  it('gives every other page its own key, so it animates in when you arrive', () => {
    expect(pageKey('/')).toBe('/');
    expect(pageKey('/markets')).toBe('/markets');
    expect(pageKey('/markets/stocks/TCS')).toBe('/markets/stocks/TCS');
    expect(pageKey('/learning-notes')).toBe('/learning-notes');
  });
});
