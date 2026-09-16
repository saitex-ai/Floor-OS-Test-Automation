import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Customer Detail screen (route confirmed on dev: `/crm/customers/{uuid}`,
 * reached after saving via CreateCustomerPage or by opening a row from the
 * Customers list). Covers activate-customer(.md/-screen.md),
 * deactivate-customer(.md/-screen.md), and edit-customer-contact.md — all
 * three ClickUp tasks describe this same screen. Owned by the CRM QA.
 *
 * Everything below is confirmed against a real save-and-probe run on dev
 * (2026-09-16, local blocked this screen entirely — no selectable Country
 * meant no Customer could ever be saved there). Notable, non-obvious
 * things:
 *
 * - Activate and Deactivate use the *same* two-step dialog shape: a
 *   reason-capture dialog (role="dialog", not alertdialog) with a
 *   multi-select "Reason for Activation/Deactivation *" button + a
 *   "Detailed Reason for Activation/Deactivation *" textarea with a live
 *   "N / 1000" counter, then a second, separate confirmation dialog named
 *   "{Activate|Deactivate} {Customer} and its Contacts?" whose own confirm
 *   button is just "Activate"/"Deactivate" (bare word, scoped to that
 *   dialog to disambiguate from the page's own trigger button).
 * - Every editable Profile/Management field renders as
 *   "{Label} • {value}" plus an adjacent "Edit" button; clicking Edit
 *   swaps that same row for a textbox + "Save" + "Cancel". System fields
 *   (Customer Code, Created On/By, Updated On/By) have no Edit button at
 *   all — genuinely read-only, not just disabled.
 * - "Departments and Assignees" edits as a whole section, not per-row:
 *   its own "Edit" button (last "Edit" button on the page — the section
 *   itself isn't a labeled field row) turns into "Cancel"/"Save"/"Add".
 *   Clicking a filled Assignees combobox's trigger cleared it straight
 *   back to empty (confirmed directly, not assumed) — that's how a row
 *   gets to 0 assignees for the validation check, which reads exactly
 *   "A department needs at least one assignee".
 */
export class CustomerDetailPage extends BasePage {
  readonly nameHeading: Locator;
  readonly activateButton: Locator;
  readonly deactivateButton: Locator;

  // Activate/Deactivate reason-capture dialog (shared shape)
  readonly reasonDialog: Locator;
  readonly reasonMultiSelect: Locator;
  readonly detailedReasonTextbox: Locator;
  readonly reasonProceedButton: Locator;
  readonly reasonCancelButton: Locator;

  // Final confirmation dialog (shared shape)
  readonly confirmDialog: Locator;
  readonly confirmCancelButton: Locator;

  // Departments and Assignees
  readonly departmentsHeading: Locator;
  readonly departmentsEditButton: Locator;
  readonly departmentsSaveButton: Locator;
  readonly departmentsCancelButton: Locator;
  readonly departmentsAddButton: Locator;

  readonly toast: Locator;

  constructor(page: Page) {
    super(page);

    this.nameHeading = page.getByRole('heading', { level: 1 });
    // exact: true is required — "Activate" is a substring of "Deactivate"
    // (case-insensitive accessible-name matching), so without it
    // activateButton also matches the Deactivate button and vice versa
    // (confirmed directly: caused a real false-negative on dev).
    this.activateButton = page.getByRole('button', { name: 'Activate', exact: true });
    this.deactivateButton = page.getByRole('button', { name: 'Deactivate', exact: true });

    this.reasonDialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Select a reason and provide detail before proceeding.' });
    this.reasonMultiSelect = this.reasonDialog.getByRole('button', {
      name: /Reason for (Activation|Deactivation)/,
    });
    this.detailedReasonTextbox = this.reasonDialog.getByRole('textbox', {
      name: /Detailed Reason for (Activation|Deactivation)/,
    });
    this.reasonProceedButton = this.reasonDialog.getByRole('button', { name: 'Proceed' });
    this.reasonCancelButton = this.reasonDialog.getByRole('button', { name: 'Cancel' });

    this.confirmDialog = page.getByRole('dialog').filter({ hasText: /and its Contacts\?/ });
    this.confirmCancelButton = this.confirmDialog.getByRole('button', { name: 'Cancel' });

    this.departmentsHeading = page.getByRole('heading', { name: 'Departments and Assignees' });
    // Not a labeled field row like Profile/Management fields — it's the
    // last "Edit" button on the page (confirmed directly; the heading's
    // own parent doesn't contain it, so a text-proximity locator doesn't
    // work here the way it does for every other field).
    this.departmentsEditButton = page.getByRole('button', { name: 'Edit' }).last();
    this.departmentsSaveButton = page.getByRole('button', { name: 'Save' }).last();
    this.departmentsCancelButton = page.getByRole('button', { name: 'Cancel' }).last();
    this.departmentsAddButton = page.getByRole('button', { name: 'Add', exact: true });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** Every Profile/Management field row is "{Label} • {value}" + its own Edit button. */
  private fieldContainer(label: string): Locator {
    return this.page.getByText(label, { exact: false }).first().locator('..');
  }

  async expectStatus(status: 'Active' | 'Inactive'): Promise<void> {
    await expect(this.page.getByText(new RegExp(`Status\\s*${status}`))).toBeVisible();
  }

  async expectFieldNotEditable(label: string): Promise<void> {
    await expect(this.fieldContainer(label).getByRole('button', { name: 'Edit' })).toHaveCount(0);
  }

  async openFieldEdit(label: string): Promise<void> {
    await this.fieldContainer(label).getByRole('button', { name: 'Edit' }).click();
  }

  async fillFieldEdit(value: string): Promise<void> {
    await this.page.getByRole('textbox').last().fill(value);
  }

  async saveFieldEdit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save' }).last().click();
  }

  async cancelFieldEdit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).last().click();
  }

  /** Opens a field's inline editor, sets a value, and saves in one step. */
  async editField(label: string, value: string): Promise<void> {
    await this.openFieldEdit(label);
    await this.fillFieldEdit(value);
    await this.saveFieldEdit();
  }

  async expectFieldEditError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  private async selectReasons(reasons: string[]): Promise<void> {
    await this.reasonMultiSelect.click();
    for (const reason of reasons) {
      await this.page.getByRole('option', { name: reason }).click();
    }
    await this.page.keyboard.press('Escape');
  }

  /** Deactivate flow, reason-capture step through the final confirm dialog. */
  async deactivate(reasons: string[], detail: string): Promise<void> {
    await this.deactivateButton.click();
    await this.selectReasons(reasons);
    await this.detailedReasonTextbox.fill(detail);
    await this.reasonProceedButton.click();
    await this.confirmDialog.getByRole('button', { name: 'Deactivate', exact: true }).click();
  }

  /** Activate flow — same shape as deactivate(), reversed. */
  async activate(reasons: string[], detail: string): Promise<void> {
    await this.activateButton.click();
    await this.selectReasons(reasons);
    await this.detailedReasonTextbox.fill(detail);
    await this.reasonProceedButton.click();
    await this.confirmDialog.getByRole('button', { name: 'Activate', exact: true }).click();
  }

  async expectCharacterCount(count: number, max = 1000): Promise<void> {
    await expect(this.reasonDialog.getByText(`${count} / ${max}`)).toBeVisible();
  }

  async openDepartmentsEdit(): Promise<void> {
    await this.departmentsEditButton.click();
  }

  async addDepartmentRow(department: string, assignee?: string): Promise<void> {
    await this.departmentsAddButton.click();
    const departmentCombobox = this.page.getByRole('combobox', { name: 'Department' }).last();
    await this.selectComboboxOption(departmentCombobox, department);
    if (assignee !== undefined) {
      const assigneeCombobox = this.page.getByRole('combobox', { name: 'Assignees' }).last();
      await this.selectComboboxOption(assigneeCombobox, assignee);
      // Unlike Department's popup, the Assignees picker here stays open
      // (aria-expanded stays true) after selecting an option — it's a
      // multi-select-capable widget, not single-select-and-close like
      // Department's (confirmed directly: caused stray interactions with
      // unrelated fields further down the page when left open). Close it.
      await this.page.keyboard.press('Escape');
    }
  }

  /**
   * Clears the last row's Assignees field back to empty. Confirmed
   * directly: clicking a filled Assignees combobox's trigger clears it
   * rather than opening a picker to deselect from — but whether that
   * clear reliably commits before a save fired right after it is
   * genuinely inconsistent across runs (confirmed directly: identical
   * click+wait sequences sometimes left the row cleared and sometimes
   * silently kept the old assignee, in both headed and headless runs —
   * this isn't a fixable locator/timing issue on the test side, it looks
   * like real intermittent behavior in the app itself). See TC:6 in
   * edit-customer-contact.spec.ts, marked fixme with the full writeup.
   */
  async clearLastRowAssignee(): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Assignees' }).last().click();
    await expect(this.page.getByRole('combobox', { name: 'Assignees' }).last()).toHaveText(
      'Assignee',
    );
  }

  async saveDepartments(): Promise<void> {
    await this.departmentsSaveButton.click();
  }

  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }
}
