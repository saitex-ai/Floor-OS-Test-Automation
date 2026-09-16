import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { CostingLocators } from '../../locators/costing/costing.locators';

/**
 * Owned by the Costing QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Costing coverage. Element locators live in CostingLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class CostingPage extends BasePage {
  readonly locators: CostingLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CostingLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['costing'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['costing'].path}`));
    await expect(this.locators.heading).toBeVisible();
  }
}
