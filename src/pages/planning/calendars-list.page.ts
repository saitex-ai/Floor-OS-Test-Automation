import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { CalendarsListLocators } from '../../locators/planning/calendars-list.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Calendars list. Owned by the Planning QA. Real
 * route: /planning/master-data/calendars. Tabs: All / Active / Draft /
 * Retired. A row click opens the calendar's detail page
 * (/calendars/<CODE>) — see CalendarDetailPage.
 */
export class CalendarsListPage extends MasterDataListPage {
  readonly locators: CalendarsListLocators;
  protected readonly route = '/planning/master-data/calendars';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new CalendarsListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newCalendarButton;
  }

  async openNewCalendar(): Promise<void> {
    await this.openNew();
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }
}
