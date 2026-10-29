import { type Locator, type Page } from '@playwright/test';
import { fieldHelp } from './form-field.locators';

/**
 * Raw element locators for the "New recipe" / edit-recipe form (same
 * field set either way; edit is /recipes/<id>/edit and only a draft
 * version can be edited). No actions or assertions here, see
 * src/pages/planning/recipe-form.page.ts for those.
 */
export class RecipeFormLocators {
  readonly newRecipeHeading: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly doneButton: Locator;
  readonly cancelButton: Locator;

  readonly code: Locator;
  /** New form, since the 2026-10-16 deploy: the code is generated on save. */
  readonly codeGeneratedHelp: Locator;
  readonly codeLockedHelp: Locator;
  readonly name: Locator;
  readonly recipeType: Locator;
  readonly owningDepartment: Locator;
  readonly fillsActivity: Locator;
  readonly batchSize: Locator;
  readonly batchUnit: Locator;
  readonly source: Locator;
  readonly maturity: Locator;
  readonly shrinkageVariance: Locator;
  readonly shadeFailRate: Locator;
  readonly labTurnaround: Locator;
  readonly risksHelp: Locator;
  readonly addSystemLinkButton: Locator;
  readonly systemInput: Locator;
  readonly identifierInput: Locator;
  readonly removeLinkButton: Locator;

  readonly requiredMessage: Locator;
  readonly washBatchRequiredMessage: Locator;
  readonly codeTakenMessage: Locator;

  constructor(private readonly page: Page) {
    this.newRecipeHeading = page.getByRole('heading', { name: 'New recipe' });
    // Since the 2026-10-28 dev deploy create and edit are two steps: step 1's
    // "Save & continue" saves the recipe and opens Operations, whose "Done"
    // opens the detail page.
    this.createButton = page.getByRole('button', { name: 'Save & continue' });
    this.saveChangesButton = this.createButton;
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.code = this.textbox('Code');
    this.codeGeneratedHelp = fieldHelp(page, /Assigned automatically when the record is saved/);
    this.codeLockedHelp = fieldHelp(page, /The code is fixed once the record exists/);
    this.name = this.textbox('Recipe');
    this.recipeType = this.combobox('Recipe type');
    this.owningDepartment = this.combobox('Owning department');
    this.fillsActivity = this.combobox('Fills activity');
    this.batchSize = this.textbox('Batch size');
    this.batchUnit = this.combobox('Batch unit');
    this.source = this.combobox('Source');
    this.maturity = this.combobox('Maturity');
    this.shrinkageVariance = this.textbox('Shrinkage variance (%)');
    this.shadeFailRate = this.textbox('Shade fail rate');
    this.labTurnaround = this.textbox('Lab turnaround (days)');
    this.risksHelp = fieldHelp(page, /Becomes a named, visible buffer instead of informal padding/);
    this.addSystemLinkButton = page.getByRole('button', { name: 'Add system link' });
    this.systemInput = page.getByRole('textbox', { name: /^System/ }).last();
    this.identifierInput = page.getByRole('textbox', { name: /identifier/i }).last();
    this.removeLinkButton = page.getByRole('button', { name: /remove link/i });

    this.requiredMessage = page.getByRole('alert').filter({ hasText: 'Required' });
    this.washBatchRequiredMessage = page.getByText('Required for a wash recipe');
    this.codeTakenMessage = page.getByText(/already taken/i);
  }

  textbox(name: string): Locator {
    return this.page.getByRole('textbox', { name, exact: true });
  }

  combobox(name: string): Locator {
    return this.page.getByRole('combobox', { name, exact: true });
  }
}
