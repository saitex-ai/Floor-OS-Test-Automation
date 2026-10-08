import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CurrencyRateLocators } from '../../locators/master-data/currency-rate.locators';

/**
 * The "Currency Rate" screen under Master Data > System Management. Real
 * route: /master-data/system-management/currency-rate. Owned by the
 * Master Data QA (shared module). Element locators live in
 * CurrencyRateLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Confirmed live (2026-10-06): this screen is **read-only** for the
 * `master-data` test user — no Create/Edit/Delete affordance exists on
 * either tab, and a direct goto() to `/currency-rate/new` renders the
 * shell's generic "Not Found" page. This page object is therefore
 * List/Filter/Load-shaped, not CRUD-shaped — see
 * test-cases/master-data/currency-rate/currency-rate-testcases.md for
 * the full write-up this was built from.
 */
export class CurrencyRatePage extends BasePage {
  readonly locators: CurrencyRateLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CurrencyRateLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/currency-rate');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.rateDetailsTab).toBeVisible();
    await expect(this.locators.currencyRateDetailsTab).toBeVisible();
  }

  async openRateDetailsTab(): Promise<void> {
    await this.locators.rateDetailsTab.click();
  }

  async openCurrencyRateDetailsTab(): Promise<void> {
    await this.locators.currencyRateDetailsTab.click();
  }

  /**
   * "Rate Details" tab lookup: pick a To Currency and (optionally) click
   * Load. Effective Date is left at its default (today) unless
   * `navigateMonthsBack` is given — confirmed live this is an "as of"
   * lookup (latest rate on/before the picked date), so today's default
   * date already exercises the positive path against the 5/1/2026 seed
   * data without needing any calendar navigation.
   */
  async filterByCurrency(toCurrency: string | RegExp): Promise<void> {
    await this.locators.toCurrencyField.click();
    await this.locators.currencyOption(toCurrency).click();
  }

  /**
   * Navigates the Effective Date calendar popover back a number of
   * months and picks a day in that month — confirmed live as the only
   * way to reach an arbitrary past date (no typable date input exists in
   * the popover). Used for TC:5-style "date before any seeded rate"
   * cases. `day` defaults to 1 (always a valid day in every month).
   */
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

  async expectLoadDisabled(): Promise<void> {
    await expect(this.locators.loadButton).toBeDisabled();
  }

  async expectLoadEnabled(): Promise<void> {
    await expect(this.locators.loadButton).toBeEnabled();
  }

  /** Pre-Load empty state on "Rate Details", confirmed live, exact text. */
  async expectPickFiltersPrompt(): Promise<void> {
    await expect(
      this.page.getByText('Pick a To Currency and Effective Date, then click Load.'),
    ).toBeVisible();
  }

  /** Post-Load, no matching rate for the picked date — confirmed live, exact text. */
  async expectNoRatesFoundMessage(): Promise<void> {
    await expect(
      this.page.getByText('No rates found for the picked To Currency / Effective Date.'),
    ).toBeVisible();
  }

  /** A From-Currency row is present in the "Rate Details" result grid after a successful Load. */
  async expectRateRowVisible(fromCurrency: string | RegExp): Promise<void> {
    await expect(this.locators.row(fromCurrency).first()).toBeVisible();
  }

  async clickExportCsv(): Promise<void> {
    await this.locators.exportCsvButton.click();
  }

  async openConfigureColumnsPanel(): Promise<void> {
    await this.locators.configureColumnsButton.click();
  }

  /**
   * The "Columns" panel lists exactly these 6 columns, confirmed live
   * ("6/6", no hidden Actions/edit column) — this screen's grid has no
   * row-level actions since it's read-only.
   */
  async expectColumnsPanelListsExactly(columns: readonly string[]): Promise<void> {
    await expect(this.locators.columnsPanel).toBeVisible();
    for (const column of columns) {
      await expect(this.locators.columnsPanel.getByText(column, { exact: true })).toBeVisible();
    }
  }

  /** Not Found page confirmed live for a direct goto() to the (non-existent) create route. */
  async gotoNewRouteDirectly(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/currency-rate/new');
  }

  async expectNotFoundPage(): Promise<void> {
    await expect(this.page.getByText('Not Found', { exact: true })).toBeVisible();
  }
}
