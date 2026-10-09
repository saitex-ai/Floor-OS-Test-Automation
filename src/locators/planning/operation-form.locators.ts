import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the New/Edit operation form, which replaces a
 * recipe's Operations table in place (same URL). Every input is labelled.
 * Chemical / Setting rows are plain label lookups, so they resolve
 * unambiguously only while one row of each exists. No actions or
 * assertions here, see src/pages/planning/operation-form.page.ts.
 */
export class OperationFormLocators {
  readonly newOperationHeading: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  readonly stepNumber: Locator;
  readonly masterOperation: Locator;
  readonly operation: Locator;
  readonly machineType: Locator;
  readonly basicMinutes: Locator;
  readonly gradeFactor: Locator;
  readonly difficultyGrade: Locator;
  readonly standardMinutes: Locator;
  readonly cycleTime: Locator;
  readonly temperature: Locator;
  readonly dryProcess: Locator;
  readonly active: Locator;

  readonly addChemicalButton: Locator;
  readonly removeChemicalButton: Locator;
  readonly chemical: Locator;
  readonly dose: Locator;
  readonly noChemicals: Locator;
  readonly addSettingButton: Locator;
  readonly removeSettingButton: Locator;
  readonly setting: Locator;
  readonly settingValue: Locator;

  readonly requiredMessage: Locator;
  readonly stepTakenMessage: Locator;
  readonly createdToast: Locator;
  readonly updatedToast: Locator;

  constructor(private readonly page: Page) {
    this.newOperationHeading = page.getByRole('heading', { name: 'New operation' });
    this.createButton = page.getByRole('button', { name: 'Create operation' });
    this.saveChangesButton = page.getByRole('button', { name: /^Save( changes)?$/ });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.stepNumber = this.textbox('Step number');
    this.masterOperation = this.combobox('Master operation');
    this.operation = this.textbox('Operation');
    this.machineType = this.combobox('Machine type');
    this.basicMinutes = this.textbox('Basic minutes');
    this.gradeFactor = this.textbox('Grade factor');
    this.difficultyGrade = this.combobox('Difficulty grade');
    this.standardMinutes = this.textbox('Standard minutes (SAM)');
    this.cycleTime = this.textbox('Cycle time (min)');
    this.temperature = this.textbox('Temperature (°C)');
    this.dryProcess = page.getByRole('switch', { name: 'Dry process' });
    this.active = page.getByRole('switch', { name: 'Active' });

    this.addChemicalButton = page.getByRole('button', { name: 'Add chemical' });
    this.removeChemicalButton = page.getByRole('button', { name: 'Remove chemical' });
    this.chemical = this.textbox('Chemical');
    this.dose = this.textbox('Dose (g/l)');
    this.noChemicals = page.getByText('No chemicals used.');
    this.addSettingButton = page.getByRole('button', { name: 'Add setting' });
    this.removeSettingButton = page.getByRole('button', { name: 'Remove setting' });
    this.setting = this.textbox('Setting');
    this.settingValue = this.textbox('Value');

    this.requiredMessage = page.getByRole('alert').filter({ hasText: 'Required' });
    this.stepTakenMessage = page.getByText(/Step \d+ is already used in this recipe|already used/i);
    this.createdToast = page.getByText('Operation created.');
    this.updatedToast = page.getByText('Operation updated.');
  }

  textbox(name: string): Locator {
    return this.page.getByRole('textbox', { name, exact: true });
  }

  combobox(name: string): Locator {
    return this.page.getByRole('combobox', { name, exact: true });
  }
}
