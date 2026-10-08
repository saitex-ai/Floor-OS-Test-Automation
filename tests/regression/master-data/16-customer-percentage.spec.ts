import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import type { CustomerPercentagePage } from '../../../src/pages/master-data/customer-percentage.page';

/**
 * Master Data — Customer Percentage (System Management).
 *
 * Source of truth for these 15 cases:
 * test-cases/master-data/customer-percentage/customer-percentage-testcases.md.
 * Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed here.
 *
 * Unlike Currency Rate / Currency Rate Buyer, this screen genuinely
 * supports Create/Edit/Delete for the `master-data` test user via an
 * "Add Row"/"Edit Row" modal dialog. Customer is a picker into existing
 * master-customer data (not freeform text), so there's no literal
 * "PW MD CustPct <timestamp>" string to create — the realistic
 * throwaway-but-identifiable stand-in used here is the pre-existing
 * `AutoTest_Customer_1790070729752` (code `CTC0000829`) test customer
 * confirmed live during the original exploration pass, picked by its
 * code (deterministic — searching the picker/grid by code, not the
 * customer's display name, is also exactly what TC:8 is testing).
 * **Every test that creates a row deletes it again before finishing**, so
 * the suite is safe to re-run without accumulating rows or hitting
 * duplicate-combo conflicts between runs — a different Item Type is used
 * per test precisely to keep concurrent/re-run rows from colliding.
 */
const TEST_CUSTOMER_CODE = 'CTC0000829';
const TEST_CUSTOMER_FULL_NAME = 'AutoTest_Customer_1790070729752';

/** Deletes the row matching `rowMatcher`, confirmed via the modal's own confirm dialog, then verifies it's gone after a reload. */
async function deleteRow(
  customerPercentagePage: CustomerPercentagePage,
  rowMatcher: RegExp,
): Promise<void> {
  await customerPercentagePage.open();
  await customerPercentagePage.expectLoaded();
  await customerPercentagePage.search(TEST_CUSTOMER_CODE);
  await customerPercentagePage.openRowForEdit(rowMatcher);
  await customerPercentagePage.clickDeleteIcon();
  await customerPercentagePage.confirmDelete();
  await customerPercentagePage.expectRowDeletedToast();
}

test.describe('Master Data - Customer Percentage', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Customer Percentage');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify screen layout and list load', async ({ customerPercentagePage }) => {
    await test.step('Navigate to Customer Percentage', async () => {
      await customerPercentagePage.open();
    });

    await test.step('Heading, search box, and Add Row button are visible', async () => {
      await customerPercentagePage.expectLoaded();
      await expect(customerPercentagePage.locators.searchInput).toBeVisible();
    });
  });

  test('TC:2 Verify successful creation with all fields filled', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create a row with Item Type + Item Category + all 4 percentages', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Raw Material');
      // Case-sensitive RegExp, not the plain string 'Fabric' — a plain
      // string does a case-INSENSITIVE substring match (confirmed live,
      // see TC:14's comment below) and would ambiguously also match the
      // unrelated "ZFA — FABRIC" category row.
      await customerPercentagePage.pickItemCategory(/Fabric/);
      await customerPercentagePage.fillPercentages({
        cutticket: '3',
        needSheet: '5',
        costSheetInternal: '2',
        costSheetBuyer: '4',
      });
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Persisted correctly after reload', async () => {
      // The grid's Item Category column renders the CODE ("FAB"), not the
      // description ("Fabric") — confirmed live (same shape as the Item
      // Type column showing "RM" rather than "Raw Material").
      await customerPercentagePage.expectPersistedAfterReload(
        TEST_CUSTOMER_CODE,
        /CTC0000829.*RM.*FAB/,
      );
    });

    await test.step('Cleanup', async () => {
      await deleteRow(customerPercentagePage, /CTC0000829.*RM/);
    });
  });

  test('TC:3 Verify successful creation with only required fields', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create a row with only Customer + Item Type', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Chemical');
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Persisted correctly after reload, with no Item Category', async () => {
      await customerPercentagePage.expectPersistedAfterReload(TEST_CUSTOMER_CODE, /CTC0000829.*CH/);
    });

    await test.step('Cleanup', async () => {
      await deleteRow(customerPercentagePage, /CTC0000829.*CH/);
    });
  });

  test('TC:4 Verify validation when both required fields are left blank', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Click Create with Customer and Item Type both unpicked', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.clickCreate();
    });

    await test.step('Save is blocked with 2 inline "Required" errors, dialog stays open', async () => {
      await customerPercentagePage.expectRequiredErrorOnCustomerAndItemType();
      await expect(customerPercentagePage.locators.dialog).toBeVisible();
    });

    await customerPercentagePage.closeDialog();
  });

  test('TC:5 Verify successful edit, including persistence after reload', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create a row to edit', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Fixed Asset');
      await customerPercentagePage.fillPercentages({ cutticket: '0' });
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Edit Cutticket % and Save changes', async () => {
      await customerPercentagePage.open();
      await customerPercentagePage.search(TEST_CUSTOMER_CODE);
      await customerPercentagePage.openRowForEdit(/CTC0000829.*FX/);
      await customerPercentagePage.fillPercentages({ cutticket: '77.25' });
      await customerPercentagePage.clickSaveChanges();
      await customerPercentagePage.expectRowUpdatedToast();
    });

    await test.step('Known UI quirk: assert the new value only after a fresh reload, not immediately', async () => {
      await customerPercentagePage.expectPersistedAfterReload(
        TEST_CUSTOMER_CODE,
        /CTC0000829.*FX.*77\.2500/,
      );
    });

    await test.step('Cleanup', async () => {
      await deleteRow(customerPercentagePage, /CTC0000829.*FX/);
    });
  });

  test('TC:6 Verify Delete flow with confirmation dialog', async ({ customerPercentagePage }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create a row to delete', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Garment Item');
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Open Edit Row, click delete, confirm', async () => {
      await customerPercentagePage.open();
      await customerPercentagePage.search(TEST_CUSTOMER_CODE);
      await customerPercentagePage.openRowForEdit(/CTC0000829.*GI/);
      await customerPercentagePage.clickDeleteIcon();
      await expect(customerPercentagePage.locators.confirmDeleteDialog).toContainText(
        'This permanently deletes',
      );
      await expect(customerPercentagePage.locators.confirmDeleteDialog).toContainText(
        'This action cannot be undone.',
      );
      await customerPercentagePage.confirmDelete();
      await customerPercentagePage.expectRowDeletedToast();
    });

    await test.step('Row is genuinely gone after a reload', async () => {
      await customerPercentagePage.expectNoRowAfterReload(TEST_CUSTOMER_FULL_NAME);
      // (search-by-name itself returns no rows regardless — see TC:8 — so
      // confirm via code instead, expecting GI to be absent specifically)
      await customerPercentagePage.open();
      await customerPercentagePage.search(TEST_CUSTOMER_CODE);
      await expect(customerPercentagePage.locators.row(/GI/)).toHaveCount(0);
    });
  });

  test('TC:7 Verify Delete Cancel preserves the row', async ({ customerPercentagePage }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create a row', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Information Technology');
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Open delete confirmation, then Cancel', async () => {
      await customerPercentagePage.open();
      await customerPercentagePage.search(TEST_CUSTOMER_CODE);
      await customerPercentagePage.openRowForEdit(/CTC0000829.*IT/);
      await customerPercentagePage.clickDeleteIcon();
      await customerPercentagePage.cancelDelete();
      await expect(customerPercentagePage.locators.dialog).toBeVisible();
    });

    await test.step('Row still exists after reload', async () => {
      await customerPercentagePage.closeDialog();
      await customerPercentagePage.expectPersistedAfterReload(TEST_CUSTOMER_CODE, /CTC0000829.*IT/);
    });

    await test.step('Cleanup', async () => {
      await deleteRow(customerPercentagePage, /CTC0000829.*IT/);
    });
  });

  test('TC:8 Verify search works by Customer code but not by Customer name', async ({
    page,
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create a row to search for', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Sewing Material');
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Searching by full Customer name finds nothing', async () => {
      await customerPercentagePage.open();
      await customerPercentagePage.search(TEST_CUSTOMER_FULL_NAME);
      await expect(
        page.getByText('No customer percentage rows yet.', { exact: true }),
      ).toBeVisible();
    });

    await test.step('Searching by Customer code finds the row', async () => {
      await customerPercentagePage.search(TEST_CUSTOMER_CODE);
      await expect(customerPercentagePage.locators.row(/SM/)).toBeVisible();
    });

    await test.step('Cleanup', async () => {
      await deleteRow(customerPercentagePage, /CTC0000829.*SM/);
    });
  });

  test('TC:9 Verify duplicate Customer + Item Type is rejected', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create the first row', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Medical');
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Second create for the same Customer + Item Type fails', async () => {
      await customerPercentagePage.open();
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Medical');
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectCouldNotCreateToast();
      // Dialog stays open with entered values intact, confirmed live.
      await expect(customerPercentagePage.locators.dialog).toBeVisible();
    });

    await test.step('Cleanup', async () => {
      await customerPercentagePage.closeDialog();
      await deleteRow(customerPercentagePage, /CTC0000829.*MD/);
    });
  });

  test('TC:10 Verify negative percentage values are rejected', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();
    await customerPercentagePage.openAddRow();
    await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
    await customerPercentagePage.pickItemType('Welfare');

    await test.step('Entering -5 blocks submission via native min=0 validation', async () => {
      await customerPercentagePage.fillPercentages({ cutticket: '-5' });
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectInputInvalid(
        customerPercentagePage.locators.cutticketInput,
      );
      const message = await customerPercentagePage.getNativeValidationMessage(
        customerPercentagePage.locators.cutticketInput,
      );
      expect(message).toContain('greater than or equal to 0');
      await expect(customerPercentagePage.locators.dialog).toBeVisible();
    });

    await customerPercentagePage.closeDialog();
  });

  test('TC:11 Verify percentage values over 100 are rejected', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();
    await customerPercentagePage.openAddRow();
    await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
    await customerPercentagePage.pickItemType('Stationery');

    await test.step('Entering 150 blocks submission via native max=100 validation — correct, not a bug', async () => {
      await customerPercentagePage.fillPercentages({ cutticket: '150' });
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectInputInvalid(
        customerPercentagePage.locators.cutticketInput,
      );
      const message = await customerPercentagePage.getNativeValidationMessage(
        customerPercentagePage.locators.cutticketInput,
      );
      expect(message).toContain('less than or equal to 100');
      await expect(customerPercentagePage.locators.dialog).toBeVisible();
    });

    await customerPercentagePage.closeDialog();
  });

  test('TC:12 Verify decimal precision is capped at 2 decimal places', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();
    await customerPercentagePage.openAddRow();
    await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
    await customerPercentagePage.pickItemType('Maintenance');

    await test.step('Entering 12.34567 blocks submission via native step=0.01 validation', async () => {
      await customerPercentagePage.fillPercentages({ cutticket: '12.34567' });
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectInputInvalid(
        customerPercentagePage.locators.cutticketInput,
      );
      const message = await customerPercentagePage.getNativeValidationMessage(
        customerPercentagePage.locators.cutticketInput,
      );
      expect(message).toMatch(/12\.34/);
      await expect(customerPercentagePage.locators.dialog).toBeVisible();
    });

    await customerPercentagePage.closeDialog();
  });

  test('TC:13 Verify 0 is a valid value for all four percentage fields', async ({
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Create with all four percentages = 0', async () => {
      await customerPercentagePage.openAddRow();
      await customerPercentagePage.pickCustomer(TEST_CUSTOMER_CODE);
      await customerPercentagePage.pickItemType('Production Consumable');
      await customerPercentagePage.fillPercentages({
        cutticket: '0',
        needSheet: '0',
        costSheetInternal: '0',
        costSheetBuyer: '0',
      });
      await customerPercentagePage.clickCreate();
      await customerPercentagePage.expectRowCreatedToast();
    });

    await test.step('Cleanup', async () => {
      await deleteRow(customerPercentagePage, /CTC0000829.*PC/);
    });
  });

  test('TC:14 Verify Item Category picker is scoped to the picked Item Type', async ({
    page,
    customerPercentagePage,
  }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();
    await customerPercentagePage.openAddRow();

    await test.step('Pick Item Type "Raw Material", then open Item Category', async () => {
      await customerPercentagePage.locators.itemTypeField.click();
      await customerPercentagePage.locators.pickerRow('Raw Material').first().click();
      await customerPercentagePage.locators.itemCategoryField.click();
    });

    await test.step('Only RM-scoped categories are listed (5 of 5)', async () => {
      await expect(page.getByText('scoped to the picked Item Type')).toBeVisible();
      // pickerRow('Fabric') (a plain string) does a case-INSENSITIVE
      // substring match (Playwright's hasText behavior for strings),
      // which also matches the unrelated "ZFA — FABRIC" row — confirmed
      // live (strict-mode violation: 2 rows). A case-sensitive RegExp
      // (no /i/ flag) disambiguates "Fabric" from "FABRIC".
      await expect(customerPercentagePage.locators.pickerRow(/Fabric/)).toBeVisible();
      await expect(customerPercentagePage.locators.pickerRow('Pocketing')).toBeVisible();
      await expect(page.getByText('Showing 1-5 of 5')).toBeVisible();
    });

    await page.keyboard.press('Escape');
    await customerPercentagePage.closeDialog();
  });

  test('TC:15 Verify Export CSV', async ({ page, customerPercentagePage }) => {
    await customerPercentagePage.open();
    await customerPercentagePage.expectLoaded();

    await test.step('Export CSV triggers a download named customer-consumption-percentages.csv', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        customerPercentagePage.clickExportCsv(),
      ]);
      expect(download.suggestedFilename()).toBe('customer-consumption-percentages.csv');
    });
  });
});
