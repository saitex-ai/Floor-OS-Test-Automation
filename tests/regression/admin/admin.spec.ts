import { test } from '../../../src/fixtures/admin.fixtures';

/**
 * Owned by the Admin QA. Storage state from auth.setup.ts is already
 * applied via the "admin" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Admin coverage.
 */
test.describe('Admin module', () => {
  test('loads after shell login', async ({ adminPage }) => {
    await adminPage.open();
    await adminPage.expectLoaded();
  });
});
