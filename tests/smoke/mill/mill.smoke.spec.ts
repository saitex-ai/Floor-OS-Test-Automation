import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { MillPage } from '../../../src/pages/mill/mill.page';
import { SpinningPage } from '../../../src/pages/mill/spinning.page';
import { PrepPage } from '../../../src/pages/mill/prep.page';
import { WeavingPage } from '../../../src/pages/mill/weaving.page';
import { FinishingPage } from '../../../src/pages/mill/finishing.page';
import { RequestsPage } from '../../../src/pages/mill/requests.page';

/**
 * Fabric Mill — Smoke suite. 14 checks across the four production
 * screens (Spinning, Preparation, Weaving, Finishing) and Goods request
 * & approval, picked from the 31 mill user stories tested Sep 18–24
 * (reports under test-reports/). Cotton Intake is out of scope — it is
 * not in phase one.
 *
 * Dev is shared, so every check is read-only or stops at client-side
 * validation — nothing is saved. Raising/rejecting a request was left
 * out on purpose so dev data stays untouched.
 *
 * Like the CRM smoke suite, these tests share one browser tab — and go
 * one step further: after SM-MILL-01 loads the mill once, each test
 * switches screens through the mill's navigation drawer (openViaNav(),
 * ~3s on dev) instead of a full page load, which re-downloads the mill
 * remote every time (~40s on dev, measured 2026-09-24). Default (not
 * serial) mode, so one failure doesn't skip the rest: Playwright starts
 * a new worker, beforeAll opens a fresh tab, and openViaNav() falls back
 * to a full load for that first test.
 */
test.describe.configure({ mode: 'default', timeout: 120_000 });

test.describe('Fabric Mill Smoke', () => {
  let page: Page;
  let millPage: MillPage;
  let spinningPage: SpinningPage;
  let prepPage: PrepPage;
  let weavingPage: WeavingPage;
  let finishingPage: FinishingPage;
  let requestsPage: RequestsPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ storageState: authFile('mill') });
    millPage = new MillPage(page);
    spinningPage = new SpinningPage(page);
    prepPage = new PrepPage(page);
    weavingPage = new WeavingPage(page);
    finishingPage = new FinishingPage(page);
    requestsPage = new RequestsPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await allure.epic('Fabric Mill');
    await allure.feature('Smoke');
    await allure.owner('Fabric Mill QA');
  });

  test('SM-MILL-01: Mill operations landing loads after shell login', async () => {
    await millPage.open();
    await millPage.expectLoaded();
    await expect(millPage.locators.openRequestsTile).toBeVisible();
    await expect(millPage.locators.ordersRunningTile).toBeVisible();
  });

  test.describe('Spinning', () => {
    test('SM-MILL-02: Spinning loads with Mixing orders, Laydown and Yarn output tabs', async () => {
      const l = spinningPage.locators;
      await spinningPage.openViaNav();
      await expect(l.mixingOrdersTab).toBeVisible();
      await expect(l.laydownTab).toBeVisible();
      await expect(l.yarnOutputTab).toBeVisible();
    });

    test('SM-MILL-03: New mixing order is refused when recipe shares do not total 100%', async () => {
      const l = spinningPage.locators;
      await spinningPage.openViaNav();
      await spinningPage.selectTab(l.mixingOrdersTab);
      // Shares only count once a line has a cotton unit. Pick two distinct
      // units (form state only — Create order is never pressed), then drop
      // line 1 from 60% to 50% so the recipe totals 90%.
      await spinningPage.pickRecipeUnit(l.firstRecipeUnitSelect, 0);
      await spinningPage.pickRecipeUnit(l.secondRecipeUnitSelect, 1);
      await l.firstRecipeShareInput.fill('50');
      await expect(l.sharesTotalText).toHaveText(/Shares total 90%/);
      await expect(l.sharesNot100Message).toBeVisible();
      await expect(l.createOrderButton).toBeDisabled();
    });

    test('SM-MILL-04: Yarn output entry cannot be put away until it is filled in', async () => {
      const l = spinningPage.locators;
      await spinningPage.openViaNav();
      await spinningPage.selectTab(l.yarnOutputTab);
      await expect(l.productionEntryCard).toBeVisible();
      await expect(l.putAwayAndPrintButton).toBeDisabled();
    });
  });

  test.describe('Preparation', () => {
    test('SM-MILL-05: Preparation loads with Create dye-lot, Scan yarn, Load beams and Orders tabs', async () => {
      const l = prepPage.locators;
      await prepPage.openViaNav();
      await expect(l.createDyeLotTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.scanYarnTab).toBeVisible();
      await expect(l.loadBeamsTab).toBeVisible();
      await expect(l.ordersTab).toBeVisible();
    });

    test('SM-MILL-06: Scan yarn — an empty scan sheet cannot be committed', async () => {
      const l = prepPage.locators;
      await prepPage.openViaNav();
      await prepPage.selectTab(l.scanYarnTab);
      await expect(l.scanLotsIntoDyeLotButton.or(l.noDyeLotsAwaitingYarn)).toBeVisible();
      if (await l.noDyeLotsAwaitingYarn.isVisible()) {
        test.skip(true, 'No dye-lot on dev is awaiting yarn, so the scan sheet does not render');
      }
      await expect(l.scanLotsIntoDyeLotButton).toBeDisabled();
    });

    test('SM-MILL-07: Load beams — an empty beam cannot be scanned before a beam length is entered', async () => {
      const l = prepPage.locators;
      await prepPage.openViaNav();
      await prepPage.selectTab(l.loadBeamsTab);
      await expect(l.scanEmptyBeamInput.or(l.noDyeLotYet)).toBeVisible();
      if (await l.noDyeLotYet.isVisible()) {
        test.skip(true, 'No windable dye-lot on dev, so the Load beams card does not render');
      }
      await expect(l.beamLengthInput).toBeEmpty();
      await expect(l.scanEmptyBeamInput).toBeDisabled();
      await expect(l.loadBeamsButton).toBeDisabled();
    });
  });

  test.describe('Weaving', () => {
    test('SM-MILL-08: Weaving loads with the Warp beam and Weft yarn input cards', async () => {
      const l = weavingPage.locators;
      await weavingPage.openViaNav();
      await expect(l.consumeInputsTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.recordOutputTab).toBeVisible();
      await expect(l.ordersTab).toBeVisible();
      await expect(l.warpBeamCard.or(l.noOpenOrders)).toBeVisible();
      if (await l.noOpenOrders.isVisible()) {
        test.skip(true, 'No open weaving order on dev, so the input cards do not render');
      }
      await expect(l.weftYarnCard).toBeVisible();
    });

    test('SM-MILL-09: Weft yarn cannot be scanned before the cones to consume are entered', async () => {
      const l = weavingPage.locators;
      await weavingPage.openViaNav();
      await expect(l.conesToConsumeInput.or(l.noOpenOrders)).toBeVisible();
      if (await l.noOpenOrders.isVisible()) {
        test.skip(true, 'No open weaving order on dev, so the Weft yarn card does not render');
      }
      await expect(l.conesToConsumeInput).toBeEmpty();
      await expect(l.scanWeftYarnInput).toBeDisabled();
    });

    test('SM-MILL-10: Doff greige roll is blocked until a greige length is entered', async () => {
      const l = weavingPage.locators;
      await weavingPage.openViaNav();
      await weavingPage.selectTab(l.recordOutputTab);
      await expect(l.greigeLengthInput.or(l.noOrdersWithInputs)).toBeVisible();
      if (await l.noOrdersWithInputs.isVisible()) {
        test.skip(true, 'No weaving order on dev has inputs on the machine');
      }
      await expect(l.greigeLengthInput).toBeEmpty();
      await expect(l.doffAndPutAwayButton).toBeDisabled();
    });
  });

  test.describe('Finishing', () => {
    test('SM-MILL-11: Finishing loads with the Finishing order and Greige roll cards', async () => {
      const l = finishingPage.locators;
      await finishingPage.openViaNav();
      await expect(l.consumeInputsTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.recordOutputTab).toBeVisible();
      await expect(l.ordersTab).toBeVisible();
      await expect(l.finishingOrderCard).toBeVisible();
      await expect(l.greigeRollCard).toBeVisible();
    });

    test('SM-MILL-12: Doff finished roll is blocked until a finished length is entered', async () => {
      const l = finishingPage.locators;
      await finishingPage.openViaNav();
      await finishingPage.selectTab(l.recordOutputTab);
      await expect(l.finishedLengthInput).toBeVisible();
      await expect(l.finishedLengthInput).toBeEmpty();
      await expect(l.doffToQcButton).toBeDisabled();
    });
  });

  test.describe('Goods request & approval', () => {
    test('SM-MILL-13: Goods requests loads with Approvals and New request tabs for a stores approver', async () => {
      const l = requestsPage.locators;
      await requestsPage.openViaNav();
      await expect(l.approvalsTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.newRequestTab).toBeVisible();
      await expect(l.clearedRows.first()).toBeVisible();
    });

    test('SM-MILL-14: New request refuses a zero quantity', async () => {
      const l = requestsPage.locators;
      await requestsPage.openViaNav();
      await requestsPage.selectTab(l.newRequestTab);
      await requestsPage.chooseRequestingDepartment('Preparation');
      const source = await requestsPage.firstPullableSource();
      test.skip(!source, 'Nothing on dev is pullable from any non-cotton source');
      await requestsPage.enterFirstUnit(source!, '0');
      await expect(l.valueAboveZeroHint).toBeVisible();
      await expect(requestsPage.addButton(source!)).toBeDisabled();
    });
  });
});
