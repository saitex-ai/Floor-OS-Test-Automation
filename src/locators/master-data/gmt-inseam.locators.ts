import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for GMT Inseam Master
 * (/master-data/system-management/gmt-inseam) — both the list and its
 * Create/Edit dialog live in one file here, unlike Vendor Master's
 * separate list/form files. Confirmed live on dev (2026-10-06): this is a
 * much simpler lookup-value master (just Code + Description), and
 * Create/Edit renders as a centered modal `dialog` ("New Inseam" /
 * "Edit Inseam"), not a side drawer keyed off a query param like Vendor's.
 * No actions or assertions here, see src/pages/master-data/gmt-inseam.page.ts.
 */
export class GmtInseamLocators {
  readonly heading: Locator;
  readonly newInseamButton: Locator;
  readonly searchInput: Locator;

  // Create/Edit dialog
  readonly dialog: Locator;
  readonly codeInput: Locator;
  readonly descriptionInput: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'GMT Inseam Master' });
    this.newInseamButton = page.getByRole('button', { name: 'New Inseam' });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });

    // Matches either "New Inseam" or "Edit Inseam" — same field shape either way.
    this.dialog = page.getByRole('dialog', { name: /New Inseam|Edit Inseam/ });
    this.codeInput = this.dialog.getByRole('textbox', { name: 'Inseam Code', exact: false });
    this.descriptionInput = this.dialog.getByRole('textbox', { name: 'Description', exact: false });
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  /**
   * A row matched by an exact cell value (Code or Description) — same
   * pattern as Vendor/Departments' row(). Values are regex-escaped since
   * Description is free text that can contain regex metacharacters.
   */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /**
   * The "Required" error paragraph — confirmed live to render as the next
   * sibling after a field for this form's plain single-element textboxes.
   * `.or()` also tries one level up (needed on Vendor Master's wrapped
   * Currency/Country fields; harmless here since it simply won't match).
   */
  requiredErrorFor(fieldAnchor: Locator): Locator {
    const directSibling = fieldAnchor.locator('xpath=following-sibling::p[1]');
    const parentsSibling = fieldAnchor.locator('xpath=../following-sibling::p[1]');
    return directSibling.or(parentsSibling);
  }
}
