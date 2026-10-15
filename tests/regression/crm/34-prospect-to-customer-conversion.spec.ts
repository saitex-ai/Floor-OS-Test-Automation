import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import type { BizDocPage } from '../../../src/pages/crm/biz-doc.page';
import type { QualifiedLeadToProspectPage } from '../../../src/pages/crm/qualified-lead-to-prospect.page';

/**
 * Why every TC here ends in test.fixme(): on dev (2026-10-15) there is NO
 * way to create a Sample Order or a Bulk Order. The Biz Docs "Orders" tile
 * — the entry point every TC starts from — is a non-interactive `note`
 * reading "Orders: —. Purchase Orders is not available in floorOS yet.",
 * clicking it opens nothing, and no "Create Order" action exists on the
 * page; no app in the FloorOS app drawer creates orders either. Each test
 * still runs (and asserts) everything that IS real today — a fresh
 * Prospect Customer, its CRM Stage, and the Orders tile's current
 * read-only state — then stops at the missing trigger. When order creation
 * ships, `expectOrdersTileIsUnavailablePlaceholder()` will start failing:
 * that is the signal to replace the fixme with the real Create Order flow.
 */
const NO_ORDER_CREATION =
  'Blocked on dev (2026-10-15): the Biz Docs "Orders" tile is a read-only placeholder ("Purchase Orders is not available in floorOS yet") with no Create Order action, and no FloorOS app creates Sample/Bulk Orders — the conversion trigger cannot be exercised.';

interface ProspectCustomer {
  id: string;
  name: string;
}

/**
 * Creates this TC's OWN fresh Customer at CRM Stage "Prospect" (a real
 * Create Customer form option, confirmed on dev) with no orders, via the
 * UI — same flow as 18-qualified-lead-to-prospect.spec.ts's helper.
 */
async function createProspectCustomer(
  createCustomerPage: CreateCustomerPage,
  page: Page,
  tc: string,
): Promise<ProspectCustomer> {
  const stamp = Date.now();
  const name = `Playwright P2C ${tc} ${stamp}`;
  await createCustomerPage.openFromCrmHome();
  await createCustomerPage.fillProfile({
    name,
    email: `pw-p2c-${tc.toLowerCase()}-${stamp}@example.com`,
    city: 'Coimbatore',
    country: 'India',
    originType: 'Referral',
    origin: 'Internal Referral',
    buyer: 'Fabric',
    referredBy: 'Jordan Smith',
    crmStage: 'Prospect',
  });
  await createCustomerPage.save();
  if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
    await createCustomerPage.locators.saveAnywayButton.click();
  }
  await createCustomerPage.expectSavedSuccessfully();
  await createCustomerPage.locators.postSaveCancelButton.click();
  await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
  return { id: page.url().split('/').pop()!, name };
}

/** The steps every TC shares: fresh Prospect, stage check, then the Orders tile (the trigger). */
async function arrangeProspectAndOpenOrdersTile(
  fixtures: {
    createCustomerPage: CreateCustomerPage;
    qualifiedLeadToProspectPage: QualifiedLeadToProspectPage;
    bizDocPage: BizDocPage;
    page: Page;
  },
  tc: string,
): Promise<ProspectCustomer> {
  const { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page } = fixtures;
  let customer: ProspectCustomer = { id: '', name: '' };

  await test.step('Create a fresh Customer at CRM Stage Prospect (no orders)', async () => {
    customer = await createProspectCustomer(createCustomerPage, page, tc);
  });

  await test.step('Customer Details shows CRM Stage: Prospect', async () => {
    await qualifiedLeadToProspectPage.openCustomerDetail(customer.id);
    await qualifiedLeadToProspectPage.expectCrmStage('Prospect');
  });

  await test.step('Biz Docs tab -> Orders tile has no Create Order action (current dev behavior)', async () => {
    await bizDocPage.openFromCustomerDetails(customer.id);
    await bizDocPage.waitForDocumentsLoaded();
    await bizDocPage.expectOrdersTileIsUnavailablePlaceholder();
  });

  return customer;
}

/**
 * CRM — Prospect to Customer Conversion (1st Ever Sample Order) (Sprint 5).
 *
 * Source of truth: test-cases/crm/prospect-to-customer-conversion.md
 * (ClickUp parent https://app.clickup.com/t/z941abyjhw).
 */
test.describe('CRM - Prospect to Customer Conversion', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Prospect to Customer Conversion');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify First Sample Order Manual Creation', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyn6c', 'TC:1 (ClickUp)');
    test.slow();

    await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC1',
    );

    // TODO(CRM QA): once Create Order exists — Create Order, Category =
    // Sample Order, fill mandatory fields, Save; then expect CRM Stage
    // "Customer" and the Sample Order listed under the Orders tile.
    test.fixme(true, NO_ORDER_CREATION);
  });

  test('TC:2 verify UI Consistency Across Views', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    prospectToCustomerConversionPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyn6d', 'TC:2 (ClickUp)');
    test.slow();

    const customer = await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC2',
    );

    await test.step('Customer List: listed under the Prospects tab with CRM Stage Prospect (pre-conversion)', async () => {
      await prospectToCustomerConversionPage.openCustomerList();
      await prospectToCustomerConversionPage.selectOverflowStageTab('Prospects');
      await prospectToCustomerConversionPage.searchCustomer(customer.name);
      await prospectToCustomerConversionPage.expectCustomerListedWithStage(
        customer.name,
        'Prospect',
      );
    });

    // TODO(CRM QA): once Create Order exists — create the first Sample
    // Order, then expect the row under the "Customers" tab with CRM Stage
    // "Customer", and Customer Details' CRM Stage "Customer".
    test.fixme(true, NO_ORDER_CREATION);
  });

  test('TC:3 Verify Audit History & Stakeholder Notifications', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypre', 'TC:3 (ClickUp)');
    test.slow();

    await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC3',
    );

    // Beyond the missing trigger: Customer Details has no Audit History
    // view on dev (Overview shows only Profile / System / Management /
    // Departments sections), and this framework has no mailbox fixture
    // for the email half of the stakeholder notification.
    test.fixme(
      true,
      `${NO_ORDER_CREATION} Also: no Audit History view exists on Customer Details, and no mailbox fixture exists to check the email notification.`,
    );
  });

  test('TC:4 Verify Subsequent Sample Orders Do Not Re-Trigger', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt1', 'TC:4 (ClickUp)');
    test.slow();

    await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC4',
    );

    // TODO(CRM QA): once Create Order exists — create a first Sample Order
    // (converts to Customer), then a second; expect CRM Stage still
    // "Customer" and no second conversion notification/audit entry.
    test.fixme(true, NO_ORDER_CREATION);
  });

  test('TC:5 Bulk Order After Initial Sample Order Conversion (Sample ---> Bulk)', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt2', 'TC:5 (ClickUp)');
    test.slow();

    await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC5',
    );

    // TODO(CRM QA): once Create Order exists — Sample Order first
    // (converts), then a Bulk Order; expect it listed and CRM Stage still
    // "Customer".
    test.fixme(true, NO_ORDER_CREATION);
  });

  test('TC:6 Sample Order After Initial Bulk Order Conversion (Bulk --->Sample)', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt4', 'TC:6 (ClickUp)');
    test.slow();

    await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC6',
    );

    // TODO(CRM QA): once Create Order exists — Bulk Order first
    // (converts), then a Sample Order; expect it listed and CRM Stage
    // still "Customer".
    test.fixme(true, NO_ORDER_CREATION);
  });

  test('TC:7 Verify First Order Created is a Bulk Order', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt5', 'TC:7 (ClickUp)');
    test.slow();

    await arrangeProspectAndOpenOrdersTile(
      { createCustomerPage, qualifiedLeadToProspectPage, bizDocPage, page },
      'TC7',
    );

    // TODO(CRM QA): once Create Order exists — Create Order, Category =
    // Bulk Order, Save; expect CRM Stage "Customer" and the order under
    // the Orders tile.
    test.fixme(true, NO_ORDER_CREATION);
  });
});
