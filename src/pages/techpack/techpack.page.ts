import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { TechpackLocators } from '../../locators/techpack/techpack.locators';

/**
 * Owned by the Techpack QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Techpack coverage. Element locators live in TechpackLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class TechpackPage extends BasePage {
  readonly locators: TechpackLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new TechpackLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['techpack'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['techpack'].path}`));
    await expect(this.locators.heading).toBeVisible();
  }
}
