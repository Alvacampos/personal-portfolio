import { FormattedMessage } from 'react-intl';

import { getClassMaker } from '~/utils/utils';

// SearchFilterBar CSS is inlined into each consuming route's style.css
// via postcss-import — no links() export (app/components conventions,
// AGENTS.md §14).

const BLOCK = 'search-filter-bar';
const getClasses = getClassMaker(BLOCK);

type SearchFilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  label: string;
  hasActiveFilter: boolean;
};

// Shared by the Year view (filters the category list) and the Trips
// list (filters by trip name) — "Clear filters" always renders but is
// disabled until there's actually a search term or an isolated
// category/trip to reset, so the layout doesn't shift when it becomes
// actionable.
export default function SearchFilterBar({
  value,
  onChange,
  onClear,
  label,
  hasActiveFilter,
}: SearchFilterBarProps) {
  return (
    <div className={getClasses()}>
      <input
        type="search"
        className={getClasses('input')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        aria-label={label}
      />
      <button
        type="button"
        className={getClasses('clear-button')}
        onClick={onClear}
        disabled={!hasActiveFilter}
      >
        <FormattedMessage id="ADMIN_CLEAR_FILTERS" />
      </button>
    </div>
  );
}
