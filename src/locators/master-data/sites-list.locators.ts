import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Site
 * Master list (/master-data/system-management/sites) — not to be
 * confused with Planning's own separate "Master Data" submenu. No
 * actions or assertions here, see src/pages/master-data/sites-list.page.ts
 * for those.
 */
export class SitesListLocators {
  readonly heading: Locator;
  readonly newSiteButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sites' });
    this.newSiteButton = page.getByRole('button', { name: 'New site' });
  }
}
