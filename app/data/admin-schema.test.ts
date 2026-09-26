import { describe, expect, it } from 'vitest';

import {
  FIXTURE_ANALYSIS_NOT_AVAILABLE,
  FIXTURE_ANALYSIS_READY,
  FIXTURE_CATEGORIES,
  FIXTURE_MONTH,
  FIXTURE_MONTH_EMPTY,
  FIXTURE_YEAR,
  FIXTURE_YTD,
} from './admin-fixtures';
import {
  parseCategoriesResponse,
  parseMonthlyAnalysisResponse,
  parseMonthResponse,
  parseYearResponse,
} from './admin-schema';

// These tests exist to keep the fixtures and the schema honest against
// each other as both evolve — if a fixture and the schema drift apart,
// this is where it gets caught, not at Phase C when a real backend
// response is the first thing to disagree with either of them.
describe('admin API contract fixtures', () => {
  it('parses the categories fixture', () => {
    expect(parseCategoriesResponse(FIXTURE_CATEGORIES)).toHaveLength(6);
  });

  it('parses a normal month fixture', () => {
    const data = parseMonthResponse(FIXTURE_MONTH);
    expect(data.transactions).toHaveLength(10);
    expect(data.categories.reduce((sum, c) => sum + c.total.ars, 0)).toBe(data.total.ars);
  });

  it('parses the empty-month fixture', () => {
    const data = parseMonthResponse(FIXTURE_MONTH_EMPTY);
    expect(data.transactions).toHaveLength(0);
    expect(data.deltaPercent).toBeNull();
  });

  it('parses a completed-year fixture', () => {
    const data = parseYearResponse(FIXTURE_YEAR);
    expect(data.monthlyTotals).toHaveLength(12);
  });

  it('parses a YTD (partial-year) fixture against the same schema', () => {
    const data = parseYearResponse(FIXTURE_YTD);
    expect(data.monthlyTotals.length).toBeLessThan(12);
  });

  it('parses a ready monthly analysis', () => {
    const data = parseMonthlyAnalysisResponse(FIXTURE_ANALYSIS_READY);
    expect(data.status).toBe('ready');
  });

  it('parses a not-available monthly analysis', () => {
    const data = parseMonthlyAnalysisResponse(FIXTURE_ANALYSIS_NOT_AVAILABLE);
    expect(data.status).toBe('not_available');
  });

  it('rejects a month response missing a required field', () => {
    const bad = { ...FIXTURE_MONTH, total: undefined };
    expect(() => parseMonthResponse(bad)).toThrow(/total/);
  });
});
