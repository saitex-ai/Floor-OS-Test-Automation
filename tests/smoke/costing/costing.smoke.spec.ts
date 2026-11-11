import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { CostingPage } from '../../../src/pages/costing/costing.page';

/**
 * Costing — Smoke suite. 13 checks across Costing's own screens, in the
 * order of the costing flow: setup (Company Costing Setup, Overhead &
 * Wash Config) → request (Costing list, New Request, Excel import) → cost
 * sheet → fabric (Fabric Yield / Fabric Cost Requests) → Approvals →
 * Costing Report. Picked from the Costing regression test cases and
 * checked live on dev on 2026-11-10.
 *
 * Quotation Template and Quotations are left out on purpose: the
 * quotation flow has its own suite and owner, as do Techpack and BOM.
 *
 * Dev is shared, so every check is read-only: forms and wizards are
 * opened and cancelled, a row is ticked and the selection cleared, and
 * nothing is created, saved, sent or uploaded. No record IDs are hard-
 * coded — detail checks open whatever the list's first row is.
 *
 * One browser tab is shared across the file (as in the Mill and BOM smoke
 * suites): after SM-COST-01 loads Costing once, each check switches
 * screens through the left navigation instead of a full page load.
 * Default (not serial) mode, so one failure doesn't skip the rest — a new
 * worker opens a fresh tab and openScreen() falls back to a full load.
 */
test.describe.configure({ mode: 'default', timeout: 120_000 });

test.describe('Costing Smoke', () => {
  let page: Page;
  let costingPage: CostingPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ storageState: authFile('costing') });
    costingPage = new CostingPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await allure.epic('Costing');
    await allure.feature('Smoke');
    await allure.owner('Costing QA');
  });

  test('SM-COST-01: Costing loads after shell login', async () => {
    await costingPage.open();
    await costingPage.expectLoaded();
  });

  test.describe('Setup', () => {
    test('SM-COST-02: Company Costing Setup lists the company setups with a Create Setup action', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('companyCostingSetup');
      await costingPage.expectRows();
      await expect(s.createSetupButton).toBeVisible();
    });

    test('SM-COST-03: Create Setup unlocks Continue only once a company and decimal position are picked', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('companyCostingSetup');
      await s.createSetupButton.click();
      await expect(page).toHaveURL(/\/costing\/company-costing-setup\/new$/);
      await expect(s.selectCompanyHeading).toBeVisible();
      await expect(s.selectCompanyPicker).toBeVisible();
      await expect(s.setupContinueButton).toBeDisabled();
      await expect(s.lockedSetupSteps).toHaveCount(4);
      for (const step of await s.lockedSetupSteps.all()) {
        await expect(step).toBeDisabled();
      }
      // Positive control: picking a company alone keeps Continue locked;
      // adding the decimal position unlocks it. Picking is form state only —
      // Continue is never pressed.
      await s.selectCompanyPicker.click();
      await s.pickerOptions.first().click();
      await expect(s.setupContinueButton).toBeDisabled();
      await s.decimalPositionPicker.click();
      await s.pickerOptions.first().click();
      await expect(s.setupContinueButton).toBeEnabled();
      // Leave without creating anything.
      await s.cancelSetupButton.click();
      await expect(page).toHaveURL(/\/costing\/company-costing-setup$/);
    });

    test('SM-COST-04: Overhead & Wash Config lists the fields with an Add Field action', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('overheadWashConfig');
      await costingPage.expectRows();
      await expect(s.addFieldButton).toBeVisible();
    });
  });

  test.describe('Costing requests', () => {
    test('SM-COST-05: Costing list loads with the All tab selected and New Request and Import actions', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('costingRequests');
      await expect(s.allTab).toHaveAttribute('aria-selected', 'true');
      await expect(s.unassignedTab).toBeVisible();
      await expect(s.assignedTab).toBeVisible();
      await expect(s.newRequestButton).toBeVisible();
      await expect(s.importButton).toBeVisible();
      await costingPage.expectRows();
    });

    test('SM-COST-06: New Request unlocks the Techpack picker only once a sample request is picked', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('costingRequests');
      await s.newRequestButton.click();
      await expect(page).toHaveURL(/\/costing\/costing-requests\/new$/);
      await expect(s.newCostingRequestHeading).toBeVisible();
      await expect(s.sampleRequestPicker).toBeEnabled();
      await expect(s.techpackPicker).toBeDisabled();
      // Positive control: picking a sample request unlocks the Techpack
      // picker. Form state only — "Create request" is never pressed.
      await s.sampleRequestPicker.click();
      await s.pickerOptions.first().click();
      await expect(s.techpackPicker).toBeEnabled();
    });

    test('SM-COST-07: Ticking a costing offers Send for approval, and clearing the selection removes it', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('costingRequests');
      // Selection is client-side only — nothing is sent.
      await s.firstRowCheckbox.check();
      await expect(s.sendForApprovalButton).toBeVisible();
      await s.clearSelectionButton.click();
      await expect(s.sendForApprovalButton).toBeHidden();
      await expect(s.firstRowCheckbox).not.toBeChecked();
    });

    test('SM-COST-08: Import opens the Excel import wizard at the Upload step', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('costingRequests');
      await s.importButton.click();
      await expect(page).toHaveURL(/\/costing\/costing-requests\/imports\/new$/);
      await expect(s.importHeading).toBeVisible();
      await expect(s.importUploadStep).toBeVisible();
      await expect(s.chooseFileButton).toBeVisible();
      // No file is chosen, so nothing is imported.
    });

    test('SM-COST-09: A costing opens its cost sheet with every tab', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('costingRequests');
      await costingPage.openFirstRow(/\/costing\/costing-requests\/CST-[\w-]+$/);
      const costingId = new URL(page.url()).pathname.split('/').pop()!;
      await expect(
        page.getByRole('heading', { level: 1, name: `${costingId} | Cost Sheet` }),
      ).toBeVisible();
      await expect(s.costSheetTabs).toHaveText([
        'Overview',
        'BOM Items',
        'Fabric Yield',
        'Fabric Cost',
        'Cost build-up',
        'Activity',
        'Version history',
      ]);
      await expect(s.costSheetTabs.first()).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Fabric requests', () => {
    test('SM-COST-10: Fabric Yield Requests loads with its status tabs and opens a request', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('fabricYieldRequests');
      await expect(s.allTab).toHaveAttribute('aria-selected', 'true');
      await expect(s.newTab).toBeVisible();
      await expect(s.inProgressTab).toBeVisible();
      await expect(s.submittedTab).toBeVisible();
      await expect(s.overdueTab).toBeVisible();
      await expect(s.searchBox).toBeVisible();
      const fyrId = await s.firstFyrIdButton.innerText();
      await s.firstFyrIdButton.click();
      await expect(page).toHaveURL(new RegExp(`/costing/fabric-yield-requests/${fyrId}$`));
      await expect(page.getByRole('heading', { level: 1, name: fyrId })).toBeVisible();
    });

    test('SM-COST-11: Fabric Cost Requests loads with its status tabs and opens a request', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('fabricCostRequests');
      await expect(s.allTab).toHaveAttribute('aria-selected', 'true');
      await expect(s.newTab).toBeVisible();
      await expect(s.inProgressTab).toBeVisible();
      await expect(s.confirmedTab).toBeVisible();
      await expect(s.overdueTab).toBeVisible();
      const fcrId = await s.firstFcrIdButton.innerText();
      await s.firstFcrIdButton.click();
      await expect(page).toHaveURL(new RegExp(`/costing/fabric-cost-requests/${fcrId}$`));
      await expect(page.getByRole('heading', { level: 1, name: fcrId })).toBeVisible();
    });
  });

  test.describe('Approval & reporting', () => {
    test('SM-COST-12: Approvals loads with its status tabs and opens an approval', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('approvals');
      await expect(s.allTab).toHaveAttribute('aria-selected', 'true');
      await expect(s.pendingTab).toBeVisible();
      await expect(s.cmApprovedTab).toBeVisible();
      await costingPage.openFirstRow(/\/costing\/approvals\/[\w-]+$/);
      await expect(page.getByRole('heading', { level: 1, name: /\| Approval$/ })).toBeVisible();
      await expect(s.commonDetailsHeading).toBeVisible();
      await expect(s.costingSummaryHeading).toBeVisible();
    });

    test('SM-COST-13: Costing Report loads with its rows and the Saved views and Download actions', async () => {
      const s = costingPage.screens;
      await costingPage.openScreen('costingReport');
      await costingPage.expectRows();
      await expect(s.savedViewsButton).toBeVisible();
      await expect(s.downloadButton).toBeVisible();
    });
  });
});
