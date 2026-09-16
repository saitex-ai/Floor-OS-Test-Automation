import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { AdminLocators } from '../../locators/admin/admin.locators';

/**
 * Owned by the Admin QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Admin coverage. Element locators live in AdminLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class AdminPage extends BasePage {
  readonly locators: AdminLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AdminLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['admin'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['admin'].path}`));
    await expect(this.locators.heading).toBeVisible();
  }
}
