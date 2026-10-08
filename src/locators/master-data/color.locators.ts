import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Color Master list
 * (/master-data/system-management/colors) and its "New Color"/"Edit Color"
 * dialog. No actions or assertions here, see
 * src/pages/master-data/color.page.ts for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-06) via real
 * `ariaSnapshot()` dumps and a real create/edit/deactivate/reactivate
 * round-trip (`TC-Color-<timestamp>`) — not guessed.
 *
 * Color Code and Description are genuine free-text inputs (unlike Size
 * Master's lookup-only form); Item Category is the same "Pick item
 * category" grid-dialog picker Size Master uses. The Active-style toggle
 * here is a checkbox labelled **"Status"** (not "Active" — a real,
 * confirmed per-screen naming inconsistency vs. Size Master). Color Code
 * becomes disabled once a Color exists (can't be changed after creation);
 * Description and Item Category stay editable. The entered Color Code is
 * stored uppercased server-side and is NOT the real primary key — the
 * auto-generated "Color ID" (e.g. "CMC0000020") is.
 */
export class ColorLocators {
  readonly heading: Locator;
  readonly newColorButton: Locator;
  readonly searchInput: Locator;

  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // "New Color" / "Edit Color" dialog — same field set either way.
  readonly formDialog: Locator;
  readonly colorIdInput: Locator;
  readonly colorCodeInput: Locator;
  readonly descriptionInput: Locator;
  readonly itemCategoryPickerButton: Locator;
  /** The read-only textbox showing the currently-selected category — see ColorPage.pickItemCategory()'s retry logic. */
  readonly itemCategoryValueInput: Locator;
  readonly statusCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  /** Header action in the Edit dialog, e.g. "Deactivate CMC0000020". */
  readonly deactivateButton: Locator;

  readonly itemCategoryPickerDialog: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Color Master' });
    this.newColorButton = page.getByRole('button', { name: 'New Color' });
    this.searchInput = page.getByPlaceholder(/search by code, name/i);

    this.allTab = page.getByRole('button', { name: /^All \d+/ });
    this.activeTab = page.getByRole('button', { name: /^Active \d+/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+/ });

    this.formDialog = page.getByRole('dialog', { name: /^(New Color|Edit Color)$/ });
    this.colorIdInput = this.formDialog.getByRole('textbox', { name: 'Color ID' });
    // Accessible name includes the literal "*" this form renders for
    // required fields (confirmed live) — matched loosely via regex so a
    // future copy tweak to the asterisk doesn't silently break every test.
    this.colorCodeInput = this.formDialog.getByRole('textbox', { name: /^Color Code/ });
    this.descriptionInput = this.formDialog.getByRole('textbox', { name: /^Description/ });
    this.itemCategoryPickerButton = this.formDialog.getByRole('button', {
      name: 'Pick item category',
    });
    this.itemCategoryValueInput = this.formDialog.getByRole('textbox', {
      name: 'Pick item category',
    });
    this.statusCheckbox = this.formDialog.getByRole('checkbox', { name: 'Status' });
    this.createButton = this.formDialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.formDialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.formDialog.getByRole('button', { name: 'Cancel', exact: true });
    this.deactivateButton = this.formDialog.getByRole('button', { name: /^Deactivate/ });

    this.itemCategoryPickerDialog = page.getByRole('dialog', { name: 'Select Item Category' });
  }

  /** Anchored on the exact Color-ID-column cell, same pattern as Departments' row(). */
  row(colorId: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${colorId}$`) }),
    });
  }

  pickerSearchInput(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: 'Search' });
  }

  /**
   * All data rows inside the open Item Category picker dialog — see
   * size.locators.ts's `pickerDataRows()` (same shared dialog) for the
   * full confirmed-live reasoning on why this is deliberately NOT
   * text-filtered here: neither a `hasText` substring filter (collides
   * with unrelated records on a shared dev environment, e.g. "W36"
   * matching inside "PW369"), nor a word-boundary regex (this grid's rows
   * have no real whitespace between concatenated cells), nor
   * `.filter({ has: dialog.getByRole('gridcell') })` (resolves to zero
   * rows — this grid's accessibility tree isn't literal DOM nesting) are
   * reliable ways to pick the right row. ColorPage.pickItemCategory() does
   * an exact per-cell comparison in page code instead.
   */
  pickerDataRows(dialog: Locator): Locator {
    return dialog.getByRole('rowgroup').nth(1).getByRole('row');
  }

  requiredError(): Locator {
    return this.formDialog.getByText('Required', { exact: true });
  }

  /**
   * A data row on the main (non-picker) list grid whose text contains
   * `text` — e.g. the uppercased Color Code or an updated Description.
   * Safe to filter by `hasText` here (unlike the Item Category picker's
   * pickerDataRows() — see that method's doc): the codes/descriptions this
   * is used with are specific enough not to collide with an unrelated row.
   */
  rowContainingText(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }
}
