import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Calendars list
 * (/planning/master-data/calendars). No actions or assertions here, see
 * src/pages/planning/calendars-list.page.ts for those.
 */
export class CalendarsListLocators {
  readonly heading: Locator;
  readonly newCalendarButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Calendars' });
    this.newCalendarButton = page.getByRole('button', { name: 'New calendar' });
  }
}
