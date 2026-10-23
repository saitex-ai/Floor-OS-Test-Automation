import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Planning module's landing view — no
 * actions or assertions here, see src/pages/planning/planning.page.ts for those.
 */
export class PlanningLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // The landing view's heading reads "Planning" over "Select a screen
    // from the left navigation." It was an <h2> (confirmed
    // 2026-09-25) and is an <h1> as of the 2026-10-22 design-system release,
    // so the level isn't pinned.
    // The "Planning" button above it isn't a heading, so it can't match.
    this.heading = page.getByRole('heading', { name: 'Planning', exact: true });
  }
}
