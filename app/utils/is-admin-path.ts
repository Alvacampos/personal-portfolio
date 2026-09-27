// Shared by app/root.tsx's `Layout` (decides whether <body> reserves
// space for the public NavBar) and `App` (decides whether to render it
// at all) — both need the same admin/public split, so this is the one
// place that defines it.
export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
