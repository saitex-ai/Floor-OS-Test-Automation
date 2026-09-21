import { test } from '../../../src/fixtures/mill.fixtures';

/**
 * Fabric Mill — Smoke suite. Only the module-loads check exists so far,
 * same as the regression suite (Fabric Mill has no built-out test cases
 * yet) — add real Fabric Mill happy-path checks here as they're built.
 */
test.describe('Fabric Mill module', () => {
  test('loads after shell login', async ({ millPage }) => {
    await millPage.open();
    await millPage.expectLoaded();
  });
});
