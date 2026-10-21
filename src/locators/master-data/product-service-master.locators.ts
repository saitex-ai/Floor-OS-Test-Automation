import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Product
 * Service Master screen, under Inventory Item Management
 * (/master-data/inventory-item-management/product-service-master). No
 * actions or assertions here, see
 * src/pages/master-data/product-service-master.page.ts for those.
 *
 * Confirmed directly against dev (2026-10-08) via real `ariaSnapshot()`
 * dumps and real create/edit round-trips (`TC-ProdSvc-...`-prefixed) — see
 * test-cases/master-data/product-service-master/
 * product-service-master-testcases.md for the full narrative. This is the
 * simplest of the three Inventory Item Management screens: only two
 * genuinely required fields, no delete action anywhere, and — like
 * Attribute Master — no confirmed way to deactivate a record at all.
 *
 * Shape notes shared with AttributeMasterLocators (same component, see that
 * file's own doc for more detail):
 * - Dialog-based, not routed — "Add Service"/row-click open a modal
 *   `dialog` with no URL change.
 * - "Item Category" is picked via the exact same nested "Select Item
 *   Category" grid-picker dialog as Attribute Master, confirmed live to be
 *   the identical component (same 174-row grid, same per-column filter
 *   textboxes).
 * - The "Active" checkbox is always checked and disabled in both Create and
 *   Edit; Item Category becomes `[disabled]` once a record exists.
 */
export class ProductServiceMasterLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly addServiceButton: Locator;

  // Add/Edit dialog (shared shape for both — only one open at a time)
  readonly dialog: Locator;
  readonly productServiceIdInput: Locator;
  readonly pickItemCategoryButton: Locator;
  readonly pickItemCategoryInput: Locator;
  readonly descriptionInput: Locator;
  readonly activeCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly requiredError: Locator;

  // Nested "Select Item Category" picker dialog (identical component to Attribute Master's own)
  readonly categoryPickerDialog: Locator;
  readonly categoryFilterInput: Locator;

  // Row-selection pill (confirmed live: no bulk action buttons ever appear in it — TC:13)
  readonly clearSelectionButton: Locator;
  readonly itemSelectedText: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Product Service Master' });
    this.searchInput = page.getByPlaceholder(/search by service code or description/i);
    this.addServiceButton = page.getByRole('button', { name: 'Add Service' });

    this.dialog = page.getByRole('dialog', { name: /^(Add Service|Edit Service)$/ });
    this.productServiceIdInput = this.dialog.getByRole('textbox', {
      name: 'Product Service ID',
    });
    this.pickItemCategoryButton = this.dialog.getByRole('button', {
      name: 'Pick item category',
    });
    this.pickItemCategoryInput = this.dialog.getByRole('textbox', {
      name: 'Pick item category',
    });
    // Scoped to the dialog, not the page: the list grid behind it has its
    // own resizable-column handle aria-labeled "Resize Product Service
    // Description column", which substring-matches an unscoped
    // getByRole('textbox', { name: /Product Service Description/ }) and
    // would throw a strict-mode violation — same trap already documented on
    // Sample Request Creation / Techpack Type's own locators files.
    this.descriptionInput = this.dialog.getByRole('textbox', {
      name: /^Product Service Description/,
    });
    // Confirmed live (2026-10-08, via a real automation failure): unlike
    // Attribute Master's "Active" checkbox (which DOES carry that
    // accessible name), this screen's "Status" field renders an unnamed
    // checkbox with "Active" as a separate adjacent text node, not its
    // accessible name — `getByRole('checkbox', { name: 'Active' })` finds
    // nothing here and hangs for the full test timeout. This dialog has
    // exactly one checkbox total (no Required/Desc Flag fields like
    // Attribute Master), so selecting it positionally is safe.
    this.activeCheckbox = this.dialog.getByRole('checkbox');
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.requiredError = this.dialog.locator('p', { hasText: 'Required' });

    this.categoryPickerDialog = page.getByRole('dialog', { name: 'Select Item Category' });
    this.categoryFilterInput = this.categoryPickerDialog.getByRole('textbox', {
      name: 'Filter Category Code',
    });

    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.itemSelectedText = page.getByText(/item selected/i);

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** One of the All/Active/Inactive tab buttons, matched on its live count suffix. */
  tab(name: 'All' | 'Active' | 'Inactive'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name}\\s*\\d`) });
  }

  /** A list row anchored on its exact Product Service Description cell. */
  row(description: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page
        .getByRole('cell')
        .filter({ hasText: new RegExp(`^${escapeRegExp(description)}$`) }),
    });
  }

  /** The Status-column cell of a given row (last cell) — a plain read-only cell here, not a button (TC:13). */
  statusCell(description: string): Locator {
    return this.row(description).getByRole('cell').last();
  }

  rowCheckbox(description: string): Locator {
    return this.row(description).getByRole('checkbox');
  }

  /** Any row whose text contains the given substring — used when the full cell value isn't known upfront (e.g. a long special-character description, where only a plain-text prefix is searched). */
  rowContainingText(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /**
   * A row inside the "Select Item Category" picker grid containing the
   * given Category Code. `hasText` (not `.filter({ has: <gridcell> })`) on
   * purpose — confirmed live this grid's row/gridcell elements aren't true
   * DOM descendants (see AttributeMasterLocators.categoryPickerRow's
   * identical doc for the full root-cause writeup; this is the same
   * shared picker component). Safe as a plain substring: the column filter
   * already narrows the grid to the one matching row, and category codes
   * are unique 3-character values.
   */
  categoryPickerRow(categoryCode: string): Locator {
    return this.categoryPickerDialog.getByRole('row').filter({ hasText: categoryCode });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
