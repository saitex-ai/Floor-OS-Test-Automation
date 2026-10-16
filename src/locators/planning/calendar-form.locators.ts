import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Calendar create / edit form
 * (/planning/master-data/calendars/new and /calendars/<CODE>/edit). No
 * actions or assertions here, see src/pages/planning/calendar-form.page.ts.
 */
export class CalendarFormLocators {
  readonly newHeading: Locator;
  readonly calendarCode: Locator;
  readonly codeFixedHelp: Locator;
  /** Since the 2026-10-16 deploy the code is generated on save: the create form says so under the locked field. */
  readonly codeGeneratedHelp: Locator;
  readonly name: Locator;
  readonly appliesTo: Locator;
  readonly inheritsFrom: Locator;
  readonly timeZone: Locator;
  /** "Different zone from its parent — usually a mistake" */
  readonly timeZoneWarning: Locator;
  readonly activeSwitch: Locator;
  readonly versionField: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** "Saving rewrites this calendar. …" / a "saves as a new version" notice on edit. */
  readonly saveNotice: Locator;

  constructor(private readonly page: Page) {
    this.newHeading = page.getByRole('heading', { name: 'New calendar', level: 1 });
    this.calendarCode = page.getByRole('textbox', { name: 'Calendar code' });
    this.codeFixedHelp = page.getByText(/The code is fixed once the record exists/);
    this.codeGeneratedHelp = page.getByText(/Assigned automatically when the record is saved/);
    this.name = page.getByRole('textbox', { name: 'Name', exact: true });
    this.appliesTo = page.getByRole('combobox', { name: 'Applies to', exact: true });
    this.inheritsFrom = page.getByRole('combobox', { name: 'Inherits from', exact: true });
    this.timeZone = page.getByRole('combobox', { name: 'Time zone', exact: true });
    this.timeZoneWarning = page.getByText(/Different zone from its parent/);
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    this.versionField = page.getByRole('textbox', { name: 'Version' });
    this.createButton = page.getByRole('button', { name: 'Create calendar' });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
