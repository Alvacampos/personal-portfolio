import { useEffect, useRef } from 'react';

import { TURNSTILE_SCRIPT_SRC } from '~/utils/turnstile';
import { getClassMaker } from '~/utils/utils';

// Cloudflare Turnstile widget. Renders explicitly (so it plays well with
// React's lifecycle + client-side nav) and reports tokens upward; the
// parent owns the hidden form input. No CSS: with the default
// `interaction-only` appearance the widget is invisible unless
// Cloudflare decides a visitor needs to click something.

type TurnstileOptions = {
  sitekey: string;
  appearance: 'always' | 'execute' | 'interaction-only';
  theme: 'auto' | 'light' | 'dark';
  language?: string;
  // We render our own controlled <input> for the token, so tell Turnstile
  // not to inject a second same-named one into the form.
  'response-field': boolean;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  // `null` means "no valid token right now" (expired or errored).
  onToken: (token: string | null) => void;
  // Script blocked (ad-blocker, offline) or the challenge errored out.
  onError?: () => void;
  // Follows the visitor's browser when omitted.
  language?: string;
  appearance?: TurnstileOptions['appearance'];
};

const BLOCK = 'turnstile-widget';
const getClasses = getClassMaker(BLOCK);

// One shared <script> per page load, however many widgets mount.
let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error('turnstile global missing after script load'));
      };
      script.onerror = () => {
        // Allow a later mount (e.g. after the visitor disables their
        // blocker and retries) to attempt the load again.
        scriptPromise = undefined;
        script.remove();
        reject(new Error('turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Mirror the site's own theme toggle (`data-theme` on <html>); with no
// explicit choice, let Turnstile follow the OS.
function currentTheme(): TurnstileOptions['theme'] {
  const attr = document.documentElement.dataset.theme;
  return attr === 'light' || attr === 'dark' ? attr : 'auto';
}

export default function TurnstileWidget({
  siteKey,
  onToken,
  onError = undefined,
  language = undefined,
  appearance = 'interaction-only',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the latest callbacks in refs so a parent re-render doesn't tear
  // down and re-create the widget (which would burn a token + re-run the
  // challenge). Synced in an effect, not during render.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          appearance,
          theme: currentTheme(),
          language,
          'response-field': false,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => {
            onTokenRef.current(null);
            onErrorRef.current?.();
          },
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, appearance, language]);

  return <div ref={containerRef} className={getClasses()} />;
}
