import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New department" / edit-department form
 * (/master-data/system-management/departments/new — same field set for
 * edit, reached via a row's Edit action). No actions or assertions here,
 * see src/pages/master-data/department-form.page.ts for those.
 *
 * Locator trap confirmed live: `getByRole('combobox', { name: 'Site' })`
 * also matches "Role at this site" and "Calendar at this site" (substring
 * match) — every combobox here needs `exact: true`.
 */
export class DepartmentFormLocators {
  readonly departmentCode: Locator;
  readonly departmentName: Locator;
  readonly departmentType: Locator;
  readonly defaultWorkingCalendar: Locator;
  readonly capacityMeasuredIn: Locator;
  readonly activeSwitch: Locator;
  readonly addSiteButton: Locator;
  readonly siteAtRow: Locator;
  readonly roleAtSite: Locator;
  readonly calendarAtSite: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly listbox: Locator;

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
    this.addSiteButton = page.getByRole('button', { name: 'Add site' });
    this.siteAtRow = page.getByRole('combobox', { name: 'Site', exact: true });
    this.roleAtSite = page.getByRole('combobox', { name: 'Role at this site', exact: true });
    this.calendarAtSite = page.getByRole('combobox', { name: 'Calendar at this site', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create department' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.listbox = page.getByRole('listbox');
  }

  /** The open dropdown's options, once a combobox trigger has been clicked. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }
}
