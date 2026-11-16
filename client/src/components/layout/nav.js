import {
  LayoutDashboard,
  ArrowLeftRight,
  ChartColumn,
  PiggyBank,
  TrendingUp,
  ChartCandlestick,
  Landmark,
  Star,
  BookOpen,
  MessagesSquare,
  MessageCircle,
  Settings,
} from 'lucide-react';

/** The app, grouped by what you are doing: managing money, investing, learning and talking, asking Copilot. */
export const NAV_SECTIONS = [
  {
    id: 'money',
    label: 'Money',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/analytics', label: 'Analytics', icon: ChartColumn },
      { to: '/budgets', label: 'Budgets', icon: PiggyBank },
    ],
  },
  {
    id: 'invest',
    label: 'Invest',
    items: [
      { to: '/markets', label: 'Markets', icon: TrendingUp, end: true },
      { to: '/markets/stocks', label: 'Stocks', icon: ChartCandlestick },
      { to: '/markets/funds', label: 'Mutual funds', icon: Landmark },
      { to: '/markets/watchlist', label: 'Watchlist', icon: Star },
    ],
  },
  {
    id: 'learn',
    label: 'Learn & talk',
    items: [
      { to: '/learn', label: 'Learn', icon: BookOpen },
      { to: '/discussions', label: 'Discussions', icon: MessagesSquare },
    ],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    items: [{ to: '/copilot', label: 'Copilot', icon: MessageCircle }],
  },
];

export const SETTINGS_ITEM = { to: '/settings', label: 'Settings', icon: Settings };

const find = (label) => NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.label === label);

/** The phone tab bar has room for four places; the fifth tab, More, opens everything else. */
export const MOBILE_TABS = ['Overview', 'Transactions', 'Markets', 'Copilot'].map(find);

/** What the More sheet lists: every place in the app, in the same groups, plus Settings. */
export const MORE_SECTIONS = [...NAV_SECTIONS, { id: 'account', label: 'Account', items: [SETTINGS_ITEM] }];
