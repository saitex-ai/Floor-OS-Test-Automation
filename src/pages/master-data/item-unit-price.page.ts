import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ItemUnitPriceLocators } from '../../locators/master-data/item-unit-price.locators';

/**
 * The "Item Unit Price (THD Master)" screen — revision list
 * (/master-data/inventory-item-management/item-unit-price) and a revision's
 * own detail/edit page. Reached via a nav group ("Inventory Item
 * Management") that is collapsed by default — this page object navigates
 * straight to the URL. Owned by the Master Data QA (shared module). Element
 * locators live in ItemUnitPriceLocators (`this.locators`) — this class only
 * holds flows/actions/assertions built on top of them.
 *
 * Confirmed live against dev (2026-10-08) — see
 * test-cases/master-data/item-unit-price/item-unit-price-testcases.md for
 * the full narrative, including two real, confirmed app gaps deliberately
 * asserted as-is here rather than papered over:
 *
 * - TC:2 — "New Revision" is a genuine silent no-op when a revision is
 *   already Open: no network request, no toast, no new row.
 *   expectNewRevisionIsNoOp() asserts exactly that (absence of a request),
 *   not a message that doesn't exist.
 * - TC:7/TC:8 — the Unit Price field accepts negative values and unlimited
 *   decimal precision with no client-side guard, unlike Price Library's own
 *   Price field. setUnitPrice()/the spec restore the original value and
 *   never click "Save details" during this probing, to avoid persisting a
 *   bad value into the shared, pre-existing Open revision fixture.
 *
 * TC:13 (Post Revision) is deliberately `test.fixme()`d in the spec, not
 * implemented here beyond locator/button presence — see that test-case
 * file's Notes on why it was never executed live (one-way Open -> Posted
 * transition against shared fixture data, and only one Open revision can
 * exist system-wide).
 */
export class ItemUnitPricePage extends BasePage {
  readonly locators: ItemUnitPriceLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ItemUnitPriceLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/inventory-item-management/item-unit-price');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newRevisionButton).toBeVisible();
  }

  /** Fills the search box and waits for the grid's row count to settle before returning. */
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

  /**
   * Finds a revision currently in the given status and returns its Rev No,
   * read back from its own "Select row N" checkbox (see locators class doc
   * on why that's the only unambiguous way to identify a row). Used instead
   * of a hardcoded Rev No so these tests keep working regardless of which
   * specific revision happens to be Open/Posted at run time — this module
   * only ever has one Open revision system-wide (see TC:2), so hardcoding a
   * number would both go stale the moment someone posts it and risks
   * colliding with other concurrent test runs against the same shared dev
   * environment.
   */
  private async findRevisionNumberByStatus(status: 'Open' | 'Posted'): Promise<number> {
    // Looks up candidate Rev Nos via locators.row(n) (its "Select row N"
    // checkbox accessible-name query) rather than reading a literal
    // aria-label attribute off each row's checkbox directly — confirmed
    // live that attribute read comes back empty (the accessible name is
    // computed some other way, e.g. an associated visually-hidden label,
    // not a literal `aria-label` attribute), which silently broke every
    // lookup. Rev Nos are sequential starting at 1 with no gaps (confirmed
    // live), so this stops at the data row count.
    //
    // Wrapped in toPass(): expectLoaded() only waits for the heading/"New
    // Revision" button, not the grid's own rows — confirmed live this grid
    // can still be fetching for a moment after those render (same slow-
    // bundle/late-grid-population shape as this app's other Master Data
    // grids, see agent-notes/master-data-module.md), so an immediate,
    // one-shot row count can read 0/stale and needs a retry, not just a
    // longer single wait.
    // Checks the Status *cell* specifically, not the row's whole text — this
    // grid concatenates adjacent cell values with no separator at all (e.g.
    // a real row's textContent reads literally "3Open2alice6/22/2026"), so
    // a `\bOpen\b`/`\bPosted\b` word-boundary regex against the full row
    // text can never match: "Open" is immediately followed by "2" with no
    // boundary between two word characters. Confirmed live as the actual
    // root cause after the data was visibly fully loaded (via a failure
    // screenshot) yet every lookup still reported nothing found.
    let found: number | undefined;
    await expect(async () => {
      const dataRowCount = (await this.page.getByRole('row').count()) - 1; // minus the header row
      expect(dataRowCount).toBeGreaterThan(0);
      for (let revNo = 1; revNo <= dataRowCount; revNo++) {
        const row = this.locators.row(revNo);
        if ((await row.count()) === 0) continue;
        const statusText = (await this.locators.statusCell(revNo).textContent())?.trim();
        if (statusText === status) {
          found = revNo;
          return;
        }
      }
      throw new Error(`No ${status} revision found yet among Rev No 1..${dataRowCount}`);
    }).toPass({ timeout: 20_000, intervals: [300, 500, 1_000] });
    if (found === undefined) throw new Error(`No ${status} revision found on the list`);
    return found;
  }

  async getOpenRevisionNumber(): Promise<number> {
    return this.findRevisionNumberByStatus('Open');
  }

  async getPostedRevisionNumber(): Promise<number> {
    return this.findRevisionNumberByStatus('Posted');
  }

  /**
   * Opens a revision's detail/edit page and waits for its Detail Prices
   * section to actually render, not just the page's own "Rev <N>" heading.
   * Confirmed live: the heading can appear well before the Detail Prices
   * section (its own read-only-state message, or its row data) has finished
   * loading — same slow-bundle/late-content-population shape as this app's
   * other Master Data grids (see agent-notes/master-data-module.md). A test
   * that starts interacting right after the heading alone can race a
   * genuinely-not-yet-rendered page and misread that as a real app gap.
   */
  async openRevision(revNo: number): Promise<void> {
    await this.locators.row(revNo).click();
    await expect(this.locators.revisionHeading).toHaveText(`Rev ${revNo}`, { timeout: 15_000 });
    await expect(this.locators.detailPricesHeading).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Clicks "New Revision" and confirms the real, current behavior: it opens
   * an "Open a new revision" confirmation dialog ("Copies all detail rows
   * from the most recently posted revision into the new one.", a "Carry
   * forward last posted prices" toggle defaulting on, Cancel/"Create
   * revision" buttons) — then cancels out without creating anything.
   *
   * This method previously asserted the opposite: that the button was a
   * silent no-op with no dialog at all, which was genuinely true when first
   * confirmed live on 2026-10-08. Re-running these same steps live on
   * 2026-10-09 turned up this dialog instead — the dev app's own behavior
   * changed between those two sessions (not a flake re-observed twice with
   * a screenshot each time proving the dialog is really there). Updated to
   * match current reality rather than keep asserting a behavior that no
   * longer happens.
   *
   * Deliberately cancels rather than confirming: whether "Create revision"
   * actually succeeds while a revision is already Open, or is blocked by
   * some other mechanism once confirmed, was not tested — doing so for real
   * against this shared fixture risks the same irreversible-state problem
   * already avoided for Post Revision (see that method's own doc and TC:13).
   */
  async expectNewRevisionOpensConfirmationDialog(): Promise<void> {
    await this.locators.newRevisionButton.click();
    await expect(this.locators.newRevisionDialog).toBeVisible({ timeout: 10_000 });
    await expect(this.locators.carryForwardPricesToggle).toBeVisible();
    await this.locators.newRevisionCancelButton.click();
    await expect(this.locators.newRevisionDialog).toBeHidden();
  }

  async expectStatus(status: 'Open' | 'Posted'): Promise<void> {
    await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible();
  }

  async openAddItemsDialog(): Promise<void> {
    await this.locators.addItemsButton.click();
    await expect(this.locators.addItemsDialog).toBeVisible();
  }

  /** Closes whichever picker dialog is open without selecting anything. */
  async closeAddItemsDialog(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.addItemsDialog).toBeHidden();
  }

  async addRow(): Promise<void> {
    await this.locators.addRowButton.click();
  }

  async saveDetails(): Promise<void> {
    await this.locators.saveDetailsButton.click();
  }

  async close(): Promise<void> {
    await this.locators.closeButton.click();
  }

  /** Types `value` into a Detail Prices row's Unit Price cell and blurs (so any input-formatting logic runs). Does not save. */
  async setUnitPrice(row: Locator, value: string): Promise<void> {
    const input = this.locators.unitPriceInput(row);
    await input.fill('');
    await input.pressSequentially(value, { delay: 10 });
    await input.blur();
  }

  async getUnitPriceValue(row: Locator): Promise<string> {
    return this.locators.unitPriceInput(row).inputValue();
  }

  async removeRow(row: Locator): Promise<void> {
    await this.locators.removeButtonInRow(row).click();
  }

  // ---- Assertions -------------------------------------------------------

  async expectRequiredRowFieldsToast(): Promise<void> {
    await expect(this.locators.requiredRowFieldsToast).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Confirms a Posted revision is genuinely read-only: the edit toolbar's
   * buttons aren't merely disabled, they aren't rendered at all, and the
   * section shows the "posted and read-only" message instead (confirmed
   * live — see class doc).
   */
  async expectPostedReadOnly(): Promise<void> {
    await expect(this.locators.readOnlyMessage).toBeVisible();
    await expect(this.locators.saveDetailsButton).not.toBeVisible();
    await expect(this.locators.postRevisionButton).not.toBeVisible();
    await expect(this.locators.addRowButton).not.toBeVisible();
  }

  async expectRowVisible(revNo: number): Promise<void> {
    await expect(this.locators.row(revNo)).toBeVisible();
  }

  async expectRowStatus(revNo: number, status: 'Open' | 'Posted'): Promise<void> {
    await expect(this.locators.statusCell(revNo)).toHaveText(status);
  }
}
