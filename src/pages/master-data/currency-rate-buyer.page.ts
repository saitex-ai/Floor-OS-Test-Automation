import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CurrencyRateBuyerLocators } from '../../locators/master-data/currency-rate-buyer.locators';

/**
 * The "Currency Rate Buyer" screen under Master Data > System
 * Management. Real route:
 * /master-data/system-management/currency-rate-buyer. Owned by the
 * Master Data QA (shared module). Element locators live in
 * CurrencyRateBuyerLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Confirmed live (2026-10-06): read-only, same as plain Currency Rate —
 * see CurrencyRatePage's own doc comment. The one functional difference:
 * "Rate Details" here needs a third required field, Customer, via the
 * shared "Select Customer" dialog. Customer "ACME Apparel" (`CTC0000002`)
 * has 13 real seeded buyer-rate-override rows — use it for positive-path
 * Load assertions; a fresh/throwaway customer correctly has none, for
 * the empty-state path. See
 * test-cases/master-data/currency-rate-buyer/currency-rate-buyer-testcases.md.
 */
export class CurrencyRateBuyerPage extends BasePage {
  readonly locators: CurrencyRateBuyerLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CurrencyRateBuyerLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/currency-rate-buyer');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.rateDetailsTab).toBeVisible();
    await expect(this.locators.currencyRateListTab).toBeVisible();
  }

  async openRateDetailsTab(): Promise<void> {
    await this.locators.rateDetailsTab.click();
  }

  async openCurrencyRateListTab(): Promise<void> {
    await this.locators.currencyRateListTab.click();
  }

  async filterByCurrency(toCurrency: string | RegExp): Promise<void> {
    await this.locators.toCurrencyField.click();
    await this.locators.currencyOption(toCurrency).click();
  }

  /** Opens the "Select Customer" dialog, searches, and clicks the first matching row. */
  async pickCustomer(searchTerm: string): Promise<void> {
    await this.locators.customerField.click();
    await this.locators.customerSearchInput.fill(searchTerm);
    await this.locators.customerPickerRow(searchTerm).first().click();
  }

  async setEffectiveDateMonthsBack(monthsBack: number, day = 1): Promise<void> {
    await this.locators.effectiveDateField.click();
    for (let i = 0; i < monthsBack; i++) {
      await this.locators.calendarPreviousMonthButton.click();
    }
    await this.locators.calendarDay(day).click();
  }

  async clickLoad(): Promise<void> {
    await this.locators.loadButton.click();
  }

  async clickClear(): Promise<void> {
    await this.locators.clearButton.click();
  }

  async expectLoadDisabled(): Promise<void> {
    await expect(this.locators.loadButton).toBeDisabled();
  }

  async expectLoadEnabled(): Promise<void> {
    await expect(this.locators.loadButton).toBeEnabled();
  }

  /** Post-Load, no buyer rate for the picked Customer/Currency/Date — confirmed live, exact text. */
  async expectNoBuyerRatesFoundMessage(): Promise<void> {
    await expect(
      this.page.getByText(
        'No buyer rates found for the picked Customer / To Currency / Effective Date.',
      ),
    ).toBeVisible();
  }

  /** Pre-filter empty state on "Currency Rate List" before a Customer has been loaded — confirmed live, exact text. */
  async expectPickCustomerFirstPrompt(): Promise<void> {
    await expect(
      this.page.getByText('Pick a customer in the Rate Details tab to load buyer rates here.'),
    ).toBeVisible();
  }

  async expectRateRowVisible(fromCurrency: string | RegExp): Promise<void> {
    await expect(this.locators.row(fromCurrency).first()).toBeVisible();
  }

  /**
   * Confirmed live: unlike every other Master Data grid in this module,
   * the "Currency Rate List" tab shows NO Export CSV / Configure columns
   * / Filters toolbar at all — not even once real rows are loaded. TC:8
   * asserts this absence explicitly rather than assuming it.
   */
  async expectNoGridToolbar(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: 'Configure columns' })).toHaveCount(0);
  }

  async gotoNewRouteDirectly(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/currency-rate-buyer/new');
  }

  async expectNotFoundPage(): Promise<void> {
    await expect(this.page.getByText('Not Found', { exact: true })).toBeVisible();
  }
}
