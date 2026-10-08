import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Currency Rate Buyer" screen
 * (/master-data/system-management/currency-rate-buyer) under Master Data
 * > System Management. No actions or assertions here, see
 * src/pages/master-data/currency-rate-buyer.page.ts for those.
 *
 * Confirmed live (2026-10-06), same as plain Currency Rate: this screen
 * is **read-only** for the `master-data` test user. One real difference
 * from Currency Rate: "Rate Details" here requires a third field,
 * **Customer**, via the same searchable "Select Customer" dialog used by
 * Customer Percentage's "Add Row" (1009 customers, 21 pages, search box
 * "Search by code, name, prefix, country, or email..."). See
 * test-cases/master-data/currency-rate-buyer/currency-rate-buyer-testcases.md
 * for the full write-up.
 *
 * This screen's two tabs are named "Rate Details" / "Currency Rate
 * List" — **not** "Currency Rate Details" like the plain Currency Rate
 * screen's second tab (confirmed live, a genuine per-screen naming
 * inconsistency) — so, unlike that screen, there's no substring
 * collision between these two tab names and `exact: true` isn't
 * strictly required here, but it's used anyway for consistency.
 *
 * The "Currency Rate List" tab's filter comboboxes/date buttons share
 * the same "no stable label" shape as plain Currency Rate's "Currency
 * Rate Details" tab (confirmed live) — addressed by position, same
 * approach as CurrencyRateLocators.
 */
export class CurrencyRateBuyerLocators {
  readonly heading: Locator;
  readonly rateDetailsTab: Locator;
  readonly currencyRateListTab: Locator;

  // "Rate Details" tab
  readonly toCurrencyField: Locator;
  readonly effectiveDateField: Locator;
  readonly customerField: Locator;
  readonly loadButton: Locator;
  readonly clearButton: Locator;

  // "Currency Rate List" tab — filter bar (no stable labels, see class doc)
  readonly customerFilterField: Locator;
  readonly fromCurrencyFilter: Locator;
  readonly toCurrencyFilter: Locator;
  readonly fromDateButton: Locator;
  readonly toDateButton: Locator;
  readonly refreshButton: Locator;

  // Grid toolbar — confirmed live: ABSENT on "Currency Rate List" even
  // once real rows are loaded (unlike every other Master Data grid), so
  // no exportCsvButton/configureColumnsButton locator exists here on
  // purpose — asserting their absence is the point of TC:8.

  // Customer picker dialog (shared "Select Customer" component)
  readonly customerSearchInput: Locator;

  // Calendar popover (shared by both tabs' date pickers)
  readonly calendarPreviousMonthButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Currency Rate Buyer', exact: true });
    this.rateDetailsTab = page.getByRole('tab', { name: 'Rate Details', exact: true });
    this.currencyRateListTab = page.getByRole('tab', { name: 'Currency Rate List', exact: true });

    this.toCurrencyField = page.getByLabel('To Currency', { exact: false });
    // See CurrencyRateLocators' matching comment: NOT getByLabel() —
    // confirmed fragile live on 2026-10-07 (it can silently resolve to the
    // grid's "Resize Effective Date column" button instead). The real
    // trigger's accessible name is "<date> Clear date".
    this.effectiveDateField = page.getByRole('button', { name: /^\w+ \d{1,2}, \d{4}/ });
    // Confirmed live: aria-label="Pick customer" directly on the input —
    // no real <label> association, so getByLabel() does not resolve this
    // one (confirmed: count 0), unlike To Currency/Effective Date above.
    this.customerField = page.getByRole('textbox', { name: 'Pick customer' });
    this.loadButton = page.getByRole('button', { name: 'Load', exact: true });
    this.clearButton = page.getByRole('button', { name: 'Clear', exact: true });

    this.customerFilterField = page.getByPlaceholder(/pick a customer in rate details first/i);
    this.fromCurrencyFilter = page.getByRole('combobox').nth(0);
    this.toCurrencyFilter = page.getByRole('combobox').nth(1);
    this.fromDateButton = page.getByRole('button', { name: 'Pick date', exact: true }).nth(0);
    this.toDateButton = page.getByRole('button', { name: 'Pick date', exact: true }).nth(1);
    this.refreshButton = page.getByRole('button', { name: 'Refresh', exact: true });

    this.customerSearchInput = page.getByPlaceholder(/search by code, name, prefix/i);

    this.calendarPreviousMonthButton = page.getByRole('button', {
      name: 'Go to the Previous Month',
    });
  }

  currencyOption(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  calendarDay(day: number): Locator {
    return this.page
      .locator('table')
      .last()
      .getByText(String(day), { exact: true })
      .first();
  }

  /** A customer row inside the open "Select Customer" dialog. */
  customerPickerRow(text: string | RegExp): Locator {
    return this.page.locator('tr', { hasText: text });
  }

  /** A data row in the "Currency Rate List" grid, matched by any visible cell text. */
  row(text: string | RegExp): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }
}
