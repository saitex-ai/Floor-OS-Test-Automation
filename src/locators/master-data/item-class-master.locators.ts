import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Item Class Master list
 * (/master-data/inventory-item-management/item-class-master) and its
 * "New Item Class"/"Edit Item Class" full-page form. No actions or
 * assertions here, see src/pages/master-data/item-class-master.page.ts
 * for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-08) — not guessed.
 * Under "Inventory Item Management", a nav group collapsed by default and
 * distinct from "System Management" (see
 * agent-notes/master-data-module.md).
 *
 * Source of truth for test cases: test-cases/master-data/item-class-master/
 * item-class-master-testcases.md — including a **confirmed-live, currently
 * broken Create flow** (every attempt returns a 409 `item_class_conflict`
 * from the backend's own ID generator) and the floating "Ask FloorOS AI"
 * launcher physically overlapping the sticky Create/Cancel footer at
 * standard desktop viewports (see ItemClassMasterPage's create()/save()).
 *
 * Create/Edit is a full-page, query-param view on the list's own route
 * (`?create=true` / `?edit={ItemClassCode}`), not a dialog — contrast with
 * Product Service Value Master's modal-dialog pattern.
 *
 * Locator trap, confirmed live: `getByRole('button', { name: 'Cancel' })`
 * without further scoping matches **two** elements — an icon-only
 * `aria-label="Cancel"` clear button belonging to the Stock Type picker
 * field, and the real full-text "Cancel" button in the form's bottom
 * action bar. `cancelButton` below is scoped to the latter via `.last()`
 * (DOM order confirmed: the icon button renders first).
 *
 * The Item Categories dual-list mover (Available/Selected) renders its
 * entries as plain, role-less `<div>`s (code + description text, no
 * `row`/`option`/`listitem` role) — confirmed live via a direct `innerHTML`
 * dump. `categoryEntry()` below locates them by their visible text
 * instead. The four move buttons DO have real `aria-label`s ("Add
 * selected" / "Add all" / "Remove selected" / "Remove all").
 */
export class ItemClassMasterLocators {
  readonly heading: Locator;
  readonly newItemClassButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // "New Item Class" / "Edit Item Class" full-page form — same field set either way.
  readonly prefixCodeInput: Locator;
  readonly pickStockTypeField: Locator;
  readonly descriptionInput: Locator;
  /** The form's only checkbox ("Active") — always checked, genuinely disabled, see ItemClassMasterPage.isActiveCheckboxDisabled(). */
  readonly activeCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  /** Scoped to the real bottom Cancel button — see class doc's locator trap note. */
  readonly cancelButton: Locator;

  readonly stockTypePickerDialog: Locator;

  readonly addSelectedCategoryButton: Locator;
  readonly addAllCategoriesButton: Locator;
  readonly removeSelectedCategoryButton: Locator;
  readonly removeAllCategoriesButton: Locator;
  readonly pickStockTypeFirstMessage: Locator;
  readonly selectAtLeastOneCategoryError: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Item Class Master' });
    this.newItemClassButton = page.getByRole('button', { name: 'New Item Class' });
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    this.activeTab = page.getByRole('button', { name: /^Active \d+$/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+$/ });

    this.prefixCodeInput = page.getByPlaceholder('APP');
    this.pickStockTypeField = page.getByRole('textbox', { name: 'Pick stock type' });
    this.descriptionInput = page.getByPlaceholder('Optional notes');
    this.activeCheckbox = page.getByRole('checkbox');
    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).last();

    this.stockTypePickerDialog = page.getByRole('dialog', { name: 'Select Stock Type' });

    this.addSelectedCategoryButton = page.getByRole('button', { name: 'Add selected' });
    this.addAllCategoriesButton = page.getByRole('button', { name: 'Add all' });
    this.removeSelectedCategoryButton = page.getByRole('button', { name: 'Remove selected' });
    this.removeAllCategoriesButton = page.getByRole('button', { name: 'Remove all' });
    this.pickStockTypeFirstMessage = page.getByText(
      'Pick a Stock Type first to load matching categories.',
    );
    this.selectAtLeastOneCategoryError = page.getByText('Select at least one item category.');
  }

  /** A list row matched by an exact cell value (Item Class Code, Prefix, etc). */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /**
   * Confirmed live: unlike Product Service Value Master, Status is NOT the
   * last cell here — the real column order (confirmed via the table's own
   * `columnheader`s) is Item Class Code, Stock Group Code, Stock Type
   * Code, Stock Type Description, Description, **Status**, Prefix, Stock
   * Group Description, with a leading row-select checkbox cell at index 0.
   * Status is cell index 6. A naive `.last()` silently resolves to "Stock
   * Group Description" instead — a real bug caught only by actually
   * running this against the live table, not by reading the list's own
   * visual column order.
   */
  statusCell(exactCellText: string): Locator {
    return this.row(exactCellText).getByRole('cell').nth(6);
  }

  /** A row in the open "Select Stock Type" picker, matched by code/description. */
  stockTypePickerRow(match: string | RegExp): Locator {
    return this.stockTypePickerDialog.getByRole('row').filter({ hasText: match });
  }

  /** Real data rows only — the header row's cells are `columnheader`, not `cell`. */
  stockTypePickerDataRows(): Locator {
    return this.stockTypePickerDialog
      .getByRole('row')
      .filter({ hasNot: this.page.getByRole('columnheader') });
  }

  /** A category entry in either the Available or Selected panel, matched by its code or description text (plain `<div>`s, no ARIA role — see class doc). */
  categoryEntry(match: string | RegExp): Locator {
    return this.page.getByText(match, { exact: false }).first();
  }

  /** The "Available Categories (n)" / "Selected Categories (n)" panel headings. */
  availableCategoriesHeading(): Locator {
    return this.page.getByText(/^Available Categories \(\d+\)$/);
  }

  /**
   * The first real entry in the Available Categories panel, regardless of
   * its code/description text — scoped via the heading's own sibling list
   * container (confirmed live DOM: the heading and the scrollable list of
   * entries are sibling `<div>`s under the same panel wrapper). Used as
   * the "pick any category" default instead of a page-wide `getByText`
   * with a loose regex, which would match the FIRST matching text
   * anywhere on the whole page (e.g. the page title), not a category
   * entry at all — a real bug this locator replaces.
   */
  firstAvailableCategoryEntry(): Locator {
    return this.availableCategoriesHeading()
      .locator('xpath=following-sibling::div[1]')
      .locator('> div')
      .first();
  }

  selectedCategoriesHeading(): Locator {
    return this.page.getByText(/^Selected Categories \(\d+\)$/);
  }

  noCategoriesForStockTypeMessage(): Locator {
    return this.page.getByText(/^No categories for stock type/);
  }
}
