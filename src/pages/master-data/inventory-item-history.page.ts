import { type Download, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { InventoryItemHistoryLocators } from '../../locators/master-data/inventory-item-history.locators';

const LIST_PATH = '/master-data/inventory-item-management/inventory-item-history';

/**
 * The "Inventory Item History" screen under Master Data > Inventory Item
 * Management. Real route:
 * /master-data/inventory-item-management/inventory-item-history. Owned by
 * the Master Data QA (shared module). Element locators live in
 * InventoryItemHistoryLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/
 * inventory-item-history/inventory-item-history-testcases.md.
 *
 * Confirmed live (2026-10-08): no "New" entry point exists anywhere — a
 * direct goto() to `/new` renders the app's own generic "Not Found" page,
 * same pattern as Currency Rate's own confirmed 404. Clicking a row opens a genuine, narrow Update form
 * limited to Alternate Code + Item Description, plus a read-only "Change
 * history" section. Every row on this screen is real, shared,
 * production-like dev data (not a disposable throwaway record), so no
 * method here performs or asserts a real, successful mutating Update —
 * only the client-side validation path (which never reaches the API) is
 * exercised. See the module's own test-case doc Notes and the spec file's
 * `test.fixme()` for the explicit, intentional gap this leaves.
 */
export class InventoryItemHistoryPage extends BasePage {
  readonly locators: InventoryItemHistoryLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new InventoryItemHistoryLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.subtitle).toBeVisible();
  }

  /** Same settle-wait pattern as UomPage/UomConversionPage's own search() — the grid is debounced/re-fetched. */
  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
    await this.waitForRowsToSettle();
  }

  private async waitForRowsToSettle(): Promise<void> {
    const rows = this.page.getByRole('row');
    let previous = -1;
    for (let i = 0; i < 20; i++) {
      const current = await rows.count();
      if (current === previous) return;
      previous = current;
      await this.page.waitForTimeout(250);
    }
  }

  /** Searches by Inventory ID, then opens that item's Update form (navigates to `?edit=<id>` on this same route — no dialog). */
  async openItem(inventoryId: string): Promise<void> {
    await this.search(inventoryId);
    await this.locators.row(inventoryId).first().click();
  }

  async expectOnUpdateForm(inventoryId: string): Promise<void> {
    await expect(this.locators.updateHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.page).toHaveURL(new RegExp(`\\?edit=${inventoryId}`));
  }

  async expectInventoryIdLocked(inventoryId: string): Promise<void> {
    await expect(this.locators.inventoryIdField).toBeDisabled();
    await expect(this.locators.inventoryIdField).toHaveValue(inventoryId);
  }

  async fillAlternateCode(value: string): Promise<void> {
    await this.locators.alternateCodeInput.fill(value);
  }

  async fillItemDescription(value: string): Promise<void> {
    await this.locators.itemDescriptionInput.fill(value);
  }

  /**
   * Clicks "Update" via a direct DOM `el.click()` (same technique this
   * repo's own task brief specifies for the collapsed-nav-group case),
   * NOT a plain Playwright `.click()` and NOT `.click({ force: true })`.
   *
   * Confirmed live and genuinely surprising: a fixed "Ask FloorOS"
   * chat-assist button overlaps this view's Update/Cancel buttons at their
   * real screen coordinates. A plain `.click()` correctly refuses with
   * "subtree intercepts pointer events". `.click({ force: true })` looks
   * like the fix but is actually WORSE — it skips Playwright's
   * actionability check yet still dispatches a real, coordinate-based
   * mouse click, which lands on whichever element is visually on top at
   * that pixel. In a real run this was confirmed to silently open the
   * "Ask FloorOS" chat dialog instead of submitting the form — a test that
   * looked like it clicked Update but never did. `evaluate(el =>
   * el.click())` dispatches the click on the actual DOM node directly, so
   * it reaches the real Update handler regardless of what's drawn on top.
   */
  async clickUpdate(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no "dom" lib in tsconfig (same convention as CustomerFormPage/CustomerPercentagePage's own evaluate() callbacks).
    await this.locators.updateButton.evaluate((el: any) => el.click());
  }

  async clickCancel(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no "dom" lib in tsconfig (same convention as CustomerFormPage/CustomerPercentagePage's own evaluate() callbacks).
    await this.locators.cancelButton.evaluate((el: any) => el.click());
  }

  /** Real inline error confirmed live when Alternate Code is cleared and Update is clicked. */
  async expectAlternateCodeRequiredError(): Promise<void> {
    await expect(this.locators.fieldError('Alternate Code is required')).toBeVisible();
  }

  /** Real inline error confirmed live when Item Description is cleared and Update is clicked. */
  async expectItemDescriptionRequiredError(): Promise<void> {
    await expect(this.locators.fieldError('Item Description is required')).toBeVisible();
  }

  /** Still on the Update form for this item — the invalid submit never navigated away or saved. */
  async expectStillOnUpdateForm(inventoryId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`\\?edit=${inventoryId}`));
  }

  async expectBackOnList(): Promise<void> {
    await expect(this.page).toHaveURL(/inventory-item-history$/);
  }

  /** Confirmed live on every item checked in this session (THSB-SB0301CH, GSM406EW29032, GSM406EW29030) — no item with populated history was found; see the module's own test-case Notes. */
  async expectNoAuditHistoryYet(): Promise<void> {
    await expect(this.locators.changeHistoryHeading).toBeVisible();
    await expect(this.page.getByText('No audit history yet for this item.')).toBeVisible();
  }

  /** TC:1 — confirmed-live, all 13 real columns. */
  async expectColumnHeadersVisible(names: readonly string[]): Promise<void> {
    for (const name of names) {
      await expect(this.page.getByRole('columnheader', { name })).toBeVisible();
    }
  }

  async expectRowVisible(inventoryId: string): Promise<void> {
    await expect(this.locators.row(inventoryId)).toBeVisible();
  }

  async expectRowCount(count: number): Promise<void> {
    await expect(this.page.getByRole('row')).toHaveCount(count);
  }

  /** Real empty-state text confirmed live for a no-match search (header row only, zero data rows). */
  async expectNoItemsFoundMessage(): Promise<void> {
    await expect(this.page.getByText('No inventory items yet.')).toBeVisible();
    await expect(this.page.getByText('Try removing a filter or clearing them all.')).toBeVisible();
  }

  async clickExportCsv(): Promise<void> {
    await this.locators.exportCsvButton.click();
  }

  /** Clicks Export CSV and resolves with the triggered download — confirmed-live filename: `inventory-item-history.csv`. */
  async clickExportCsvAndGetDownload(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.clickExportCsv(),
    ]);
    return download;
  }

  async sortByInventoryId(): Promise<void> {
    await this.locators.inventoryIdColumnHeader.click();
  }

  async jumpToPage(page: number): Promise<void> {
    await this.locators.jumpToPageInput.fill(String(page));
    await this.locators.jumpToPageInput.press('Enter');
    await this.waitForRowsToSettle();
  }

  /** Total row count on the grid (header row included) — used to confirm a search genuinely narrowed the result set. */
  async rowCount(): Promise<number> {
    return this.page.getByRole('row').count();
  }

  /** Text content of the row at `index` (0 = header row, 1 = first data row) — used to confirm pagination genuinely changes the visible rows. */
  async rowTextAt(index: number): Promise<string | null> {
    return this.page.getByRole('row').nth(index).textContent();
  }

  /** Confirmed live: no "New"/"Add" entry point exists anywhere on this screen's toolbar. */
  async expectNoCreateButton(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /^New /i })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: /^Add /i })).toHaveCount(0);
  }

  /**
   * Confirmed live (re-verified during automation, see
   * inventory-item-history-testcases.md's Notes for the correction): a
   * direct goto() to the non-existent `/new` route renders the app's own
   * generic "Not Found" page — same pattern as Currency Rate's own
   * confirmed 404. It does NOT redirect anywhere.
   */
  async gotoNewRouteDirectly(): Promise<void> {
    await this.gotoAuthenticated(`${LIST_PATH}/new`);
  }

  async expectNotFoundPage(): Promise<void> {
    await expect(this.page.getByText('Not Found', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** TC:15 — `Filters` without `exact: true` also matches "Toggle cell filters" (substring collision). */
  async expectFiltersNameCollision(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Filters' })).toHaveCount(2);
    await expect(this.locators.filtersButton).toHaveCount(1);
  }

  async openConfigureColumnsPanel(): Promise<void> {
    await this.locators.configureColumnsButton.click();
  }

  async expectColumnsPanelShowsCount(count: number): Promise<void> {
    await expect(this.locators.columnsPanel).toBeVisible();
    await expect(this.locators.columnsPanel.getByText(`${count}/${count}`)).toBeVisible();
  }
}
