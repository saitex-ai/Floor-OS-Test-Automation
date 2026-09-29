import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { MasterDataLocators } from '../../locators/master-data/master-data.locators';

/**
 * Owned by the Master Data QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Master Data coverage. Element locators live in MasterDataLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class MasterDataPage extends BasePage {
  readonly locators: MasterDataLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MasterDataLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['master-data'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['master-data'].path}`));
    // The landing view can sit on "Loading Master Data…" past the default
    // 15s assertion timeout on a slow dev moment — confirmed live
    // 2026-09-24, same shape as this app's other slow-loading module
    // bundles (see agent-notes/master-data-module.md).
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
  }
}
