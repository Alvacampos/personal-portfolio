import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CategoryBreakdown } from '~/data/admin-schema';

import { useCategoryIsolation } from './use-category-isolation';

const CATEGORIES: CategoryBreakdown[] = [
  {
    categoryId: 'groceries',
    categoryName: 'Groceries',
    total: { ars: 100, usd: 1 },
    transactionCount: 1,
  },
  {
    categoryId: 'transport',
    categoryName: 'Transport',
    total: { ars: 50, usd: 1 },
    transactionCount: 1,
  },
];

describe('useCategoryIsolation', () => {
  it('starts with nothing isolated', () => {
    const { result } = renderHook(() => useCategoryIsolation(CATEGORIES, '2026-08'));
    expect(result.current.activeCategoryId).toBeNull();
    expect(result.current.activeCategory).toBeNull();
  });

  it('toggling a category isolates it, toggling again clears it', () => {
    const { result } = renderHook(() => useCategoryIsolation(CATEGORIES, '2026-08'));

    act(() => result.current.toggleCategory('groceries'));
    expect(result.current.activeCategoryId).toBe('groceries');
    expect(result.current.activeCategory?.categoryName).toBe('Groceries');

    act(() => result.current.toggleCategory('groceries'));
    expect(result.current.activeCategoryId).toBeNull();
  });

  it('toggling a different category switches the isolation, not stacks it', () => {
    const { result } = renderHook(() => useCategoryIsolation(CATEGORIES, '2026-08'));

    act(() => result.current.toggleCategory('groceries'));
    act(() => result.current.toggleCategory('transport'));
    expect(result.current.activeCategoryId).toBe('transport');
  });

  it('clearCategory clears the isolation directly', () => {
    const { result } = renderHook(() => useCategoryIsolation(CATEGORIES, '2026-08'));
    act(() => result.current.toggleCategory('groceries'));
    act(() => result.current.clearCategory());
    expect(result.current.activeCategoryId).toBeNull();
  });

  it('resets the isolation when resetKey changes', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useCategoryIsolation(CATEGORIES, resetKey),
      { initialProps: { resetKey: '2026-08' } }
    );

    act(() => result.current.toggleCategory('groceries'));
    expect(result.current.activeCategoryId).toBe('groceries');

    rerender({ resetKey: '2026-09' });
    expect(result.current.activeCategoryId).toBeNull();
  });

  it('does not reset the isolation when resetKey stays the same across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useCategoryIsolation(CATEGORIES, resetKey),
      { initialProps: { resetKey: '2026-08' } }
    );

    act(() => result.current.toggleCategory('groceries'));
    rerender({ resetKey: '2026-08' });
    expect(result.current.activeCategoryId).toBe('groceries');
  });
});
