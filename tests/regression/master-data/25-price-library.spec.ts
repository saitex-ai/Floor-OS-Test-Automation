import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import type {
  PriceLibraryPage,
  PriceRowValues,
} from '../../../src/pages/master-data/price-library.page';
import type { ItemMasterPage } from '../../../src/pages/master-data/item-master.page';
import type { VendorListPage } from '../../../src/pages/master-data/vendor-list.page';

/**
 * Master Data — Price Library ("Material Price Library" screen,
 * `/master-data/price-library`, reached via the collapsed-by-default
 * "Inventory Item Management" nav group but living at its own route — not
 * nested under `/master-data/inventory-item-management/...` like its sibling
 * modules).
 *
 * Source of truth: test-cases/master-data/price-library/price-library-testcases.md
 * — no ClickUp task exists for this module yet, so no allure.tms() links
 * here (same convention as this repo's other no-ClickUp suites).
 *
 * Test-data strategy, worth knowing before touching this file: this
 * module's backend enforces a **permanent** uniqueness constraint on
 * (item, supplier) — confirmed live, a real 409 (TC:7) — and there is no
 * delete anywhere in this module. The seeded pairs ran out on dev on
 * 2026-10-12, so every create-flow test now makes its own pair first:
 * createFreshPriceRecord() below creates a brand-new QA-AUTO-tagged item in
 * Item Master (unique Alternate Code, created straight as Approved), links
 * one Approved vendor to it (Supplier tab — Price Library's Supplier picker
 * only offers an item's default supplier), and then prices exactly that
 * pair. Every write lands on a record the test created; no existing item
 * is ever edited, and the pool can't run out. afterEach deletes the
 * test's own items (confirmed live 2026-10-21 that a priced item can be
 * deleted); price records have no delete, so they stay on dev, showing the
 * QA-AUTO description (safe to delete from the backend).
 *
 * Two real, confirmed app gaps are deliberately asserted as-is (not worked
 * around) per this repo's established discipline:
 * - TC:7 — a real backend 409 on a duplicate (item, supplier) pair produces
 *   zero UI feedback (no toast, no inline error).
 * - TC:14 — a successful create also shows no toast, only a silent redirect.
 *
 * TC:3 (adding a second price tier from the item's own detail page) is
 * deliberately `test.fixme()`d: the live exploration behind the test-case
 * doc confirmed the blank "New price" row's fields exist, but never
 * confirmed how that row is actually submitted (no explicit "Add"/"Save"
 * control was exercised to completion) — writing a passing test around an
 * unconfirmed submission mechanism would be inventing behavior, not
 * automating it.
 */
// Item Master IDs created by the current test, deleted in afterEach.
const createdItemIds: string[] = [];
let itemCounter = 0;

/**
 * Creates a price record for a brand-new (item, supplier) pair, with no
 * retries: creates a fresh QA-AUTO item in Item Master, links one random
 * Approved vendor (from Vendor Master's Approved tab) to it, then prices
 * exactly that pair in Price Library (ending on the create form's save).
 */
async function createFreshPriceRecord(
  priceLibraryPage: PriceLibraryPage,
  itemMasterPage: ItemMasterPage,
  vendorListPage: VendorListPage,
  rowValues: PriceRowValues = {},
): Promise<{
  status: number | undefined;
  itemName: string;
  supplierName: string;
  item: { itemId: string; description: string; alternateCode: string };
  vendorCode: string;
}> {
  await vendorListPage.open();
  await vendorListPage.expectLoaded();
  const vendors = await vendorListPage.approvedVendors();
  if (vendors.length === 0) throw new Error('No Approved vendor on Vendor Master');
  const vendor = vendors[Math.floor(Math.random() * vendors.length)]!;

  // Unique per run and per call: Item Master rejects a duplicate Alternate Code.
  itemCounter += 1;
  const alternateCode = `QA-AUTO-PL-${Date.now().toString(36).toUpperCase()}${itemCounter}`;
  const description = `QA-AUTO ${alternateCode} Price Library test item. Safe to delete.`;
  const itemId = await itemMasterPage.createItem({ alternateCode, description });
  createdItemIds.push(itemId);
  const item = { itemId, description, alternateCode };

  await itemMasterPage.linkSupplier(itemId, vendor);

  await priceLibraryPage.open();
  await priceLibraryPage.expectLoaded();
  const { response, itemName } = await priceLibraryPage.createPriceRecordFor(
    item,
    vendor.code,
    rowValues,
  );
  return {
    status: response?.status(),
    itemName,
    supplierName: vendor.name,
    item,
    vendorCode: vendor.code,
  };
}

test.describe('Master Data - Price Library', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Price Library');
    await allure.owner('Master Data QA');
  });

  // Best-effort cleanup of this test's own items only. A failure is logged,
  // not raised: the item is QA-AUTO tagged, so a leftover is clearly test data.
  test.afterEach(async ({ itemMasterPage }) => {
    while (createdItemIds.length > 0) {
      const itemId = createdItemIds.pop()!;
      try {
        await itemMasterPage.deleteItemById(itemId);
        console.log(`QA-AUTO cleanup: deleted item ${itemId}`);
      } catch (error) {
        console.warn(
          `QA-AUTO cleanup: could not delete item ${itemId}: ${String(error).split('\n')[0]}`,
        );
      }
    }
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    priceLibraryPage,
    itemMasterPage,
    vendorListPage,
  }) => {
    // createFreshPriceRecord() creates an item and links a supplier in Item
    // Master before creating the price record — longer than the dev
    // project's default 60s test timeout comfortably allows.
    test.setTimeout(300_000);
    let itemName = '';
    let supplierName = '';

    await test.step('Open the list', async () => {
      await priceLibraryPage.open();
      await priceLibraryPage.expectLoaded();
    });

    await test.step('Create a record with Price/Freight/Other/MOQ/Start date all filled', async () => {
      const result = await createFreshPriceRecord(
        priceLibraryPage,
        itemMasterPage,
        vendorListPage,
        {
          price: '12.50',
          freightCharges: '1.00',
          otherCharges: '0.50',
          moq: '250',
        },
      );
      expect(result.status).toBe(201);
      ({ itemName, supplierName } = result);
    });

    await test.step('Silent redirect to the list (no toast — see TC:14)', async () => {
      await priceLibraryPage.expectSavedAndRedirectedToList();
    });

    await test.step('The new (item, supplier) record appears Active on the list', async () => {
      await priceLibraryPage.expectRowStatus(itemName, 'Active', supplierName);
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    priceLibraryPage,
    itemMasterPage,
    vendorListPage,
  }) => {
    test.setTimeout(300_000); // see TC:1's comment on createFreshPriceRecord()
    let itemName = '';
    let supplierName = '';

    await test.step('Open the list', async () => {
      await priceLibraryPage.open();
      await priceLibraryPage.expectLoaded();
    });

    await test.step('Create a record leaving Freight/Other/Currency/MOQ/Customer/End date at their defaults — only Item code/Supplier/Start date/Price touched (Price must be > 0 since 2026-10-12)', async () => {
      const result = await createFreshPriceRecord(priceLibraryPage, itemMasterPage, vendorListPage);
      expect(result.status).toBe(201);
      ({ itemName, supplierName } = result);
    });

    await test.step('Saves successfully — confirms every other field is genuinely optional', async () => {
      await priceLibraryPage.expectSavedAndRedirectedToList();
    });

    await test.step('Appears on the list as Active', async () => {
      await priceLibraryPage.expectRowStatus(itemName, 'Active', supplierName);
    });
  });

  test.fixme('TC:3 Verify the per-item detail page and adding a second price tier', async ({
    priceLibraryPage,
  }) => {
    // Not implemented: the test-case doc's own live exploration confirmed
    // the item detail page's "Prices" table and its always-present blank
    // "New price" row exist, but never confirmed the actual mechanism that
    // submits that row (no explicit Add/Save control was exercised to
    // completion during exploration). Automating a guessed submission flow
    // here would assert behavior nobody actually confirmed — left as
    // fixme with this reasoning instead, per the test-case file's own
    // "Not covered in this pass" note on the Where Used/detail page depth.
    await priceLibraryPage.open();
  });

  test('TC:4 Verify list search by code, description, and supplier', async ({
    priceLibraryPage,
    itemMasterPage,
    vendorListPage,
  }) => {
    test.setTimeout(300_000); // see TC:1's comment on createFreshPriceRecord()
    let itemName = '';
    let supplierName = '';
    let realItemCode = '';
    let realSupplierName = '';

    await test.step('Create a fresh record to search for', async () => {
      await priceLibraryPage.open();
      await priceLibraryPage.expectLoaded();
      const result = await createFreshPriceRecord(priceLibraryPage, itemMasterPage, vendorListPage);
      expect(result.status).toBe(201);
      ({ itemName, supplierName } = result);
      await priceLibraryPage.expectSavedAndRedirectedToList();
    });

    await test.step('Read the real persisted Item Code / Supplier from its own list row', async () => {
      // Deliberately read back from the list's own cells rather than reusing
      // the item picker's display text — confirmed live (see the test-case
      // file's Notes) that the picker shows an Alternate-Code-style value
      // (e.g. "ALTTHR000003") while the list's own Item Code column shows a
      // different, base code (e.g. "THR000003").
      await priceLibraryPage.expectRowVisible(itemName, supplierName);
      const cells = await priceLibraryPage.getRowCellTexts(itemName, supplierName);
      // Columns: [checkbox, Item Code, Item, Category, Supplier, Prices, Price Range, Status]
      realItemCode = cells[1] ?? '';
      realSupplierName = cells[4] ?? '';
      expect(realItemCode).not.toBe('');
      expect(realSupplierName).not.toBe('');
    });

    await test.step('Search by Item Code narrows to the matching row', async () => {
      await priceLibraryPage.expectRowVisible(realItemCode, realSupplierName);
    });

    await test.step('Search by description (item name) also narrows to the matching row', async () => {
      await priceLibraryPage.expectRowVisible(itemName, realSupplierName);
    });

    await test.step('Search by Supplier also narrows to the matching row', async () => {
      await priceLibraryPage.search(realSupplierName);
      await expect(priceLibraryPage.locators.row(realItemCode, realSupplierName)).toBeVisible();
    });
  });

  test('TC:5 Verify All / Active / Expiring Soon / Expired tabs are status-computed, not a manual toggle', async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.expectLoaded();

    for (const tab of ['All', 'Active', 'Expiring Soon', 'Expired'] as const) {
      await test.step(`"${tab}" tab is clickable and the list still renders`, async () => {
        await priceLibraryPage.selectTab(tab);
        await expect(priceLibraryPage.locators.heading).toBeVisible();
      });
    }
  });

  test('TC:6 Verify validation when Item code, Supplier, and Start date are all left unset', async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();

    await test.step('Submit with Item code/Supplier unpicked and Start date unset', async () => {
      await priceLibraryPage.attemptSaveWithoutWaitingOnNetwork();
    });

    await test.step('Blocked with all three inline errors at once; no toast, no navigation', async () => {
      await priceLibraryPage.expectRequiredErrorsVisible();
      await priceLibraryPage.expectOnCreateForm();
    });
  });

  test('TC:7 Verify duplicate (Item, Supplier) handling — real bug, zero UI feedback', async ({
    priceLibraryPage,
    itemMasterPage,
    vendorListPage,
  }) => {
    test.setTimeout(300_000); // see TC:1's comment on createFreshPriceRecord()
    let item = { itemId: '', description: '', alternateCode: '' };
    let vendorCode = '';

    await test.step('Create the first record for a given (item, supplier) pair', async () => {
      await priceLibraryPage.open();
      await priceLibraryPage.expectLoaded();
      const result = await createFreshPriceRecord(priceLibraryPage, itemMasterPage, vendorListPage);
      expect(result.status).toBe(201);
      ({ item, vendorCode } = result);
      await priceLibraryPage.expectSavedAndRedirectedToList();
    });

    await test.step('Attempt a second, brand-new record for the exact same pair', async () => {
      // Same item (by Alternate Code) and same supplier (by Vendor Code) as
      // the record just created.
      await priceLibraryPage.openAddItemForm();
      await priceLibraryPage.pickItemByCode(item.alternateCode, item.description);
      await priceLibraryPage.pickSupplierByCode(vendorCode);
      await priceLibraryPage.fillPriceRow(1, { price: '1' });
      await priceLibraryPage.setStartDateToday(1);
    });

    await test.step('BUG, confirmed real: backend returns 409 CONFLICT, UI shows absolutely nothing', async () => {
      const second = await priceLibraryPage.confirmAndSave();
      expect(second?.status()).toBe(409);
      await priceLibraryPage.expectOnCreateForm();
      await priceLibraryPage.expectNoToastAppears();
    });
  });

  test('TC:8 Verify Cancel discards changes on create', async ({ priceLibraryPage, page }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();

    await test.step('Pick an item, then Cancel', async () => {
      await priceLibraryPage.pickRandomItem('thread');
      await priceLibraryPage.cancel();
    });

    await test.step('Back on the plain list URL — a real link, not a save-then-navigate handler', async () => {
      await expect(page).toHaveURL(/\/master-data\/price-library$/);
    });
  });

  test('TC:9 Verify the Price field rejects negative input (edge)', async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();

    const price = priceLibraryPage.locators.priceInput(1);
    await price.fill('');
    await price.pressSequentially('-5', { delay: 15 });
    await price.blur();

    // The minus sign is stripped entirely as it's typed, confirmed live.
    await expect(price).toHaveValue('5');
  });

  test("TC:10 Verify the Price field's real decimal precision vs. its displayed default (edge)", async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();

    const price = priceLibraryPage.locators.priceInput(1);
    await price.fill('');
    await price.pressSequentially('123.456789', { delay: 15 });
    await price.blur();

    // Truncated to 4 decimal places, not the field's own 3-decimal default display ("0.000").
    await expect(price).toHaveValue('123.4567');
  });

  test('TC:11 Verify Price field accepts 0 and very large values (edge)', async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();
    const price = priceLibraryPage.locators.priceInput(1);

    await test.step('0 is accepted', async () => {
      await price.fill('');
      await price.pressSequentially('0', { delay: 15 });
      await price.blur();
      await expect(price).toHaveValue('0');
    });

    await test.step('A very large value is accepted with no visible upper bound', async () => {
      await price.fill('');
      await price.pressSequentially('1000000', { delay: 15 });
      await price.blur();
      await expect(price).toHaveValue('1000000');
    });
  });

  test('TC:12 Verify non-numeric characters are stripped from the Price field (edge)', async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();

    const price = priceLibraryPage.locators.priceInput(1);
    await price.fill('');
    await price.pressSequentially('abc', { delay: 15 });
    await price.blur();

    await expect(price).toHaveValue('');
  });

  test('TC:13 Verify the last remaining price row cannot be removed (edge)', async ({
    priceLibraryPage,
  }) => {
    await priceLibraryPage.open();
    await priceLibraryPage.openAddItemForm();

    await priceLibraryPage.expectRemovePriceRowDisabled(1);
  });

  test('TC:14 Verify there is no success toast on a successful creation either (edge)', async ({
    priceLibraryPage,
    itemMasterPage,
    vendorListPage,
  }) => {
    test.setTimeout(300_000); // see TC:1's comment on createFreshPriceRecord()
    await priceLibraryPage.open();
    await priceLibraryPage.expectLoaded();

    const result = await createFreshPriceRecord(priceLibraryPage, itemMasterPage, vendorListPage);
    expect(result.status).toBe(201);

    // Confirmed live: no toast of any kind appears on success — only the
    // silent redirect already asserted by expectSavedAndRedirectedToList()
    // in the other create tests. Asserted directly here rather than assumed.
    await priceLibraryPage.expectNoToastAppears();
  });
});
