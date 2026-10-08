import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Company Master list
 * (/master-data/system-management/company), under the top-level Master
 * Data module's System Management group. No actions or assertions here,
 * see src/pages/master-data/company-list.page.ts for those.
 *
 * Confirmed live on dev (2026-10-06): the Status cell renders as a plain
 * `<span>` badge here (e.g. `cell "Active"`), NOT a clickable button like
 * Customer Master's/Customer Season Master's own Status cells (those carry
 * `aria-haspopup="menu"` for a "Change record status" menu) — Company
 * Master's only lifecycle action is the "Deactivate" button inside Edit
 * Company (see company-form.page.ts). Clicking a row opens straight into
 * Edit Company — there is no separate read-only detail view.
 */
export class CompanyListLocators {
  readonly heading: Locator;
  readonly newCompanyButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Company Master' });
    this.newCompanyButton = page.getByRole('button', { name: 'New Company' });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    // Carries the live "All" count, e.g. "All 137" — used to confirm a
    // Cancel/failed-create didn't change the total record count.
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    this.activeTab = page.getByRole('button', { name: /^Active \d+$/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+$/ });
  }

  /** A row matched by an exact cell value (Company Code or Company Name). */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /** The row's Status cell — a plain badge, not a button (see class doc). */
  statusCell(exactCellText: string): Locator {
    return this.row(exactCellText).getByRole('cell').last();
  }
}
