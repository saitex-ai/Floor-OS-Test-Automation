import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Techpack
 * Type screen (/master-data/system-management/techpack-types). No actions
 * or assertions here, see src/pages/master-data/techpack-type.page.ts for
 * those.
 *
 * Confirmed directly against dev (2026-10-06) — this screen has no prior
 * code/docs, see test-cases/master-data/techpack-type/techpack-type-testcases.md
 * for the full narrative. A few shape notes worth knowing before touching
 * this file:
 *
 * - The "All/Draft/Approved/Inactive/Rejected" tabs are plain `button`s
 *   (confirmed via a full button-text dump, e.g. accessible name "Draft7"
 *   — label and live count concatenated with no space, no separate
 *   `role="tab"`), not real ARIA tabs. Matched by a `^name`-anchored
 *   regex so the trailing count digits don't need to be guessed.
 * - Code/Name are real `input#code`/`input#name` with a proper
 *   `<label for=...>` (confirmed via a live DOM dump), so getByLabel()
 *   works directly — no combobox-collision trap here, unlike
 *   Departments/Sites (see agent-notes/master-data-module.md).
 * - "Skip demand/forecast validation" is a Radix checkbox whose real
 *   `<input type="checkbox">` is `aria-hidden` and sits behind the dialog
 *   overlay — `locator('input[type="checkbox"]').check()` times out
 *   (confirmed live); use the `role="checkbox"` button instead.
 * - The dialog's header always renders a "Close" **icon** button
 *   (aria-label "Close", no visible text) alongside the footer's "Close"
 *   **text** button — both share the accessible name "Close", so a plain
 *   `getByRole('button', { name: 'Close' })` hits a strict-mode
 *   violation. `closeButton` below disambiguates by requiring visible
 *   text, which only the footer button has.
 * - The Edit modal's header carries "Deactivate <code>" / "Delete <code>"
 *   icon buttons for Approved/Inactive records (confirmed live: the
 *   button's own aria-label embeds the record's code) — matched here by
 *   attribute prefix so callers don't need to pass the code in twice.
 *   Draft records' "Review" modal does NOT show these icons; it shows
 *   extra "Reject"/"Approve & make active" buttons in the footer instead
 *   (see rejectButton/approveAndMakeActiveButton) — confirmed live by
 *   opening TECHPACK11's Review modal, not exercised to completion to
 *   avoid corrupting seeded data (see the test-cases file's Notes).
 */
export class TechpackTypeLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newTechpackTypeButton: Locator;
  readonly emptyState: Locator;

  // New/Edit dialog (shared shape/ids for both — only one open at a time)
  readonly dialog: Locator;
  readonly codeInput: Locator;
  readonly nameInput: Locator;
  readonly skipDemandValidationCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly closeButton: Locator;
  readonly requiredError: Locator;
  readonly rejectButton: Locator;
  readonly approveAndMakeActiveButton: Locator;

  // Edit-modal-only header icon actions (Approved/Inactive records)
  readonly deactivateIconButton: Locator;
  readonly deleteIconButton: Locator;

  // Nested "Delete <code>?" confirmation dialog
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteConfirmCancelButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Techpack Type' });
    this.searchInput = page.getByPlaceholder(/search by code or name/i);
    this.newTechpackTypeButton = page.getByRole('button', { name: 'New Techpack Type' });
    this.emptyState = page.getByText('No techpack types yet.');

    this.dialog = page.getByRole('dialog').first();
    // Scoped to the dialog, not the page: the list grid behind it has its
    // own resizable-column handles aria-labeled "Resize Code column" /
    // "Resize Name column", which substring-match an unscoped
    // getByLabel('Code')/getByLabel('Name') and throw a strict-mode
    // violation (confirmed on the sibling Sample Request Creation screen's
    // identical shared-grid component — same risk here, fixed proactively).
    this.codeInput = this.dialog.getByLabel('Code', { exact: false });
    this.nameInput = this.dialog.getByLabel('Name', { exact: false });
    this.skipDemandValidationCheckbox = page.getByRole('checkbox', {
      name: 'Skip demand/forecast validation',
    });
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    // Only the footer button has visible text "Close" — the header's icon
    // Close shares the same accessible name but no text node.
    this.closeButton = this.dialog
      .getByRole('button', { name: 'Close', exact: true })
      .filter({ hasText: 'Close' });
    this.requiredError = this.dialog.getByText('Required', { exact: true });
    this.rejectButton = this.dialog.getByRole('button', { name: 'Reject', exact: true });
    this.approveAndMakeActiveButton = this.dialog.getByRole('button', {
      name: 'Approve & make active',
    });

    this.deactivateIconButton = this.dialog.locator('button[aria-label^="Deactivate "]');
    this.deleteIconButton = this.dialog.locator('button[aria-label^="Delete "]');

    // Matched on the confirm dialog's own body copy ("This permanently
    // deletes <code>. This action cannot be undone.") rather than its
    // "Delete <code>?" heading — confirmed live more reliable than a
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
    // failure when just checking "a toast is visible" (same convention as
    // CreateCustomerLocators.toast).
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /**
   * One of the All/Draft/Approved/Inactive/Rejected tab buttons. The label
   * and live count render as adjacent `<span>`s with no visible gap (e.g.
   * "Draft7" on screen), but confirmed live the computed accessible name
   * joins them with a space ("Draft 7") — `\s*` tolerates either so this
   * doesn't re-break if that spacing ever changes.
   */
  tab(name: 'All' | 'Draft' | 'Approved' | 'Inactive' | 'Rejected'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name}\\s*\\d`) });
  }

  /** A list row anchored on its exact Code-column cell (same pattern as Departments' row()). */
  row(codeOrName: string | RegExp): Locator {
    const matcher =
      typeof codeOrName === 'string' ? new RegExp(`^${escapeRegExp(codeOrName)}$`) : codeOrName;
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: matcher }),
    });
  }

  /** The Status-column cell of a given row (last cell). */
  statusCell(codeOrName: string | RegExp): Locator {
    return this.row(codeOrName).getByRole('cell').last();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
