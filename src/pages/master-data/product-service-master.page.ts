import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ProductServiceMasterLocators } from '../../locators/master-data/product-service-master.locators';

const PRODUCT_SERVICE_MASTER_PATH = '/master-data/inventory-item-management/product-service-master';

export interface ProductServiceFieldValues {
  /** Item Category code to pick via the nested "Select Item Category" grid picker (e.g. "BAG"). */
  itemCategoryCode?: string;
  description?: string;
}

/**
 * The top-level Master Data module's Product Service Master screen, under
 * Inventory Item Management
 * (/master-data/inventory-item-management/product-service-master). Owned by
 * the Master Data QA (shared module). Element locators live in
 * ProductServiceMasterLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/
 * product-service-master/product-service-master-testcases.md. Confirmed
 * live against dev (2026-10-08). Two real, confirmed app gaps are
 * deliberately asserted as-is (not worked around), per this repo's
 * established discipline:
 * - TC:13 — there is no confirmed way to deactivate a service anywhere on
 *   this screen (identical gap to Attribute Master).
 * - TC:7 — duplicate Description (within the same Item Category) is
 *   blocked, but only with a generic "Could not create the service" toast —
 *   a third, differently-worded generic failure message across the three
 *   Inventory Item Management screens (compare Attribute Master's "Failed
 *   to create attribute." and Attribute Value Master's "Could not create
 *   the value").
 */
export class ProductServiceMasterPage extends BasePage {
  readonly locators: ProductServiceMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ProductServiceMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(PRODUCT_SERVICE_MASTER_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.addServiceButton).toBeVisible();
  }

  async selectTab(name: 'All' | 'Active' | 'Inactive'): Promise<void> {
    await this.locators.tab(name).click();
  }

  /** Same settle-after-search fix as the other Inventory Item Management/Master Data grids, including the clear-before-refill fix (see AttributeMasterPage's/AttributeValueMasterPage's identical doc). */
  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill('');
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

  async openAddService(): Promise<void> {
    await this.locators.addServiceButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Searches by description first, then opens that row's "Edit Service" dialog. */
  async openRowForEdit(description: string): Promise<void> {
    await this.search(description);
    await this.locators.row(description).click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Same shared "Select Item Category" grid picker as Attribute Master — see that page's identical method doc. */
  async pickItemCategory(categoryCode: string): Promise<void> {
    await this.locators.pickItemCategoryButton.click();
    await expect(this.locators.categoryPickerDialog).toBeVisible();
    await this.locators.categoryFilterInput.fill(categoryCode);
    await expect(this.locators.categoryPickerRow(categoryCode).first()).toBeVisible();
    await this.locators.categoryPickerRow(categoryCode).first().click();
    await expect(this.locators.categoryPickerDialog).toBeHidden();
  }

  /** Fills whichever fields are provided — both are genuinely required (TC:6). */
  async fillForm(values: ProductServiceFieldValues): Promise<void> {
    if (values.itemCategoryCode !== undefined) await this.pickItemCategory(values.itemCategoryCode);
    if (values.description !== undefined)
      await this.locators.descriptionInput.fill(values.description);
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async selectRowCheckbox(description: string): Promise<void> {
    await this.locators.rowCheckbox(description).check();
  }

  // ---- Field-state inspection (edge/trap cases) --------------------------

  async isItemCategoryPickerLocked(): Promise<boolean> {
    return !(await this.locators.pickItemCategoryButton.isEnabled());
  }

  async isActiveCheckboxLocked(): Promise<boolean> {
    const checked = await this.locators.activeCheckbox.isChecked();
    const disabled = await this.locators.activeCheckbox.isDisabled();
    return checked && disabled;
  }

  /** The Description field's real current value — used to confirm the silent 200-char truncation (TC:10). */
  async descriptionValue(): Promise<string> {
    return this.locators.descriptionInput.inputValue();
  }

  // ---- Assertions ---------------------------------------------------------

  /** Real toast text confirmed live: "Service created" — no trailing period. */
  async expectCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Service created', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Service updated" — no trailing period. */
  async expectUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Service updated', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Real toast text confirmed live on a duplicate Description (within the
   * same Item Category): "Could not create the service" — dialog stays
   * open with the entered data intact (TC:7's documented gap).
   */
  async expectCreateFailedToast(): Promise<void> {
    await expect(this.page.getByText('Could not create the service', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError).toHaveCount(count);
  }

  async expectRowVisible(description: string): Promise<void> {
    await expect(async () => {
      await this.search(description);
      await expect(this.locators.row(description)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async expectRowNotVisible(description: string): Promise<void> {
    await this.search(description);
    await expect(this.locators.row(description)).toHaveCount(0);
  }

  /** Searches by (and asserts on) a plain-text substring rather than the full exact Description — for long/special-character descriptions where only a safe prefix is used as the search query (TC:11). */
  async expectAnyRowVisible(text: string): Promise<void> {
    await expect(async () => {
      await this.search(text);
      await expect(this.locators.rowContainingText(text)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  /**
   * Confirmed live (TC:13): selecting a row only ever shows the "N item
   * selected / Clear selection" pill — no delete/deactivate/activate
   * button of any kind appears alongside it. Identical gap to Attribute
   * Master.
   */
  async expectNoBulkActionButtons(): Promise<void> {
    await expect(this.locators.itemSelectedText).toBeVisible();
    await expect(this.locators.clearSelectionButton).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: /delete|deactivate|activate/i }),
    ).toHaveCount(0);
  }
}
