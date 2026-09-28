import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { WorkCentresListLocators } from '../../locators/planning/work-centres-list.locators';

/**
 * Planning > Master Data > Work Centres list. Owned by the Planning QA.
 * Real route: /planning/master-data/work-centres. Element locators live
 * in WorkCentresListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class WorkCentresListPage extends BasePage {
  readonly locators: WorkCentresListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new WorkCentresListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/work-centres');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newWorkCentreButton).toBeVisible();
  }

  async openNewWorkCentre(): Promise<void> {
    await this.locators.newWorkCentreButton.click();
  }
}
