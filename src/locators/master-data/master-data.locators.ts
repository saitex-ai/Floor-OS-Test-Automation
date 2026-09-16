import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Master Data module's landing view — no
 * actions or assertions here, see src/pages/master-data/master-data.page.ts for those.
 */
export class MasterDataLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // TODO(Master Data QA): replace with a locator specific to this
    // module's landing view once you've confirmed it against the running app.
    this.heading = page.getByRole('heading', { level: 1 });
  }
}
