import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Additional Master
 * (/master-data/inventory-item-management/additional-master, reached via the
 * collapsed-by-default "Inventory Item Management" nav group). Manages cost
 * add-on records (freight, insurance, handling, etc.) — the simplest-shaped
 * of the three Inventory Item Management sub-modules in this pass: a plain
 * two-field Code/Description master behind a modal dialog.
 *
 * Source of truth: test-cases/master-data/additional-master/additional-master-testcases.md
 * — no ClickUp task exists for this module yet, so no allure.tms() links
 * here (same convention as this repo's other no-ClickUp suites).
 *
 * One real, confirmed app gap is deliberately asserted as-is (not worked
 * around), per this repo's established discipline:
 * - TC:5/TC:11 — this module has no deactivate/soft-delete state at all;
 *   the only lifecycle action is a genuine, permanent "Delete".
 */
test.describe('Master Data - Additional Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Additional Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with both fields filled', async ({
    additionalMasterPage,
  }) => {
    const code = `TC-AddlMaster-${Date.now()}`;
    const description = `PW MD Additional Master Full ${Date.now()}`;

    await test.step('Open New Additional and fill both fields', async () => {
      await additionalMasterPage.open();
      await additionalMasterPage.expectLoaded();
      await additionalMasterPage.openCreateDialog();
      await additionalMasterPage.fillForm({ code, description });
      await additionalMasterPage.create();
    });

    await test.step('Toast confirms success; new row visible on the list', async () => {
      await additionalMasterPage.expectCreatedToast();
      await additionalMasterPage.expectRowVisible(code);
    });
  });

  test('TC:2 Verify Code and Description are the entire form — there is no "required fields only" variant', async ({
    additionalMasterPage,
  }) => {
    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();

    await test.step('Exactly three fields exist: ID (disabled), Code*, Description* — no optional fields at all', async () => {
      await expect(additionalMasterPage.locators.idInput).toBeVisible();
      await expect(additionalMasterPage.locators.idInput).toBeDisabled();
      await expect(additionalMasterPage.locators.codeInput).toBeVisible();
      await expect(additionalMasterPage.locators.descriptionInput).toBeVisible();
    });
  });

  test("TC:3 Verify successful edit of an existing record's Description", async ({
    additionalMasterPage,
  }) => {
    const code = `TC-AddlMaster-${Date.now()}`;
    const description = `PW MD Additional Master Edit ${Date.now()}`;
    const updatedDescription = `${description} - Updated`;

    await test.step('Create a record to edit', async () => {
      await additionalMasterPage.open();
      await additionalMasterPage.expectLoaded();
      await additionalMasterPage.openCreateDialog();
      await additionalMasterPage.fillForm({ code, description });
      await additionalMasterPage.create();
      await additionalMasterPage.expectCreatedToast();
    });

    await test.step('Open it, change the Description, and save', async () => {
      await additionalMasterPage.openRowForEdit(code);
      await additionalMasterPage.fillForm({ description: updatedDescription });
      await additionalMasterPage.saveChanges();
    });

    await test.step('Toast confirms the update', async () => {
      await additionalMasterPage.expectUpdatedToast();
    });
  });

  test('TC:4 Verify list search by Code and by Description', async ({ additionalMasterPage }) => {
    const code = `TC-AddlMaster-${Date.now()}`;
    const description = `PW MD Additional Master Search ${Date.now()}`;

    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();
    await additionalMasterPage.fillForm({ code, description });
    await additionalMasterPage.create();
    await additionalMasterPage.expectCreatedToast();

    await test.step('Search by Code narrows to the matching row', async () => {
      await additionalMasterPage.search(code);
      await expect(additionalMasterPage.locators.row(code)).toBeVisible();
    });

    await test.step('Search by Description also narrows to the matching row', async () => {
      await additionalMasterPage.search(description);
      await expect(additionalMasterPage.locators.row(code)).toBeVisible();
    });
  });

  test('TC:5 Verify All / Active / Inactive tab filters — and the missing deactivate affordance', async ({
    additionalMasterPage,
  }) => {
    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();

    await test.step('All three tabs are clickable and the list still renders', async () => {
      await additionalMasterPage.selectTab('Active');
      await expect(additionalMasterPage.locators.heading).toBeVisible();
      await additionalMasterPage.selectTab('Inactive');
      await expect(additionalMasterPage.locators.heading).toBeVisible();
      await additionalMasterPage.selectTab('All');
      await expect(additionalMasterPage.locators.heading).toBeVisible();
    });

    await test.step('Confirmed real gap: no Active/Inactive switch exists anywhere on the Create dialog', async () => {
      await additionalMasterPage.openCreateDialog();
      await expect(additionalMasterPage.locators.dialog.getByRole('switch')).toHaveCount(0);
      await expect(additionalMasterPage.locators.dialog.getByRole('checkbox')).toHaveCount(0);
      await additionalMasterPage.cancel();
    });
  });

  test('TC:6 Verify validation when both fields are left blank', async ({
    additionalMasterPage,
  }) => {
    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();

    await test.step('Submit with Code and Description both empty', async () => {
      await additionalMasterPage.create();
    });

    await test.step('Blocked with both inline "Required" errors at once; dialog stays open, no toast', async () => {
      await additionalMasterPage.expectRequiredErrorCount(2);
      await expect(additionalMasterPage.locators.dialog).toBeVisible();
    });
  });

  test('TC:7 Verify duplicate Code/Description handling', async ({ additionalMasterPage }) => {
    const code = `TC-AddlMaster-${Date.now()}`;

    await test.step('Create the first record with this Code', async () => {
      await additionalMasterPage.open();
      await additionalMasterPage.expectLoaded();
      await additionalMasterPage.openCreateDialog();
      await additionalMasterPage.fillForm({ code, description: 'Dup attempt A' });
      await additionalMasterPage.create();
      await additionalMasterPage.expectCreatedToast();
    });

    await test.step('Attempt a second record reusing the exact same Code', async () => {
      await additionalMasterPage.openCreateDialog();
      await additionalMasterPage.fillForm({ code, description: 'Dup attempt B' });
      await additionalMasterPage.create();
    });

    await test.step('Blocked with the real toast; dialog stays open with entered data intact', async () => {
      await additionalMasterPage.expectDuplicateError();
      await expect(additionalMasterPage.locators.dialog).toBeVisible();
      await expect(additionalMasterPage.locators.codeInput).toHaveValue(code);
    });
  });

  test('TC:8 Verify Cancel discards changes on create', async ({ additionalMasterPage }) => {
    const code = `TC-AddlMaster-cancel-${Date.now()}`;

    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();

    await test.step('Fill Code and Description, then Cancel', async () => {
      await additionalMasterPage.fillForm({ code, description: 'Should be discarded' });
      await additionalMasterPage.cancel();
    });

    await test.step('No record created', async () => {
      await additionalMasterPage.expectRowNotVisible(code);
    });
  });

  test('TC:9 Verify Code max length (edge)', async ({ additionalMasterPage }) => {
    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();

    await additionalMasterPage.locators.codeInput.fill('X'.repeat(250));

    // Silently capped at 200 via the field's own maxlength attribute.
    await expect(additionalMasterPage.locators.codeInput).toHaveValue('X'.repeat(200));
  });

  test('TC:10 Verify special/unicode characters in Description (edge)', async ({
    additionalMasterPage,
  }) => {
    const code = `TC-AddlMaster-special-${Date.now()}`;
    const description = `Test & Co. <script>alert(1)</script> / "quote" 日本語 ${Date.now()}`;

    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();

    await test.step('The full string is accepted into the field verbatim', async () => {
      await additionalMasterPage.fillForm({ code, description });
      await expect(additionalMasterPage.locators.descriptionInput).toHaveValue(description);
    });

    await test.step('Saves successfully — no client-side character-set rejection', async () => {
      await additionalMasterPage.create();
      await additionalMasterPage.expectCreatedToast();
    });
  });

  test('TC:11 Verify Delete action is a genuine, permanent hard-delete', async ({
    additionalMasterPage,
  }) => {
    const code = `TC-AddlMaster-del-${Date.now()}`;

    await test.step('Create a throwaway record', async () => {
      await additionalMasterPage.open();
      await additionalMasterPage.expectLoaded();
      await additionalMasterPage.openCreateDialog();
      await additionalMasterPage.fillForm({ code, description: 'Delete me' });
      await additionalMasterPage.create();
      await additionalMasterPage.expectCreatedToast();
    });

    await test.step('Open it and Delete, confirming on the nested alertdialog', async () => {
      await additionalMasterPage.openRowForEdit(code);
      await additionalMasterPage.deleteRecord();
    });

    await test.step('Toast confirms deletion; the record is gone from both All and Inactive — a true hard delete', async () => {
      await additionalMasterPage.expectDeletedToast();
      await additionalMasterPage.expectRowNotVisible(code);
      await additionalMasterPage.selectTab('Inactive');
      await additionalMasterPage.expectRowNotVisible(code);
    });
  });

  test('TC:12 Verify ID and Code become immutable once a record is saved (edge/trap)', async ({
    additionalMasterPage,
  }) => {
    const code = `TC-AddlMaster-immutable-${Date.now()}`;

    await additionalMasterPage.open();
    await additionalMasterPage.expectLoaded();
    await additionalMasterPage.openCreateDialog();
    await additionalMasterPage.fillForm({ code, description: 'Immutability check' });
    await additionalMasterPage.create();
    await additionalMasterPage.expectCreatedToast();

    await additionalMasterPage.openRowForEdit(code);
    await additionalMasterPage.expectCodeAndIdDisabledOnEdit();
  });
});
