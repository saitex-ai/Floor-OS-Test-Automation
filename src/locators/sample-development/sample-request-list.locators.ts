import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Sample Requests list (/sample-development,
 * the module's own landing view) — no actions or assertions here, see
 * src/pages/sample-development/sample-request-list.page.ts for those.
 * Confirmed against the running app (2026-10-05).
 */
export class SampleRequestListLocators {
  readonly heading: Locator;
  readonly newSampleRequestButton: Locator;
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sample Requests', level: 1 });
    this.newSampleRequestButton = page.getByRole('button', { name: 'New sample request' });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
  }

  /** The row link for a given Sample Request ID, e.g. "Sample_2026_0012". */
  row(sampleRequestId: string): Locator {
    return this.page.getByRole('link', { name: sampleRequestId, exact: true });
  }
}
