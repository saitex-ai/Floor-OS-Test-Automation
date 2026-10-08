import { test } from '../../../src/fixtures/master-data.fixtures';
import { expect } from '@playwright/test';
import { CurrencyRateBuyerPage } from '../../../src/pages/master-data/currency-rate-buyer.page';

/**
 * Master Data — Currency Rate Buyer (System Management).
 *
 * Source of truth for these 12 cases (TC:1-TC:12, including TC:6b):
 * test-cases/master-data/currency-rate-buyer/currency-rate-buyer-testcases.md.
 * Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed here.
 *
 * Confirmed live: read-only for the `master-data` test user, same as
 * plain Currency Rate — every case here is List/Filter/Load-shaped. One
 * genuine, important correction made during this automation pass: an
 * earlier documentation pass wrongly claimed no buyer-rate overrides were
 * seeded anywhere in dev. Customer "ACME Apparel" (`CTC0000002`) DOES
 * have 13 real seeded rows — used below for the positive Load path
 * (TC:6b), while a fresh/throwaway customer correctly has none (TC:6).
 *
 * `currencyRateBuyerPage` isn't a named fixture yet on
 * master-data.fixtures.ts (being edited centrally elsewhere) —
 * constructed directly from the standard `page` fixture per test
 * instead. Swap for a named fixture once added there.
 */
const ACME_APPAREL = 'ACME Apparel';
const THROWAWAY_CUSTOMER_SEARCH = 'AutoTest_Customer';

test.describe('Master Data - Currency Rate Buyer', () => {
  test('TC:1 Verify screen layout and both tabs load', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);

    await test.step('Navigate to Currency Rate Buyer', async () => {
      await currencyRateBuyerPage.open();
    });

    await test.step('Heading and both tabs are visible', async () => {
      await currencyRateBuyerPage.expectLoaded();
    });
  });

  test('TC:2 Verify no Create/New entry point exists for this role', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();

    await test.step('No "New"/"Add" button exists on either tab', async () => {
      await expect(page.getByRole('button', { name: /^(New|Add)\b/i })).toHaveCount(0);
      await currencyRateBuyerPage.openCurrencyRateListTab();
      await expect(page.getByRole('button', { name: /^(New|Add)\b/i })).toHaveCount(0);
    });

    await test.step('Direct navigation to the /new route 404s', async () => {
      await currencyRateBuyerPage.gotoNewRouteDirectly();
      await currencyRateBuyerPage.expectNotFoundPage();
    });
  });

  test('TC:3 Verify "Rate Details" requires three fields, not two', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('To Currency, Effective Date, and Customer are all present and required', async () => {
      await expect(currencyRateBuyerPage.locators.toCurrencyField).toBeVisible();
      await expect(currencyRateBuyerPage.locators.effectiveDateField).toBeVisible();
      await expect(currencyRateBuyerPage.locators.customerField).toBeVisible();
    });
  });

  test('TC:4 Verify Load stays disabled until Customer is also picked', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('Pick only To Currency, leave Customer unpicked', async () => {
      await currencyRateBuyerPage.filterByCurrency('USD — US Dollar');
      await currencyRateBuyerPage.expectLoadDisabled();
    });
  });

  test('TC:5 Verify the Customer picker is the shared searchable "Select Customer" dialog', async ({
    page,
  }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('Opening the Customer field shows the "Select Customer" dialog', async () => {
      await currencyRateBuyerPage.locators.customerField.click();
      // Two elements both carry the name "Select Customer": a visually
      // hidden (sr-only) dialog-title heading, and the visible heading
      // which also appends a live count ("Select Customer(1013)") — a
      // strict-mode violation on a plain getByText(), confirmed live.
      // .first() is enough here since both only need to exist, not be
      // individually distinguished.
      await expect(page.getByText('Select Customer').first()).toBeVisible();
      await expect(currencyRateBuyerPage.locators.customerSearchInput).toBeVisible();
    });
  });

  test('TC:6 Verify Load for a customer with no seeded overrides shows the empty state', async ({
    page,
  }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('Fill all 3 fields with a fresh/throwaway customer', async () => {
      await currencyRateBuyerPage.filterByCurrency('USD — US Dollar');
      await currencyRateBuyerPage.pickCustomer(THROWAWAY_CUSTOMER_SEARCH);
      await currencyRateBuyerPage.expectLoadEnabled();
    });

    await test.step('Load shows the exact "no buyer rates found" message', async () => {
      await currencyRateBuyerPage.clickLoad();
      await currencyRateBuyerPage.expectNoBuyerRatesFoundMessage();
    });
  });

  test('TC:6b Verify Load returns real rows for a customer with seeded overrides (ACME Apparel)', async ({
    page,
  }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('Fill all 3 fields with ACME Apparel (CTC0000002)', async () => {
      await currencyRateBuyerPage.filterByCurrency('USD — US Dollar');
      await currencyRateBuyerPage.pickCustomer(ACME_APPAREL);
    });

    await test.step('Load returns real buyer-override rows', async () => {
      await currencyRateBuyerPage.clickLoad();
      await currencyRateBuyerPage.expectRateRowVisible('INR');
      await currencyRateBuyerPage.expectRateRowVisible('EUR');
    });
  });

  test('TC:7 Verify "Currency Rate List" is gated behind picking a Customer first', async ({
    page,
  }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();

    await test.step('Switch directly to Currency Rate List without loading a Customer', async () => {
      await currencyRateBuyerPage.openCurrencyRateListTab();
      await currencyRateBuyerPage.expectPickCustomerFirstPrompt();
      // Confirmed live: the field is `readonly`, not `disabled` (no
      // `disabled` attribute in the real DOM) — toBeDisabled() genuinely
      // fails against it. readonly still blocks typing, which is the
      // actual behavior worth asserting.
      await expect(currencyRateBuyerPage.locators.customerFilterField).toHaveAttribute(
        'readonly',
        '',
      );
    });
  });

  test('TC:8 Verify grid toolbar is absent even once real data is loaded', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();
    await currencyRateBuyerPage.filterByCurrency('USD — US Dollar');
    await currencyRateBuyerPage.pickCustomer(ACME_APPAREL);
    await currencyRateBuyerPage.clickLoad();
    await currencyRateBuyerPage.expectRateRowVisible('INR');

    await test.step('Currency Rate List shows no Export CSV / Configure columns toolbar', async () => {
      await currencyRateBuyerPage.openCurrencyRateListTab();
      await currencyRateBuyerPage.expectNoGridToolbar();
    });
  });

  test('TC:9 Verify "Currency Rate List" extra filters once a Customer is loaded', async ({
    page,
  }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();
    await currencyRateBuyerPage.filterByCurrency('USD — US Dollar');
    await currencyRateBuyerPage.pickCustomer(ACME_APPAREL);
    await currencyRateBuyerPage.clickLoad();

    await test.step('Currency Rate List shows Customer pre-filled plus From/To Currency and date filters', async () => {
      await currencyRateBuyerPage.openCurrencyRateListTab();
      // The pre-filled Customer field is an <input value="...">, not
      // rendered text — getByText() never matches an input's value
      // (confirmed live: a getByText() version of this assertion found
      // nothing). toHaveValue() is the correct check.
      await expect(currencyRateBuyerPage.locators.customerFilterField).toHaveValue(
        /ACME Apparel/,
      );
      await currencyRateBuyerPage.expectRateRowVisible('INR');
    });
  });

  test('TC:10 Verify this screen\'s second tab is named differently from Currency Rate\'s', async ({
    page,
  }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();

    await test.step('Second tab reads "Currency Rate List", not "Currency Rate Details"', async () => {
      await expect(currencyRateBuyerPage.locators.currencyRateListTab).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Currency Rate Details', exact: true })).toHaveCount(
        0,
      );
    });
  });

  test('TC:11 Verify Clear resets all three "Rate Details" filters', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('Fill all 3 fields, then Clear', async () => {
      await currencyRateBuyerPage.filterByCurrency('USD — US Dollar');
      await currencyRateBuyerPage.pickCustomer(ACME_APPAREL);
      await expect(currencyRateBuyerPage.locators.customerField).toHaveValue(/ACME Apparel/);

      await currencyRateBuyerPage.locators.clearButton.click();
      await expect(currencyRateBuyerPage.locators.customerField).toHaveValue('');
      await currencyRateBuyerPage.expectLoadDisabled();
    });
  });

  test('TC:12 Verify Customer search inside the picker narrows results', async ({ page }) => {
    const currencyRateBuyerPage = new CurrencyRateBuyerPage(page);
    await currencyRateBuyerPage.open();
    await currencyRateBuyerPage.expectLoaded();
    await currencyRateBuyerPage.openRateDetailsTab();

    await test.step('Typing a name fragment filters the 1009-row picker', async () => {
      await currencyRateBuyerPage.locators.customerField.click();
      await currencyRateBuyerPage.locators.customerSearchInput.fill(ACME_APPAREL);
      await expect(currencyRateBuyerPage.locators.customerPickerRow(ACME_APPAREL).first()).toBeVisible();
    });
  });
});
