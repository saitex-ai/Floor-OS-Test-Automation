import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CalendarDetailLocators } from '../../locators/planning/calendar-detail.locators';
import {
  alertsIn,
  dateClearButton,
  detailValue,
  toast,
} from '../../locators/planning/form-field.locators';
import { becomesUsable, expectActionBlocked } from './master-data-list.page';
import { paintedColours } from './badge-colours';
import { pickDayOfShownMonth } from './date-picker';
import { type SubmitResult, pressDone } from './form-submit';
import { InlineTable } from './inline-table';
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
 * A calendar's detail page, with its working week and entries behind two
 * tabs. Owned by the Planning QA. Since the 2026-10-28 dev deploy lines and
 * entries are added and edited on step 2 of Edit calendar, as rows of two
 * inline tables (each row saves on its own, see InlineTable) — the line and
 * entry methods here work there. One line per (weekday, shift); one entry
 * per date.
 */
export class CalendarDetailPage extends BasePage {
  readonly locators: CalendarDetailLocators;
  readonly week: InlineTable;
  readonly entries: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new CalendarDetailLocators(page);
    this.week = new InlineTable(
      page,
      'Default working week',
      'working-week line',
      this.locators.weekPanel,
    );
    this.entries = new InlineTable(
      page,
      'Calendar entries',
      'calendar entry',
      this.locators.entriesPanel,
    );
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
    // The Working week tab is the one shown on load.
    await expect(this.locators.weekHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
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

  async value(label: string): Promise<string> {
    const cell = detailValue(this.page, label);
    await expect(cell).toBeVisible({ timeout: WAIT.SERVER });
    return (await cell.innerText()).trim();
  }

  async expectValue(label: string, value: string | RegExp): Promise<void> {
    await expect(detailValue(this.page, label)).toHaveText(value, { timeout: WAIT.SERVER });
  }

  /** A read-only user gets no working "Edit calendar", or is refused on the edit page. */
  async expectEditBlocked(): Promise<void> {
    await expect(this.locators.weekHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectActionBlocked(
      this.page,
      this.locators.editButton,
      /^(Save changes|Save & continue)$/,
    );
  }

  // ── Working week ──

  async weekCount(): Promise<number> {
    await this.showTab('week');
    const text = await this.locators.weekHeading.innerText();
    return Number(text.match(/\((\d+)\)/)![1]);
  }

  async expectWeekCount(count: number): Promise<void> {
    await this.showTab('week');
    await expect(this.locators.weekHeading).toHaveText(
      new RegExp(`^Default working week \\(${count}\\)`),
      { timeout: WAIT.SERVER },
    );
  }

  async expectWeekColumns(): Promise<void> {
    await this.showTab('week');
    const headers = (await this.locators.weekTable.getByRole('columnheader').allInnerTexts())
      // Header text carries the sort indicator ("Weekday\n↑", "Active\n⇅").
      .map((h) => h.replace(/[↑↓⇅]/g, '').trim())
      .filter(Boolean);
    expect(headers).toEqual(['Weekday', 'Shift that runs', 'Standing overtime', 'Active']);
  }

  /** Weekday cells top to bottom. */
  async weekdays(): Promise<string[]> {
    await this.showTab('week');
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
    await this.showTab('week');
    const row = this.locators.weekRows(weekday, shift).first();
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    for (const text of Object.values(cells)) await expect(row).toContainText(text);
  }

  async expectNoWeekRow(weekday: Weekday, shift?: string): Promise<void> {
    await this.showTab('week');
    await expect(this.locators.weekRows(weekday, shift)).toHaveCount(0);
  }

  async expectWeekEmptyState(): Promise<void> {
    await this.showTab('week');
    await expect(this.locators.weekEmptyState).toBeVisible({ timeout: WAIT.SERVER });
  }

  async searchWeek(term: string): Promise<void> {
    await this.showTab('week');
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

  /** Lines are added on step 2 of Edit calendar: opens it there (if not already), Working week tab. */
  async openNewWeekLine(): Promise<void> {
    await this.openLinesStep();
    await this.showTab('week');
    await this.week.expectAddRow();
  }

  async openWeekLineEdit(weekday: Weekday, shift: string): Promise<void> {
    await this.openNewWeekLine();
    await this.locators
      .rowEditButton(this.locators.weekRows(weekday, shift).first(), 'working-week line')
      .click();
    await expect(this.week.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** Editing a line needs Edit calendar (the grid here is read-only). */
  async isWeekLineEditAvailable(weekday: Weekday, shift: string): Promise<boolean> {
    await this.showTab('week');
    await expect(this.locators.weekRows(weekday, shift).first()).toBeVisible({
      timeout: WAIT.SERVER,
    });
    return becomesUsable(this.locators.editButton);
  }

  /** Adding a line needs Edit calendar. Watched for WAIT.PERMISSION_SETTLE — see becomesUsable(). */
  async isNewWeekLineAvailable(): Promise<boolean> {
    await expect(this.locators.weekHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.editButton);
  }

  // ── Entries ──

  async expectEntryCount(count: number): Promise<void> {
    await this.showTab('entries');
    await expect(this.locators.entriesHeading).toHaveText(
      new RegExp(`^Calendar entries \\(${count}\\)`),
      { timeout: WAIT.SERVER },
    );
  }

  async expectEntryRow(why: string, cells: Record<string, string | RegExp> = {}): Promise<void> {
    await this.showTab('entries');
    const row = this.locators.entryRow(why);
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    for (const text of Object.values(cells)) await expect(row).toContainText(text);
  }

  async expectNoEntryRow(why: string): Promise<void> {
    await this.showTab('entries');
    await expect(this.locators.entryRow(why)).toHaveCount(0);
  }

  /** Entries are added on step 2 of Edit calendar: opens it there (if not already), Calendar entries tab. */
  async openNewEntry(): Promise<void> {
    await this.openLinesStep();
    await this.showTab('entries');
    await this.entries.expectAddRow();
  }

  async openEntryEdit(why: string): Promise<void> {
    await this.openNewEntry();
    await this.entries.startEdit(why);
  }

  /** Adding an entry needs Edit calendar. */
  async isNewEntryAvailable(): Promise<boolean> {
    await expect(this.locators.weekHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.editButton);
  }

  /** Editing an entry also needs Edit calendar. */
  async isEntryEditAvailable(why: string): Promise<boolean> {
    await this.showTab('entries');
    await expect(this.locators.entryRow(why)).toBeVisible({ timeout: WAIT.SERVER });
    return becomesUsable(this.locators.editButton);
  }

  /** The Day type pill's own colours (background + text) in one entry row. */
  async dayTypeColours(why: string, dayType: string): Promise<string> {
    await this.showTab('entries');
    const pill = this.locators.entryRow(why).getByText(dayType, { exact: true });
    await expect(pill).toBeVisible({ timeout: WAIT.SERVER });
    return pill.evaluate(paintedColours);
  }

  // ── Step 2 of Edit calendar ──

  /** Opens step 2 of Edit calendar from the detail page; a no-op when already there. */
  private async openLinesStep(): Promise<void> {
    if (await this.locators.stepTitle.isVisible()) return;
    await this.locators.editButton.click();
    await expect(this.page).toHaveURL(/\/calendars\/[^/]+\/edit$/, { timeout: WAIT.NAVIGATION });
    await this.locators.linesStep.click();
    await expect(this.locators.stepTitle).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** Selects a tab (detail page or step 2) unless it's already the one shown. */
  private async showTab(which: 'week' | 'entries'): Promise<void> {
    const tab = which === 'week' ? this.locators.weekTab : this.locators.entriesTab;
    await expect(tab).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  }

  /** The table a line / entry is being typed into: the one with a row open for editing, else the shown tab's. */
  private async activeTable(): Promise<InlineTable> {
    if ((await this.week.locators.editingRow.count()) > 0) return this.week;
    if ((await this.entries.locators.editingRow.count()) > 0) return this.entries;
    return (await this.locators.entriesTab.getAttribute('aria-selected')) === 'true'
      ? this.entries
      : this.week;
  }

  /** "New": step 2 with that table's add row; "Edit": a saved row open with Save / Cancel. */
  async expectFormOpen(
    kind: 'New' | 'Edit',
    what: 'working-week line' | 'calendar entry',
  ): Promise<void> {
    await expect(this.locators.stepTitle).toBeVisible({ timeout: WAIT.NAVIGATION });
    const table = what === 'working-week line' ? this.week : this.entries;
    if (kind === 'New') await table.expectAddRow();
    else await expect(table.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** A line's inputs (Active only on a saved line being edited); no start / end / time inputs. */
  async expectWeekLineFields(): Promise<void> {
    const row = await this.week.inputRow();
    const l = this.locators;
    for (const field of [l.weekday(row), l.shift(row), l.standingOvertime(row)])
      await expect(field).toBeVisible();
    if ((await this.week.locators.editingRow.count()) > 0)
      await expect(l.active(row)).toBeVisible();
    await expect(l.timeFields(row)).toHaveCount(0);
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
    const row = await this.week.inputRow();
    const l = this.locators;
    if (values.weekday) await this.pick(l.weekday(row), new RegExp(`^${values.weekday}$`));
    if (values.shift) await this.pick(l.shift(row), new RegExp(`^${values.shift} ·`));
    if (values.standingOvertime !== undefined)
      await this.setSwitch(l.standingOvertime(row), values.standingOvertime);
    if (values.active !== undefined) await this.setSwitch(l.active(row), values.active);
  }

  /** Day type options read "Holiday · no capacity" etc. since 2026-10-28 — matched on the type. */
  async fillEntry(values: EntryValues): Promise<void> {
    const row = await this.entries.inputRow();
    const l = this.locators;
    if (values.day !== undefined)
      await pickDayOfShownMonth(this.page, l.entryDate(row), values.day);
    if (values.dayType) await this.pick(l.dayType(row), new RegExp(`^${values.dayType}\\b`));
    if (values.why !== undefined) await l.why(row).fill(values.why);
  }

  async clearEntryDate(): Promise<void> {
    await dateClearButton(this.locators.entryDate(await this.entries.inputRow())).click();
  }

  async dayTypeOptions(): Promise<string[]> {
    return this.entries.optionsOf(this.locators.dayType(await this.entries.inputRow()));
  }

  /** "Add working-week line" on the add row. */
  async createWeekLine(): Promise<SubmitResult> {
    return this.week.add();
  }

  /** "Add calendar entry" on the add row. */
  async createEntry(): Promise<SubmitResult> {
    return this.entries.add();
  }

  /** Save on the line or entry being edited. */
  async saveChanges(): Promise<SubmitResult> {
    return (await this.activeTable()).save();
  }

  /**
   * Adds (line / entry) or saves the row being edited, expecting it refused
   * with `text`: as a toast, or — since the 2026-10-28 dev deploy — as an
   * alert in the row itself. The row stays open.
   */
  async submitExpectingToast(
    action: 'line' | 'entry' | 'save',
    text: string | RegExp,
  ): Promise<void> {
    const table =
      action === 'line' ? this.week : action === 'entry' ? this.entries : await this.activeTable();
    const button = action === 'save' ? table.locators.saveButton : table.locators.addButton;
    const row = action === 'save' ? table.locators.editingRow : table.locators.addRow;
    await expect(button).toBeEnabled();
    await button.click();
    await expect(
      toast(this.page, text)
        .or(alertsIn(row).filter({ hasText: text }))
        .first(),
    ).toBeVisible({ timeout: WAIT.SERVER });
    await expect(button).toBeVisible();
  }

  /**
   * A row being edited: its own Cancel. An add row: its "Clear" (✕) — the
   * step's Cancel and Done refuse to leave while an add row holds input.
   */
  async cancelForm(): Promise<void> {
    const table = await this.activeTable();
    if ((await table.locators.editingRow.count()) > 0) await table.cancelEdit();
    else await table.clearAddRow();
  }

  /** Done on step 2: leaves Edit calendar for the detail page (rows are already saved). */
  async finishEditing(): Promise<void> {
    await pressDone(this.locators.doneButton);
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async expectFormFieldFlagged(field: 'weekday' | 'shift'): Promise<void> {
    const row = await this.week.inputRow();
    const cell = this.locators.cellOf(row, this.locators[field](this.page));
    await expect(alertsIn(cell)).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /** The entry Date's own message ("Pick a date"). */
  async expectEntryDateFlagged(): Promise<void> {
    const row = await this.entries.inputRow();
    const cell = this.locators.cellOf(row, this.locators.entryDate(this.page));
    await expect(alertsIn(cell)).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async formNoticeText(): Promise<string> {
    return (await this.locators.formNotice.first().innerText()).trim();
  }

  async expectNoEmptyDayType(): Promise<void> {
    const options = await this.dayTypeOptions();
    expect(options.filter((o) => /^select/i.test(o) || o === '')).toEqual([]);
  }
}
