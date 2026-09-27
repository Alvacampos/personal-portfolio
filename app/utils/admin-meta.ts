// React Router doesn't merge a route's `meta()` with its ancestors' by
// default — a child's return value *replaces* the whole array. Every
// /admin leaf route was returning a bare `[{ title }]`, which silently
// dropped root's `viewport` tag too. Without it, mobile browsers (and
// Chrome DevTools' device emulation, which honors the tag rather than
// just resizing the window) fall back to a ~980px desktop layout
// viewport even on a real phone — every `$bp-md` media query then reads
// "desktop" regardless of the device's actual width. /admin doesn't need
// root's OG/Twitter tags (deliberately unindexed, docs/finance-frontend.md
// §1) — just the tags that affect actual rendering.
const VIEWPORT_CONTENT = 'width=device-width,initial-scale=1,minimum-scale=1';

export function adminMeta(title: string) {
  return [
    { title },
    { name: 'viewport', content: VIEWPORT_CONTENT },
    { name: 'theme-color', content: '#010408' },
  ];
}
