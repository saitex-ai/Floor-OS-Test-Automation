import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { alertsIn, dateClearButton } from '../../locators/planning/form-field.locators';
import { MaintenanceWindowFormLocators } from '../../locators/planning/maintenance-window-form.locators';
import { pickTodayAt } from './date-picker';
import { type SubmitResult } from './form-submit';
import { InlineTable } from './inline-table';
import { WAIT } from './waits';

export interface WindowValues {
  kind?: 'Planned' | 'Unplanned';
  /** Today at "hh:mm". */
  start?: string;
  /** Today at "hh:mm"; omit to leave the window open. */
  end?: string;
  why?: string;
  /** The "Active" switch — the window's soft-delete flag (a saved row only). */
  active?: boolean;
}

/**
 * A maintenance window's inputs, on step 2 of Edit machine. Owned by the
 * Planning QA. Since the 2026-10-28 dev deploy there's no window form of
 * its own: a new window is typed into the "Maintenance windows (N)" table's
 * add row, a saved one edited in place (Save / Cancel on the row), and each
 * row saves on its own. Kind and Window start are required; a blank Window
 * end is a stoppage that is still open. Reach it with
 * MachineDetailPage.openNewWindow() / openWindowEdit().
 */
export class MaintenanceWindowFormPage extends BasePage {
  readonly locators: MaintenanceWindowFormLocators;
  readonly windows: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new MaintenanceWindowFormLocators(page);
    this.windows = new InlineTable(page, 'Maintenance windows', 'maintenance window');
  }

  /** On the machine's own Edit machine, step 2, with the add row ready. */
  async expectOpenForCreate(): Promise<void> {
    await expect(this.locators.stepTitle).toBeVisible({ timeout: WAIT.NAVIGATION });
    await this.windows.expectAddRow();
  }

  async expectOpenForEdit(): Promise<void> {
    await expect(this.windows.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.windows.locators.saveButton).toBeVisible();
    await expect(this.windows.locators.cancelButton).toBeVisible();
  }

  /** The add row's inputs; Anomaly is a column (a picker once the machine has anomalies); no Machine picker. */
  async expectFields(): Promise<void> {
    const row = this.windows.locators.addRow;
    await expect(this.locators.kind(row)).toBeVisible();
    await expect(this.locators.windowStart(row)).toBeVisible();
    await expect(this.locators.windowEnd(row)).toBeVisible();
    await expect(this.locators.why(row)).toBeVisible();
    await expect(this.locators.anomalyColumn).toBeVisible();
    await expect(this.locators.machinePicker(row)).toHaveCount(0);
  }

  async kindOptions(): Promise<string[]> {
    return this.windows.optionsOf(this.locators.kind(await this.windows.inputRow()));
  }

  async fill(values: WindowValues): Promise<void> {
    const row = await this.windows.inputRow();
    const l = this.locators;
    if (values.kind) {
      await l.kind(row).click();
      await l.option(values.kind).click();
    }
    if (values.start) await pickTodayAt(this.page, l.windowStart(row), ...hhmm(values.start));
    if (values.end) await pickTodayAt(this.page, l.windowEnd(row), ...hhmm(values.end));
    if (values.why !== undefined) await l.why(row).fill(values.why);
    if (values.active !== undefined && (await l.active(row).isChecked()) !== values.active)
      await l.active(row).click();
  }

  async clearWindowStart(): Promise<void> {
    const start = this.locators.windowStart(await this.windows.inputRow());
    await dateClearButton(start).click();
  }

  /** "Add maintenance window" on the add row. */
  async create(): Promise<SubmitResult> {
    return this.windows.add();
  }

  /** Save on the row being edited. */
  async saveChanges(): Promise<SubmitResult> {
    return this.windows.save();
  }

  /**
   * A row being edited: its own Cancel. The add row: its "Clear" (✕) — the
   * step's Cancel and Done refuse to leave while the add row holds input.
   */
  async cancel(): Promise<void> {
    if ((await this.windows.locators.editingRow.count()) > 0) await this.windows.cancelEdit();
    else await this.windows.clearAddRow();
  }

  async expectRequiredCount(count: number): Promise<void> {
    await expect(await this.windows.requiredMessages()).toHaveCount(count, {
      timeout: WAIT.VALIDATION,
    });
  }

  async expectFieldFlagged(field: 'kind' | 'windowStart'): Promise<void> {
    const row = await this.windows.inputRow();
    const cell = this.locators.cellOf(row, this.locators[field](this.page));
    await expect(alertsIn(cell)).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /** Kind is a select with no empty choice — it can't be cleared on edit. */
  async expectKindHasNoEmptyChoice(): Promise<void> {
    expect(await this.kindOptions()).toEqual(['Planned', 'Unplanned']);
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toContainText(text);
  }

  async whyValue(): Promise<string> {
    return this.locators.why(await this.windows.inputRow()).inputValue();
  }
}

function hhmm(time: string): [string, string] {
  const [hh = '00', mm = '00'] = time.split(':');
  return [hh, mm];
}
