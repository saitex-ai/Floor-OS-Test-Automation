import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { CrmLocators } from '../../locators/crm/crm.locators';

/**
 * Owned by the CRM QA. Add this module's real locators/actions here
 * — nothing else in the framework needs to change to extend CRM coverage.
 */
export class CrmPage extends BasePage {
  readonly locators: CrmLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CrmLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['crm'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['crm'].path}`));
    await expect(this.locators.heading).toBeVisible();
  }
}
