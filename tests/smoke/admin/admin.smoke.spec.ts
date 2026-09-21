import { test } from '../../../src/fixtures/admin.fixtures';

/**
 * Admin — Smoke suite. Only the module-loads check exists so far, same
 * as the regression suite (Admin has no built-out test cases yet) —
 * add real Admin happy-path checks here as they're built.
 */
test.describe('Admin module', () => {
  test('loads after shell login', async ({ adminPage }) => {
    await adminPage.open();
    await adminPage.expectLoaded();
  });
});
