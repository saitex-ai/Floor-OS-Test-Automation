import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { BomDetailLocators } from '../../locators/bom/bom-detail.locators';
import { BomItemsLocators, type BomSplitType } from '../../locators/bom/bom-items.locators';

/** The "Add Inventory Item" list is a live MDM search — allow it time on a cold remote. */
const INVENTORY_SEARCH_TIMEOUT = 30_000;

/**
 * A BOM detail page's "B.O.M Items" table and the dialogs it opens. Owned
 * by the BOM QA. Element locators live in BomItemsLocators
 * (`this.locators`); the page header/toolbar/lifecycle is BomDetailPage.
 *
 * Confirmed live on uat (2026-10-08): adding goes through a confirm step
 * (one item → "Confirm item", several → "Add N items"); description, UOM
 * and alternate-code edits ask for a reason and are *staged* behind a
 * "Save N change(s)" footer rather than saved straight away; checkboxes
 * and Remark save immediately with no prompt.
 */
export class BomItemsPage extends BasePage {
  readonly locators: BomItemsLocators;
  private readonly detail: BomDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new BomItemsLocators(page);
    this.detail = new BomDetailLocators(page);
  }

  /** Inventory codes of the visible item rows, in table order. */
  async itemIds(): Promise<string[]> {
    return this.locators.itemRows.evaluateAll((trs) =>
      trs.map((tr) => {
        const cells = [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '');
        // The code cell can also carry an "Edited" badge after its text.
        const code = cells.find((c) => /^[A-Z]{3}\d{7}/.test(c)) ?? '';
        return code.slice(0, 10);
      }),
    );
  }

  async expectItemPresent(inventoryId: string): Promise<void> {
    await expect(this.locators.itemRow(inventoryId)).toBeVisible();
  }

  /** A category header row ("Fabric 2 lines") — matched by role name, as the text is upper-cased by CSS. */
  async expectCategoryHeader(category: string): Promise<void> {
    await expect(this.locators.categoryRow(category)).toBeVisible();
  }

  async expectItemAbsent(inventoryId: string): Promise<void> {
    await expect(this.locators.itemRow(inventoryId)).toHaveCount(0);
  }

  // ---- Add line ----

  async openAddLine(): Promise<void> {
    await this.detail.addLineButton.click();
    await expect(this.locators.addInventoryDialog).toBeVisible();
  }

  async closeAddLine(): Promise<void> {
    await this.locators.addInventoryCloseButton.click();
    await expect(this.locators.addInventoryDialog).toBeHidden();
  }

  /** Searches the MDM picker and waits for that code's row (it's a fuzzy search, so others may show too). */
  async searchInventory(inventoryId: string): Promise<void> {
    await this.locators.addInventorySearchBox.fill(inventoryId);
    await expect(this.locators.inventoryOptionCheckbox(inventoryId)).toBeVisible({
      timeout: INVENTORY_SEARCH_TIMEOUT,
    });
  }

  /**
   * Whether a code is offered by the picker at all after searching for it
   * (already-added items are hidden). Waits for the search to settle on a
   * result list first, so "not offered" isn't just "not loaded yet".
   */
  async isInventoryOffered(inventoryId: string): Promise<boolean> {
    await this.locators.addInventorySearchBox.fill(inventoryId);
    await expect(this.locators.addInventoryFooter).toContainText(/of \d+/i, {
      timeout: INVENTORY_SEARCH_TIMEOUT,
    });
    await expect(
      this.locators.addInventoryDialog.locator('tbody').getByRole('row').first(),
    ).toBeVisible({
      timeout: INVENTORY_SEARCH_TIMEOUT,
    });
    return (await this.locators.inventoryOptionCheckbox(inventoryId).count()) > 0;
  }

  /** Single pick: clicking an item's code opens "Confirm item" — returns with that dialog open. */
  async pickSingleInventory(inventoryId: string): Promise<void> {
    await this.searchInventory(inventoryId);
    await this.locators
      .inventoryOptionRow(inventoryId)
      .getByRole('cell', { name: inventoryId, exact: true })
      .click();
    await expect(this.locators.confirmItemDialog).toBeVisible();
  }

  /** Adds one line via the single-pick path ("Confirm item" → "Add line"). */
  async addLine(inventoryId: string): Promise<void> {
    await this.openAddLine();
    await this.pickSingleInventory(inventoryId);
    await this.locators.confirmItemDialog.getByRole('button', { name: 'Add line' }).click();
    await expect(this.locators.confirmItemDialog).toBeHidden();
    await expect(this.locators.addInventoryDialog).toBeHidden();
    await this.expectItemPresent(inventoryId);
  }

  /** Ticks several codes in the picker and opens the "Add N items" review — returns with it open. */
  async selectInventoryForReview(inventoryIds: string[]): Promise<void> {
    for (const id of inventoryIds) {
      await this.searchInventory(id);
      await this.locators.inventoryOptionCheckbox(id).check();
    }
    await expect(this.locators.addSelectedButton).toHaveText(
      `Add Selected (${inventoryIds.length})`,
    );
    await this.locators.addSelectedButton.click();
    await expect(this.locators.addItemsReviewDialog).toBeVisible();
  }

  async removeFromReview(inventoryId: string): Promise<void> {
    await this.locators.addItemsReviewDialog
      .getByRole('button', { name: `Remove ${inventoryId}` })
      .click();
  }

  /** Confirms the "Add N items" review ("Add N lines"). */
  async confirmReview(count: number): Promise<void> {
    await this.locators.addItemsReviewDialog
      .getByRole('button', { name: `Add ${count} line${count === 1 ? '' : 's'}` })
      .click();
    await expect(this.locators.addItemsReviewDialog).toBeHidden();
  }

  /** Adds several lines in one go via the multi-select path. */
  async addLines(inventoryIds: string[]): Promise<void> {
    await this.openAddLine();
    await this.selectInventoryForReview(inventoryIds);
    await this.confirmReview(inventoryIds.length);
    for (const id of inventoryIds) await this.expectItemPresent(id);
  }

  // ---- Delete ----

  async openDeleteDialog(inventoryId: string): Promise<void> {
    await this.locators.rowDeleteButton(inventoryId).click();
    await expect(this.locators.deleteLineDialog).toBeVisible();
  }

  async cancelDelete(): Promise<void> {
    await this.locators.deleteLineDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.locators.deleteLineDialog).toBeHidden();
  }

  async deleteLine(inventoryId: string): Promise<void> {
    await this.openDeleteDialog(inventoryId);
    await this.locators.deleteLineDialog
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await expect(this.locators.deleteLineDialog).toBeHidden();
    await this.expectItemAbsent(inventoryId);
  }

  // ---- Inline edits ----

  async openEditDescription(inventoryId: string): Promise<void> {
    await this.locators.rowEditDescriptionButton(inventoryId).click();
    await expect(this.locators.editDescriptionDialog).toBeVisible();
  }

  async descriptionOf(inventoryId: string): Promise<string> {
    return (await this.locators.rowEditDescriptionButton(inventoryId).innerText()).trim();
  }

  /** Edits a line's description with a reason; the edit is staged, not yet saved. */
  async stageDescription(inventoryId: string, description: string, reason: string): Promise<void> {
    await this.openEditDescription(inventoryId);
    await this.locators.descriptionInput.fill(description);
    await this.locators.descriptionReasonInput.fill(reason);
    await this.locators.descriptionSaveButton.click();
    await expect(this.locators.editDescriptionDialog).toBeHidden();
    await expect(this.locators.pendingChanges).toBeVisible();
  }

  async saveStagedEdits(): Promise<void> {
    await this.locators.saveChangesButton.click();
    await expect(this.locators.pendingChanges).toBeHidden();
  }

  async discardStagedEdits(): Promise<void> {
    await this.locators.discardChangesButton.click();
    await expect(this.locators.discardDialog).toBeVisible();
    await this.locators.discardDialog.getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(this.locators.pendingChanges).toBeHidden();
  }

  /** Picks a different UOM for a line — returns with the "Edit BOM line" reason dialog open. */
  async changeUom(inventoryId: string, uom: string): Promise<void> {
    await this.locators.rowUomSelect(inventoryId).click();
    await this.locators.uomOption(uom).click();
    await expect(this.locators.editLineDialog).toBeVisible();
  }

  /** The UOM codes offered for a line (a Radix select — opened, read, then closed again). */
  async uomOptions(inventoryId: string): Promise<string[]> {
    await this.locators.rowUomSelect(inventoryId).click();
    await expect(this.locators.uomOptions.first()).toBeVisible();
    const options = (await this.locators.uomOptions.allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    await expect(this.locators.uomOptions.first()).toBeHidden();
    return options;
  }

  async uomOf(inventoryId: string): Promise<string> {
    return (await this.locators.rowUomSelect(inventoryId).innerText()).trim();
  }

  async cancelEditLine(): Promise<void> {
    await this.locators.editLineDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.locators.editLineDialog).toBeHidden();
  }

  async stageEditWithReason(reason: string): Promise<void> {
    await this.locators.editLineReasonInput.fill(reason);
    await this.locators.stageEditButton.click();
    await expect(this.locators.editLineDialog).toBeHidden();
  }

  /** Types a Remark; it autosaves (no reason, no toast). */
  async setRemark(inventoryId: string, remark: string): Promise<void> {
    await this.locators.rowRemarkInput(inventoryId).fill(remark);
    await this.locators.rowRemarkInput(inventoryId).blur();
  }

  async remarkOf(inventoryId: string): Promise<string> {
    return this.locators.rowRemarkInput(inventoryId).inputValue();
  }

  // ---- Row checkboxes ----

  async isChecked(
    inventoryId: string,
    label: BomSplitType | 'Customer supplied' | 'Show barcode',
  ): Promise<boolean> {
    return this.locators.rowCheckbox(inventoryId, label).isChecked();
  }

  /** The split types currently ticked on a line. */
  async activeSplitTypes(inventoryId: string): Promise<BomSplitType[]> {
    const all: BomSplitType[] = [
      'Item-level split',
      'Inseam split',
      'Waist split',
      'GMT size set',
      'BPO split',
      'Destination split',
    ];
    const states = await Promise.all(all.map((t) => this.isChecked(inventoryId, t)));
    return all.filter((_, i) => states[i]);
  }

  async clickCheckbox(
    inventoryId: string,
    label: BomSplitType | 'Customer supplied' | 'Show barcode',
  ): Promise<void> {
    await this.locators.rowCheckbox(inventoryId, label).click();
  }

  /** Clicks a split type and waits until it's the line's only active split type. */
  async switchSplitType(inventoryId: string, type: BomSplitType): Promise<void> {
    await this.clickCheckbox(inventoryId, type);
    await expect.poll(() => this.activeSplitTypes(inventoryId)).toEqual([type]);
  }

  async dismissNotAllowed(): Promise<void> {
    await this.locators.notAllowedDialog.getByRole('button').first().click();
    await expect(this.locators.notAllowedDialog).toBeHidden();
  }

  async openPickCountry(inventoryId: string): Promise<void> {
    await this.locators.rowPickCountryButton(inventoryId).click();
    await expect(this.locators.countryDialog).toBeVisible();
  }

  /** Opens a line's split form from its alternate-code button. */
  async openSplitForm(inventoryId: string, title: string): Promise<void> {
    await this.locators.rowAlternateCodeButton(inventoryId).click();
    await expect(this.locators.splitFormDialog(title)).toBeVisible();
  }

  async closeDialog(dialog: Locator): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }

  // ---- Items filter ----

  async filterItems(text: string): Promise<void> {
    await this.locators.itemsFilter.fill(text);
  }

  // ---- Split details / thread items / bulk paste / copy ----

  async openSplitDetails(): Promise<void> {
    await this.detail.splitDetailsTab.click();
    await expect(this.locators.splitDetailsDialog).toBeVisible();
  }

  async openThreadItems(): Promise<void> {
    await this.detail.threadItemsTab.click();
    await expect(this.locators.threadItemsDialog).toBeVisible();
  }

  async openBulkPaste(): Promise<void> {
    await this.detail.bulkPasteButton.click();
    await expect(this.locators.bulkPasteDialog).toBeVisible();
  }

  async openCopyBom(): Promise<void> {
    await this.detail.copyBomButton.click();
    await expect(this.locators.copyBomDialog).toBeVisible();
    await expect(this.locators.copySourceRows.first()).toBeVisible({ timeout: 30_000 });
  }

  /** Picks a source BOM row in "Copy B.O.M" and confirms the copy ("Copy items only" → "Confirm"). */
  async copyFrom(sourceCode: string, sourceRev: number): Promise<void> {
    await this.locators.copySourceSearch.fill(sourceCode);
    await this.locators.copyBomDialog
      .getByRole('row', { name: new RegExp(`^Select row ${sourceCode}/${sourceRev}\\b`) })
      .getByRole('cell')
      .nth(1)
      .click();
    await expect(
      this.locators.copyBomDialog.getByText(`${sourceCode} · rev ${sourceRev}`).first(),
    ).toBeVisible();
    await this.locators.copyBomDialog.getByRole('button', { name: /^Copy items/ }).click();
    await this.locators.copyBomDialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(this.locators.copyBomDialog).toBeHidden();
  }
}
