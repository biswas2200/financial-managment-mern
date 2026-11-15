/**
 * Transaction list filters: a reducer for local state, kept in sync with the URL
 * (so filtered views can be bookmarked and survive refresh), plus the mapping to
 * API query params.
 */
import { toMinor, formatMoney, SORT_OPTIONS, toDayKey, toMonthKey, shiftMonth, monthRange } from '@kosha/shared';

export const initialFilters = {
  type: '',
  category: '',
  paymentMethod: '',
  q: '',
  from: '',
  to: '',
  min: '',
  max: '',
  sort: '-date',
  page: 1,
};

const FILTER_FIELDS = ['type', 'category', 'paymentMethod', 'q', 'from', 'to', 'min', 'max'];
export const PAGE_SIZE = 20;

/** Which state fields each removable filter chip stands for. */
const CHIP_FIELDS = {
  q: ['q'],
  type: ['type'],
  category: ['category'],
  paymentMethod: ['paymentMethod'],
  date: ['from', 'to'],
  amount: ['min', 'max'],
};

export function filtersReducer(state, action) {
  switch (action.type) {
    case 'set': {
      const next = { ...state, [action.field]: action.value, page: 1 };
      // A category belongs to one type; switching type invalidates it.
      if (action.field === 'type' && action.value !== state.type) next.category = '';
      return next;
    }
    case 'setMany':
      return { ...state, ...action.values, page: 1 };
    case 'clearChip': {
      const next = { ...state, page: 1 };
      for (const field of CHIP_FIELDS[action.key] ?? []) next[field] = initialFilters[field];
      return next;
    }
    case 'page':
      return { ...state, page: action.page };
    case 'replace':
      return { ...action.filters };
    case 'reset':
      return { ...initialFilters, sort: state.sort };
    default:
      return state;
  }
}

export function activeFilterCount(filters) {
  return FILTER_FIELDS.filter((f) => filters[f] !== '' && filters[f] !== initialFilters[f]).length;
}

export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === '' || value === initialFilters[key]) continue;
    params.set(key, String(value));
  }
  return params;
}

export function filtersFromSearchParams(params) {
  const filters = { ...initialFilters };
  for (const field of FILTER_FIELDS) {
    const value = params.get(field);
    if (value !== null) filters[field] = value;
  }
  const sort = params.get('sort');
  if (sort && SORT_OPTIONS.includes(sort)) filters.sort = sort;
  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 0) filters.page = page;
  return filters;
}

function rupeesToPaise(value) {
  if (value === '') return undefined;
  try {
    return toMinor(value);
  } catch {
    return undefined;
  }
}

export function filtersToQuery(filters) {
  return {
    type: filters.type || undefined,
    category: filters.category || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    q: filters.q.trim() || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    min: rupeesToPaise(filters.min),
    max: rupeesToPaise(filters.max),
    sort: filters.sort,
    page: filters.page,
    limit: PAGE_SIZE,
  };
}

// ---------- Quick date ranges ----------

export const DATE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

function daysBefore(dayKey, n) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - n * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Preset name → { from, to } as IST calendar days ("" means open-ended). */
export function datePresetRange(preset, now = new Date()) {
  const today = toDayKey(now);
  const month = toMonthKey(now);
  switch (preset) {
    case 'this-month':
      return { from: `${month}-01`, to: today };
    case 'last-month': {
      const prev = shiftMonth(month, -1);
      return { from: `${prev}-01`, to: toDayKey(new Date(monthRange(prev).end.getTime() - 1)) };
    }
    case 'last-30':
      return { from: daysBefore(today, 29), to: today };
    default:
      return { from: '', to: '' };
  }
}

/** Which preset (if any) a from/to range corresponds to. */
export function presetFromRange({ from, to }, now = new Date()) {
  if (!from && !to) return 'all';
  for (const p of ['this-month', 'last-month', 'last-30']) {
    const r = datePresetRange(p, now);
    if (r.from === from && r.to === to) return p;
  }
  return 'custom';
}

// ---------- Active filter chips ----------

const PAYMENT_LABELS = { UPI: 'UPI', Card: 'Card', Cash: 'Cash', Bank: 'Bank transfer', Wallet: 'Wallet' };
const dayLabel = (key) =>
  new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const rupees = (value) => {
  try {
    return formatMoney(toMinor(value), { decimals: 0 });
  } catch {
    return value;
  }
};

/** Plain-language chips for every active filter, in a stable order. */
export function activeFilterChips(filters, categories = []) {
  const chips = [];
  if (filters.q.trim()) chips.push({ key: 'q', label: `Search: ${filters.q.trim()}` });
  if (filters.type) chips.push({ key: 'type', label: filters.type === 'income' ? 'Income' : 'Expenses' });
  if (filters.category) {
    chips.push({ key: 'category', label: categories.find((c) => c.id === filters.category)?.name ?? 'Category' });
  }
  if (filters.paymentMethod) chips.push({ key: 'paymentMethod', label: PAYMENT_LABELS[filters.paymentMethod] ?? filters.paymentMethod });
  if (filters.from || filters.to) {
    const label =
      filters.from && filters.to
        ? `${dayLabel(filters.from)} to ${dayLabel(filters.to)}`
        : filters.from
          ? `From ${dayLabel(filters.from)}`
          : `Until ${dayLabel(filters.to)}`;
    chips.push({ key: 'date', label });
  }
  if (filters.min || filters.max) {
    const label =
      filters.min && filters.max
        ? `${rupees(filters.min)} to ${rupees(filters.max)}`
        : filters.min
          ? `From ${rupees(filters.min)}`
          : `Up to ${rupees(filters.max)}`;
    chips.push({ key: 'amount', label });
  }
  return chips;
}
