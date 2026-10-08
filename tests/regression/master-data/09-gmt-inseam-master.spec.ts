import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import { GmtInseamPage } from '../../../src/pages/master-data/gmt-inseam.page';

/**
 * Master Data — GMT Inseam Master.
 *
 * Source of truth for these 12 cases: test-cases/master-data/gmt-inseam-master/gmt-inseam-master-testcases.md.
 * No ClickUp test-case tasks exist for this story (first-ever coverage for
 * this screen). Storage state from auth.setup.ts is already applied via
 * the "master-data" project's dependency — no login needed here.
 *
 * `gmtInseamPage` is not registered on the shared master-data fixtures
 * yet (another agent owns that file) — constructed directly from the
 * `page` fixture here instead. See this session's report for the exact
 * fixture entry to add once that merge lands.
 *
 * Every TC in the source .md is exercisable live — unlike Vendor Master,
 * there is no status-change/deactivate flow documented for this screen at
 * all (confirmed live: no Approve/Deactivate row actions, no hidden
 * Status column), so there's nothing to test.fixme() here.
 */

/** Inseam Code is capped at 5 characters (confirmed live, maxlength="5") — keep generated codes within that. */
function uniqueCode5(): string {
  return String(Date.now()).slice(-5);
}

test.describe('Master Data - GMT Inseam Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('GMT Inseam Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify GMT Inseam Master list layout', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);

    await test.step('Navigate to GMT Inseam Master', async () => {
      await inseamPage.open();
    });

    await test.step('Heading, status tabs, search, and "New Inseam" are visible', async () => {
      await inseamPage.expectLoaded();
      await expect(page.getByRole('button', { name: /^All \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Draft \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Approved \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Inactive \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Rejected \d+$/ })).toBeVisible();
      await expect(inseamPage.locators.searchInput).toBeVisible();
    });
  });

  test('TC:2 Verify successful inseam creation with both fields filled', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const code = uniqueCode5();
    const description = `PW MD Inseam ${Date.now()}`;

    await inseamPage.open();

    await test.step('Create a new inseam with Code + Description', async () => {
      await inseamPage.openNew();
      await inseamPage.fillRequired({ code, description });
      await inseamPage.create();
    });

    await test.step('Toast reads "Inseam created." and the row appears on the list', async () => {
      await inseamPage.expectCreatedSuccessfully();
      await inseamPage.expectDialogClosed();
      await inseamPage.search(code);
      await inseamPage.expectRowVisible(code);
    });
  });

  test('TC:3 Verify validation when both fields are left blank', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    await inseamPage.open();
    await inseamPage.openNew();

    await test.step('Click Create with both fields blank', async () => {
      await inseamPage.create();
    });

    await test.step('Both fields show an inline "Required" error', async () => {
      await inseamPage.expectRequiredError('code');
      await inseamPage.expectRequiredError('description');
    });
  });

  test('TC:4 Verify Inseam Code is required', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    await inseamPage.open();
    await inseamPage.openNew();

    await test.step('Fill only Description, leave Inseam Code blank', async () => {
      await inseamPage.fillRequired({ description: 'Description only' });
      await inseamPage.create();
    });

    await test.step('"Required" appears under Inseam Code only', async () => {
      await inseamPage.expectRequiredError('code');
    });
  });

  test('TC:5 Verify Description is required', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    await inseamPage.open();
    await inseamPage.openNew();

    await test.step('Fill only Inseam Code, leave Description blank', async () => {
      await inseamPage.fillRequired({ code: uniqueCode5() });
      await inseamPage.create();
    });

    await test.step('"Required" appears under Description only', async () => {
      await inseamPage.expectRequiredError('description');
    });
  });

  test('TC:6 Verify successful inseam edit', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const code = uniqueCode5();
    const editedDescription = `PW MD Inseam Edited ${Date.now()}`;

    await test.step('Create a throwaway inseam to edit', async () => {
      await inseamPage.open();
      await inseamPage.openNew();
      await inseamPage.fillRequired({ code, description: `PW MD Inseam ${Date.now()}` });
      await inseamPage.create();
      await inseamPage.expectCreatedSuccessfully();
    });

    await test.step('Open Edit Inseam and change the Description', async () => {
      await inseamPage.search(code);
      await inseamPage.openEdit(code);
      await inseamPage.fillRequired({ description: editedDescription });
      await inseamPage.save();
    });

    await test.step('Toast reads "Inseam updated." and the list reflects the new description', async () => {
      await inseamPage.expectUpdatedSuccessfully();
      await inseamPage.search(code);
      await inseamPage.expectRowVisible(editedDescription);
    });
  });

  test('TC:7 Verify Inseam Code is locked on edit', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const code = uniqueCode5();

    await inseamPage.open();
    await inseamPage.openNew();
    await inseamPage.fillRequired({ code, description: `PW MD Inseam ${Date.now()}` });
    await inseamPage.create();
    await inseamPage.expectCreatedSuccessfully();

    await test.step('Reopen the inseam for editing', async () => {
      await inseamPage.search(code);
      await inseamPage.openEdit(code);
    });

    await test.step('Inseam Code is disabled', async () => {
      await inseamPage.expectCodeFieldDisabled();
    });
  });

  test('TC:8 Verify Cancel discards changes', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const code = uniqueCode5();

    await inseamPage.open();

    await test.step('Open New Inseam, fill a value, then Cancel', async () => {
      await inseamPage.openNew();
      await inseamPage.fillRequired({ code, description: 'Should not persist' });
      await inseamPage.cancel();
    });

    await test.step('Dialog closes and no record was created', async () => {
      await inseamPage.expectDialogClosed();
      await inseamPage.search(code);
      await expect(inseamPage.locators.row(code)).toHaveCount(0);
    });
  });

  test('TC:9 Verify duplicate Inseam Code is blocked with a specific message', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const code = uniqueCode5();

    await test.step('Create an inseam to collide with', async () => {
      await inseamPage.open();
      await inseamPage.openNew();
      await inseamPage.fillRequired({ code, description: `PW MD Inseam Dup Source ${Date.now()}` });
      await inseamPage.create();
      await inseamPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt to create a second inseam with the exact same code', async () => {
      await inseamPage.openNew();
      await inseamPage.fillRequired({ code, description: 'Duplicate attempt' });
      await inseamPage.create();
    });

    await test.step('Save is blocked with a specific, actionable toast; dialog stays open', async () => {
      await inseamPage.expectDuplicateCodeError();
      await expect(inseamPage.locators.dialog).toBeVisible();
    });
  });

  test('TC:10 Edge: Inseam Code has a 5-character limit and accepts any text', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    // A fixed literal like "123456789" would truncate to the same "12345"
    // every run, colliding with the previous run's own leftover record
    // (there is no delete flow for this master — confirmed live, see the
    // module's test-case notes). Keeping the unique part in the first 5
    // characters (then padding) means the *stored, truncated* code is
    // fresh every run while still exercising a >5-character input.
    const longCode = `${uniqueCode5()}XXXX`;

    await inseamPage.open();
    await inseamPage.openNew();

    await test.step('Enter a 9-character code', async () => {
      await inseamPage.fillRequired({ code: longCode, description: `PW MD Inseam MaxCode ${Date.now()}` });
    });

    await test.step('Input is capped at 5 characters', async () => {
      const value = await inseamPage.locators.codeInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(5);
    });

    await test.step('The truncated code still saves successfully', async () => {
      await inseamPage.create();
      await inseamPage.expectCreatedSuccessfully();
    });
  });

  test('TC:11 Edge: Description has a 50-character limit', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const longDescription = 'D'.repeat(60);

    await inseamPage.open();
    await inseamPage.openNew();

    await test.step('Enter a 60-character description', async () => {
      await inseamPage.fillRequired({ code: uniqueCode5(), description: longDescription });
    });

    await test.step('Input is capped at 50 characters', async () => {
      const value = await inseamPage.locators.descriptionInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(50);
    });

    await test.step('The truncated description still saves successfully', async () => {
      await inseamPage.create();
      await inseamPage.expectCreatedSuccessfully();
    });
  });

  test('TC:12 Verify list search by code or description', async ({ page }) => {
    const inseamPage = new GmtInseamPage(page);
    const code = uniqueCode5();
    const description = `PW MD Inseam Search ${Date.now()}`;

    await test.step('Create a uniquely-identifiable inseam', async () => {
      await inseamPage.open();
      await inseamPage.openNew();
      await inseamPage.fillRequired({ code, description });
      await inseamPage.create();
      await inseamPage.expectCreatedSuccessfully();
    });

    await test.step('Searching by its code filters the grid to that row', async () => {
      await inseamPage.search(code);
      await inseamPage.expectRowVisible(code);
    });

    await test.step('Searching by its description also filters the grid to that row', async () => {
      await inseamPage.search(description);
      await inseamPage.expectRowVisible(description);
    });
  });
});
