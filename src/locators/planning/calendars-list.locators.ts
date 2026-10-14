import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Calendars list
 * (/planning/master-data/calendars). The grid itself is the shared
 * MasterDataListLocators (`CalendarsListPage.grid`). No actions or
 * assertions here, see src/pages/planning/calendars-list.page.ts for those.
 */
export class CalendarsListLocators {
  readonly heading: Locator;
  readonly newCalendarButton: Locator;
  /** The distinct message a search/filter that matches nothing should show. */
  readonly noMatchState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Calendars', exact: true });
    this.newCalendarButton = page.getByRole('button', { name: 'New calendar' });
    // "No calendar matches — Nothing here matches the search or filters. …"
    this.noMatchState = page.getByText(/No calendars? match/i);
  }
}
