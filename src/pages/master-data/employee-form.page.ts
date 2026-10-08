import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { EmployeeFormLocators } from '../../locators/master-data/employee-form.locators';

export interface EmployeeFieldValues {
  fullName: string;
  /** Which real department to pick from the live-sourced picker — defaults to the first result shown. */
  department?: string | RegExp;
  /** "Maintained by" — required since 2026-10-01; defaults to "By hand". */
  maintainedBy?: string;
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
   * Fills the three required fields (Full Name, Department, Maintained by —
   * all marked `*`; "Maintained by" became required with no default on dev,
   * confirmed 2026-10-01). Department is a live-sourced,
   * searchable picker (see EmployeeFormLocators) — clicking it opens a
   * dialog whose options are plain buttons, picked directly rather than
   * typed into the search box for a happy-path pick.
   */
  async fillRequired(values: EmployeeFieldValues): Promise<void> {
    await this.locators.fullName.fill(values.fullName);

    await this.locators.department.click();
    await this.locators
      .departmentOption(values.department ?? /.+/)
      .first()
      .click();

    // Same picker-dialog shape as Department: "HR system (synchronised)" / "By hand".
    await this.locators.maintainedBy.click();
    await this.locators.departmentOption(values.maintainedBy ?? 'By hand').click();
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

  /**
   * Fills only Full Name + Department, deliberately leaving "Maintained by"
   * on its default "Select…" — used to confirm it's genuinely enforced as
   * required (the field has no default on dev as of 2026-10-01; a prior,
   * now-stale bug report described it defaulting to "IE-Assessed").
   */
  async fillFullNameAndDepartmentOnly(
    fullName: string,
    department?: string | RegExp,
  ): Promise<void> {
    await this.locators.fullName.fill(fullName);
    await this.locators.department.click();
    await this.locators
      .departmentOption(department ?? /.+/)
      .first()
      .click();
  }

  /**
   * Opens the Department picker dialog, waits for its live-sourced options
   * to actually load (the dialog can briefly render with 0 options while
   * the real department list fetches), then returns their labels.
   */
  /** The dialog's own pagination control, not a real department — filtered out of every option list this page object returns. */
  private static readonly NON_OPTION_LABELS = /^(Load more|Loading…?)$/i;

  private async departmentPickerOptionLabels(): Promise<string[]> {
    const texts = await this.locators.departmentDialog.getByRole('button').allInnerTexts();
    return texts.filter((t) => !EmployeeFormPage.NON_OPTION_LABELS.test(t.trim()));
  }

  async openDepartmentPickerOptions(): Promise<string[]> {
    await this.locators.department.click();
    await expect(this.locators.departmentDialog.getByRole('button').first()).toBeVisible({
      timeout: 15_000,
    });
    return this.departmentPickerOptionLabels();
  }

  /**
   * Types into the already-open Department picker's Search box, returning
   * the filtered option labels (never "Load more"/"Loading…"). The live
   * department search is async and debounced, and confirmed live
   * 2026-10-07 to be genuinely racy under a busy dev environment: the
   * dialog's own initial unfiltered fetch can resolve *after* the search
   * fetch and silently clobber it back to the unfiltered first page, with
   * the typed text still visibly sitting in the search box the whole
   * time (easy to misread as "nothing happened" rather than "it happened
   * and then got reverted"). Re-filling inside the retry loop (not just
   * re-reading) means the last fill to land wins the race, instead of a
   * one-shot fill hoping no later response clobbers it.
   */
  async searchDepartmentPicker(term: string): Promise<string[]> {
    await expect(async () => {
      await this.locators.departmentSearchInput.fill(term);
      const options = await this.departmentPickerOptionLabels();
      expect(options.length).toBeGreaterThan(0);
      expect(options.every((label) => new RegExp(term, 'i').test(label))).toBe(true);
    }).toPass({ timeout: 20_000, intervals: [300, 500, 1_000] });
    return this.departmentPickerOptionLabels();
  }

  /** True on the read-only detail view reached by clicking an Employees-list row (before "Edit employee" is clicked). */
  async expectOnDetailPage(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible({ timeout: 15_000 });
  }

  async clickEdit(): Promise<void> {
    await this.locators.editButton.click();
  }

  async toggleActive(): Promise<void> {
    await this.locators.activeSwitch.click();
  }

  async isActive(): Promise<boolean> {
    return (await this.locators.activeSwitch.getAttribute('aria-checked')) === 'true';
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Real toast text confirmed live: "Employee updated" (no trailing period, same style as the create toast). */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Employee updated', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectValidationError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }
}
