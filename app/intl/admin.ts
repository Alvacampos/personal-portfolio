import adminEnUS from './admin-en-US.json';
import adminEsES from './admin-es-ES.json';
import type { Locale } from './index';

// Deliberately separate from app/intl/index.ts's MESSAGES — this is only
// ever imported from app/routes/admin/index.tsx, so it only ever bundles
// into the /admin route chunk, never the public site's "root" chunk that
// loads on every page (docs/finance-frontend.md §1's Phase G reversal).
const ADMIN_MESSAGES: Record<Locale, Record<string, string>> = {
  en: adminEnUS,
  es: adminEsES,
};

export function adminMessagesFor(locale: Locale): Record<string, string> {
  return ADMIN_MESSAGES[locale] ?? ADMIN_MESSAGES.en;
}
