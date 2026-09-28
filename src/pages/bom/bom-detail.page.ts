import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { BomDetailLocators } from '../../locators/bom/bom-detail.locators';
import { BOM_PATH } from './bom-list.page';

/**
 * A BOM's detail page (/bom/<code>/<rev>). Owned by the BOM QA.
 * Element locators live in BomDetailLocators (`this.locators`).
 */
export class BomDetailPage extends BasePage {
  readonly locators: BomDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new BomDetailLocators(page);
  }

  async expectOpenFor(code: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${BOM_PATH}/${code}/`));
    await expect(this.locators.breadcrumb).toContainText(code);
  }

  async back(): Promise<void> {
    await this.locators.backButton.click();
  }

  async expectLockedApproved(): Promise<void> {
    await expect(this.locators.lockedStatus).toBeVisible();
    await expect(this.locators.reopenButton).toBeVisible();
    await expect(this.locators.addLineButton).toHaveCount(0);
  }

  async openReportsMenu(): Promise<void> {
    await this.locators.reportsButton.click();
    await expect(this.locators.reportsMenu).toBeVisible();
  }

  async closeReportsMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.reportsMenu).toBeHidden();
  }
}
