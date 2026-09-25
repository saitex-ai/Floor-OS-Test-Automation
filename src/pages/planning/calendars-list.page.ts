import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CalendarsListLocators } from '../../locators/planning/calendars-list.locators';

/**
 * Planning > Master Data > Calendars list. Owned by the Planning QA. Real
 * route: /planning/master-data/calendars. Element locators live in
 * CalendarsListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CalendarsListPage extends BasePage {
  readonly locators: CalendarsListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CalendarsListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/calendars');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newCalendarButton).toBeVisible();
  }

  async openNewCalendar(): Promise<void> {
    await this.locators.newCalendarButton.click();
  }
}
