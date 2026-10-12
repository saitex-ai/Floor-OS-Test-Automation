import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import type { SizePage } from '../../../src/pages/master-data/size.page';

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
 * and this screen has no hard delete to reset state between runs
 * (deactivated Sizes still count as duplicates). So instead of
 * a fixed, hardcoded combo that a second run would collide with, each
 * "needs a fresh combo" test draws one from a real, confirmed-live pool of
 * GMT-category Inseam/Waist codes, picked at random — comfortably more
 * combinations (18 x 19 = 342) than this suite burns through in any
 * realistic run cadence. createFreshSize() retries with a new draw when
 * the app reports a duplicate, so leftovers from earlier runs never fail
 * a test that only needs "some new Size".
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

function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * A random Inseam/Waist pair from the pools above. Random rather than
 * clock-seeded: parallel workers calling this in the same millisecond used
 * to draw the identical pair and collide on create. Use createFreshSize()
 * when the test needs a saved Size.
 */
function freshCombo(): { inseam: string; waist: string } {
  return { inseam: pick(INSEAM_POOL), waist: pick(WAIST_POOL) };
}

/**
 * Creates a Size from a random Inseam/Waist pair, redrawing whenever the
 * app rejects it as a duplicate. A pre-check against the list isn't
 * enough: duplicates are matched on Inseam+Waist too, and older rows carry
 * free-text descriptions (e.g. "30 × 34") that a combo search won't find.
 * Leaves the "Size created." toast on screen for the caller to assert.
 */
async function createFreshSize(sizePage: SizePage): Promise<{ inseam: string; waist: string }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const combo = freshCombo();
    await sizePage.openNewSize();
    await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, ...combo });
    if (await sizePage.submitUnlessDuplicate('create')) return combo;
    await sizePage.cancel();
  }
  throw new Error(
    'Every Inseam/Waist draw was a duplicate in 10 attempts — the pools need more codes.',
  );
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
    let combo = '';

    await test.step('Create a Size from Item Category + Inseam + Waist', async () => {
      const { inseam, waist } = await createFreshSize(sizePage);
      combo = comboText(inseam, waist);
    });

    await test.step('Toast reads "Size created." and the row appears Approved', async () => {
      await sizePage.expectCreatedSuccessfully();
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
    let first = { inseam: '', waist: '' };

    await test.step('Create a Size to edit', async () => {
      first = await createFreshSize(sizePage);
      await sizePage.expectCreatedSuccessfully();
    });

    await test.step('Open it', async () => {
      const firstCombo = comboText(first.inseam, first.waist);
      await sizePage.search(firstCombo);
      await sizePage.openRowByText(firstCombo);
      await expect(sizePage.locators.itemCategoryPickerButton).toBeDisabled();
    });

    // Confirmed live (2026-10-12): Description now re-derives from the new
    // Inseam/Waist on edit. Until 2026-10-08 it stayed frozen at the
    // create-time combo (backend never recomputed description/sizeName).
    // Redraws the Waist if the new pair turns out to already exist.
    await test.step('Change the Waist: the field and Description update, and Save succeeds', async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        let waist = freshCombo().waist;
        while (waist === first.waist) waist = freshCombo().waist;
        await sizePage.pickLookupValue('waist', waist);
        await expect(sizePage.locators.waistValueInput).toHaveValue(new RegExp(`^${waist}\\b`));
        await expect(sizePage.locators.descriptionInput).toHaveValue(
          comboText(first.inseam, waist),
        );
        if (await sizePage.submitUnlessDuplicate('save')) return;
      }
      throw new Error('Every Waist draw was a duplicate in 10 attempts.');
    });
  });

  test('TC:5 Verify searching the Size list by code', async ({ sizePage }) => {
    let combo = '';

    await test.step('Create a Size to search for', async () => {
      const { inseam, waist } = await createFreshSize(sizePage);
      await sizePage.expectCreatedSuccessfully();
      combo = comboText(inseam, waist);
    });

    await test.step('Searching by its full Inseam/Waist description narrows the grid to it', async () => {
      // A bare Waist code is not safe to search by alone — see comboText()'s doc.
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
    let inseam = '';
    let waist = '';

    await test.step('Create a Size (succeeds)', async () => {
      ({ inseam, waist } = await createFreshSize(sizePage));
      await sizePage.expectCreatedSuccessfully();
    });

    await test.step('Repeat the exact same combo — blocked', async () => {
      await sizePage.openNewSize();
      await sizePage.fillRequired({ itemCategory: ITEM_CATEGORY, inseam, waist });
      await sizePage.create();
    });

    // Confirmed live (2026-10-12): the toast now names the real reason and
    // category. Until 2026-10-08 it was the generic "Failed to create size.".
    await sizePage.expectDuplicateError(ITEM_CATEGORY);
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
    let combo = '';
    let sizeId = '';

    await test.step('Create a throwaway Size', async () => {
      const { inseam, waist } = await createFreshSize(sizePage);
      await sizePage.expectCreatedSuccessfully();
      // A bare Waist code is not safe to search/filter by alone — see comboText()'s doc.
      combo = comboText(inseam, waist);
      await sizePage.search(combo);
      sizeId = await sizePage.sizeIdFromRowText(combo);
    });

    await test.step('Deactivate it — confirmed via the "Deactivate {code}?" dialog', async () => {
      await sizePage.openRow(sizeId);
      await expect(sizePage.locators.deactivateButton).toBeVisible();
      await sizePage.deactivate();
      await expect(sizePage.locators.formDialog).toHaveCount(0);
    });

    // Confirmed live (2026-10-12): the list now reflects the deactivation
    // (row shows Inactive, Inactive tab counts it), including after a
    // reload. Until 2026-10-08 the row kept showing "Approved".
    await test.step('The list reports it as Inactive, also after a reload', async () => {
      await sizePage.search(combo);
      await expect(sizePage.locators.row(sizeId)).toBeVisible();
      await expect.poll(() => sizePage.rowStatus(sizeId), { timeout: 15_000 }).toBe('Inactive');

      await page.reload();
      await sizePage.search(combo);
      expect(await sizePage.rowStatus(sizeId)).toBe('Inactive');
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
