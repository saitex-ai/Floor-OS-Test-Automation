import { test } from '../../../src/fixtures/copilot.fixtures';

/**
 * Copilot — Smoke suite. Only the module-loads check exists so far,
 * same as the regression suite (Copilot has no built-out test cases
 * yet) — add real Copilot happy-path checks here as they're built.
 */
test.describe('Copilot module', () => {
  test('loads after shell login', async ({ copilotPage }) => {
    await copilotPage.open();
    await copilotPage.expectLoaded();
  });
});
