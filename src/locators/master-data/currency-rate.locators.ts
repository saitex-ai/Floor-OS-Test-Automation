import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Currency Rate" screen
 * (/master-data/system-management/currency-rate) under Master Data >
 * System Management. No actions or assertions here, see
 * src/pages/master-data/currency-rate.page.ts for those.
 *
 * Confirmed live (2026-10-06) this screen is **read-only** for the
 * `master-data` test user — no Create/Edit/Delete affordance exists
 * anywhere, so there is no form-field locator set here, only the two
 * tabs' filter/list controls. See test-cases/master-data/currency-rate/
 * currency-rate-testcases.md for the full write-up.
 *
 * Two tabs, two different shapes:
 * - "Rate Details": a single-row lookup (To Currency + Effective Date,
 *   both with a real `<label>` so `getByLabel()` resolves uniquely and
 *   stays stable even after a value is picked).
 * - "Currency Rate Details": a full filterable/sortable/exportable grid.
 *   Its two currency filter comboboxes and two date-picker buttons carry
 *   **no** real label/aria-label (confirmed live: `getByLabel('From
 *   Currency')` resolves to 2 elements, one of them unrelated) — they are
 *   therefore addressed by position among this tab's own comboboxes/date
 *   buttons instead, confirmed stable via direct inspection (index 0 =
 *   From Currency / From Date, index 1 = To Currency / To Date, in that
 *   order; a third "Rows per page" combobox exists further down the page,
 *   after these two, so `.nth()` stays sound).
 *
 * Locator trap, confirmed live: `getByRole('tab', { name: 'Rate Details'
 * })` without `exact: true` also matches "Currency Rate Details" (a
 * substring match) — every tab locator here uses `exact: true`.
 */
export class CurrencyRateLocators {
  readonly heading: Locator;
  readonly rateDetailsTab: Locator;
  readonly currencyRateDetailsTab: Locator;

  // "Rate Details" tab
  readonly toCurrencyField: Locator;
  readonly effectiveDateField: Locator;
  readonly loadButton: Locator;
  readonly clearButton: Locator;

  // "Currency Rate Details" tab — filter bar (no stable labels, see class doc)
  readonly fromCurrencyFilter: Locator;
  readonly toCurrencyFilter: Locator;
  readonly fromDateButton: Locator;
  readonly toDateButton: Locator;
  readonly refreshButton: Locator;

  // Grid toolbar (shared shape across Master Data list screens)
  readonly exportCsvButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly rateColumnSortButton: Locator;
  /** The "Columns" configuration popover opened by configureColumnsButton — scoped so column-name checks don't also match the grid's own header cells. */
  readonly columnsPanel: Locator;

  // Calendar popover (shared by both tabs' date pickers)
  readonly calendarPreviousMonthButton: Locator;
  readonly calendarNextMonthButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Currency Rate', exact: true });
    this.rateDetailsTab = page.getByRole('tab', { name: 'Rate Details', exact: true });
    this.currencyRateDetailsTab = page.getByRole('tab', {
      name: 'Currency Rate Details',
      exact: true,
    });

    this.toCurrencyField = page.getByLabel('To Currency', { exact: false });
    // NOT getByLabel('Effective Date') — confirmed live (2026-10-07) this
    // is fragile: the visible "Effective Date *" text is a plain sibling
    // <text>, not a real <label>/aria-labelledby association, so
    // getByLabel() either resolves nothing or (worse) drifts onto an
    // unrelated element across dev deploys — on one run it silently
    // matched the grid's "Resize Effective Date column" button instead
    // (same substring), causing every click to land on a resize handle
    // with no visible failure until the calendar never opened. The
    // button's own real accessible name is "<date> Clear date" (it wraps
    // a nested "Clear date" button), so matching on the leading date
    // pattern is what's actually stable.
    this.effectiveDateField = page.getByRole('button', { name: /^\w+ \d{1,2}, \d{4}/ });
    this.loadButton = page.getByRole('button', { name: 'Load', exact: true });
    this.clearButton = page.getByRole('button', { name: 'Clear', exact: true });

    this.fromCurrencyFilter = page.getByRole('combobox').nth(0);
    this.toCurrencyFilter = page.getByRole('combobox').nth(1);
    this.fromDateButton = page.getByRole('button', { name: 'Pick date', exact: true }).nth(0);
    this.toDateButton = page.getByRole('button', { name: 'Pick date', exact: true }).nth(1);
    this.refreshButton = page.getByRole('button', { name: 'Refresh', exact: true });

    this.exportCsvButton = page.getByRole('button', { name: 'Export CSV' });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.rateColumnSortButton = page.getByRole('button', { name: 'Rate', exact: true });
    this.columnsPanel = page.getByRole('dialog').filter({ hasText: 'Columns' });

    this.calendarPreviousMonthButton = page.getByRole('button', {
      name: 'Go to the Previous Month',
    });
    this.calendarNextMonthButton = page.getByRole('button', { name: 'Go to the Next Month' });
  }

  /** An option inside the open "To Currency" / filter combobox listbox. */
  currencyOption(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  /** Day-of-month cell inside the open calendar popover, scoped to avoid matching page-wide "1"/"2"/... text (pagination, etc). */
  calendarDay(day: number): Locator {
    return this.page
      .locator('table')
      .last()
      .getByText(String(day), { exact: true })
      .first();
  }

  /** A data row in the "Currency Rate Details" grid, matched by any visible cell text (e.g. a From Currency code). */
  row(text: string | RegExp): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }
}
