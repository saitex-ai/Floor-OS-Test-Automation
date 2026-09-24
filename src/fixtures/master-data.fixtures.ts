import { test as base } from '@playwright/test';
import { MasterDataPage } from '../pages/master-data/master-data.page';
import { DepartmentsListPage } from '../pages/master-data/departments-list.page';
import { DepartmentFormPage } from '../pages/master-data/department-form.page';

interface MasterDataFixtures {
  masterDataPage: MasterDataPage;
  departmentsListPage: DepartmentsListPage;
  departmentFormPage: DepartmentFormPage;
}

/**
 * Fixture set scoped to the Master Data module only. Each module gets its own
 * file on purpose — the Master Data QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<MasterDataFixtures>({
  masterDataPage: async ({ page }, use) => {
    await use(new MasterDataPage(page));
  },

  departmentsListPage: async ({ page }, use) => {
    await use(new DepartmentsListPage(page));
  },

  departmentFormPage: async ({ page }, use) => {
    await use(new DepartmentFormPage(page));
  },
});

export { expect } from '@playwright/test';
