import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Customer Percentage" screen
 * (/master-data/system-management/customer-percentage) under Master Data
 * > System Management. No actions or assertions here, see
 * src/pages/master-data/customer-percentage.page.ts for those.
 *
 * Unlike Currency Rate / Currency Rate Buyer, this screen genuinely has
 * Create/Edit/Delete for the `master-data` test user, confirmed live by
 * actually creating/editing/deleting a real row — via an "Add Row" /
 * "Edit Row" modal dialog, not inline grid editing despite the
 * grid-like list. See
 * test-cases/master-data/customer-percentage/customer-percentage-testcases.md
 * for the full write-up this was built from.
 *
 * Locator traps, confirmed live, both need exact/scoped locators:
 * - `getByPlaceholder(/pick an item type/i)` matches BOTH the Item Type
 *   field (placeholder "Click to pick an item type…") and the Item
 *   Category field (placeholder "Pick an Item Type first…", before an
 *   Item Type is chosen) — use the clean, distinct `aria-label`s instead
 *   ("Pick item type" / "Pick item category", both `exact: true`).
 * - The dialog's header delete icon and footer "Close" button both
 *   resolve to an accessible name of "Close" when queried naively (the
 *   delete icon's own accessible name is actually "Delete `<Customer>` ·
 *   `<ItemType>`", confirmed via its `title` attribute, so matching that
 *   pattern avoids the collision entirely rather than relying on
 *   `.first()`/`.last()` positional guesses).
 *
 * Percentage number inputs have clean, stable `id`s (`#cutticket`,
 * `#needSheet`, `#costSheetInternal`, `#costSheetBuyer`) and real HTML5
 * `min=0 / max=100 / step=0.01` constraints, confirmed live via the
 * browser's own native validation tooltips — see
 * CustomerPercentagePage.getNativeValidationMessage().
 */
export class CustomerPercentageLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly addRowButton: Locator;
  readonly exportCsvButton: Locator;

  // Add Row / Edit Row dialog — shared field shape for both
  readonly dialog: Locator;
  readonly customerField: Locator;
  readonly itemTypeField: Locator;
  readonly itemCategoryField: Locator;
  readonly cutticketInput: Locator;
  readonly needSheetInput: Locator;
  readonly costSheetInternalInput: Locator;
  readonly costSheetBuyerInput: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly closeButton: Locator;
  readonly deleteIconButton: Locator;

  // Delete confirmation dialog (nested on top of Edit Row)
  readonly confirmDeleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // Shared "Select Customer" / item-type / item-category picker dialogs
  readonly customerPickerSearchInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Customer Percentage', exact: true });
    this.searchInput = page.getByPlaceholder(/search by customer code or item/i);
    this.addRowButton = page.getByRole('button', { name: 'Add Row' });
    this.exportCsvButton = page.getByRole('button', { name: 'Export CSV' });

    // Scoped to the LAST open dialog throughout — Add Row/Edit Row is
    // always the only dialog open except while a nested
    // customer/item-type/item-category picker or delete-confirm dialog
    // is also open on top of it, in which case callers use the
    // more-specific locators below instead.
    this.dialog = page.getByRole('dialog').last();

    this.customerField = page.getByRole('textbox', { name: 'Pick customer' });
    this.itemTypeField = page.getByRole('textbox', { name: 'Pick item type', exact: true });
    this.itemCategoryField = page.getByRole('textbox', {
      name: 'Pick item category',
      exact: true,
    });
    this.cutticketInput = page.locator('#cutticket');
    this.needSheetInput = page.locator('#needSheet');
    this.costSheetInternalInput = page.locator('#costSheetInternal');
    this.costSheetBuyerInput = page.locator('#costSheetBuyer');

    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    // Footer "Close" (not the header's X icon, which shares the same
    // accessible name "Close" but is a different, icon-only button) —
    // the footer one is a plain text button with no `title` attribute.
    this.closeButton = this.dialog.getByRole('button', { name: 'Close', exact: true }).last();
    this.deleteIconButton = this.dialog.getByRole('button', { name: /^Delete /, exact: false });

    // Confirmed live (2026-10-07): the delete-confirmation popup renders as
    // role="alertdialog", NOT role="dialog" — same pattern already noted in
    // src/locators/crm/create-customer.locators.ts for this app's
    // confirmation-style modals generally. getByRole('dialog') alone never
    // matches it (confirmed: resolves to 0 elements while the popup is
    // genuinely open and the Edit Row dialog still has role="dialog"
    // underneath it) — this was a real automation bug caught by actually
    // running the suite, not a documentation assumption.
    this.confirmDeleteDialog = page.getByRole('alertdialog').last();
    this.confirmDeleteButton = this.confirmDeleteDialog.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
    this.cancelDeleteButton = this.confirmDeleteDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });

    this.customerPickerSearchInput = page.getByPlaceholder(
      /search by code, name, prefix, country, or email/i,
    );
  }

  /** A data row in the Customer Percentage grid, matched by any visible cell text (e.g. a Customer code). */
  row(text: string | RegExp): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /** A row inside the open "Select Customer" / item-type / item-category picker dialog. */
  pickerRow(text: string | RegExp): Locator {
    return this.page.locator('tr', { hasText: text });
  }

  /** An inline "Required" validation message under a field in the open Add/Edit Row dialog. */
  requiredError(): Locator {
    return this.dialog.getByText('Required', { exact: true });
  }
}
