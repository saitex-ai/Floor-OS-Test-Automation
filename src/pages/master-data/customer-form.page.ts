import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerFormLocators } from '../../locators/master-data/customer-form.locators';

/**
 * The four fields confirmed live (2026-10-06) to be genuinely required on
 * Customer Master's Create/Edit form — submitting blank shows a real
 * "Required" error under every one of these simultaneously, matching
 * their `*` markers exactly.
 */
export interface CustomerFieldValues {
  prefixId?: string;
  customerName?: string;
  contactPerson?: string;
  email?: string;
  website?: string;
  phone1?: string;
  buyerCode?: string;
  fax?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  /** Plain Radix select option, e.g. /Afghanistan/ or /^AF —/. */
  country?: string | RegExp;
  /** Plain Radix select option, e.g. /USD/. */
  currency?: string | RegExp;
  paymentMethod?: string | RegExp;
  creditTerms?: string | RegExp;
}

/**
 * The "New Customer" / "Edit Customer" view (same field set either way)
 * on the top-level Master Data module. Reached from CustomerListPage —
 * not a dedicated route, see CustomerFormLocators' class doc. Owned by
 * the Master Data QA (shared module). Element locators live in
 * CustomerFormLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CustomerFormPage extends BasePage {
  readonly locators: CustomerFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'New Customer' })).toBeVisible();
  }

  async expectOnEditPage(customerCode: string): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.page.getByText(`Editing ${customerCode}`)).toBeVisible();
  }

  /** Fills only the keys actually passed — same convention as CompanyFormPage.fillRequired(). */
  async fillRequired(values: CustomerFieldValues): Promise<void> {
    const l = this.locators;
    if (values.prefixId !== undefined) await l.prefixIdInput.fill(values.prefixId);
    if (values.customerName !== undefined) await l.customerNameInput.fill(values.customerName);
    if (values.contactPerson !== undefined) await l.contactPersonInput.fill(values.contactPerson);
    if (values.email !== undefined) await l.emailInput.fill(values.email);
    if (values.website !== undefined) await l.websiteInput.fill(values.website);
    if (values.phone1 !== undefined) await l.phone1Input.fill(values.phone1);
    if (values.buyerCode !== undefined) await l.buyerCodeInput.fill(values.buyerCode);
    if (values.fax !== undefined) await l.faxInput.fill(values.fax);
    if (values.addressLine1 !== undefined) await l.addressLine1Input.fill(values.addressLine1);
    if (values.addressLine2 !== undefined) await l.addressLine2Input.fill(values.addressLine2);
    if (values.city !== undefined) await l.cityInput.fill(values.city);
    if (values.stateProvince !== undefined) await l.stateProvinceInput.fill(values.stateProvince);
    if (values.postalCode !== undefined) await l.postalCodeInput.fill(values.postalCode);
    if (values.country !== undefined) await this.selectDropdown(l.countryCombobox, values.country);
    if (values.currency !== undefined)
      await this.selectDropdown(l.currencyCombobox, values.currency);
    if (values.paymentMethod !== undefined)
      await this.selectDropdown(l.paymentMethodCombobox, values.paymentMethod);
    if (values.creditTerms !== undefined)
      await this.selectDropdown(l.creditTermsCombobox, values.creditTerms);
  }

  /**
   * Country / Currency / Payment Method / Credit Terms are plain Radix
   * selects. On this shared, sometimes-slow dev environment the listbox
   * has occasionally not opened on the first trigger click (confirmed
   * live: a bare `option` wait timed out at 60s with nothing else wrong),
   * so this retries the click once after a short, bounded wait rather
   * than failing the whole flow on one missed render.
   */
  private async selectDropdown(trigger: Locator, match: string | RegExp): Promise<void> {
    await trigger.click();
    const option = this.locators.option(match).first();
    try {
      await option.waitFor({ state: 'visible', timeout: 5_000 });
    } catch {
      await trigger.click();
      await option.waitFor({ state: 'visible', timeout: 15_000 });
    }
    await option.click();
  }

  async toggleActive(): Promise<void> {
    await this.locators.activeCheckbox.click();
  }

  async isActive(): Promise<boolean> {
    return this.locators.activeCheckbox.isChecked();
  }

  async openBrandsTab(): Promise<void> {
    await this.locators.brandsTab.click();
  }

  async openGeneralTab(): Promise<void> {
    await this.locators.generalTab.click();
  }

  /** TC:5 — before the customer is first saved, Brands only shows this gating message. */
  async expectBrandsGatedMessage(): Promise<void> {
    await expect(
      this.page.getByText('Please save the customer first before adding brands.'),
    ).toBeVisible();
    await expect(this.locators.addBrandButton).not.toBeVisible();
  }

  /** TC:5 — after the first save, Brands exposes a real (empty) table + Add Brand button. */
  async expectBrandsTabUsable(): Promise<void> {
    await expect(this.locators.addBrandButton).toBeVisible();
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

  /** The top-of-form quick action — confirmed live to never relabel to "Activate" (see expectDeactivateButtonStillShows). */
  async deactivate(): Promise<void> {
    await this.locators.deactivateButton.click();
  }

  /**
   * Real toast text confirmed live: "Customer {CODE} created." — the
   * auto-generated Customer Code is interpolated in, same shape as Vendor
   * Master's own "Vendor {CODE} created." Matches the dynamic prefix/
   * suffix rather than a static string.
   */
  async expectCreatedSuccessfully(): Promise<void> {
    // Confirmed live: this dev environment is shared/busy (multiple
    // concurrent test suites) — the "all fields" create path in
    // particular has been observed to occasionally take longer than 15-30s
    // to round-trip under load, not a locator/app problem, so this allows
    // more headroom specifically for the heaviest create case.
    await expect(this.page.getByText(/^Customer .+ created\.$/)).toBeVisible({ timeout: 45_000 });
  }

  /** Parses the auto-generated Customer Code out of the create toast (e.g. "CTC0001354"). */
  async getCreatedCustomerCode(): Promise<string> {
    const toast = this.page.getByText(/^Customer .+ created\.$/);
    const text = await toast.innerText();
    const match = /^Customer (\S+) created\.$/.exec(text);
    if (!match) throw new Error(`Unexpected create toast text: "${text}"`);
    return match[1]!;
  }

  /** Real toast text confirmed live: "Customer updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Customer updated.')).toBeVisible({ timeout: 30_000 });
  }

  /** Real toast text confirmed live: "Customer deactivated." */
  async expectDeactivatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Customer deactivated.')).toBeVisible({ timeout: 30_000 });
  }

  async expectStillOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  async expectRequiredError(fieldAnchor: Locator): Promise<void> {
    await expect(this.locators.requiredErrorFor(fieldAnchor)).toHaveText(/required/i);
  }

  /**
   * Real bug confirmed live (2026-10-06, same pattern as Company Master):
   * the "Deactivate" button never relabels to "Activate" once the
   * customer is already Inactive. Asserts that (still-buggy) current
   * behavior rather than papering over it — reactivation is only
   * confirmed working via toggleActive() + save().
   */
  async expectDeactivateButtonStillShows(): Promise<void> {
    await expect(this.locators.deactivateButton).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: 'Activate', exact: true }),
    ).not.toBeVisible();
  }

  /**
   * Native HTML5 `type="email"` validation (confirmed live): an invalid
   * email silently blocks submit with no app-level toast/inline error —
   * read straight off the input's own ValidityState instead.
   */
  async getEmailValidationMessage(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no "DOM" lib in tsconfig (ES2022 only), so HTMLInputElement isn't a known type here even though this callback runs in the browser.
    return this.locators.emailInput.evaluate((el: any) => el.validationMessage as string);
  }

  async isEmailValid(): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see getEmailValidationMessage() above.
    return this.locators.emailInput.evaluate((el: any) => el.validity.valid as boolean);
  }

  /** Confirms no create toast ever appeared — e.g. a blocked submit (TC:10's invalid email). */
  async expectNotCreated(): Promise<void> {
    await expect(this.page.getByText(/created\.$/)).not.toBeVisible();
  }
}
