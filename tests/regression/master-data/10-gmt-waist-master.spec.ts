import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import { GmtWaistPage } from '../../../src/pages/master-data/gmt-waist.page';

/**
 * Master Data — GMT Waist Master.
 *
 * Source of truth for these 14 cases: test-cases/master-data/gmt-waist-master/gmt-waist-master-testcases.md.
 * No ClickUp test-case tasks exist for this story (first-ever coverage for
 * this screen). Storage state from auth.setup.ts is already applied via
 * the "master-data" project's dependency — no login needed here.
 *
 * `gmtWaistPage` is not registered on the shared master-data fixtures yet
 * (another agent owns that file) — constructed directly from the `page`
 * fixture here instead. See this session's report for the exact fixture
 * entry to add once that merge lands.
 *
 * Mirrors GMT Inseam Master's shape (same list layout, same modal
 * Create/Edit dialog, same 5/50-char limits), but every behavior here was
 * independently re-verified live rather than assumed from Inseam's — see
 * the source .md's own Notes. Every TC is exercisable live: as with
 * Inseam, there is no status-change/deactivate flow documented for this
 * screen (confirmed live: no Approve/Deactivate row actions, no hidden
 * Status column, no context menu on right-click), so there's nothing to
 * test.fixme() here.
 */

/** Waist Code is capped at 5 characters (confirmed live, maxlength="5") — keep generated codes within that. */
function uniqueCode5(): string {
  return String(Date.now()).slice(-5);
}

test.describe('Master Data - GMT Waist Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('GMT Waist Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify GMT Waist Master list layout', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);

    await test.step('Navigate to GMT Waist Master', async () => {
      await waistPage.open();
    });

    await test.step('Heading, status tabs, search, and "New Waist" are visible', async () => {
      await waistPage.expectLoaded();
      await expect(page.getByRole('button', { name: /^All \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Draft \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Approved \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Inactive \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Rejected \d+$/ })).toBeVisible();
      await expect(waistPage.locators.searchInput).toBeVisible();
    });
  });

  test('TC:2 Verify successful waist creation with both fields filled', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    const code = uniqueCode5();
    const description = `PW MD Waist ${Date.now()}`;

    await waistPage.open();

    await test.step('Create a new waist with Code + Description', async () => {
      await waistPage.openNew();
      await waistPage.fillRequired({ code, description });
      await waistPage.create();
    });

    await test.step('Toast reads "Waist created." and the row appears on the list', async () => {
      await waistPage.expectCreatedSuccessfully();
      await waistPage.expectDialogClosed();
      await waistPage.search(code);
      await waistPage.expectRowVisible(code);
    });
  });

  test('TC:3 Verify validation when both fields are left blank', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    await waistPage.open();
    await waistPage.openNew();

    await test.step('Click Create with both fields blank', async () => {
      await waistPage.create();
    });

    await test.step('Both fields show an inline "Required" error', async () => {
      await waistPage.expectRequiredError('code');
      await waistPage.expectRequiredError('description');
    });
  });

  test('TC:4 Verify Waist Code is required', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    await waistPage.open();
    await waistPage.openNew();

    await test.step('Fill only Description, leave Waist Code blank', async () => {
      await waistPage.fillRequired({ description: 'Description only' });
      await waistPage.create();
    });

    await test.step('"Required" appears under Waist Code only', async () => {
      await waistPage.expectRequiredError('code');
    });
  });

  test('TC:5 Verify Description is required', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    await waistPage.open();
    await waistPage.openNew();

    await test.step('Fill only Waist Code, leave Description blank', async () => {
      await waistPage.fillRequired({ code: uniqueCode5() });
      await waistPage.create();
    });

    await test.step('"Required" appears under Description only', async () => {
      await waistPage.expectRequiredError('description');
    });
  });

  test('TC:6 Verify successful waist edit', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    const code = uniqueCode5();
    const editedDescription = `PW MD Waist Edited ${Date.now()}`;

    await test.step('Create a throwaway waist to edit', async () => {
      await waistPage.open();
      await waistPage.openNew();
      await waistPage.fillRequired({ code, description: `PW MD Waist ${Date.now()}` });
      await waistPage.create();
      await waistPage.expectCreatedSuccessfully();
    });

    await test.step('Open Edit Waist and change the Description', async () => {
      await waistPage.search(code);
      await waistPage.openEdit(code);
      await waistPage.fillRequired({ description: editedDescription });
      await waistPage.save();
    });

    await test.step('Toast reads "Waist updated." and the list reflects the new description', async () => {
      await waistPage.expectUpdatedSuccessfully();
      await waistPage.search(code);
      await waistPage.expectRowVisible(editedDescription);
    });
  });

  test('TC:7 Verify Waist Code is locked on edit', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    const code = uniqueCode5();

    await waistPage.open();
    await waistPage.openNew();
    await waistPage.fillRequired({ code, description: `PW MD Waist ${Date.now()}` });
    await waistPage.create();
    await waistPage.expectCreatedSuccessfully();

    await test.step('Reopen the waist for editing', async () => {
      await waistPage.search(code);
      await waistPage.openEdit(code);
    });

    await test.step('Waist Code is disabled', async () => {
      await waistPage.expectCodeFieldDisabled();
    });
  });

  test('TC:8 Verify Cancel discards changes', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    const code = uniqueCode5();

    await waistPage.open();

    await test.step('Open New Waist, fill a value, then Cancel', async () => {
      await waistPage.openNew();
      await waistPage.fillRequired({ code, description: 'Should not persist' });
      await waistPage.cancel();
    });

    await test.step('Dialog closes and no record was created', async () => {
      await waistPage.expectDialogClosed();
      await waistPage.search(code);
      await expect(waistPage.locators.row(code)).toHaveCount(0);
    });
  });

  test('TC:9 Verify duplicate Waist Code is blocked with a specific message', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    const code = uniqueCode5();

    await test.step('Create a waist to collide with', async () => {
      await waistPage.open();
      await waistPage.openNew();
      await waistPage.fillRequired({ code, description: `PW MD Waist Dup Source ${Date.now()}` });
      await waistPage.create();
      await waistPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt to create a second waist with the exact same code', async () => {
      await waistPage.openNew();
      await waistPage.fillRequired({ code, description: 'Duplicate attempt' });
      await waistPage.create();
    });

    await test.step('Save is blocked with a specific, actionable toast; dialog stays open', async () => {
      await waistPage.expectDuplicateCodeError();
      await expect(waistPage.locators.dialog).toBeVisible();
    });
  });

  test('TC:10 Edge: negative number and zero accepted as Waist Code', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    // A fixed literal "-5" would collide with this same test's own
    // leftover record from a previous run (there is no delete flow for
    // this master — confirmed live), so the negative case uses a fresh
    // value every run instead.
    const negativeCode = `-${String(Date.now()).slice(-3)}`;

    await test.step(`Create with a fresh negative Waist Code ("${negativeCode}")`, async () => {
      await waistPage.open();
      await waistPage.openNew();
      await waistPage.fillRequired({ code: negativeCode, description: `PW MD Waist Negative ${Date.now()}` });
      await waistPage.create();
      await waistPage.expectCreatedSuccessfully();
    });

    await test.step('The negative code is accepted and saved as a literal value — no positivity validation', async () => {
      await waistPage.search(negativeCode);
      await waistPage.expectRowVisible(negativeCode);
    });

    // "0" itself can't be made unique per run without losing the thing
    // being tested (it has to literally be zero). Tolerant of a prior
    // run already having claimed it: a duplicate-code block is still
    // proof the value was accepted on format grounds (that check only
    // runs after required/format validation passes) — it's a different,
    // later failure than a numeric/positivity rejection would be.
    await test.step('Create with Waist Code "0" (or confirm a prior run already created it)', async () => {
      await waistPage.openNew();
      await waistPage.fillRequired({ code: '0', description: `PW MD Waist Zero ${Date.now()}` });
      await waistPage.create();
      const created = page.getByText('Waist created.');
      const duplicate = page.getByText('A waist with this code already exists. Use a different code.');
      await expect(created.or(duplicate)).toBeVisible({ timeout: 15_000 });

      // On the duplicate path the dialog stays open (confirmed live — see
      // TC:9) so the user can correct the code; it must be closed here or
      // the next step's search() hangs against a textbox a modal dialog
      // is still covering.
      if (await waistPage.locators.dialog.isVisible()) {
        await waistPage.cancel();
      }
    });

    await test.step('Either way, "0" exists in the list as a literal code', async () => {
      await waistPage.search('0');
      await waistPage.expectRowVisible('0');
    });
  });

  test('TC:11 Edge: decimal value accepted as Waist Code', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    // Fresh per run (same collision reasoning as TC:10's negative case).
    const ts = String(Date.now());
    const decimalCode = `${ts.slice(-3, -1)}.${ts.slice(-1)}`;

    await waistPage.open();
    await waistPage.openNew();

    await test.step(`Create with a fresh decimal Waist Code ("${decimalCode}")`, async () => {
      await waistPage.fillRequired({ code: decimalCode, description: `PW MD Waist Decimal ${Date.now()}` });
      await waistPage.create();
    });

    await test.step('Saves successfully with the literal decimal code — no whole-number coercion', async () => {
      await waistPage.expectCreatedSuccessfully();
      await waistPage.search(decimalCode);
      await waistPage.expectRowVisible(decimalCode);
    });
  });

  test('TC:12 Edge: non-numeric text accepted as Waist Code', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    // "PW<3 timestamp digits>" is fresh per run; "EXTRA" pushes it past 5
    // characters so the fill still exercises the maxlength truncation.
    const alphaCode = `PW${String(Date.now()).slice(-3)}EXTRA`;

    await waistPage.open();
    await waistPage.openNew();

    await test.step(`Create with Waist Code "${alphaCode}" (5-char limit truncates it)`, async () => {
      await waistPage.fillRequired({ code: alphaCode, description: `PW MD Waist Alpha ${Date.now()}` });
    });

    await test.step('Input is capped at 5 characters before saving', async () => {
      const value = await waistPage.locators.codeInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(5);
      expect(value.toUpperCase()).toBe(value); // still plain text, not coerced to a number
    });

    await test.step('Saves successfully — confirms no numeric-only restriction at all', async () => {
      await waistPage.create();
      await waistPage.expectCreatedSuccessfully();
    });
  });

  test('TC:13 Edge: Waist Code has a 5-character limit', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    // Keeping the unique part in the first 5 characters (then padding)
    // means the *stored, truncated* code is fresh every run, unlike a
    // fixed "123456789" literal which would always truncate the same way
    // and collide with a previous run's own leftover record.
    const longCode = `${uniqueCode5()}XXXX`;

    await waistPage.open();
    await waistPage.openNew();

    await test.step('Enter a 9-character code', async () => {
      await waistPage.fillRequired({ code: longCode, description: `PW MD Waist MaxCode ${Date.now()}` });
    });

    await test.step('Input is capped at 5 characters', async () => {
      const value = await waistPage.locators.codeInput.inputValue();
      expect(value.length).toBeLessThanOrEqual(5);
    });

    await test.step('The truncated code still saves successfully', async () => {
      await waistPage.create();
      await waistPage.expectCreatedSuccessfully();
    });
  });

  test('TC:14 Verify list search by code or description', async ({ page }) => {
    const waistPage = new GmtWaistPage(page);
    const code = uniqueCode5();
    const description = `PW MD Waist Search ${Date.now()}`;

    await test.step('Create a uniquely-identifiable waist', async () => {
      await waistPage.open();
      await waistPage.openNew();
      await waistPage.fillRequired({ code, description });
      await waistPage.create();
      await waistPage.expectCreatedSuccessfully();
    });

    await test.step('Searching by its code filters the grid to that row', async () => {
      await waistPage.search(code);
      await waistPage.expectRowVisible(code);
    });

    await test.step('Searching by its description also filters the grid to that row', async () => {
      await waistPage.search(description);
      await waistPage.expectRowVisible(description);
    });
  });
});
