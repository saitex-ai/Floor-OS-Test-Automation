import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Activities
 * (/planning/master-data/activities). The grid itself is the shared
 * MasterDataListLocators (`ActivitiesListPage.grid`). No actions or
 * assertions here, see src/pages/planning/activities-list.page.ts.
 */
export class ActivitiesListLocators {
  readonly heading: Locator;
  readonly newActivityButton: Locator;
  /**
   * A search/filter that matches nothing. Sept: one shared "No activities
   * yet" message (accepted for TC-LA-10); recipes now have a distinct
   * "No … match your filters" message, so either is accepted here.
   */
  readonly noMatchState: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Activities' });
    this.newActivityButton = page.getByRole('button', { name: 'New activity' });
    this.noMatchState = page.getByText(/No activities match your filters|No activities yet/i);
  }
}
