import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { MillLocators } from '../../locators/mill/mill.locators';

/**
 * Owned by the Fabric Mill QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Fabric Mill coverage. Element locators live in MillLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
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
    await expect(this.locators.heading).toBeVisible();
  }
}
