import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Master Data module's landing view — no
 * actions or assertions here, see src/pages/master-data/master-data.page.ts for those.
 */
export class MasterDataLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // Confirmed live 2026-09-24: the landing view's real heading is an
    // <h2> ("Master Data" / "Select a master from the left navigation.")
    // — a level-1 heading never appears here, which is why the old
    // TODO guess (getByRole('heading', { level: 1 })) failed every time,
    // not flakiness.
    this.heading = page.getByRole('heading', { name: 'Master Data', level: 2 });
  }
}
