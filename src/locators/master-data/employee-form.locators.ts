import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New Employee" / edit-employee form (same
 * field set either way). No actions or assertions here, see
 * src/pages/master-data/employee-form.page.ts for those.
 *
 * Department is a real, searchable, paginated combobox sourced live from
 * the Departments master (confirmed live 2026-09-24) — NOT a plain Radix
 * select like Departments' own "Site"/"Default working calendar" fields.
 * Clicking it opens a `dialog` (a cmdk-style command palette: a "Search…"
 * box + department options rendered as plain `button`s, e.g. "Cutting
 * CUT" — no role=listbox/option here, unlike Techpack's cmdk fields which
 * at least use role=option). Same command-palette shape as Techpack's
 * AI-mode pick-a-value fields; buttons instead of options is the one
 * real difference.
 */
export class EmployeeFormLocators {
  readonly employeeNumber: Locator;
  readonly fullName: Locator;
  readonly department: Locator;
  readonly reportsTo: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly maintainedBy: Locator;
  readonly activeSwitch: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly departmentDialog: Locator;
  readonly departmentSearchInput: Locator;

  constructor(private readonly page: Page) {
    this.employeeNumber = page.getByRole('textbox', { name: 'Employee Number' });
    this.fullName = page.getByRole('textbox', { name: 'Full Name', exact: false });
    this.department = page.getByRole('combobox', { name: 'Department', exact: true });
    this.reportsTo = page.getByRole('combobox', { name: 'Reports To', exact: true });
    this.email = page.getByRole('textbox', { name: 'Email', exact: true });
    this.phone = page.getByRole('textbox', { name: 'Phone', exact: true });
    this.maintainedBy = page.getByRole('combobox', { name: 'Maintained by', exact: true });
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    this.createButton = page.getByRole('button', { name: 'Create employee' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.departmentDialog = page.getByRole('dialog');
    this.departmentSearchInput = this.departmentDialog.getByRole('textbox', { name: 'Search' });
  }

  /** A department option button inside the open Department picker dialog. */
  departmentOption(name: string | RegExp): Locator {
    return this.departmentDialog.getByRole('button', { name });
  }
}
