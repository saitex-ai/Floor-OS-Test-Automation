import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Customer Season Master list
 * (/master-data/system-management/seasons), under the top-level Master
 * Data module's System Management group. No actions or assertions here,
 * see src/pages/master-data/customer-season-list.page.ts for those.
 *
 * Confirmed live on dev (2026-10-06): same Draft/Approved/Inactive/
 * Rejected tabs + "Masters needing review"/"Rejected — needs revision"
 * dashboard regions as Customer Master. Clicking a row opens the "Edit
 * Season" dialog directly (a modal, not a route change — see
 * customer-season-form.page.ts).
 */
export class CustomerSeasonListLocators {
  readonly heading: Locator;
  readonly newSeasonButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly draftTab: Locator;
  readonly approvedTab: Locator;
  readonly inactiveTab: Locator;
  readonly rejectedTab: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Customer Season Master' });
    this.newSeasonButton = page.getByRole('button', { name: 'New Season' });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    this.draftTab = page.getByRole('button', { name: /^Draft \d+$/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved \d+$/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+$/ });
    this.rejectedTab = page.getByRole('button', { name: /^Rejected \d+$/ });
  }

  /** A row matched by an exact cell value (Season Code or Description). */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /** The row's Status cell — reads the badge text regardless of its button/menu wrapper. */
  statusCell(exactCellText: string): Locator {
    return this.row(exactCellText).getByRole('cell').last();
  }
}
