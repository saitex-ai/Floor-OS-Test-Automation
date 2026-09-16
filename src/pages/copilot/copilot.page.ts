import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { CopilotLocators } from '../../locators/copilot/copilot.locators';

/**
 * Owned by the Copilot QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Copilot coverage. Element locators live in CopilotLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class CopilotPage extends BasePage {
  readonly locators: CopilotLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CopilotLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['copilot'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['copilot'].path}`));
    await expect(this.locators.heading).toBeVisible();
  }
}
