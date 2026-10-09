import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Material Price Library" screen — the list
 * (/master-data/price-library), the "Add item" create form
 * (/master-data/price-library/new), and the per-(item, supplier) detail page
 * (/master-data/price-library/<ItemCode>/<SupplierCode>). All three live in
 * one locators class since they're one continuous flow, same as this
 * module's own page object. No actions or assertions here, see
 * src/pages/master-data/price-library.page.ts for those.
 *
 * Confirmed live against dev (2026-10-08) — see
 * test-cases/master-data/price-library/price-library-testcases.md for the
 * full narrative this is built from. A few real shapes worth knowing before
 * touching this file:
 *
 * - This module's route is `/master-data/price-library`, **not** nested
 *   under `/master-data/inventory-item-management/...` like its sibling
 *   modules — confirmed live, not a typo here.
 * - Item code / Supplier are live cmdk-style search comboboxes (sourced from
 *   the real Item Master / Vendor Master), not plain Radix selects — options
 *   render as `[cmdk-item]`s, not `role=option`s, same shape as Techpack's
 *   AI-mode pick-a-value fields and Employees' Department picker.
 * - Each price row's fields carry an "for entry N" suffix in their
 *   accessible name (e.g. "Price for entry 1") — correct only until a date
 *   is picked, at which point the Start/End date buttons' accessible name
 *   becomes the formatted date instead of "Start date"/"End date". Those two
 *   are therefore matched positionally (by column index within the row),
 *   not by name, so they keep working after a date is picked.
 * - The create form's submit button is "Confirm & save price" — not
 *   "Save"/"Create" like every other Master Data form in this repo.
 * - Confirmed live: this form gives **no toast at all** on success (just a
 *   silent redirect back to the list) and **no toast or inline error at
 *   all** on a real backend 409 duplicate-(item, supplier) conflict — see
 *   the page object's expectNoToastVisible()/the spec file for how that's
 *   asserted without inventing feedback that doesn't exist.
 */
export class PriceLibraryLocators {
  // ---- List -------------------------------------------------------------
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly addItemButton: Locator;
  readonly reviewButton: Locator;

  // ---- Add item / create form (full page, not a dialog) -----------------
  readonly itemCodeTrigger: Locator;
  readonly itemCategoryTrigger: Locator;
  readonly itemNameDisplay: Locator;
  readonly supplierTrigger: Locator;
  readonly cmdkSearchInput: Locator;
  readonly addPriceButton: Locator;
  readonly confirmAndSaveButton: Locator;
  readonly cancelLink: Locator;
  readonly chooseItemError: Locator;
  readonly chooseSupplierError: Locator;
  readonly startDateRequiredError: Locator;
  readonly todayDateOption: Locator;

  // ---- Detail page (/price-library/<ItemCode>/<SupplierCode>) -----------
  readonly allPriceRecordsLink: Locator;
  readonly itemDetailHeading: Locator;
  readonly pricesHeading: Locator;
  readonly whereUsedHeading: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Price Library', exact: true });
    this.searchInput = page.getByPlaceholder(/search by code, description, supplier/i);
    this.addItemButton = page.getByRole('button', { name: 'Add item' });
    this.reviewButton = page.getByRole('button', { name: 'Review', exact: true });

    this.itemCodeTrigger = page.getByRole('button', { name: /^Item code/ });
    this.itemCategoryTrigger = page.getByRole('button', { name: /^Item category/ });
    this.itemNameDisplay = page.getByRole('textbox', { name: /^Item name/ });
    this.supplierTrigger = page.getByRole('button', { name: /^Supplier/ });
    // The cmdk search box inside whichever picker popover is currently open.
    this.cmdkSearchInput = page.locator('[cmdk-input]').first();
    this.addPriceButton = page.getByRole('button', { name: 'Add price' });
    this.confirmAndSaveButton = page.getByRole('button', { name: 'Confirm & save price' });
    this.cancelLink = page.getByRole('link', { name: 'Cancel', exact: true });
    this.chooseItemError = page.getByText('Choose an item', { exact: true });
    this.chooseSupplierError = page.getByText('Choose a supplier', { exact: true });
    this.startDateRequiredError = page.getByText('Start date is required', { exact: true });
    this.todayDateOption = page.getByRole('button', { name: /^Today,/ });

    this.allPriceRecordsLink = page.getByRole('link', { name: 'All price records' });
    this.itemDetailHeading = page.getByRole('heading', { level: 1 });
    this.pricesHeading = page.getByRole('heading', { name: 'Prices', exact: true });
    this.whereUsedHeading = page.getByRole('heading', { name: 'Where Used', exact: true });

    // sonner can stack more than one toast — .first() avoids a strict-mode
    // failure when just checking "a toast is visible" (same convention as
    // TechpackTypeLocators.toast). Confirmed live this screen never actually
    // produces one on create success or on a duplicate conflict — see class
    // doc — so this is kept for completeness/future screens (Import, etc.),
    // not relied on by this module's own create-flow assertions.
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** One of the All/Active/"Expiring Soon"/Expired tab buttons (status is date-computed, not a manual toggle). */
  tab(name: 'All' | 'Active' | 'Expiring Soon' | 'Expired'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\s*\\d`) });
  }

  /** A list row anchored on its exact Item Code cell. */
  row(itemCode: string | RegExp): Locator {
    const matcher =
      typeof itemCode === 'string' ? new RegExp(`^${escapeRegExp(itemCode)}$`) : itemCode;
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: matcher }),
    });
  }

  /** A `[cmdk-item]` option inside whichever picker popover (Item code/Supplier) is currently open. */
  cmdkOption(name: string | RegExp): Locator {
    return this.page.locator('[cmdk-item]').filter({ hasText: name });
  }

  firstCmdkOption(): Locator {
    return this.page.locator('[cmdk-item]').first();
  }

  /**
   * The price-row `<tr>` for 1-based entry number `n`, matched **positionally**
   * (row index `n` — index 0 is always the column-header row), not via a
   * `hasText` filter on "entry N". Confirmed live that a `hasText` filter
   * doesn't work here: the increment/decrement stepper buttons are the only
   * elements whose accessible name embeds "entry N" (e.g. "Increase Price
   * for entry 1"), and those are icon-only buttons with no visible text —
   * `hasText` matches a locator's rendered text content, not descendants'
   * accessible names, so it never found anything (confirmed via a 0-match
   * debug run before this fix).
   */
  priceRow(n: number): Locator {
    return this.page.getByRole('row').nth(n);
  }

  priceInput(n: number): Locator {
    return this.priceRow(n).getByRole('textbox', { name: `Price for entry ${n}` });
  }

  freightChargesInput(n: number): Locator {
    return this.priceRow(n).getByRole('textbox', { name: `Freight charges for entry ${n}` });
  }

  otherChargesInput(n: number): Locator {
    return this.priceRow(n).getByRole('textbox', { name: `Other charges for entry ${n}` });
  }

  moqInput(n: number): Locator {
    return this.priceRow(n).getByRole('textbox', { name: `Minimum order quantity for entry ${n}` });
  }

  currencyCombobox(n: number): Locator {
    return this.priceRow(n).getByRole('combobox', { name: `Currency for entry ${n}`, exact: true });
  }

  customerCombobox(n: number): Locator {
    return this.priceRow(n).getByRole('combobox', { name: /customers/i });
  }

  /**
   * Start/End date trigger buttons, matched by column position (cells 0-8:
   * Price, Freight charges, Other charges, Currency, Start date, End date,
   * MOQ, Customer, Actions) rather than accessible name — the name stops
   * being "Start date"/"No end date" once a date is actually picked (see
   * class doc), so a name-based lookup would break immediately after use.
   */
  startDateTrigger(n: number): Locator {
    return this.priceRow(n).getByRole('cell').nth(4).getByRole('button');
  }

  endDateTrigger(n: number): Locator {
    return this.priceRow(n).getByRole('cell').nth(5).getByRole('button');
  }

  removePriceRowButton(n: number): Locator {
    return this.priceRow(n).getByRole('button', { name: `Remove price entry ${n}` });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
