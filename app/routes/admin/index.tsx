import { Link, Outlet, useLocation } from 'react-router';

import ThemeToggle from '~/components/ThemeToggle';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-layout';
const getClasses = getClassMaker(BLOCK);

// Only "Month" exists so far (docs/finance-frontend.md §12 — Year and
// Trips are separate phases). Add entries here as their routes land so
// this never links to a 404.
const NAV_LINKS = [{ to: '/admin/dashboard', label: 'Month', prefix: '/admin/month' }] as const;

export default function AdminLayout() {
  const { pathname } = useLocation();
  // The login screen (exactly `/admin`) has nothing to navigate to yet —
  // no session, no sign-out — so it renders without the chrome below.
  const isLoginPage = pathname === '/admin';

  return (
    <div className={getClasses()}>
      {!isLoginPage && (
        <nav className={getClasses('nav')} aria-label="Admin">
          <ul className={getClasses('nav-links')}>
            {NAV_LINKS.map(({ to, label, prefix }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={getClasses('nav-link', { active: pathname.startsWith(prefix) })}
                  aria-current={pathname.startsWith(prefix) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className={getClasses('nav-utility')}>
            <ThemeToggle />
            {/* No real session yet (Phase C) — this just returns to the
             * login screen rather than actually invalidating anything. */}
            <Link to="/admin" className={getClasses('sign-out')}>
              Sign out
            </Link>
          </div>
        </nav>
      )}
      <div className={getClasses('content')}>
        <Outlet />
      </div>
    </div>
  );
}
