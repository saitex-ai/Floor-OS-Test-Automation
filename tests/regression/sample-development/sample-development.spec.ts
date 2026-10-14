import { test } from '../../../src/fixtures/sample-development.fixtures';

/**
 * Owned by the Sample Development QA. Storage state from auth.setup.ts
 * is already applied via the "sample-development" project's dependency —
 * no login needed here. Replace/extend this with real Sample Development
 * regression coverage.
 */
test.describe('Sample Development module', () => {
  test('list loads after shell login', async ({ sampleRequestListPage }) => {
    await sampleRequestListPage.open();
  });
});
