import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { RecipeFormLocators } from '../../locators/planning/recipe-form.locators';
import { submitForm, type SubmitResult } from './form-submit';
import { WAIT } from './waits';

export interface RecipeFieldValues {
  code?: string;
  name?: string;
  recipeType?: string;
  department?: string;
  /** Typed into "Fills activity"; the first matching option is picked. */
  fillsActivity?: string;
  batchSize?: string;
  batchUnit?: string;
  source?: string;
  maturity?: string;
  shrinkageVariance?: string;
  shadeFailRate?: string;
  labTurnaround?: string;
}

/**
 * "New recipe" / edit-recipe form. Owned by the Planning QA. Every select
 * is a combobox (click, then the option); "Fills activity" is searched
 * by typing. Batch size/unit show for every recipe type but are only
 * required for Wash. A new recipe is created as draft v1.
 */
export class RecipeFormPage extends BasePage {
  readonly locators: RecipeFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new RecipeFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.newRecipeHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.page).toHaveURL(/\/planning\/master-data\/recipes\/new$/);
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/recipes\/[\w-]+\/edit$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** New form since the 2026-10-16 deploy: the code can't be typed, dev assigns it on save. */
  async expectCodeGenerated(): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.code).toHaveAttribute('placeholder', 'Auto-generated');
    await expect(this.locators.codeGeneratedHelp).toBeVisible();
  }

  async expectCodeLocked(): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.codeLockedHelp).toBeVisible();
  }

  async expectBackOnList(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/recipes$/, {
      timeout: WAIT.SERVER,
    });
  }

  private async select(field: Locator, option: string): Promise<void> {
    await field.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async selectFillsActivity(term: string): Promise<void> {
    await this.locators.fillsActivity.click();
    await this.page.keyboard.type(term);
    await this.page
      .getByRole('option', { name: new RegExp(`^${term}`) })
      .first()
      .click();
  }

  /** The options "Fills activity" offers after typing `term`. */
  async fillsActivityOptions(term: string): Promise<string[]> {
    await this.locators.fillsActivity.click();
    await this.page.keyboard.type(term);
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const options = await this.page.getByRole('option').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return options;
  }

  async departmentOptions(): Promise<string[]> {
    await this.locators.owningDepartment.click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const options = await this.page.getByRole('option').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return options;
  }

  async fill(values: RecipeFieldValues): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.code.fill(values.code);
    if (values.name !== undefined) await l.name.fill(values.name);
    if (values.recipeType !== undefined) await this.select(l.recipeType, values.recipeType);
    if (values.department !== undefined) await this.select(l.owningDepartment, values.department);
    if (values.fillsActivity !== undefined) await this.selectFillsActivity(values.fillsActivity);
    if (values.batchSize !== undefined) await l.batchSize.fill(values.batchSize);
    if (values.batchUnit !== undefined) await this.select(l.batchUnit, values.batchUnit);
    if (values.source !== undefined) await this.select(l.source, values.source);
    if (values.maturity !== undefined) await this.select(l.maturity, values.maturity);
    if (values.shrinkageVariance !== undefined)
      await l.shrinkageVariance.fill(values.shrinkageVariance);
    if (values.shadeFailRate !== undefined) await l.shadeFailRate.fill(values.shadeFailRate);
    if (values.labTurnaround !== undefined) await l.labTurnaround.fill(values.labTurnaround);
  }

  /** Every required field with a valid default ("Other" type, so no batch fields); `overrides` win. */
  async fillAllRequired(name: string, overrides: RecipeFieldValues = {}): Promise<void> {
    await this.fill({
      name,
      recipeType: 'Other',
      department: 'Cutting',
      fillsActivity: 'CUT-BULK',
      source: 'Entered by hand',
      maturity: 'Estimated',
      ...overrides,
    });
  }

  async addSystemLink(system: string, identifier: string): Promise<void> {
    await this.locators.addSystemLinkButton.click();
    await this.locators.systemInput.fill(system);
    await this.locators.identifierInput.fill(identifier);
  }

  async removeLastSystemLink(): Promise<void> {
    await this.locators.removeLinkButton.last().click();
  }

  async expectSystemLinksSection(): Promise<void> {
    await expect(this.locators.addSystemLinkButton).toBeVisible();
  }

  async expectRiskFieldsPresentedAsBuffers(): Promise<void> {
    await expect(this.locators.shrinkageVariance).toBeVisible();
    await expect(this.locators.shadeFailRate).toBeVisible();
    await expect(this.locators.labTurnaround).toBeVisible();
    await expect(this.locators.risksHelp).toBeVisible();
  }

  /** "Total duration" / "Standard minutes" are never inputs on the recipe form. */
  async expectNoTotalsInputs(): Promise<void> {
    await expect(
      this.page.getByRole('textbox', {
        name: /total duration|standard minutes|computed|total sam/i,
      }),
    ).toHaveCount(0);
    await expect(
      this.page.getByRole('spinbutton', { name: /total duration|standard minutes/i }),
    ).toHaveCount(0);
  }

  async expectBatchFieldsVisible(): Promise<void> {
    await expect(this.locators.batchSize).toBeVisible();
    await expect(this.locators.batchUnit).toBeVisible();
  }

  async expectMaturityIsDropdown(): Promise<void> {
    await expect(this.locators.maturity).toBeEnabled();
  }

  async expectSourceIsDropdown(): Promise<void> {
    await expect(this.locators.source).toBeEnabled();
  }

  async expectNameValue(name: string): Promise<void> {
    await expect(this.locators.name).toHaveValue(name);
  }

  async expectValue(
    field: 'name' | 'batchSize' | 'shrinkageVariance' | 'shadeFailRate' | 'labTurnaround',
    value: string,
  ): Promise<void> {
    await expect(this.locators[field]).toHaveValue(value);
  }

  async optionsOf(field: 'recipeType' | 'source' | 'maturity' | 'batchUnit'): Promise<string[]> {
    await this.locators[field].click();
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
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

  /** Each of `count` required fields shows its own "Required" alert. */
  async expectRequiredFlagged(count = 1): Promise<void> {
    await expect(this.locators.requiredMessage.first()).toBeVisible({ timeout: WAIT.VALIDATION });
    expect(await this.locators.requiredMessage.count()).toBeGreaterThanOrEqual(count);
  }

  async expectWashBatchRequired(): Promise<void> {
    await expect(this.locators.washBatchRequiredMessage.first()).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  async expectCodeTaken(): Promise<void> {
    await expect(this.locators.codeTakenMessage.first()).toBeVisible({ timeout: WAIT.SERVER });
  }
}
