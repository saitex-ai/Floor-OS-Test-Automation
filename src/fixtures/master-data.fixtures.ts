import { test as base } from '@playwright/test';
import { MasterDataPage } from '../pages/master-data/master-data.page';
import { DepartmentsListPage } from '../pages/master-data/departments-list.page';
import { DepartmentFormPage } from '../pages/master-data/department-form.page';
import { EmployeesListPage } from '../pages/master-data/employees-list.page';
import { EmployeeFormPage } from '../pages/master-data/employee-form.page';
import { SitesListPage } from '../pages/master-data/sites-list.page';
import { SiteFormPage } from '../pages/master-data/site-form.page';
import { CompanyListPage } from '../pages/master-data/company-list.page';
import { CompanyFormPage } from '../pages/master-data/company-form.page';
import { CustomerListPage } from '../pages/master-data/customer-list.page';
import { CustomerFormPage } from '../pages/master-data/customer-form.page';
import { CustomerSeasonListPage } from '../pages/master-data/customer-season-list.page';
import { CustomerSeasonFormPage } from '../pages/master-data/customer-season-form.page';
import { VendorListPage } from '../pages/master-data/vendor-list.page';
import { VendorFormPage } from '../pages/master-data/vendor-form.page';
import { GmtInseamPage } from '../pages/master-data/gmt-inseam.page';
import { GmtWaistPage } from '../pages/master-data/gmt-waist.page';
import { SizePage } from '../pages/master-data/size.page';
import { ColorPage } from '../pages/master-data/color.page';
import { UomPage } from '../pages/master-data/uom.page';
import { CurrencyRatePage } from '../pages/master-data/currency-rate.page';
import { CurrencyRateBuyerPage } from '../pages/master-data/currency-rate-buyer.page';
import { CustomerPercentagePage } from '../pages/master-data/customer-percentage.page';
import { TechpackTypePage } from '../pages/master-data/techpack-type.page';
import { SampleRequestCreationPage } from '../pages/master-data/sample-request-creation.page';

interface MasterDataFixtures {
  masterDataPage: MasterDataPage;
  departmentsListPage: DepartmentsListPage;
  departmentFormPage: DepartmentFormPage;
  employeesListPage: EmployeesListPage;
  employeeFormPage: EmployeeFormPage;
  sitesListPage: SitesListPage;
  siteFormPage: SiteFormPage;
  companyListPage: CompanyListPage;
  companyFormPage: CompanyFormPage;
  customerListPage: CustomerListPage;
  customerFormPage: CustomerFormPage;
  customerSeasonListPage: CustomerSeasonListPage;
  customerSeasonFormPage: CustomerSeasonFormPage;
  vendorListPage: VendorListPage;
  vendorFormPage: VendorFormPage;
  gmtInseamPage: GmtInseamPage;
  gmtWaistPage: GmtWaistPage;
  sizePage: SizePage;
  colorPage: ColorPage;
  uomPage: UomPage;
  currencyRatePage: CurrencyRatePage;
  currencyRateBuyerPage: CurrencyRateBuyerPage;
  customerPercentagePage: CustomerPercentagePage;
  techpackTypePage: TechpackTypePage;
  sampleRequestCreationPage: SampleRequestCreationPage;
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

  companyListPage: async ({ page }, use) => {
    await use(new CompanyListPage(page));
  },

  companyFormPage: async ({ page }, use) => {
    await use(new CompanyFormPage(page));
  },

  customerListPage: async ({ page }, use) => {
    await use(new CustomerListPage(page));
  },

  customerFormPage: async ({ page }, use) => {
    await use(new CustomerFormPage(page));
  },

  customerSeasonListPage: async ({ page }, use) => {
    await use(new CustomerSeasonListPage(page));
  },

  customerSeasonFormPage: async ({ page }, use) => {
    await use(new CustomerSeasonFormPage(page));
  },

  vendorListPage: async ({ page }, use) => {
    await use(new VendorListPage(page));
  },

  vendorFormPage: async ({ page }, use) => {
    await use(new VendorFormPage(page));
  },

  gmtInseamPage: async ({ page }, use) => {
    await use(new GmtInseamPage(page));
  },

  gmtWaistPage: async ({ page }, use) => {
    await use(new GmtWaistPage(page));
  },

  sizePage: async ({ page }, use) => {
    await use(new SizePage(page));
  },

  colorPage: async ({ page }, use) => {
    await use(new ColorPage(page));
  },

  uomPage: async ({ page }, use) => {
    await use(new UomPage(page));
  },

  currencyRatePage: async ({ page }, use) => {
    await use(new CurrencyRatePage(page));
  },

  currencyRateBuyerPage: async ({ page }, use) => {
    await use(new CurrencyRateBuyerPage(page));
  },

  customerPercentagePage: async ({ page }, use) => {
    await use(new CustomerPercentagePage(page));
  },

  techpackTypePage: async ({ page }, use) => {
    await use(new TechpackTypePage(page));
  },

  sampleRequestCreationPage: async ({ page }, use) => {
    await use(new SampleRequestCreationPage(page));
  },
});

export { expect } from '@playwright/test';
