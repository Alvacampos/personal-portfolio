import type { IntlShape } from 'react-intl';

// The six categories in FIXTURE_CATEGORIES (app/data/admin-fixtures.ts)
// are a fixed, developer-controlled taxonomy — unlike a transaction's
// free-text `description` (whatever the two of you actually typed in
// Telegram), so it's reasonable to translate the label here rather than
// widen the wire schema with an `_es` sibling. Any category id a real
// backend introduces that isn't in this map yet falls back to its raw
// `categoryName` rather than throwing — new categories shouldn't require
// a frontend deploy just to render.
const CATEGORY_LABEL_IDS: Record<string, string> = {
  groceries: 'ADMIN_CATEGORY_GROCERIES',
  rent_expensas: 'ADMIN_CATEGORY_RENT_EXPENSAS',
  transport: 'ADMIN_CATEGORY_TRANSPORT',
  dining_out: 'ADMIN_CATEGORY_DINING_OUT',
  utilities: 'ADMIN_CATEGORY_UTILITIES',
  other: 'ADMIN_CATEGORY_OTHER',
};

export function getCategoryLabel(
  categoryId: string,
  categoryName: string,
  formatMessage: IntlShape['formatMessage']
): string {
  const messageId = CATEGORY_LABEL_IDS[categoryId];
  return messageId ? formatMessage({ id: messageId }) : categoryName;
}
