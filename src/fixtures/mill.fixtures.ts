import { test as base } from '@playwright/test';
import { MillPage } from '../pages/mill/mill.page';
import { SpinningPage } from '../pages/mill/spinning.page';
import { PrepPage } from '../pages/mill/prep.page';
import { WeavingPage } from '../pages/mill/weaving.page';
import { FinishingPage } from '../pages/mill/finishing.page';
import { RequestsPage } from '../pages/mill/requests.page';

interface MillFixtures {
  millPage: MillPage;
  spinningPage: SpinningPage;
  prepPage: PrepPage;
  weavingPage: WeavingPage;
  finishingPage: FinishingPage;
  requestsPage: RequestsPage;
}

/**
 * Fixture set scoped to the Fabric Mill module only. Each module gets its own
 * file on purpose — the Fabric Mill QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<MillFixtures>({
  millPage: async ({ page }, use) => {
    await use(new MillPage(page));
  },

  spinningPage: async ({ page }, use) => {
    await use(new SpinningPage(page));
  },

  prepPage: async ({ page }, use) => {
    await use(new PrepPage(page));
  },

  weavingPage: async ({ page }, use) => {
    await use(new WeavingPage(page));
  },

  finishingPage: async ({ page }, use) => {
    await use(new FinishingPage(page));
  },

  requestsPage: async ({ page }, use) => {
    await use(new RequestsPage(page));
  },
});

export { expect } from '@playwright/test';
