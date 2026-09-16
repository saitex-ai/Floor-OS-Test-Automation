import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerDetailLocators } from '../../locators/crm/customer-detail.locators';

/**
 * Customer Detail screen (route confirmed on dev: `/crm/customers/{uuid}`,
 * reached after saving via CreateCustomerPage or by opening a row from the
 * Customers list). Covers activate-customer(.md/-screen.md),
 * deactivate-customer(.md/-screen.md), and edit-customer-contact.md — all
 * three ClickUp tasks describe this same screen. Owned by the CRM QA.
 *
 * Element locators live in CustomerDetailLocators (`this.locators`) —
 * this class only holds flows/actions/assertions built on top of them.
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
  readonly locators: CustomerDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerDetailLocators(page);
  }

  async expectStatus(status: 'Active' | 'Inactive'): Promise<void> {
    await expect(this.page.getByText(new RegExp(`Status\\s*${status}`))).toBeVisible();
  }

  async expectFieldNotEditable(label: string): Promise<void> {
    await expect(
      this.locators.fieldContainer(label).getByRole('button', { name: 'Edit' }),
    ).toHaveCount(0);
  }

  async openFieldEdit(label: string): Promise<void> {
    await this.locators.fieldContainer(label).getByRole('button', { name: 'Edit' }).click();
  }

  async fillFieldEdit(value: string): Promise<void> {
    await this.locators.lastTextbox().fill(value);
  }

  async saveFieldEdit(): Promise<void> {
    await this.locators.lastButton('Save').click();
  }

  async cancelFieldEdit(): Promise<void> {
    await this.locators.lastButton('Cancel').click();
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
    await this.locators.reasonMultiSelect.click();
    for (const reason of reasons) {
      await this.page.getByRole('option', { name: reason }).click();
    }
    await this.page.keyboard.press('Escape');
  }

  /** Deactivate flow, reason-capture step through the final confirm dialog. */
  async deactivate(reasons: string[], detail: string): Promise<void> {
    await this.locators.deactivateButton.click();
    await this.selectReasons(reasons);
    await this.locators.detailedReasonTextbox.fill(detail);
    await this.locators.reasonProceedButton.click();
    await this.locators.confirmActionButton('Deactivate').click();
  }

  /** Activate flow — same shape as deactivate(), reversed. */
  async activate(reasons: string[], detail: string): Promise<void> {
    await this.locators.activateButton.click();
    await this.selectReasons(reasons);
    await this.locators.detailedReasonTextbox.fill(detail);
    await this.locators.reasonProceedButton.click();
    await this.locators.confirmActionButton('Activate').click();
  }

  async expectCharacterCount(count: number, max = 1000): Promise<void> {
    await expect(this.locators.reasonDialog.getByText(`${count} / ${max}`)).toBeVisible();
  }

  async openDepartmentsEdit(): Promise<void> {
    await this.locators.departmentsEditButton.click();
  }

  async addDepartmentRow(department: string, assignee?: string): Promise<void> {
    await this.locators.departmentsAddButton.click();
    await this.selectComboboxOption(this.locators.departmentCombobox(), department);
    if (assignee !== undefined) {
      await this.selectComboboxOption(this.locators.assigneesCombobox(), assignee);
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
    await this.locators.assigneesCombobox().click();
    await expect(this.locators.assigneesCombobox()).toHaveText('Assignee');
  }

  async saveDepartments(): Promise<void> {
    await this.locators.lastButton('Save').click();
  }

  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }
}
