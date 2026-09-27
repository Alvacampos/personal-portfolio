import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router';

import LocaleToggle from '~/components/LocaleToggle';
import ThemeToggle from '~/components/ThemeToggle';
import type { Locale } from '~/intl';
import { getClassMaker } from '~/utils/utils';

// AdminNavBar CSS is inlined into app/routes/admin/style.css via
// postcss-import — no links() export (app/components conventions,
// AGENTS.md §14).

const BLOCK = 'admin-nav-bar';
const getClasses = getClassMaker(BLOCK);

// Text-only, deliberately — the public NavBar's icon+label bottom tabs
// need real SVG source assets to add (AGENTS.md §7's SVGO/SVGR
// pipeline), and sourcing new icons is out of scope for "reuse the
// layout," not a shortcut on the actual ask. Same fixed side-rail
// (desktop) / bottom-tab-bar (mobile) shape as NavBar, same $bp-*
// breakpoint tokens, own content — matching finance-frontend.md §1.
const NAV_LINKS = [
  {
    to: '/admin/dashboard',
    labelId: 'ADMIN_NAV_HOME',
    prefixes: ['/admin/dashboard', '/admin/month'],
  },
  { to: '/admin/year', labelId: 'ADMIN_NAV_YEAR', prefixes: ['/admin/year'] },
  { to: '/admin/calendar', labelId: 'ADMIN_NAV_CALENDAR', prefixes: ['/admin/calendar'] },
  { to: '/admin/trips', labelId: 'ADMIN_NAV_TRIPS', prefixes: ['/admin/trips'] },
] as const;

export default function AdminNavBar() {
  const { formatMessage, locale } = useIntl();
  const { pathname } = useLocation();

  const isActive = (prefixes: readonly string[]) =>
    prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <nav className={getClasses()} aria-label={formatMessage({ id: 'ADMIN_NAV_LABEL' })}>
      {/* Avatar — desktop only, same as the public NavBar (no room for
       * it in the mobile bottom bar). Placeholder until a real photo
       * replaces this src. */}
      <div className={getClasses('avatar-row')}>
        <img
          src="/assets/img/admin-avatar-placeholder.svg"
          alt=""
          width={64}
          height={64}
          className={getClasses('avatar')}
        />
      </div>
      <div className={getClasses('utility-row')}>
        <div className={getClasses('utility-slot')}>
          <ThemeToggle />
        </div>
        <div className={getClasses('utility-slot')}>
          <LocaleToggle current={locale as Locale} />
        </div>
      </div>
      <div className={getClasses('main-section')}>
        <ul className={getClasses('main-buttons')}>
          {NAV_LINKS.map(({ to, labelId, prefixes }) => {
            const active = isActive(prefixes);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={getClasses('nav-link', { active })}
                  aria-current={active ? 'page' : undefined}
                >
                  <FormattedMessage id={labelId} />
                </Link>
              </li>
            );
          })}
        </ul>
        {/* No real session yet (Phase C) — this just returns to the
         * login screen rather than actually invalidating anything. */}
        <Link to="/admin" className={getClasses('sign-out')}>
          <FormattedMessage id="ADMIN_NAV_SIGN_OUT" />
        </Link>
      </div>
    </nav>
  );
}
