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
 * Fabric Mill — Smoke suite. 13 checks across the four production
 * screens (Spinning, Preparation, Weaving, Finishing) and Goods request
 * & approval, picked from the 31 mill user stories tested Sep 18–24
 * (reports under test-reports/). Cotton Intake is out of scope — it is
 * not in phase one. SM-MILL-07 (Load beams) was removed on 2026-10-22:
 * it needs warp yarn on the machine, which daily smoke data doesn't
 * have; the other IDs were kept unchanged.
 *
 * Every check is read-only or stops at client-side validation — nothing
 * is saved. Raising/rejecting a request was left out on purpose so dev
 * data stays untouched.
 *
 * For the mill CR round (2026-10) the mill is deployed to its own dev
 * instance: set `MILL_DEV_APP_SHELL_URL=https://devmill.flooros.app` in
 * .env (see .env.example) and `npm run test:smoke:mill:dev` /
 * `npm run test:smoke:dev` send Mill there automatically.
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
      // "New mixing order" is a popup since the redesign (2026-09) — the
      // Mixing orders tab now shows the most recent real order's own
      // recipe by default, not an always-visible blank form.
      await spinningPage.openNewMixingOrderForm();
      // Shares only count once a line has an item. Pick two distinct cotton
      // or fiber items (form state only — Create order is never pressed),
      // then drop line 1 from 60% to 50% so the recipe totals 90%.
      await spinningPage.pickRecipeItem(l.firstRecipeItemSelect, 0);
      await spinningPage.pickRecipeItem(l.secondRecipeItemSelect, 1);
      await l.firstRecipeShareInput.fill('50');
      await expect(l.sharesTotalText).toHaveText(/Shares total 90%/);
      await expect(l.sharesNot100Message).toBeVisible();
      await expect(l.createOrderButton).toBeDisabled();
      // Close the popup without saving — left open, it blocks the nav for
      // the next check on this shared tab. Uses the popup's own Close
      // button: Escape no longer closes it in the new design (2026-10-23).
      await l.newMixingOrderDialog.getByRole('button', { name: 'Close' }).click();
      await expect(l.newMixingOrderDialog).toBeHidden();
    });

    test('SM-MILL-04: Yarn output cannot be booked until a doffed weight is entered', async () => {
      const l = spinningPage.locators;
      await spinningPage.openViaNav();
      await spinningPage.selectTab(l.yarnOutputTab);
      await expect(l.productionEntryCard.or(l.noBlendOnTheLine)).toBeVisible();
      if (await l.noBlendOnTheLine.isVisible()) {
        test.skip(
          true,
          'No laydown has been closed, so there is no blend on the line to draw yarn from',
        );
      }
      await expect(l.doffedKgInput).toBeEmpty();
      await expect(l.bookOutputButton).toBeDisabled();
    });
  });

  test.describe('Preparation', () => {
    test('SM-MILL-05: Preparation loads with Scan yarn, Load beams, Orders and Production tabs', async () => {
      const l = prepPage.locators;
      await prepPage.openViaNav();
      // Mill CR round (2026-10): Scan yarn is the default tab, a Production
      // tab was added, and "Create dye-lot" is offered once an order row is
      // ticked on the Orders tab (PR-01-01). Ticking a row saves nothing.
      await expect(l.scanYarnTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.loadBeamsTab).toBeVisible();
      await expect(l.ordersTab).toBeVisible();
      await expect(l.productionTab).toBeVisible();
      await prepPage.selectTab(l.ordersTab);
      await expect(l.pullFromSapButton).toBeVisible();
      await l.orderRowCheckboxes.first().check();
      await expect(l.createDyeLotButton).toBeVisible();
      await l.clearSelectionButton.click();
      await expect(l.createDyeLotButton).toBeHidden();
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
  });

  test.describe('Weaving', () => {
    test('SM-MILL-08: Weaving loads with the Weaving order, Warp beam and Weft yarn input cards', async () => {
      const l = weavingPage.locators;
      await weavingPage.openViaNav();
      // Mill CR round (2026-10): tabs are Consume inputs / Orders / Production.
      await expect(l.consumeInputsTab).toHaveAttribute('aria-selected', 'true');
      await expect(l.ordersTab).toBeVisible();
      await expect(l.productionTab).toBeVisible();
      await expect(l.warpBeamCard.or(l.noOpenOrders)).toBeVisible();
      if (await l.noOpenOrders.isVisible()) {
        test.skip(true, 'No open weaving order on dev, so the input cards do not render');
      }
      await expect(l.weavingOrderCard).toBeVisible();
      await expect(l.weftYarnCard).toBeVisible();
      await expect(l.scanLoomInput).toBeVisible();
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

    test('SM-MILL-10: Record Output asks for the loom before an output length can be entered', async () => {
      const l = weavingPage.locators;
      await weavingPage.openViaNav();
      // Mill CR round (2026-10): greige output is recorded from the Orders
      // tab's "Record Output" popup — scan the loom first, then the length
      // field opens (WV-01-01). No loom is scanned here, so nothing is saved.
      await weavingPage.selectTab(l.ordersTab);
      await l.recordOutputButton.click();
      await expect(l.recordOutputDialog).toBeVisible();
      await expect(l.scanLoomInput).toBeVisible();
      await expect(l.outputLengthInput).toHaveCount(0);
      await l.recordOutputDialog.getByRole('button', { name: 'Close' }).click();
      await expect(l.recordOutputDialog).toBeHidden();
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
    test('SM-MILL-13: Goods requests loads with the All filter selected and New request, Receive Goods and Direct transfer actions', async () => {
      const l = requestsPage.locators;
      await requestsPage.openViaNav();
      // Mill CR round (2026-10): no tabs — status filter pills. Receive Goods
      // and Direct transfer open popups; New request opens its own page,
      // /mill/requests/new (since 2026-10-26).
      await expect(l.allStatusFilter).toHaveAttribute('aria-pressed', 'true');
      await expect(l.pendingStatusFilter).toHaveAttribute('aria-pressed', 'false');
      await expect(l.newRequestButton).toBeVisible();
      await expect(l.receiveGoodsButton).toBeVisible();
      await expect(l.directTransferButton).toBeVisible();
    });

    test('SM-MILL-14: New request refuses a zero quantity', async () => {
      const l = requestsPage.locators;
      await requestsPage.openViaNav();
      await requestsPage.openNewRequestForm();
      await requestsPage.chooseRequestingDepartment('Preparation');
      const source = await requestsPage.firstPullableSource();
      test.skip(!source, 'Nothing on dev is pullable for Preparation');
      await requestsPage.enterFirstUnit(source!, '0');
      await expect(l.valueAboveZeroHint).toBeVisible();
      await expect(requestsPage.submitRequestButton(source!)).toBeDisabled();
      // Positive control: a valid quantity clears the hint and enables Submit,
      // so the disabled state above is caused by the zero. Nothing is submitted.
      await requestsPage.setFirstUnitQuantity(source!, '1');
      await expect(l.valueAboveZeroHint).toBeHidden();
      await expect(requestsPage.submitRequestButton(source!)).toBeEnabled();
    });
  });
});
