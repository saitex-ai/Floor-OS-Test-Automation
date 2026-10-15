import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import type { BizDocPage } from '../../../src/pages/crm/biz-doc.page';
import type { ProspectToCustomerConversionPage } from '../../../src/pages/crm/prospect-to-customer-conversion.page';
import type { CustomerSeasonListPage } from '../../../src/pages/master-data/customer-season-list.page';
import type { CustomerSeasonFormPage } from '../../../src/pages/master-data/customer-season-form.page';
import type {
  NewSalesOrder,
  SalesOrderPage,
  SalesOrderType,
} from '../../../src/pages/master-data/sales-order.page';

/**
 * CRM — Prospect to Customer Conversion (1st Ever Sample Order) (Sprint 5).
 *
 * Source of truth: test-cases/crm/prospect-to-customer-conversion.md
 * (ClickUp parent https://app.clickup.com/t/z941abyjhw).
 *
 * Confirmed on dev (2026-10-15): the trigger is a Sales Order created in
 * Master Data → Sales Order Management → Sales Order (Order Type SMS =
 * sample, BULK = bulk) — not CRM's Biz Docs tab, whose Orders tile is
 * still a read-only placeholder. A Sales Order needs a Customer Season, so
 * every TC creates, through the UI and with unique names: its own CRM
 * Customer at stage Prospect → a Season for it → the order(s). Nothing
 * pre-existing is touched.
 */

interface ConversionFixtures {
  createCustomerPage: CreateCustomerPage;
  prospectToCustomerConversionPage: ProspectToCustomerConversionPage;
  customerSeasonListPage: CustomerSeasonListPage;
  customerSeasonFormPage: CustomerSeasonFormPage;
  salesOrderPage: SalesOrderPage;
  page: Page;
}

interface ConvertibleProspect {
  id: string;
  name: string;
  code: string;
  seasonCode: string;
  stamp: number;
}

/** Fresh CRM Customer at Prospect + a Customer Season for it (required by Sales Order). */
async function arrangeProspectWithSeason(
  f: ConversionFixtures,
  tc: string,
): Promise<ConvertibleProspect> {
  const stamp = Date.now();
  const name = `Playwright P2C ${tc} ${stamp}`;
  const seasonCode = `PWP${stamp}`;
  let id = '';
  let code = '';

  await test.step('Create a fresh Customer at CRM Stage Prospect (no orders)', async () => {
    await f.createCustomerPage.openFromCrmHome();
    await f.createCustomerPage.fillProfile({
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
    await f.createCustomerPage.save();
    if (await f.createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await f.createCustomerPage.locators.saveAnywayButton.click();
    }
    await f.createCustomerPage.expectSavedSuccessfully();
    await f.createCustomerPage.locators.postSaveCancelButton.click();
    await expect(f.page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    id = f.page.url().split('/').pop()!;
  });

  await test.step('Customer Details shows CRM Stage: Prospect', async () => {
    await f.prospectToCustomerConversionPage.openCustomerDetail(id);
    await f.prospectToCustomerConversionPage.expectCrmStage('Prospect');
    code = await f.prospectToCustomerConversionPage.getCustomerCode();
  });

  await test.step(`Create Customer Season ${seasonCode} for ${code} (Master Data)`, async () => {
    await f.customerSeasonListPage.open();
    await f.customerSeasonListPage.openNewSeason();
    await f.customerSeasonFormPage.pickCustomer(code, code);
    await f.customerSeasonFormPage.fillFields({
      seasonCode,
      description: `PW P2C ${tc} season ${stamp}`,
    });
    await f.customerSeasonFormPage.create();
    await f.customerSeasonFormPage.expectCreatedSuccessfully();
  });

  return { id, name, code, seasonCode, stamp };
}

/** Creates an SMS/BULK Sales Order for the prospect and returns its Order #. */
async function placeOrder(
  salesOrderPage: SalesOrderPage,
  prospect: ConvertibleProspect,
  type: SalesOrderType,
  label: string,
): Promise<string> {
  const order: NewSalesOrder = {
    type,
    customerCode: prospect.code,
    seasonCode: prospect.seasonCode,
    description: `PW P2C ${label} ${type} ${prospect.stamp}`,
  };
  let orderNo = '';
  await test.step(`Create ${label} Sales Order (Order Type ${type}) for ${prospect.code}`, async () => {
    await salesOrderPage.open();
    orderNo = await salesOrderPage.createOrder(order);
    await salesOrderPage.expectOrderListed(orderNo, order);
  });
  return orderNo;
}

async function expectStageOnDetails(
  conversionPage: ProspectToCustomerConversionPage,
  prospect: ConvertibleProspect,
  stage: string,
): Promise<void> {
  await test.step(`Customer Details shows CRM Stage: ${stage}`, async () => {
    await conversionPage.openCustomerDetail(prospect.id);
    await conversionPage.expectCrmStage(stage);
  });
}

/**
 * BUG: the TCs expect the order under Customer Details → Biz Docs → Orders
 * tile, but on dev (2026-10-15) that tile is still the placeholder "Orders:
 * —. Purchase Orders is not available in floorOS yet." even after a Sales
 * Order exists for the Customer. Asserts that real behavior.
 */
async function bugOrdersTileStillPlaceholder(
  bizDocPage: BizDocPage,
  prospect: ConvertibleProspect,
): Promise<void> {
  await test.step('BUG: Biz Docs Orders tile does not list the order — still the "not available in floorOS yet" placeholder', async () => {
    await bizDocPage.openFromCustomerDetails(prospect.id);
    await bizDocPage.waitForDocumentsLoaded();
    await bizDocPage.expectOrdersTileIsUnavailablePlaceholder();
  });
}

test.describe('CRM - Prospect to Customer Conversion', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Prospect to Customer Conversion');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify First Sample Order Manual Creation', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyn6c', 'TC:1 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC1',
    );
    await placeOrder(salesOrderPage, prospect, 'SMS', 'first');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await bugOrdersTileStillPlaceholder(bizDocPage, prospect);
  });

  test('TC:2 verify UI Consistency Across Views', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    prospectToCustomerConversionSecondTab: listTab,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyn6d', 'TC:2 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC2',
    );

    await test.step('Second tab: Customer List, Prospects tab lists the Customer as Prospect', async () => {
      await listTab.openCustomerList();
      await listTab.selectOverflowStageTab('Prospects');
      await listTab.searchCustomer(prospect.name);
      await listTab.expectCustomerListedWithStage(prospect.name, 'Prospect');
    });

    await placeOrder(salesOrderPage, prospect, 'SMS', 'first');

    // Not real-time on dev: an open list/Overview keeps showing Prospect
    // until refreshed (allowed by the TC: "or immediately upon refresh").
    await test.step('Second tab, after Refresh: the Customer drops out of the Prospects tab', async () => {
      await listTab.refreshUntilNotListed(prospect.name);
    });

    await test.step('Customer List: now under the Customers tab with CRM Stage Customer', async () => {
      await listTab.selectOverflowStageTab('Customers');
      await listTab.searchCustomer(prospect.name);
      await listTab.expectCustomerListedWithStage(prospect.name, 'Customer');
    });

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');

    test.info().annotations.push({
      type: 'not verified',
      description:
        'Stage-based dashboard widgets (CRM Home "Pipeline" counts) are not asserted: dev is shared and other suites change the counts concurrently, so a +1/-1 delta is not deterministic.',
    });
  });

  test('TC:3 Verify Audit History & Stakeholder Notifications', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypre', 'TC:3 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC3',
    );
    const orderNo = await placeOrder(salesOrderPage, prospect, 'SMS', 'first');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');

    await test.step('System section records the change: Updated By "system:sales-order"', async () => {
      await prospectToCustomerConversionPage.expectUpdatedBy('system:sales-order');
    });

    await test.step(`System notification: one "converted from Prospect to Customer" alert naming ${orderNo}`, async () => {
      await prospectToCustomerConversionPage.expectSingleConversionNotification(
        prospect.id,
        orderNo,
      );
    });

    // BUG: the TC expects an Audit History log entry for the stage change
    // (naming the triggering order). Customer Details on dev has no Audit /
    // History view at all — only Overview / Lead Qualification / Biz Docs /
    // Communication / Contacts. The only trace is "Updated By
    // system:sales-order" (checked above).
    await test.step('BUG: Customer Details has no Audit History view to show the Prospect -> Customer entry', async () => {
      await prospectToCustomerConversionPage.openCustomerDetail(prospect.id);
      await prospectToCustomerConversionPage.expectNoAuditHistoryView();
    });

    test.info().annotations.push({
      type: 'not verified',
      description:
        'The email half of the stakeholder notification is not checked: this framework has no mailbox fixture.',
    });
  });

  test('TC:4 Verify Subsequent Sample Orders Do Not Re-Trigger', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt1', 'TC:4 (ClickUp)');
    test.setTimeout(360_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC4',
    );
    const firstOrderNo = await placeOrder(salesOrderPage, prospect, 'SMS', 'first');
    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`Conversion notification for ${firstOrderNo} arrived`, async () => {
      await prospectToCustomerConversionPage.expectSingleConversionNotification(
        prospect.id,
        firstOrderNo,
      );
    });

    const secondOrderNo = await placeOrder(salesOrderPage, prospect, 'SMS', 'second');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`No new conversion notification for the second order ${secondOrderNo}`, async () => {
      await prospectToCustomerConversionPage.expectNoRepeatConversionNotification(
        prospect.id,
        firstOrderNo,
        secondOrderNo,
      );
    });
  });

  test('TC:5 Bulk Order After Initial Sample Order Conversion (Sample ---> Bulk)', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt2', 'TC:5 (ClickUp)');
    test.setTimeout(360_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC5',
    );
    const sampleOrderNo = await placeOrder(salesOrderPage, prospect, 'SMS', 'first');
    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');

    const bulkOrderNo = await placeOrder(salesOrderPage, prospect, 'BULK', 'second');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`No stage-change notification for the Bulk order ${bulkOrderNo}`, async () => {
      await prospectToCustomerConversionPage.expectNoRepeatConversionNotification(
        prospect.id,
        sampleOrderNo,
        bulkOrderNo,
      );
    });
    await bugOrdersTileStillPlaceholder(bizDocPage, prospect);
  });

  test('TC:6 Sample Order After Initial Bulk Order Conversion (Bulk --->Sample)', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt4', 'TC:6 (ClickUp)');
    test.setTimeout(360_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC6',
    );
    const bulkOrderNo = await placeOrder(salesOrderPage, prospect, 'BULK', 'first');
    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');

    const sampleOrderNo = await placeOrder(salesOrderPage, prospect, 'SMS', 'second');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`No stage-change notification for the Sample order ${sampleOrderNo}`, async () => {
      await prospectToCustomerConversionPage.expectNoRepeatConversionNotification(
        prospect.id,
        bulkOrderNo,
        sampleOrderNo,
      );
    });
    await bugOrdersTileStillPlaceholder(bizDocPage, prospect);
  });

  test('TC:7 Verify First Order Created is a Bulk Order', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    bizDocPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt5', 'TC:7 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        salesOrderPage,
        page,
      },
      'TC7',
    );
    const orderNo = await placeOrder(salesOrderPage, prospect, 'BULK', 'first');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`Conversion notification names the Bulk order ${orderNo}`, async () => {
      await prospectToCustomerConversionPage.expectSingleConversionNotification(
        prospect.id,
        orderNo,
      );
    });
    await bugOrdersTileStillPlaceholder(bizDocPage, prospect);
  });
});
