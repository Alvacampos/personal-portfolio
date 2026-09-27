import { describe, expect, it } from 'vitest';

import { isAdminPath } from './is-admin-path';

describe('isAdminPath', () => {
  it('is true for the exact /admin login path', () => {
    expect(isAdminPath('/admin')).toBe(true);
  });

  it('is true for any nested /admin/* route', () => {
    expect(isAdminPath('/admin/dashboard')).toBe(true);
    expect(isAdminPath('/admin/month/2026-08')).toBe(true);
  });

  it('is false for the public site and for paths that merely start with "admin"', () => {
    expect(isAdminPath('/')).toBe(false);
    expect(isAdminPath('/skills')).toBe(false);
    expect(isAdminPath('/administrator')).toBe(false);
  });
});
