import type { IntlShape } from 'react-intl';
import { describe, expect, it } from 'vitest';

import { getCategoryLabel } from './get-category-label';

const formatMessage = (({ id }: { id: string }) =>
  `translated:${id}`) as IntlShape['formatMessage'];

describe('getCategoryLabel', () => {
  it('translates a known category id', () => {
    expect(getCategoryLabel('groceries', 'Groceries', formatMessage)).toBe(
      'translated:ADMIN_CATEGORY_GROCERIES'
    );
  });

  it('falls back to the raw categoryName for an id outside the known set', () => {
    expect(getCategoryLabel('some_future_category', 'Pet Care', formatMessage)).toBe('Pet Care');
  });
});
