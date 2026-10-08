import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import { UomPage } from '../../../src/pages/master-data/uom.page';

/**
 * Master Data — Unit of Measure.
 *
 * Source of truth for these 11 cases: test-cases/master-data/
 * unit-of-measure/unit-of-measure-testcases.md. No ClickUp test-case
 * tasks exist for this story yet (brand-new coverage, no `allure.tms()`
 * calls). Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed here.
 *
 * `uomPage` is built directly from the `page` fixture rather than a
 * shared `master-data.fixtures.ts` entry — that file is being extended
 * concurrently for `sizePage`/`colorPage`/`uomPage` by another change;
 * once merged, this can switch to destructuring `uomPage` from the test
 * fixture like the other Master Data specs do.
 *
 * Test data: UoM Code is confirmed live to allow only 5 characters — too
 * short for the usual `PW MD UoM ` prefix this repo's other specs use, so
 * throwaway codes here are `PW` + the last 3 digits of the clock (5 chars
 * total, still a recognizable Playwright-owned marker); the longer `PW MD
 * UoM <timestamp>` prefix is used on Description instead, which allows up
 * to 20 characters.
 */
function uniqueCode(): string {
  const digits = String(Date.now()).slice(-3);
  return `PW${digits}`;
}

function uniqueDescription(): string {
  return `PW MD UoM ${String(Date.now()).slice(-6)}`;
}

test.describe('Master Data - Unit of Measure', () => {
  let uomPage: UomPage;
  let page: Page;

  test.beforeEach(async ({ page: pw }) => {
    await allure.epic('Master Data');
    await allure.feature('Unit of Measure');
    await allure.owner('Master Data QA');
    page = pw;
    uomPage = new UomPage(page);
    await uomPage.open();
    // Confirmed live (agent-notes/master-data-module.md): the dev OIDC
    // redirect can take 15-18s to client-side-route to the real target
    // path — waiting here for the real heading avoids every other test
    // racing a page that looks loaded but hasn't actually routed yet.
    await uomPage.expectLoaded();
  });

  test('TC:1 Verify Unit of Measure list screen layout', async () => {
    await uomPage.expectLoaded();
    await expect(uomPage.locators.allTab).toBeVisible();
    await expect(uomPage.locators.activeTab).toBeVisible();
    await expect(uomPage.locators.inactiveTab).toBeVisible();
    await expect(uomPage.locators.searchInput).toBeVisible();
    // Confirmed live: unlike Size/Color Master, there is no bulk "Upload" button here.
    await expect(page.getByRole('button', { name: 'Upload' })).toHaveCount(0);
  });

  test('TC:2 Verify successful UoM creation with valid Code and Description', async () => {
    const code = uniqueCode();
    const description = uniqueDescription();

    await test.step('Create a UoM with Code + Description', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description });
      await uomPage.create();
    });

    await test.step('Toast reads "UoM created." and the row appears', async () => {
      await uomPage.expectCreatedSuccessfully();
      await uomPage.expectRowVisible(code);
    });
  });

  test("TC:3 Verify editing an existing UoM's Description", async () => {
    const code = uniqueCode();
    const description = uniqueDescription();

    await test.step('Create a UoM to edit', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description });
      await uomPage.create();
      await uomPage.expectCreatedSuccessfully();
    });

    await test.step('Change its Description and save', async () => {
      await uomPage.openRow(code);
      await uomPage.fillDescription(`${description} v2`);
      await uomPage.saveChanges();
    });

    await test.step('Toast reads "UoM updated." and the grid reflects the new text', async () => {
      await uomPage.expectUpdatedSuccessfully();
      await uomPage.search(code);
      await expect(page.getByRole('row').filter({ hasText: `${description} v2` })).toBeVisible();
    });
  });

  test('TC:4 Verify Cancel on Edit discards unsaved changes', async () => {
    const code = uniqueCode();
    const description = uniqueDescription();

    await test.step('Create a UoM to edit', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description });
      await uomPage.create();
      await uomPage.expectCreatedSuccessfully();
    });

    await test.step('Change Description then Cancel instead of saving', async () => {
      await uomPage.openRow(code);
      await uomPage.fillDescription('EDITED-NOT-SAVED');
      await uomPage.cancel();
    });

    await test.step('Re-opening shows the original, unedited Description', async () => {
      await uomPage.openRow(code);
      await expect(uomPage.locators.descriptionInput).toHaveValue(description);
    });
  });

  test('TC:5 Verify searching the UoM list by code', async () => {
    const code = uniqueCode();
    const description = uniqueDescription();

    await test.step('Create a UoM to search for', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description });
      await uomPage.create();
      await uomPage.expectCreatedSuccessfully();
    });

    await test.step('Searching by its code narrows the grid to it', async () => {
      await uomPage.search(code);
      await uomPage.expectRowVisible(code);
    });
  });

  test('TC:6 Verify permanently deleting a UoM', async () => {
    const code = uniqueCode();
    const description = uniqueDescription();

    await test.step('Create a throwaway UoM', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description });
      await uomPage.create();
      await uomPage.expectCreatedSuccessfully();
    });

    await test.step('Delete it, confirming the "cannot be undone" dialog', async () => {
      await uomPage.openRow(code);
      await expect(uomPage.locators.deleteButton).toBeVisible();
      await uomPage.locators.deleteButton.click();
      await expect(uomPage.locators.confirmDeleteDialog).toBeVisible();
      await expect(uomPage.locators.confirmDeleteDialog).toContainText(/cannot be undone/i);
      await uomPage.locators.confirmDeleteButton.click();
    });

    // Confirmed live: this is a genuine hard delete, not a soft
    // deactivate — the record is fully gone from the list/search
    // afterward, not merely flagged Inactive. Asserting the REAL current
    // behavior on purpose (see TC:6's note in the .md).
    await test.step('Toast reads "UoM deleted." and the record is fully gone', async () => {
      await uomPage.expectDeletedSuccessfully();
      await uomPage.search(code);
      await uomPage.expectRowNotVisible(code);
    });
  });

  test('TC:7 Verify cancelling the delete confirmation aborts it', async () => {
    const code = uniqueCode();
    const description = uniqueDescription();

    await test.step('Create a UoM', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description });
      await uomPage.create();
      await uomPage.expectCreatedSuccessfully();
    });

    await test.step('Open Delete confirmation then Cancel', async () => {
      await uomPage.openRow(code);
      await uomPage.openDeleteThenCancel();
      // Backing out of the delete confirmation returns to the still-open
      // Edit dialog, not the list — close it too, otherwise the list
      // underneath is `aria-hidden` behind the modal and no row is
      // queryable at all (confirmed live: this was a real gap in the test,
      // not an app bug — easy to miss since "Cancel" only unwinds one
      // dialog layer).
      await uomPage.cancel();
    });

    await test.step('Record remains, unchanged', async () => {
      await uomPage.search(code);
      await uomPage.expectRowVisible(code);
    });
  });

  test('TC:8 Verify UoM Code is a genuinely required field', async () => {
    await uomPage.openNewUom();
    await uomPage.fillDescription(uniqueDescription());

    await uomPage.create();

    await uomPage.expectFieldError('Required');
    await expect(uomPage.locators.uomCodeInput).toBeVisible();
  });

  test('TC:9 Verify Description is a genuinely required field', async () => {
    await uomPage.openNewUom();
    await uomPage.locators.uomCodeInput.fill(uniqueCode());

    await uomPage.create();

    await uomPage.expectFieldError('Required');
    await expect(uomPage.locators.descriptionInput).toBeVisible();
  });

  test('TC:10 Verify duplicate UoM Code is rejected', async () => {
    const code = uniqueCode();

    await test.step('Create a UoM (succeeds)', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description: uniqueDescription() });
      await uomPage.create();
      await uomPage.expectCreatedSuccessfully();
    });

    await test.step('Repeat the exact same Code — blocked', async () => {
      await uomPage.openNewUom();
      await uomPage.fillRequired({ code, description: 'duplicate attempt' });
      await uomPage.create();
    });

    // Known bug/gap, confirmed live (TC:10 in the .md): the API returns a
    // specific 409 uom_conflict reason, but the UI only ever shows this
    // generic toast. Asserting the REAL current behavior on purpose.
    await uomPage.expectCreateFailed();
    await expect(uomPage.locators.formDialog).toBeVisible();
  });

  test('TC:11 Verify UoM Code and Description respect their max-length limits', async () => {
    await uomPage.openNewUom();

    await expect(uomPage.locators.uomCodeInput).toHaveAttribute('maxlength', '5');
    await expect(uomPage.locators.descriptionInput).toHaveAttribute('maxlength', '20');

    await uomPage.locators.uomCodeInput.fill('ABCDEFG');
    await uomPage.locators.descriptionInput.fill('X'.repeat(27));

    await expect(uomPage.locators.uomCodeInput).toHaveValue('ABCDE');
    await expect(uomPage.locators.descriptionInput).toHaveValue('X'.repeat(20));
  });
});
