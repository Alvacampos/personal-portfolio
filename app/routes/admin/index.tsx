import { IntlProvider } from 'react-intl';
import type { LoaderFunctionArgs } from 'react-router';
import { Outlet, useLoaderData, useLocation } from 'react-router';

import AdminNavBar from '~/components/AdminNavBar';
import { adminMessagesFor } from '~/intl/admin';
import { pickLocale } from '~/intl/index';
import { getClassMaker } from '~/utils/utils';

import styles from './style.css?url';

export const links = () => [{ rel: 'stylesheet', href: styles }];

const BLOCK = 'admin-layout';
const getClasses = getClassMaker(BLOCK);

// /admin gets its own IntlProvider, nested inside root.tsx's public one —
// nested providers fully replace the message dictionary for their
// subtree (verified against react-intl's source, not assumed), so this
// cleanly scopes /admin to its own message set with zero leakage either
// direction, and adminMessagesFor's import never reaches the public
// "root" chunk (docs/finance-frontend.md §1's Phase G reversal).
export async function loader({ request }: LoaderFunctionArgs) {
  return { locale: pickLocale(request) };
}

export default function AdminLayout() {
  const { locale } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();
  // The login screen (exactly `/admin`) has nothing to navigate to yet —
  // no session, no sign-out — so it renders without the chrome below.
  const isLoginPage = pathname === '/admin';

  return (
    <IntlProvider messages={adminMessagesFor(locale)} locale={locale} defaultLocale="en">
      <div className={getClasses()}>
        {!isLoginPage && <AdminNavBar />}
        <div className={getClasses('content', { 'no-nav': isLoginPage })}>
          <Outlet />
        </div>
      </div>
    </IntlProvider>
  );
}
