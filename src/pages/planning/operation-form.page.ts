import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperationFormLocators } from '../../locators/planning/operation-form.locators';
import { submitForm, type SubmitResult } from './form-submit';
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
 * New/Edit operation form on a recipe's detail page (rendered in place of
 * the Operations table, same URL). Owned by the Planning QA. Saving
 * recalculates the recipe's totals immediately.
 */
export class OperationFormPage extends BasePage {
  readonly locators: OperationFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new OperationFormLocators(page);
  }

  async expectOpenForCreate(): Promise<void> {
    await expect(this.locators.newOperationHeading).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.stepNumber).toHaveValue('');
    await expect(this.locators.createButton).toBeVisible();
  }

  async expectOpenForEdit(): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.cancelButton).toBeVisible();
    await expect(this.locators.operation).toBeEditable();
  }

  private async setSwitch(toggle: Locator, on: boolean): Promise<void> {
    if (((await toggle.getAttribute('aria-checked')) === 'true') !== on) await toggle.click();
  }

  async fill(values: OperationFieldValues): Promise<void> {
    const l = this.locators;
    if (values.step !== undefined) await l.stepNumber.fill(values.step);
    if (values.name !== undefined) await l.operation.fill(values.name);
    if (values.machineType !== undefined) {
      await l.machineType.click();
      await this.page.getByRole('option', { name: values.machineType, exact: true }).click();
    }
    if (values.standardMinutes !== undefined) await l.standardMinutes.fill(values.standardMinutes);
    if (values.cycleTime !== undefined) await l.cycleTime.fill(values.cycleTime);
    if (values.temperature !== undefined) await l.temperature.fill(values.temperature);
    if (values.difficultyGrade !== undefined)
      await this.selectDifficultyGrade(values.difficultyGrade);
    if (values.dryProcess !== undefined) await this.setSwitch(l.dryProcess, values.dryProcess);
  }

  async selectDifficultyGrade(option: string): Promise<void> {
    await this.locators.difficultyGrade.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  /** The Difficulty grade dropdown's options, in the order shown. */
  async difficultyGradeOptions(): Promise<string[]> {
    await this.locators.difficultyGrade.click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async machineTypeOptions(): Promise<string[]> {
    await this.locators.machineType.click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async gradeFactorValue(): Promise<string> {
    return this.locators.gradeFactor.inputValue();
  }

  async expectDryProcess(on: boolean): Promise<void> {
    await expect(this.locators.dryProcess).toHaveAttribute('aria-checked', String(on));
  }

  async expectValue(
    field: 'stepNumber' | 'operation' | 'cycleTime' | 'temperature' | 'standardMinutes',
    value: string,
  ): Promise<void> {
    await expect(this.locators[field]).toHaveValue(value);
  }

  async expectDryProcessDefaultNo(): Promise<void> {
    await expect(this.locators.dryProcess).toHaveAttribute('aria-checked', 'false');
  }

  async addChemical(name: string, dose: string): Promise<void> {
    await this.locators.addChemicalButton.click();
    await this.locators.chemical.fill(name);
    await this.locators.dose.fill(dose);
  }

  async setChemicalDose(dose: string): Promise<void> {
    await this.locators.dose.fill(dose);
  }

  async removeChemical(): Promise<void> {
    await this.locators.removeChemicalButton.click();
  }

  async expectChemicalRows(count: number): Promise<void> {
    await expect(this.locators.chemical).toHaveCount(count);
  }

  async addSetting(name: string, value: string): Promise<void> {
    await this.locators.addSettingButton.click();
    await this.locators.setting.fill(name);
    await this.locators.settingValue.fill(value);
  }

  async clear(field: 'stepNumber' | 'operation'): Promise<void> {
    await this.locators[field].fill('');
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveChangesButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectRequiredFlagged(): Promise<void> {
    await expect(this.locators.requiredMessage.first()).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /**
   * Submits and expects the "Step N is already used in this recipe" toast
   * (a 409 from the API). The toast is transient, so it's caught as it
   * appears rather than after a submit wait; the form stays open.
   */
  async submitExpectingStepTaken(action: 'create' | 'save'): Promise<void> {
    const button =
      action === 'create' ? this.locators.createButton : this.locators.saveChangesButton;
    await button.click();
    await expect(this.locators.stepTakenMessage.first()).toBeVisible({ timeout: WAIT.SERVER });
    await expect(button).toBeVisible();
  }

  /** Recipe totals are never inputs on the operation form either. */
  async expectNoRecipeTotalsInputs(): Promise<void> {
    await expect(
      this.page.getByRole('textbox', {
        name: /total duration|standard minutes \/|total standard/i,
      }),
    ).toHaveCount(0);
  }
}
