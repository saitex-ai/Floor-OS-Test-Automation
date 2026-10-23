import { type Locator, type Page } from '@playwright/test';

/** Sales Order's Order Type values — SMS is the sample order, BULK the bulk order. */
export type SalesOrderType = 'SMS' | 'BULK';

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Raw element locators for Master Data → Sales Order Management → Sales
 * Order (`/master-data/sales-order-management/sales-order`) — no actions or
 * assertions here, see src/pages/master-data/sales-order.page.ts.
 *
 * Confirmed live on dev (2026-10-15) via ariaSnapshot():
 * - List: heading "Sales Order", a `textbox "Search"` (placeholder
 *   "Search order #, description or customer…"), button "New Sales
 *   Order", and a table whose cells run: select checkbox, Order #, Order
 *   Type, Style Code, Fabric Code, Wash Code, Description, Status,
 *   Customer Code, Customer Brand, Season, Requested Date, Created At,
 *   Created By.
 * - "New Sales Order" opens `dialog "Sale Order Information"`. Its form
 *   labels are plain text, NOT associated with their inputs (every
 *   textbox/combobox is unnamed), so inputs are reached positionally or
 *   via the label's following input — see each locator's note.
 * - Order Type is the dialog's FIRST combobox (default "SMS"); it opens a
 *   `listbox` with `option "SMS"` / `option "BULK"`.
 * - Redesigned on dev (confirmed 2026-10-23): the dialog is now grouped
 *   into Order (Order Type *, Sample, Requested Date *, Status — default
 *   "On Hold"), Customer (Customer *, Season *, Customer Brand, Buyer PO
 *   Nbr, Currency, Order Company, Manufacturing Company) and Product
 *   (Style / Fabric / Wash Code, Description) sections. Order Type and
 *   Status are both comboboxes, so Order Type is still the FIRST one.
 * - Customer / Season are inline search fields: a button ("Search
 *   customers..." / "Search seasons...") that, once clicked, turns in place
 *   into a type-to-search combobox (placeholder "Search customers by code
 *   or name..." / "Search seasons by code or name...") — no separate picker
 *   dialog any more. Suggestions open in an unnamed popover `dialog` with a
 *   `listbox "Suggestions"` whose options read "<Name> <Code>" (customers)
 *   or "<Description> <Code>" (seasons) — the code is now LAST. After a pick
 *   the field shows a button with that same "<Name> <Code>" text. Season
 *   only lists the picked customer's seasons. A brand-new CRM Prospect is
 *   selectable straight away.
 * - Save shows a sonner toast "Sales order created." and closes the dialog.
 * - Deleting (confirmed on dev 2026-10-21, unchanged 2026-10-23): the Edit
 *   Sales Order dialog has no Delete; instead ticking a row's checkbox
 *   reveals a list-level "Delete" button, which opens `alertdialog "Delete
 *   sales order?"` (Cancel / Delete); the toast reads "Sales order deleted.".
 */
export class SalesOrderLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newSalesOrderButton: Locator;

  readonly dialog: Locator;
  readonly orderTypeCombobox: Locator;
  readonly customerPickerButton: Locator;
  readonly seasonPickerButton: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;

  /** Inline type-to-search inputs, shown once the matching button is clicked. */
  readonly customerSearchInput: Locator;
  readonly seasonSearchInput: Locator;
  readonly createdToast: Locator;

  /** List-level "Delete" — only rendered while at least one row is ticked. */
  readonly deleteSelectedButton: Locator;
  /** `alertdialog "Delete sales order?"`, shown after clicking deleteSelectedButton. */
  readonly deleteConfirmDialog: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sales Order', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.newSalesOrderButton = page.getByRole('button', { name: 'New Sales Order' });

    this.dialog = page.getByRole('dialog', { name: 'Sale Order Information' });
    this.orderTypeCombobox = this.dialog.getByRole('combobox').first();
    this.customerPickerButton = this.dialog.getByRole('button', { name: 'Search customers...' });
    this.seasonPickerButton = this.dialog.getByRole('button', { name: 'Search seasons...' });
    // Unlabelled input: the one right after the "Description" label text.
    this.descriptionInput = this.dialog
      .getByText('Description', { exact: true })
      .locator('xpath=following::*[self::input or self::textarea][1]');
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });

    this.customerSearchInput = this.dialog.getByPlaceholder('Search customers by code or name...');
    this.seasonSearchInput = this.dialog.getByPlaceholder('Search seasons by code or name...');
    this.createdToast = page.getByText('Sales order created.', { exact: true });

    this.deleteSelectedButton = page.getByRole('button', { name: 'Delete', exact: true });
    this.deleteConfirmDialog = page.getByRole('alertdialog');
  }

  orderTypeOption(type: SalesOrderType): Locator {
    return this.page.getByRole('option', { name: type, exact: true });
  }

  /** A suggestion in the open Customer/Season search, matched by its trailing code. */
  pickerOption(code: string): Locator {
    return this.page
      .getByRole('listbox', { name: 'Suggestions' })
      .getByRole('option', { name: new RegExp(` ${escapeRegExp(code)}$`) });
  }

  /** The Customer/Season field once a value is picked: a button reading "<Name> <Code>". */
  pickedValueButton(code: string): Locator {
    return this.dialog.getByRole('button', { name: new RegExp(` ${escapeRegExp(code)}$`) });
  }

  /** The list row for one order, matched by its (unique) description. */
  rowByText(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /** The select checkbox in a list row. */
  rowCheckbox(row: Locator): Locator {
    return row.getByRole('checkbox');
  }

  /** The confirm button inside deleteConfirmDialog. */
  confirmDeleteButton(): Locator {
    return this.deleteConfirmDialog.getByRole('button', { name: /^(Delete|Confirm)/ });
  }

  /** Cell n of a list row (0 = select checkbox, 1 = Order #, 2 = Order Type, ...). */
  rowCell(row: Locator, index: number): Locator {
    return row.getByRole('cell').nth(index);
  }
}
