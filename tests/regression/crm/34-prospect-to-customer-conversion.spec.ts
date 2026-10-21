import * as allure from 'allure-js-commons';
import { test as crossModuleTest } from '../../../src/fixtures/cross-module.fixtures';
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
 *
 * Cross-module: uses src/fixtures/cross-module.fixtures.ts (CRM + Master
 * Data page objects merged) because the flow genuinely spans both. It
 * still runs in the `crm` project on the CRM session — confirmed on dev
 * (2026-10-15) that the CRM user can create the Master Data Customer
 * Seasons and Sales Orders this needs.
 *
 * Teardown (the `createdRecords` fixture): every Sales Order and Customer
 * Season a test created is deleted again afterwards — orders first, then
 * the Season (confirmed on dev 2026-10-21: Sales Orders delete from the
 * list's row-select "Delete", Seasons from Edit Season → Delete).
 * Failures there are logged and annotated, never fail the test. The CRM
 * Customers themselves, and the conversion notifications/emails, stay.
 */

/** What a test created on shared dev, for the teardown to delete again. */
interface CreatedRecords {
  orderDescriptions: string[];
  seasonCodes: string[];
}

const test = crossModuleTest.extend<{ createdRecords: CreatedRecords }>({
  createdRecords: async (
    { salesOrderPage, customerSeasonListPage, customerSeasonFormPage },
    use,
    testInfo,
  ) => {
    const created: CreatedRecords = { orderDescriptions: [], seasonCodes: [] };
    await use(created);

    const cleanupFailed = (what: string, error: unknown): void => {
      const description = `Teardown could not delete ${what}: ${String(error).split('\n')[0]}`;
      console.warn(description);
      testInfo.annotations.push({ type: 'cleanup failed', description });
    };
    for (const description of created.orderDescriptions) {
      await test.step(`Teardown: delete Sales Order "${description}"`, async () => {
        try {
          await salesOrderPage.open();
          await salesOrderPage.deleteOrder(description);
        } catch (error) {
          cleanupFailed(`Sales Order "${description}"`, error);
        }
      });
    }
    for (const seasonCode of created.seasonCodes) {
      await test.step(`Teardown: delete Customer Season ${seasonCode}`, async () => {
        try {
          await customerSeasonListPage.open();
          await customerSeasonListPage.search(seasonCode);
          await customerSeasonListPage.openEdit(seasonCode);
          await customerSeasonFormPage.clickDelete();
          await customerSeasonFormPage.confirmDelete();
          await customerSeasonFormPage.expectDeletedSuccessfully();
        } catch (error) {
          cleanupFailed(`Customer Season ${seasonCode}`, error);
        }
      });
    }
  },
});

interface ConversionFixtures {
  createCustomerPage: CreateCustomerPage;
  prospectToCustomerConversionPage: ProspectToCustomerConversionPage;
  customerSeasonListPage: CustomerSeasonListPage;
  customerSeasonFormPage: CustomerSeasonFormPage;
  createdRecords: CreatedRecords;
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
    await f.createCustomerPage.saveAndOpenDetail();
    id = await f.prospectToCustomerConversionPage.openedCustomerId();
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
    f.createdRecords.seasonCodes.push(seasonCode);
  });

  return { id, name, code, seasonCode, stamp };
}

/** Creates an SMS/BULK Sales Order for the prospect and returns its Order #. */
async function placeOrder(
  salesOrderPage: SalesOrderPage,
  createdRecords: CreatedRecords,
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
    createdRecords.orderDescriptions.push(order.description);
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
 * The TCs expect the order under Customer Details → Biz Docs → Orders, but
 * that tile is not implemented yet (confirmed with the team 2026-10-15):
 * it still reads "Orders: —. Purchase Orders is not available in floorOS
 * yet." even after a Sales Order exists. Not a bug — this checks the
 * placeholder, and will fail (as a signal to extend the TC) once the
 * Orders tile ships.
 */
async function ordersTileNotYetImplemented(
  bizDocPage: BizDocPage,
  prospect: ConvertibleProspect,
): Promise<void> {
  await test.step('Biz Docs Orders tile is not implemented yet — still the "not available in floorOS yet" placeholder', async () => {
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
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyn6c', 'TC:1 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC1',
    );
    await placeOrder(salesOrderPage, createdRecords, prospect, 'SMS', 'first');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await ordersTileNotYetImplemented(bizDocPage, prospect);
  });

  test('TC:2 verify UI Consistency Across Views', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    prospectToCustomerConversionSecondTab: listTab,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyn6d', 'TC:2 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC2',
    );

    await test.step('Second tab: Customer List, Prospects tab lists the Customer as Prospect', async () => {
      await listTab.openCustomerList();
      await listTab.selectOverflowStageTab('Prospects');
      await listTab.searchCustomer(prospect.name);
      await listTab.expectCustomerListedWithStage(prospect.name, 'Prospect');
    });

    await placeOrder(salesOrderPage, createdRecords, prospect, 'SMS', 'first');

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
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypre', 'TC:3 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC3',
    );
    const orderNo = await placeOrder(salesOrderPage, createdRecords, prospect, 'SMS', 'first');

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
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt1', 'TC:4 (ClickUp)');
    test.setTimeout(360_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC4',
    );
    const firstOrderNo = await placeOrder(salesOrderPage, createdRecords, prospect, 'SMS', 'first');
    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`Conversion notification for ${firstOrderNo} arrived`, async () => {
      await prospectToCustomerConversionPage.expectSingleConversionNotification(
        prospect.id,
        firstOrderNo,
      );
    });

    const secondOrderNo = await placeOrder(
      salesOrderPage,
      createdRecords,
      prospect,
      'SMS',
      'second',
    );

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
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt2', 'TC:5 (ClickUp)');
    test.setTimeout(360_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC5',
    );
    const sampleOrderNo = await placeOrder(
      salesOrderPage,
      createdRecords,
      prospect,
      'SMS',
      'first',
    );
    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');

    const bulkOrderNo = await placeOrder(
      salesOrderPage,
      createdRecords,
      prospect,
      'BULK',
      'second',
    );

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`No stage-change notification for the Bulk order ${bulkOrderNo}`, async () => {
      await prospectToCustomerConversionPage.expectNoRepeatConversionNotification(
        prospect.id,
        sampleOrderNo,
        bulkOrderNo,
      );
    });
    await ordersTileNotYetImplemented(bizDocPage, prospect);
  });

  test('TC:6 Sample Order After Initial Bulk Order Conversion (Bulk --->Sample)', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    bizDocPage,
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt4', 'TC:6 (ClickUp)');
    test.setTimeout(360_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC6',
    );
    const bulkOrderNo = await placeOrder(salesOrderPage, createdRecords, prospect, 'BULK', 'first');
    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');

    const sampleOrderNo = await placeOrder(
      salesOrderPage,
      createdRecords,
      prospect,
      'SMS',
      'second',
    );

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`No stage-change notification for the Sample order ${sampleOrderNo}`, async () => {
      await prospectToCustomerConversionPage.expectNoRepeatConversionNotification(
        prospect.id,
        bulkOrderNo,
        sampleOrderNo,
      );
    });
    await ordersTileNotYetImplemented(bizDocPage, prospect);
  });

  test('TC:7 Verify First Order Created is a Bulk Order', async ({
    createCustomerPage,
    prospectToCustomerConversionPage,
    customerSeasonListPage,
    customerSeasonFormPage,
    salesOrderPage,
    bizDocPage,
    createdRecords,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abypt5', 'TC:7 (ClickUp)');
    test.setTimeout(300_000);

    const prospect = await arrangeProspectWithSeason(
      {
        createCustomerPage,
        prospectToCustomerConversionPage,
        customerSeasonListPage,
        customerSeasonFormPage,
        createdRecords,
      },
      'TC7',
    );
    const orderNo = await placeOrder(salesOrderPage, createdRecords, prospect, 'BULK', 'first');

    await expectStageOnDetails(prospectToCustomerConversionPage, prospect, 'Customer');
    await test.step(`Conversion notification names the Bulk order ${orderNo}`, async () => {
      await prospectToCustomerConversionPage.expectSingleConversionNotification(
        prospect.id,
        orderNo,
      );
    });
    await ordersTileNotYetImplemented(bizDocPage, prospect);
  });
});
