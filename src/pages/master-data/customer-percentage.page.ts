import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerPercentageLocators } from '../../locators/master-data/customer-percentage.locators';

const CUSTOMER_PERCENTAGE_PATH = '/master-data/system-management/customer-percentage';

export interface CustomerPercentagePercentages {
  cutticket?: string;
  needSheet?: string;
  costSheetInternal?: string;
  costSheetBuyer?: string;
}

/**
 * The "Customer Percentage" screen under Master Data > System
 * Management. Real route: /master-data/system-management/customer-percentage.
 * Owned by the Master Data QA (shared module). Element locators live in
 * CustomerPercentageLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * **Genuine UI quirk, confirmed live and reproducible:** after a
 * successful Save changes or Delete, the in-session grid list (and even
 * a freshly re-opened Edit dialog for the *same* row, in the *same* page
 * session) can continue showing the pre-mutation value/row until the
 * page is fully reloaded — the success toast fires correctly and the
 * mutation IS genuinely persisted server-side (confirmed via a hard
 * reload + re-search every time), but the client-side list/dialog cache
 * does not invalidate itself automatically. **Callers must re-open() +
 * search() again (not just re-click the row) before asserting on
 * post-mutation state** — see expectPersistedAfterReload() below, which
 * every edit/delete test in 16-customer-percentage.spec.ts uses instead
 * of asserting immediately after Save/Delete.
 */
export class CustomerPercentagePage extends BasePage {
  readonly locators: CustomerPercentageLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerPercentageLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_PERCENTAGE_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.addRowButton).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  async openAddRow(): Promise<void> {
    await this.locators.addRowButton.click();
  }

  /** Opens "Edit Row" for the first grid row matching `text` (e.g. a Customer code). */
  async openRowForEdit(text: string | RegExp): Promise<void> {
    await this.locators.row(text).first().click();
  }

  /** Opens the shared "Select Customer" dialog, searches, and clicks the first matching row. */
  async pickCustomer(searchTerm: string): Promise<void> {
    await this.locators.customerField.click();
    await this.locators.customerPickerSearchInput.fill(searchTerm);
    await this.locators.pickerRow(searchTerm).first().click();
  }

  /** Opens the Item Type picker and clicks the first row matching `text` (e.g. "Information Technology"). */
  async pickItemType(text: string | RegExp): Promise<void> {
    await this.locators.itemTypeField.click();
    await this.locators.pickerRow(text).first().click();
  }

  /** Opens the Item Category picker (only enabled once an Item Type is chosen) and clicks the first matching row. */
  async pickItemCategory(text: string | RegExp): Promise<void> {
    await this.locators.itemCategoryField.click();
    await this.locators.pickerRow(text).first().click();
  }

  async fillPercentages(values: CustomerPercentagePercentages): Promise<void> {
    if (values.cutticket !== undefined) await this.locators.cutticketInput.fill(values.cutticket);
    if (values.needSheet !== undefined) await this.locators.needSheetInput.fill(values.needSheet);
    if (values.costSheetInternal !== undefined)
      await this.locators.costSheetInternalInput.fill(values.costSheetInternal);
    if (values.costSheetBuyer !== undefined)
      await this.locators.costSheetBuyerInput.fill(values.costSheetBuyer);
  }

  async clickCreate(): Promise<void> {
    await this.locators.createButton.click();
  }

  async clickSaveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async closeDialog(): Promise<void> {
    await this.locators.closeButton.click();
  }

  /** Clicks the Edit Row dialog's header delete (trash) icon, opening the confirm dialog. */
  async clickDeleteIcon(): Promise<void> {
    await this.locators.deleteIconButton.click();
  }

  async confirmDelete(): Promise<void> {
    await this.locators.confirmDeleteButton.click();
  }

  async cancelDelete(): Promise<void> {
    await this.locators.cancelDeleteButton.click();
  }

  async expectDialogClosed(): Promise<void> {
    await expect(this.locators.dialog).toBeHidden();
  }

  async expectRequiredErrorOnCustomerAndItemType(): Promise<void> {
    await expect(this.locators.requiredError()).toHaveCount(2);
  }

  /**
   * Reads a `<input type="number">`'s native HTML5 validation message
   * (e.g. "Value must be greater than or equal to 0.") — this is a
   * browser-native constraint-validation tooltip, not DOM text, so it
   * isn't queryable via getByText()/getByRole(); evaluate() against the
   * element's own `validationMessage` property is the only way to read
   * it, confirmed live to match what's shown on screen.
   */
  async getNativeValidationMessage(input: Locator): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no "DOM" lib in tsconfig (ES2022 only), so HTMLInputElement isn't a known type here even though this callback runs in the browser.
    return input.evaluate((el: any) => el.validationMessage as string);
  }

  async expectInputInvalid(input: Locator): Promise<void> {
    await expect(input).toHaveJSProperty('validity.valid', false);
  }

  // Exact toast strings, confirmed live (no trailing periods — unlike
  // Departments'/Sites' "... created."/"... updated." convention).
  async expectRowCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Row created', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectRowUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Row updated', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectRowDeletedToast(): Promise<void> {
    await expect(this.page.getByText('Row deleted', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Confirmed live: duplicate Customer+Item Type fails with this generic toast, not a duplicate-specific message. */
  async expectCouldNotCreateToast(): Promise<void> {
    await expect(this.page.getByText('Could not create the row', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Works around the stale-UI-after-mutation quirk documented on this
   * class: re-opens the screen fresh (not just re-searches in the same
   * session) and searches again, so the grid reflects the real,
   * server-persisted post-mutation state rather than a cached
   * pre-mutation value.
   */
  async expectPersistedAfterReload(searchTerm: string, expectedRowText: string | RegExp): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await this.search(searchTerm);
    await expect(this.locators.row(expectedRowText).first()).toBeVisible({ timeout: 15_000 });
  }

  async expectNoRowAfterReload(searchTerm: string): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await this.search(searchTerm);
    await expect(
      this.page.getByText('No customer percentage rows yet.', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async clickExportCsv(): Promise<void> {
    await this.locators.exportCsvButton.click();
  }
}
