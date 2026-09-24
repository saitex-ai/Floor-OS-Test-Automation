import { test as base } from '@playwright/test';
import { MasterDataPage } from '../pages/master-data/master-data.page';
import { DepartmentsListPage } from '../pages/master-data/departments-list.page';
import { DepartmentFormPage } from '../pages/master-data/department-form.page';
import { EmployeesListPage } from '../pages/master-data/employees-list.page';
import { EmployeeFormPage } from '../pages/master-data/employee-form.page';
import { SitesListPage } from '../pages/master-data/sites-list.page';
import { SiteFormPage } from '../pages/master-data/site-form.page';

interface MasterDataFixtures {
  masterDataPage: MasterDataPage;
  departmentsListPage: DepartmentsListPage;
  departmentFormPage: DepartmentFormPage;
  employeesListPage: EmployeesListPage;
  employeeFormPage: EmployeeFormPage;
  sitesListPage: SitesListPage;
  siteFormPage: SiteFormPage;
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

  employeesListPage: async ({ page }, use) => {
    await use(new EmployeesListPage(page));
  },

  employeeFormPage: async ({ page }, use) => {
    await use(new EmployeeFormPage(page));
  },

  sitesListPage: async ({ page }, use) => {
    await use(new SitesListPage(page));
  },

  siteFormPage: async ({ page }, use) => {
    await use(new SiteFormPage(page));
  },
});

export { expect } from '@playwright/test';
