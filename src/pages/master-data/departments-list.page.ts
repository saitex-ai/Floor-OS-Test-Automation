import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { DepartmentsListLocators } from '../../locators/master-data/departments-list.locators';

/**
 * Top-level Master Data module's Department Master list. Owned by the
 * Master Data QA (shared module). Real route:
 * /master-data/system-management/departments — not to be confused with
 * Planning's own, separately-routed "Master Data" submenu. Element
 * locators live in DepartmentsListLocators (`this.locators`) — this class
 * only holds flows/actions/assertions built on top of them.
 */
export class DepartmentsListPage extends BasePage {
  readonly locators: DepartmentsListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new DepartmentsListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/departments');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newDepartmentButton).toBeVisible();
  }

  async openNewDepartment(): Promise<void> {
    await this.locators.newDepartmentButton.click();
  }
}
