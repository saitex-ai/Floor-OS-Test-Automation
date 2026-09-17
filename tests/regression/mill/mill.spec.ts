import { test } from '../../../src/fixtures/mill.fixtures';

/**
 * Owned by the Fabric Mill QA. Storage state from auth.setup.ts is already
 * applied via the "mill" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Fabric Mill coverage.
 */
test.describe('Fabric Mill module', () => {
  test('loads after shell login', async ({ millPage }) => {
    await millPage.open();
    await millPage.expectLoaded();
  });
});
