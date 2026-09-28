import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New qualification" create form
 * (/planning/master-data/qualifications/new). No actions or assertions
 * here, see src/pages/planning/qualification-form.page.ts for those.
 *
 * Operator and Task are live-sourced, searchable combos wrapped in a
 * `dialog` (same shape as Work Centre's "Owning department" and
 * Employees' "Department") — real `role=option` items, not plain
 * buttons. "Assessed by" is a small fixed-option plain `listbox`.
 */
export class QualificationFormLocators {
  readonly operator: Locator;
  readonly activity: Locator;
  readonly task: Locator;
  readonly qualifiedSwitch: Locator;
  readonly efficiencyVsStandard: Locator;
  readonly measuredMinutes: Locator;
  readonly assessedBy: Locator;
  readonly activeSwitch: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.operator = page.getByRole('combobox', { name: 'Operator', exact: true });
    this.activity = page.getByRole('combobox', { name: 'Activity', exact: true });
    this.task = page.getByRole('combobox', { name: 'Task', exact: true });
    this.qualifiedSwitch = page.getByRole('switch', { name: 'Qualified' });
    this.efficiencyVsStandard = page.getByRole('textbox', { name: 'Efficiency vs standard' });
    this.measuredMinutes = page.getByRole('textbox', { name: 'Measured minutes' });
    this.assessedBy = page.getByRole('combobox', { name: 'Assessed by', exact: true });
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    this.createButton = page.getByRole('button', { name: 'Create qualification' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  /** An option inside whichever combobox popover is currently open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
