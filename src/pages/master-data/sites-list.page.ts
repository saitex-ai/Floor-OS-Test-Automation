import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { SitesListLocators } from '../../locators/master-data/sites-list.locators';

/**
 * Top-level Master Data module's Site Master list. Owned by the Master
 * Data QA (shared module). Real route:
 * /master-data/system-management/sites — not to be confused with
 * Planning's own, separately-routed "Master Data" submenu. Element
 * locators live in SitesListLocators (`this.locators`) — this class only
 * holds flows/actions/assertions built on top of them.
 */
export class SitesListPage extends BasePage {
  readonly locators: SitesListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SitesListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/sites');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newSiteButton).toBeVisible();
  }

  async openNewSite(): Promise<void> {
    await this.locators.newSiteButton.click();
  }
}
