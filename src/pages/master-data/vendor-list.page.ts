import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { VendorListLocators } from '../../locators/master-data/vendor-list.locators';

const VENDORS_LIST_PATH = '/master-data/system-management/vendors';

/**
 * Vendor Master list, under the top-level Master Data module's System
 * Management group. Real route: /master-data/system-management/vendors.
 * Owned by the Master Data QA (shared module). Element locators live in
 * VendorListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class VendorListPage extends BasePage {
  readonly locators: VendorListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new VendorListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(VENDORS_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newVendorButton).toBeVisible();
  }

  async openNewVendor(): Promise<void> {
    await this.locators.newVendorButton.click();
  }

  /** Double-click is the confirmed-live way to open a row's Edit Vendor drawer. */
  async openEdit(code: string): Promise<void> {
    await this.locators.row(code).dblclick();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /**
   * Reads the live total off the "All {n}" tab. NOT reliable as a
   * before/after "nothing changed" check on this shared dev environment —
   * confirmed live (2026-10-07) via a flaky run: the global Vendor count
   * can drift between two reads seconds apart for reasons that have
   * nothing to do with the test itself (this `master-data` project, and
   * several *other* agents' own suites, all run concurrently against the
   * same shared dev instance — any of them creating/changing a vendor
   * shifts this number). Kept as a simple read for callers who just want
   * "what does the tab say right now"; don't use it to assert "no record
   * was created" the way an early version of TC:8 did — assert on the
   * specific record's own name/row instead (see VendorListPage.expectRowVisible()
   * used negatively, i.e. asserting a count of 0).
   */
  async getAllCount(): Promise<number> {
    const text = await this.locators.allTab.innerText();
    const match = /\d+/.exec(text);
    return match ? Number(match[0]) : NaN;
  }

  async expectRowVisible(code: string): Promise<void> {
    await expect(this.locators.row(code)).toBeVisible({ timeout: 15_000 });
  }

  async expectRowStatus(code: string, status: 'Draft' | 'Approved' | 'Inactive' | 'Rejected'): Promise<void> {
    await expect(this.locators.statusButton(code)).toHaveText(status, { timeout: 15_000 });
  }

  /**
   * Status is changed from the list's per-row Status chip (not the edit
   * drawer): click the chip -> pick the one directional menu option offered
   * ("Change to Inactive" / "Change to Approved") -> confirm in the
   * "Change record status?" alertdialog. Confirmed live 2026-10-06: each
   * status only ever offers a single forward transition, never a full set.
   */
  async changeStatus(
    code: string,
    menuItem: 'Change to Inactive' | 'Change to Approved',
    confirmButtonLabel: 'Set to Inactive' | 'Set to Approved',
  ): Promise<void> {
    await this.locators.statusButton(code).click();
    await this.locators.statusMenuItem(menuItem).click();
    await expect(this.locators.statusConfirmDialog).toBeVisible();
    await this.locators.statusConfirmButton(confirmButtonLabel).click();
  }

  /** Real toast text confirmed live: "Vendor status updated." */
  async expectStatusUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Vendor status updated.')).toBeVisible({ timeout: 15_000 });
  }
}
