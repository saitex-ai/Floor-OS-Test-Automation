import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Planning module's landing view — no
 * actions or assertions here, see src/pages/planning/planning.page.ts for those.
 */
export class PlanningLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // TODO(Planning QA): replace with a locator specific to this
    // module's landing view once you've confirmed it against the running app.
    this.heading = page.getByRole('heading', { level: 1 });
  }
}
