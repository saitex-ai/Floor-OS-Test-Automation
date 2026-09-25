import { test } from '../../../src/fixtures/bom.fixtures';

/**
 * Owned by the BOM QA. Storage state from auth.setup.ts is already
 * applied via the "bom" project's dependency — no login needed here.
 * Replace/extend this with real BOM regression coverage.
 */
test.describe('BOM module', () => {
  test('list loads after shell login', async ({ bomListPage }) => {
    await bomListPage.open();
  });
});
