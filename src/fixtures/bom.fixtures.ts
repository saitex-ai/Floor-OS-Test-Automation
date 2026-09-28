import { test as base } from '@playwright/test';
import { BomListPage } from '../pages/bom/bom-list.page';
import { BomDetailPage } from '../pages/bom/bom-detail.page';

interface BomFixtures {
  bomListPage: BomListPage;
  bomDetailPage: BomDetailPage;
}

/**
 * Fixture set scoped to the BOM module only. Each module gets its own
 * file on purpose — the BOM QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<BomFixtures>({
  bomListPage: async ({ page }, use) => {
    await use(new BomListPage(page));
  },

  bomDetailPage: async ({ page }, use) => {
    await use(new BomDetailPage(page));
  },
});

export { expect } from '@playwright/test';
