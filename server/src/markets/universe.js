/**
 * A curated sample of widely held direct growth plans, used for the "past performers" view.
 * Codes are AMFI scheme codes (checked against mfapi.in). It is a sample, not the whole market and not
 * a recommendation: any scheme can be searched and opened from the Mutual funds page.
 */

export const FUND_CATEGORIES = [
  { id: 'index', label: 'Index funds', description: 'Copy the Nifty 50 at low cost.' },
  { id: 'large', label: 'Large cap', description: 'Invest mainly in the 100 biggest listed companies.' },
  { id: 'flexi', label: 'Flexi cap', description: 'The manager can move between large, mid and small companies.' },
  { id: 'mid', label: 'Mid cap', description: 'Mid-sized companies: more growth potential, more ups and downs.' },
  { id: 'small', label: 'Small cap', description: 'Smaller companies: the biggest swings, and harder to sell in a fall.' },
  { id: 'elss', label: 'Tax saver (ELSS)', description: 'Equity funds with a 3-year lock-in. Check the current tax rules before counting on any deduction.' },
  { id: 'hybrid', label: 'Balanced advantage', description: 'A mix of equity and debt that shifts with market valuations.' },
  { id: 'debt', label: 'Liquid and bond', description: 'Lower-risk debt funds for short parking and steadier income.' },
  { id: 'gold', label: 'Gold', description: 'Funds that track the price of gold.' },
];

export const MF_UNIVERSE = [
  { code: 120716, category: 'index' }, // UTI Nifty 50 Index Fund
  { code: 119063, category: 'index' }, // HDFC Nifty 50 Index Fund
  { code: 119827, category: 'index' }, // SBI Nifty Index Fund
  { code: 118741, category: 'index' }, // Nippon India Index Fund Nifty 50 Plan
  { code: 118482, category: 'index' }, // Bandhan Nifty 50 Index Fund
  { code: 118825, category: 'large' }, // Mirae Asset Large Cap Fund
  { code: 118632, category: 'large' }, // Nippon India Large Cap Fund
  { code: 120586, category: 'large' }, // ICICI Prudential Large Cap Fund
  { code: 122639, category: 'flexi' }, // Parag Parikh Flexi Cap Fund
  { code: 118955, category: 'flexi' }, // HDFC Flexi Cap Fund
  { code: 120662, category: 'flexi' }, // UTI Flexi Cap Fund
  { code: 119718, category: 'flexi' }, // SBI Flexicap Fund
  { code: 118668, category: 'mid' }, // Nippon India Growth Mid Cap Fund
  { code: 118989, category: 'mid' }, // HDFC Mid Cap Fund
  { code: 120505, category: 'mid' }, // Axis Midcap Fund
  { code: 118778, category: 'small' }, // Nippon India Small Cap Fund
  { code: 125497, category: 'small' }, // SBI Small Cap Fund
  { code: 125354, category: 'small' }, // Axis Small Cap Fund
  { code: 130503, category: 'small' }, // HDFC Small Cap Fund
  { code: 135781, category: 'elss' }, // Mirae Asset ELSS Tax Saver Fund
  { code: 120503, category: 'elss' }, // Axis ELSS Tax Saver Fund
  { code: 120847, category: 'elss' }, // Quant ELSS Tax Saver Fund
  { code: 147481, category: 'elss' }, // Parag Parikh ELSS Tax Saver Fund
  { code: 120377, category: 'hybrid' }, // ICICI Prudential Balanced Advantage Fund
  { code: 118968, category: 'hybrid' }, // HDFC Balanced Advantage Fund
  { code: 119091, category: 'debt' }, // HDFC Liquid Fund
  { code: 119800, category: 'debt' }, // SBI Liquid Fund
  { code: 120197, category: 'debt' }, // ICICI Prudential Liquid Fund
  { code: 133791, category: 'debt' }, // Kotak Corporate Bond Fund
  { code: 118987, category: 'debt' }, // HDFC Corporate Bond Fund
  { code: 118663, category: 'gold' }, // Nippon India Gold Savings Fund
  { code: 119788, category: 'gold' }, // SBI Gold Fund
];
