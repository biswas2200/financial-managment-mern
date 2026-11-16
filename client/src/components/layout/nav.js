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

/**
 * The app, grouped by what you are doing: managing money, investing, learning and talking, asking Copilot.
 * `color` is the icon's colour on the phone (tab bar and More sheet); every place has its own.
 */
export const NAV_SECTIONS = [
  {
    id: 'money',
    label: 'Money',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true, color: '#4a6cf0' },
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, color: '#0fa3b8' },
      { to: '/analytics', label: 'Analytics', icon: ChartColumn, color: '#8b5cf6' },
      { to: '/budgets', label: 'Budgets', icon: PiggyBank, color: '#ea7a2d' },
    ],
  },
  {
    id: 'invest',
    label: 'Invest',
    items: [
      { to: '/markets', label: 'Markets', icon: TrendingUp, end: true, color: '#16a34a' },
      { to: '/markets/stocks', label: 'Stocks', icon: ChartCandlestick, color: '#e5484d' },
      { to: '/markets/funds', label: 'Mutual funds', icon: Landmark, color: '#0f8fd8' },
      { to: '/markets/watchlist', label: 'Watchlist', icon: Star, color: '#e6a817' },
    ],
  },
  {
    id: 'learn',
    label: 'Learn & talk',
    items: [
      { to: '/learn', label: 'Learn', icon: BookOpen, color: '#12b5a0' },
      { to: '/discussions', label: 'Discussions', icon: MessagesSquare, color: '#e0509a' },
    ],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    items: [{ to: '/copilot', label: 'Copilot', icon: MessageCircle, color: '#b04fd8' }],
  },
];

export const SETTINGS_ITEM = { to: '/settings', label: 'Settings', icon: Settings, color: '#64748b' };

const find = (label) => NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.label === label);

/** The phone tab bar has room for four places; the fifth tab, More, opens everything else. */
export const MOBILE_TABS = ['Overview', 'Transactions', 'Markets', 'Copilot'].map(find);

/** What the More sheet lists: every place in the app, in the same groups, plus Settings. */
export const MORE_SECTIONS = [...NAV_SECTIONS, { id: 'account', label: 'Account', items: [SETTINGS_ITEM] }];
