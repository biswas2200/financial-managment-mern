/**
 * Default category catalog. Every new user gets these on sign-up and can add their own.
 * `icon` is a lucide-react icon name; `color` is the chip tint used in lists.
 */

export const TRANSACTION_TYPES = ['income', 'expense'];
export const PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'Bank', 'Wallet'];

export const DEFAULT_CATEGORIES = [
  // Expense
  { name: 'Rent & Housing', type: 'expense', icon: 'house', color: '#2a78d6' },
  { name: 'Groceries', type: 'expense', icon: 'shopping-basket', color: '#eb6834' },
  { name: 'Dining Out', type: 'expense', icon: 'utensils', color: '#1baf7a' },
  { name: 'Transport', type: 'expense', icon: 'car-front', color: '#eda100' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#e87ba4' },
  { name: 'Utilities', type: 'expense', icon: 'zap', color: '#008300' },
  { name: 'Entertainment', type: 'expense', icon: 'clapperboard', color: '#6250d6' },
  { name: 'Health', type: 'expense', icon: 'heart-pulse', color: '#e34948' },
  { name: 'Subscriptions', type: 'expense', icon: 'repeat', color: '#2a78d6' },
  { name: 'Education', type: 'expense', icon: 'graduation-cap', color: '#eb6834' },
  { name: 'Travel', type: 'expense', icon: 'plane', color: '#1baf7a' },
  { name: 'Personal Care', type: 'expense', icon: 'sparkles', color: '#e87ba4' },
  // Income
  { name: 'Salary', type: 'income', icon: 'briefcase', color: '#1baf7a' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#2a78d6' },
  { name: 'Investments', type: 'income', icon: 'trending-up', color: '#008300' },
  { name: 'Gifts', type: 'income', icon: 'gift', color: '#e87ba4' },
  { name: 'Refunds', type: 'income', icon: 'rotate-ccw', color: '#eda100' },
];
