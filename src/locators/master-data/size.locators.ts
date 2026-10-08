import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Size Master list
 * (/master-data/system-management/sizes) and its "New Size"/"Edit Size"
 * dialog. No actions or assertions here, see
 * src/pages/master-data/size.page.ts for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-06) via real
 * `ariaSnapshot()` dumps and real creates/edits/deactivates — not guessed.
 *
 * Unlike every other Master Data screen covered so far, a Size has **no
 * free-text fields at all**: Item Category, Inseam and Waist are each a
 * "Pick ..." button that opens its own searchable grid dialog ("Select
 * Item Category" / "Select Inseam" / "Select Waist" — a `role="grid"`
 * with `role="row"`s, not the cmdk-style button list Employees' Department
 * picker uses). Description is read-only and auto-derived from the chosen
 * Inseam/Waist (`"<InseamCode> - <WaistCode>"`) — it cannot be typed into.
 * The Create and Edit dialogs share the same field set, titled "New Size"
 * / "Edit Size" respectively; Item Category becomes disabled once a Size
 * exists (can't be changed after creation), Inseam/Waist stay editable.
 *
 * Known bug, confirmed live (see test-cases/master-data/size-master/
 * size-master-testcases.md TC:11): deactivating a Size calls a real
 * `DELETE /api/sizes/{code}` (activeFlag -> false) but the list's Status
 * column and Inactive tab never reflect it, even after a reload. The
 * "Deactivate" button also has no confirmation step at all (fires on the
 * first click) — unlike Unit of Measure's "Delete", which does confirm.
 */
export class SizeLocators {
  readonly heading: Locator;
  readonly newSizeButton: Locator;
  readonly searchInput: Locator;

  // Status tabs (label includes a live count, e.g. "Approved 139" — match
  // by prefix so the count doesn't need to be hardcoded).
  readonly allTab: Locator;
  readonly draftTab: Locator;
  readonly approvedTab: Locator;
  readonly inactiveTab: Locator;
  readonly rejectedTab: Locator;

  // "New Size" / "Edit Size" dialog — same field set either way.
  readonly formDialog: Locator;
  readonly sizeIdInput: Locator;
  readonly itemCategoryPickerButton: Locator;
  readonly inseamPickerButton: Locator;
  readonly waistPickerButton: Locator;
  // The read-only textbox showing the CURRENTLY selected value next to each
  // "Pick ..." button — same accessible name as the button, distinguished
  // by role. Used to verify a pick actually landed on the right option
  // (see SizePage's retry logic): confirmed live this is occasionally
  // necessary, not just defensive — a virtualized-list race can click a
  // row adjacent to the intended one even after waiting for the filtered
  // row count to stabilize.
  readonly itemCategoryValueInput: Locator;
  readonly inseamValueInput: Locator;
  readonly waistValueInput: Locator;
  readonly descriptionInput: Locator;
  readonly activeCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  /** Header action in the Edit dialog, e.g. "Deactivate SMC0007255". No confirm step (see class doc). */
  readonly deactivateButton: Locator;

  // The three lookup-picker dialogs opened by the buttons above.
  readonly itemCategoryPickerDialog: Locator;
  readonly inseamPickerDialog: Locator;
  readonly waistPickerDialog: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Size Master' });
    this.newSizeButton = page.getByRole('button', { name: 'New Size' });
    this.searchInput = page.getByPlaceholder(/search by code, name/i);

    this.allTab = page.getByRole('button', { name: /^All \d+/ });
    this.draftTab = page.getByRole('button', { name: /^Draft \d+/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved \d+/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+/ });
    this.rejectedTab = page.getByRole('button', { name: /^Rejected \d+/ });

    this.formDialog = page.getByRole('dialog', { name: /^(New Size|Edit Size)$/ });
    this.sizeIdInput = this.formDialog.getByRole('textbox', { name: 'Size ID' });
    this.itemCategoryPickerButton = this.formDialog.getByRole('button', {
      name: 'Pick item category',
    });
    this.inseamPickerButton = this.formDialog.getByRole('button', { name: 'Pick inseam' });
    this.waistPickerButton = this.formDialog.getByRole('button', { name: 'Pick waist' });
    this.itemCategoryValueInput = this.formDialog.getByRole('textbox', {
      name: 'Pick item category',
    });
    this.inseamValueInput = this.formDialog.getByRole('textbox', { name: 'Pick inseam' });
    this.waistValueInput = this.formDialog.getByRole('textbox', { name: 'Pick waist' });
    this.descriptionInput = this.formDialog.getByRole('textbox', { name: 'Description' });
    this.activeCheckbox = this.formDialog.getByRole('checkbox', { name: 'Active' });
    this.createButton = this.formDialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.formDialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.formDialog.getByRole('button', { name: 'Cancel', exact: true });
    this.deactivateButton = this.formDialog.getByRole('button', { name: /^Deactivate/ });

    this.itemCategoryPickerDialog = page.getByRole('dialog', { name: 'Select Item Category' });
    this.inseamPickerDialog = page.getByRole('dialog', { name: 'Select Inseam' });
    this.waistPickerDialog = page.getByRole('dialog', { name: 'Select Waist' });
  }

  /** Anchored on the exact Size-ID-column cell, same pattern as Departments' row(). */
  row(sizeId: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${sizeId}$`) }),
    });
  }

  /** The search box inside an open lookup-picker dialog (Item Category/Inseam/Waist). */
  pickerSearchInput(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: 'Search' });
  }

  /**
   * All data rows inside an open lookup-picker dialog's grid — deliberately
   * NOT text-filtered here; see SizePage.findExactPickerRow() for why
   * picking the right one needs an exact per-cell comparison done in page
   * code, not a `hasText`/`has` Locator filter. Three confirmed-live traps
   * with the tempting filter-based shortcuts, for whoever is tempted to
   * reintroduce one:
   *  - The header row is also `role="row"` and, for the Item Category
   *    picker specifically, its own column headers include the literal
   *    text "GMT Size" — so an unscoped `getByRole('row')` (no rowgroup
   *    scoping) risks matching the HEADER row before the real data row.
   *    Scoping to the second `rowgroup` (this grid always renders exactly
   *    two — header, then data) avoids that reliably.
   *  - A plain `hasText` substring filter on the whole row is not safe
   *    even for a specific-looking code like "W36": on a shared dev
   *    environment it can false-positive-match an unrelated row like
   *    "PW369 — PW MD Waist Alpha ..." (since "PW369" contains "W36").
   *  - A word-boundary-anchored regex doesn't fix that either — confirmed
   *    live, this grid's rows concatenate their cells' raw `textContent`
   *    with NO separating whitespace ("1GMTGarmentGI42...", not "1 GMT
   *    Garment..." — `ariaSnapshot()`'s own pretty-printing inserts those
   *    spaces, the real DOM text `hasText` matches against does not), so
   *    there's no real word boundary around a code there either.
   *  - `.filter({ has: dialog.getByRole('gridcell') })` resolves to zero
   *    rows outright (confirmed live), despite `dialog.getByRole('gridcell')`
   *    alone correctly finding them — this grid is virtualized and appears
   *    to wire up its accessibility tree with `aria-owns` rather than
   *    literal DOM nesting, which `has`'s containment check doesn't follow
   *    (though scoping `getByRole('gridcell')` directly off a specific
   *    row's own Locator, as findExactPickerRow() does, works fine).
   */
  pickerDataRows(dialog: Locator): Locator {
    return dialog.getByRole('rowgroup').nth(1).getByRole('row');
  }

  /** One of the dialog's inline "Required" validation messages. */
  requiredError(): Locator {
    return this.formDialog.getByText('Required', { exact: true });
  }
}
