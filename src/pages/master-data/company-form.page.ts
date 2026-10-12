import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CompanyFormLocators } from '../../locators/master-data/company-form.locators';

/**
 * The six fields confirmed live (2026-10-06) to be genuinely required on
 * Company Master's Create/Edit form — submitting blank shows a real
 * "Required" error under every one of these simultaneously, matching
 * their `*` markers exactly (no Sites-style gap between what looks
 * required and what's enforced).
 */
export interface CompanyFieldValues {
  companyCode?: string;
  prefixCode?: string;
  companyName?: string;
  address?: string;
  /** Plain Radix select option, e.g. /India/. Genuinely optional. */
  countryOfOperation?: string | RegExp;
  taxRegistrationNumber?: string;
  telephone?: string;
  fax?: string;
  /** Plain Radix select option, e.g. /USD/. */
  primaryCurrency?: string | RegExp;
  /** Plain Radix select option, e.g. /VND/. */
  secondaryCurrency?: string | RegExp;
  scrapPercent?: string;
  imagePath?: string;
  documentPath?: string;
  frPath?: string;
  gproPath?: string;
}

/**
 * The "New Company" / "Edit Company" view (same field set either way) on
 * the top-level Master Data module. Reached from CompanyListPage — not a
 * dedicated route, see CompanyFormLocators' class doc. Owned by the
 * Master Data QA (shared module). Element locators live in
 * CompanyFormLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CompanyFormPage extends BasePage {
  readonly locators: CompanyFormLocators;

  /** The confirmed-live option set shared by Primary Currency and Secondary Currency (TC:14). */
  private static readonly CURRENCY_CODES = [
    'CNY',
    'EUR',
    'GBP',
    'HKD',
    'INR',
    'JPY',
    'KRW',
    'SGD',
    'USD',
    'VND',
  ];

  constructor(page: Page) {
    super(page);
    this.locators = new CompanyFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'New Company' })).toBeVisible();
  }

  async expectOnEditPage(companyCode: string): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.page.getByText(`Editing ${companyCode}`)).toBeVisible();
  }

  /**
   * Fills only the keys actually passed (same "leave undefined to leave
   * blank" convention as CRM's CreateCustomerPage.fillProfile() and
   * Vendor Master's own fillRequired()) — used both for the full happy
   * path and for the "every field but one" required-field sweep.
   */
  async fillRequired(values: CompanyFieldValues): Promise<void> {
    const l = this.locators;
    if (values.companyCode !== undefined) await l.companyCodeInput.fill(values.companyCode);
    if (values.prefixCode !== undefined) await l.prefixCodeInput.fill(values.prefixCode);
    if (values.companyName !== undefined) await l.companyNameInput.fill(values.companyName);
    if (values.address !== undefined) await l.addressInput.fill(values.address);
    if (values.countryOfOperation !== undefined)
      await this.selectDropdown(l.countryOfOperationCombobox, values.countryOfOperation);
    if (values.taxRegistrationNumber !== undefined)
      await l.taxRegistrationNumberInput.fill(values.taxRegistrationNumber);
    if (values.telephone !== undefined) await l.telephoneInput.fill(values.telephone);
    if (values.fax !== undefined) await l.faxInput.fill(values.fax);
    if (values.primaryCurrency !== undefined)
      await this.selectDropdown(l.primaryCurrencyCombobox, values.primaryCurrency);
    if (values.secondaryCurrency !== undefined)
      await this.selectDropdown(l.secondaryCurrencyCombobox, values.secondaryCurrency);
    if (values.scrapPercent !== undefined) await l.scrapPercentInput.fill(values.scrapPercent);
    if (values.imagePath !== undefined) await l.imagePathInput.fill(values.imagePath);
    if (values.documentPath !== undefined) await l.documentPathInput.fill(values.documentPath);
    if (values.frPath !== undefined) await l.frPathInput.fill(values.frPath);
    if (values.gproPath !== undefined) await l.gproPathInput.fill(values.gproPath);
  }

  /**
   * Country of Operation / Primary Currency / Secondary Currency are plain
   * Radix selects. On this shared, sometimes-slow dev environment the
   * listbox has occasionally not opened on the first trigger click
   * (confirmed live on Customer Master's identical pattern), so this
   * retries the click once after a short, bounded wait rather than
   * failing the whole flow on one missed render.
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

  async toggleMasterDataApprovalRequired(): Promise<void> {
    await this.locators.masterDataApprovalSwitch.click();
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

  /** The top-of-form quick action; confirms the "Deactivate {code}?" alertdialog (added 2026-10-12). */
  async deactivate(): Promise<void> {
    await this.locators.deactivateButton.click();
    await this.locators.deactivateConfirmButton.click();
  }

  /** Real toast text confirmed live: "Company created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Company created.')).toBeVisible({ timeout: 45_000 });
  }

  /** Real toast text confirmed live: "Company updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Company updated.')).toBeVisible({ timeout: 30_000 });
  }

  /** Real toast text confirmed live: "Company deactivated." */
  async expectDeactivatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Company deactivated.')).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Real toast text confirmed live (2026-10-12) for a duplicate Company
   * Code: "A company with the code {CODE} already exists. Choose a unique
   * code." Until 2026-10-08 this was the generic "Failed to create
   * company." — that UX gap is now fixed.
   */
  async expectDuplicateCodeError(companyCode: string): Promise<void> {
    await expect(
      this.page.getByText(
        `A company with the code ${companyCode} already exists. Choose a unique code.`,
        { exact: true },
      ),
    ).toBeVisible({ timeout: 30_000 });
  }

  async expectStillOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
  }

  async expectRequiredError(fieldAnchor: Locator): Promise<void> {
    await expect(this.locators.requiredErrorFor(fieldAnchor)).toHaveText(/required/i);
  }

  /**
   * Confirmed live (2026-10-12): once the company is Inactive the top-of-form
   * action relabels to "Activate". Until 2026-10-08 it kept showing
   * "Deactivate" and the only way back was the in-form Active checkbox.
   */
  async expectActivateButtonShows(): Promise<void> {
    await expect(this.locators.activateButton).toBeVisible();
    await expect(this.locators.deactivateButton).not.toBeVisible();
  }

  /** Top-of-form "Activate" on an Inactive record — no confirmation step, confirmed live. */
  async activate(): Promise<void> {
    await this.locators.activateButton.click();
  }

  /** Real toast text confirmed live (2026-10-12): just "Reactivated". */
  async expectReactivatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Reactivated', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Opens a currency combobox (Primary or Secondary Currency — same
   * confirmed-live option set either way, TC:14) and asserts every option
   * renders as "<CODE> — <name>". Pass `checkListbox: true` once per test
   * to also confirm the trigger opens a plain `listbox` popup.
   */
  async expectCurrencyOptionsVisible(
    trigger: Locator,
    { checkListbox = false }: { checkListbox?: boolean } = {},
  ): Promise<void> {
    await trigger.click();
    if (checkListbox) {
      await expect(this.locators.currencyListbox).toBeVisible();
    }
    for (const code of CompanyFormPage.CURRENCY_CODES) {
      await expect(this.locators.option(new RegExp(`^${code} —`))).toBeVisible();
    }
  }
}
