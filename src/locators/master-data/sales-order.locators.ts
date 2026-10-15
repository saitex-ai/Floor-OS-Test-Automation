import { type Locator, type Page } from '@playwright/test';

/** Sales Order's Order Type values — SMS is the sample order, BULK the bulk order. */
export type SalesOrderType = 'SMS' | 'BULK';

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
 * - Customer / Season are buttons ("Search customers..." / "Search
 *   seasons...") that open a separate, unnamed `dialog` holding a
 *   `combobox` (type-to-search) and a `listbox "Suggestions"` whose options
 *   read "<Code> <Name>" (customers) or "<Code> <Description> <Code>"
 *   (seasons). A brand-new CRM Prospect is selectable straight away.
 * - Save shows a sonner toast "Sales order created." and closes the dialog.
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

  /** The type-to-search combobox inside the open Customer/Season picker popup. */
  readonly pickerSearchInput: Locator;
  readonly createdToast: Locator;

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

    this.pickerSearchInput = page.getByRole('dialog').last().getByRole('combobox');
    this.createdToast = page.getByText('Sales order created.', { exact: true });
  }

  orderTypeOption(type: SalesOrderType): Locator {
    return this.page.getByRole('option', { name: type, exact: true });
  }

  /** A suggestion in the open Customer/Season picker, matched by its leading code. */
  pickerOption(code: string): Locator {
    return this.page
      .getByRole('listbox', { name: 'Suggestions' })
      .getByRole('option', { name: new RegExp(`^${code} `) });
  }

  /** The list row for one order, matched by its (unique) description. */
  rowByText(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /** Cell n of a list row (0 = select checkbox, 1 = Order #, 2 = Order Type, ...). */
  rowCell(row: Locator, index: number): Locator {
    return row.getByRole('cell').nth(index);
  }
}
