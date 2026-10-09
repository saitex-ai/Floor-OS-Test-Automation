import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ItemClassMasterLocators } from '../../locators/master-data/item-class-master.locators';

const ITEM_CLASS_MASTER_PATH = '/master-data/inventory-item-management/item-class-master';

/**
 * Item Class Master list + "New Item Class"/"Edit Item Class" full-page
 * form (/master-data/inventory-item-management/item-class-master), under
 * the top-level Master Data module's "Inventory Item Management" nav
 * group (collapsed by default — see agent-notes/master-data-module.md).
 * Owned by the Master Data QA (shared module). Element locators live in
 * ItemClassMasterLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/item-class-master/
 * item-class-master-testcases.md.
 *
 * **History**: Create was confirmed BROKEN live earlier on 2026-10-08
 * (every attempt returned an HTTP 409 `item_class_conflict` from the
 * backend's own ID generator handing out codes that already existed).
 * Re-checked later the same day (3/3 consecutive live attempts) and
 * Create now works correctly — see expectCreatedSuccessfully(). The
 * failure-path assertion (expectCreateFailedGeneric()) is kept for
 * regression value only, in case this backend bug resurfaces; it is not
 * the current primary path. Edit has worked correctly throughout.
 */
export class ItemClassMasterPage extends BasePage {
  readonly locators: ItemClassMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ItemClassMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(ITEM_CLASS_MASTER_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newItemClassButton).toBeVisible();
  }

  async openNewItemClass(): Promise<void> {
    await this.locators.newItemClassButton.click();
    await expect(this.page.getByRole('heading', { name: 'New Item Class' })).toBeVisible({
      timeout: 60_000,
    });
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /** Searches by Item Class Code, then opens that row's Edit form directly — confirmed live, no read-only detail view in between. */
  /**
   * Always re-navigates to the list first via open() before searching —
   * confirmed live that "Save changes" (unlike Create's own redirect, were
   * Create to ever succeed) does NOT send you back to the list after a
   * save, so a caller that just saved an edit and wants to open another
   * (or the same) record cannot assume it's already on the list. The
   * "Editing <code>" wait uses a generous timeout for this shared dev
   * environment's genuinely slow renders under concurrent load.
   */
  async openEditByCode(code: string): Promise<void> {
    await this.open();
    await this.search(code);
    await this.locators.row(code).first().click();
    await expect(this.page.getByText(`Editing ${code}`)).toBeVisible({ timeout: 45_000 });
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  /**
   * Also waits for the Selected Categories panel to report a non-zero
   * count before returning — confirmed live (intermittently, under this
   * shared dev environment's heavier concurrent load) that submitting
   * "Save changes" too soon after landing on Edit can spuriously re-fail
   * client-side validation with "Select at least one item category." even
   * though the panel visibly shows a selected category moments later, most
   * likely a hydration race rather than a real data-loss bug (a fresh,
   * isolated manual re-check of the identical flow round-tripped cleanly).
   * Waiting for the real count here is the same defensive pattern as this
   * repo's other slow-dev-load workarounds (e.g. UomPage's row-settle
   * poll) rather than asserting a bug that could not be reliably
   * reproduced outside of heavy concurrent load.
   */
  async expectOnEditPage(code?: string): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.page.getByText(code ? `Editing ${code}` : /^Editing /)).toBeVisible();
    await expect(this.locators.selectedCategoriesHeading()).not.toHaveText(
      'Selected Categories (0)',
      { timeout: 15_000 },
    );
  }

  async fillPrefixCode(prefixCode: string): Promise<void> {
    await this.locators.prefixCodeInput.fill(prefixCode);
  }

  async fillDescription(description: string): Promise<void> {
    await this.locators.descriptionInput.fill(description);
  }

  async getPrefixCodeValue(): Promise<string> {
    return this.locators.prefixCodeInput.inputValue();
  }

  async getDescriptionValue(): Promise<string> {
    return this.locators.descriptionInput.inputValue();
  }

  /** Opens the "Select Stock Type" picker and selects a row — defaults to the first real data row. */
  async pickStockType(rowMatch?: string | RegExp): Promise<void> {
    await this.locators.pickStockTypeField.click();
    await expect(this.locators.stockTypePickerDialog).toBeVisible();
    const row = rowMatch
      ? this.locators.stockTypePickerRow(rowMatch).first()
      : this.locators.stockTypePickerDataRows().first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.click();
    await expect(this.locators.stockTypePickerDialog).toBeHidden();
  }

  /**
   * Clicks an Available/Selected category entry to select (highlight) it —
   * a plain `<div>`, not a role-based control, see locators' class doc.
   * Defaults to the first real entry in Available Categories when no
   * `match` is given (see firstAvailableCategoryEntry()'s own doc for why
   * that's a dedicated locator rather than a loose page-wide text match).
   */
  async clickCategoryEntry(match?: string | RegExp): Promise<void> {
    const entry = match
      ? this.locators.categoryEntry(match)
      : this.locators.firstAvailableCategoryEntry();
    await entry.click();
  }

  /** Moves the currently-selected Available category into Selected Categories. */
  async moveSelectedCategoryToSelected(): Promise<void> {
    await this.locators.addSelectedCategoryButton.click();
  }

  /** Convenience: selects an Available category entry (any one, by default), then moves it across. */
  async addCategory(match?: string | RegExp): Promise<void> {
    await this.clickCategoryEntry(match);
    await this.moveSelectedCategoryToSelected();
  }

  /**
   * Clicking Create/Save changes via a plain `.click()` is unreliable on
   * this form — the sticky bottom-right footer sits directly under the
   * floating "Ask FloorOS AI" launcher at standard desktop viewports. A
   * plain click times out waiting for actionability; a `{ force: true }`
   * click actually lands ON the AI launcher instead (confirmed live via
   * `elementFromPoint`) and opens its own dialog instead of submitting the
   * form. Focusing the button and pressing Enter dispatches a real submit
   * without screen-coordinate hit-testing — the confirmed-working path.
   * See item-class-master-testcases.md TC:13.
   */
  private async submitViaKeyboard(button: Locator): Promise<void> {
    await button.focus();
    await this.page.keyboard.press('Enter');
  }

  /**
   * Submits Create. Confirmed-broken live as of 2026-10-08 (see class
   * doc) — pair this with expectCreateFailedGeneric(), not a success
   * assertion.
   */
  async create(): Promise<void> {
    await this.submitViaKeyboard(this.locators.createButton);
  }

  async save(): Promise<void> {
    await this.submitViaKeyboard(this.locators.saveChangesButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Real toast text confirmed live: "Item class updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Item class updated.', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Real toast text confirmed live: "Item class created." Create was
   * confirmed BROKEN earlier on 2026-10-08 (every attempt hit a 409
   * `item_class_conflict` from the backend's own ID generator — see the
   * class doc's history and item-class-master-testcases.md's Notes) but
   * was re-confirmed WORKING again later the same day, 3/3 consecutive
   * live attempts. Use this as the real, current, primary assertion;
   * expectCreateFailedGeneric() below is kept only for historical/
   * regression value in case the backend regresses again.
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Item class created.', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Real toast text confirmed live during the window this backend bug was
   * reproducible (empty-required-field submits never reach this toast —
   * they're blocked client-side first; this is what the backend's 409
   * `item_class_conflict` surfaced as): "Failed to create item class."
   * Kept for regression value — see expectCreatedSuccessfully() above for
   * the current, real, working Create path.
   */
  async expectCreateFailedGeneric(): Promise<void> {
    await expect(this.page.getByText('Failed to create item class.', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  async expectStillOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  /** Matches an inline "Required" (or other) validation message still on the form — several can be on screen at once. */
  async expectValidationError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectCategoryRequiredError(): Promise<void> {
    await expect(this.locators.selectAtLeastOneCategoryError).toBeVisible();
  }

  async expectPickStockTypeFirstMessageVisible(): Promise<void> {
    await expect(this.locators.pickStockTypeFirstMessage).toBeVisible();
  }

  async expectAvailableCategoriesCount(count: number): Promise<void> {
    await expect(this.locators.availableCategoriesHeading()).toHaveText(
      `Available Categories (${count})`,
    );
  }

  async expectSelectedCategoriesCount(count: number): Promise<void> {
    await expect(this.locators.selectedCategoriesHeading()).toHaveText(
      `Selected Categories (${count})`,
    );
  }

  async expectNoCategoriesForStockTypeMessageVisible(): Promise<void> {
    await expect(this.locators.noCategoriesForStockTypeMessage()).toBeVisible();
  }

  /**
   * Confirmed-live bug: the "Active" checkbox is always checked and
   * genuinely disabled in both Create and Edit (`disabled` DOM property
   * `true`, not just a falsy `getAttribute('disabled')` read — that read
   * alone is misleading, it returns an empty string which is still
   * "present"). There is no way to deactivate an Item Class through this
   * UI. See item-class-master-testcases.md TC:12.
   */
  async isActiveCheckboxDisabled(): Promise<boolean> {
    // Cast via an inline type literal rather than `HTMLButtonElement` — this
    // repo's tsconfig doesn't include the "dom" lib (no other page object
    // needs real DOM types), so the ambient DOM element types aren't
    // available at the type-check level even though this callback runs
    // fine in the real browser context.
    return this.locators.activeCheckbox.evaluate(
      (el) => (el as unknown as { disabled: boolean }).disabled,
    );
  }

  async isActiveCheckboxChecked(): Promise<boolean> {
    return this.locators.activeCheckbox.isChecked();
  }

  /**
   * Confirmed-live trap, not module-specific — see
   * item-class-master-testcases.md TC:13 and item-master-testcases.md
   * TC:17. True when the given button's on-screen center point is
   * actually covered by the floating "Ask FloorOS AI" launcher, i.e. a
   * real mouse click there would hit the launcher instead of the button.
   */
  async isButtonObstructedByAiLauncher(button: Locator): Promise<boolean> {
    const box = await button.boundingBox();
    if (!box) return false;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    return this.page.evaluate(
      ({ x, y }) => {
        // `document` via globalThis-as-any for the same "dom" lib reason as
        // isActiveCheckboxDisabled() above — this callback runs fine in the
        // real browser context, only the Node-side type-check needs the cast.
        const doc = (globalThis as any).document;
        const el = doc.elementFromPoint(x, y);
        return !!el?.closest('[aria-label="Ask FloorOS AI"]');
      },
      { x, y },
    );
  }

  /**
   * Reads the live total off the "All {n}" tab. Waits for a genuinely
   * positive count first — right after navigation the tab can transiently
   * read "All 0" before the real data finishes loading.
   */
  async getAllCount(): Promise<number> {
    await expect(this.locators.allTab).toHaveText(/^All\s*[1-9]\d*$/, { timeout: 15_000 });
    const text = await this.locators.allTab.innerText();
    const match = /\d+/.exec(text);
    return match ? Number(match[0]) : NaN;
  }

  async expectRowVisible(exactCellText: string): Promise<void> {
    await expect(this.locators.row(exactCellText)).toBeVisible({ timeout: 15_000 });
  }

  async expectRowNotVisible(exactCellText: string): Promise<void> {
    await expect(this.locators.row(exactCellText)).toHaveCount(0);
  }

  async expectRowStatus(exactCellText: string, status: 'Active' | 'Inactive'): Promise<void> {
    await expect(this.locators.statusCell(exactCellText)).toHaveText(status, { timeout: 15_000 });
  }
}
