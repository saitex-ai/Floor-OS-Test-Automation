import { test } from '../../../src/fixtures/costing.fixtures';

/**
 * Costing — Smoke suite. Only the module-loads check exists so far,
 * same as the regression suite (Costing has no built-out test cases
 * yet) — add real Costing happy-path checks here as they're built.
 */
test.describe('Costing module', () => {
  test('loads after shell login', async ({ costingPage }) => {
    await costingPage.open();
    await costingPage.expectLoaded();
  });
});
