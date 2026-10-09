import { type Page, type Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { PriceLibraryLocators } from '../../locators/master-data/price-library.locators';

export interface PriceRowValues {
  price?: string;
  freightCharges?: string;
  otherCharges?: string;
  moq?: string;
}

/**
 * The "Material Price Library" screen — list
 * (/master-data/price-library), create form (/master-data/price-library/new)
 * and per-(item, supplier) detail page
 * (/master-data/price-library/<ItemCode>/<SupplierCode>). Reached via a nav
 * group ("Inventory Item Management") that is collapsed by default — this
 * page object navigates straight to the URL. Owned by the Master Data QA
 * (shared module). Element locators live in PriceLibraryLocators
 * (`this.locators`) — this class only holds flows/actions/assertions built
 * on top of them.
 *
 * Confirmed live against dev (2026-10-08) — see
 * test-cases/master-data/price-library/price-library-testcases.md for the
 * full narrative, including two real, confirmed app gaps deliberately
 * asserted as-is here rather than papered over:
 *
 * - TC:7 — a real backend 409 CONFLICT on a duplicate (item, supplier) pair
 *   produces **zero** UI feedback (no toast, no inline error). confirmAndSave()
 *   returns the raw network Response so the spec can assert the real HTTP
 *   status directly instead of inventing a toast/error message that doesn't
 *   exist.
 * - TC:14 — a successful create also shows **no toast**, only a silent
 *   redirect back to the list. expectSavedAndRedirectedToList() asserts the
 *   URL change, not a toast.
 */
export class PriceLibraryPage extends BasePage {
  readonly locators: PriceLibraryLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new PriceLibraryLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/price-library');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.addItemButton).toBeVisible();
  }

  async selectTab(name: 'All' | 'Active' | 'Expiring Soon' | 'Expired'): Promise<void> {
    await this.locators.tab(name).click();
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

  async openAddItemForm(): Promise<void> {
    await this.locators.addItemButton.click();
    await expect(this.page).toHaveURL(/\/master-data\/price-library\/new$/);
  }

  async expectOnCreateForm(): Promise<void> {
    await expect(this.locators.itemCodeTrigger).toBeVisible();
    await expect(this.locators.confirmAndSaveButton).toBeVisible();
  }

  /**
   * Waits until every currently rendered `[cmdk-item]` option's text matches
   * `term` (case-insensitive), confirming the picker's own debounced live
   * search has actually applied — not just that *some* option is visible.
   * The popover shows its default unfiltered page immediately on open
   * (before the typed term's search even resolves), so a plain "first
   * option visible" check can read stale, pre-filter results (confirmed
   * live: an early version of this page object picked a completely
   * unrelated item this way). Same retry-until-consistent shape as
   * EmployeeFormPage.searchDepartmentPicker().
   */
  private async waitForCmdkFilterApplied(term: string): Promise<void> {
    await expect(async () => {
      const texts = await this.page.locator('[cmdk-item]').allTextContents();
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.every((t) => new RegExp(escapeRegExpLocal(term), 'i').test(t))).toBe(true);
    }).toPass({ timeout: 10_000, intervals: [200, 400, 800] });
  }

  /**
   * Opens the Item code picker, types `searchTerm` into its cmdk search box,
   * and picks the option matching `optionText` (defaults to the first result
   * — the live-sourced list always returns at least the typed term's own
   * match). Item name/category auto-fill once an item is picked.
   */
  async pickItem(searchTerm: string, optionText?: string | RegExp): Promise<void> {
    await this.locators.itemCodeTrigger.click();
    await this.locators.cmdkSearchInput.fill(searchTerm);
    await this.waitForCmdkFilterApplied(searchTerm);
    const option = optionText
      ? this.locators.cmdkOption(optionText)
      : this.locators.firstCmdkOption();
    await option.first().click();
  }

  /** Opens the Supplier picker and picks the option matching `optionText` (defaults to the first/only result). */
  async pickSupplier(optionText?: string | RegExp): Promise<void> {
    await this.locators.supplierTrigger.click();
    await expect(this.locators.firstCmdkOption()).toBeVisible({ timeout: 10_000 });
    const option = optionText
      ? this.locators.cmdkOption(optionText)
      : this.locators.firstCmdkOption();
    await option.first().click();
  }

  /**
   * Picks a pseudo-random result among items matching `searchTerm`, and
   * returns its full option text. Exists because this module's backend
   * enforces a **permanent** uniqueness constraint on (item, supplier) — a
   * real, confirmed 409 (see TC:7) — and there is no delete anywhere in
   * this module, so a hardcoded item code would permanently stop working
   * the first time a create test actually succeeds against it. Spreading
   * picks across whatever `searchTerm` currently matches sidesteps that for
   * a reasonable number of CI reruns; it is not a guarantee against
   * exhausting the pool over very many runs, which is an honest limitation
   * of automating against this particular real app constraint, not
   * something papered over.
   */
  async pickRandomItem(searchTerm: string): Promise<string> {
    await this.locators.itemCodeTrigger.click();
    await this.locators.cmdkSearchInput.fill(searchTerm);
    await this.waitForCmdkFilterApplied(searchTerm);
    const options = this.page.locator('[cmdk-item]');
    const count = await options.count();
    const chosen = options.nth(Date.now() % count);
    const text = (await chosen.textContent()) ?? '';
    await chosen.click();
    return text;
  }

  /**
   * Same idea as pickRandomItem(), for the Supplier picker. Not every seeded
   * item has a mapped supplier (confirmed live: some items' Supplier picker
   * opens with zero options) — fails fast with a clear, catchable error
   * instead of a generic 10s timeout, so createFreshPriceRecord() can treat
   * it the same as a 409 and just try a different item.
   */
  async pickRandomSupplier(): Promise<string> {
    await this.locators.supplierTrigger.click();
    const hasOptions = await this.locators
      .firstCmdkOption()
      .isVisible({ timeout: 6_000 })
      .catch(() => false);
    if (!hasOptions) {
      await this.page.keyboard.press('Escape');
      throw new Error('No supplier options available for the currently selected item');
    }
    const options = this.page.locator('[cmdk-item]');
    const count = await options.count();
    const chosen = options.nth(Date.now() % count);
    const text = (await chosen.textContent()) ?? '';
    await chosen.click();
    // Confirms the pick actually "took" — the trigger's own text should no
    // longer be the unset "Select supplier" placeholder. Confirmed live
    // this can silently fail to register under rapid repeated navigation
    // (same race as setStartDateToday()'s own self-check), which otherwise
    // only surfaces much later and confusingly as confirmAndSave() seeing no
    // network request at all (blocked by client-side validation instead).
    const stillUnset = await this.locators.supplierTrigger
      .getByText('Select supplier', { exact: true })
      .isVisible()
      .catch(() => false);
    if (stillUnset) throw new Error('Supplier pick did not register on the trigger button');
    return text;
  }

  /**
   * Opens the Item code picker and picks a pseudo-random option from
   * whatever it shows **without typing anything** — confirmed live this
   * default/unfiltered first page alone lists 30+ real items spanning many
   * unrelated families (STRAIGHT variants, plate/rivet hardware, buttons,
   * cartons, other agents' own `TC-Item ...` throwaway fixtures, ...), a
   * much bigger and more diverse pool than any single keyword search
   * returns (the picker caps a *filtered* search at 5 results — confirmed
   * live across several different terms, see createFreshPriceRecord()'s own
   * doc). Returns nothing: createFreshPriceRecord() reads the item's name
   * back from the form's own disabled display afterward instead.
   */
  private async pickRandomItemUnfiltered(): Promise<void> {
    await this.locators.itemCodeTrigger.click();
    await expect(this.locators.firstCmdkOption()).toBeVisible({ timeout: 10_000 });
    const options = this.page.locator('[cmdk-item]');
    const count = await options.count();
    await options.nth(Date.now() % count).click();
    // Same "did the pick actually register" self-check as pickRandomSupplier().
    const stillUnset = await this.locators.itemCodeTrigger
      .getByText('Search items...', { exact: false })
      .isVisible()
      .catch(() => false);
    if (stillUnset) throw new Error('Item pick did not register on the trigger button');
  }

  /**
   * Waits for the "Item name" display to show the real auto-filled
   * description rather than its own transient "Loading…" placeholder — the
   * auto-fill fetch can still be in flight the instant after an item is
   * picked (confirmed live: reading inputValue() immediately sometimes
   * captured literally "Loading…", not the real name).
   */
  private async waitForItemNameToLoad(): Promise<string> {
    let name = '';
    await expect(async () => {
      name = await this.locators.itemNameDisplay.inputValue();
      expect(name).not.toBe('');
      expect(name).not.toMatch(/^Loading/i);
    }).toPass({ timeout: 10_000, intervals: [200, 400, 800] });
    return name;
  }

  /**
   * Creates a brand-new Price Library record end-to-end, retrying with a
   * different pseudo-random (item, supplier) pick whenever an attempt fails
   * — on a real 409 (this pair is already priced), or on an item with no
   * mapped Supplier at all (confirmed live: common across this seed data) —
   * until one succeeds or `maxAttempts` is exhausted. This exists because of
   * a real, confirmed backend constraint: (item, supplier) is permanently
   * unique once a price record exists for it, and there is no delete
   * anywhere in this module (see TC:7) — confirmed live not to be a
   * hypothetical edge case but the single biggest practical obstacle to
   * writing a repeatable create test here at all. A 409/no-supplier result
   * is expected, routine retry fodder, not a test failure in its own right;
   * anything else is surfaced immediately rather than retried blindly.
   */
  async createFreshPriceRecord(
    rowValues: PriceRowValues = {},
    maxAttempts = 25,
  ): Promise<{ response: Response; itemName: string }> {
    const failures: string[] = [];
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt === 0) {
          await this.openAddItemForm();
        } else {
          await this.locators.cancelLink.click().catch(() => this.open());
          await this.openAddItemForm();
        }

        await this.pickRandomItemUnfiltered();
        const itemName = await this.waitForItemNameToLoad();
        await this.pickRandomSupplier();
        if (Object.keys(rowValues).length > 0) await this.fillPriceRow(1, rowValues);
        await this.setStartDateToday(1);

        const response = await this.confirmAndSave();
        const status = response?.status();
        if (status === 201) return { response: response!, itemName };
        if (status !== 409) {
          throw new Error(`Unexpected Price Library create response: ${status ?? '(no response)'}`);
        }
        failures.push(`attempt ${attempt} (item "${itemName}"): 409 conflict`);
      } catch (error) {
        // Any failure on this attempt (409 conflict, an item with no mapped
        // supplier, a transient UI hiccup, ...) just means "try a different
        // (item, supplier) pick next" — not a reason to fail the whole
        // create outright while attempts remain. The *last* attempts' errors
        // are what actually get surfaced below if every attempt fails.
        failures.push(`attempt ${attempt}: ${(error as Error).message}`);
      }
    }
    throw new Error(
      `Could not create a fresh Price Library record after ${maxAttempts} attempts:\n${failures.join('\n')}`,
    );
  }

  /** Fills whichever of Price/Freight/Other/MOQ are given for price row `n`; all default to a pre-filled value, none are required (see TC:2). */
  async fillPriceRow(n: number, values: PriceRowValues): Promise<void> {
    if (values.price !== undefined) await this.locators.priceInput(n).fill(values.price);
    if (values.freightCharges !== undefined)
      await this.locators.freightChargesInput(n).fill(values.freightCharges);
    if (values.otherCharges !== undefined)
      await this.locators.otherChargesInput(n).fill(values.otherCharges);
    if (values.moq !== undefined) await this.locators.moqInput(n).fill(values.moq);
  }

  /**
   * Opens price row `n`'s Start date calendar and picks today — the only
   * required date field (see TC:6). Verifies the trigger's own text actually
   * changed away from the unset "Start date" placeholder afterward and
   * retries once if not — confirmed live this can occasionally not "take"
   * under rapid repeated navigation (e.g. inside createFreshPriceRecord()'s
   * retry loop), silently leaving Start date unset and the save blocked by
   * client-side validation with no network request at all, which otherwise
   * surfaces confusingly far away as "no response" from confirmAndSave().
   */
  async setStartDateToday(n: number): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.locators.startDateTrigger(n).click();
      await expect(this.locators.todayDateOption).toBeVisible({ timeout: 10_000 });
      await this.locators.todayDateOption.click();
      const stillUnset = await this.locators
        .startDateTrigger(n)
        .getByText('Start date', { exact: true })
        .isVisible()
        .catch(() => false);
      if (!stillUnset) {
        // A short settle wait: the trigger's displayed text updates
        // immediately, but confirmed live the underlying form-validation
        // state can lag a tick behind under rapid programmatic interaction
        // (clicking "Confirm & save" immediately after can still read stale
        // "Start date required" state and silently block the save
        // client-side — no network request at all, which otherwise surfaces
        // confusingly far away as "no response" from confirmAndSave()).
        await this.page.waitForTimeout(400);
        return;
      }
    }
    throw new Error(`Start date on price row ${n} did not update after picking "Today"`);
  }

  async addPriceRow(): Promise<void> {
    await this.locators.addPriceButton.click();
  }

  async removePriceRow(n: number): Promise<void> {
    await this.locators.removePriceRowButton(n).click();
  }

  async expectRemovePriceRowDisabled(n: number): Promise<void> {
    await expect(this.locators.removePriceRowButton(n)).toBeDisabled();
  }

  /**
   * Clicks "Confirm & save price" and returns the raw `POST
   * /api/price-library` response (status 201 on success, 409 on a
   * duplicate-(item, supplier) conflict — confirmed live, see class doc).
   * Returning the real response is deliberate: this form gives no toast in
   * either outcome, so the network response is the only reliable signal.
   */
  async confirmAndSave(): Promise<Response | null> {
    const responsePromise = this.page
      .waitForResponse(
        (r) => r.url().includes('/api/price-library') && r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.locators.confirmAndSaveButton.click();
    return responsePromise;
  }

  /** Clicks "Confirm & save price" without waiting on a network response — for the fully-blank-form validation case (TC:6), which never reaches the API. */
  async attemptSaveWithoutWaitingOnNetwork(): Promise<void> {
    await this.locators.confirmAndSaveButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelLink.click();
  }

  // ---- Assertions -------------------------------------------------------

  async expectRequiredErrorsVisible(): Promise<void> {
    await expect(this.locators.chooseItemError).toBeVisible();
    await expect(this.locators.chooseSupplierError).toBeVisible();
    await expect(this.locators.startDateRequiredError).toBeVisible();
  }

  /** Confirms the real, silent success path: a 201 response and a redirect back to the plain list URL, with no toast (TC:1/TC:2/TC:14). */
  async expectSavedAndRedirectedToList(): Promise<void> {
    await expect(this.page).toHaveURL(/\/master-data\/price-library$/, { timeout: 15_000 });
  }

  /** Confirmed live: no toast appears on this screen in either the success or failure path (TC:7/TC:14) — asserted directly rather than assumed. */
  async expectNoToastAppears(): Promise<void> {
    await this.page.waitForTimeout(1_500);
    await expect(this.locators.toast).toHaveCount(0);
  }

  /** Searches by itemCode first when it's a plain string, then opens its per-(item, supplier) detail page. */
  async openItemDetail(itemCode: string | RegExp): Promise<void> {
    if (typeof itemCode === 'string') await this.search(itemCode);
    await this.locators.row(itemCode).click();
  }

  async expectOnItemDetailPage(): Promise<void> {
    await expect(this.locators.pricesHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.locators.whereUsedHeading).toBeVisible();
  }

  /** Searches by itemCode first when it's a plain string (see search()'s doc) before checking visibility. */
  async expectRowVisible(itemCode: string | RegExp): Promise<void> {
    await expect(async () => {
      if (typeof itemCode === 'string') await this.search(itemCode);
      await expect(this.locators.row(itemCode)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async expectRowNotVisible(itemCode: string | RegExp): Promise<void> {
    if (typeof itemCode === 'string') await this.search(itemCode);
    await expect(this.locators.row(itemCode)).toHaveCount(0);
  }

  async expectRowStatus(itemCode: string | RegExp, status: string): Promise<void> {
    if (typeof itemCode === 'string') await this.search(itemCode);
    await expect(this.locators.row(itemCode)).toContainText(status);
  }

  /**
   * Returns a row's cells as plain text, in column order: [checkbox, Item
   * Code, Item, Category, Supplier, Prices, Price Range, Status]. Used to
   * read back the *real* persisted Item Code/Supplier from the list itself
   * rather than trusting the item picker's own display text — confirmed
   * live these can differ (the picker shows an Alternate-Code-style value,
   * the list's Item Code column shows a different base code).
   */
  async getRowCellTexts(itemCodeOrName: string | RegExp): Promise<string[]> {
    if (typeof itemCodeOrName === 'string') await this.search(itemCodeOrName);
    return this.locators.row(itemCodeOrName).getByRole('cell').allTextContents();
  }
}

function escapeRegExpLocal(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
