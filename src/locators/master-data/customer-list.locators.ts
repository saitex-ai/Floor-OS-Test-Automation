import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Customer Master list
 * (/master-data/system-management/customers), under the top-level Master
 * Data module's System Management group. No actions or assertions here,
 * see src/pages/master-data/customer-list.page.ts for those.
 *
 * Confirmed live on dev (2026-10-06): this list carries the same
 * Draft/Approved/Inactive/Rejected approval-workflow shape as Vendor
 * Master/GMT Inseam-Waist Master — tabs for All/Draft/Approved/Inactive/
 * Rejected (each with a live count) and a per-row Status cell that DOES
 * render as a clickable button (`aria-haspopup="menu"`, title "Change
 * record status") unlike Company Master's plain `<span>` badge. This
 * suite deliberately exercises the Edit Customer screen's own
 * "Deactivate" button + in-form "Active" checkbox instead (see
 * customer-form.page.ts) — the per-row status menu is a second,
 * independent mechanism not yet covered here (see the spec's own Notes).
 * "Masters needing review" / "Rejected — needs revision" dashboard
 * regions sit above the table too, also not covered here.
 */
export class CustomerListLocators {
  readonly heading: Locator;
  readonly newCustomerButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly draftTab: Locator;
  readonly approvedTab: Locator;
  readonly inactiveTab: Locator;
  readonly rejectedTab: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Customer Master' });
    this.newCustomerButton = page.getByRole('button', { name: 'New Customer' });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    this.draftTab = page.getByRole('button', { name: /^Draft \d+$/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved \d+$/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+$/ });
    this.rejectedTab = page.getByRole('button', { name: /^Rejected \d+$/ });
  }

  /** A row matched by an exact cell value (Customer Code or Customer Name). */
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
