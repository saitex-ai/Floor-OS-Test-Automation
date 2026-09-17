import { test } from '../../../src/fixtures/planning.fixtures';

/**
 * Owned by the Planning QA. Storage state from auth.setup.ts is already
 * applied via the "planning" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Planning coverage.
 */
test.describe('Planning module', () => {
  test('loads after shell login', async ({ planningPage }) => {
    await planningPage.open();
    await planningPage.expectLoaded();
  });
});
