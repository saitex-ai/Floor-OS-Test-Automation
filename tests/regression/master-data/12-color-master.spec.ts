import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Color Master.
 *
 * Source of truth for these 12 cases: test-cases/master-data/color-master/
 * color-master-testcases.md. No ClickUp test-case tasks exist for this
 * story yet (brand-new coverage, no `allure.tms()` calls). Storage state
 * from auth.setup.ts is already applied via the "master-data" project's
 * dependency — no login needed here.
 *
 * Unlike Size Master, Color Code/Description are genuine free text, so
 * every throwaway record here is prefixed `PW MD Color ` + a timestamp —
 * safely unique across runs, well inside the confirmed-live 50-char max
 * on Color Code.
 */
function uniqueCode(): string {
  return `PW MD Color ${Date.now()}`;
}

const ITEM_CATEGORY = 'GMT';

test.describe('Master Data - Color Master', () => {
  test.beforeEach(async ({ colorPage }) => {
    await allure.epic('Master Data');
    await allure.feature('Color Master');
    await allure.owner('Master Data QA');
    await colorPage.open();
    // Confirmed live (agent-notes/master-data-module.md): the dev OIDC
    // redirect can take 15-18s to client-side-route to the real target
    // path — waiting here for the real heading avoids every other test
    // racing a page that looks loaded but hasn't actually routed yet.
    await colorPage.expectLoaded();
  });

  test('TC:1 Verify Color Master list screen layout', async ({ colorPage }) => {
    await colorPage.expectLoaded();
    await expect(colorPage.locators.allTab).toBeVisible();
    await expect(colorPage.locators.activeTab).toBeVisible();
    await expect(colorPage.locators.inactiveTab).toBeVisible();
    await expect(colorPage.locators.searchInput).toBeVisible();
  });

  test('TC:2 Verify successful Color creation with all required fields', async ({ colorPage }) => {
    const code = uniqueCode();

    await test.step('Create a Color with Code, Description and Item Category', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} description`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
    });

    await test.step('Toast reads "Color created." and the row appears Active', async () => {
      await colorPage.expectCreatedSuccessfully();
      await colorPage.search(code);
      // Confirmed live: the entered code is stored UPPERCASED server-side.
      await colorPage.expectRowWithTextVisible(code.toUpperCase());
    });
  });

  test("TC:3 Verify editing an existing Color's Description", async ({ colorPage }) => {
    const code = uniqueCode();

    await test.step('Create a Color to edit', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} original`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
      await colorPage.expectCreatedSuccessfully();
    });

    await test.step('Change its Description and save', async () => {
      await colorPage.search(code);
      await colorPage.openRowByText(code.toUpperCase());
      await colorPage.fillDescription(`${code} updated`);
      await colorPage.saveChanges();
    });

    await test.step('Toast reads "Color updated." and the grid reflects the new text', async () => {
      await colorPage.expectUpdatedSuccessfully();
      await colorPage.search(code);
      await colorPage.expectRowWithTextVisible(`${code} updated`);
    });
  });

  test('TC:4 Verify Cancel on Edit discards unsaved changes', async ({ colorPage }) => {
    const code = uniqueCode();

    await test.step('Create a Color to edit', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} original`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
      await colorPage.expectCreatedSuccessfully();
    });

    await test.step('Change Description then Cancel instead of saving', async () => {
      await colorPage.search(code);
      await colorPage.openRowByText(code.toUpperCase());
      await colorPage.fillDescription(`${code} EDITED-NOT-SAVED`);
      await colorPage.cancel();
    });

    await test.step('Re-opening shows the original, unedited Description', async () => {
      await colorPage.search(code);
      await colorPage.openRowByText(code.toUpperCase());
      await expect(colorPage.locators.descriptionInput).toHaveValue(`${code} original`);
    });
  });

  test('TC:5 Verify searching the Color list by code', async ({ colorPage }) => {
    const code = uniqueCode();

    await test.step('Create a Color to search for', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} description`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
      await colorPage.expectCreatedSuccessfully();
    });

    await test.step('Searching by its code narrows the grid to it', async () => {
      await colorPage.search(code);
      await colorPage.expectRowWithTextVisible(code.toUpperCase());
    });
  });

  test('TC:6 Verify deactivating a Color updates its status and the tab counts', async ({
    colorPage,
    page,
  }) => {
    const code = uniqueCode();
    let colorId = '';

    await test.step('Create a throwaway Color', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} description`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
      await colorPage.expectCreatedSuccessfully();
      await colorPage.search(code);
      colorId = await colorPage.colorIdFromRowText(code.toUpperCase());
      expect(colorId).toMatch(/^CMC/);
    });

    await test.step('Deactivate it', async () => {
      await colorPage.openRow(colorId);
      await colorPage.deactivate();
    });

    await test.step('Toast reads "Color deactivated." and the row/tab reflect Inactive', async () => {
      await colorPage.expectDeactivatedSuccessfully();
      await colorPage.search(code);
      expect(await colorPage.rowStatus(colorId)).toBe('Inactive');

      // Confirmed live: unlike Size Master's equivalent action, this one
      // survives a reload correctly.
      await page.reload();
      await colorPage.search(code);
      expect(await colorPage.rowStatus(colorId)).toBe('Inactive');
    });
  });

  test('TC:7 Verify reactivating a deactivated Color', async ({ colorPage }) => {
    const code = uniqueCode();
    let colorId = '';

    await test.step('Create and deactivate a throwaway Color', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} description`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
      await colorPage.expectCreatedSuccessfully();
      await colorPage.search(code);
      colorId = await colorPage.colorIdFromRowText(code.toUpperCase());
      await colorPage.openRow(colorId);
      await colorPage.deactivate();
      await colorPage.expectDeactivatedSuccessfully();
    });

    await test.step('Re-check Status and save — reactivates', async () => {
      await colorPage.search(code);
      await colorPage.openRow(colorId);
      await colorPage.reactivate();
    });

    await test.step('Toast is the generic "Color updated." (no distinct "activated" message) and status flips back', async () => {
      await colorPage.expectUpdatedSuccessfully();
      await colorPage.search(code);
      expect(await colorPage.rowStatus(colorId)).toBe('Active');
    });
  });

  test('TC:8 Verify Color Code is a genuinely required field', async ({ colorPage }) => {
    await colorPage.openNewColor();
    await colorPage.fillDescription('missing code');
    await colorPage.pickItemCategory(ITEM_CATEGORY);

    await colorPage.create();

    await colorPage.expectFieldError('Required');
    await expect(colorPage.locators.colorCodeInput).toBeVisible();
  });

  test('TC:9 Verify Description is a genuinely required field', async ({ colorPage }) => {
    await colorPage.openNewColor();
    await colorPage.locators.colorCodeInput.fill(uniqueCode());
    await colorPage.pickItemCategory(ITEM_CATEGORY);

    await colorPage.create();

    await colorPage.expectFieldError('Required');
    await expect(colorPage.locators.descriptionInput).toBeVisible();
  });

  test('TC:10 Verify Item Category is a genuinely required field', async ({ colorPage }) => {
    const code = uniqueCode();
    await colorPage.openNewColor();
    await colorPage.locators.colorCodeInput.fill(code);
    await colorPage.fillDescription(`${code} description`);

    await colorPage.create();

    await colorPage.expectFieldError('Required');
    await expect(colorPage.locators.itemCategoryPickerButton).toBeVisible();
  });

  test('TC:11 Verify duplicate Color Code within the same Item Category is rejected', async ({
    colorPage,
  }) => {
    const code = uniqueCode();

    await test.step('Create a Color (succeeds)', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} first`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
      await colorPage.expectCreatedSuccessfully();
    });

    await test.step('Repeat the exact same Code + Item Category — blocked', async () => {
      await colorPage.openNewColor();
      await colorPage.fillRequired({
        code,
        description: `${code} duplicate attempt`,
        itemCategory: ITEM_CATEGORY,
      });
      await colorPage.create();
    });

    // Known bug/gap, confirmed live (TC:11 in the .md): the API returns a
    // specific 409 color_conflict reason (naming the exact code +
    // category), but the UI only ever shows this generic toast. Asserting
    // the REAL current behavior on purpose, not the ideal one.
    await colorPage.expectCreateFailed();
    await expect(colorPage.locators.formDialog).toBeVisible();
  });

  test('TC:12 Verify Color Code and Description respect their max-length limits', async ({
    colorPage,
  }) => {
    await colorPage.openNewColor();

    await expect(colorPage.locators.colorCodeInput).toHaveAttribute('maxlength', '50');
    await expect(colorPage.locators.descriptionInput).toHaveAttribute('maxlength', '200');

    await colorPage.locators.colorCodeInput.fill('X'.repeat(60));
    await colorPage.locators.descriptionInput.fill('Y'.repeat(250));

    await expect(colorPage.locators.colorCodeInput).toHaveValue('X'.repeat(50));
    await expect(colorPage.locators.descriptionInput).toHaveValue('Y'.repeat(200));
  });
});
