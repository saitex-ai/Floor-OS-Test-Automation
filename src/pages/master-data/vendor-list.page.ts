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

  /** All five status tabs render, each with its live count in the accessible name (e.g. "All 142"). */
  async expectStatusTabsVisible(): Promise<void> {
    for (const tab of ['All', 'Draft', 'Approved', 'Inactive', 'Rejected']) {
      await expect(
        this.page.getByRole('button', { name: new RegExp(`^${tab} \\d+$`) }),
      ).toBeVisible();
    }
  }

  /**
   * Code + name of the Approved vendors on the Approved tab's first page.
   * Columns, confirmed live (2026-10-13): [select, Vendor Code, Vendor
   * Name, City, Country, Currency, Status, actions].
   */
  async approvedVendors(): Promise<{ code: string; name: string }[]> {
    await this.locators.approvedTab.click();
    const rows = this.locators.dataRows();
    await expect(rows.first().getByRole('cell').nth(6)).toHaveText('Approved', { timeout: 15_000 });
    const vendors: { code: string; name: string }[] = [];
    for (const row of await rows.all()) {
      const [, code, name, , , , status] = (await row.getByRole('cell').allInnerTexts()).map((t) =>
        t.trim(),
      );
      if (code && name && status === 'Approved') vendors.push({ code, name });
    }
    return vendors;
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

  /** The auto-generated Vendor Code of the row with this exact Vendor Name. */
  async codeForVendorName(name: string): Promise<string> {
    return (await this.locators.row(name).getByRole('cell').nth(1).innerText()).trim();
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

  async expectRowStatus(
    code: string,
    status: 'Draft' | 'Approved' | 'Inactive' | 'Rejected',
  ): Promise<void> {
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
    // Confirmed live (2026-10-12): the confirm click occasionally doesn't
    // register, leaving the dialog open — and a still-visible toast from a
    // previous transition can then mask that. Retry until it really closes.
    await expect(async () => {
      if (await this.locators.statusConfirmDialog.isVisible()) {
        await this.locators.statusConfirmButton(confirmButtonLabel).click();
      }
      await expect(this.locators.statusConfirmDialog).toBeHidden({ timeout: 3_000 });
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Approves a Draft vendor (new vendors land in Draft since 2026-10-12).
   * From Draft, the chip's "Change to Approved" opens a "Draft review" side
   * drawer (details, optional note, Approve / Remap) rather than the
   * "Change record status?" confirm used for other transitions. Toast on
   * success is the same "Vendor status updated.".
   */
  async approveDraft(code: string): Promise<void> {
    await this.locators.statusButton(code).click();
    await this.locators.statusMenuItem('Change to Approved').click();
    const drawer = this.page.getByRole('dialog').filter({ hasText: /Draft review/i });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: /^Approve\b/ }).click();
    await expect(drawer).toBeHidden({ timeout: 15_000 });
  }

  /** Real toast text confirmed live: "Vendor status updated." */
  async expectStatusUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Vendor status updated.')).toBeVisible({ timeout: 15_000 });
  }
}
