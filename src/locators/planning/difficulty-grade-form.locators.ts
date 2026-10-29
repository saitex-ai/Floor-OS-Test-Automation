import { type Locator, type Page } from '@playwright/test';
import { fieldHelp } from './form-field.locators';

/**
 * Raw element locators for the "New difficulty grade" / edit-grade form
 * (same field set either way) and the read-only grade detail page in front
 * of the edit form. No actions or assertions here, see
 * src/pages/planning/difficulty-grade-form.page.ts for those.
 */
export class DifficultyGradeFormLocators {
  readonly newGradeHeading: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;

  readonly code: Locator;
  readonly label: Locator;
  readonly description: Locator;
  readonly factor: Locator;
  readonly sort: Locator;
  readonly offMachine: Locator;
  readonly offMachineHelp: Locator;
  readonly status: Locator;

  readonly requiredMessage: Locator;
  readonly codeTakenMessage: Locator;

  constructor(page: Page) {
    this.newGradeHeading = page.getByRole('heading', { name: 'New difficulty grade' });
    this.createButton = page.getByRole('button', { name: 'Create difficulty grade' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.editButton = page.getByRole('button', { name: /^Edit/ });

    this.code = page.getByRole('textbox', { name: 'Lookup code', exact: true });
    this.label = page.getByRole('textbox', { name: 'Display label', exact: true });
    this.description = page.getByRole('textbox', { name: 'Description', exact: true });
    this.factor = page.getByRole('textbox', { name: 'Factor', exact: true });
    this.sort = page.getByRole('textbox', { name: 'Sort (hardest first)', exact: true });
    this.offMachine = page.getByRole('switch', { name: 'Off-machine (manual)' });
    this.offMachineHelp = fieldHelp(page, /On means no rated speed stands behind it/);
    this.status = page.getByRole('switch', { name: 'Status' });

    this.requiredMessage = page.getByText(/required/i);
    // "Already used by <label> — lookup code must be unique."
    this.codeTakenMessage = page.getByText(/already used by|already taken/i);
  }
}
