import { defineConfig, devices, type Project } from '@playwright/test';
import { MODULE_IDS } from './src/config/modules';
import { env } from './src/config/env';
import { authFile } from './src/fixtures/auth-setup';

/**
 * Two Playwright projects per floorOS module: "<id>-setup" logs in once
 * (see src/fixtures/auth-setup.ts) and "<id>" runs that module's full
 * regression suite reusing the saved session. This is what makes
 * `npm run test:crm` touch only the CRM QA's files — module projects are
 * fully independent, each pointed at its own testDir and its own storage
 * state. Full suites live under tests/regression/<id>/, parallel to the
 * lighter tests/sanity/<id>/ suites below.
 */
const moduleProjects: Project[] = MODULE_IDS.flatMap((id) => {
  const testDir = `./tests/regression/${id}`;
  return [
    {
      name: `${id}-setup`,
      testDir,
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: id,
      testDir,
      testIgnore: /auth\.setup\.ts/,
      dependencies: [`${id}-setup`],
      use: { ...devices['Desktop Chrome'], storageState: authFile(id) },
    },
  ];
});

/**
 * A lighter, separate suite per module — `tests/sanity/<id>/` — for a
 * small smoke-test subset, distinct from that module's full regression
 * suite in `tests/regression/<id>/`. Reuses the same `<id>-setup` auth project
 * above (same login, same cached session) rather than logging in twice.
 * Not every module needs one yet — add an id here when its QA is ready
 * to build sanity coverage for it.
 */
const SANITY_MODULE_IDS = [
  'crm',
  'mill',
  'costing',
  'planning',
  'techpack',
  'master-data',
] as const;

const sanityProjects: Project[] = SANITY_MODULE_IDS.map((id) => ({
  name: `sanity-${id}`,
  testDir: `./tests/sanity/${id}`,
  dependencies: [`${id}-setup`],
  use: { ...devices['Desktop Chrome'], storageState: authFile(id) },
}));

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // dev's federated module bundles (e.g. the CRM remote) load over a real
  // network/VPN, not an already-warm local dev server — confirmed by
  // watching it headed: "Loading CRM…" alone can outlast 30s on dev, with
  // zero worker contention, every run. This was bumped 60s -> 90s on
  // 2026-09-18 after a run under worker contention saw 39 failures, all
  // timeouts waiting on a basic element like "Create Customer" — but the
  // real cause turned out to be gotoAuthenticated() silently skipping the
  // sign-in click when its own 15s guard timed out (fixed in base.page.ts),
  // not insufficient headroom here. Reverted back to 60s now that the
  // actual bug is fixed; workers is also capped for dev below so this
  // shouldn't need raising again. Local keeps the same value for parity.
  timeout: env.testEnv === 'dev' ? 60_000 : 30_000,
  expect: {
    // Same reasoning as the test timeout above — individual
    // expect(...).toBeVisible() calls need more than 5s when dev's
    // remote is slow to render, not just the overall test budget.
    timeout: env.testEnv === 'dev' ? 15_000 : 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Dev is a shared, VPN-gated remote environment, not a local server — too
  // many concurrent workers all logging in/loading modules at once is what
  // triggered the gotoAuthenticated() timing bug above in the first place.
  // Cap dev at 2 workers (matching CI) until that load is addressed on the
  // dev side; local keeps full parallelism since there's no shared load.
  workers: process.env.CI ? 2 : env.testEnv === 'dev' ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true, suiteTitle: false }],
  ],

  use: {
    // Every module is mounted under the shell (see src/config/modules.ts) —
    // there is one baseURL for the whole framework, switched local/dev via
    // TEST_ENV (see src/config/env.ts).
    baseURL: env.shellBaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [...moduleProjects, ...sanityProjects],
});
