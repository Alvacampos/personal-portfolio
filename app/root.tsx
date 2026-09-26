import { IntlProvider } from 'react-intl';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useRouteError,
  useRouteLoaderData,
} from 'react-router';

import NavBar from '~/components/NavBar';
import PendingBoundary from '~/components/PendingBoundary';
import { type Locale, messagesFor, pickLocale } from '~/intl';
import styles from '~/styles/style.css?url';
import { useNonce } from '~/utils/nonce-context';
import { getClassMaker } from '~/utils/utils';

const SITE_URL = 'https://gonzalo-alvarez-campos-cv.com';
const FONT_URL = '/fonts/roboto/Roboto-VariableFont_wdth,wght.v2.woff2';
// Absolute URL — OG crawlers reject relative paths. Per-route overrides
// go through mergeRouteMeta's `ogImage` prop.
const OG_IMAGE_URL = `${SITE_URL}/assets/img/og-home.png`;

export function links() {
  return [
    { rel: 'icon', href: '/assets/img/favicon.svg', type: 'image/svg+xml' },
    // Preload Roboto in parallel with the document — used on every route.
    // Monaspace is preloaded per-route in the routes that use it (skills,
    // education) since home doesn't render any monospace text.
    {
      rel: 'preload',
      href: FONT_URL,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    { rel: 'stylesheet', href: styles },
    // canonical is rendered per-route in Layout from the loader's `canonical`
    // value — pinning it here would point every route at the homepage.
  ];
}

const BLOCK = 'root';
const getClasses = getClassMaker(BLOCK);

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = pickLocale(request);
  // Anchor canonical to prod SITE_URL so previews/dev don't leak.
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const canonical = `${SITE_URL}${path}`;
  return { locale, canonical };
}

const OG_LOCALES: Record<Locale, string> = { en: 'en_US', es: 'es_ES' };

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => {
  const title = 'Gonzalo Alvarez Campos — Senior Software Engineer';
  const description =
    'Full-stack engineer with 7+ years building React, TypeScript, Remix, and Next.js apps in fintech and education.';
  const ogLocale = OG_LOCALES[loaderData?.locale ?? 'en'];
  return [
    { title },
    { name: 'description', content: description },
    { name: 'viewport', content: 'width=device-width,initial-scale=1,minimum-scale=1' },
    // Match the actual app background so mobile browser chrome doesn't
    // flash white on the dark theme.
    { name: 'theme-color', content: '#010408' },

    // Open Graph
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: SITE_URL },
    { property: 'og:site_name', content: 'Gonzalo Alvarez Campos' },
    { property: 'og:locale', content: ogLocale },
    { property: 'og:image', content: OG_IMAGE_URL },
    { property: 'og:image:secure_url', content: OG_IMAGE_URL },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    {
      property: 'og:image:alt',
      content: 'Gonzalo Alvarez Campos — Software Engineer portfolio',
    },

    // Twitter — large-image card so the og:image renders at full width
    // instead of the small thumbnail used by `summary`.
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: OG_IMAGE_URL },
    {
      name: 'twitter:image:alt',
      content: 'Gonzalo Alvarez Campos — Software Engineer portfolio',
    },
  ];
};

// Combined Person + WebSite schema as a `@graph` — one script tag, one
// `@context`. The WebSite entry helps Google disambiguate the property
// when crawled; the Person entry drives the knowledge panel.
const JSONLD_GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      name: 'Gonzalo Alvarez Campos',
      jobTitle: 'Senior Software Engineer',
      url: SITE_URL,
      worksFor: { '@type': 'Organization', name: 'Qubika' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Tucumán',
        addressCountry: 'AR',
      },
      sameAs: [
        'https://github.com/Alvacampos',
        'https://www.linkedin.com/in/gonzaloalvarezcampos/',
      ],
    },
    {
      '@type': 'WebSite',
      name: 'Gonzalo Alvarez Campos',
      url: SITE_URL,
      inLanguage: ['en', 'es'],
      author: { '@type': 'Person', name: 'Gonzalo Alvarez Campos' },
    },
  ],
};

// Sets `<html data-theme>` before paint so the body never flashes the
// wrong palette. Must stay inline + synchronous in <head>.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: light)').matches)document.documentElement.dataset.theme='light';}catch(e){}`;

// Replay a saved localStorage locale for pre-cookie visitors. Reads
// the loader locale off `<html lang>` so the script body stays static
// across locales. Bails when the URL already has `?lang=` so explicit
// share/deep-links win over stored preferences.
const LOCALE_REPLAY_SCRIPT = `try{if(new URL(location.href).searchParams.has('lang'))throw 0;var s=localStorage.getItem('locale');if((s==='en'||s==='es')&&s!==document.documentElement.lang){document.cookie='locale='+s+';Path=/;Max-Age=31536000;SameSite=Lax';var u=new URL(location.href);u.searchParams.set('lang',s);location.replace(u.toString());}}catch(e){}`;

// Escape the two characters that can break out of an inline
// <script type="application/ld+json"> — `</` closes the tag early,
// U+2028/U+2029 break JS parsers pre-ES2019 rendered payloads.
function jsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

type LayoutData = {
  locale: Locale;
  canonical: string;
};

export function Layout({ children }: { children: React.ReactNode }) {
  // useRouteLoaderData (not useLoaderData) so Layout works in the
  // error boundary path where the child loader threw.
  const data = useRouteLoaderData<LayoutData>('root');
  const locale: Locale = data?.locale ?? 'en';
  const canonical = data?.canonical ?? SITE_URL;
  const cspNonce = useNonce();
  // Skip-link is rendered outside the IntlProvider scope, hence the
  // direct lookup instead of <FormattedMessage>.
  const skipLinkLabel = messagesFor(locale).SKIP_TO_CONTENT;

  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT sets `<html data-theme>`
    // pre-hydration from localStorage/prefers-color-scheme, which SSR
    // can't know. Only that attribute drifts; React still warns on
    // children.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <script nonce={cspNonce} dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script nonce={cspNonce} dangerouslySetInnerHTML={{ __html: LOCALE_REPLAY_SCRIPT }} />
        <Meta />
        <Links />
        <link rel="canonical" href={canonical} />
        <script
          type="application/ld+json"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: jsonLd(JSONLD_GRAPH) }}
        />
      </head>
      <body className={getClasses()}>
        <a href="#main-content" className={getClasses('skip-link')}>
          {skipLinkLabel}
        </a>
        {children}
        <ScrollRestoration nonce={cspNonce} />
        <Scripts nonce={cspNonce} />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  // /admin/* is a separate, private section with its own small nav
  // (docs/finance-frontend.md §1) — the public NavBar (GitHub/Contact/
  // etc.) doesn't belong there.
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  return (
    <IntlProvider messages={messagesFor(locale)} locale={locale} defaultLocale="en">
      {!isAdmin && <NavBar />}
      <main id="main-content">
        <PendingBoundary>
          <Outlet />
        </PendingBoundary>
      </main>
    </IntlProvider>
  );
}

export function ErrorBoundary() {
  // Layout runs around this boundary, so the html/head/body shell is
  // intact — we just render the error panel where <Outlet /> would.
  // useRouteLoaderData lets us pick the user's locale even when the
  // child route's loader is what threw (the root loader still ran).
  // Falls back to English when the root itself failed.
  const error = useRouteError();
  const data = useRouteLoaderData<LayoutData>('root');
  const locale: Locale = data?.locale ?? 'en';
  const m = messagesFor(locale);

  const isResponse = isRouteErrorResponse(error);
  const status = isResponse ? error.status : 'Error';
  const isNotFound = isResponse && error.status === 404;

  const title = isNotFound ? m.ERROR_NOT_FOUND_TITLE : m.ERROR_GENERIC_TITLE;
  const body = isNotFound ? m.ERROR_NOT_FOUND_BODY : m.ERROR_GENERIC_BODY;

  return (
    <div className="error-boundary">
      <p className="error-boundary__code">{status}</p>
      <h1 className="error-boundary__title">{title}</h1>
      <p className="error-boundary__body">{body}</p>
      <a className="error-boundary__action" href="/">
        <span aria-hidden="true">←</span> {m.BACK_TO_HOME}
      </a>
    </div>
  );
}
