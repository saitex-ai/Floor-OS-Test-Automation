import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the BOM list (/bom, "Bill of Materials") —
 * no actions or assertions here, see src/pages/bom/bom-list.page.ts
 * for those.
 *
 * All / Open / Approved are `aria-pressed` buttons, not tabs, and their
 * accessible name carries the count ("Open 42"). The count is part of
 * the regex on purpose: a bare /^Open/ also matches the shell's "Open
 * navigation" button.
 */
export class BomListLocators {
  readonly heading: Locator;

  readonly allTab: Locator;
  readonly openTab: Locator;
  readonly approvedTab: Locator;

  readonly newBomButton: Locator;
  readonly searchInput: Locator;
  readonly rows: Locator;
  readonly footerSummary: Locator;

  // "New BOM" → "Create BOM techpack" dialog
  readonly newBomDialog: Locator;
  readonly noTechpackSelected: Locator;
  readonly createBomButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Bill of Materials' });

    this.allTab = page.getByRole('button', { name: /^All [\d,]+$/ });
    this.openTab = page.getByRole('button', { name: /^Open [\d,]+$/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved [\d,]+$/ });

    this.newBomButton = page.getByRole('button', { name: 'New BOM' });
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.rows = page.getByRole('table').locator('tbody').getByRole('row');
    this.footerSummary = page.getByText(/^Showing [\d,]+ to [\d,]+ of [\d,]+$/);

    this.newBomDialog = page.getByRole('dialog', { name: 'Create BOM techpack' });
    this.noTechpackSelected = this.newBomDialog.getByText('No techpack selected.');
    this.createBomButton = this.newBomDialog.getByRole('button', { name: 'Create BOM' });
    this.cancelButton = this.newBomDialog.getByRole('button', { name: 'Cancel' });
  }

  /** A row's techpack code chip (role=link) — clicking it opens that BOM. */
  techpackLink(code: string): Locator {
    return this.page.getByRole('table').getByRole('link', { name: code, exact: true });
  }
}
