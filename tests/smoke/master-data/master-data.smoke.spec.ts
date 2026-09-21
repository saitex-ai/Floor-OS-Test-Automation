import { test } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Smoke suite. Only the module-loads check exists so far,
 * same as the regression suite (Master Data has no built-out test
 * cases yet) — add real Master Data happy-path checks here as they're built.
 */
test.describe('Master Data module', () => {
  test('loads after shell login', async ({ masterDataPage }) => {
    await masterDataPage.open();
    await masterDataPage.expectLoaded();
  });
});
