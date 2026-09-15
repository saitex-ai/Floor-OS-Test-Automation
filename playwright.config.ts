import { defineConfig, devices, type Project } from '@playwright/test';
import { MODULE_IDS } from './src/config/modules';
import { env } from './src/config/env';
import { authFile } from './src/fixtures/auth-setup';

/**
 * Two Playwright projects per floorOS module: "<id>-setup" logs in once
 * (see src/fixtures/auth-setup.ts) and "<id>" runs that module's specs
 * reusing the saved session. This is what makes `npm run test:crm` touch
 * only the CRM QA's files — module projects are fully independent, each
 * pointed at its own testDir and its own storage state.
 */
const moduleProjects: Project[] = MODULE_IDS.flatMap((id) => {
  const testDir = `./tests/${id}`;
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
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // dev's federated module bundles (e.g. the CRM remote) load over a real
  // network/VPN, not an already-warm local dev server — confirmed by
  // watching it headed: "Loading CRM…" alone can outlast 30s on dev, with
  // zero worker contention, every run. Local keeps the tight 30s for fast
  // feedback; dev gets real headroom for that.
  timeout: env.testEnv === 'dev' ? 60_000 : 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
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

  projects: moduleProjects,
});
