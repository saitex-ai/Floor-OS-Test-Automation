import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Item Master list
 * (/master-data/inventory-item-management/item-master) and its
 * "New Item"/Edit full-page form. No actions or assertions here, see
 * src/pages/master-data/item-master.page.ts for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-08) — not guessed.
 * Under "Inventory Item Management", a nav group collapsed by default and
 * distinct from "System Management" (see
 * agent-notes/master-data-module.md). The richest of the three Inventory
 * Item Management masters covered this session — 11 General-tab fields (4
 * genuinely enforced beyond the obvious ones) plus 11 content tabs
 * alongside General (General/Subitem/Attributes/Product
 * Services/Packaging/Image/Wash/Fabric/Supplier/TDS File/MSDS File).
 *
 * Source of truth for test cases:
 * test-cases/master-data/item-master/item-master-testcases.md.
 *
 * Create is `?addToItemMaster=true` (a different query-param name from
 * Item Class/Company/Customer Master's `?create=true` — do not assume a
 * shared convention across Master Data screens); Edit is
 * `?edit={ItemID}`.
 *
 * Unlike Item Class Master, only one "Cancel" button exists here
 * (confirmed live via `getByRole('button', { name: 'Cancel', exact: true
 * })` resolving to exactly 1 element) — no `.last()` scoping needed.
 *
 * Confirmed live while automating this module: clicking Cancel with any
 * unsaved field changes present opens an "Unsaved changes" confirmation
 * (`Stay` / `Discard`) — not documented in the original exploration pass,
 * discovered only once a real Playwright `.click()` was attempted on a
 * dirty form. See ItemMasterPage.cancel(). Also: the Update button's own
 * accessible name changes based on its disabled state — see updateButton
 * below.
 */
export class ItemMasterLocators {
  readonly heading: Locator;
  readonly newItemButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly draftTab: Locator;
  readonly approvedTab: Locator;
  readonly inactiveTab: Locator;
  readonly mastersNeedingReviewHeading: Locator;
  readonly reviewButtons: Locator;

  // General tab.
  readonly generalTab: Locator;
  readonly subitemTab: Locator;
  readonly attributesTab: Locator;
  readonly productServicesTab: Locator;
  readonly packagingTab: Locator;
  readonly supplierTab: Locator;

  readonly inventoryIdDisplay: Locator;
  readonly alternateCodeInput: Locator;
  readonly descriptionInput: Locator;
  /** Always checked, genuinely disabled — see ItemMasterPage.isActiveFlagCheckboxDisabled(). */
  readonly activeFlagCheckbox: Locator;
  readonly stockItemCheckbox: Locator;
  readonly capitalizationCheckbox: Locator;

  readonly itemClassField: Locator;
  readonly itemCategoryField: Locator;
  readonly baseUnitField: Locator;
  readonly saleUnitField: Locator;
  readonly purchaseUnitField: Locator;

  readonly createButton: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;
  readonly deletePermanentlyButton: Locator;
  /** The "Discard" option on the "Unsaved changes" confirmation that Cancel opens when the form is dirty — see class doc. */
  readonly discardChangesButton: Locator;
  readonly stayOnFormButton: Locator;

  readonly itemClassPickerDialog: Locator;
  readonly itemCategoryPickerDialog: Locator;
  readonly baseUnitPickerDialog: Locator;
  readonly saleUnitPickerDialog: Locator;
  readonly purchaseUnitPickerDialog: Locator;

  readonly deleteConfirmDialog: Locator;

  readonly subitemEmptyStateMessage: Locator;
  readonly attributesGatedMessage: Locator;
  readonly productServicesGatedMessage: Locator;
  readonly supplierGatedMessage: Locator;

  readonly requiredFieldsToast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Item Master' });
    this.newItemButton = page.getByRole('button', { name: 'New Item', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    this.draftTab = page.getByRole('button', { name: /^Draft \d+$/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved \d+$/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+$/ });
    this.mastersNeedingReviewHeading = page.getByText('Masters needing review');
    this.reviewButtons = page.getByRole('button', { name: 'Review', exact: true });

    this.generalTab = page.getByRole('tab', { name: 'General', exact: true });
    this.subitemTab = page.getByRole('tab', { name: 'Subitem', exact: true });
    this.attributesTab = page.getByRole('tab', { name: 'Attributes', exact: true });
    this.productServicesTab = page.getByRole('tab', { name: 'Product Services', exact: true });
    this.packagingTab = page.getByRole('tab', { name: 'Packaging', exact: true });
    this.supplierTab = page.getByRole('tab', { name: 'Supplier', exact: true });

    // No accessible name on this field — it's the form's first textbox,
    // disabled, showing "< NEW >" before save and the real Item ID after.
    this.inventoryIdDisplay = page.getByRole('textbox').first();
    this.alternateCodeInput = page.getByPlaceholder('e.g., FAB-001');
    this.descriptionInput = page.getByPlaceholder('e.g., Cotton Fabric 60"');
    this.activeFlagCheckbox = page.getByRole('checkbox', { name: 'Active flag', exact: true });
    this.stockItemCheckbox = page.getByRole('checkbox', { name: 'Stock Item', exact: true });
    this.capitalizationCheckbox = page.getByRole('checkbox', {
      name: 'Capitalization',
      exact: true,
    });

    this.itemClassField = page.getByRole('textbox', { name: 'Item Class', exact: true });
    this.itemCategoryField = page.getByRole('textbox', { name: 'Item Category', exact: true });
    this.baseUnitField = page.getByRole('textbox', { name: 'Base Unit', exact: true });
    this.saleUnitField = page.getByRole('textbox', { name: 'Sale Unit', exact: true });
    this.purchaseUnitField = page.getByRole('textbox', { name: 'Purchase Unit', exact: true });

    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    // Confirmed live: this button's accessible name is NOT a stable
    // "Update" — while disabled (no change made yet since opening Edit),
    // its real accessible name is "No changes to save." (a tooltip-style
    // title that overrides the visible "Update" text for a11y purposes).
    // It only reports as "Update" once a real change enables it. Matching
    // both avoids a false "not found" right after opening Edit.
    this.updateButton = page.getByRole('button', { name: /^(Update|No changes to save\.)$/ });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.deletePermanentlyButton = page.getByRole('button', {
      name: 'Delete permanently',
      exact: true,
    });
    this.discardChangesButton = page.getByRole('button', { name: 'Discard', exact: true });
    this.stayOnFormButton = page.getByRole('button', { name: 'Stay', exact: true });

    this.itemClassPickerDialog = page.getByRole('dialog', { name: 'Select Item Class' });
    this.itemCategoryPickerDialog = page.getByRole('dialog', { name: 'Select Item Category' });
    this.baseUnitPickerDialog = page.getByRole('dialog', { name: 'Select Base Unit' });
    // Sale/Purchase Unit picker titles follow the same "Select {Field}"
    // pattern confirmed live for Item Class/Item Category/Base Unit — the
    // shared picker component is parameterized by field name — but these
    // two specific titles were not individually screenshotted this
    // session, only inferred by the confirmed pattern.
    this.saleUnitPickerDialog = page.getByRole('dialog', { name: 'Select Sale Unit' });
    this.purchaseUnitPickerDialog = page.getByRole('dialog', { name: 'Select Purchase Unit' });

    this.deleteConfirmDialog = page.getByRole('alertdialog');

    this.subitemEmptyStateMessage = page.getByText('No sub-items added yet.');
    this.attributesGatedMessage = page.getByText(
      'Select an Item Category first to load attributes.',
    );
    this.productServicesGatedMessage = page.getByText(
      'Select an Item Category on the General tab to load product services.',
    );
    this.supplierGatedMessage = page.getByText('Save the item first to manage suppliers.');

    this.requiredFieldsToast = page.getByText('Please fix the highlighted fields:');
  }

  /** A list row matched by an exact cell value (Item ID, Alternate Code, etc). */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /**
   * Confirmed live: the real last `cell` in this table is a trailing,
   * empty row-actions column — the table's own `columnheader`s confirm the
   * order is [select-checkbox, Item ID, Description, Alternate Code, Item
   * Category, Stock Type, Base Unit, **Status**, '' (actions)]. A naive
   * `.last()` silently resolves to that empty trailing cell instead of
   * Status — caught only by actually running this against the live table.
   * `.nth(-2)` (second-to-last) is Status.
   */
  statusCell(exactCellText: string): Locator {
    return this.row(exactCellText).getByRole('cell').nth(-2);
  }

  /** Real data rows only in any of the 5 picker dialogs — the header row's cells are `columnheader`, not `cell`. */
  pickerDataRows(pickerDialog: Locator): Locator {
    return pickerDialog.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
  }

  pickerRow(pickerDialog: Locator, match: string | RegExp): Locator {
    return pickerDialog.getByRole('row').filter({ hasText: match });
  }

  /** An exact inline "<Field> is required" message, e.g. "Alternate Code is required". */
  inlineRequiredError(fieldLabel: string): Locator {
    return this.page.getByText(`${fieldLabel} is required`, { exact: true });
  }

  /** The exact, interpolated create-success toast, e.g. "Inventory item CHEM0000010 created." */
  createdToast(itemId: string): Locator {
    return this.page.getByText(`Inventory item ${itemId} created.`, { exact: true });
  }
}
