import { type Locator, type Page } from '@playwright/test';

/** Where a row's input is looked up: its row, or the page (for a `has:` filter). */
type Scope = Locator | Page;

/**
 * Raw element locators for a recipe operation's inputs. Since the
 * 2026-10-28 dev deploy an operation is a row of the "Operations (N)"
 * inline table on step 2 of Edit recipe (see InlineTableLocators): the add
 * row for a new one, a saved row after its "Edit operation". Each input is
 * looked up inside the row passed in; Chemical / Setting sub-rows resolve
 * unambiguously only while one of each exists. No actions or assertions
 * here, see src/pages/planning/operation-form.page.ts.
 */
export class OperationFormLocators {
  readonly stepTitle: Locator;
  /** The form's footer Cancel (a row being edited has its own Cancel, above it). */
  readonly cancelButton: Locator;
  readonly stepTakenMessage: Locator;

  constructor(private readonly page: Page) {
    this.stepTitle = page.getByText('STEP 2 OF 2 · OPERATIONS');
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).last();
    this.stepTakenMessage = page.getByText(/Step \d+ is already used in this recipe|already used/i);
  }

  stepNumber(row: Scope): Locator {
    return this.textbox(row, 'Step number');
  }

  masterOperation(row: Scope): Locator {
    return this.combobox(row, 'Master operation');
  }

  operation(row: Scope): Locator {
    return this.textbox(row, 'Operation');
  }

  machineType(row: Scope): Locator {
    return this.combobox(row, 'Machine type');
  }

  /** "Standard minutes" (was "Standard minutes (SAM)" on the old form). */
  standardMinutes(row: Scope): Locator {
    return this.textbox(row, 'Standard minutes');
  }

  cycleTime(row: Scope): Locator {
    return this.textbox(row, 'Cycle time (min)');
  }

  /** "Temperature" (was "Temperature (°C)"). */
  temperature(row: Scope): Locator {
    return this.textbox(row, 'Temperature');
  }

  gradeFactor(row: Scope): Locator {
    return this.textbox(row, 'Grade factor');
  }

  difficultyGrade(row: Scope): Locator {
    return this.combobox(row, 'Difficulty grade');
  }

  dryProcess(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Dry process' });
  }

  addChemicalButton(row: Scope): Locator {
    return row.getByRole('button', { name: 'Add chemical' });
  }

  removeChemicalButton(row: Scope): Locator {
    return row.getByRole('button', { name: 'Remove chemical' });
  }

  chemical(row: Scope): Locator {
    return this.textbox(row, 'Chemical');
  }

  dose(row: Scope): Locator {
    return row.getByRole('textbox', { name: /^Dose/ });
  }

  addSettingButton(row: Scope): Locator {
    return row.getByRole('button', { name: 'Add setting' });
  }

  setting(row: Scope): Locator {
    return this.textbox(row, 'Setting');
  }

  settingValue(row: Scope): Locator {
    return this.textbox(row, 'Value');
  }

  requiredMessage(row: Scope): Locator {
    return row.getByRole('alert').filter({ hasText: 'Required' });
  }

  option(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }

  private textbox(row: Scope, name: string): Locator {
    return row.getByRole('textbox', { name, exact: true });
  }

  private combobox(row: Scope, name: string): Locator {
    return row.getByRole('combobox', { name, exact: true });
  }
}
