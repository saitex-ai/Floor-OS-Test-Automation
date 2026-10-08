import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Unit of Measure list
 * (/master-data/system-management/uom) and its "New UoM"/"Edit UoM"
 * dialog. No actions or assertions here, see
 * src/pages/master-data/uom.page.ts for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-06) via real
 * `ariaSnapshot()` dumps and real create/edit/delete round-trips
 * (`Q####`-coded — the UoM Code field only allows 5 characters, too short
 * for a `TC-UOM-`/`PW MD UoM ` prefix) — not guessed.
 *
 * This is the simplest of the three Master Data screens covered this
 * session: just UoM Code (max 5 chars) + Description (max 20 chars), both
 * genuinely required, no Item Category, no Active/Status checkbox
 * anywhere. The UoM Code itself is the primary key (no separate
 * auto-generated ID, unlike Size/Color Master) and is disabled once a UoM
 * exists.
 *
 * Known, surprising-but-real behavior (see test-cases/master-data/
 * unit-of-measure/unit-of-measure-testcases.md TC:6): the Edit dialog's
 * lifecycle action is labelled **"Delete"**, not "Deactivate" — and it
 * really is a hard delete (a confirmation `alertdialog` first, then a real
 * `DELETE /api/uoms/{code}` that removes the record entirely, not a
 * soft-deactivate). The list's "Inactive" tab is effectively always 0 as a
 * result; there's no UI path that produces an inactive-but-kept UoM.
 */
export class UomLocators {
  readonly heading: Locator;
  readonly newUomButton: Locator;
  readonly searchInput: Locator;

  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // "New UoM" / "Edit UoM" dialog — same field set either way.
  readonly formDialog: Locator;
  readonly uomCodeInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  /** Header action in the Edit dialog, e.g. "Delete Q0723" — a real hard delete, see class doc. */
  readonly deleteButton: Locator;

  // Delete confirmation step — confirmed live as role="alertdialog", not "dialog".
  readonly confirmDeleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Unit of Measure' });
    this.newUomButton = page.getByRole('button', { name: 'New UoM' });
    this.searchInput = page.getByPlaceholder(/search by code, name/i);

    this.allTab = page.getByRole('button', { name: /^All \d+/ });
    this.activeTab = page.getByRole('button', { name: /^Active \d+/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+/ });

    this.formDialog = page.getByRole('dialog', { name: /^(New UoM|Edit UoM)$/ });
    this.uomCodeInput = this.formDialog.getByRole('textbox', { name: /^UoM Code/ });
    this.descriptionInput = this.formDialog.getByRole('textbox', { name: /^Description/ });
    this.createButton = this.formDialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.formDialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.formDialog.getByRole('button', { name: 'Cancel', exact: true });
    this.deleteButton = this.formDialog.getByRole('button', { name: /^Delete/ });

    this.confirmDeleteDialog = page.getByRole('alertdialog', { name: /^Delete/ });
    this.confirmDeleteButton = this.confirmDeleteDialog.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
    this.cancelDeleteButton = this.confirmDeleteDialog.getByRole('button', { name: 'Cancel' });
  }

  /** Anchored on the exact UoM-Code-column cell, same pattern as Departments' row(). */
  row(uomCode: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${uomCode}$`) }),
    });
  }

  requiredError(): Locator {
    return this.formDialog.getByText('Required', { exact: true });
  }
}
