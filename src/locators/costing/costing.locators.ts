import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Costing module's landing view — no
 * actions or assertions here, see src/pages/costing/costing.page.ts for those.
 */
export class CostingLocators {
  readonly heading: Locator;
  readonly selectScreenHint: Locator;

  constructor(page: Page) {
    // The landing's "Costing" title is an <h1> in the 2026-10-22 design
    // system (it was an <h2> on 2026-10-14), so it's matched by name with the
    // level left open. A "Costing" button and nav link also exist on the
    // page — matching the heading role keeps them out.
    this.heading = page.getByRole('heading', { name: 'Costing', exact: true });
    this.selectScreenHint = page.getByText('Select a screen from the left navigation.');
  }
}
