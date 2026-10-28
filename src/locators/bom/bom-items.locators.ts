import { type Locator, type Page } from '@playwright/test';

/** The split-type checkboxes on a BOM line, as their aria-labels read. */
export type BomSplitType =
  | 'Item-level split'
  | 'Inseam split'
  | 'Waist split'
  | 'GMT size set'
  | 'BPO split'
  | 'Destination split';

/**
 * Raw element locators for a BOM detail page's "B.O.M Items" table and the
 * dialogs it opens (Add line, edit reasons, delete, split details, thread
 * items, bulk paste, copy). No actions or assertions here, see
 * src/pages/bom/bom-items.page.ts for those.
 *
 * Every real item row carries a "Select <inventoryId>" checkbox (on an
 * editable BOM) and a "Delete <inventoryId>" button; category header rows
 * ("Fabric 1 line") have neither — rows are matched on the item code cell
 * instead, which works on a read-only (Approved) BOM too.
 */
export class BomItemsLocators {
  readonly itemsTable: Locator;
  readonly itemRows: Locator;
  /**
   * A line's Supplier cell reads "(required)" when it has no supplier (dev,
   * 2026-10-26). Costing Approve is refused for a BOM with such lines.
   */
  readonly supplierRequiredButtons: Locator;
  /** The "Not Allowed" dialog (uat since 2026-10-26; dev shows a toast instead). */
  readonly notAllowedDialog: Locator;
  readonly notAllowedOkButton: Locator;
  /** Open toasts (the shell's "Notifications" live region). */
  readonly toasts: Locator;
  // "Select a supplier" dialog (a line's Supplier cell)
  readonly supplierDialog: Locator;
  readonly supplierCombobox: Locator;
  readonly includeInactiveVendorsSwitch: Locator;
  readonly includeInactiveVendorsLabel: Locator;
  readonly supplierOptions: Locator;
  readonly categoryRows: Locator;
  readonly emptyState: Locator;
  readonly itemsFilter: Locator;

  // Staged edits footer ("1 change pending" / "Cancel" / "Save 1 change")
  readonly pendingChanges: Locator;
  readonly pendingBar: Locator;
  readonly saveChangesButton: Locator;
  readonly discardChangesButton: Locator;
  readonly discardDialog: Locator;

  // "Add line" → "Add Inventory Item" MDM picker
  readonly addInventoryDialog: Locator;
  readonly addInventorySearchBox: Locator;
  readonly addInventoryTable: Locator;
  readonly addInventoryFooter: Locator;
  readonly addSelectedButton: Locator;
  readonly addInventoryCloseButton: Locator;
  readonly confirmItemDialog: Locator;
  readonly confirmItemAddButton: Locator;
  readonly addItemsReviewDialog: Locator;

  // Inline description edit popover
  readonly editDescriptionDialog: Locator;
  readonly descriptionInput: Locator;
  readonly descriptionReasonInput: Locator;
  readonly descriptionSaveButton: Locator;
  readonly descriptionReasonHint: Locator;

  // "Edit BOM line" reason dialog (UOM / alternate code)
  readonly editLineDialog: Locator;
  readonly editLineReasonInput: Locator;
  readonly stageEditButton: Locator;

  readonly uomOptions: Locator;
  readonly editLineReasonError: Locator;

  readonly deleteLineDialog: Locator;
  readonly countryDialog: Locator;

  // Split details / thread items / bulk paste / copy dialogs
  readonly splitDetailsDialog: Locator;
  readonly splitDetailsDeleteButton: Locator;
  readonly splitDetailsDeactivateButton: Locator;
  readonly threadItemsDialog: Locator;
  readonly threadItemsSaveButton: Locator;
  readonly itemColumnHeaders: Locator;
  readonly bulkPasteDialog: Locator;
  readonly bulkPasteInput: Locator;
  readonly parseRowsButton: Locator;
  readonly copyBomDialog: Locator;
  readonly copySourceRows: Locator;
  readonly copySourceSearch: Locator;

  constructor(private readonly page: Page) {
    this.itemsTable = page.getByRole('main').getByRole('table').first();
    // Since uat's 2026-10-26 deploy the items table's rows sit in role
    // "rowgroup" elements, not <thead>/<tbody>, so rows are found by role
    // and content only: an item row is one with an "Item-level split"
    // checkbox, a category row is named "<category> N line(s)".
    this.itemColumnHeaders = this.itemsTable.getByRole('columnheader');
    this.itemRows = this.itemsTable
      .getByRole('row')
      .filter({ has: page.getByRole('checkbox', { name: 'Item-level split' }) });
    this.supplierRequiredButtons = this.itemRows.getByRole('button', {
      name: '(required)',
      exact: true,
    });
    this.categoryRows = this.itemsTable.getByRole('row', { name: /^.+ \d+ lines?$/ });
    this.emptyState = page.getByText('No items in this BOM');
    this.itemsFilter = page.getByRole('textbox', { name: 'Filter items, suppliers, codes…' });

    this.pendingChanges = page.getByText(/^\d+ changes? pending$/);
    this.saveChangesButton = page.getByRole('button', { name: /^Save \d+ changes?$/ });
    // The sticky footer holding the pending count and its two buttons —
    // .last() is the innermost element that contains both.
    this.pendingBar = page
      .locator('div')
      .filter({ has: this.pendingChanges })
      .filter({ has: this.saveChangesButton })
      .last();
    this.discardChangesButton = this.pendingBar.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.discardDialog = page.getByRole('dialog', { name: /Discard staged edits/ });

    this.addInventoryDialog = page.getByRole('dialog', { name: 'Add Inventory Item' });
    this.addInventorySearchBox = this.addInventoryDialog.getByRole('searchbox', {
      name: 'Search inventory',
    });
    this.addInventoryTable = this.addInventoryDialog.getByRole('table');
    this.addInventoryFooter = this.addInventoryDialog.getByRole('contentinfo');
    this.addSelectedButton = this.addInventoryDialog.getByRole('button', {
      name: /^Add Selected/,
    });
    this.addInventoryCloseButton = this.addInventoryDialog.getByRole('button', { name: 'Close' });
    this.confirmItemDialog = page.getByRole('dialog', { name: 'Confirm item' });
    this.confirmItemAddButton = this.confirmItemDialog.getByRole('button', { name: 'Add line' });
    this.addItemsReviewDialog = page.getByRole('dialog', { name: /^Add \d+ items$/ });

    this.editDescriptionDialog = page.getByRole('dialog', { name: 'Edit Description' });
    this.descriptionInput = this.editDescriptionDialog.getByRole('textbox', {
      name: 'Description',
      exact: true,
    });
    this.descriptionReasonInput = this.editDescriptionDialog.getByRole('textbox', {
      name: 'Description change reason',
    });
    this.descriptionSaveButton = this.editDescriptionDialog.getByRole('button', { name: 'Save' });
    this.descriptionReasonHint = this.editDescriptionDialog.getByText(
      'Save disabled until you record why.',
    );

    this.editLineDialog = page.getByRole('dialog', { name: 'Edit BOM line' });
    this.editLineReasonInput = this.editLineDialog.getByRole('textbox');
    this.stageEditButton = this.editLineDialog.getByRole('button', { name: 'Stage edit' });

    this.editLineReasonError = this.editLineDialog.getByText('Reason is required.');
    // The open UOM select's options (Radix renders them in a portal listbox).
    this.uomOptions = page.getByRole('listbox').getByRole('option');

    this.deleteLineDialog = page.getByRole('dialog', { name: 'Delete line' });
    this.countryDialog = page.getByRole('dialog', { name: /Select a country/ });
    this.notAllowedDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: 'Not Allowed' }) });
    this.notAllowedOkButton = this.notAllowedDialog.getByRole('button', {
      name: 'OK',
      exact: true,
    });
    this.toasts = page.getByRole('region', { name: /^Notifications/ }).getByRole('listitem');
    this.supplierDialog = page.getByRole('dialog', { name: 'Select a supplier' });
    this.supplierCombobox = this.supplierDialog.getByRole('combobox').first();
    this.includeInactiveVendorsSwitch = this.supplierDialog.getByRole('switch', {
      name: 'Include inactive vendors',
    });
    // The switch is a visually hidden input; its visible label is what toggles it.
    this.includeInactiveVendorsLabel = this.supplierDialog.getByText('Include inactive vendors', {
      exact: true,
    });
    this.supplierOptions = this.supplierDialog.getByRole('option');

    this.splitDetailsDialog = page.getByRole('dialog', { name: 'Split details' });
    this.splitDetailsDeleteButton = this.splitDetailsDialog.getByRole('button', {
      name: /^Delete \(\d+\)$/,
    });
    this.splitDetailsDeactivateButton = this.splitDetailsDialog.getByRole('button', {
      name: /^DeActive \(\d+\)$/,
    });
    this.threadItemsDialog = page.getByRole('dialog', { name: 'Thread items' });
    this.threadItemsSaveButton = this.threadItemsDialog.getByRole('button', {
      name: 'Save',
      exact: true,
    });
    this.bulkPasteDialog = page.getByRole('dialog', { name: 'Bulk paste BOM lines' });
    this.bulkPasteInput = this.bulkPasteDialog.getByRole('textbox').first();
    this.parseRowsButton = this.bulkPasteDialog.getByRole('button', { name: 'Parse rows' });
    this.copyBomDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /^Copy B\.O\.M/ }),
    });
    this.copySourceRows = this.copyBomDialog.getByRole('row', { name: /^Select row TP/ });
    this.copySourceSearch = this.copyBomDialog.getByRole('textbox', { name: 'Search source BOMs' });
  }

  /**
   * A BOM line's row by its inventory code (e.g. "FAB0000002"). Matched on
   * the code cell's start, not its whole name: once a line is edited the
   * same cell also carries an "Edited" provenance badge.
   */
  itemRow(inventoryId: string): Locator {
    return this.itemRows.filter({
      has: this.page.getByRole('cell', { name: new RegExp(`^${inventoryId}\\b`) }),
    });
  }

  /** A split-type (or other) checkbox on a given item row, e.g. "Waist split". */
  rowCheckbox(
    inventoryId: string,
    label: BomSplitType | 'Customer supplied' | 'Show barcode',
  ): Locator {
    return this.itemRow(inventoryId).getByRole('checkbox', { name: label, exact: true });
  }

  rowDeleteButton(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('button', { name: `Delete ${inventoryId}` });
  }

  /** The line's alternate-code button (first button in the row) — opens that line's split form. */
  rowAlternateCodeButton(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('button').first();
  }

  /** A line's split form, titled by its split type ("Item Level Split Screen Form", "Multi Combination Split", "GMT Size Split"). */
  splitFormDialog(title: string): Locator {
    return this.page.getByRole('dialog', { name: title });
  }

  rowEditDescriptionButton(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('button', { name: 'Edit Description' });
  }

  rowUomSelect(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('combobox');
  }

  rowRemarkInput(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('textbox');
  }

  /** The country cell of a line that can't be destination-split: "—", or "-" since uat's 2026-10-26 deploy. */
  rowNoCountryCell(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('cell', { name: /^[—-]$/ });
  }

  rowPickCountryButton(inventoryId: string): Locator {
    return this.itemRow(inventoryId).getByRole('button', { name: /^(Pick country|Select…)$/ });
  }

  /** The "Add Inventory Item" picker's row for one inventory code. */
  inventoryOptionRow(inventoryId: string): Locator {
    return this.addInventoryDialog.getByRole('row').filter({
      has: this.page.getByRole('checkbox', { name: `Select ${inventoryId}`, exact: true }),
    });
  }

  inventoryOptionCheckbox(inventoryId: string): Locator {
    return this.addInventoryDialog.getByRole('checkbox', {
      name: `Select ${inventoryId}`,
      exact: true,
    });
  }

  /**
   * A thread line's select checkbox in the "Thread items" workspace. Since
   * uat's 2026-10-26 deploy it's named by row number ("Select row 01"), so
   * the row is found by its code cell.
   */
  threadItemCheckbox(inventoryId: string): Locator {
    return this.threadItemsDialog
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: inventoryId, exact: true }) })
      .getByRole('checkbox', { name: /^Select (row \d+|THD)/ });
  }

  /** One option in the open UOM select. */
  uomOption(uom: string): Locator {
    return this.uomOptions.filter({ hasText: new RegExp(`^${uom}$`) });
  }

  /** A category header row in the items table, e.g. "Fabric 1 line". */
  categoryRow(category: string): Locator {
    return this.itemsTable.getByRole('row', { name: new RegExp(`^${category} \\d+ lines?$`) });
  }
}
