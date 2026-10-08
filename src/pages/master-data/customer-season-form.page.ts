import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerSeasonFormLocators } from '../../locators/master-data/customer-season-form.locators';

/**
 * Season Code and Description — the two plain-text fields confirmed live
 * (2026-10-06) to be genuinely required alongside Customer (picked via
 * pickCustomer()/pickAnyCustomer(), not a fillable field — see below).
 */
export interface SeasonFieldValues {
  seasonCode?: string;
  description?: string;
}

/**
 * The "New Season" / "Edit Season" modal dialog on the top-level Master
 * Data module. Reached from CustomerSeasonListPage. Owned by the Master
 * Data QA (shared module). Element locators live in
 * CustomerSeasonFormLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CustomerSeasonFormPage extends BasePage {
  readonly locators: CustomerSeasonFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerSeasonFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'New Season' })).toBeVisible();
  }

  async expectOnEditPage(seasonCode: string): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.page.getByText(`Editing ${seasonCode}`)).toBeVisible();
  }

  async fillFields(values: SeasonFieldValues): Promise<void> {
    if (values.seasonCode !== undefined) await this.locators.seasonCodeInput.fill(values.seasonCode);
    if (values.description !== undefined)
      await this.locators.descriptionInput.fill(values.description);
  }

  /**
   * Opens the "Select Customer" picker, searches it by `searchTerm`, and
   * clicks the first row matching `codeMatch`. Confirmed live: selecting a
   * row auto-closes the picker and populates the parent field as
   * "<Code> — <Name>".
   */
  async pickCustomer(searchTerm: string, codeMatch: string | RegExp): Promise<void> {
    await this.locators.pickCustomerButton.click();
    await expect(this.locators.customerPickerDialog).toBeVisible();
    await this.locators.customerPickerSearchInput.fill(searchTerm);
    const row = this.locators.customerPickerRow(codeMatch).first();
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.click();
    await expect(this.locators.customerPickerDialog).toBeHidden();
    // Confirmed live: the field briefly shows just the Code before the
    // "— Name" half renders (a short async lookup after selection) — wait
    // for the full shape rather than racing a one-shot innerText() read.
    await expect(this.locators.customerDisplay).toHaveValue(/—/, { timeout: 10_000 });
  }

  /**
   * Opens the picker with no filter and clicks whichever real data row sits
   * at `index` (0 = first) — used when a test just needs "some valid
   * customer" without caring which one (e.g. TC:9's "different customer"
   * case). Returns the resulting Customer Code parsed back out of the
   * parent field's own "<Code> — <Name>" display text.
   */
  async pickCustomerByIndex(index: number): Promise<string> {
    await this.locators.pickCustomerButton.click();
    await expect(this.locators.customerPickerDialog).toBeVisible();
    const row = this.locators.customerPickerDataRows().nth(index);
    await row.waitFor({ state: 'visible', timeout: 10_000 });
    await row.click();
    await expect(this.locators.customerPickerDialog).toBeHidden();
    // Confirmed live: the field briefly shows just the Code before the
    // "— Name" half renders (a short async lookup after selection) — wait
    // for the full shape rather than racing a one-shot innerText() read.
    await expect(this.locators.customerDisplay).toHaveValue(/—/, { timeout: 10_000 });
    return this.getDisplayedCustomerCode();
  }

  /**
   * customerDisplay is a real `<input readonly>` (confirmed live via its
   * DOM: `<input readonly id="customerCode" value="...">`) — its text
   * lives in the `value` property, not textContent, so this reads
   * inputValue() rather than innerText() (which is always empty for a
   * plain input, a mistake that cost real debugging time here).
   */
  async getDisplayedCustomerCode(): Promise<string> {
    const text = await this.locators.customerDisplay.inputValue();
    const match = /^(\S+)\s+—/.exec(text);
    if (!match) throw new Error(`Unexpected customer display text: "${text}"`);
    return match[1]!;
  }

  /** The Name half of the parent field's own "<Code> — <Name>" display text (see getDisplayedCustomerCode()'s note on inputValue() vs innerText()). */
  async getDisplayedCustomerName(): Promise<string> {
    const text = await this.locators.customerDisplay.inputValue();
    const match = /—\s+(.+)$/.exec(text);
    if (!match) throw new Error(`Unexpected customer display text: "${text}"`);
    return match[1]!;
  }

  async toggleActive(): Promise<void> {
    await this.locators.activeCheckbox.click();
  }

  async isActive(): Promise<boolean> {
    return this.locators.activeCheckbox.isChecked();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async save(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  /** "Close" is this dialog's Cancel-equivalent (see class doc). */
  async close(): Promise<void> {
    await this.locators.closeButton.click();
  }

  async deactivate(): Promise<void> {
    await this.locators.deactivateButton.click();
  }

  /** Opens the Delete confirmation `alertdialog` without confirming it yet. */
  async clickDelete(): Promise<void> {
    await this.locators.deleteButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
  }

  async confirmDelete(): Promise<void> {
    await this.locators.confirmDeleteButton().click();
  }

  async cancelDelete(): Promise<void> {
    await this.locators.cancelDeleteButton().click();
  }

  /**
   * Real toast text confirmed live: "Season {CODE} created." (with a
   * trailing period — contrast with the update/deactivate toasts below,
   * which drop it; see customer-season-master-testcases.md's Notes).
   */
  async expectCreatedSuccessfully(): Promise<void> {
    // Confirmed live: this dev environment is shared/busy (multiple
    // concurrent test suites) — create saves have been observed to
    // occasionally take longer than 15-30s to round-trip under load, not a
    // locator/app problem, so this allows more headroom.
    await expect(this.page.getByText(/^Season .+ created\.$/)).toBeVisible({ timeout: 45_000 });
  }

  /** Parses the Season Code out of the create toast (e.g. "TCS463781"). */
  async getCreatedSeasonCode(): Promise<string> {
    const toast = this.page.getByText(/^Season .+ created\.$/);
    const text = await toast.innerText();
    const match = /^Season (\S+) created\.$/.exec(text);
    if (!match) throw new Error(`Unexpected create toast text: "${text}"`);
    return match[1]!;
  }

  /**
   * Real toast text confirmed live: exactly "Season updated" — deliberately
   * NO trailing period, unlike Create/Delete's own toasts. Asserted with
   * an exact string (not a loose substring) so a future punctuation fix
   * would be caught, not silently absorbed.
   */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Season updated', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /** Real toast text confirmed live: exactly "Season deactivated" — no trailing period. */
  async expectDeactivatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Season deactivated', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /** Real toast text confirmed live: "Season deleted." — trailing period, unlike update/deactivate. */
  async expectDeletedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Season deleted.')).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Real, specific duplicate-prevention message confirmed live — scoped
   * per-customer, not global (contrast with Company Master's generic
   * "Failed to create company." for its own duplicate case).
   */
  async expectDuplicateSeasonCodeError(): Promise<void> {
    await expect(
      this.page.getByText('That season code already exists for this customer.'),
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectStillOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  async expectRequiredError(fieldAnchor: Locator): Promise<void> {
    await expect(this.locators.requiredErrorFor(fieldAnchor)).toHaveText(/required/i);
  }

  async expectCustomerFieldInvalid(): Promise<void> {
    await expect(this.locators.customerDisplay).toHaveAttribute('aria-invalid', 'true');
  }
}
