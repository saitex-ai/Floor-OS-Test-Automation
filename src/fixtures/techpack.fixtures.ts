import { test as base } from '@playwright/test';
import { TechpackPage } from '../pages/techpack/techpack.page';
import { CreateTechpackPage } from '../pages/techpack/create-techpack.page';

interface TechpackFixtures {
  techpackPage: TechpackPage;
  createTechpackPage: CreateTechpackPage;
}

/**
 * Fixture set scoped to the Techpack module only. Each module gets its own
 * file on purpose — the Techpack QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<TechpackFixtures>({
  techpackPage: async ({ page }, use) => {
    await use(new TechpackPage(page));
  },

  createTechpackPage: async ({ page }, use) => {
    await use(new CreateTechpackPage(page));
  },
});

export { expect } from '@playwright/test';
