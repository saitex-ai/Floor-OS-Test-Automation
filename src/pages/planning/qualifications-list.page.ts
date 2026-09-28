import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { QualificationsListLocators } from '../../locators/planning/qualifications-list.locators';

/**
 * Planning > Master Data > Qualifications list. Owned by the Planning QA.
 * Real route: /planning/master-data/qualifications. Element locators live
 * in QualificationsListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class QualificationsListPage extends BasePage {
  readonly locators: QualificationsListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new QualificationsListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/qualifications');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newQualificationButton).toBeVisible();
  }

  async openNewQualification(): Promise<void> {
    await this.locators.newQualificationButton.click();
  }
}
