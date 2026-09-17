import { test } from '../../../src/fixtures/master-data.fixtures';

/**
 * Owned by the Master Data QA. Storage state from auth.setup.ts is already
 * applied via the "master-data" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Master Data coverage.
 */
test.describe('Master Data module', () => {
  test('loads after shell login', async ({ masterDataPage }) => {
    await masterDataPage.open();
    await masterDataPage.expectLoaded();
  });
});
