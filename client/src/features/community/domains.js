import { DOMAINS, SPACES } from '@kosha/shared';

/** Colours for the domain dots. Chosen to read on both the light and the dark theme. */
const COLORS = {
  saving: '#1baf7a',
  investing: '#6250d6',
  stocks: '#2a78d6',
  funds: '#eb6834',
  tax: '#d99a1e',
  protection: '#e87ba4',
  credit: '#e34948',
  safety: '#0e9aa7',
  general: '#7d86a3',
};

export const BLURBS = {
  saving: 'Cushions, budgets and the habits that make them stick.',
  investing: 'How money grows, and how to think about risk and time.',
  stocks: 'How the Indian market works and how to read a stock page.',
  funds: 'NAV, costs, index versus active, and reading fund returns.',
  tax: 'Records and rules of thumb. Always check current figures.',
  protection: 'Term life and health cover that protect everything else.',
  credit: 'Scores, cards and loans without the debt trap.',
  safety: 'Spot scams and keep your UPI and savings safe.',
};

export const domainLabel = (id) => SPACES.find((s) => s.id === id)?.label ?? id;
export const domainColor = (id) => COLORS[id] ?? COLORS.general;
export const DOMAIN_LIST = DOMAINS;
