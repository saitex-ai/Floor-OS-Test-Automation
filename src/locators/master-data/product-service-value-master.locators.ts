import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Product Service Value Master list
 * (/master-data/inventory-item-management/product-service-value-master)
 * and its "Add Value"/"Edit Value" dialog. No actions or assertions here,
 * see src/pages/master-data/product-service-value-master.page.ts for
 * those.
 *
 * Confirmed live against dev.flooros.app (2026-10-08) via real
 * `innerText()`/`inputValue()` dumps and real create/edit round-trips
 * (`TC-PSVal-`-prefixed) — not guessed. Under "Inventory Item Management",
 * a nav group collapsed by default and distinct from "System Management"
 * (see agent-notes/master-data-module.md) — `gotoAuthenticated()` straight
 * to the route works fine, no nav-expansion needed.
 *
 * Source of truth for test cases: test-cases/master-data/
 * product-service-value-master/product-service-value-master-testcases.md.
 *
 * Both "Add Value" and "Edit Value" open as a modal `dialog` on top of the
 * list (`page.url()` stays on the list route throughout) — same shape as
 * Customer Season Master's own dialog, not Company/Item Class/Item
 * Master's `?create=true` full-page pattern.
 *
 * Two fields share the identical placeholder "Auto-fetched" (Item Category
 * Code and Item Category Description) — deliberately not exposed as named
 * locators here since no test case needs to distinguish them; both are
 * disabled, auto-derived display fields anyway.
 *
 * Confirmed-live bug, asserted as-is (not worked around): the "Active"
 * checkbox is always checked and genuinely disabled (`disabled` DOM
 * property `true`, `pointer-events: none`) in both Create and Edit — see
 * ProductServiceValueMasterPage.isActiveCheckboxDisabled().
 */
export class ProductServiceValueMasterLocators {
  readonly heading: Locator;
  readonly addValueButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // "Add Value" / "Edit Value" dialog — same field set either way.
  readonly formDialog: Locator;
  /** The disabled "Value ID" display — literally "< NEW >" before save. No accessible name exists on this field, it's the dialog's first textbox. */
  readonly valueIdDisplay: Locator;
  /** Always checked, genuinely disabled — see class doc. The dialog's only checkbox, no accessible name needed. */
  readonly activeCheckbox: Locator;
  readonly pickProductServiceField: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  // "Select Product Service" picker, opened from pickProductServiceField.
  readonly productServicePickerDialog: Locator;
  readonly productServicePickerSearchInput: Locator;
  readonly productServicePickerCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Product Service Value Master' });
    this.addValueButton = page.getByRole('button', { name: 'Add Value', exact: true });
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    this.activeTab = page.getByRole('button', { name: /^Active \d+$/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+$/ });

    this.formDialog = page.getByRole('dialog', { name: /^(Add Value|Edit Value)$/ });
    this.valueIdDisplay = this.formDialog.getByRole('textbox').first();
    this.activeCheckbox = this.formDialog.getByRole('checkbox');
    this.pickProductServiceField = this.formDialog.getByRole('textbox', {
      name: 'Pick product service',
    });
    this.descriptionInput = this.formDialog.getByPlaceholder('Medium wash');
    this.createButton = this.formDialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.formDialog.getByRole('button', {
      name: 'Save changes',
      exact: true,
    });
    this.cancelButton = this.formDialog.getByRole('button', { name: 'Cancel', exact: true });

    this.productServicePickerDialog = page.getByRole('dialog', { name: 'Select Product Service' });
    // The picker has exactly one textbox (its own Search field) — confirmed live.
    this.productServicePickerSearchInput = this.productServicePickerDialog.getByRole('textbox');
    this.productServicePickerCancelButton = this.productServicePickerDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
  }

  /** A list row matched by an exact cell value (Value ID, Product Service ID, or Description). */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /**
   * Confirmed live: unlike Item Class Master/Item Master's own tables
   * (both of which have Status sitting mid-row or hide a trailing empty
   * actions cell after it — see those locator files), this table's
   * `columnheader`s confirm Status genuinely IS the last cell here, so
   * `.last()` is correct as written. Documented explicitly since the other
   * two modules' identical-looking code was a real bug.
   */
  statusCell(exactCellText: string): Locator {
    return this.row(exactCellText).getByRole('cell').last();
  }

  /** A row in the open "Select Product Service" picker, matched by ID/description/category. */
  productServicePickerRow(match: string | RegExp): Locator {
    return this.productServicePickerDialog.getByRole('row').filter({ hasText: match });
  }

  /** Real data rows only in the picker — the header row's cells are `columnheader`, not `cell`. */
  productServicePickerDataRows(): Locator {
    return this.productServicePickerDialog
      .getByRole('row')
      .filter({ hasNot: this.page.getByRole('columnheader') });
  }
}
