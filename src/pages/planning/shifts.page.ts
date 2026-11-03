import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MasterDataListPage, becomesUsable, expectActionBlocked } from './master-data-list.page';
import { ShiftsLocators } from '../../locators/planning/shifts.locators';
import { alertsIn, detailValue, fieldAlert } from '../../locators/planning/form-field.locators';
import { pickTime } from './date-picker';
import { type SubmitResult, pressDone, submitExpectingToast, submitStepped } from './form-submit';
import { InlineTable } from './inline-table';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

/** Planning > Master Data > Shifts & breaks list. Tabs: All / Standard / Overtime / Night. */

/** The breaks card's columns, in order (keys for expectBreakRow). */
const BREAK_COLUMNS = ['break', 'starts', 'ends', 'length', 'paid', 'active'] as const;
export class ShiftsListPage extends MasterDataListPage {
  readonly locators: ShiftsLocators;
  protected readonly route = '/planning/master-data/shifts';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new ShiftsLocators(page);
    this.heading = this.locators.listHeading;
    this.newButton = this.locators.newShiftButton;
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** One shift row's cells, keyed by column header. */
  async valueRowOf(code: string): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const column of ['Name', 'Shift kind', 'Starts', 'Ends', 'Order in day', 'Active'])
      out[column] = await this.cellValue(code, column);
    return out;
  }
}

export interface ShiftValues {
  code?: string;
  name?: string;
  /** "Standard" / "Overtime" / "Night" or a QA kind's label. */
  kind?: string;
  /** "hh:mm" (minutes in 5-minute steps). */
  starts?: string;
  ends?: string;
  crossesMidnight?: boolean;
  orderInDay?: string;
  active?: boolean;
}

export interface BreakValues {
  name?: string;
  starts?: string;
  ends?: string;
  fallsAfterMidnight?: boolean;
  paid?: boolean;
  active?: boolean;
}

async function setSwitch(sw: Locator, on: boolean): Promise<void> {
  if ((await sw.isChecked()) !== on) await sw.click();
  await expect(sw).toBeChecked({ checked: on });
}

async function pickTimes(
  page: Page,
  l: ShiftsLocators,
  starts?: string,
  ends?: string,
): Promise<void> {
  for (const [trigger, time] of [
    [l.starts, starts],
    [l.ends, ends],
  ] as const) {
    if (!time) continue;
    const [hh = '00', mm = '00'] = time.split(':');
    await pickTime(page, trigger, hh, mm);
  }
}

/**
 * The shift create / edit form (/shifts/new, /shifts/<CODE>/edit). Owned by
 * the Planning QA. Gross minutes is derived and disabled; Paid minutes isn't
 * on the form (it shows on the detail page once saved). Create and edit are
 * two steps since the 2026-10-28 dev deploy: step 1's "Save & continue"
 * saves, step 2 holds the breaks (see ShiftDetailPage), and Done opens the
 * detail page.
 */
export class ShiftFormPage extends BasePage {
  readonly locators: ShiftsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ShiftsLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/shifts/new');
    await ensureRoute(this.page, '/planning/master-data/shifts/new');
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async openEdit(code: string): Promise<void> {
    const path = `/planning/master-data/shifts/${code}/edit`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
    await this.expectOnEditPage();
  }

  async expectDedicatedCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/shifts\/new$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.page.getByRole('dialog')).toHaveCount(0);
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/shifts\/[^/]+\/edit$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.saveButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectFields(): Promise<void> {
    const l = this.locators;
    for (const field of [
      l.code,
      l.name,
      l.shiftKind,
      l.starts,
      l.ends,
      l.crossesMidnight,
      l.grossMinutes,
      l.orderInDay,
      l.active,
    ])
      await expect(field).toBeVisible();
  }

  async fill(values: ShiftValues): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.code.fill(values.code);
    if (values.name !== undefined) await l.name.fill(values.name);
    if (values.kind) {
      await l.shiftKind.click();
      await l
        .option(new RegExp(`^${values.kind}$`))
        .first()
        .click();
    }
    await pickTimes(this.page, l, values.starts, values.ends);
    if (values.crossesMidnight !== undefined)
      await setSwitch(l.crossesMidnight, values.crossesMidnight);
    if (values.orderInDay !== undefined) await l.orderInDay.fill(values.orderInDay);
    if (values.active !== undefined) await setSwitch(l.active, values.active);
  }

  async grossValue(): Promise<string> {
    return this.locators.grossMinutes.inputValue();
  }

  /** Gross is derived (disabled) and Paid isn't on the form at all. */
  async expectDerivedMinutesNotTypeable(): Promise<void> {
    await expect(this.locators.grossMinutes).toBeDisabled();
    await expect(this.locators.paidMinutesInput).toHaveCount(0);
  }

  async expectCrossesMidnight(on: boolean): Promise<void> {
    await expect(this.locators.crossesMidnight).toBeChecked({ checked: on });
  }

  /** Step 1's "Save & continue", then Done on Breaks — see submitStepped(). */
  async create(): Promise<SubmitResult> {
    return submitStepped(this.locators.createButton, this.locators.doneButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitStepped(this.locators.saveButton, this.locators.doneButton);
  }

  async createExpectingToast(text: string | RegExp): Promise<void> {
    await submitExpectingToast(this.locators.createButton, text);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectFieldFlagged(
    field: 'code' | 'name' | 'shiftKind' | 'starts' | 'ends',
  ): Promise<void> {
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /** The create form's code: locked, "Auto-generated", assigned on save (dev deploy 2026-10-16). */
  async expectCodeGenerated(): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.code).toHaveAttribute('placeholder', 'Auto-generated');
    await expect(this.locators.codeGeneratedHelp).toBeVisible();
  }

  async expectCodeLocked(code: string): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.code).toHaveValue(code);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }
}

/**
 * A shift's detail page (/shifts/<CODE>) and its break form. Owned by the
 * Planning QA. The summary shows Shift kind / Starts / Ends / Order in day /
 * Gross minutes ("540 (9h 00m)") / Paid minutes ("510 (8h 30m)") / Active,
 * and a read-only Breaks grid. Since the 2026-10-28 dev deploy breaks are
 * added and edited on step 2 of Edit shift, as rows of an inline table
 * (each saves on its own, see InlineTable) — the break methods here work
 * there. A break's Length is derived.
 */
export class ShiftDetailPage extends BasePage {
  readonly locators: ShiftsLocators;
  readonly breaks: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new ShiftsLocators(page);
    this.breaks = new InlineTable(page, 'Breaks', 'break');
  }

  async open(code: string): Promise<void> {
    const path = `/planning/master-data/shifts/${code}`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
    await this.expectLoaded(code);
  }

  async openExpectingRestricted(code: string): Promise<void> {
    const path = `/planning/master-data/shifts/${code}`;
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
    await expect(this.locators.breaksHeading).toHaveCount(0);
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/shifts/${code}$`), { timeout: WAIT.NAVIGATION });
    await expect(this.locators.breaksHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.allShiftsLink).toBeVisible();
  }

  async expectReadOnlyView(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible();
    await expect(this.locators.code).toHaveCount(0);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
  }

  async expectEditBlocked(): Promise<void> {
    await expect(this.locators.breaksHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectActionBlocked(
      this.page,
      this.locators.editButton,
      /^(Save changes|Save & continue)$/,
    );
  }

  async expectValue(label: string, value: string | RegExp): Promise<void> {
    await expect(detailValue(this.page, label)).toHaveText(value, { timeout: WAIT.SERVER });
  }

  async expectBreakCount(count: number): Promise<void> {
    await expect(this.locators.breaksHeading).toHaveText(new RegExp(`^Breaks \\(${count}\\)`), {
      timeout: WAIT.SERVER,
    });
  }

  async expectBreakColumns(): Promise<void> {
    const headers = (await this.locators.breaksTable.getByRole('columnheader').allInnerTexts())
      .map((h) => h.replace(/[↑↓⇅]/g, '').trim())
      .filter(Boolean);
    expect(headers).toEqual(['Break', 'Starts', 'Ends', 'Length', 'Paid', 'Active']);
  }

  /** Checks each given value in its own cell — the row's text runs the cells together ("12:3030"). */
  async expectBreakRow(
    name: string,
    cells: Partial<Record<(typeof BREAK_COLUMNS)[number], string | RegExp>> = {},
  ): Promise<void> {
    const row = this.locators.breakRow(name);
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    for (const [column, text] of Object.entries(cells))
      await expect(
        row.getByRole('cell').nth(BREAK_COLUMNS.indexOf(column as (typeof BREAK_COLUMNS)[number])),
        column,
      ).toContainText(text);
  }

  async expectNoBreakRow(name: string): Promise<void> {
    await expect(this.locators.breakRow(name)).toHaveCount(0);
  }

  async breakNames(): Promise<string[]> {
    const names: string[] = [];
    for (const row of await this.locators.breakRows().all())
      names.push((await row.getByRole('cell').first().innerText()).trim());
    return names;
  }

  async searchBreaks(term: string): Promise<void> {
    await this.locators.breaksSearch.fill(term);
  }

  /** Breaks are added on step 2 of Edit shift: opens it there (if not already), with the add row ready. */
  async openNewBreak(): Promise<void> {
    if (!(await this.breaks.locators.addButton.isVisible())) {
      await this.locators.editButton.click();
      await expect(this.page).toHaveURL(/\/shifts\/[^/]+\/edit$/, { timeout: WAIT.NAVIGATION });
      await this.locators.breaksStep.click();
    }
    await this.breaks.expectAddRow();
  }

  /** Opens step 2 of Edit shift and the row's "Edit break". */
  async openBreakEdit(name: string): Promise<void> {
    await this.openNewBreak();
    await this.breaks.startEdit(name);
  }

  /** Adding a break needs Edit shift. Watched for WAIT.PERMISSION_SETTLE — see becomesUsable(). */
  async isNewBreakAvailable(): Promise<boolean> {
    await expect(this.locators.breaksHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.editButton);
  }

  /** Editing a break also needs Edit shift (the grid here is read-only). */
  async isBreakEditAvailable(name: string): Promise<boolean> {
    await expect(this.locators.breakRow(name)).toBeVisible({ timeout: WAIT.SERVER });
    return becomesUsable(this.locators.editButton);
  }

  /** "New": step 2 of Edit shift with the add row; "Edit": a saved row open with Save / Cancel. */
  async expectBreakFormOpen(kind: 'New' | 'Edit'): Promise<void> {
    await expect(this.locators.breaksStepTitle).toBeVisible({ timeout: WAIT.NAVIGATION });
    if (kind === 'New') await this.breaks.expectAddRow();
    else await expect(this.breaks.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** The row's inputs; Length is derived text, never an input. */
  async expectBreakFields(): Promise<void> {
    const row = await this.breaks.inputRow();
    const l = this.locators;
    for (const field of [
      l.breakName(row),
      l.breakTime(row, 'Starts'),
      l.breakTime(row, 'Ends'),
      l.fallsAfterMidnight(row),
      l.paid(row),
    ])
      await expect(field).toBeVisible();
    await expect(l.lengthInput(row)).toHaveCount(0);
  }

  async fillBreak(values: BreakValues): Promise<void> {
    const row = await this.breaks.inputRow();
    const l = this.locators;
    if (values.name !== undefined) await l.breakName(row).fill(values.name);
    for (const [which, time] of [
      ['Starts', values.starts],
      ['Ends', values.ends],
    ] as const) {
      if (!time) continue;
      const [hh = '00', mm = '00'] = time.split(':');
      await pickTime(this.page, l.breakTime(row, which), hh, mm);
    }
    if (values.fallsAfterMidnight !== undefined)
      await setSwitch(l.fallsAfterMidnight(row), values.fallsAfterMidnight);
    if (values.paid !== undefined) await setSwitch(l.paid(row), values.paid);
    if (values.active !== undefined) await setSwitch(l.breakActive(row), values.active);
  }

  /** The derived Length the row shows for its times. */
  async lengthValue(): Promise<string> {
    return (await this.locators.lengthCell(await this.breaks.inputRow()).innerText()).trim();
  }

  /** "Add break" on the add row. */
  async createBreak(): Promise<SubmitResult> {
    return this.breaks.add();
  }

  /** Save on the row being edited. */
  async saveBreak(): Promise<SubmitResult> {
    return this.breaks.save();
  }

  /**
   * A row being edited: its own Cancel. The add row: its "Clear" (✕) — the
   * step's Cancel and Done refuse to leave while the add row holds input.
   */
  async cancelBreak(): Promise<void> {
    if ((await this.breaks.locators.editingRow.count()) > 0) await this.breaks.cancelEdit();
    else await this.breaks.clearAddRow();
  }

  /** Done on step 2: leaves Edit shift for the detail page (rows are already saved). */
  async finishEditing(): Promise<void> {
    await pressDone(this.locators.doneButton);
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async expectBreakFieldFlagged(field: 'breakName' | 'starts' | 'ends'): Promise<void> {
    await expect(alertsIn(this.breakCell(await this.breaks.inputRow(), field))).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  /** The message in the Break (name) cell (e.g. a duplicate name in this shift). */
  async expectBreakNameError(text: string | RegExp): Promise<void> {
    const cell = this.breakCell(await this.breaks.inputRow(), 'breakName');
    await expect(alertsIn(cell)).toHaveText(text, { timeout: WAIT.SERVER });
  }

  private breakCell(row: Locator, field: 'breakName' | 'starts' | 'ends'): Locator {
    const l = this.locators;
    const control =
      field === 'breakName'
        ? l.breakName(this.page)
        : l.breakTime(this.page, field === 'starts' ? 'Starts' : 'Ends');
    return l.cellOf(row, control);
  }
}
