import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AttributeMasterLocators } from '../../locators/master-data/attribute-master.locators';

const ATTRIBUTE_MASTER_PATH = '/master-data/inventory-item-management/attribute-master';

export interface AttributeFieldValues {
  /** Item Category code to pick via the nested "Select Item Category" grid picker (e.g. "ADJ"). */
  itemCategoryCode?: string;
  attributeName?: string;
  dataType?: 'Text' | 'Number';
  required?: boolean;
  descFlag?: boolean;
}

/**
 * The top-level Master Data module's Attribute Master screen, under
 * Inventory Item Management
 * (/master-data/inventory-item-management/attribute-master). Owned by the
 * Master Data QA (shared module). Element locators live in
 * AttributeMasterLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/attribute-master/
 * attribute-master-testcases.md. Confirmed live against dev (2026-10-08).
 * Two real, confirmed app gaps are deliberately asserted as-is (not worked
 * around), per this repo's established discipline:
 * - TC:13 — there is no confirmed way to deactivate an attribute anywhere
 *   on this screen (the Active checkbox is always checked+disabled, row
 *   selection shows no bulk action buttons, the Status cell is a plain
 *   read-only cell).
 * - TC:7 — duplicate Attribute Name (within the same Item Category) is
 *   blocked, but only with a generic "Failed to create attribute." toast.
 */
export class AttributeMasterPage extends BasePage {
  readonly locators: AttributeMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AttributeMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(ATTRIBUTE_MASTER_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newAttributeButton).toBeVisible();
  }

  async selectTab(name: 'All' | 'Active' | 'Inactive'): Promise<void> {
    await this.locators.tab(name).click();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning — same fix as SizePage/ColorPage/UomPage/
   * TechpackTypePage: this grid only renders a bounded window of rows, so a
   * just-created row can be completely absent from the DOM on the
   * unfiltered list, and searching for it immediately after creation can
   * race the grid's own re-fetch.
   *
   * Clears the box before re-filling, even with the same text — confirmed
   * live on the sibling Attribute Value Master screen (see that page's
   * identical doc) that re-filling an unchanged value fires no input/change
   * event, so a retry loop that re-calls search() with the same text can
   * otherwise never actually retrigger the grid's debounced filter.
   */
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

  async openNewAttribute(): Promise<void> {
    await this.locators.newAttributeButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Searches by name first, then opens that row's "Edit Attribute" dialog. */
  async openRowForEdit(attributeName: string): Promise<void> {
    await this.search(attributeName);
    await this.locators.row(attributeName).click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /**
   * Opens the nested "Select Item Category" picker, filters by code, and
   * selects the matching row — confirmed live shared component also used
   * by Product Service Master's own "Pick item category" field.
   */
  async pickItemCategory(categoryCode: string): Promise<void> {
    await this.locators.pickItemCategoryButton.click();
    await expect(this.locators.categoryPickerDialog).toBeVisible();
    await this.locators.categoryFilterInput.fill(categoryCode);
    await expect(this.locators.categoryPickerRow(categoryCode).first()).toBeVisible();
    await this.locators.categoryPickerRow(categoryCode).first().click();
    await expect(this.locators.categoryPickerDialog).toBeHidden();
  }

  /** Opens the Data Type combobox and selects the given option — a plain Radix listbox, confirmed live (TC:14). */
  async selectDataType(value: 'Text' | 'Number'): Promise<void> {
    await this.locators.dataTypeCombobox.click();
    await this.locators.dataTypeOption(value).click();
  }

  /** Fills whichever fields are provided — `attributeName` and `itemCategoryCode` are the only two genuinely required (TC:6). */
  async fillForm(values: AttributeFieldValues): Promise<void> {
    if (values.itemCategoryCode !== undefined) await this.pickItemCategory(values.itemCategoryCode);
    if (values.attributeName !== undefined)
      await this.locators.attributeNameInput.fill(values.attributeName);
    if (values.dataType !== undefined) await this.selectDataType(values.dataType);
    if (values.required) await this.locators.requiredCheckbox.check();
    if (values.descFlag) await this.locators.descFlagCheckbox.check();
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

  async selectRowCheckbox(attributeName: string): Promise<void> {
    await this.locators.rowCheckbox(attributeName).check();
  }

  // ---- Field-state inspection (edge/trap cases) --------------------------

  async isItemCategoryPickerLocked(): Promise<boolean> {
    return !(await this.locators.pickItemCategoryButton.isEnabled());
  }

  async isDataTypeComboboxEnabled(): Promise<boolean> {
    return this.locators.dataTypeCombobox.isEnabled();
  }

  async isActiveCheckboxLocked(): Promise<boolean> {
    const checked = await this.locators.activeCheckbox.isChecked();
    const disabled = await this.locators.activeCheckbox.isDisabled();
    return checked && disabled;
  }

  /** The Attribute Name field's real current value — used to confirm the silent 200-char truncation (TC:10). */
  async attributeNameValue(): Promise<string> {
    return this.locators.attributeNameInput.inputValue();
  }

  async dataTypeOptionLabels(): Promise<string[]> {
    await this.locators.dataTypeCombobox.click();
    const labels = await this.page.getByRole('listbox').getByRole('option').allTextContents();
    await this.page.keyboard.press('Escape');
    return labels;
  }

  // ---- Assertions ---------------------------------------------------------

  /** Real toast text confirmed live: "Attribute created." */
  async expectCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Attribute created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Attribute updated." */
  async expectUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Attribute updated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Real toast text confirmed live on a duplicate Attribute Name (within
   * the same Item Category): a generic "Failed to create attribute." — the
   * dialog stays open with the entered data intact (TC:7's documented gap).
   */
  async expectCreateFailedToast(): Promise<void> {
    await expect(this.page.getByText('Failed to create attribute.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError).toHaveCount(count);
  }

  async expectRowVisible(attributeName: string): Promise<void> {
    await expect(async () => {
      await this.search(attributeName);
      await expect(this.locators.row(attributeName)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async expectRowNotVisible(attributeName: string): Promise<void> {
    await this.search(attributeName);
    await expect(this.locators.row(attributeName)).toHaveCount(0);
  }

  async expectRowContainsText(attributeName: string, text: string): Promise<void> {
    await expect(this.locators.row(attributeName)).toContainText(text);
  }

  /** Searches by (and asserts on) a plain-text substring rather than the full exact Attribute Name — for long/special-character names where only a safe prefix is used as the search query (TC:11). */
  async expectAnyRowVisible(text: string): Promise<void> {
    await expect(async () => {
      await this.search(text);
      await expect(this.locators.rowContainingText(text)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  /**
   * Confirmed live (TC:13): selecting a row only ever shows the "N item
   * selected / Clear selection" pill — no delete/deactivate/activate
   * button of any kind appears alongside it.
   */
  async expectNoBulkActionButtons(): Promise<void> {
    await expect(this.locators.itemSelectedText).toBeVisible();
    await expect(this.locators.clearSelectionButton).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: /delete|deactivate|activate/i }),
    ).toHaveCount(0);
  }
}
