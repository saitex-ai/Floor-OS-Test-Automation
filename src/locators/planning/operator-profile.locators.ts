import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for one operator on Planning > Master Data >
 * Operators & Qualifications: the read-only view
 * (/planning/master-data/operators/<uuid>) with its "Qualifications (N)"
 * table, and the stepped form shared by New (/operators/new) and Edit
 * (/<uuid>/edit). No actions or assertions here, see
 * src/pages/planning/operator-profile.page.ts.
 *
 * The form has two steps (dev and uat, 2026-11-17): step 1 "Operator
 * details" (Employee, Home work centre, Usual shift, Skill grade,
 * Deployment, Overall efficiency vs standard, On the floor since, Active)
 * ends in Cancel / "Save & continue", which creates or saves the profile;
 * step 2 "Qualifications" is the qualifications table, whose first body
 * row is the add row (Activity / Task / Qualified / Efficiency / Measured
 * minutes / Assessed by / Last assessed / Valid until / Active / "Add a
 * qualification"), and its footer is Back / Cancel / Done. Each
 * qualification saves on its own, the moment its add or Save is pressed.
 */
export class OperatorProfileLocators {
  // ── View ────────────────────────────────────────────────────────────
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly editProfileButton: Locator;
  /** "<department> · home work centre <code>" under the heading. */
  readonly metaLine: Locator;
  /** The note at the bottom of the view: "Owned and written by planning — …". */
  readonly ownershipNote: Locator;
  /** Bob-style users: "You can change this operator's qualifications below. …". */
  readonly qualificationOnlyNotice: Locator;

  // ── Form, step 1 ────────────────────────────────────────────────────
  readonly newHeading: Locator;
  readonly employee: Locator;
  readonly homeWorkCentre: Locator;
  readonly usualShift: Locator;
  readonly skillGrade: Locator;
  readonly deployment: Locator;
  readonly efficiency: Locator;
  /** On the floor since: "Pick date" while empty, "<date> Clear date" once set. */
  readonly onFloorSince: Locator;
  readonly activeSwitch: Locator;
  readonly saveAndContinueButton: Locator;
  readonly cancelButton: Locator;
  /** The footer's "No changes" / "Unsaved changes". */
  readonly changesStatus: Locator;
  readonly detailsStep: Locator;
  readonly qualificationsStep: Locator;
  readonly stepLabel: Locator;

  // ── Form, step 2 ────────────────────────────────────────────────────
  readonly backButton: Locator;
  readonly doneButton: Locator;

  // ── "Leave without saving?" ─────────────────────────────────────────
  readonly leaveDialog: Locator;
  readonly keepEditingButton: Locator;
  readonly discardAndLeaveButton: Locator;

  // ── Qualifications table (view and step 2) ──────────────────────────
  readonly qualificationsHeading: Locator;
  readonly qualificationsTable: Locator;
  readonly qualificationsSearch: Locator;
  readonly qualificationsShowing: Locator;
  readonly qualificationsRowsPerPage: Locator;
  readonly qualificationsNextPage: Locator;
  readonly qualificationsEmpty: Locator;
  readonly addRow: Locator;
  readonly addQualificationButton: Locator;
  readonly newRowActivity: Locator;
  readonly newRowTask: Locator;
  /** The saved row open for editing: the one holding Save / Cancel. */
  readonly editingRow: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main').last();
    this.heading = main.getByRole('heading', { level: 1 });
    this.backLink = main
      .getByRole('link', { name: 'All operators & qualifications' })
      .or(main.getByRole('button', { name: 'All operators & qualifications' }));
    this.editProfileButton = page.getByRole('button', { name: 'Edit profile' });
    this.metaLine = main.getByText(/ · home work centre /).first();
    this.ownershipNote = main.getByRole('note');
    this.qualificationOnlyNotice = main.getByText(/You can change this operator's qualifications/);

    this.newHeading = main.getByRole('heading', { name: 'New operator', level: 1 });
    this.employee = main.getByRole('combobox', { name: 'Employee', exact: true });
    this.homeWorkCentre = main.getByRole('combobox', { name: 'Home work centre', exact: true });
    this.usualShift = main.getByRole('combobox', { name: 'Usual shift', exact: true });
    this.skillGrade = main.getByRole('combobox', { name: 'Skill grade', exact: true });
    this.deployment = main.getByRole('combobox', { name: 'Deployment', exact: true });
    this.efficiency = main.getByRole('textbox', {
      name: 'Overall efficiency vs standard',
      exact: true,
    });
    // Step 1 holds one date field; step 2's dates are inside the table.
    this.onFloorSince = main.getByRole('button', { name: /^(Pick date|.+ Clear date)$/ }).first();
    this.activeSwitch = main.getByRole('switch', { name: 'Active', exact: true }).first();
    this.saveAndContinueButton = main.getByRole('button', { name: 'Save & continue' });
    this.cancelButton = main.getByRole('button', { name: 'Cancel', exact: true }).last();
    this.changesStatus = main.getByText(/^(No changes|Unsaved changes)$/);
    const steps = main.getByRole('list', { name: 'Steps' });
    this.detailsStep = steps.getByRole('button', { name: /^Operator details/ });
    this.qualificationsStep = steps.getByRole('button', { name: /^Qualifications/ });
    this.stepLabel = main.getByText(/^STEP \d OF \d · /i);

    this.backButton = main.getByRole('button', { name: 'Back', exact: true });
    this.doneButton = main.getByRole('button', { name: 'Done', exact: true });

    this.leaveDialog = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    this.keepEditingButton = this.leaveDialog.getByRole('button', { name: 'Keep editing' });
    this.discardAndLeaveButton = this.leaveDialog.getByRole('button', {
      name: 'Discard and leave',
    });

    const qualifications = /^Qualifications \(\d+\)/;
    this.qualificationsHeading = main.getByRole('heading', { name: qualifications, level: 3 });
    this.qualificationsTable = main.getByRole('table', { name: qualifications });
    this.qualificationsSearch = main.getByRole('searchbox', { name: 'Search qualifications' });
    this.qualificationsShowing = main.getByText(/^Showing \d+ to \d+ of \d+/);
    this.qualificationsRowsPerPage = main.getByRole('combobox', { name: 'Rows per page' });
    this.qualificationsNextPage = main.getByRole('button', { name: 'Next page' });
    this.qualificationsEmpty = main.getByText('This operator holds no qualifications yet.').first();
    const add = page.getByRole('button', { name: 'Add a qualification', exact: true });
    this.addRow = this.qualificationsTable.getByRole('row').filter({ has: add });
    this.addQualificationButton = this.addRow.getByRole('button', {
      name: 'Add a qualification',
      exact: true,
    });
    this.newRowActivity = this.addRow.getByRole('combobox', { name: 'Activity', exact: true });
    this.newRowTask = this.addRow.getByRole('combobox', { name: 'Task', exact: true });
    this.editingRow = this.qualificationsTable
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: 'Save', exact: true }) });
  }

  /** An option of whichever dropdown is open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: typeof name === 'string' });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }

  /** The value next to a label in the view's details block (see detailValue). */
  detailLabel(label: string): Locator {
    return this.page.getByRole('main').last().getByText(label, { exact: true }).first();
  }

  /** A badge or plain text in the header area (e.g. "Retired", "Floating across the department"). */
  text(text: string | RegExp): Locator {
    return this.page
      .getByRole('main')
      .last()
      .getByText(text, { exact: typeof text === 'string' });
  }

  /**
   * A saved qualification row, by its task or activity code. The code is its
   * own element in the Activity / Task cell ("SEW-COINHEM" above "Coin pocket
   * hem"), and the row's text runs them together, so match that element.
   */
  qualificationRow(code: string): Locator {
    return this.dataRows().filter({ has: this.page.getByText(code, { exact: true }) });
  }

  /** The table's saved rows: every body row except the add row and the empty-table message. */
  dataRows(): Locator {
    return (
      this.qualificationsTable
        .getByRole('rowgroup')
        .nth(1)
        .getByRole('row')
        .filter({
          hasNot: this.page.getByRole('button', { name: 'Add a qualification', exact: true }),
        })
        // Loading skeleton rows are empty.
        .filter({ hasText: /\S/ })
        .filter({ hasNotText: 'This operator holds no qualifications yet.' })
        .filter({ hasNotText: /^No qualifications match/ })
    );
  }

  /** The Activity / Task / Assessed by picker in `row` (the add row or the row being edited). */
  rowCombo(row: Locator, name: 'Activity' | 'Task' | 'Assessed by'): Locator {
    return row.getByRole('combobox', { name, exact: true });
  }

  rowTextbox(row: Locator, name: 'Efficiency' | 'Measured minutes'): Locator {
    return row.getByRole('textbox', { name, exact: true });
  }

  rowSwitch(row: Locator, name: 'Qualified' | 'Active'): Locator {
    return row.getByRole('switch', { name, exact: true });
  }

  /** The "Last assessed" / "Valid until" trigger in `row`: a date, or "Does not expire". */
  rowDate(row: Locator, name: 'Last assessed' | 'Valid until'): Locator {
    return row
      .getByRole('group', { name, exact: true })
      .getByRole('button', { name: /^(Pick date|Does not expire|.+ Clear date)$/ });
  }

  rowClearDate(row: Locator, name: 'Last assessed' | 'Valid until'): Locator {
    return row
      .getByRole('group', { name, exact: true })
      .getByRole('button', { name: 'Clear date', exact: true });
  }

  rowButton(row: Locator, name: string): Locator {
    return row.getByRole('button', { name, exact: true });
  }

  /** The validation messages inside `scope` (a row, or the whole form). */
  alerts(scope: Locator): Locator {
    return scope.getByRole('alert');
  }

  /** The field's own validation message (the field and its alert share a wrapper). */
  fieldAlert(control: Locator): Locator {
    return control.locator('xpath=..').getByRole('alert');
  }
}
