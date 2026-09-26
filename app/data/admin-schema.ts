import { z } from 'zod';

import { formatZodError } from './format-zod-error';

// The API contract for the `/admin` section's backend (a separate repo —
// see docs/finance-tracker-backend-kickoff.md). Both sides are being built
// in parallel, so this schema is the frontend's half of that contract: it
// documents exactly what shape a real response has to match, validates
// fixtures (app/data/admin-fixtures.ts) the same way it'll later validate
// live API responses in Phase C, and gives loaders a typed value instead
// of `unknown`.
//
// Wire format is camelCase, matching every other JSON payload already in
// this repo (skills.json, education.json, projects.json) — NOT the
// snake_case FastAPI/Pydantic emits by default. The backend needs
// `alias_generator=to_camel` (or equivalent per-field `Field(alias=...)`)
// on its response models, or these responses simply won't match this
// schema once Phase C swaps fixtures for the real fetch.
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const isoDateTime = z.string().datetime({ offset: true });

// Every reporting figure carries both a native-ARS total and a
// USD-equivalent (finance-tracker-backend-kickoff.md §3.5) — never just
// one or the other, since a bare ARS number is misleading month-to-month
// without adjusting for inflation/exchange rate.
const moneyAmount = z.object({
  ars: z.number(),
  usd: z.number(),
});

const category = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const categoryBreakdown = z.object({
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  total: moneyAmount,
  transactionCount: z.number().int().nonnegative(),
});

const currencyCode = z.enum(['ARS', 'USD']);

const transaction = z.object({
  id: z.string().min(1),
  occurredOn: isoDate,
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  description: z.string(),
  amount: moneyAmount,
  // The currency the expense was natively entered in — distinct from
  // `amount`, which always carries both. See backend kickoff §3.5.
  currency: currencyCode,
  paidBy: z.string().min(1),
  // Nullable, not optional: the `trips` schema exists from day one even
  // though trip tagging is a fast-follow (backend kickoff §3.7), so the
  // field is always present on the wire, just usually null.
  tripId: z.string().nullable(),
});

export const MonthResponseSchema = z.object({
  month: yearMonth,
  total: moneyAmount,
  // Null when there's no prior month to compare against (e.g. the very
  // first month of data) — the frontend's delta display (finance-frontend
  // §4) needs to handle that, not assume a previous month always exists.
  previousMonthTotal: moneyAmount.nullable(),
  deltaPercent: z.number().nullable(),
  categories: z.array(categoryBreakdown),
  transactions: z.array(transaction),
});

const monthlyTotal = z.object({
  month: yearMonth,
  total: moneyAmount,
});

// Shared by both `/api/years/{yyyy}` and `/api/ytd` — the backend kickoff
// doc (§6) says YTD "same shape as /years, bounded at today," which in
// practice just means fewer entries in `monthlyTotals`, not a different
// schema.
export const YearResponseSchema = z.object({
  year: z.number().int(),
  total: moneyAmount,
  monthlyTotals: z.array(monthlyTotal),
  categories: z.array(categoryBreakdown),
});

export const CategoriesResponseSchema = z.array(category);

// Mid-month handling (finance-frontend §9): the current, still-incomplete
// month never gets an analysis — `not_available` is the only valid state
// for it, not an empty string or a null `analysis` field. Modeled as a
// discriminated union so a consumer can't accidentally read `.analysis`
// off a month that was never generated.
export const MonthlyAnalysisResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ready'),
    month: yearMonth,
    analysis: z.string().min(1),
    generatedAt: isoDateTime,
  }),
  z.object({
    status: z.literal('not_available'),
    month: yearMonth,
    reason: z.literal('month_in_progress'),
  }),
]);

export type MoneyAmount = z.infer<typeof moneyAmount>;
export type Category = z.infer<typeof category>;
export type CategoryBreakdown = z.infer<typeof categoryBreakdown>;
export type Transaction = z.infer<typeof transaction>;
export type MonthResponse = z.infer<typeof MonthResponseSchema>;
export type YearResponse = z.infer<typeof YearResponseSchema>;
export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>;
export type MonthlyAnalysisResponse = z.infer<typeof MonthlyAnalysisResponseSchema>;

export function parseMonthResponse(raw: unknown, source = 'GET /api/months/:month'): MonthResponse {
  const result = MonthResponseSchema.safeParse(raw);
  if (!result.success) throw new Error(formatZodError(source, result.error));
  return result.data;
}

export function parseYearResponse(raw: unknown, source = 'GET /api/years/:year'): YearResponse {
  const result = YearResponseSchema.safeParse(raw);
  if (!result.success) throw new Error(formatZodError(source, result.error));
  return result.data;
}

export function parseCategoriesResponse(
  raw: unknown,
  source = 'GET /api/categories'
): CategoriesResponse {
  const result = CategoriesResponseSchema.safeParse(raw);
  if (!result.success) throw new Error(formatZodError(source, result.error));
  return result.data;
}

export function parseMonthlyAnalysisResponse(
  raw: unknown,
  source = 'GET /api/months/:month/analysis'
): MonthlyAnalysisResponse {
  const result = MonthlyAnalysisResponseSchema.safeParse(raw);
  if (!result.success) throw new Error(formatZodError(source, result.error));
  return result.data;
}
