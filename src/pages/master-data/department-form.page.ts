import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { DepartmentFormLocators } from '../../locators/master-data/department-form.locators';

export interface DepartmentFieldValues {
  code: string;
  name: string;
  /** Which "Operates at" site to pick — defaults to the first real option. */
  site?: string | RegExp;
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
   * Fills the fields needed for a real save: code, name, one "Operates at"
   * site row (required — the form blocks save with "At least one site is
   * required" otherwise, confirmed live), and Default working calendar
   * (also required — confirmed live via the "Required" inline error it
   * shows if left unset, not obvious from the field list alone). Leaves
   * Department type / Capacity measured in / Active on their own defaults
   * (Internal / Line / Yes) since nothing in this flow needs them changed.
   */
  async fillRequired(values: DepartmentFieldValues): Promise<void> {
    await this.locators.departmentCode.fill(values.code);
    await this.locators.departmentName.fill(values.name);

    await this.locators.addSiteButton.click();
    await this.locators.siteAtRow.click();
    await this.locators.option(values.site ?? /.+/).first().click();
    // "Role at this site" already defaults to "Primary (home site)" once a
    // site row exists — no need to touch it for a single-site happy path.

    await this.locators.defaultWorkingCalendar.click();
    await this.locators.option(values.calendar ?? /.+/).first().click();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Real toast text confirmed live: "Department created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Department created.')).toBeVisible({ timeout: 15_000 });
  }
}
