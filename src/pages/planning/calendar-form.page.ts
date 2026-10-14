import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CalendarFormLocators } from '../../locators/planning/calendar-form.locators';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { fieldAlert } from '../../locators/planning/form-field.locators';
import { submitForm, submitExpectingToast, type SubmitResult } from './form-submit';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

export interface CalendarFieldValues {
  code: string;
  name: string;
}

export interface CalendarOptions {
  appliesTo?: 'Factory' | 'Department' | 'Work centre' | 'Shift';
  /** A calendar code to inherit from. */
  inheritsFrom?: string;
  /** An IANA zone, e.g. "Europe/London" (typed to narrow the long list, then picked). */
  timeZone?: string;
  active?: boolean;
}

/**
 * The Calendar create / edit form on Planning > Master Data > Calendars.
 * Real routes: /planning/master-data/calendars/new and /calendars/<CODE>/edit.
 * Owned by the Planning QA. Only Calendar code + Name are needed; Applies
 * to (Department), Inherits from (none) and Time zone (Asia/Ho_Chi_Minh)
 * have defaults. A create lands on /calendars/<CODE> ("Calendar created.");
 * a duplicate code or an inheritance loop is refused with a toast.
 */
export class CalendarFormPage extends BasePage {
  readonly locators: CalendarFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CalendarFormLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/calendars/new');
    await ensureRoute(this.page, '/planning/master-data/calendars/new');
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async openEdit(code: string): Promise<void> {
    const path = `/planning/master-data/calendars/${code}/edit`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
    await this.expectOnEditPage();
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/calendars\/[^/]+\/edit$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.saveButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** The fields TC-CC-01 lists, and no Version anywhere on the form. */
  async expectCreateFields(): Promise<void> {
    const l = this.locators;
    for (const field of [
      l.calendarCode,
      l.name,
      l.appliesTo,
      l.inheritsFrom,
      l.timeZone,
      l.activeSwitch,
    ])
      await expect(field).toBeVisible();
    await expect(l.versionField).toHaveCount(0);
  }

  async fillRequired(values: CalendarFieldValues): Promise<void> {
    await this.locators.calendarCode.fill(values.code);
    await this.locators.name.fill(values.name);
  }

  private async pick(combo: Locator, option: string | RegExp, type?: string): Promise<void> {
    await combo.click();
    if (type) await this.page.keyboard.type(type);
    await this.locators.option(option).first().click();
  }

  async fill(values: Partial<CalendarFieldValues> & CalendarOptions): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.calendarCode.fill(values.code);
    if (values.name !== undefined) await l.name.fill(values.name);
    if (values.appliesTo) await this.pick(l.appliesTo, values.appliesTo);
    if (values.inheritsFrom)
      await this.pick(
        l.inheritsFrom,
        new RegExp(`^${escapeRegExp(values.inheritsFrom)} ·`),
        values.inheritsFrom,
      );
    if (values.timeZone)
      await this.pick(
        l.timeZone,
        new RegExp(`^${escapeRegExp(values.timeZone)}$`),
        values.timeZone.split('/').pop(),
      );
    if (values.active !== undefined) {
      if ((await l.activeSwitch.isChecked()) !== values.active) await l.activeSwitch.click();
    }
  }

  async optionsOf(field: 'appliesTo' | 'inheritsFrom'): Promise<string[]> {
    await this.locators[field].click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async setName(name: string): Promise<void> {
    await this.locators.name.fill(name);
  }

  /** Smoke: just clicks Create — see expectCreatedSuccessfully(). */
  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async submitCreate(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async createExpectingToast(text: string | RegExp): Promise<void> {
    await submitExpectingToast(this.locators.createButton, text);
  }

  async saveExpectingToast(text: string | RegExp): Promise<void> {
    await submitExpectingToast(this.locators.saveButton, text);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectCreatedSuccessfully(code: string): Promise<void> {
    await expect(this.page.getByText('Calendar created.')).toBeVisible({ timeout: 15_000 });
    await expect(this.page).toHaveURL(new RegExp(`/planning/master-data/calendars/${code}$`));
  }

  async expectFieldFlagged(field: 'calendarCode' | 'name'): Promise<void> {
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectTimeZoneWarning(shown: boolean): Promise<void> {
    await expect(this.locators.timeZoneWarning).toHaveCount(shown ? 1 : 0);
  }

  async expectCodeLocked(code: string): Promise<void> {
    await expect(this.locators.calendarCode).toBeDisabled();
    await expect(this.locators.calendarCode).toHaveValue(code);
    await expect(this.locators.codeFixedHelp).toBeVisible();
  }

  async expectNoVersionField(): Promise<void> {
    await expect(this.locators.versionField).toHaveCount(0);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }

  /** A select whose value can't be emptied — its options are all real values. */
  async expectNoEmptyChoice(field: 'appliesTo'): Promise<void> {
    const options = await this.optionsOf(field);
    expect(options.length).toBeGreaterThan(0);
    expect(options.filter((o) => /^select/i.test(o) || o === '')).toEqual([]);
  }
}
