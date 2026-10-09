import { test as base } from '@playwright/test';
import { BomListPage } from '../pages/bom/bom-list.page';
import { BomDetailPage } from '../pages/bom/bom-detail.page';
import { BomItemsPage } from '../pages/bom/bom-items.page';
import { ShellHeaderPage } from '../pages/shell/shell-header.page';

interface BomFixtures {
  bomListPage: BomListPage;
  bomDetailPage: BomDetailPage;
  bomItemsPage: BomItemsPage;
  shellHeaderPage: ShellHeaderPage;
}

/**
 * Fixture set scoped to the BOM module only. Each module gets its own
 * file on purpose — the BOM QA never needs to touch another module's
 * fixtures, and vice versa. (ShellHeaderPage is shell-level chrome
 * shared by every module, not another module's page object.)
 */
export const test = base.extend<BomFixtures>({
  bomListPage: async ({ page }, use) => {
    await use(new BomListPage(page));
  },

  bomDetailPage: async ({ page }, use) => {
    await use(new BomDetailPage(page));
  },

  bomItemsPage: async ({ page }, use) => {
    await use(new BomItemsPage(page));
  },

  shellHeaderPage: async ({ page }, use) => {
    await use(new ShellHeaderPage(page));
  },
});

export { expect } from '@playwright/test';
