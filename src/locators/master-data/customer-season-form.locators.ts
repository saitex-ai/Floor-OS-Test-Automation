import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New Season" / "Edit Season" dialog on the
 * top-level Master Data module. No actions or assertions here, see
 * src/pages/master-data/customer-season-form.page.ts for those.
 *
 * Confirmed live on dev (2026-10-06):
 * - Structurally different from Company/Customer Master: both Create and
 *   Edit open as a modal `dialog` on top of the list (`page.url()` stays
 *   on the plain `/seasons` route throughout) — not a query-param view.
 * - "Customer" is NOT a fillable combobox — it's a "Pick a customer"
 *   button that opens a separate "Select Customer" grid-dialog (rows, not
 *   options/listbox — same shape as Vendor Master's Currency/Country
 *   pickers, but with its own top Search box plus a per-column filter
 *   textbox). Selecting a row auto-closes that picker and populates the
 *   parent field as "<Code> — <Name>".
 * - Customer and Season Code both lock (become disabled) immediately
 *   after the first save — only Description and Active stay editable in
 *   Edit Season.
 * - Edit Season exposes two destructive actions Create doesn't have:
 *   "Deactivate {code}" and "Delete {code}" (dynamic names, the season
 *   code is interpolated in). Delete opens a real `alertdialog`
 *   confirmation ("Delete {code}? This permanently deletes {code}. This
 *   action cannot be undone.") with Cancel/Delete.
 * - Two "Close" buttons exist on screen simultaneously (top + footer,
 *   same shape as Company/Customer/Vendor's double "Cancel") — both
 *   discard identically, `.first()` is enough. "Close" is this dialog's
 *   Cancel-equivalent; there is no button literally labeled "Cancel" on
 *   this particular dialog.
 */
export class CustomerSeasonFormLocators {
  readonly pickCustomerButton: Locator;
  readonly customerDisplay: Locator;
  readonly seasonCodeInput: Locator;
  readonly descriptionInput: Locator;
  readonly activeCheckbox: Locator;

  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly closeButton: Locator;
  readonly deactivateButton: Locator;
  readonly deleteButton: Locator;

  readonly deleteConfirmDialog: Locator;

  readonly customerPickerDialog: Locator;
  readonly customerPickerSearchInput: Locator;
  readonly customerPickerCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.pickCustomerButton = page.getByRole('button', { name: 'Pick a customer' });
    this.customerDisplay = page.getByRole('textbox', { name: 'Pick a customer' });
    this.seasonCodeInput = page.getByRole('textbox', { name: 'Season Code *', exact: true });
    this.descriptionInput = page.getByRole('textbox', { name: 'Description *', exact: true });
    this.activeCheckbox = page.getByRole('checkbox', { name: 'Active', exact: true });

    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.closeButton = page.getByRole('button', { name: 'Close', exact: true }).first();
    // Dynamic names, e.g. "Deactivate TCS463781" / "Delete TCS463781".
    this.deactivateButton = page.getByRole('button', { name: /^Deactivate / });
    this.deleteButton = page.getByRole('button', { name: /^Delete / });

    this.deleteConfirmDialog = page.getByRole('alertdialog', { name: /^Delete / });

    this.customerPickerDialog = page.getByRole('dialog', { name: 'Select Customer' });
    this.customerPickerSearchInput = this.customerPickerDialog.getByRole('textbox', {
      name: 'Search',
    });
    // Scoped Cancel for the picker itself — closing it this way (rather
    // than a global Escape keypress) avoids also closing the parent "New
    // Season"/"Edit Season" dialog underneath it (confirmed live: Escape
    // bubbles to both nested dialogs at once).
    this.customerPickerCancelButton = this.customerPickerDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
  }

  /** A row in the open "Select Customer" picker, matched by Customer Code and/or Name. */
  customerPickerRow(match: string | RegExp): Locator {
    return this.customerPickerDialog.getByRole('row').filter({ hasText: match });
  }

  /**
   * Real data rows only. The header row has `columnheader` cells, not
   * `gridcell`s, so filtering on `gridcell` excludes it — but the empty-
   * state "No customers found." row ALSO renders as a single `gridcell`
   * (confirmed live), so it has to be excluded by its own text too, or an
   * empty search result reads as "1 data row" instead of 0.
   */
  customerPickerDataRows(): Locator {
    return this.customerPickerDialog
      .getByRole('row')
      .filter({ has: this.page.getByRole('gridcell') })
      .filter({ hasNotText: 'No customers found.' });
  }

  confirmDeleteButton(): Locator {
    return this.deleteConfirmDialog.getByRole('button', { name: 'Delete', exact: true });
  }

  cancelDeleteButton(): Locator {
    return this.deleteConfirmDialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** The "Required" paragraph confirmed live to render as a `p` sibling following a field. */
  requiredErrorFor(fieldAnchor: Locator): Locator {
    return fieldAnchor.locator('xpath=following-sibling::p[1]');
  }
}
