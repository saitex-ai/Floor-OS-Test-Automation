import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New department" / edit-department form
 * (/master-data/system-management/departments/new — same field set for
 * edit, reached via a row's Edit action). No actions or assertions here,
 * see src/pages/master-data/department-form.page.ts for those.
 *
 * Every combobox here uses `exact: true`: accessible names on this form
 * overlap (e.g. "Role" vs "Department type"-style substrings), and a
 * substring match picks the wrong field.
 */
export class DepartmentFormLocators {
  readonly departmentCode: Locator;
  readonly departmentName: Locator;
  readonly departmentType: Locator;
  readonly defaultWorkingCalendar: Locator;
  readonly capacityMeasuredIn: Locator;
  readonly activeSwitch: Locator;
  readonly addFacilityButton: Locator;
  readonly facilityAtRow: Locator;
  readonly roleAtFacility: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly listbox: Locator;
  /** Only present on the read-only detail view (`/departments/<uuid>` before Edit is clicked). */
  readonly editButton: Locator;

  constructor(private readonly page: Page) {
    this.departmentCode = page.getByRole('textbox', { name: 'Department code' });
    this.departmentName = page.getByRole('textbox', { name: 'Department name' });
    this.departmentType = page.getByRole('combobox', { name: 'Department type', exact: true });
    this.defaultWorkingCalendar = page.getByRole('combobox', {
      name: 'Default working calendar',
      exact: true,
    });
    this.capacityMeasuredIn = page.getByRole('combobox', {
      name: 'Capacity measured in',
      exact: true,
    });
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    // "Operates at" sites became optional "Facility" rows (confirmed live on dev 2026-10-01).
    this.addFacilityButton = page.getByRole('button', { name: 'Add facility' });
    this.facilityAtRow = page.getByRole('combobox', { name: 'Facility', exact: true });
    this.roleAtFacility = page.getByRole('combobox', { name: 'Role', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create department' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.listbox = page.getByRole('listbox');
    this.editButton = page.getByRole('button', { name: 'Edit department' });
  }

  /** The open dropdown's options, once a combobox trigger has been clicked. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }
}
