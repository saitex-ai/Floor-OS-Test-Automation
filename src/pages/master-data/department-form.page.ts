import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { DepartmentFormLocators } from '../../locators/master-data/department-form.locators';

export interface DepartmentFieldValues {
  code: string;
  name: string;
  /** Optional facility row to add (Role defaults to "Home facility"). Omitted by default. */
  facility?: string | RegExp;
  /** "Default working calendar" is required — defaults to the first real option. */
  calendar?: string | RegExp;
}

/**
 * The "New department" / edit-department page (same field set either way)
 * on the top-level Master Data module. Real route for create:
 * /master-data/system-management/departments/new. Owned by the Master
 * Data QA (shared module). Element locators live in DepartmentFormLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class DepartmentFormPage extends BasePage {
  readonly locators: DepartmentFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new DepartmentFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /**
   * Fills the fields needed for a real save: code, name and Default working
   * calendar (required — shows a "Required" inline error if unset). The old
   * required "Operates at" site row is now an optional "Facility" row —
   * confirmed live on dev 2026-10-01 that a department saves without one —
   * so it's only added when `facility` is given. Leaves Department type /
   * Capacity measured in / Active on their defaults (Internal / Line / Yes).
   */
  async fillRequired(values: DepartmentFieldValues): Promise<void> {
    await this.locators.departmentCode.fill(values.code);
    await this.locators.departmentName.fill(values.name);

    if (values.facility) {
      await this.locators.addFacilityButton.click();
      await this.locators.facilityAtRow.click();
      await this.locators.option(values.facility).first().click();
    }

    await this.locators.defaultWorkingCalendar.click();
    await this.locators
      .option(values.calendar ?? /.+/)
      .first()
      .click();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Real toast text confirmed live: "Department created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Department created.')).toBeVisible({ timeout: 15_000 });
  }
}
