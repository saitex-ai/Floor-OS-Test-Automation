import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { EmployeeFormLocators } from '../../locators/master-data/employee-form.locators';

export interface EmployeeFieldValues {
  fullName: string;
  /** Which real department to pick from the live-sourced picker — defaults to the first result shown. */
  department?: string | RegExp;
}

/**
 * The "New Employee" / edit-employee page (same field set either way) on
 * the top-level Master Data module. Real route for create:
 * /master-data/system-management/employees, reached via the list's "New
 * Employee" button (no dedicated /new URL — confirmed live, unlike
 * Departments). Owned by the Master Data QA (shared module). Element
 * locators live in EmployeeFormLocators (`this.locators`) — this class
 * only holds flows/actions/assertions built on top of them.
 */
export class EmployeeFormPage extends BasePage {
  readonly locators: EmployeeFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new EmployeeFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
    await expect(this.locators.employeeNumber).toBeDisabled();
  }

  /**
   * Fills the two required fields (Full Name, Department — both marked
   * `*` on the real form; everything else, including "Maintained by",
   * already carries a usable default). Department is a live-sourced,
   * searchable picker (see EmployeeFormLocators) — clicking it opens a
   * dialog whose options are plain buttons, picked directly rather than
   * typed into the search box for a happy-path pick.
   */
  async fillRequired(values: EmployeeFieldValues): Promise<void> {
    await this.locators.fullName.fill(values.fullName);

    await this.locators.department.click();
    await this.locators.departmentOption(values.department ?? /.+/).first().click();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Real toast text confirmed live: "Employee created" (no trailing period, unlike Departments' toast). */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Employee created', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }
}
