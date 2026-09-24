import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { EmployeesListLocators } from '../../locators/master-data/employees-list.locators';

/**
 * Top-level Master Data module's Employees list. Owned by the Master Data
 * QA (shared module). Real route:
 * /master-data/system-management/employees (nav label "Employees &
 * Skills"). Element locators live in EmployeesListLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class EmployeesListPage extends BasePage {
  readonly locators: EmployeesListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new EmployeesListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/employees');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newEmployeeButton).toBeVisible();
  }

  async openNewEmployee(): Promise<void> {
    await this.locators.newEmployeeButton.click();
  }
}
