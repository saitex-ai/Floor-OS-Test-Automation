import { test } from '../../../src/fixtures/costing.fixtures';

/**
 * Owned by the Costing QA. Storage state from auth.setup.ts is already
 * applied via the "costing" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Costing coverage.
 */
test.describe('Costing module', () => {
  test('loads after shell login', async ({ costingPage }) => {
    await costingPage.open();
    await costingPage.expectLoaded();
  });
});
