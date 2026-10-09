import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Techpack Type (/master-data/system-management/techpack-types).
 *
 * Source of truth for these 14 cases: test-cases/master-data/techpack-type/techpack-type-testcases.md
 * — first-pass coverage, confirmed live against dev 2026-10-06, nothing
 * carried over from notes. Storage state from auth.setup.ts is already
 * applied via the "master-data" project's dependency — no login needed
 * here.
 *
 * Every created record is prefixed `PW MD TechpackType` + a timestamp, per
 * this repo's existing convention (see CRM's 01-create-customer.spec.ts)
 * of not tearing down throwaway dev data between runs.
 */
test.describe('Master Data - Techpack Type', () => {
  test.beforeEach(async ({ techpackTypePage }) => {
    await allure.epic('Master Data');
    await allure.feature('Techpack Type');
    await allure.owner('Master Data QA');
    await techpackTypePage.open();
    await techpackTypePage.expectLoaded();
  });

  test('TC:1 Verify Techpack Type list layout and tab counts', async ({
    page,
    techpackTypePage,
  }) => {
    await test.step('Tabs, search and table are present', async () => {
      await expect(techpackTypePage.locators.tab('All')).toBeVisible();
      await expect(techpackTypePage.locators.tab('Draft')).toBeVisible();
      await expect(techpackTypePage.locators.tab('Approved')).toBeVisible();
      await expect(techpackTypePage.locators.tab('Inactive')).toBeVisible();
      await expect(techpackTypePage.locators.tab('Rejected')).toBeVisible();
      await expect(techpackTypePage.locators.searchInput).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Code' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'No Demand Validation' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });
  });

  test('TC:2 Verify successful create with all fields (incl. skip demand/forecast validation)', async ({
    techpackTypePage,
  }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} AllFields`;

    await test.step('Create with Code, Name and the checkbox checked', async () => {
      await techpackTypePage.openCreateModal();
      await techpackTypePage.fillForm({ code, name, skipDemandValidation: true });
      await techpackTypePage.create();
    });

    await test.step('Toast reads "Techpack type created"; row shows Yes / Approved', async () => {
      await techpackTypePage.expectCreatedToast();
      await techpackTypePage.expectRowVisible(code);
      await expect(techpackTypePage.locators.row(code)).toContainText('Yes');
      // KNOWN APP BUG (confirmed live): a brand-new record bypasses the
      // Draft/Review workflow entirely and lands directly on Approved,
      // not Draft — asserting the real, current behavior on purpose.
      await techpackTypePage.expectRowStatus(code, 'Approved');
    });
  });

  test('TC:3 Verify successful create with required fields only', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} RequiredOnly`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code, name });
    await techpackTypePage.create();

    await techpackTypePage.expectCreatedToast();
    await techpackTypePage.expectRowVisible(code);
    await expect(techpackTypePage.locators.row(code)).toContainText('No');
    await techpackTypePage.expectRowStatus(code, 'Approved');
  });

  test('TC:4 Verify successful edit of an existing Techpack Type', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const originalName = `PW MD TechpackType ${Date.now()} Original`;
    const editedName = `${originalName} Edited`;

    await test.step('Create a record to edit', async () => {
      await techpackTypePage.openCreateModal();
      await techpackTypePage.fillForm({ code, name: originalName });
      await techpackTypePage.create();
      await techpackTypePage.expectCreatedToast();
    });

    await test.step('Open it, change the Name, save', async () => {
      await techpackTypePage.openRowForEdit(code);
      await techpackTypePage.fillForm({ name: editedName });
      await techpackTypePage.saveChanges();
    });

    await test.step('Toast reads "Techpack type updated"; list reflects the new Name', async () => {
      await techpackTypePage.expectUpdatedToast();
      await techpackTypePage.expectRowVisible(editedName);
    });
  });

  test('TC:5 Verify list search by code or name', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} Searchable`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code, name });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await test.step('Searching the real code/name filters to that row', async () => {
      await techpackTypePage.search(code);
      await techpackTypePage.expectRowVisible(code);
    });

    await test.step('Searching an unmatched term shows the empty state', async () => {
      await techpackTypePage.search('NO-SUCH-TECHPACK-TYPE-CODE-ZZZ');
      await expect(techpackTypePage.locators.emptyState).toBeVisible();
    });
  });

  test('TC:6 Verify deactivating a Techpack Type', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} Deactivate`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code, name });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await test.step("Deactivate via the Edit modal's icon button (no confirmation)", async () => {
      await techpackTypePage.openRowForEdit(code);
      await techpackTypePage.deactivate();
    });

    await test.step('Toast reads "Techpack type deactivated"; row moves to Inactive', async () => {
      await techpackTypePage.expectDeactivatedToast();
      await techpackTypePage.expectRowStatus(code, 'Inactive');
    });
  });

  test('TC:7 Verify deleting a Techpack Type', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} Delete`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code, name });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await test.step('Delete via the Edit modal, confirm on the nested dialog', async () => {
      await techpackTypePage.openRowForEdit(code);
      await techpackTypePage.deleteRecord();
    });

    await test.step('Toast reads "Techpack type deleted"; row is gone', async () => {
      await techpackTypePage.expectDeletedToast();
      await techpackTypePage.search(code);
      await techpackTypePage.expectRowNotVisible(code);
    });
  });

  test('TC:8 Verify Close on the Create modal discards changes', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} ShouldNotSave`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code, name });
    await techpackTypePage.closeDialog();

    await techpackTypePage.search(code);
    await techpackTypePage.expectRowNotVisible(code);
  });

  test('TC:9 Verify mandatory field validation - Code', async ({ techpackTypePage }) => {
    const name = `PW MD TechpackType ${Date.now()} NoCode`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ name });
    await techpackTypePage.create();

    await techpackTypePage.expectRequiredError();
    await expect(techpackTypePage.locators.dialog).toBeVisible(); // save was blocked, still on the form
  });

  test('TC:10 Verify mandatory field validation - Name', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code });
    await techpackTypePage.create();

    await techpackTypePage.expectRequiredError();
    await expect(techpackTypePage.locators.dialog).toBeVisible();
  });

  test('TC:11 Verify duplicate Code is blocked', async ({ techpackTypePage }) => {
    const code = `TCTT${Date.now()}`;
    const firstName = `PW MD TechpackType ${Date.now()} First`;
    const secondName = `PW MD TechpackType ${Date.now()} Second`;

    await test.step('Create the first record with a fresh unique code', async () => {
      await techpackTypePage.openCreateModal();
      await techpackTypePage.fillForm({ code, name: firstName });
      await techpackTypePage.create();
      await techpackTypePage.expectCreatedToast();
    });

    await test.step('Attempt a second record reusing the same Code', async () => {
      await techpackTypePage.openCreateModal();
      await techpackTypePage.fillForm({ code, name: secondName });
      await techpackTypePage.create();
    });

    await test.step('Blocked with the real duplicate-code toast', async () => {
      await techpackTypePage.expectDuplicateCodeError();
      await techpackTypePage.closeDialog();
      await techpackTypePage.search(secondName);
      await techpackTypePage.expectRowNotVisible(secondName);
    });
  });

  test('TC:12 Verify duplicate Name (different Code) is allowed', async ({ techpackTypePage }) => {
    const sharedName = `PW MD TechpackType ${Date.now()} SharedName`;
    const codeA = `TCTTA${Date.now()}`;
    const codeB = `TCTTB${Date.now()}`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code: codeA, name: sharedName });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code: codeB, name: sharedName });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await techpackTypePage.search(sharedName);
    await techpackTypePage.expectRowVisible(codeA);
    await techpackTypePage.expectRowVisible(codeB);
  });

  test('TC:13 Verify Code is normalized to uppercase and max length (30)', async ({
    techpackTypePage,
  }) => {
    const lowerCode = `tctt${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} Lowercase`;

    await techpackTypePage.openCreateModal();
    await expect(techpackTypePage.locators.codeInput).toHaveAttribute('maxlength', '30');

    await techpackTypePage.fillForm({ code: lowerCode, name });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await techpackTypePage.search(name);
    await techpackTypePage.expectRowVisible(lowerCode.toUpperCase());
  });

  test('TC:14 Verify Name accepts special characters and max length (200)', async ({
    techpackTypePage,
  }) => {
    const code = `TCTT${Date.now()}`;
    const specialName = `PW MD TechpackType ${Date.now()} !@#$%^&*()`;

    await techpackTypePage.openCreateModal();
    await expect(techpackTypePage.locators.nameInput).toHaveAttribute('maxlength', '200');
    await techpackTypePage.fillForm({ code, name: specialName });
    await techpackTypePage.create();

    await techpackTypePage.expectCreatedToast();
    await techpackTypePage.search(code);
    await techpackTypePage.expectRowVisible(specialName);
  });

  test('Known bug: an Inactive Techpack Type has no confirmed reactivation path', async ({
    techpackTypePage,
  }) => {
    const code = `TCTT${Date.now()}`;
    const name = `PW MD TechpackType ${Date.now()} NoReactivate`;

    await techpackTypePage.openCreateModal();
    await techpackTypePage.fillForm({ code, name });
    await techpackTypePage.create();
    await techpackTypePage.expectCreatedToast();

    await techpackTypePage.openRowForEdit(code);
    await techpackTypePage.deactivate();
    await techpackTypePage.expectDeactivatedToast();
    await techpackTypePage.expectRowStatus(code, 'Inactive');

    // KNOWN APP BUG (confirmed live): the Edit modal's icon button is
    // always labeled/behaves as "Deactivate <code>", even once the record
    // is already Inactive — clicking it again just re-fires the same
    // deactivate action/toast instead of reactivating. Asserting that
    // real, current (broken) behavior on purpose: the record stays
    // Inactive and the icon's accessible name never flips to "Activate".
    await techpackTypePage.openRowForEdit(code);
    await expect(techpackTypePage.locators.deactivateIconButton).toHaveAccessibleName(
      `Deactivate ${code}`,
    );
    await techpackTypePage.deactivate();
    await techpackTypePage.expectDeactivatedToast();
    await techpackTypePage.expectRowStatus(code, 'Inactive');
  });
});
