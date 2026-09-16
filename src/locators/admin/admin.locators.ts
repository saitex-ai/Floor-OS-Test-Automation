import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Admin module's landing view — no
 * actions or assertions here, see src/pages/admin/admin.page.ts for those.
 */
export class AdminLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // TODO(Admin QA): replace with a locator specific to this
    // module's landing view once you've confirmed it against the running app.
    this.heading = page.getByRole('heading', { level: 1 });
  }
}
