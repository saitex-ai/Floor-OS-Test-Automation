import { test } from '../../../src/fixtures/techpack.fixtures';

/**
 * Owned by the Techpack QA. Storage state from auth.setup.ts is already
 * applied via the "techpack" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Techpack coverage.
 */
test.describe('Techpack module', () => {
  test('loads after shell login', async ({ techpackPage }) => {
    await techpackPage.open();
    await techpackPage.expectLoaded();
  });
});
