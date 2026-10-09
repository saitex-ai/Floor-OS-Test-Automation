import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Attribute
 * Master screen, under Inventory Item Management
 * (/master-data/inventory-item-management/attribute-master). No actions or
 * assertions here, see src/pages/master-data/attribute-master.page.ts for
 * those.
 *
 * Confirmed directly against dev (2026-10-08) via real `ariaSnapshot()`
 * dumps and real create/edit round-trips (`TC-Attr-...`-prefixed) — this
 * screen, and the whole Inventory Item Management nav group, had zero prior
 * code/docs. See
 * test-cases/master-data/attribute-master/attribute-master-testcases.md for
 * the full narrative. Shape notes worth knowing before touching this file:
 *
 * - This is a **dialog-based** screen, not a routed one — "New Attribute"
 *   and clicking a row open a modal `dialog` ("New Attribute"/"Edit
 *   Attribute") with no URL change at all (confirmed live by watching
 *   `page.url()` stay on this same path through every flow). Closer in
 *   shape to UomLocators/TechpackTypeLocators than to Departments/Sites'
 *   routed create pages.
 * - "Item Category" is picked via a nested **grid-picker dialog** ("Select
 *   Item Category") shared with Product Service Master's own identical
 *   "Pick item category" field (confirmed live, same component) — an
 *   AG-grid-style grid of 174 real item categories with a per-column filter
 *   textbox. Selecting a row populates the parent field as
 *   `"<CODE> — <Description>"` and closes the picker.
 * - The visible label text next to each field ("Item Category *", "Data
 *   Type *") is a separate `<text>` node, NOT the field's own accessible
 *   name — confirmed live via `ariaSnapshot()`: the "Pick item category"
 *   textbox/button's accessible name is literally "Pick item category", and
 *   the Data Type combobox's accessible name IS "Data Type *" (inconsistent
 *   with the Item Category field, checked directly rather than assumed).
 * - The "Required" inline validation message renders as a `<p>` element
 *   (`paragraph: Required` in the aria snapshot), while the "Required"
 *   checkbox field has an adjacent plain-text "Required" label — both would
 *   match an unscoped `getByText('Required', { exact: true })`, so
 *   `requiredError` is scoped to `<p>` tags specifically to avoid matching
 *   the checkbox's own label.
 * - The "Active" checkbox is **always checked and disabled**, in both
 *   Create and Edit — confirmed live there is no way to uncheck it, and no
 *   other deactivate mechanism exists anywhere on this screen (no bulk
 *   action on row selection, no clickable Status cell) — see TC:13's "known
 *   gap" note in the test-cases file.
 * - Item Category becomes `[disabled]` (both the textbox and its button)
 *   once a record exists — confirmed live in Edit mode; Attribute Name and
 *   Data Type remain editable.
 */
export class AttributeMasterLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newAttributeButton: Locator;

  // New/Edit dialog (shared shape for both — only one open at a time)
  readonly dialog: Locator;
  readonly attributeIdInput: Locator;
  readonly pickItemCategoryButton: Locator;
  readonly pickItemCategoryInput: Locator;
  readonly attributeNameInput: Locator;
  readonly dataTypeCombobox: Locator;
  readonly activeCheckbox: Locator;
  readonly requiredCheckbox: Locator;
  readonly descFlagCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly requiredError: Locator;

  // Nested "Select Item Category" picker dialog
  readonly categoryPickerDialog: Locator;
  readonly categoryFilterInput: Locator;

  // Row-selection pill (confirmed live: no bulk action buttons ever appear in it — TC:13)
  readonly clearSelectionButton: Locator;
  readonly itemSelectedText: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Attribute Master' });
    this.searchInput = page.getByPlaceholder(/search by name, description/i);
    this.newAttributeButton = page.getByRole('button', { name: 'New Attribute' });

    this.dialog = page.getByRole('dialog', { name: /^(New Attribute|Edit Attribute)$/ });
    this.attributeIdInput = this.dialog.getByRole('textbox', { name: 'Attribute ID' });
    this.pickItemCategoryButton = this.dialog.getByRole('button', {
      name: 'Pick item category',
    });
    this.pickItemCategoryInput = this.dialog.getByRole('textbox', {
      name: 'Pick item category',
    });
    this.attributeNameInput = this.dialog.getByRole('textbox', { name: /^Attribute Name/ });
    this.dataTypeCombobox = this.dialog.getByRole('combobox', { name: 'Data Type *' });
    this.activeCheckbox = this.dialog.getByRole('checkbox', { name: 'Active', exact: true });
    this.requiredCheckbox = this.dialog.getByRole('checkbox', { name: 'Required', exact: true });
    this.descFlagCheckbox = this.dialog.getByRole('checkbox', { name: 'Desc Flag', exact: true });
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    // Scoped to <p> tags — see class doc on why an unscoped getByText would
    // also match the "Required" checkbox's own label text.
    this.requiredError = this.dialog.locator('p', { hasText: 'Required' });

    this.categoryPickerDialog = page.getByRole('dialog', { name: 'Select Item Category' });
    this.categoryFilterInput = this.categoryPickerDialog.getByRole('textbox', {
      name: 'Filter Category Code',
    });

    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.itemSelectedText = page.getByText(/item selected/i);

    // sonner can stack more than one toast — .first() avoids a strict-mode
    // failure when just checking "a toast is visible" (same convention as
    // CreateCustomerLocators.toast).
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** One of the All/Active/Inactive tab buttons, matched on its live count suffix. */
  tab(name: 'All' | 'Active' | 'Inactive'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name}\\s*\\d`) });
  }

  /** A list row anchored on its exact Attribute Name cell (same pattern as Departments' row()). */
  row(attributeName: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page
        .getByRole('cell')
        .filter({ hasText: new RegExp(`^${escapeRegExp(attributeName)}$`) }),
    });
  }

  /** The Status-column cell of a given row (last cell) — a plain read-only cell here, not a button (TC:13). */
  statusCell(attributeName: string): Locator {
    return this.row(attributeName).getByRole('cell').last();
  }

  /** The row-selection checkbox for a given attribute's row. */
  rowCheckbox(attributeName: string): Locator {
    return this.row(attributeName).getByRole('checkbox');
  }

  /** Any row whose text contains the given substring — used when the full cell value isn't known upfront (e.g. a long special-character name, where only a plain-text prefix is searched). */
  rowContainingText(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /**
   * A row inside the "Select Item Category" picker grid containing the
   * given Category Code.
   *
   * Confirmed live (2026-10-08, via a real automation failure + targeted
   * repro): this grid's `role="row"`/`role="gridcell"` elements are NOT in
   * a direct DOM ancestor/descendant relationship (the picker is a
   * virtualized AG-grid-style component, almost certainly wiring up
   * row/cell membership via `aria-owns` rather than real DOM nesting) — a
   * `.filter({ has: <gridcell locator> })` reliably finds 0 rows even when
   * the gridcell itself resolves fine on its own. `.filter({ hasText })`
   * works because it reads the row's own computed text rather than
   * checking DOM containment. Since the picker's own per-column "Filter
   * Category Code" textbox (used before this is called) already narrows
   * the grid to the one matching row, a plain substring `hasText` is safe
   * here — item category codes are unique 3-character values.
   */
  categoryPickerRow(categoryCode: string): Locator {
    return this.categoryPickerDialog.getByRole('row').filter({ hasText: categoryCode });
  }

  /** An option inside the open Data Type listbox popup. */
  dataTypeOption(name: string | RegExp): Locator {
    return this.page.getByRole('listbox').getByRole('option', { name });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
