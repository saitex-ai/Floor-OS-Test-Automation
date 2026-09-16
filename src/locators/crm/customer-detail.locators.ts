import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Customer Detail screen (CRM, Sprint 1) —
 * no actions or assertions here, see
 * src/pages/crm/customer-detail.page.ts for those. Route confirmed on
 * dev: `/crm/customers/{uuid}`. Covers activate-customer(.md/-screen.md),
 * deactivate-customer(.md/-screen.md), and edit-customer-contact.md — all
 * three ClickUp tasks describe this same screen.
 *
 * Every editable Profile/Management field renders as "{Label} • {value}"
 * plus an adjacent "Edit" button — fieldContainer() locates that row by
 * its label text. System fields (Customer Code, Created On/By, Updated
 * On/By) have no Edit button at all. "Departments and Assignees" edits as
 * a whole section rather than per-row — its own Edit button is the last
 * "Edit" button on the page (confirmed directly; the heading's own
 * parent doesn't contain it).
 */
export class CustomerDetailLocators {
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
  readonly departmentsAddButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
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
    this.departmentsAddButton = page.getByRole('button', { name: 'Add', exact: true });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** Every Profile/Management field row is "{Label} • {value}" + its own Edit button. */
  fieldContainer(label: string): Locator {
    return this.page.getByText(label, { exact: false }).first().locator('..');
  }

  confirmActionButton(action: 'Activate' | 'Deactivate'): Locator {
    return this.confirmDialog.getByRole('button', { name: action, exact: true });
  }

  departmentCombobox(): Locator {
    return this.page.getByRole('combobox', { name: 'Department' }).last();
  }

  assigneesCombobox(): Locator {
    return this.page.getByRole('combobox', { name: 'Assignees' }).last();
  }

  lastTextbox(): Locator {
    return this.page.getByRole('textbox').last();
  }

  lastButton(name: 'Save' | 'Cancel'): Locator {
    return this.page.getByRole('button', { name }).last();
  }
}
