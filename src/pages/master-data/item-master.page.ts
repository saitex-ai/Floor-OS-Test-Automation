import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ItemMasterLocators } from '../../locators/master-data/item-master.locators';

const ITEM_MASTER_PATH = '/master-data/inventory-item-management/item-master';

/**
 * Item Master list + "New Item"/Edit full-page form
 * (/master-data/inventory-item-management/item-master), under the
 * top-level Master Data module's "Inventory Item Management" nav group
 * (collapsed by default — see agent-notes/master-data-module.md). Owned
 * by the Master Data QA (shared module). Element locators live in
 * ItemMasterLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases:
 * test-cases/master-data/item-master/item-master-testcases.md.
 *
 * Two confirmed-live app bugs asserted as-is here (not worked around):
 * - expectDuplicateAlternateCodeError() — a duplicate Alternate Code is
 *   blocked, but with the wrong/misleading "This record was updated by
 *   someone else. Reload and try again." message (TC:10).
 * - isActiveFlagCheckboxDisabled() — the Active flag checkbox is always
 *   checked and genuinely disabled; there is no way to deactivate an item
 *   through this UI, even though the delete-confirmation dialog's own
 *   text recommends it (TC:13).
 */
export class ItemMasterPage extends BasePage {
  readonly locators: ItemMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ItemMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(ITEM_MASTER_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newItemButton).toBeVisible();
  }

  async openNewItem(): Promise<void> {
    await this.locators.newItemButton.click();
    await expect(this.page.getByRole('heading', { name: 'New Item' })).toBeVisible({
      timeout: 60_000,
    });
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /**
   * Always re-navigates to the list first via open() before searching —
   * confirmed live that Update (unlike Create) does NOT redirect back to
   * the list after a successful save, so a caller that just saved an edit
   * and then wants to re-open the same (or another) record cannot assume
   * it's already on the list. Then searches by Item ID and opens that
   * row's Edit form directly (confirmed live, no read-only detail view in
   * between). The "Update"-button wait uses a generous timeout since this
   * shared dev environment can be genuinely slow to render the full Edit
   * form under concurrent load, not just a locator problem.
   */
  async openEditById(itemId: string): Promise<void> {
    await this.open();
    await this.search(itemId);
    await this.locators.row(itemId).first().click();
    await expect(this.locators.updateButton).toBeVisible({ timeout: 45_000 });
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  /**
   * Confirmed live: the Inventory ID field shows the real, saved Item ID
   * once on the Edit form. Does NOT also assert deletePermanentlyButton is
   * enabled/visible beyond openEditById's own updateButton wait — kept
   * minimal since updateButton's confirmed dual accessible name (see
   * ItemMasterLocators) already proves we're on a real Edit form.
   */
  async expectOnEditPage(itemId: string): Promise<void> {
    await expect(this.locators.updateButton).toBeVisible({ timeout: 45_000 });
    await expect(this.locators.deletePermanentlyButton).toBeVisible();
    await expect(this.locators.inventoryIdDisplay).toHaveValue(itemId);
  }

  async fillAlternateCode(alternateCode: string): Promise<void> {
    await this.locators.alternateCodeInput.fill(alternateCode);
  }

  async fillDescription(description: string): Promise<void> {
    await this.locators.descriptionInput.fill(description);
  }

  async getAlternateCodeValue(): Promise<string> {
    return this.locators.alternateCodeInput.inputValue();
  }

  async getDescriptionValue(): Promise<string> {
    return this.locators.descriptionInput.inputValue();
  }

  private async pickFromDialog(
    trigger: Locator,
    dialog: Locator,
    rowMatch?: string | RegExp,
  ): Promise<void> {
    await trigger.click();
    await expect(dialog).toBeVisible();
    const row = rowMatch
      ? this.locators.pickerRow(dialog, rowMatch).first()
      : this.locators.pickerDataRows(dialog).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.click();
    await expect(dialog).toBeHidden();
  }

  /** Opens "Select Item Class" and selects a row — defaults to the first real data row. */
  async pickItemClass(rowMatch?: string | RegExp): Promise<void> {
    await this.pickFromDialog(
      this.locators.itemClassField,
      this.locators.itemClassPickerDialog,
      rowMatch,
    );
  }

  /** Opens "Select Item Category" and selects a row — scoped live to whichever Item Class was picked first. */
  async pickItemCategory(rowMatch?: string | RegExp): Promise<void> {
    await this.pickFromDialog(
      this.locators.itemCategoryField,
      this.locators.itemCategoryPickerDialog,
      rowMatch,
    );
  }

  /** Opens the "Select Item Category" picker without selecting a row — for TC:6's scoping check. */
  async openItemCategoryPicker(): Promise<void> {
    await this.locators.itemCategoryField.click();
    await expect(this.locators.itemCategoryPickerDialog).toBeVisible();
  }

  async getItemCategoryPickerDataRowCount(): Promise<number> {
    return this.locators.pickerDataRows(this.locators.itemCategoryPickerDialog).count();
  }

  /**
   * Polling version of the row-count check — the picker's row data loads
   * asynchronously once scoped to the previously-picked Item Class, so a
   * single one-shot `.count()` read right after the dialog opens can race
   * ahead of that fetch and read 0. `expect(...).toHaveCount()` retries
   * until it matches or times out, which a bare `.count()` comparison does
   * not.
   */
  async expectItemCategoryPickerDataRowCount(count: number): Promise<void> {
    await expect(this.locators.pickerDataRows(this.locators.itemCategoryPickerDialog)).toHaveCount(
      count,
      { timeout: 15_000 },
    );
  }

  async closeItemCategoryPicker(): Promise<void> {
    await this.locators.itemCategoryPickerDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
  }

  async pickBaseUnit(rowMatch?: string | RegExp): Promise<void> {
    await this.pickFromDialog(
      this.locators.baseUnitField,
      this.locators.baseUnitPickerDialog,
      rowMatch,
    );
  }

  async pickSaleUnit(rowMatch?: string | RegExp): Promise<void> {
    await this.pickFromDialog(
      this.locators.saleUnitField,
      this.locators.saleUnitPickerDialog,
      rowMatch,
    );
  }

  async pickPurchaseUnit(rowMatch?: string | RegExp): Promise<void> {
    await this.pickFromDialog(
      this.locators.purchaseUnitField,
      this.locators.purchaseUnitPickerDialog,
      rowMatch,
    );
  }

  /** Fills the 7 genuinely-required General-tab fields: Alternate Code, Description, Item Class, Item Category, Base/Sale/Purchase Unit. Leaves every optional field untouched. */
  async fillRequired(values: {
    alternateCode: string;
    description: string;
    itemClassMatch?: string | RegExp;
    itemCategoryMatch?: string | RegExp;
  }): Promise<void> {
    await this.pickItemClass(values.itemClassMatch);
    await this.pickItemCategory(values.itemCategoryMatch);
    await this.pickBaseUnit();
    await this.pickSaleUnit();
    await this.pickPurchaseUnit();
    await this.fillAlternateCode(values.alternateCode);
    await this.fillDescription(values.description);
  }

  async selectTab(
    name:
      | 'General'
      | 'Subitem'
      | 'Attributes'
      | 'Product Services'
      | 'Packaging'
      | 'Image'
      | 'Wash'
      | 'Fabric'
      | 'Supplier'
      | 'TDS File'
      | 'MSDS File',
  ): Promise<void> {
    await this.page.getByRole('tab', { name, exact: true }).click();
  }

  async expectAttributesGatedMessageVisible(): Promise<void> {
    await expect(this.locators.attributesGatedMessage).toBeVisible();
  }

  async expectProductServicesGatedMessageVisible(): Promise<void> {
    await expect(this.locators.productServicesGatedMessage).toBeVisible();
  }

  async expectSupplierGatedMessageVisible(): Promise<void> {
    await expect(this.locators.supplierGatedMessage).toBeVisible();
  }

  async expectSupplierGatedMessageNotVisible(): Promise<void> {
    await expect(this.locators.supplierGatedMessage).not.toBeVisible();
  }

  async expectSubitemEmptyStateVisible(): Promise<void> {
    await expect(this.locators.subitemEmptyStateMessage).toBeVisible();
  }

  /**
   * Clicking Create/Update via a plain `.click()` is unreliable on this
   * form — the sticky bottom-right footer sits directly under the
   * floating "Ask FloorOS AI" launcher at standard desktop viewports. A
   * plain click times out; a `{ force: true }` click actually lands ON the
   * AI launcher instead (confirmed live via `elementFromPoint`) and opens
   * its own dialog instead of submitting the form — reproduced here, same
   * as Item Class Master (see that module's page object). Focusing the
   * button and pressing Enter dispatches a real submit without
   * screen-coordinate hit-testing — the confirmed-working path. See
   * item-master-testcases.md TC:17.
   */
  private async submitViaKeyboard(button: Locator): Promise<void> {
    await button.focus();
    await this.page.keyboard.press('Enter');
  }

  async create(): Promise<void> {
    await this.submitViaKeyboard(this.locators.createButton);
  }

  async update(): Promise<void> {
    await this.submitViaKeyboard(this.locators.updateButton);
  }

  /**
   * Confirmed live: if the form has any unsaved field changes, Cancel
   * opens an "Unsaved changes" confirmation ("Stay" / "Discard") instead
   * of navigating away immediately — not caught during the original
   * exploration pass, only found once a real Playwright click hit a dirty
   * form. Clicks "Discard" when that dialog appears; does nothing extra
   * when the form had no changes to begin with (Cancel navigates straight
   * away in that case, confirmed live).
   */
  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
    const discardVisible = await this.locators.discardChangesButton
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (discardVisible) {
      await this.locators.discardChangesButton.click();
    }
  }

  async deletePermanently(): Promise<void> {
    await this.locators.deletePermanentlyButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmDialog
      .getByRole('button', { name: 'Delete permanently', exact: true })
      .click();
  }

  async cancelDelete(): Promise<void> {
    await this.locators.deletePermanentlyButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
  }

  /**
   * Real toast text confirmed live: "Inventory item {CODE} created." — the
   * auto-generated Item ID is interpolated in. Generous timeout for the
   * same shared-dev-under-concurrent-load reason as getCreatedItemId().
   */
  async expectCreatedSuccessfully(itemId: string): Promise<void> {
    await expect(this.locators.createdToast(itemId)).toBeVisible({ timeout: 45_000 });
  }

  /** Parses the auto-generated Item ID out of the generic success toast pattern, for callers that don't know it ahead of time. */
  async getCreatedItemId(): Promise<string> {
    const toast = this.page.getByText(/^Inventory item \S+ created\.$/);
    // Explicit generous wait before reading, rather than relying on the
    // default actionability timeout: this shared dev environment can be
    // genuinely slow to round-trip a create under concurrent load from
    // other test suites running at the same time (same reasoning as
    // Customer Season Master's own create-toast wait elsewhere in this
    // repo), and a sonner toast auto-dismisses after a few seconds, so a
    // slow round-trip can otherwise race its own disappearance.
    await toast.waitFor({ state: 'visible', timeout: 45_000 });
    const text = await toast.innerText();
    const match = /^Inventory item (\S+) created\.$/.exec(text);
    if (!match) throw new Error(`Unexpected create toast text: "${text}"`);
    return match[1]!;
  }

  /** Real toast text confirmed live: "Inventory item updated." Generous timeout, see getCreatedItemId()'s doc. */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Inventory item updated.', { exact: true })).toBeVisible({
      timeout: 45_000,
    });
  }

  /** Real toast text confirmed live: "Inventory item permanently deleted." Generous timeout, see getCreatedItemId()'s doc. */
  async expectDeletedSuccessfully(): Promise<void> {
    await expect(
      this.page.getByText('Inventory item permanently deleted.', { exact: true }),
    ).toBeVisible({ timeout: 45_000 });
  }

  /** The empty-submit toast: "Please fix the highlighted fields:" followed by a bulleted per-field list. */
  async expectRequiredFieldsToastVisible(): Promise<void> {
    await expect(this.locators.requiredFieldsToast).toBeVisible({ timeout: 10_000 });
  }

  /** Asserts all 7 genuinely-enforced inline "<Field> is required" errors are visible at once. */
  async expectAllRequiredFieldErrorsVisible(): Promise<void> {
    const fields = [
      'Alternate Code',
      'Item Description',
      'Item Class',
      'Item Category',
      'Base Unit',
      'Sale Unit',
      'Purchase Unit',
    ];
    for (const field of fields) {
      await expect(this.locators.inlineRequiredError(field)).toBeVisible();
    }
  }

  /**
   * Real, confirmed-live bug: a duplicate Alternate Code on Create is
   * blocked, but surfaced via a misleading optimistic-concurrency message
   * instead of a duplicate-key message. See item-master-testcases.md
   * TC:10 — asserted as-is, not papered over.
   */
  async expectDuplicateAlternateCodeError(): Promise<void> {
    await expect(
      this.page.getByText('This record was updated by someone else. Reload and try again.', {
        exact: true,
      }),
    ).toBeVisible({ timeout: 45_000 });
  }

  async expectStillOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  /**
   * Confirmed-live bug: the Active flag checkbox is always checked and
   * genuinely disabled (`disabled` DOM property `true`) in both Create
   * and Edit — there is no way to deactivate an item through this UI, even
   * though the delete-confirmation dialog's own copy says to prefer it.
   * See item-master-testcases.md TC:13.
   */
  async isActiveFlagCheckboxDisabled(): Promise<boolean> {
    // Cast via an inline type literal rather than `HTMLButtonElement` — this
    // repo's tsconfig doesn't include the "dom" lib (no other page object
    // needs real DOM types), so the ambient DOM element types aren't
    // available at the type-check level even though this callback runs
    // fine in the real browser context.
    return this.locators.activeFlagCheckbox.evaluate(
      (el) => (el as unknown as { disabled: boolean }).disabled,
    );
  }

  async isActiveFlagCheckboxChecked(): Promise<boolean> {
    return this.locators.activeFlagCheckbox.isChecked();
  }

  /**
   * Confirmed-live trap, shared with Item Class Master (see that module's
   * page object) — true when the given button's on-screen center point is
   * actually covered by the floating "Ask FloorOS AI" launcher.
   */
  async isButtonObstructedByAiLauncher(button: Locator): Promise<boolean> {
    const box = await button.boundingBox();
    if (!box) return false;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    return this.page.evaluate(
      ({ x, y }) => {
        // `document` via globalThis-as-any for the same "dom" lib reason as
        // isActiveFlagCheckboxDisabled() above — this callback runs fine in
        // the real browser context, only the Node-side type-check needs it.
        const doc = (globalThis as any).document;
        const el = doc.elementFromPoint(x, y);
        return !!el?.closest('[aria-label="Ask FloorOS AI"]');
      },
      { x, y },
    );
  }

  /** Observation-only: confirms the "Masters needing review" dashboard panel is visible with at least one Draft row's Review action — does NOT click it (real seeded dev data, see TC:14). */
  async expectMastersNeedingReviewPanelVisible(): Promise<void> {
    await expect(this.locators.mastersNeedingReviewHeading).toBeVisible();
    await expect(this.locators.reviewButtons.first()).toBeVisible();
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

  async expectRowStatus(
    exactCellText: string,
    status: 'Draft' | 'Approved' | 'Inactive',
  ): Promise<void> {
    await expect(this.locators.statusCell(exactCellText)).toHaveText(status, { timeout: 15_000 });
  }
}
