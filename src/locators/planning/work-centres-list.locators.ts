import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Work Centres list
 * (/planning/master-data/work-centres). No actions or assertions here,
 * see src/pages/planning/work-centres-list.page.ts for those.
 */
export class WorkCentresListLocators {
  readonly heading: Locator;
  readonly newWorkCentreButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Work Centres' });
    this.newWorkCentreButton = page.getByRole('button', { name: 'New work centre' });
  }
}
