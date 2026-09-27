import { FormattedMessage } from 'react-intl';
import type { MetaFunction } from 'react-router';
import { Link, useLocation } from 'react-router';

import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

// Plain title only — no OG/Twitter tags (mergeRouteMeta is a public-site
// concern) and no indexing metadata needed beyond the X-Robots-Tag header
// + robots.txt disallow already stamped in workers/app.ts. Not localized
// either, same as the public site's own root <title> (app/root.tsx) —
// there's no existing precedent for translating <title> in this repo.
export const meta: MetaFunction = () => [{ title: 'Sign in — Admin' }];

const BLOCK = 'admin-login-route';
const getClasses = getClassMaker(BLOCK);

export default function AdminLogin() {
  // Forwards `?lang=` onto the sign-in link — otherwise landing here
  // fresh (e.g. `/admin?lang=es`, no locale cookie set yet) and clicking
  // through would silently drop back to the browser's Accept-Language
  // default instead of the explicitly chosen locale.
  const { search } = useLocation();

  return (
    <div className={getClasses()}>
      <h1 className={getClasses('title')}>
        <FormattedMessage id="ADMIN_LOGIN_TITLE" />
      </h1>
      <p className={getClasses('subtitle')}>
        <FormattedMessage id="ADMIN_LOGIN_SUBTITLE" />
      </p>
      {/* Phase C wires this to the backend's real
       * GET /api/auth/google/login (docs/finance-tracker-backend-kickoff.md
       * §5). Until then it just goes straight to the dashboard so the
       * rest of the shell can be built and reviewed. */}
      <Link to={`/admin/dashboard${search}`} className={getClasses('sign-in-button')}>
        <FormattedMessage id="ADMIN_LOGIN_SIGN_IN" />
      </Link>
    </div>
  );
}
