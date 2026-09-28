import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { BomListPage } from '../../../src/pages/bom/bom-list.page';
import { BomDetailPage } from '../../../src/pages/bom/bom-detail.page';

/**
 * BOM — Smoke suite. 7 high-level checks picked from the 32-case BOM
 * sanity run on dev (2026-09-24, test-reports/bom-sanity-2026-09-24/).
 * BOM is its own module here (own folders, own BOM_* login), even
 * though app-techpack serves it — see MODULES.bom in src/config/modules.ts.
 *
 * Dev is shared and BOMs can't be deleted, so every check is read-only:
 * New BOM is opened and cancelled, never saved; no lines are added.
 *
 * One browser tab is shared across the file (as in the CRM and mill
 * smoke suites): the BOM remote takes about a minute to load on dev, so
 * it's loaded once and later checks move around inside the app. Default
 * (not serial) mode, so one failure doesn't skip the rest — a new
 * worker opens a fresh tab and openInPlace() falls back to a full load.
 */

/** An Approved (so locked) BOM on dev — the one the sanity run used. */
const APPROVED_BOM = 'TP202607-000029';

test.describe.configure({ mode: 'default', timeout: 150_000 });

test.describe('BOM Smoke', () => {
  let page: Page;
  let bomListPage: BomListPage;
  let bomDetailPage: BomDetailPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ storageState: authFile('bom') });
    bomListPage = new BomListPage(page);
    bomDetailPage = new BomDetailPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await allure.epic('BOM');
    await allure.feature('Smoke');
    await allure.owner('BOM QA');
  });

  /** From the list, search for the Approved BOM and open it. */
  async function openApprovedBom(): Promise<void> {
    await bomListPage.openInPlace();
    await bomListPage.search(APPROVED_BOM);
    await bomListPage.openBom(APPROVED_BOM);
    await bomDetailPage.expectOpenFor(APPROVED_BOM);
  }

  test('BOM-SM-01: BOM list loads with status tabs, New BOM and rows', async () => {
    const l = bomListPage.locators;
    await bomListPage.openInPlace();
    await expect(l.allTab).toBeVisible();
    await expect(l.openTab).toBeVisible();
    await expect(l.approvedTab).toBeVisible();
    await expect(l.newBomButton).toBeVisible();
    await expect(l.footerSummary).toBeVisible();
  });

  test('BOM-SM-02: Open and Approved tabs filter the list to their counts', async () => {
    const l = bomListPage.locators;
    await bomListPage.openInPlace();
    await bomListPage.selectStatusTab(l.openTab);
    await bomListPage.selectStatusTab(l.approvedTab);
    await bomListPage.selectStatusTab(l.allTab);
  });

  test('BOM-SM-03: Searching by techpack code finds that BOM', async () => {
    const l = bomListPage.locators;
    await bomListPage.openInPlace();
    await bomListPage.search(APPROVED_BOM);
    await expect(l.techpackLink(APPROVED_BOM).first()).toBeVisible();
    await expect(l.rows).toHaveCount(await l.techpackLink(APPROVED_BOM).count());
    await bomListPage.clearSearch();
  });

  test('BOM-SM-04: New BOM opens with Create BOM disabled, and Cancel saves nothing', async () => {
    const l = bomListPage.locators;
    await bomListPage.openInPlace();
    await bomListPage.openNewBomDialog();
    await expect(l.noTechpackSelected).toBeVisible();
    await expect(l.createBomButton).toBeDisabled();
    await bomListPage.cancelNewBomDialog();
  });

  test('BOM-SM-05: Opening a BOM shows its detail page, and Back returns to the list', async () => {
    await openApprovedBom();
    await bomDetailPage.back();
    await bomListPage.expectLoaded();
  });

  test('BOM-SM-06: An Approved BOM is locked — Reopen shown, no Add line', async () => {
    await openApprovedBom();
    await bomDetailPage.expectLockedApproved();
    await expect(bomDetailPage.locators.itemsTab).toBeVisible();
  });

  test('BOM-SM-07: Reports menu lists BOM Report, THD Report and Trim Card', async () => {
    const d = bomDetailPage.locators;
    if (!new URL(page.url()).pathname.startsWith(`/bom/${APPROVED_BOM}/`)) {
      await openApprovedBom();
    }
    await bomDetailPage.openReportsMenu();
    await expect(d.bomReportItem).toBeVisible();
    await expect(d.thdReportItem).toBeVisible();
    await expect(d.trimCardItem).toBeVisible();
    await bomDetailPage.closeReportsMenu();
  });
});
