import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { alertsIn } from '../../locators/planning/form-field.locators';
import { AllowanceFormLocators } from '../../locators/planning/allowance-form.locators';
import { type SubmitResult } from './form-submit';
import { InlineTable } from './inline-table';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { WAIT } from './waits';

/**
 * An allowance's inputs, on step 2 of Edit operation (Allowances tab).
 * Owned by the Planning QA. Since the 2026-10-28 dev deploy there's no
 * allowance form of its own: a new allowance is typed into the "Allowances
 * (N)" table's add row, a saved one edited in place (Save / Cancel on the
 * row), and each row saves on its own. One row per type, so a type already
 * on the operation is not offered again, and the type is fixed once saved.
 * A percentage that differs from the type default turns "Override" on,
 * which makes "Why the default was not used" required. Reach it with
 * OperationDetailPage.openNewAllowance() / openAllowanceEdit().
 */
export class AllowanceFormPage extends BasePage {
  readonly locators: AllowanceFormLocators;
  readonly allowances: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new AllowanceFormLocators(page);
    this.allowances = new InlineTable(
      page,
      'Allowances',
      'allowance',
      this.locators.allowancesPanel,
    );
  }

  /** On the operation's own Edit operation, step 2, with the add row ready. */
  async expectOpenForCreate(): Promise<void> {
    await expect(this.locators.stepTitle).toBeVisible({ timeout: WAIT.NAVIGATION });
    await this.allowances.expectAddRow();
  }

  async expectOpenForEdit(): Promise<void> {
    await expect(this.allowances.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.allowances.locators.saveButton).toBeVisible();
    await expect(this.allowances.locators.cancelButton).toBeVisible();
  }

  /** Type / Percentage / Override, and no Operation picker ("Why …" only shows once Override is on). */
  async expectFields(): Promise<void> {
    const row = await this.allowances.inputRow();
    await expect(this.locators.type(row)).toBeVisible();
    await expect(this.locators.percentage(row)).toBeVisible();
    await expect(this.locators.differs(row)).toBeVisible();
    await expect(this.locators.operationPicker(row)).toHaveCount(0);
  }

  async setDiffers(on: boolean): Promise<void> {
    const differs = this.locators.differs(await this.allowances.inputRow());
    if ((await differs.isChecked()) !== on) await differs.click();
    await this.expectDiffers(on);
  }

  async expectWhyShown(): Promise<void> {
    await expect(this.locators.why(await this.allowances.inputRow())).toBeVisible();
  }

  async typeOptions(): Promise<string[]> {
    return this.allowances.optionsOf(this.locators.type(await this.allowances.inputRow()));
  }

  /** Picks a type by its name ("Human motion fatigue"), ignoring any " · default N%" suffix. */
  async pickType(type: string): Promise<void> {
    await this.locators.type(await this.allowances.inputRow()).click();
    await this.locators.option(new RegExp(`^${type}( ·|$)`)).click();
  }

  async setPercentage(value: string): Promise<void> {
    await this.locators.percentage(await this.allowances.inputRow()).fill(value);
  }

  async percentageValue(): Promise<string> {
    return this.locators.percentage(await this.allowances.inputRow()).inputValue();
  }

  async expectDiffers(on: boolean): Promise<void> {
    await expect(this.locators.differs(await this.allowances.inputRow())).toBeChecked({
      checked: on,
    });
  }

  async fillWhy(text: string): Promise<void> {
    await this.locators.why(await this.allowances.inputRow()).fill(text);
  }

  /** "Add allowance" on the add row. */
  async create(): Promise<SubmitResult> {
    return this.allowances.add();
  }

  /** Save on the row being edited. */
  async saveChanges(): Promise<SubmitResult> {
    return this.allowances.save();
  }

  /**
   * A row being edited: its own Cancel. The add row: its "Clear" (✕) — the
   * step's Cancel and Done refuse to leave while the add row holds input.
   */
  async cancel(): Promise<void> {
    if ((await this.allowances.locators.editingRow.count()) > 0) await this.allowances.cancelEdit();
    else await this.allowances.clearAddRow();
  }

  async expectFieldFlagged(field: 'type' | 'percentage' | 'why'): Promise<void> {
    const row = await this.allowances.inputRow();
    const cell = this.locators.cellOf(row, this.locators[field](this.page));
    await expect(alertsIn(cell)).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /** A saved row's type can't change: no type picker on the row, or a disabled one. */
  async expectTypeLocked(): Promise<void> {
    await expectAbsentOrDisabled(this.locators.type(this.allowances.locators.editingRow));
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }
}
