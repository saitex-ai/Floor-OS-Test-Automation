import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Additional Master" screen
 * (/master-data/inventory-item-management/additional-master). No actions or
 * assertions here, see src/pages/master-data/additional-master.page.ts for
 * those.
 *
 * Confirmed live against dev (2026-10-08) — see
 * test-cases/master-data/additional-master/additional-master-testcases.md
 * for the full narrative this page object is built from. Same general
 * dialog-based CRUD shape as Techpack Type (see techpack-type.locators.ts),
 * with a few real differences baked in below rather than assumed to match:
 *
 * - Code/Description are real inputs but `getByLabel('Code')` (unscoped,
 *   substring match) also matches the list grid's own "Resize Code column"
 *   button — confirmed live, a strict-mode violation. Every textbox here is
 *   scoped to the open dialog and matched by role + accessible name instead.
 * - There is no Active/Inactive switch anywhere on this form — unlike most
 *   other Master Data masters, the only lifecycle action is a genuine,
 *   permanent "Delete" (confirmed live: the record vanishes from both the
 *   All and Inactive tabs afterward, there is no soft-deactivate state).
 * - ID and Code both render `disabled` once a record is saved — only
 *   Description can be changed from the Edit dialog.
 */
export class AdditionalMasterLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newAdditionalButton: Locator;

  // New/Edit dialog (shared shape — only one open at a time)
  readonly dialog: Locator;
  readonly idInput: Locator;
  readonly codeInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly requiredError: Locator;

  // Edit-dialog-only "Delete <ID>" icon button and its nested confirmation
  readonly deleteButton: Locator;
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteConfirmCancelButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Additional Master' });
    this.searchInput = page.getByPlaceholder(/search by code, name/i);
    this.newAdditionalButton = page.getByRole('button', { name: 'New Additional' });

    this.dialog = page.getByRole('dialog');
    this.idInput = this.dialog.getByRole('textbox', { name: /^ID/ });
    // Scoped to the dialog, not the page — see class doc on the "Resize Code
    // column" grid-handle collision on an unscoped getByLabel('Code').
    this.codeInput = this.dialog.getByRole('textbox', { name: /^Code/ });
    this.descriptionInput = this.dialog.getByRole('textbox', { name: /^Description/ });
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.requiredError = this.dialog.getByText('Required', { exact: true });

    // Accessible name embeds the record's padded ID, e.g. "Delete ADD0000012"
    // — matched by prefix so callers don't need to pass the ID in twice.
    this.deleteButton = this.dialog.getByRole('button', { name: /^Delete ADD\d+/ });
    this.deleteConfirmDialog = page
      .getByRole('alertdialog')
      .filter({ hasText: /permanently deletes/i });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
    this.deleteConfirmCancelButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Cancel',
    });

    // sonner can stack more than one toast — .first() avoids a strict-mode
    // failure when just checking "a toast is visible" (same convention as
    // TechpackTypeLocators.toast / CreateCustomerLocators.toast).
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** One of the All/Active/Inactive tab buttons (label + live count concatenated with no visible gap). */
  tab(name: 'All' | 'Active' | 'Inactive'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name}\\s*\\d`) });
  }

  /** A list row anchored on its exact Code-column cell. */
  row(codeOrDescription: string | RegExp): Locator {
    const matcher =
      typeof codeOrDescription === 'string'
        ? new RegExp(`^${escapeRegExp(codeOrDescription)}$`)
        : codeOrDescription;
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: matcher }),
    });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
