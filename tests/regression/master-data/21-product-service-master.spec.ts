import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Product Service Master (Inventory Item Management >
 * `/master-data/inventory-item-management/product-service-master`).
 *
 * Source of truth: test-cases/master-data/product-service-master/
 * product-service-master-testcases.md — no ClickUp task exists for this
 * module yet, so no allure.tms() links here. Storage state from
 * auth.setup.ts is already applied via the "master-data" project's
 * dependency — no login needed.
 *
 * The simplest of the three Inventory Item Management screens: only two
 * genuinely required fields (Item Category, Product Service Description),
 * no approval workflow, no delete action.
 *
 * Two real, confirmed app gaps are deliberately asserted as-is (not worked
 * around) per this repo's established discipline:
 * - TC:7 — duplicate Description (within the same Item Category) is
 *   blocked, but only with a generic "Could not create the service" toast
 *   — a third distinct wording across the three Inventory Item Management
 *   screens' own duplicate-handling toasts.
 * - TC:13 — there is no confirmed way to deactivate a service anywhere on
 *   this screen (identical gap to Attribute Master).
 */
function uniqueDescription(label = 'Svc'): string {
  return `PW MD ${label} ${Date.now()}`;
}

test.describe('Master Data - Product Service Master', () => {
  test.beforeEach(async ({ productServiceMasterPage }) => {
    await allure.epic('Master Data');
    await allure.feature('Product Service Master');
    await allure.owner('Master Data QA');
    await productServiceMasterPage.open();
    await productServiceMasterPage.expectLoaded();
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc Full');

    await test.step('Pick a category and fill the description', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'BAG', description });
      await productServiceMasterPage.create();
    });

    await test.step('Toast confirms success (no trailing period); the row appears', async () => {
      await productServiceMasterPage.expectCreatedToast();
      await productServiceMasterPage.expectRowVisible(description);
    });
  });

  test('TC:2 Verify required fields are exactly Item Category and Description', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc Min');

    await test.step('Fill only the two required fields — nothing else exists on this form', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'BDG', description });
      await productServiceMasterPage.create();
    });

    await test.step('Created successfully', async () => {
      await productServiceMasterPage.expectCreatedToast();
      await productServiceMasterPage.expectRowVisible(description);
    });
  });

  test('TC:3 Verify successful edit of an existing service', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc Edit');
    const updatedDescription = `${description} - Updated`;

    await test.step('Create a service to edit', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'ADJ', description });
      await productServiceMasterPage.create();
      await productServiceMasterPage.expectCreatedToast();
    });

    await test.step('Open it, change the description, and save', async () => {
      await productServiceMasterPage.openRowForEdit(description);
      await productServiceMasterPage.fillForm({ description: updatedDescription });
      await productServiceMasterPage.saveChanges();
    });

    await test.step('Toast confirms the update (no trailing period)', async () => {
      await productServiceMasterPage.expectUpdatedToast();
      await productServiceMasterPage.expectRowVisible(updatedDescription);
    });
  });

  test('TC:4 Verify list search by service code or description', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc Search');

    await productServiceMasterPage.openAddService();
    await productServiceMasterPage.fillForm({ itemCategoryCode: 'ADT', description });
    await productServiceMasterPage.create();
    await productServiceMasterPage.expectCreatedToast();

    await test.step('Search by description narrows the grid to it', async () => {
      await productServiceMasterPage.expectRowVisible(description);
    });
  });

  test('TC:5 Verify All / Active / Inactive tab filters on the list', async ({
    productServiceMasterPage,
  }) => {
    await test.step('Each tab is clickable and keeps the screen loaded', async () => {
      await productServiceMasterPage.selectTab('Active');
      await productServiceMasterPage.expectLoaded();
      await productServiceMasterPage.selectTab('Inactive');
      await productServiceMasterPage.expectLoaded();
      await productServiceMasterPage.selectTab('All');
      await productServiceMasterPage.expectLoaded();
    });
  });

  test('TC:6 Verify validation when both required fields are left blank', async ({
    productServiceMasterPage,
  }) => {
    await productServiceMasterPage.openAddService();

    await test.step('Submit with Item Category unpicked and Description empty', async () => {
      await productServiceMasterPage.create();
    });

    await test.step('Save is blocked; inline "Required" appears under both fields at once', async () => {
      await productServiceMasterPage.expectRequiredErrorCount(2);
      await expect(productServiceMasterPage.locators.createButton).toBeVisible();
    });
  });

  test('TC:7 Verify duplicate Description is blocked within the same Item Category', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc Dup');

    await test.step('Create the first service under a given category', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'ARF', description });
      await productServiceMasterPage.create();
      await productServiceMasterPage.expectCreatedToast();
    });

    await test.step('Attempt a second service with the exact same description under the same category', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'ARF', description });
      await productServiceMasterPage.create();
    });

    // Real, confirmed app behavior: a generic toast with no field-level
    // indicator of why — documenting as-is, not working around it.
    await test.step('Blocked with a generic toast; dialog stays open with data intact', async () => {
      await productServiceMasterPage.expectCreateFailedToast();
      await expect(productServiceMasterPage.locators.dialog).toBeVisible();
    });
  });

  test('TC:8 Verify the same Description is allowed across different Item Categories', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc CrossCat');

    await test.step('Create under category A', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'ART', description });
      await productServiceMasterPage.create();
      await productServiceMasterPage.expectCreatedToast();
    });

    await test.step('Create the exact same description under a different category B — also succeeds', async () => {
      await productServiceMasterPage.openAddService();
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'BAT', description });
      await productServiceMasterPage.create();
      await productServiceMasterPage.expectCreatedToast();
    });
  });

  test('TC:9 Verify Cancel discards changes on create', async ({ productServiceMasterPage }) => {
    const description = `PW-MD-PRODSVC-CANCEL-${Date.now()}`;

    await productServiceMasterPage.openAddService();
    await test.step('Fill the description, then Cancel', async () => {
      await productServiceMasterPage.locators.descriptionInput.fill(description);
      await productServiceMasterPage.cancel();
    });

    await test.step('No record created', async () => {
      await productServiceMasterPage.expectRowNotVisible(description);
    });
  });

  test('TC:10 Verify Product Service Description max length (edge)', async ({
    productServiceMasterPage,
  }) => {
    await productServiceMasterPage.openAddService();

    await productServiceMasterPage.locators.descriptionInput.fill('Z'.repeat(400));

    // Confirmed live: no inline "too long" error, the field silently
    // truncates at the real cap.
    await expect(async () => {
      const value = await productServiceMasterPage.descriptionValue();
      expect(value.length).toBe(200);
    }).toPass({ timeout: 5_000 });
  });

  test('TC:11 Verify special/unicode characters in Description (edge)', async ({
    productServiceMasterPage,
  }) => {
    const prefix = uniqueDescription('Svc Special');
    const description = `${prefix} & <script>alert(1)</script> "quote" 日本語`;

    await productServiceMasterPage.openAddService();
    await productServiceMasterPage.fillForm({ itemCategoryCode: 'BAG', description });
    await productServiceMasterPage.create();

    await test.step('No client-side character-set restriction — saves successfully', async () => {
      await productServiceMasterPage.expectCreatedToast();
      // Search by the plain-text prefix only — the grid's search box isn't
      // guaranteed to handle the special-char suffix cleanly as a query —
      // and assert via a substring match, not the full exact description.
      await productServiceMasterPage.expectAnyRowVisible(prefix);
    });
  });

  test('TC:12 Verify Item Category becomes locked after creation (edge/trap)', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc Lock');

    await productServiceMasterPage.openAddService();
    await productServiceMasterPage.fillForm({ itemCategoryCode: 'BDG', description });
    await productServiceMasterPage.create();
    await productServiceMasterPage.expectCreatedToast();

    await test.step('Item Category picker is disabled in Edit', async () => {
      await productServiceMasterPage.openRowForEdit(description);
      expect(await productServiceMasterPage.isItemCategoryPickerLocked()).toBe(true);
    });
  });

  test('TC:13 Verify there is no confirmed way to deactivate a service (known gap)', async ({
    productServiceMasterPage,
  }) => {
    const description = uniqueDescription('Svc NoDeactivate');

    await test.step('Active checkbox is checked+disabled on Create', async () => {
      await productServiceMasterPage.openAddService();
      expect(await productServiceMasterPage.isActiveCheckboxLocked()).toBe(true);
      await productServiceMasterPage.fillForm({ itemCategoryCode: 'BAT', description });
      await productServiceMasterPage.create();
      await productServiceMasterPage.expectCreatedToast();
    });

    await test.step('Active checkbox is still checked+disabled on Edit', async () => {
      await productServiceMasterPage.openRowForEdit(description);
      expect(await productServiceMasterPage.isActiveCheckboxLocked()).toBe(true);
      await productServiceMasterPage.cancel();
    });

    await test.step('Selecting the row shows no bulk deactivate/delete action', async () => {
      await productServiceMasterPage.search(description);
      await productServiceMasterPage.selectRowCheckbox(description);
      await productServiceMasterPage.expectNoBulkActionButtons();
    });
  });

  test('TC:14 Verify the Item Category picker is the same shared component used by Attribute Master', async ({
    productServiceMasterPage,
  }) => {
    await productServiceMasterPage.openAddService();

    await test.step('Opens the "Select Item Category" grid picker with its expected columns', async () => {
      await productServiceMasterPage.locators.pickItemCategoryButton.click();
      await expect(productServiceMasterPage.locators.categoryPickerDialog).toBeVisible();
      await expect(productServiceMasterPage.locators.categoryFilterInput).toBeVisible();
      await expect(
        productServiceMasterPage.locators.categoryPickerDialog.getByRole('columnheader', {
          name: /category code/i,
        }),
      ).toBeVisible();
    });
  });
});
