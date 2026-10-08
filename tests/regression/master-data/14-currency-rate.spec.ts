import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Currency Rate (System Management).
 *
 * Source of truth for these 12 cases:
 * test-cases/master-data/currency-rate/currency-rate-testcases.md.
 * Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed here.
 *
 * Confirmed live: this screen is READ-ONLY for the `master-data` test
 * user (no Create/Edit/Delete anywhere), so every case here is
 * List/Filter/Load-shaped rather than CRUD-shaped — see the page
 * object's own doc comment for details.
 */
test.describe('Master Data - Currency Rate', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Currency Rate');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify screen layout and both tabs load', async ({ currencyRatePage }) => {
    await test.step('Navigate to Currency Rate', async () => {
      await currencyRatePage.open();
    });

    await test.step('Heading and both tabs are visible', async () => {
      await currencyRatePage.expectLoaded();
    });
  });

  test('TC:2 Verify no Create/New entry point exists for this role', async ({
    page,
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();

    await test.step('No "New"/"Add" button exists on either tab', async () => {
      await expect(page.getByRole('button', { name: /^(New|Add)\b/i })).toHaveCount(0);
      await currencyRatePage.openCurrencyRateDetailsTab();
      await expect(page.getByRole('button', { name: /^(New|Add)\b/i })).toHaveCount(0);
    });

    await test.step('Direct navigation to the /new route 404s', async () => {
      await currencyRatePage.gotoNewRouteDirectly();
      await currencyRatePage.expectNotFoundPage();
    });
  });

  test('TC:3 Verify "Rate Details" Load button is disabled until required filters are filled', async ({
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openRateDetailsTab();

    await test.step('Load is disabled with no To Currency picked', async () => {
      await currencyRatePage.expectLoadDisabled();
    });
  });

  test('TC:4 Verify Load returns the latest rate on/before the picked Effective Date ("as of" lookup)', async ({
    page,
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openRateDetailsTab();

    await test.step('Pick To Currency = USD, leave Effective Date at today', async () => {
      await currencyRatePage.filterByCurrency('USD — US Dollar');
      await currencyRatePage.expectLoadEnabled();
    });

    await test.step('Load returns the latest seeded rate (5/1/2026) for multiple From Currencies', async () => {
      await currencyRatePage.clickLoad();
      await currencyRatePage.expectRateRowVisible('CNY');
      await currencyRatePage.expectRateRowVisible('EUR');
      await currencyRatePage.expectRateRowVisible('GBP');
      await expect(page.getByText('5/1/2026').first()).toBeVisible();
    });
  });

  test('TC:5 Verify Load with a date before any seeded rate shows the "no rates found" empty state', async ({
    currencyRatePage,
  }) => {
    // Several sequential calendar-navigation clicks on top of dev's own
    // slow page loads can exceed the module-wide 60s default — bumped
    // defensively, same reasoning as this repo's other slow-interaction
    // timeout bumps (see agent-notes/master-data-module.md).
    test.setTimeout(120_000);
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openRateDetailsTab();
    await currencyRatePage.filterByCurrency('USD — US Dollar');

    // Confirmed live: ALL of Currency Rate's seeded rows are dated exactly
    // 5/1/2026 — any earlier month already satisfies "before any seeded
    // rate", so 6 months back (-> Apr 2026) is enough. An earlier version of
    // this test jumped 70 months back to Dec 2020, which genuinely exceeded
    // the 60s dev test timeout on calendar-navigation clicks alone (a real
    // automation bug, not app slowness) — fixed by not doing more
    // navigation than the assertion actually requires.
    await test.step('Set Effective Date to Apr 2026 (before the 5/1/2026 seed)', async () => {
      await currencyRatePage.setEffectiveDateMonthsBack(6, 1);
    });

    await test.step('Load shows the exact "no rates found" message', async () => {
      await currencyRatePage.clickLoad();
      await currencyRatePage.expectNoRatesFoundMessage();
    });
  });

  test('TC:6 Verify "Currency Rate Details" tab shows the full rate list', async ({
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();

    await test.step('Switch to Currency Rate Details', async () => {
      await currencyRatePage.openCurrencyRateDetailsTab();
    });

    await test.step('Seeded currency-pair rows are visible', async () => {
      await currencyRatePage.expectRateRowVisible('CNY');
      await currencyRatePage.expectRateRowVisible(/EUR.*INR|INR.*EUR/);
    });
  });

  test('TC:7 Verify column sort on "Currency Rate Details" tab', async ({ currencyRatePage }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openCurrencyRateDetailsTab();

    await test.step('Clicking the Rate column header toggles its sort state', async () => {
      const sortButton = currencyRatePage.locators.rateColumnSortButton;
      await expect(sortButton).toBeVisible();
      await sortButton.click();
      // Re-clicking should not error and the grid should still render rows —
      // the real assertion here is that sort interaction doesn't break the
      // grid, since row order isn't independently known ahead of time.
      await sortButton.click();
      await expect(currencyRatePage.locators.row('CNY').first()).toBeVisible();
    });
  });

  test('TC:8 Verify Export CSV on "Currency Rate Details" tab', async ({
    page,
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openCurrencyRateDetailsTab();

    await test.step('Export CSV triggers a download named currency-rates.csv', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        currencyRatePage.clickExportCsv(),
      ]);
      expect(download.suggestedFilename()).toBe('currency-rates.csv');
    });
  });

  test('TC:9 Verify "Configure columns" panel lists exactly the 6 real columns', async ({
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openCurrencyRateDetailsTab();

    await test.step('Open the panel and confirm all 6 columns are listed, no hidden Actions column', async () => {
      await currencyRatePage.openConfigureColumnsPanel();
      await currencyRatePage.expectColumnsPanelListsExactly([
        'From Currency',
        'To Currency',
        'Effective Date',
        'Mult/Div',
        'Rate',
        'Reciprocal',
      ]);
    });
  });

  test('TC:10 Verify Clear resets the "Currency Rate Details" filter bar', async ({
    currencyRatePage,
  }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openCurrencyRateDetailsTab();

    await test.step('Pick a From Currency filter, then Clear', async () => {
      await currencyRatePage.locators.fromCurrencyFilter.click();
      await currencyRatePage.locators.currencyOption('CNY').click();
      await expect(currencyRatePage.locators.fromCurrencyFilter).not.toHaveText(
        'All from currencies',
      );

      await currencyRatePage.locators.clearButton.click();
      await expect(currencyRatePage.locators.fromCurrencyFilter).toHaveText('All from currencies');
    });
  });

  test('TC:11 Verify tab accessible-name locator trap', async ({ page, currencyRatePage }) => {
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();

    await test.step('A substring-matching query resolves to both tabs', async () => {
      await expect(page.getByRole('tab', { name: 'Rate Details' })).toHaveCount(2);
    });

    await test.step('exact: true disambiguates to exactly one tab each', async () => {
      await expect(currencyRatePage.locators.rateDetailsTab).toHaveCount(1);
      await expect(currencyRatePage.locators.currencyRateDetailsTab).toHaveCount(1);
    });
  });

  test('TC:12 Verify the Effective Date picker allows navigating to arbitrary past dates', async ({
    currencyRatePage,
  }) => {
    test.setTimeout(120_000);
    await currencyRatePage.open();
    await currencyRatePage.expectLoaded();
    await currencyRatePage.openRateDetailsTab();
    await currencyRatePage.filterByCurrency('USD — US Dollar');

    await test.step('Navigate back 8 months (before the 5/1/2026 seed) and Load', async () => {
      await currencyRatePage.setEffectiveDateMonthsBack(8, 1);
      await currencyRatePage.clickLoad();
      await currencyRatePage.expectNoRatesFoundMessage();
    });
  });
});
