import { test } from '../../../src/fixtures/crm.fixtures';

/**
 * Owned by the CRM QA. Storage state from auth.setup.ts is already
 * applied via the "crm" project's dependency — no login needed here.
 * Replace/extend this smoke test with real CRM coverage.
 */
test.describe('CRM module', () => {
  test('loads after shell login', async ({ crmPage }) => {
    await crmPage.open();
    await crmPage.expectLoaded();
  });
});
