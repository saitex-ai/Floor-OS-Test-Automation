import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New calendar" create form
 * (/planning/master-data/calendars/new). No actions or assertions here,
 * see src/pages/planning/calendar-form.page.ts for those.
 */
export class CalendarFormLocators {
  readonly calendarCode: Locator;
  readonly name: Locator;
  readonly appliesTo: Locator;
  readonly inheritsFrom: Locator;
  readonly timeZone: Locator;
  readonly activeSwitch: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.calendarCode = page.getByRole('textbox', { name: 'Calendar code' });
    this.name = page.getByRole('textbox', { name: 'Name', exact: true });
    this.appliesTo = page.getByRole('combobox', { name: 'Applies to', exact: true });
    this.inheritsFrom = page.getByRole('combobox', { name: 'Inherits from', exact: true });
    this.timeZone = page.getByRole('combobox', { name: 'Time zone', exact: true });
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    this.createButton = page.getByRole('button', { name: 'Create calendar' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }
}
