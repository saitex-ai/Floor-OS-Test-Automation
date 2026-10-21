import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CalendarDetailLocators } from '../../locators/planning/calendar-detail.locators';
import {
  dateClearButton,
  detailValue,
  fieldAlert,
} from '../../locators/planning/form-field.locators';
import { becomesUsable, expectActionBlocked } from './master-data-list.page';
import { paintedColours } from './badge-colours';
import { pickDayOfShownMonth } from './date-picker';
import { submitForm, submitExpectingToast, type SubmitResult } from './form-submit';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

export type Weekday =
  'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface WeekLineValues {
  weekday?: Weekday;
  /** A shift code, e.g. "A", "NIGHT" (options read "A · 07:30 → 16:30 · 8h 30m paid"). */
  shift?: string;
  standingOvertime?: boolean;
  active?: boolean;
}

export interface EntryValues {
  /** Day of the current month (the picker opens on it). */
  day?: number;
  dayType?: 'Working' | 'Half day' | 'Holiday' | 'Shutdown';
  why?: string;
}

/**
 * A calendar's detail page and its nested working-week / entry forms.
 * Owned by the Planning QA. The forms replace their grid on the same URL
 * under a "Calendar · <CODE>" breadcrumb. One line per (weekday, shift);
 * one entry per date. Lines and entries save in place.
 */
export class CalendarDetailPage extends BasePage {
  readonly locators: CalendarDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CalendarDetailLocators(page);
  }

  async open(code: string): Promise<void> {
    const path = `/planning/master-data/calendars/${code}`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
    await this.expectLoaded(code);
  }

  /**
   * A user without access is shown "Access restricted" or sent back to the
   * App Launcher — the calendar's detail and working week never render.
   */
  async openExpectingRestricted(code: string): Promise<void> {
    const path = `/planning/master-data/calendars/${code}`;
    await this.gotoAuthenticated(path);
    await expect
      .poll(
        async () =>
          (await this.locators.accessRestricted
            .first()
            .isVisible()
            .catch(() => false)) || !this.page.url().includes(path),
        { message: 'blocked: "Access restricted" or redirected away', timeout: WAIT.PAGE_LOAD },
      )
      .toBe(true);
    await expect(this.locators.weekHeading).toHaveCount(0);
  }

  /** After "Create calendar": the generated code (CAL-0001…), read from the new detail page's URL. */
  async createdCode(): Promise<string> {
    await expect(this.page).toHaveURL(/\/calendars\/(?!new$)[^/]+$/, { timeout: WAIT.NAVIGATION });
    const code = new URL(this.page.url()).pathname.split('/').pop()!;
    await this.expectLoaded(code);
    return code;
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/calendars/${code}$`), {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.entriesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(detailValue(this.page, 'Calendar code')).toHaveText(code);
  }

  async expectReadOnlyView(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible();
    await expect(
      this.page.getByRole('main').last().getByRole('textbox', { name: 'Name' }),
    ).toHaveCount(0);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
  }

  async expectValue(label: string, value: string | RegExp): Promise<void> {
    await expect(detailValue(this.page, label)).toHaveText(value, { timeout: WAIT.SERVER });
  }

  /** A read-only user gets no working "Edit calendar", or is refused on the edit page. */
  async expectEditBlocked(): Promise<void> {
    await expect(this.locators.entriesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectActionBlocked(this.page, this.locators.editButton, 'Save changes');
  }

  // ── Working week ──

  async weekCount(): Promise<number> {
    const text = await this.locators.weekHeading.innerText();
    return Number(text.match(/\((\d+)\)/)![1]);
  }

  async expectWeekCount(count: number): Promise<void> {
    await expect(this.locators.weekHeading).toHaveText(
      new RegExp(`^Default working week \\(${count}\\)`),
      { timeout: WAIT.SERVER },
    );
  }

  async expectWeekColumns(): Promise<void> {
    const headers = (await this.locators.weekTable.getByRole('columnheader').allInnerTexts())
      // Header text carries the sort indicator ("Weekday\n↑", "Active\n⇅").
      .map((h) => h.replace(/[↑↓⇅]/g, '').trim())
      .filter(Boolean);
    expect(headers).toEqual(['Weekday', 'Shift that runs', 'Standing overtime', 'Active']);
  }

  /** Weekday cells top to bottom. */
  async weekdays(): Promise<string[]> {
    await expect(this.locators.weekBodyRows().first()).toBeVisible({ timeout: WAIT.SERVER });
    const out: string[] = [];
    for (const row of await this.locators.weekBodyRows().all())
      out.push((await row.getByRole('cell').first().innerText()).trim());
    return out;
  }

  async expectWeekRow(
    weekday: Weekday,
    shift: string,
    cells: Record<string, string | RegExp> = {},
  ): Promise<void> {
    const row = this.locators.weekRows(weekday, shift).first();
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    for (const text of Object.values(cells)) await expect(row).toContainText(text);
  }

  async expectNoWeekRow(weekday: Weekday, shift?: string): Promise<void> {
    await expect(this.locators.weekRows(weekday, shift)).toHaveCount(0);
  }

  async expectWeekEmptyState(): Promise<void> {
    await expect(this.locators.weekEmptyState).toBeVisible({ timeout: WAIT.SERVER });
  }

  async searchWeek(term: string): Promise<void> {
    await this.locators.weekSearch.fill(term);
  }

  async expectEveryWeekRowMatches(term: string): Promise<void> {
    await expect
      .poll(async () =>
        (await this.locators.weekBodyRows().allInnerTexts()).filter(
          (t) => !t.toLowerCase().includes(term.toLowerCase()),
        ),
      )
      .toEqual([]);
    await expect(this.locators.weekBodyRows().first()).toBeVisible();
  }

  async openNewWeekLine(): Promise<void> {
    await this.locators.newWeekLineButton.click();
  }

  async openWeekLineEdit(weekday: Weekday, shift: string): Promise<void> {
    await this.locators.rowEditButton(this.locators.weekRows(weekday, shift).first()).click();
  }

  async isWeekLineEditAvailable(weekday: Weekday, shift: string): Promise<boolean> {
    await expect(this.locators.weekRows(weekday, shift).first()).toBeVisible({
      timeout: WAIT.SERVER,
    });
    return becomesUsable(
      this.locators.rowEditButton(this.locators.weekRows(weekday, shift).first()),
    );
  }

  async isNewWeekLineAvailable(): Promise<boolean> {
    await expect(this.locators.weekHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.newWeekLineButton);
  }

  // ── Entries ──

  async expectEntryCount(count: number): Promise<void> {
    await expect(this.locators.entriesHeading).toHaveText(
      new RegExp(`^Calendar entries \\(${count}\\)`),
      { timeout: WAIT.SERVER },
    );
  }

  async expectEntryRow(why: string, cells: Record<string, string | RegExp> = {}): Promise<void> {
    const row = this.locators.entryRow(why);
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    for (const text of Object.values(cells)) await expect(row).toContainText(text);
  }

  async expectNoEntryRow(why: string): Promise<void> {
    await expect(this.locators.entryRow(why)).toHaveCount(0);
  }

  async openNewEntry(): Promise<void> {
    await this.locators.newEntryButton.click();
  }

  async openEntryEdit(why: string): Promise<void> {
    await this.locators.rowEditButton(this.locators.entryRow(why)).click();
  }

  async isNewEntryAvailable(): Promise<boolean> {
    await expect(this.locators.entriesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.newEntryButton);
  }

  async isEntryEditAvailable(why: string): Promise<boolean> {
    await expect(this.locators.entryRow(why)).toBeVisible({ timeout: WAIT.SERVER });
    return becomesUsable(this.locators.rowEditButton(this.locators.entryRow(why)));
  }

  /** The Day type pill's own colours (background + text) in one entry row. */
  async dayTypeColours(why: string, dayType: string): Promise<string> {
    const pill = this.locators.entryRow(why).getByText(dayType, { exact: true });
    await expect(pill).toBeVisible({ timeout: WAIT.SERVER });
    return pill.evaluate(paintedColours);
  }

  // ── Nested forms ──

  async expectFormOpen(
    kind: 'New' | 'Edit',
    what: 'working-week line' | 'calendar entry',
    code: string,
  ): Promise<void> {
    await expect(this.locators.formHeading).toHaveText(`${kind} ${what}`, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.breadcrumb).toHaveText(`Calendar · ${code}`);
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectWeekLineFields(): Promise<void> {
    for (const field of [
      this.locators.weekday,
      this.locators.shift,
      this.locators.standingOvertime,
      this.locators.active,
    ])
      await expect(field).toBeVisible();
    await expect(this.locators.timeFields).toHaveCount(0);
  }

  private async pick(combo: Locator, option: RegExp): Promise<void> {
    await combo.click();
    await this.locators.option(option).first().click();
  }

  private async setSwitch(sw: Locator, on: boolean): Promise<void> {
    if ((await sw.isChecked()) !== on) await sw.click();
    await expect(sw).toBeChecked({ checked: on });
  }

  async fillWeekLine(values: WeekLineValues): Promise<void> {
    if (values.weekday) await this.pick(this.locators.weekday, new RegExp(`^${values.weekday}$`));
    if (values.shift) await this.pick(this.locators.shift, new RegExp(`^${values.shift} ·`));
    if (values.standingOvertime !== undefined)
      await this.setSwitch(this.locators.standingOvertime, values.standingOvertime);
    if (values.active !== undefined) await this.setSwitch(this.locators.active, values.active);
  }

  async fillEntry(values: EntryValues): Promise<void> {
    if (values.day !== undefined)
      await pickDayOfShownMonth(this.page, this.locators.entryDate, values.day);
    if (values.dayType) await this.pick(this.locators.dayType, new RegExp(`^${values.dayType}\\b`));
    if (values.why !== undefined) await this.locators.why.fill(values.why);
  }

  async clearEntryDate(): Promise<void> {
    await dateClearButton(this.locators.entryDate).click();
  }

  async dayTypeOptions(): Promise<string[]> {
    await this.locators.dayType.click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async createWeekLine(): Promise<SubmitResult> {
    return submitForm(this.locators.createLineButton);
  }

  async createEntry(): Promise<SubmitResult> {
    return submitForm(this.locators.createEntryButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async submitExpectingToast(
    action: 'line' | 'entry' | 'save',
    text: string | RegExp,
  ): Promise<void> {
    const button = {
      line: this.locators.createLineButton,
      entry: this.locators.createEntryButton,
      save: this.locators.saveButton,
    }[action];
    await submitExpectingToast(button, text);
  }

  async cancelForm(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.cancelButton).toBeHidden({ timeout: WAIT.NAVIGATION });
  }

  async expectFormFieldFlagged(field: 'weekday' | 'shift'): Promise<void> {
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /** The entry Date's own message ("Pick a date"). */
  async expectEntryDateFlagged(): Promise<void> {
    await expect(fieldAlert(this.locators.entryDate)).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async formNoticeText(): Promise<string> {
    return (await this.locators.formNotice.innerText()).trim();
  }

  async expectNoEmptyDayType(): Promise<void> {
    const options = await this.dayTypeOptions();
    expect(options.filter((o) => /^select/i.test(o) || o === '')).toEqual([]);
  }
}
