import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CalendarFormLocators } from '../../locators/planning/calendar-form.locators';

export interface CalendarFieldValues {
  code: string;
  name: string;
}

/**
 * The "New calendar" create form on Planning > Master Data > Calendars.
 * Real route: /planning/master-data/calendars/new. Owned by the Planning
 * QA. Element locators live in CalendarFormLocators (`this.locators`) —
 * this class only holds flows/actions/assertions built on top of them.
 */
export class CalendarFormPage extends BasePage {
  readonly locators: CalendarFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CalendarFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /**
   * Calendar code + Name are the only two fields needed to save — Name is
   * genuinely required (confirmed live via an `alert: Required` under it
   * on an empty submit attempt, per this repo's own history), while
   * Applies to / Inherits from / Time zone / Active all already carry a
   * usable default (Department / "Nothing — top level" / a real IANA zone
   * / Yes) that a single-calendar happy path doesn't need to touch.
   */
  async fillRequired(values: CalendarFieldValues): Promise<void> {
    await this.locators.calendarCode.fill(values.code);
    await this.locators.name.fill(values.name);
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /**
   * Real toast text confirmed live: "Calendar created." A successful
   * create also navigates straight to the new calendar's own detail page
   * at /planning/master-data/calendars/<code> (the code, not a UUID) —
   * checked here too since it's a stronger signal than the toast alone.
   */
  async expectCreatedSuccessfully(code: string): Promise<void> {
    await expect(this.page.getByText('Calendar created.')).toBeVisible({ timeout: 15_000 });
    await expect(this.page).toHaveURL(new RegExp(`/planning/master-data/calendars/${code}$`));
  }
}
