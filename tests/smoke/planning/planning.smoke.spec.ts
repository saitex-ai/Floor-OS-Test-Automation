import { test } from '../../../src/fixtures/planning.fixtures';

/**
 * Planning — Smoke suite. Only the module-loads check exists so far,
 * same as the regression suite (Planning has no built-out test cases
 * yet) — add real Planning happy-path checks here as they're built.
 */
test.describe('Planning module', () => {
  test('loads after shell login', async ({ planningPage }) => {
    await planningPage.open();
    await planningPage.expectLoaded();
  });
});
