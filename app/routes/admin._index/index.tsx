import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

// Plain title only — no OG/Twitter tags (mergeRouteMeta is a public-site
// concern) and no indexing metadata needed beyond the X-Robots-Tag header
// + robots.txt disallow already stamped in workers/app.ts.
export const meta: MetaFunction = () => [{ title: 'Sign in — Admin' }];

const BLOCK = 'admin-login-route';
const getClasses = getClassMaker(BLOCK);

export default function AdminLogin() {
  return (
    <div className={getClasses()}>
      <h1 className={getClasses('title')}>Finance tracker</h1>
      <p className={getClasses('subtitle')}>Private — for two people only.</p>
      {/* Phase C wires this to the backend's real
       * GET /api/auth/google/login (docs/finance-tracker-backend-kickoff.md
       * §5). Until then it just goes straight to the dashboard so the
       * rest of the shell can be built and reviewed. */}
      <Link to="/admin/dashboard" className={getClasses('sign-in-button')}>
        Sign in with Google
      </Link>
    </div>
  );
}
