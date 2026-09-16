import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { PlanningLocators } from '../../locators/planning/planning.locators';

/**
 * Owned by the Planning QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Planning coverage. Element locators live in PlanningLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class PlanningPage extends BasePage {
  readonly locators: PlanningLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new PlanningLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['planning'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['planning'].path}`));
    await expect(this.locators.heading).toBeVisible();
  }
}
