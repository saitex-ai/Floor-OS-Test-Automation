import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for an operator profile
 * (/planning/master-data/operators/<uuid>, and /edit): the read-only view
 * with its "Qualifications (N)" table, and the edit form. Since the
 * 2026-10-28 dev deploy the edit form is in two steps (Operator details,
 * then Qualifications); step 2's table ends in an "Add a qualification" row
 * (Activity / Task / Qualified / Efficiency / … / Add a qualification) and
 * its footer is Cancel / Back / Done. No actions or assertions here, see
 * src/pages/planning/operator-profile.page.ts.
 */
export class OperatorProfileLocators {
  readonly heading: Locator;
  readonly editProfileButton: Locator;
  readonly qualificationsHeading: Locator;
  readonly qualificationsTable: Locator;
  readonly addQualificationButton: Locator;
  readonly newRowActivity: Locator;
  readonly newRowTask: Locator;
  readonly qualificationsStep: Locator;
  readonly doneButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.editProfileButton = page.getByRole('button', { name: 'Edit profile' });
    this.qualificationsHeading = page.getByRole('heading', {
      name: /^Qualifications \(\d+\)/,
      level: 3,
    });
    this.qualificationsTable = page.getByRole('table', { name: /^Qualifications \(\d+\)/ });
    this.addQualificationButton = page.getByRole('button', { name: 'Add a qualification' });
    // Only the add row has editable Activity / Task pickers; existing rows are read-only text.
    this.newRowActivity = this.qualificationsTable.getByRole('combobox', {
      name: 'Activity',
      exact: true,
    });
    this.newRowTask = this.qualificationsTable.getByRole('combobox', { name: 'Task', exact: true });
    this.qualificationsStep = page
      .getByRole('list', { name: 'Steps' })
      .getByRole('button', { name: /^Qualifications/ });
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }
}
