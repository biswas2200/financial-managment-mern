/**
 * Transaction list filters: a reducer for local state, kept in sync with the URL
 * (so filtered views can be bookmarked and survive refresh), plus the mapping to
 * API query params.
 */
import { toMinor, SORT_OPTIONS } from '@kosha/shared';

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

export function filtersReducer(state, action) {
  switch (action.type) {
    case 'set': {
      const next = { ...state, [action.field]: action.value, page: 1 };
      // A category belongs to one type; switching type invalidates it.
      if (action.field === 'type' && action.value !== state.type) next.category = '';
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
