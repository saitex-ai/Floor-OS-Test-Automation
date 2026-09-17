import { test } from '../../../src/fixtures/copilot.fixtures';

/**
 * Owned by the Copilot QA. Storage state from auth.setup.ts is already
 * applied via the "copilot" project's dependency — no login needed here.
 * Replace/extend this smoke test with real Copilot coverage.
 */
test.describe('Copilot module', () => {
  test('loads after shell login', async ({ copilotPage }) => {
    await copilotPage.open();
    await copilotPage.expectLoaded();
  });
});
