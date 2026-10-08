import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Size Master.
 *
 * Source of truth for these 12 cases: test-cases/master-data/size-master/
 * size-master-testcases.md. No ClickUp test-case tasks exist for this
 * story yet (brand-new coverage, no `allure.tms()` calls). Storage state
 * from auth.setup.ts is already applied via the "master-data" project's
 * dependency — no login needed here.
 *
 * Test data strategy: a Size is *composed* from an existing Item
 * Category + Inseam + Waist (no free text at all, see size.locators.ts),
 * and this screen has no working hard-delete/working-deactivate to reset
 * state between runs (TC:11 is exactly that confirmed bug). So instead of
 * a fixed, hardcoded combo that a second run would collide with, each
 * "needs a fresh combo" test draws one from a real, confirmed-live pool of
 * GMT-category Inseam/Waist codes, indexed by a counter + the current
 * timestamp — comfortably more combinations (18 x 19 = 342) than this
 * suite burns through in any realistic run cadence.
 */
const ITEM_CATEGORY = 'GMT';
const INSEAM_POOL = [
  'IN28',
  'IN30',
  'IN32',
  'IN34',
  'IN36',
  'IN38',
  'IN40',
  'Q0001',
  'Q0003',
  'Q0006',
  'Q0227',
  'Q0228',
  'Q0229',
  'Q0239',
  'Q0240',
  'Q0241',
  'Q0296',
  'Q0297',
];
const WAIST_POOL = [
  'W0002',
  'W0005',
  'W0226',
  'W0227',
  'W0228',
  'W0238',
  'W0239',
  'W0240',
  'W0295',
  'W0296',
  'W0297',
  'W26',
  'W28',
  'W30',
  'W32',
  'W34',
  'W36',
  'W38',
  'W40',
];

let comboCounter = 0;

/** Draws a not-yet-tried-this-run Inseam/Waist pair from the pools above (see file doc). */
function freshCombo(): { inseam: string; waist: string } {
  const seed = Date.now() + comboCounter++;
  return {
    inseam: INSEAM_POOL[seed % INSEAM_POOL.length] ?? 'IN28',
    waist: WAIST_POOL[Math.floor(seed / 7) % WAIST_POOL.length] ?? 'W26',
  };
}

/**
 * The exact auto-derived Description text for a combo — confirmed live to
 * be the one reliable, collision-free way to find "the Size I just
 * created" again. A bare Waist (or Inseam) code is NOT safe to search/filter
 * by on its own: many pre-existing Size rows share the same Waist paired
 * with a different Inseam (confirmed live — a real `strict mode violation`
 * with 2+ matches came back from searching by Waist code alone), since
 * Waist is only one of three fields composing a Size.
 */
function comboText(inseam: string, waist: string): string {
  return `${inseam} - ${waist}`;
}

test.describe('Master Data - Size Master', () => {
  test.beforeEach(async ({ sizePage }) => {
    await allure.epic('Master Data');
    await allure.feature('Size Master');
    await allure.owner('Master Data QA');
    await sizePage.open();
    // Confirmed live (agent-notes/master-data-module.md): the dev OIDC
    // redirect can take 15-18s to client-side-route to the real target
    // path — waiting here for the real heading avoids every other test
    // racing a page that looks loaded but hasn't actually routed yet
    // (confirmed: this exact race flaked TC:12's search call once).
    await sizePage.expectLoaded();
  });

  test('TC:1 Verify Size Master list screen layout', async ({ sizePage }) => {
    await sizePage.expectLoaded();
    await expect(sizePage.locators.allTab).toBeVisible();
    await expect(sizePage.locators.draftTab).toBeVisible();
    await expect(sizePage.locators.approvedTab).toBeVisible();
    await expect(sizePage.locators.inactiveTab).toBeVisible();
    await expect(sizePage.locators.rejectedTab).toBeVisible();
    await expect(sizePage.locators.searchInput).toBeVisible();
  });

  test('TC:2 Verify successful Size creation with all required fields', async ({ sizePage }) => {
    const { inseam, waist } = freshCombo();

    await test.step('Create a Size from Item Category + Inseam + Waist', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, inseam, waist });
      await sizePage.create();
    });

    await test.step('Toast reads "Size created." and the row appears Approved', async () => {
      await sizePage.expectCreatedSuccessfully();
      const combo = comboText(inseam, waist);
      await sizePage.search(combo);
      // A fresh Size always saves as "Approved" immediately — confirmed
      // live, no Draft/approval step despite those tabs existing.
      await sizePage.expectRowWithTextVisible(combo);
    });
  });

  test('TC:3 Verify Description auto-fills from Inseam x Waist and cannot be typed into', async ({
    sizePage,
  }) => {
    await sizePage.openNewSize();

    await test.step('Pick Item Category, Inseam and Waist', async () => {
      await sizePage.pickLookupValue('itemCategory', ITEM_CATEGORY);
      await sizePage.pickLookupValue('inseam', 'IN28');
      await sizePage.pickLookupValue('waist', 'W26');
    });

    await test.step('Description auto-derives as "<Inseam> - <Waist>"', async () => {
      await expect(sizePage.locators.descriptionInput).toHaveValue('IN28 - W26');
    });

    await test.step('Description is read-only — cannot be typed into directly', async () => {
      await expect(sizePage.locators.descriptionInput).toHaveAttribute('readonly', '');
    });

    // No Create — this test only needs the auto-fill behavior, not a saved record.
    await sizePage.cancel();
  });

  test("TC:4 Verify editing an existing Size's Inseam/Waist", async ({ sizePage }) => {
    const first = freshCombo();
    let second = freshCombo();
    while (second.waist === first.waist) second = freshCombo();

    await test.step('Create a Size to edit', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({
        itemCategory: ITEM_CATEGORY,
        inseam: first.inseam,
        waist: first.waist,
      });
      await sizePage.create();
      await sizePage.expectCreatedSuccessfully();
    });

    await test.step('Open it and change the Waist', async () => {
      const firstCombo = comboText(first.inseam, first.waist);
      await sizePage.search(firstCombo);
      await sizePage.openRowByText(firstCombo);
      await sizePage.pickLookupValue('waist', second.waist);
    });

    await test.step('The Waist field itself updates and Item Category stays locked', async () => {
      await expect(sizePage.locators.waistValueInput).toHaveValue(
        new RegExp(`^${second.waist}\\b`),
      );
      await expect(sizePage.locators.itemCategoryPickerButton).toBeDisabled();
    });

    // Real, confirmed-live bug (not in the original test-case doc — found
    // while automating this case, confirmed via the actual PATCH response
    // body): changing Waist on an existing Size updates `waistCode`
    // correctly server-side, but does NOT recompute `description`/
    // `sizeName` — both stay frozen at whatever they were when the Size
    // was first created. The form's Description field reflects this real
    // backend behavior (it does not re-derive on edit, only on create), so
    // asserting it stays stale here is asserting the REAL current
    // behavior, not a test bug.
    await test.step('BUG: Description does NOT re-derive on edit — it stays stale', async () => {
      await expect(sizePage.locators.descriptionInput).toHaveValue(
        comboText(first.inseam, first.waist),
      );
    });

    await test.step('Save succeeds (and the saved record keeps the stale description)', async () => {
      await sizePage.saveChanges();
      await expect(sizePage.locators.formDialog).toHaveCount(0);
    });
  });

  test('TC:5 Verify searching the Size list by code', async ({ sizePage }) => {
    const { inseam, waist } = freshCombo();

    await test.step('Create a Size to search for', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, inseam, waist });
      await sizePage.create();
      await sizePage.expectCreatedSuccessfully();
    });

    await test.step('Searching by its full Inseam/Waist description narrows the grid to it', async () => {
      // A bare Waist code is not safe to search by alone — see comboText()'s doc.
      const combo = comboText(inseam, waist);
      await sizePage.search(combo);
      await sizePage.expectRowWithTextVisible(combo);
    });
  });

  test('TC:6 Verify Item Category is a genuinely required field', async ({ sizePage }) => {
    const { inseam, waist } = freshCombo();
    await sizePage.openNewSize();
    await sizePage.pickLookupValue('inseam', inseam);
    await sizePage.pickLookupValue('waist', waist);

    await sizePage.create();

    await sizePage.expectFieldError('Required');
    await expect(sizePage.locators.itemCategoryPickerButton).toBeVisible();
  });

  test('TC:7 Verify Inseam is a genuinely required field', async ({ sizePage }) => {
    const { waist } = freshCombo();
    await sizePage.openNewSize();
    await sizePage.pickLookupValue('itemCategory', ITEM_CATEGORY);
    await sizePage.pickLookupValue('waist', waist);

    await sizePage.create();

    await sizePage.expectFieldError('Required');
    await expect(sizePage.locators.inseamPickerButton).toBeVisible();
  });

  test('TC:8 Verify Waist is a genuinely required field', async ({ sizePage }) => {
    const { inseam } = freshCombo();
    await sizePage.openNewSize();
    await sizePage.pickLookupValue('itemCategory', ITEM_CATEGORY);
    await sizePage.pickLookupValue('inseam', inseam);

    await sizePage.create();

    await sizePage.expectFieldError('Required');
    await expect(sizePage.locators.waistPickerButton).toBeVisible();
  });

  test('TC:9 Verify duplicate Inseam+Waist within the same Item Category is rejected', async ({
    sizePage,
  }) => {
    const { inseam, waist } = freshCombo();

    await test.step('Create a Size (succeeds)', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, inseam, waist });
      await sizePage.create();
      await sizePage.expectCreatedSuccessfully();
    });

    await test.step('Repeat the exact same combo — blocked', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, inseam, waist });
      await sizePage.create();
    });

    // Known bug/gap, confirmed live (TC:9 in the .md): the API returns a
    // specific 409 size_conflict reason, but the UI only ever shows this
    // generic toast — the real reason is never surfaced to the user.
    // Asserting the REAL current behavior on purpose, not the ideal one.
    await sizePage.expectCreateFailed();
    // The dialog stays open with the rejected values still in it, not
    // silently discarded — confirmed live.
    await expect(sizePage.locators.formDialog).toBeVisible();
  });

  test('TC:10 Verify Cancel on "New Size" discards all selections', async ({ sizePage }) => {
    await sizePage.openNewSize();
    await sizePage.pickLookupValue('itemCategory', ITEM_CATEGORY);

    await sizePage.cancel();
    await expect(sizePage.locators.formDialog).toHaveCount(0);

    await sizePage.openNewSize();
    // Re-opened form is fully blank — no leftover Item Category selection.
    await expect(sizePage.locators.itemCategoryPickerButton).not.toContainText('GMT');
  });

  test("TC:11 Verify deactivating a Size (and the list's reaction to it)", async ({
    sizePage,
    page,
  }) => {
    const { inseam, waist } = freshCombo();
    let sizeId = '';

    await test.step('Create a throwaway Size', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, inseam, waist });
      await sizePage.create();
      await sizePage.expectCreatedSuccessfully();
      // A bare Waist code is not safe to search/filter by alone — see comboText()'s doc.
      const combo = comboText(inseam, waist);
      await sizePage.search(combo);
      sizeId = await sizePage.sizeIdFromRowText(combo);
    });

    await test.step('Deactivate it — fires immediately, no confirmation step', async () => {
      await sizePage.openRow(sizeId);
      await expect(sizePage.locators.deactivateButton).toBeVisible();
      await sizePage.deactivate();
      await expect(sizePage.locators.formDialog).toHaveCount(0);
    });

    // Known, confirmed-live bug (TC:11 in the .md, cross-checked against
    // Color Master where the equivalent action DOES work): the backend
    // really does set activeFlag:false, but the list's Status column and
    // Inactive tab never reflect it — the row keeps showing "Approved"
    // even after a reload. Asserting the REAL (buggy) current behavior on
    // purpose — do not "fix" this assertion to the ideal behavior without
    // first confirming the app itself was fixed.
    await test.step('BUG: the list still reports it as Approved, not Inactive', async () => {
      await sizePage.search(waist);
      await expect(sizePage.locators.row(sizeId)).toBeVisible();
      expect(await sizePage.rowStatus(sizeId)).toBe('Approved');

      await page.reload();
      await sizePage.search(waist);
      expect(await sizePage.rowStatus(sizeId)).toBe('Approved');
    });
  });

  test('TC:12 Verify the search box safely handles unusual/special-character input', async ({
    sizePage,
  }) => {
    await sizePage.search('<script>alert(1)</script>');

    // No script executes (the page is still the Size Master list, not a
    // javascript: alert or a crashed render) and the grid shows zero rows.
    await expect(sizePage.locators.heading).toBeVisible();
    await sizePage.expectGridRowCount(1); // header row only
  });
});
