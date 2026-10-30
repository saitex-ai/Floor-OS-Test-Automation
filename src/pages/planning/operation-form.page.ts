import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperationFormLocators } from '../../locators/planning/operation-form.locators';
import { type SubmitResult } from './form-submit';
import { InlineTable } from './inline-table';
import { WAIT } from './waits';

export interface OperationFieldValues {
  step?: string;
  name?: string;
  machineType?: string;
  standardMinutes?: string;
  cycleTime?: string;
  temperature?: string;
  /** Option text of a Difficulty grade, e.g. "B — skilled". */
  difficultyGrade?: string;
  dryProcess?: boolean;
}

/**
 * A recipe operation's inputs, on step 2 of Edit recipe. Owned by the
 * Planning QA. Since the 2026-10-28 dev deploy there's no operation form of
 * its own: a new operation is typed into the "Operations (N)" table's add
 * row, a saved one edited in place (Save / Cancel on the row), and each row
 * saves on its own, recalculating the recipe's totals. Reach it with
 * RecipeDetailPage.openNewOperation() / openOperationForEdit().
 */
export class OperationFormPage extends BasePage {
  readonly locators: OperationFormLocators;
  readonly operations: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new OperationFormLocators(page);
    this.operations = new InlineTable(page, 'Operations', 'operation');
  }

  private async row(): Promise<Locator> {
    return this.operations.inputRow();
  }

  async expectOpenForCreate(): Promise<void> {
    await expect(this.locators.stepTitle).toBeVisible({ timeout: WAIT.SERVER });
    await this.operations.expectAddRow();
    await expect(this.locators.stepNumber(this.operations.locators.addRow)).toHaveValue('');
  }

  async expectOpenForEdit(): Promise<void> {
    await expect(this.operations.locators.saveButton).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.operations.locators.cancelButton).toBeVisible();
    await expect(this.locators.operation(this.operations.locators.editingRow)).toBeEditable();
  }

  private async setSwitch(toggle: Locator, on: boolean): Promise<void> {
    if (((await toggle.getAttribute('aria-checked')) === 'true') !== on) await toggle.click();
  }

  async fill(values: OperationFieldValues): Promise<void> {
    const row = await this.row();
    const l = this.locators;
    if (values.step !== undefined) await l.stepNumber(row).fill(values.step);
    if (values.name !== undefined) await l.operation(row).fill(values.name);
    if (values.machineType !== undefined) {
      await l.machineType(row).click();
      await l.option(values.machineType).click();
    }
    if (values.standardMinutes !== undefined)
      await l.standardMinutes(row).fill(values.standardMinutes);
    if (values.cycleTime !== undefined) await l.cycleTime(row).fill(values.cycleTime);
    if (values.temperature !== undefined) await l.temperature(row).fill(values.temperature);
    if (values.difficultyGrade !== undefined)
      await this.selectDifficultyGrade(values.difficultyGrade);
    if (values.dryProcess !== undefined) await this.setSwitch(l.dryProcess(row), values.dryProcess);
  }

  async selectDifficultyGrade(option: string): Promise<void> {
    await this.locators.difficultyGrade(await this.row()).click();
    await this.locators.option(option).click();
  }

  /** The Difficulty grade dropdown's options, in the order shown. */
  async difficultyGradeOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.difficultyGrade(await this.row()));
  }

  async machineTypeOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.machineType(await this.row()));
  }

  private async optionsOf(combo: Locator): Promise<string[]> {
    return this.operations.optionsOf(combo);
  }

  async gradeFactorValue(): Promise<string> {
    return this.locators.gradeFactor(await this.row()).inputValue();
  }

  async expectDryProcess(on: boolean): Promise<void> {
    await expect(this.locators.dryProcess(await this.row())).toHaveAttribute(
      'aria-checked',
      String(on),
    );
  }

  async expectValue(
    field: 'stepNumber' | 'operation' | 'cycleTime' | 'temperature' | 'standardMinutes',
    value: string,
  ): Promise<void> {
    await expect(this.locators[field](await this.row())).toHaveValue(value);
  }

  async expectDryProcessDefaultNo(): Promise<void> {
    await this.expectDryProcess(false);
  }

  async addChemical(name: string, dose: string): Promise<void> {
    const row = await this.row();
    await this.locators.addChemicalButton(row).click();
    await this.locators.chemical(row).fill(name);
    await this.locators.dose(row).fill(dose);
  }

  async setChemicalDose(dose: string): Promise<void> {
    await this.locators.dose(await this.row()).fill(dose);
  }

  async removeChemical(): Promise<void> {
    await this.locators.removeChemicalButton(await this.row()).click();
  }

  async expectChemicalRows(count: number): Promise<void> {
    await expect(this.locators.chemical(await this.row())).toHaveCount(count);
  }

  async addSetting(name: string, value: string): Promise<void> {
    const row = await this.row();
    await this.locators.addSettingButton(row).click();
    await this.locators.setting(row).fill(name);
    await this.locators.settingValue(row).fill(value);
  }

  async clear(field: 'stepNumber' | 'operation'): Promise<void> {
    await this.locators[field](await this.row()).fill('');
  }

  /** "Add operation" on the add row. */
  async create(): Promise<SubmitResult> {
    return this.operations.add();
  }

  /** Save on the row being edited. */
  async saveChanges(): Promise<SubmitResult> {
    return this.operations.save();
  }

  /**
   * A row being edited: its own Cancel. The add row: its "Clear" (✕) — the
   * step's Cancel and Done refuse to leave while the add row holds input.
   */
  async cancel(): Promise<void> {
    if ((await this.operations.locators.editingRow.count()) > 0) await this.operations.cancelEdit();
    else await this.operations.clearAddRow();
  }

  async expectRequiredFlagged(): Promise<void> {
    await expect(this.locators.requiredMessage(await this.row()).first()).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  /**
   * Submits and expects the "Step N is already used in this recipe" message
   * (a 409 from the API). It's transient, so it's caught as it appears
   * rather than after a submit wait; the row stays open.
   */
  async submitExpectingStepTaken(action: 'create' | 'save'): Promise<void> {
    const button =
      action === 'create'
        ? this.operations.locators.addButton
        : this.operations.locators.saveButton;
    await button.click();
    await expect(this.locators.stepTakenMessage.first()).toBeVisible({ timeout: WAIT.SERVER });
    await expect(button).toBeVisible();
  }

  /** Recipe totals are never inputs on the operation row either. */
  async expectNoRecipeTotalsInputs(): Promise<void> {
    await expect(
      this.page.getByRole('textbox', {
        name: /total duration|standard minutes \/|total standard/i,
      }),
    ).toHaveCount(0);
  }
}
