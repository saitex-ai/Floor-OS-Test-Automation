import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { VendorFormLocators } from '../../locators/master-data/vendor-form.locators';

/**
 * The 8 fields confirmed live (2026-10-06) to be genuinely required on
 * Vendor Master's Create/Edit form — submitting blank shows a real
 * "Required" error under every one of these, not just an asterisk that
 * turns out to be decorative (contrast with Sites' Country/Timezone
 * elsewhere in this repo's Master Data notes).
 */
export interface VendorFieldValues {
  prefixId?: string;
  vendorName?: string;
  /** Picked from the "Select Currency" grid dialog, e.g. /USD/. */
  currency?: string | RegExp;
  /** Plain Radix select option, e.g. /NET30/. */
  creditTerms?: string | RegExp;
  /** Plain Radix select option, e.g. /Telegraphic Transfer/. */
  paymentMethod?: string | RegExp;
  addressLine1?: string;
  city?: string;
  /** Picked from the "Select Country" grid dialog, e.g. /India/. */
  country?: string | RegExp;
  // Optional fields, included for completeness / the "all fields" create case.
  registeredName?: string;
  email?: string;
  website?: string;
}

/**
 * The "New Vendor" / "Edit Vendor" drawer (same field set either way) on
 * the top-level Master Data module. Reached from VendorListPage — not a
 * dedicated route, see VendorFormLocators' class doc. Owned by the Master
 * Data QA (shared module). Element locators live in VendorFormLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class VendorFormPage extends BasePage {
  readonly locators: VendorFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new VendorFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'New Vendor' })).toBeVisible();
  }

  async expectOnEditPage(code: string): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.page.getByText(`Editing ${code}`)).toBeVisible();
  }

  /**
   * Fills only the keys actually passed (same "leave undefined to leave
   * blank" convention as CreateCustomerPage.fillProfile()) — used both for
   * the full happy path and for the "every field but one" required-field
   * sweep (TC:4 in vendor-master-testcases.md).
   */
  async fillRequired(values: VendorFieldValues): Promise<void> {
    const l = this.locators;
    if (values.prefixId !== undefined) await l.prefixIdInput.fill(values.prefixId);
    if (values.vendorName !== undefined) await l.vendorNameInput.fill(values.vendorName);
    if (values.currency !== undefined) await this.pickCurrency(values.currency);
    if (values.creditTerms !== undefined) await this.selectDropdown(l.creditTermsCombobox, values.creditTerms);
    if (values.paymentMethod !== undefined)
      await this.selectDropdown(l.paymentMethodCombobox, values.paymentMethod);
    if (values.addressLine1 !== undefined) await l.addressLine1Input.fill(values.addressLine1);
    if (values.city !== undefined) await l.cityInput.fill(values.city);
    if (values.country !== undefined) await this.pickCountry(values.country);
    if (values.registeredName !== undefined) await l.registeredNameInput.fill(values.registeredName);
    if (values.email !== undefined) await l.emailInput.fill(values.email);
    if (values.website !== undefined) await l.websiteInput.fill(values.website);
  }

  /** Currency is a grid-based picker dialog, not a fillable combobox — confirmed live. */
  async pickCurrency(match: string | RegExp): Promise<void> {
    await this.locators.pickCurrencyButton.click();
    await expect(this.locators.currencyPickerDialog).toBeVisible();
    await this.locators.currencyRow(match).click();
  }

  /** Country is the same grid-based picker shape as Currency, confirmed live. */
  async pickCountry(match: string | RegExp): Promise<void> {
    await this.locators.pickCountryButton.click();
    await expect(this.locators.countryPickerDialog).toBeVisible();
    await this.locators.countryRow(match).click();
  }

  /** Credit Terms / Payment Method are plain Radix selects (click trigger -> option list). */
  private async selectDropdown(trigger: Locator, match: string | RegExp): Promise<void> {
    await trigger.click();
    await this.locators.option(match).click();
  }

  async selectCategoriesTab(): Promise<void> {
    await this.locators.categoriesTab.click();
  }

  async selectImageTab(): Promise<void> {
    await this.locators.imageTab.click();
  }

  /**
   * Submits the form. Confirmed live (2026-10-06): the floating "Ask
   * FloorOS AI" button sits fixed at the bottom-right corner and visually
   * overlaps this drawer's sticky Create/Save footer button at normal
   * viewport sizes — a plain `.click()` times out ("subtree intercepts
   * pointer events"), and `force: true` actually activates the AI button
   * instead (opens its chat popup) rather than the real button underneath.
   * scrollIntoView + focus + Enter reliably submits the real `<button
   * type="submit">` regardless of what's visually on top of it, so every
   * caller gets this workaround for free rather than rediscovering it.
   */
  private async clickSubmit(button: Locator): Promise<void> {
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await this.page.keyboard.press('Enter');
  }

  async create(): Promise<void> {
    await this.clickSubmit(this.locators.createButton);
  }

  async save(): Promise<void> {
    await this.clickSubmit(this.locators.saveChangesButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async deactivate(): Promise<void> {
    await this.clickSubmit(this.locators.deactivateButton);
  }

  async expectRequiredError(fieldAnchor: Locator): Promise<void> {
    await expect(this.locators.requiredErrorFor(fieldAnchor)).toHaveText(/required/i);
  }

  /** Real toast text confirmed live: "Vendor {CODE} created." — the vendor code is interpolated in. */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText(/^Vendor .+ created\.$/)).toBeVisible({ timeout: 15_000 });
  }

  /** Real toast text confirmed live: "Vendor updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Vendor updated.')).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Real toast text confirmed live for a duplicate Vendor Name: "Failed to
   * create vendor." — a generic failure message that does not explain the
   * real cause (see vendor-master-testcases.md's Notes — a confirmed UX
   * gap, not a missing assertion here).
   */
  async expectCreateFailed(): Promise<void> {
    await expect(this.page.getByText('Failed to create vendor.')).toBeVisible({ timeout: 15_000 });
  }

  async expectStillOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }
}
