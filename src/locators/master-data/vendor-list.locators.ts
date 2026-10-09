import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Vendor Master list
 * (/master-data/system-management/vendors). No actions or assertions
 * here, see src/pages/master-data/vendor-list.page.ts for those.
 *
 * Confirmed live on dev (2026-10-06): this list carries an
 * approval-workflow shape shared with GMT Inseam/Waist Master — tabs for
 * All/Draft/Approved/Inactive/Rejected (each with a live count) and a
 * per-row Status column whose cell renders as a clickable button named
 * after the current status (e.g. "Approved"). Unlike GMT Inseam/Waist,
 * Vendor Master's row-selection toolbar DOES expose Approve/Deactivate
 * actions once a row is checked — see VendorListPage.changeStatus().
 */
export class VendorListLocators {
  readonly heading: Locator;
  readonly newVendorButton: Locator;
  readonly searchInput: Locator;
  readonly allTab: Locator;
  readonly statusConfirmDialog: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Vendor Master' });
    this.newVendorButton = page.getByRole('button', { name: 'New Vendor' });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    // Carries the live "All" count, e.g. "All 118" — used to confirm a
    // Cancel/failed-create didn't change the total record count.
    this.allTab = page.getByRole('button', { name: /^All \d+$/ });
    // The "Change record status?" confirmation dialog raised after picking a status menu item.
    this.statusConfirmDialog = page.getByRole('alertdialog', { name: 'Change record status?' });
  }

  /**
   * A row matched by an exact cell value — same pattern as
   * Planning/Departments' row(). Works for either a Vendor Code (known
   * ahead of time for an existing/seed vendor) or a Vendor Name (the only
   * thing known right after creating one, since the Code is
   * auto-generated server-side) — pass whichever is on hand and it
   * matches against any cell with that exact text.
   */
  row(exactCellText: string): Locator {
    const escaped = exactCellText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escaped}$`) }),
    });
  }

  /** The row's Status cell button — named after whatever the current status is. */
  statusButton(code: string): Locator {
    return this.row(code).getByRole('button', { name: /^(Draft|Approved|Inactive|Rejected)$/ });
  }

  rowCheckbox(code: string): Locator {
    return this.row(code).getByRole('checkbox', { name: `Select row ${code}` });
  }

  /** Menu that opens from clicking a row's status button (e.g. "Change to Inactive"). */
  statusMenuItem(action: string | RegExp): Locator {
    return this.page.getByRole('menuitem', { name: action });
  }

  statusConfirmButton(label: string | RegExp): Locator {
    return this.statusConfirmDialog.getByRole('button', { name: label });
  }
}
