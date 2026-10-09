import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Sample
 * Request Creation screen
 * (/master-data/system-management/sample-request-creation). No actions or
 * assertions here, see
 * src/pages/master-data/sample-request-creation.page.ts for those.
 *
 * Confirmed directly against dev (2026-10-06) via a live DOM dump — this
 * screen has no prior code/docs, see
 * test-cases/master-data/sample-request-creation/sample-request-creation-testcases.md
 * for the full narrative. Shape notes worth knowing before touching this
 * file:
 *
 * - Request ID and Sample Request Name are real `input#sr-request-id` /
 *   `input#sr-name` with a proper `<label for=...>` — getByLabel() works.
 * - Customer/Season/Company are **not** real `role="combobox"` elements
 *   and their `<label>` has **no** `for`/`aria-labelledby` link to the
 *   trigger button at all (confirmed via a live DOM dump) — getByLabel()
 *   silently fails to find them. They're instead plain
 *   `<button aria-haspopup="listbox">` elements, always exactly 3 of them
 *   in this fixed order (Customer, Season, Company) — matched positionally
 *   via that shared attribute, which is the only stable, non-styling hook
 *   available. Clicking one opens a cmdk-style search popup that itself
 *   renders inside a second, nested `role="dialog"` (same two-dialog shape
 *   CreateCustomerPage's selectComboboxOption() already handles for CRM).
 * - Selecting a Customer **resets** the Season trigger back to its
 *   placeholder (confirmed live) — re-select Season after every Customer
 *   change.
 * - Once a request is saved, re-opening it for edit renders
 *   Customer/Season/Company as plain **disabled, read-only `<input>`**
 *   fields (not buttons) while the request is Draft, confirmed live via a
 *   DOM dump — only the Sample Request Name stays a live, fillable input.
 *   Posting the request (see postOrOpenToggle) flips them back into live,
 *   clickable buttons. editLockedHint's own text tells you which state
 *   you're in — check it rather than assuming.
 * - The Edit modal's single header icon toggles between "Post <code>"
 *   (on a Draft request) and "Open <code>" (on a Posted one) — confirmed
 *   live, no separate Activate/Deactivate pair like Techpack Type has.
 */
export class SampleRequestCreationLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly createNewButton: Locator;

  // New/Edit dialog (shared ids for both — only one open at a time)
  readonly dialog: Locator;
  readonly requestIdInput: Locator;
  readonly nameInput: Locator;
  readonly costingRequiredSwitch: Locator;
  readonly saveButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly editLockedHint: Locator;

  // Edit-modal-only header icon action — "Post <code>" / "Open <code>" (mutually exclusive)
  readonly postOrOpenToggle: Locator;
  readonly deleteIconButton: Locator;

  // Nested "Delete <code>?" confirmation dialog
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteConfirmCancelButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sample Request Creation' });
    this.searchInput = page.getByPlaceholder(/search by sr code, name, customer, season/i);
    this.createNewButton = page.getByRole('button', { name: 'Create New' });

    this.dialog = page.getByRole('dialog').first();
    // Scoped to the dialog, not the page: the list grid behind it has its
    // own resizable-column handle aria-labeled "Resize Sample Request Name
    // column", which substring-matches an unscoped getByLabel('Sample
    // Request Name') and throws a strict-mode violation (confirmed live —
    // the handle stays in the DOM, just visually hidden under the dialog
    // overlay).
    this.requestIdInput = this.dialog.getByLabel('Request ID');
    this.nameInput = this.dialog.getByLabel('Sample Request Name', { exact: false });
    this.costingRequiredSwitch = page.getByRole('switch', { name: /Costing required/ });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.editLockedHint = this.dialog.getByText(
      /Customer, Season & Company are locked for a draft request\.|This request is Posted/,
    );

    this.postOrOpenToggle = this.dialog.locator(
      'button[aria-label^="Post "], button[aria-label^="Open "]',
    );
    this.deleteIconButton = this.dialog.locator('button[aria-label^="Delete "]');

    // Matched on the confirm dialog's own body copy rather than its
    // "Delete <code>?" heading — confirmed live (on the sibling Techpack
    // Type screen's identical confirm-dialog shape) more reliable than a
    // heading-anchored regex against Playwright's full-text `hasText`
    // matching semantics.
    // Confirmed live: this confirmation renders as role="alertdialog", not
    // "dialog" (same pattern already found on Customer Percentage's own
    // delete confirmation — see that locators file).
    this.deleteConfirmDialog = page.getByRole('alertdialog').filter({ hasText: /permanently deletes/i });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
    this.deleteConfirmCancelButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Cancel',
    });

    // sonner can stack more than one toast — .first() avoids a strict-mode
    // failure when just checking "a toast is visible".
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /**
   * The Customer/Season/Company trigger buttons, in their fixed DOM order
   * (0 = Customer, 1 = Season, 2 = Company) — see the class doc for why
   * positional selection is the only robust option here.
   */
  pickerTrigger(field: 'customer' | 'season' | 'company'): Locator {
    const index = { customer: 0, season: 1, company: 2 }[field];
    return this.dialog.locator('button[aria-haspopup="listbox"]').nth(index);
  }

  /**
   * The Customer/Season/Company field's read-only value, while the request
   * is Draft-locked. Index 0 among `input[readonly][disabled]` is Request
   * ID itself (also always readonly+disabled) — confirmed via a live DOM
   * dump — so Customer/Season/Company start at index 1, not 0.
   */
  lockedValue(field: 'customer' | 'season' | 'company'): Locator {
    const index = { customer: 1, season: 2, company: 3 }[field];
    return this.dialog.locator('input[readonly][disabled]').nth(index);
  }

  /** An option inside whichever picker popup is currently open (works whether or not it's dialog-wrapped). */
  pickerOption(name: string | RegExp): Locator {
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name });
    const anywhere = this.page.getByRole('option', { name });
    return inDialog.or(anywhere);
  }

  /** A list row anchored on any cell containing the given SR code, name, customer, season or company text. */
  row(text: string | RegExp): Locator {
    const matcher = typeof text === 'string' ? new RegExp(escapeRegExp(text)) : text;
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: matcher }),
    });
  }

  /** The Status-column cell of a given row (last cell). */
  statusCell(text: string | RegExp): Locator {
    return this.row(text).getByRole('cell').last();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
