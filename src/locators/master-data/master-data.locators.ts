import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Master Data module's landing view — no
 * actions or assertions here, see src/pages/master-data/master-data.page.ts for those.
 */
export class MasterDataLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // The landing view's heading ("Master Data" / "Select a master from
    // the left navigation."). It was an <h2> until the 2026-10-22
    // design-system release made it the page's <h1> (checked on dev
    // 2026-10-26).
    this.heading = page.getByRole('heading', { name: 'Master Data', level: 1 });
  }
}
