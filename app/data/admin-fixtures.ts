import type {
  CategoriesResponse,
  MonthlyAnalysisResponse,
  MonthResponse,
  YearResponse,
} from './admin-schema';

// Dummy, illustrative data — not anyone's real finances, and no real
// names (this repo is public). Stands in for the backend's real
// responses during Phase A/B (docs/finance-frontend.md §12), while the
// backend is built in parallel against the same contract
// (docs/finance-tracker-backend-kickoff.md). Swapped for real `fetch()`
// calls in Phase C; these fixtures are still useful after that for
// Storybook and tests, so don't delete them once the real API exists.

export const FIXTURE_CATEGORIES: CategoriesResponse = [
  { id: 'groceries', name: 'Groceries' },
  { id: 'rent_expensas', name: 'Rent / Expensas' },
  { id: 'transport', name: 'Transport' },
  { id: 'dining_out', name: 'Dining Out' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'other', name: 'Other' },
];

// A normal, fully-elapsed month with a mix of categories, one
// natively-USD transaction (a subscription), and both people paying.
export const FIXTURE_MONTH: MonthResponse = {
  month: '2026-08',
  total: { ars: 850280, usd: 621 },
  previousMonthTotal: { ars: 790000, usd: 577 },
  deltaPercent: 7.6,
  categories: [
    {
      categoryId: 'groceries',
      categoryName: 'Groceries',
      total: { ars: 320000, usd: 234 },
      transactionCount: 3,
    },
    {
      categoryId: 'rent_expensas',
      categoryName: 'Rent / Expensas',
      total: { ars: 250000, usd: 182 },
      transactionCount: 1,
    },
    {
      categoryId: 'transport',
      categoryName: 'Transport',
      total: { ars: 90000, usd: 66 },
      transactionCount: 2,
    },
    {
      categoryId: 'dining_out',
      categoryName: 'Dining Out',
      total: { ars: 70000, usd: 51 },
      transactionCount: 2,
    },
    {
      categoryId: 'utilities',
      categoryName: 'Utilities',
      total: { ars: 60000, usd: 44 },
      transactionCount: 1,
    },
    {
      categoryId: 'other',
      categoryName: 'Other',
      total: { ars: 60280, usd: 44 },
      transactionCount: 1,
    },
  ],
  transactions: [
    {
      id: 'tx_001',
      occurredOn: '2026-08-02',
      categoryId: 'groceries',
      categoryName: 'Groceries',
      description: 'Coto — weekly shop',
      amount: { ars: 120000, usd: 88 },
      currency: 'ARS',
      paidBy: 'You',
      tripId: null,
    },
    {
      id: 'tx_002',
      occurredOn: '2026-08-09',
      categoryId: 'groceries',
      categoryName: 'Groceries',
      description: 'Carrefour',
      amount: { ars: 95000, usd: 69 },
      currency: 'ARS',
      paidBy: 'Partner',
      tripId: null,
    },
    {
      id: 'tx_003',
      occurredOn: '2026-08-23',
      categoryId: 'groceries',
      categoryName: 'Groceries',
      description: 'Dia — top-up shop',
      amount: { ars: 105000, usd: 77 },
      currency: 'ARS',
      paidBy: 'You',
      tripId: null,
    },
    {
      id: 'tx_004',
      occurredOn: '2026-08-05',
      categoryId: 'rent_expensas',
      categoryName: 'Rent / Expensas',
      description: 'Monthly rent + expensas',
      amount: { ars: 250000, usd: 182 },
      currency: 'ARS',
      paidBy: 'You',
      tripId: null,
    },
    {
      id: 'tx_005',
      occurredOn: '2026-08-01',
      categoryId: 'transport',
      categoryName: 'Transport',
      description: 'SUBE top-up',
      amount: { ars: 60000, usd: 44 },
      currency: 'ARS',
      paidBy: 'Partner',
      tripId: null,
    },
    {
      id: 'tx_006',
      occurredOn: '2026-08-18',
      categoryId: 'transport',
      categoryName: 'Transport',
      description: 'Cabify',
      amount: { ars: 30000, usd: 22 },
      currency: 'ARS',
      paidBy: 'You',
      tripId: null,
    },
    {
      id: 'tx_007',
      occurredOn: '2026-08-14',
      categoryId: 'dining_out',
      categoryName: 'Dining Out',
      description: 'Dinner out — Palermo',
      amount: { ars: 40000, usd: 29 },
      currency: 'ARS',
      paidBy: 'Partner',
      tripId: null,
    },
    {
      id: 'tx_008',
      occurredOn: '2026-08-27',
      categoryId: 'dining_out',
      categoryName: 'Dining Out',
      description: 'Sushi delivery',
      amount: { ars: 30000, usd: 22 },
      currency: 'ARS',
      paidBy: 'You',
      tripId: null,
    },
    {
      id: 'tx_009',
      occurredOn: '2026-08-10',
      categoryId: 'utilities',
      categoryName: 'Utilities',
      description: 'Electricity + gas',
      amount: { ars: 60000, usd: 44 },
      currency: 'ARS',
      paidBy: 'Partner',
      tripId: null,
    },
    {
      id: 'tx_010',
      occurredOn: '2026-08-15',
      categoryId: 'other',
      categoryName: 'Other',
      description: 'Streaming subscription',
      amount: { ars: 60280, usd: 44 },
      currency: 'USD',
      paidBy: 'You',
      tripId: null,
    },
  ],
};

// The empty state (finance-frontend.md §4): a brand-new month with
// nothing logged yet — not an error, just nothing to show.
export const FIXTURE_MONTH_EMPTY: MonthResponse = {
  month: '2026-09',
  total: { ars: 0, usd: 0 },
  previousMonthTotal: { ars: 850280, usd: 621 },
  deltaPercent: null,
  categories: [],
  transactions: [],
};

// A completed calendar year — used for `/api/years/{yyyy}`.
export const FIXTURE_YEAR: YearResponse = {
  year: 2025,
  total: { ars: 9550000, usd: 7220 },
  monthlyTotals: [
    { month: '2025-01', total: { ars: 700000, usd: 610 } },
    { month: '2025-02', total: { ars: 720000, usd: 615 } },
    { month: '2025-03', total: { ars: 680000, usd: 590 } },
    { month: '2025-04', total: { ars: 750000, usd: 600 } },
    { month: '2025-05', total: { ars: 800000, usd: 620 } },
    { month: '2025-06', total: { ars: 770000, usd: 580 } },
    { month: '2025-07', total: { ars: 810000, usd: 590 } },
    { month: '2025-08', total: { ars: 830000, usd: 600 } },
    { month: '2025-09', total: { ars: 850000, usd: 610 } },
    { month: '2025-10', total: { ars: 860000, usd: 590 } },
    { month: '2025-11', total: { ars: 880000, usd: 600 } },
    { month: '2025-12', total: { ars: 900000, usd: 615 } },
  ],
  categories: [
    {
      categoryId: 'groceries',
      categoryName: 'Groceries',
      total: { ars: 3600000, usd: 2700 },
      transactionCount: 36,
    },
    {
      categoryId: 'rent_expensas',
      categoryName: 'Rent / Expensas',
      total: { ars: 3000000, usd: 2200 },
      transactionCount: 12,
    },
    {
      categoryId: 'transport',
      categoryName: 'Transport',
      total: { ars: 1000000, usd: 750 },
      transactionCount: 24,
    },
    {
      categoryId: 'dining_out',
      categoryName: 'Dining Out',
      total: { ars: 800000, usd: 600 },
      transactionCount: 24,
    },
    {
      categoryId: 'utilities',
      categoryName: 'Utilities',
      total: { ars: 700000, usd: 520 },
      transactionCount: 12,
    },
    {
      categoryId: 'other',
      categoryName: 'Other',
      total: { ars: 450000, usd: 450 },
      transactionCount: 12,
    },
  ],
};

// The current, partial year — used for `/api/ytd`. Same schema as
// `FIXTURE_YEAR`, just fewer months.
export const FIXTURE_YTD: YearResponse = {
  year: 2026,
  total: { ars: 5820000, usd: 4230 },
  monthlyTotals: [
    { month: '2026-01', total: { ars: 780000, usd: 600 } },
    { month: '2026-02', total: { ars: 800000, usd: 610 } },
    { month: '2026-03', total: { ars: 820000, usd: 590 } },
    { month: '2026-04', total: { ars: 850000, usd: 605 } },
    { month: '2026-05', total: { ars: 830000, usd: 615 } },
    { month: '2026-06', total: { ars: 860000, usd: 600 } },
    { month: '2026-07', total: { ars: 880000, usd: 610 } },
  ],
  categories: [
    {
      categoryId: 'groceries',
      categoryName: 'Groceries',
      total: { ars: 2200000, usd: 1650 },
      transactionCount: 21,
    },
    {
      categoryId: 'rent_expensas',
      categoryName: 'Rent / Expensas',
      total: { ars: 1750000, usd: 1300 },
      transactionCount: 7,
    },
    {
      categoryId: 'transport',
      categoryName: 'Transport',
      total: { ars: 600000, usd: 450 },
      transactionCount: 14,
    },
    {
      categoryId: 'dining_out',
      categoryName: 'Dining Out',
      total: { ars: 500000, usd: 380 },
      transactionCount: 14,
    },
    {
      categoryId: 'utilities',
      categoryName: 'Utilities',
      total: { ars: 420000, usd: 310 },
      transactionCount: 7,
    },
    {
      categoryId: 'other',
      categoryName: 'Other',
      total: { ars: 350000, usd: 140 },
      transactionCount: 7,
    },
  ],
};

export const FIXTURE_ANALYSIS_READY: MonthlyAnalysisResponse = {
  status: 'ready',
  month: '2026-08',
  analysis:
    'August spending came in about 8% above July, mostly due to two grocery ' +
    'restocks landing in the same month rather than any real change in ' +
    'habits. Rent/expensas held flat. Dining out was a bit higher than ' +
    'usual — worth a look if that keeps trending up. The USD-equivalent ' +
    'total moved much less than the ARS total, which suggests most of ' +
    'the increase tracks inflation rather than real spending growth.',
  generatedAt: '2026-09-01T09:14:00Z',
};

// The current month never gets an analysis while it's still in progress
// (finance-frontend.md §9's mid-month handling).
export const FIXTURE_ANALYSIS_NOT_AVAILABLE: MonthlyAnalysisResponse = {
  status: 'not_available',
  month: '2026-09',
  reason: 'month_in_progress',
};
