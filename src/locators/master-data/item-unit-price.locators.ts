import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Item Unit Price (THD Master)" screen — the
 * revision list (/master-data/inventory-item-management/item-unit-price) and
 * a revision's own detail/edit page (same route, `?edit="<RevNo>"` query —
 * note the value is itself a JSON-quoted string). Both live in one locators
 * class since they're one continuous flow. No actions or assertions here,
 * see src/pages/master-data/item-unit-price.page.ts for those.
 *
 * Confirmed live against dev (2026-10-08) — see
 * test-cases/master-data/item-unit-price/item-unit-price-testcases.md for
 * the full narrative this is built from. This is a **revision ledger**, not
 * a flat master — a few real shapes worth knowing before touching this file:
 *
 * - A revision row's "Select row N" checkbox accessible name is the only
 *   reliable way to target a specific Rev No — the Rev No and Detail Count
 *   columns can both legitimately hold the same number (seed data has every
 *   revision at Detail Count 2), so matching on cell text alone is
 *   ambiguous.
 * - "New Revision" opens a confirmation dialog ("Open a new revision" /
 *   "Copies all detail rows from the most recently posted revision into the
 *   new one.", with a "Carry forward last posted prices" toggle defaulting
 *   on, and Cancel/"Create revision" buttons) — confirmed live on
 *   2026-10-09. **This supersedes an earlier finding from 2026-10-08** (see
 *   the test-case doc's own history) that clicking it was a silent no-op
 *   with no dialog at all; the dev app's behavior genuinely changed between
 *   those two sessions, re-confirmed by re-running the same steps live
 *   rather than assumed. Whether confirming this dialog while a revision is
 *   already Open actually succeeds or is blocked was deliberately not
 *   tested — see the page object's own doc on why.
 * - A Posted revision is read-only at the UI level: "Save details"/"Post
 *   revision"/"Add row" are not rendered at all (not merely disabled), and
 *   the Detail Prices section shows the plain text "This revision is posted
 *   and read-only" instead.
 * - Detail Prices row fields are matched **positionally** (by column index),
 *   not by accessible name, for Unit Price specifically — its accessible
 *   name is the field's own current value (e.g. "12.0000"), which obviously
 *   changes as soon as the value does, so a name-based lookup breaks itself
 *   on first use. Column order (0-based):  Customer Name(0), Inventory
 *   ID(1), Alternate Code(2), Item Description(3), Sub Item(4), Color ID(5),
 *   Color Code(6), Color(7), Size ID(8), Size(9), Currency(10), Unit
 *   Price(11), UOM(12), Supplier Code(13), Supplier Name(14), Remark(15),
 *   Actions(16).
 */
export class ItemUnitPriceLocators {
  // ---- List ---------------------------------------------------------------
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newRevisionButton: Locator;

  // ---- Revision detail/edit page ------------------------------------------
  readonly revisionHeading: Locator;
  readonly statusBadge: Locator;
  readonly addItemsButton: Locator;
  readonly uploadButton: Locator;
  readonly addRowButton: Locator;
  readonly saveDetailsButton: Locator;
  readonly postRevisionButton: Locator;
  readonly closeButton: Locator;
  readonly readOnlyMessage: Locator;
  readonly detailPricesHeading: Locator;
  readonly requiredRowFieldsToast: Locator;

  // ---- "Add THD items" bulk picker dialog ---------------------------------
  readonly addItemsDialog: Locator;
  readonly addItemsSearchInput: Locator;

  // ---- "Open a new revision" confirmation dialog (New Revision button) ----
  readonly newRevisionDialog: Locator;
  readonly carryForwardPricesToggle: Locator;
  readonly newRevisionCancelButton: Locator;
  readonly newRevisionCreateButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Item Unit Price (THD Master)' });
    this.searchInput = page.getByPlaceholder(/search revisions/i);
    this.newRevisionButton = page.getByRole('button', { name: 'New Revision' });

    this.revisionHeading = page.getByRole('heading', { name: /^Rev \d+$/ });
    this.statusBadge = page.getByText(/^(Open|Posted)$/, { exact: true }).first();
    this.addItemsButton = page.getByRole('button', { name: 'Add Items' });
    this.uploadButton = page.getByRole('button', { name: 'Upload' });
    this.addRowButton = page.getByRole('button', { name: 'Add row' });
    this.saveDetailsButton = page.getByRole('button', { name: 'Save details' });
    this.postRevisionButton = page.getByRole('button', { name: 'Post revision' });
    // Two "Close" buttons render on a revision's detail page (confirmed
    // live) — the first is sufficient for "navigate back" actions.
    this.closeButton = page.getByRole('button', { name: 'Close', exact: true }).first();
    // Confirmed live via a failure screenshot: the real text carries a
    // trailing period ("...read-only."), dropped in this module's own
    // test-case doc when first transcribed — fixed here to match reality.
    this.readOnlyMessage = page.getByText('This revision is posted and read-only.', {
      exact: true,
    });
    this.detailPricesHeading = page.getByRole('heading', { name: 'Detail Prices', exact: true });
    this.requiredRowFieldsToast = page.getByText(
      'Each row needs an item, currency, UOM, and vendor before it can be saved.',
      { exact: true },
    );

    this.addItemsDialog = page.getByRole('dialog', { name: 'Add THD items' });
    this.addItemsSearchInput = this.addItemsDialog.getByRole('textbox', {
      name: /search by id, description/i,
    });

    // Matched across both `dialog` and `alertdialog` roles, by body text
    // rather than an exact accessible-name — confirmed live that neither
    // `getByRole('dialog', { name: 'Open a new revision' })` nor a plain
    // `getByRole('dialog').filter({ hasText: ... })` finds it even while
    // clearly on screen (via a failure screenshot). This is a
    // confirmation-style dialog (Cancel/"Create revision"), and this app's
    // other confirmation-style popups render as `role="alertdialog"`, not
    // `role="dialog"` (e.g. TechpackTypeLocators' own deleteConfirmDialog,
    // Additional Master's delete confirmation) — same shape of trap,
    // confirmed here too rather than assumed.
    this.newRevisionDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Open a new revision' });
    this.carryForwardPricesToggle = this.newRevisionDialog.getByRole('switch', {
      name: 'Carry forward last posted prices',
    });
    this.newRevisionCancelButton = this.newRevisionDialog.getByRole('button', { name: 'Cancel' });
    this.newRevisionCreateButton = this.newRevisionDialog.getByRole('button', {
      name: 'Create revision',
    });

    // sonner can stack more than one toast — .first() avoids a strict-mode
    // failure when just checking "a toast is visible" (same convention as
    // TechpackTypeLocators.toast).
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** A revision row, found via its "Select row N" checkbox — the only unambiguous way to target a Rev No (see class doc). */
  row(revNo: number): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('checkbox', { name: `Select row ${revNo}` }),
    });
  }

  statusCell(revNo: number): Locator {
    return this.row(revNo).getByRole('cell').nth(2);
  }

  /** All Detail Prices rows except the header (the table's own first `row`). */
  detailRows(): Locator {
    return this.page.getByRole('table').getByRole('row');
  }

  /** The most recently appended Detail Prices row — "Add row" always appends at the end. */
  lastDetailRow(): Locator {
    return this.detailRows().last();
  }

  /** The first real data row (index 0 is the header row). */
  firstDetailRow(): Locator {
    return this.detailRows().nth(1);
  }

  /** The Unit Price textbox within a given Detail Prices row, matched positionally — see class doc on why. */
  unitPriceInput(row: Locator): Locator {
    return row.getByRole('cell').nth(11).getByRole('textbox');
  }

  removeButtonInRow(row: Locator): Locator {
    return row.getByRole('button', { name: 'Remove' });
  }

  addItemsRowCheckbox(inventoryId: string | RegExp): Locator {
    return this.addItemsDialog.getByRole('checkbox', { name: new RegExp(`Select ${inventoryId}`) });
  }
}
