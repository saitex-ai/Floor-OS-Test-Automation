import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ProductServiceValueMasterLocators } from '../../locators/master-data/product-service-value-master.locators';

const PRODUCT_SERVICE_VALUE_MASTER_PATH =
  '/master-data/inventory-item-management/product-service-value-master';

/**
 * Product Service Value Master list + "Add Value"/"Edit Value" dialog
 * (/master-data/inventory-item-management/product-service-value-master),
 * under the top-level Master Data module's "Inventory Item Management"
 * nav group (collapsed by default, distinct from "System Management" —
 * see agent-notes/master-data-module.md). Owned by the Master Data QA
 * (shared module). Element locators live in
 * ProductServiceValueMasterLocators (`this.locators`) — this class only
 * holds flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/
 * product-service-value-master/product-service-value-master-testcases.md.
 */
export class ProductServiceValueMasterPage extends BasePage {
  readonly locators: ProductServiceValueMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ProductServiceValueMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(PRODUCT_SERVICE_VALUE_MASTER_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.addValueButton).toBeVisible();
  }

  async openAddValue(): Promise<void> {
    await this.locators.addValueButton.click();
    await expect(this.locators.formDialog).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /** Searches by Value ID, then opens that row's "Edit Value" dialog directly — confirmed live, no read-only detail view in between. */
  async openEditByValueId(valueId: string): Promise<void> {
    await this.search(valueId);
    await this.locators.row(valueId).first().click();
    await expect(this.locators.formDialog).toBeVisible();
  }

  async expectOnAddDialog(): Promise<void> {
    await expect(this.page.getByRole('dialog', { name: 'Add Value' })).toBeVisible();
  }

  async expectOnEditDialog(valueId: string): Promise<void> {
    await expect(this.page.getByText(`Editing ${valueId}`)).toBeVisible();
  }

  /**
   * Opens the "Select Product Service" picker and selects a row. Pass
   * `searchTerm` to narrow it first, and/or `rowMatch` to pick a specific
   * row (defaults to the first real data row). Confirmed live: selecting a
   * row auto-closes the picker and populates Product Service Description /
   * Item Category Code / Item Category Description as disabled fields.
   */
  async pickProductService(
    options: { searchTerm?: string; rowMatch?: string | RegExp } = {},
  ): Promise<void> {
    await this.locators.pickProductServiceField.click();
    await expect(this.locators.productServicePickerDialog).toBeVisible();
    if (options.searchTerm !== undefined) {
      await this.locators.productServicePickerSearchInput.fill(options.searchTerm);
    }
    const row = options.rowMatch
      ? this.locators.productServicePickerRow(options.rowMatch).first()
      : this.locators.productServicePickerDataRows().first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.click();
    await expect(this.locators.productServicePickerDialog).toBeHidden();
  }

  async fillDescription(description: string): Promise<void> {
    await this.locators.descriptionInput.fill(description);
  }

  async getDescriptionValue(): Promise<string> {
    return this.locators.descriptionInput.inputValue();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async save(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Real toast text confirmed live: "Value created" — no trailing period. */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Value created', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  }

  /** Real toast text confirmed live: "Value updated" — no trailing period. */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Value updated', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  }

  /**
   * Real toast text confirmed live for a duplicate (same Product Service +
   * exact same Description) create attempt: a generic "Could not create
   * the value" — no field-level indication of which field conflicted.
   */
  async expectCreateFailedDuplicate(): Promise<void> {
    await expect(this.page.getByText('Could not create the value', { exact: true })).toBeVisible({
      timeout: 20_000,
    });
  }

  /** Counts simultaneous inline "Required" errors within the open form dialog. */
  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.formDialog.getByText('Required', { exact: true })).toHaveCount(
      count,
    );
  }

  async expectStillOnFormDialog(): Promise<void> {
    await expect(this.locators.formDialog).toBeVisible();
  }

  /**
   * Confirmed-live bug: the "Active" checkbox is always checked and
   * genuinely disabled in both Create and Edit (`disabled` DOM property
   * `true`, not just a falsy `getAttribute('disabled')` read) — there is
   * no way to deactivate a Product Service Value through this UI. See
   * product-service-value-master-testcases.md TC:12.
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
   * Reads the live total off the "All {n}" tab — same pattern as Company/
   * Customer Season Master. Waits for a genuinely positive count first:
   * right after navigation the tab can transiently read "All 0" before the
   * real data finishes loading.
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

  /** Bounding-box/elementFromPoint check — not used for PSVal's dialog form (no confirmed AI-launcher overlap there, unlike Item Class/Item Master's full-page forms), kept for parity/future use if this dialog's layout ever changes. */
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
}
