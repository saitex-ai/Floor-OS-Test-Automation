import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Product Service Value Master screen,
 * /master-data/inventory-item-management/product-service-value-master.
 * Under the "Inventory Item Management" nav group (collapsed by default,
 * distinct from "System Management" — see
 * agent-notes/master-data-module.md). Storage state from auth.setup.ts is
 * already applied via the "master-data" project's dependency — no login
 * needed.
 *
 * Source of truth: test-cases/master-data/product-service-value-master/
 * product-service-value-master-testcases.md — no ClickUp task exists for
 * this module yet, so no allure.tms() links here (same convention as this
 * repo's other no-ClickUp suites).
 *
 * One real, confirmed app bug is deliberately asserted as-is (not worked
 * around) per this repo's established discipline:
 * - TC:12 — the "Active" checkbox is always checked and genuinely disabled
 *   in both Create and Edit; there is no way to deactivate a Product
 *   Service Value anywhere in this UI.
 */
test.describe('Master Data - Product Service Value Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Product Service Value Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    productServiceValueMasterPage,
  }) => {
    const description = `TC-PSVal-Full-${Date.now()}`;

    await test.step('Open Add Value, pick a Product Service, and fill Description', async () => {
      await productServiceValueMasterPage.open();
      await productServiceValueMasterPage.expectLoaded();
      await productServiceValueMasterPage.openAddValue();
      await productServiceValueMasterPage.expectOnAddDialog();
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
    });

    await test.step('Create: toast confirms success', async () => {
      await productServiceValueMasterPage.create();
      await productServiceValueMasterPage.expectCreatedSuccessfully();
    });

    await test.step('The new row is visible on the list with Status Active', async () => {
      await productServiceValueMasterPage.search(description);
      await productServiceValueMasterPage.expectRowVisible(description);
      await productServiceValueMasterPage.expectRowStatus(description, 'Active');
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    productServiceValueMasterPage,
  }) => {
    const description = `TC-PSVal-Min-${Date.now()}`;

    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Pick a Product Service and fill only Description', async () => {
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.create();
    });

    await test.step('Created successfully — the auto-fetched display fields are not independently required', async () => {
      await productServiceValueMasterPage.expectCreatedSuccessfully();
      await productServiceValueMasterPage.search(description);
      await productServiceValueMasterPage.expectRowVisible(description);
    });
  });

  test('TC:3 Verify successful edit of an existing value', async ({
    productServiceValueMasterPage,
  }) => {
    const description = `TC-PSVal-Edit-${Date.now()}`;
    const updatedDescription = `${description}-Updated`;

    await test.step('Create a value to edit', async () => {
      await productServiceValueMasterPage.open();
      await productServiceValueMasterPage.expectLoaded();
      await productServiceValueMasterPage.openAddValue();
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.create();
      await productServiceValueMasterPage.expectCreatedSuccessfully();
    });

    await test.step('Open it, edit the Description, and save', async () => {
      await productServiceValueMasterPage.openEditByValueId(description);
      await productServiceValueMasterPage.fillDescription(updatedDescription);
      await productServiceValueMasterPage.save();
    });

    await test.step('Toast confirms the update; list reflects the new Description', async () => {
      await productServiceValueMasterPage.expectUpdatedSuccessfully();
      await productServiceValueMasterPage.search(updatedDescription);
      await productServiceValueMasterPage.expectRowVisible(updatedDescription);
    });
  });

  test('TC:4 Verify list search by value code, description, or parent service', async ({
    productServiceValueMasterPage,
  }) => {
    const description = `TC-PSVal-Search-${Date.now()}`;

    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();
    await productServiceValueMasterPage.pickProductService();
    await productServiceValueMasterPage.fillDescription(description);
    await productServiceValueMasterPage.create();
    await productServiceValueMasterPage.expectCreatedSuccessfully();

    await test.step('Search by Description narrows to the matching row', async () => {
      await productServiceValueMasterPage.search(description);
      await productServiceValueMasterPage.expectRowVisible(description);
    });
  });

  test('TC:5 Verify All / Active / Inactive tab filters on the list', async ({
    productServiceValueMasterPage,
  }) => {
    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();

    await test.step('Active tab count matches All (no values are ever Inactive — see TC:12)', async () => {
      const allCount = await productServiceValueMasterPage.getAllCount();
      // No literal space in the regex: the tab's label and its count
      // render in separate nested elements with CSS gap, not an actual
      // space character in the combined text content — confirmed live
      // ("Active67", not "Active 67"), same pattern documented on
      // CompanyListPage.getAllCount() elsewhere in this repo.
      await expect(productServiceValueMasterPage.locators.activeTab).toHaveText(
        new RegExp(`^Active\\s*${allCount}$`),
      );
      await expect(productServiceValueMasterPage.locators.inactiveTab).toHaveText(/^Inactive\s*0$/);
    });
  });

  test('TC:6 Verify validation when both required fields are left blank', async ({
    productServiceValueMasterPage,
  }) => {
    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Submit with everything blank', async () => {
      await productServiceValueMasterPage.create();
    });

    await test.step('Save is blocked; both "Required" errors appear; dialog stays open', async () => {
      await productServiceValueMasterPage.expectRequiredErrorCount(2);
      await productServiceValueMasterPage.expectStillOnFormDialog();
    });
  });

  test('TC:7 Verify the "Pick product service" picker — cross-module reference', async ({
    productServiceValueMasterPage,
  }) => {
    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Opening the picker shows a live, searchable table sourced from Product Service Master', async () => {
      await productServiceValueMasterPage.locators.pickProductServiceField.click();
      await expect(productServiceValueMasterPage.locators.productServicePickerDialog).toBeVisible();
      await expect(
        productServiceValueMasterPage.locators.productServicePickerDataRows().first(),
      ).toBeVisible();
    });

    await test.step('Picking a row auto-fills the parent form and closes the picker', async () => {
      await productServiceValueMasterPage.locators.productServicePickerDataRows().first().click();
      await expect(productServiceValueMasterPage.locators.productServicePickerDialog).toBeHidden();
      await expect(productServiceValueMasterPage.locators.pickProductServiceField).not.toHaveValue(
        '',
      );
    });
  });

  test('TC:8 Verify duplicate (same Product Service + same Description) is blocked', async ({
    productServiceValueMasterPage,
  }) => {
    const description = `TC-PSVal-Dup-${Date.now()}`;

    await test.step('Create the first value', async () => {
      await productServiceValueMasterPage.open();
      await productServiceValueMasterPage.expectLoaded();
      await productServiceValueMasterPage.openAddValue();
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.create();
      await productServiceValueMasterPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt a second value under the same Product Service with the exact same Description', async () => {
      await productServiceValueMasterPage.openAddValue();
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.create();
    });

    await test.step('Blocked with a generic toast; dialog stays open with the data intact', async () => {
      await productServiceValueMasterPage.expectCreateFailedDuplicate();
      await productServiceValueMasterPage.expectStillOnFormDialog();
      await expect(productServiceValueMasterPage.locators.descriptionInput).toHaveValue(
        description,
      );
    });
  });

  test('TC:9 Verify Cancel discards changes on create', async ({
    productServiceValueMasterPage,
  }) => {
    const description = `TC-PSVal-Cancel-${Date.now()}`;

    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    const countBefore = await productServiceValueMasterPage.getAllCount();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Fill a Description, then Cancel', async () => {
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.cancel();
    });

    await test.step('No record created; dialog closes; total count unchanged', async () => {
      await expect(productServiceValueMasterPage.locators.formDialog).toBeHidden();
      await productServiceValueMasterPage.search(description);
      await productServiceValueMasterPage.expectRowNotVisible(description);
      await productServiceValueMasterPage.search('');
      expect(await productServiceValueMasterPage.getAllCount()).toBe(countBefore);
    });
  });

  test('TC:10 Verify Description max length (edge)', async ({ productServiceValueMasterPage }) => {
    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Typing 250 characters is silently capped at 200', async () => {
      await productServiceValueMasterPage.fillDescription('A'.repeat(250));
      const value = await productServiceValueMasterPage.getDescriptionValue();
      expect(value).toHaveLength(200);
    });
  });

  test('TC:11 Verify special/unicode characters in Description (edge)', async ({
    productServiceValueMasterPage,
  }) => {
    const description =
      `TC-PSVal-Special-${Date.now()} & Co. <script>alert(1)</script> "quote" 日本語 50%`.slice(
        0,
        200,
      );

    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Fill a picked Product Service and the special-character Description, then create', async () => {
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.create();
    });

    await test.step('No client-side character-set restriction — saves successfully', async () => {
      await productServiceValueMasterPage.expectCreatedSuccessfully();
    });
  });

  test('TC:12 Verify the Active checkbox cannot actually be changed — confirmed bug', async ({
    productServiceValueMasterPage,
  }) => {
    await productServiceValueMasterPage.open();
    await productServiceValueMasterPage.expectLoaded();
    await productServiceValueMasterPage.openAddValue();

    await test.step('Active is always checked and genuinely disabled on Create', async () => {
      expect(await productServiceValueMasterPage.isActiveCheckboxChecked()).toBe(true);
      expect(await productServiceValueMasterPage.isActiveCheckboxDisabled()).toBe(true);
    });

    await test.step('Same on Edit of a real, freshly-created value', async () => {
      const description = `TC-PSVal-ActiveBug-${Date.now()}`;
      await productServiceValueMasterPage.pickProductService();
      await productServiceValueMasterPage.fillDescription(description);
      await productServiceValueMasterPage.create();
      await productServiceValueMasterPage.expectCreatedSuccessfully();

      await productServiceValueMasterPage.openEditByValueId(description);
      expect(await productServiceValueMasterPage.isActiveCheckboxChecked()).toBe(true);
      expect(await productServiceValueMasterPage.isActiveCheckboxDisabled()).toBe(true);
    });
  });
});
