import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CalendarFormLocators } from '../../locators/planning/calendar-form.locators';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { fieldAlert } from '../../locators/planning/form-field.locators';
import { submitExpectingToast, submitStepped, type SubmitResult } from './form-submit';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

export interface CalendarFieldValues {
  /** Omit since the 2026-10-16 dev deploy: the code is generated on save (CAL-0001…). */
  code?: string;
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
 * have defaults. Create and edit are two steps since the 2026-10-28 dev
 * deploy: step 1's "Save & continue" saves ("Calendar created. Add its
 * working week and entries next."), step 2 holds the working week and
 * entries (see CalendarDetailPage), and Done lands on /calendars/<CODE>.
 * An inheritance loop is refused with a toast.
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
    if (values.code !== undefined) await this.locators.calendarCode.fill(values.code);
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
    // Re-picking the zone the field already shows leaves its list open (2026-10-29).
    if (values.timeZone && (await l.timeZone.innerText()).trim() !== values.timeZone)
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

  /**
   * The QA-AUTO calendars "Inherits from" offers on a new calendar, lowest
   * code first. It loads only the first 200 calendars (`limit=200`; dev
   * 2026-10-29 has 450+), so a calendar created after those isn't offered.
   */
  async offeredQaParents(): Promise<string[]> {
    await this.open();
    await this.locators.inheritsFrom.click();
    // "Nothing — top level" shows before the calendars arrive: wait for them.
    const qa = this.locators.options().filter({ hasText: / · QA-AUTO / });
    await expect(qa.first()).toBeVisible({ timeout: WAIT.SERVER });
    const codes = (await qa.allInnerTexts()).map((o) => o.trim().split(' · ')[0]!);
    await this.page.keyboard.press('Escape');
    return codes;
  }

  /** "Inherits from" back to "Nothing — top level". */
  async setTopLevel(): Promise<void> {
    await this.pick(this.locators.inheritsFrom, /^Nothing — top level$/);
  }

  async setName(name: string): Promise<void> {
    await this.locators.name.fill(name);
  }

  /** Smoke: just clicks step 1's "Save & continue" — see expectCreatedSuccessfully(). */
  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Step 1's "Save & continue", then Done on step 2 — see submitStepped(). */
  async submitCreate(): Promise<SubmitResult> {
    return submitStepped(this.locators.createButton, this.locators.doneButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitStepped(this.locators.saveButton, this.locators.doneButton);
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

  /**
   * Step 1's "Save & continue" created it. Toast confirmed live (2026-10-28):
   * "Calendar created. Add its working week and entries next."
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Calendar created.')).toBeVisible({ timeout: 15_000 });
  }

  /**
   * "Done" on step 2 opens the new calendar's own page at
   * /planning/master-data/calendars/<code> (the code, not a UUID). Returns
   * that code — generated on save since the 2026-10-16 dev deploy, so callers
   * usually don't know it in advance.
   */
  async finish(): Promise<string> {
    await this.locators.doneButton.click();
    await expect(this.page).toHaveURL(/\/planning\/master-data\/calendars\/(?!new$)[^/]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    return new URL(this.page.url()).pathname.split('/').pop()!;
  }

  async expectFieldFlagged(field: 'calendarCode' | 'name'): Promise<void> {
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectTimeZoneWarning(shown: boolean): Promise<void> {
    await expect(this.locators.timeZoneWarning).toHaveCount(shown ? 1 : 0);
  }

  /** The create form's code: locked, "Auto-generated", assigned on save (dev deploy 2026-10-16). */
  async expectCodeGenerated(): Promise<void> {
    await expect(this.locators.calendarCode).toBeDisabled();
    await expect(this.locators.calendarCode).toHaveAttribute('placeholder', 'Auto-generated');
    await expect(this.locators.codeGeneratedHelp).toBeVisible();
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
