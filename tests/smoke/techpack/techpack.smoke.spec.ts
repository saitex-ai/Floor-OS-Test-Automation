import { test } from '../../../src/fixtures/techpack.fixtures';

/**
 * Techpack — Smoke suite. Only the module-loads check exists so far,
 * same as the regression suite (Techpack has no built-out test cases
 * yet) — add real Techpack happy-path checks here as they're built.
 */
test.describe('Techpack module', () => {
  test('loads after shell login', async ({ techpackPage }) => {
    await techpackPage.open();
    await techpackPage.expectLoaded();
  });
});
