import { test as base } from '@playwright/test';
import { SampleRequestListPage } from '../pages/sample-development/sample-request-list.page';
import { CreateSampleRequestPage } from '../pages/sample-development/create-sample-request.page';

interface SampleDevelopmentFixtures {
  sampleRequestListPage: SampleRequestListPage;
  createSampleRequestPage: CreateSampleRequestPage;
}

/**
 * Fixture set scoped to the Sample Development module only. Each module
 * gets its own file on purpose — the Sample Development QA never needs
 * to touch another module's fixtures, and vice versa.
 */
export const test = base.extend<SampleDevelopmentFixtures>({
  sampleRequestListPage: async ({ page }, use) => {
    await use(new SampleRequestListPage(page));
  },

  createSampleRequestPage: async ({ page }, use) => {
    await use(new CreateSampleRequestPage(page));
  },
});

export { expect } from '@playwright/test';
