import { describe, it, expect } from 'vitest';
import {
  initialFilters,
  filtersReducer,
  filtersToSearchParams,
  filtersFromSearchParams,
  filtersToQuery,
  activeFilterCount,
} from './filters.js';

describe('transaction filters reducer', () => {
  it('sets a field and jumps back to page 1', () => {
    const state = { ...initialFilters, page: 4 };
    const next = filtersReducer(state, { type: 'set', field: 'q', value: 'swiggy' });
    expect(next).toMatchObject({ q: 'swiggy', page: 1 });
  });

  it('clears the category when the type changes', () => {
    const state = { ...initialFilters, type: 'expense', category: 'abc' };
    expect(filtersReducer(state, { type: 'set', field: 'type', value: 'income' })).toMatchObject({
      type: 'income',
      category: '',
    });
  });

  it('changes page without touching other filters', () => {
    const state = { ...initialFilters, q: 'rent' };
    expect(filtersReducer(state, { type: 'page', page: 3 })).toMatchObject({ q: 'rent', page: 3 });
  });

  it('resets filters but keeps the sort order', () => {
    const state = { ...initialFilters, q: 'x', type: 'income', sort: '-amount', page: 2 };
    expect(filtersReducer(state, { type: 'reset' })).toEqual({ ...initialFilters, sort: '-amount' });
  });

  it('counts active filters (sort and page are not filters)', () => {
    expect(activeFilterCount(initialFilters)).toBe(0);
    expect(activeFilterCount({ ...initialFilters, q: 'a', from: '2026-11-01', sort: 'amount', page: 3 })).toBe(2);
  });
});

describe('URL sync', () => {
  it('only writes non-default values to the URL', () => {
    const params = filtersToSearchParams({ ...initialFilters, type: 'expense', page: 2 });
    expect(params.toString()).toBe('type=expense&page=2');
  });

  it('reads filters back from the URL and ignores junk', () => {
    const f = filtersFromSearchParams(new URLSearchParams('type=income&page=3&sort=bogus&evil=1'));
    expect(f).toEqual({ ...initialFilters, type: 'income', page: 3 });
  });

  it('round-trips', () => {
    const f = { ...initialFilters, q: 'zomato', min: '100', to: '2026-11-30', sort: 'amount' };
    expect(filtersFromSearchParams(filtersToSearchParams(f))).toEqual(f);
  });
});

describe('API query', () => {
  it('converts rupee amount filters to paise and adds the page size', () => {
    const q = filtersToQuery({ ...initialFilters, min: '500', max: '1,200.50', type: 'expense' });
    expect(q).toMatchObject({ min: 50000, max: 120050, type: 'expense', page: 1, limit: 20, sort: '-date' });
  });

  it('drops invalid amounts rather than sending garbage', () => {
    expect(filtersToQuery({ ...initialFilters, min: 'abc' }).min).toBeUndefined();
  });
});
