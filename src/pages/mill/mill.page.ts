import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { MILL_REMOTE_LOAD_TIMEOUT } from './mill-timeouts';
import { MillLocators } from '../../locators/mill/mill.locators';

/**
 * Owned by the Fabric Mill QA. The module's landing view ("Mill
 * operations", /mill). Each production / stores screen has its own
 * page class next to this one (spinning.page.ts, prep.page.ts, ...).
 * Element locators live in MillLocators (`this.locators`) — this class
 * only holds flows/actions/assertions built on top of them.
 */
export class MillPage extends BasePage {
  readonly locators: MillLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MillLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['mill'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['mill'].path}`));
    await expect(this.locators.heading).toBeVisible({ timeout: MILL_REMOTE_LOAD_TIMEOUT });
  }
}
