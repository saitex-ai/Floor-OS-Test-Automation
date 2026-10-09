import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Item Class Master screen,
 * /master-data/inventory-item-management/item-class-master. Under the
 * "Inventory Item Management" nav group (collapsed by default, distinct
 * from "System Management" — see agent-notes/master-data-module.md).
 * Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed.
 *
 * Source of truth: test-cases/master-data/item-class-master/
 * item-class-master-testcases.md — no ClickUp task exists for this module
 * yet, so no allure.tms() links here.
 *
 * Real, confirmed app bugs/behaviors are deliberately asserted as-is (not
 * worked around) per this repo's established discipline:
 * - TC:7 — Stock Group carries a red `*` exactly like Prefix Code/Stock
 *   Type/Item Categories but is never actually enforced.
 * - TC:12 — the "Active" checkbox is always checked and genuinely disabled
 *   in both Create and Edit; there is no way to deactivate an Item Class
 *   anywhere in this UI.
 *
 * **History**: Create was confirmed BROKEN live earlier on 2026-10-08
 * (every attempt returned an HTTP 409 `item_class_conflict` from the
 * backend's own ID generator handing out codes that already existed).
 * Re-checked later the same day via 3 independent live attempts (one via
 * this exact spec's own TC:1, two via standalone verification scripts) and
 * Create now works correctly — toast "Item class created.", a real
 * `201` from `POST /api/item-classes`. TC:1/TC:2/TC:13 below assert that
 * current, real, working behavior; ItemClassMasterPage still keeps
 * expectCreateFailedGeneric() for regression value in case this backend
 * bug resurfaces, but it is no longer the primary path here.
 *
 * Item Class Master has no delete capability (confirmed, see the
 * test-case doc) — every throwaway record this file creates is left in
 * place afterward (clearly prefixed `TC-ItemClass-`/`TCx`), same as this
 * repo's other no-delete Master Data screens.
 *
 * TC:13 also demonstrates the confirmed-live "Ask FloorOS AI" launcher
 * overlap trap and its keyboard-based workaround, which every other test
 * here already relies on via ItemClassMasterPage.create()/save().
 */
test.describe('Master Data - Item Class Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Item Class Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    itemClassMasterPage,
  }) => {
    const prefixCode = `TCA${Date.now().toString().slice(-6)}`;
    const description = `TC-ItemClass-Full-${Date.now()}`;

    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    const countBefore = await itemClassMasterPage.getAllCount();

    await test.step('Fill Prefix Code, pick a Stock Type, fill Description, add a category', async () => {
      await itemClassMasterPage.openNewItemClass();
      await itemClassMasterPage.fillPrefixCode(prefixCode);
      await itemClassMasterPage.pickStockType();
      await itemClassMasterPage.fillDescription(description);
      await itemClassMasterPage.addCategory();
    });

    await test.step('Create: toast confirms success', async () => {
      await itemClassMasterPage.create();
      await itemClassMasterPage.expectCreatedSuccessfully();
    });

    await test.step('The new row is visible on the list; total count increased by 1', async () => {
      await itemClassMasterPage.open();
      expect(await itemClassMasterPage.getAllCount()).toBe(countBefore + 1);
      await itemClassMasterPage.search(description);
      await itemClassMasterPage.expectRowVisible(description);
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    itemClassMasterPage,
  }) => {
    const prefixCode = `TCB${Date.now().toString().slice(-6)}`;

    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Fill only Prefix Code, pick a Stock Type, add a category (skip Description)', async () => {
      await itemClassMasterPage.fillPrefixCode(prefixCode);
      await itemClassMasterPage.pickStockType();
      await itemClassMasterPage.addCategory();
    });

    await test.step('Create succeeds — confirms Description is genuinely optional', async () => {
      await itemClassMasterPage.create();
      await itemClassMasterPage.expectCreatedSuccessfully();
      await itemClassMasterPage.search(prefixCode);
      await itemClassMasterPage.expectRowVisible(prefixCode);
    });
  });

  test('TC:3 Verify successful edit of an existing item class', async ({ itemClassMasterPage }) => {
    const prefixCode = `TCE${Date.now().toString().slice(-6)}`;
    const description = `TC-ItemClass-Edit-${Date.now()}`;
    const updatedDescription = `${description}-Updated`;

    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();

    await test.step('Create an item class to edit', async () => {
      await itemClassMasterPage.openNewItemClass();
      await itemClassMasterPage.fillPrefixCode(prefixCode);
      await itemClassMasterPage.pickStockType();
      await itemClassMasterPage.fillDescription(description);
      await itemClassMasterPage.addCategory();
      await itemClassMasterPage.create();
      await itemClassMasterPage.expectCreatedSuccessfully();
    });

    await test.step('Open it by its Prefix Code, change Description, and save', async () => {
      await itemClassMasterPage.search(prefixCode);
      await itemClassMasterPage.locators.row(prefixCode).first().click();
      // Waits for the Selected Categories panel to finish hydrating before
      // touching the form — see expectOnEditPage()'s own doc for why:
      // submitting too soon after landing on Edit can spuriously re-fail
      // client-side category validation under this shared dev
      // environment's heavier concurrent load.
      await itemClassMasterPage.expectOnEditPage();
      await itemClassMasterPage.fillDescription(updatedDescription);
      await itemClassMasterPage.save();
    });

    await test.step('Toast confirms the update; list reflects the new Description', async () => {
      await itemClassMasterPage.expectUpdatedSuccessfully();
      await itemClassMasterPage.search(updatedDescription);
      await itemClassMasterPage.expectRowVisible(updatedDescription);
    });
  });

  test('TC:4 Verify list search by code or name', async ({ itemClassMasterPage }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();

    await test.step('Search by a known Item Class Code narrows to the matching row', async () => {
      await itemClassMasterPage.search('ICC0000018');
      await itemClassMasterPage.expectRowVisible('ICC0000018');
    });

    await test.step('Search by its Prefix also narrows to the matching row', async () => {
      await itemClassMasterPage.search('SSITEM');
      await itemClassMasterPage.expectRowVisible('ICC0000018');
    });
  });

  test('TC:5 Verify All / Active / Inactive tab filters on the list', async ({
    itemClassMasterPage,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();

    await test.step('Active tab count matches All (no classes are ever Inactive — see TC:12)', async () => {
      const allCount = await itemClassMasterPage.getAllCount();
      // No literal space in the regex: the tab's label and its count
      // render in separate nested elements with CSS gap, not an actual
      // space character in the combined text content — confirmed live
      // ("Active34", not "Active 34"), same pattern documented on
      // CompanyListPage.getAllCount() elsewhere in this repo.
      await expect(itemClassMasterPage.locators.activeTab).toHaveText(
        new RegExp(`^Active\\s*${allCount}$`),
      );
      await expect(itemClassMasterPage.locators.inactiveTab).toHaveText(/^Inactive\s*0$/);
    });
  });

  test('TC:6 Verify validation when all required fields are left blank', async ({
    itemClassMasterPage,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Submit with everything blank', async () => {
      await itemClassMasterPage.create();
    });

    // Corrected from the original test-case doc's premise: on a TRULY
    // blank submit (Stock Type never picked at all), Item Categories never
    // shows "Select at least one item category." — that message only
    // appears once a Stock Type IS picked but zero categories are moved
    // across (see TC:9's own flow). With no Stock Type picked, the panel
    // still just shows its default "Pick a Stock Type first to load
    // matching categories." prompt. Confirmed live via this exact test
    // failing against the original (inaccurate) assertion — the
    // test-case doc's own TC:6 wording has been corrected to match.
    await test.step('Blocked with inline "Required" errors under Prefix Code and Stock Type', async () => {
      await itemClassMasterPage.expectValidationError('Required');
      await itemClassMasterPage.expectPickStockTypeFirstMessageVisible();
      await itemClassMasterPage.expectStillOnCreatePage();
    });
  });

  test('TC:7 Verify Stock Group carries a red * but is not actually enforced — surprising', async ({
    itemClassMasterPage,
    page,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Submit blank and inspect which asterisked fields actually get a "Required" error', async () => {
      await itemClassMasterPage.create();
      // Prefix Code and Stock Type both show "Required" (2 occurrences);
      // Stock Group carries the identical visual `*` but gets none of its
      // own — confirmed live it's a disabled, auto-derived display field,
      // not independently validated at all.
      await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
    });
  });

  test('TC:8 Verify Item Categories picker is scoped to the picked Stock Type', async ({
    itemClassMasterPage,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Before picking a Stock Type, Available Categories is empty with a prompt', async () => {
      await itemClassMasterPage.expectPickStockTypeFirstMessageVisible();
    });

    await test.step('Picking Stock Type "BD" shows exactly its 1 real category', async () => {
      await itemClassMasterPage.pickStockType(/Building Maintenance/);
      await itemClassMasterPage.expectAvailableCategoriesCount(1);
    });
  });

  test('TC:9 Verify moving a category out of Available removes it from there too', async ({
    itemClassMasterPage,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await itemClassMasterPage.pickStockType(/Building Maintenance/);
    await itemClassMasterPage.expectAvailableCategoriesCount(1);

    await test.step('Moving the only available category across updates both panel counts', async () => {
      await itemClassMasterPage.addCategory(/Building Maintenance/);
      await itemClassMasterPage.expectSelectedCategoriesCount(1);
      await itemClassMasterPage.expectNoCategoriesForStockTypeMessageVisible();
    });
  });

  test('TC:10 Verify Cancel discards changes on create', async ({ itemClassMasterPage, page }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    const countBefore = await itemClassMasterPage.getAllCount();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Fill a Prefix Code, pick a Stock Type, then Cancel', async () => {
      await itemClassMasterPage.fillPrefixCode('CNCL');
      await itemClassMasterPage.pickStockType();
      await itemClassMasterPage.cancel();
    });

    await test.step('Back on the list; total count unchanged', async () => {
      await expect(page).toHaveURL(/\/master-data\/inventory-item-management\/item-class-master$/);
      expect(await itemClassMasterPage.getAllCount()).toBe(countBefore);
    });
  });

  test('TC:11 Verify Prefix Code and Description max length (edge)', async ({
    itemClassMasterPage,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Prefix Code silently truncates at exactly 10 characters', async () => {
      await itemClassMasterPage.fillPrefixCode('A'.repeat(50));
      expect(await itemClassMasterPage.getPrefixCodeValue()).toHaveLength(10);
    });

    await test.step('Description silently truncates at exactly 200 characters', async () => {
      await itemClassMasterPage.fillDescription('B'.repeat(300));
      expect(await itemClassMasterPage.getDescriptionValue()).toHaveLength(200);
    });
  });

  test('TC:12 Verify the Active checkbox cannot actually be changed — confirmed bug', async ({
    itemClassMasterPage,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('Active is always checked and genuinely disabled on Create', async () => {
      expect(await itemClassMasterPage.isActiveCheckboxChecked()).toBe(true);
      expect(await itemClassMasterPage.isActiveCheckboxDisabled()).toBe(true);
    });

    await test.step('Same on Edit of a real, pre-existing record (read-only check, nothing saved)', async () => {
      await itemClassMasterPage.open();
      await itemClassMasterPage.openEditByCode('ICC0000018');
      expect(await itemClassMasterPage.isActiveCheckboxChecked()).toBe(true);
      expect(await itemClassMasterPage.isActiveCheckboxDisabled()).toBe(true);
    });
  });

  test('TC:13 Verify the floating AI launcher overlaps Create, and the keyboard workaround submits the real form', async ({
    itemClassMasterPage,
    page,
  }) => {
    await itemClassMasterPage.open();
    await itemClassMasterPage.expectLoaded();
    await itemClassMasterPage.openNewItemClass();

    await test.step('The Create button is physically obstructed by the "Ask FloorOS AI" launcher', async () => {
      const obstructed = await itemClassMasterPage.isButtonObstructedByAiLauncher(
        itemClassMasterPage.locators.createButton,
      );
      expect(obstructed).toBe(true);
    });

    await test.step('focus() + Enter still reaches the real form, not the AI launcher', async () => {
      await itemClassMasterPage.fillPrefixCode(`TCK${Date.now().toString().slice(-6)}`);
      await itemClassMasterPage.pickStockType();
      await itemClassMasterPage.addCategory();
      await itemClassMasterPage.create();
      // Reaching the real success toast (rather than no toast at all, or
      // the AI launcher's own dialog opening) is itself the proof the real
      // form was submitted via the keyboard workaround, not the launcher.
      await itemClassMasterPage.expectCreatedSuccessfully();
      await expect(page.getByRole('dialog', { name: /Ask FloorOS/i })).toHaveCount(0);
    });
  });
});
