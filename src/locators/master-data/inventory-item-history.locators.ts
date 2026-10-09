import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Inventory Item History" screen
 * (/master-data/inventory-item-management/inventory-item-history) and its
 * row-level "Update Inventory Item" view. No actions or assertions here,
 * see src/pages/master-data/inventory-item-history.page.ts for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-08): this screen is
 * genuinely NOT a pure read-only audit log (there is a real, working
 * Update form) but is also NOT full CRUD — the screen's own subtitle says
 * it exactly: "Click an item to update its Alternate Code and Item
 * Description and view its change history." No "New"/"Add" entry point
 * exists anywhere. Clicking a row navigates to `?edit=<InventoryID>` on
 * this SAME route (same shape as Company Master's `?create=true`/
 * `?edit=<code>` pattern) — there is no dialog wrapper for the Update
 * form, it's a full in-page view under the shared `<main>`.
 *
 * Locator trap, confirmed live: `getByRole('button', { name: 'Filters' })`
 * without `exact: true` also matches "Toggle cell filters" (a substring
 * collision) — same shape of trap as Currency Rate's own tab-name trap and
 * the combobox-name traps documented in
 * `agent-notes/master-data-module.md`.
 */
export class InventoryItemHistoryLocators {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly searchInput: Locator;
  readonly filtersButton: Locator;
  readonly toggleCellFiltersButton: Locator;
  readonly exportCsvButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly columnsPanel: Locator;
  readonly inventoryIdColumnHeader: Locator;
  readonly jumpToPageInput: Locator;

  // Row-level "Update Inventory Item" view — same route, `?edit=<id>`, no dialog.
  readonly updateHeading: Locator;
  readonly inventoryIdField: Locator;
  readonly alternateCodeInput: Locator;
  readonly itemDescriptionInput: Locator;
  readonly changeHistoryHeading: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Inventory Item History' });
    this.subtitle = page.getByText(
      'Click an item to update its Alternate Code and Item Description and view its change history.',
    );
    this.searchInput = page.getByPlaceholder(
      /search by inventory id, alternate code, or description/i,
    );
    this.filtersButton = page.getByRole('button', { name: 'Filters', exact: true });
    this.toggleCellFiltersButton = page.getByRole('button', { name: 'Toggle cell filters' });
    this.exportCsvButton = page.getByRole('button', { name: 'Export CSV' });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.columnsPanel = page.getByRole('dialog').filter({ hasText: 'Columns' });
    this.inventoryIdColumnHeader = page.getByRole('columnheader', { name: 'Inventory ID' });
    this.jumpToPageInput = page.getByRole('textbox', { name: /Jump to page/ });

    this.updateHeading = page.getByRole('heading', { name: 'Update Inventory Item' });
    this.inventoryIdField = page.getByRole('textbox', { name: 'Inventory ID', exact: true });
    this.alternateCodeInput = page.getByRole('textbox', { name: 'Alternate Code *', exact: true });
    this.itemDescriptionInput = page.getByRole('textbox', {
      name: 'Item Description *',
      exact: true,
    });
    this.changeHistoryHeading = page.getByRole('heading', { name: 'Change history' });
    this.updateButton = page.getByRole('button', { name: 'Update', exact: true });
    // Two "Cancel" buttons render on this view (one near the top, one next
    // to Update at the bottom) — confirmed live both discard identically,
    // same shape as Company Master's own two-Cancel-buttons quirk. `.first()`
    // is enough.
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).first();
  }

  /** A data row on the list grid whose Inventory ID cell exactly matches. */
  row(inventoryId: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${inventoryId}$`) }),
    });
  }

  /** Matches an inline validation message on the Update form, e.g. "Alternate Code is required". */
  fieldError(message: string | RegExp): Locator {
    return this.page.getByText(message);
  }
}
