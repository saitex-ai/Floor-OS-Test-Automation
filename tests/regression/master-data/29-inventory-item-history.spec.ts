import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Inventory Item History
 * (`/master-data/inventory-item-management/inventory-item-history`, under
 * the "Inventory Item Management" nav group — collapsed by default, but a
 * direct goto() to the route works fine once authenticated, confirmed
 * live, so no nav-expansion step is needed here).
 *
 * Source of truth: test-cases/master-data/inventory-item-history/
 * inventory-item-history-testcases.md — no ClickUp task exists for this
 * module yet, so no allure.tms() links here. Storage state from
 * auth.setup.ts is already applied via the "master-data" project's
 * dependency — no login needed.
 *
 * **This screen is confirmed live to be neither a pure read-only audit log
 * nor full CRUD** — its own subtitle says the real scope: "Click an item
 * to update its Alternate Code and Item Description and view its change
 * history." There is no "New" entry point anywhere. Every row is real,
 * shared, production-like dev data, so this suite deliberately never
 * completes a real, successful mutating Update against it — only the
 * client-side validation path (which blocks before any save happens) is
 * exercised in TC:4/TC:5. The one gap this leaves — the real Update
 * success toast text, and whether "Change history" actually populates
 * after a genuine edit — is tracked as an explicit `test.fixme()` at the
 * bottom rather than silently omitted or faked.
 */
test.describe('Master Data - Inventory Item History', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Inventory Item History');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify Inventory Item History list screen layout', async ({
    inventoryItemHistoryPage,
  }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    await test.step('No tabs, no Create button — confirmed-live scope', async () => {
      await inventoryItemHistoryPage.expectNoCreateButton();
    });

    await test.step('All 13 confirmed-live columns are present', async () => {
      const columns = [
        'Inventory ID',
        'Alternate Code',
        'Item Description',
        'Status',
        'Item Class Code',
        'Stock Type Code',
        'Item Category Code',
        'BLUESIGN',
        'Base Unit',
        'Content',
        'Custom Code',
        'GSM',
        'HS Code',
      ];
      await inventoryItemHistoryPage.expectColumnHeadersVisible(columns);
    });
  });

  test('TC:2 Verify no Create entry point exists for this screen', async ({
    inventoryItemHistoryPage,
  }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.expectNoCreateButton();

    await test.step('Direct nav to the non-existent /new route renders the app\'s generic "Not Found" page', async () => {
      await inventoryItemHistoryPage.gotoNewRouteDirectly();
      await inventoryItemHistoryPage.expectNotFoundPage();
    });
  });

  test('TC:3 Verify clicking a row opens a limited Update form, not a full detail/edit page', async ({
    inventoryItemHistoryPage,
  }) => {
    const inventoryId = 'THSB-SB0301CH';

    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.openItem(inventoryId);

    await test.step('URL changes to ?edit=<id>, heading is "Update Inventory Item", Inventory ID is locked', async () => {
      await inventoryItemHistoryPage.expectOnUpdateForm(inventoryId);
      await inventoryItemHistoryPage.expectInventoryIdLocked(inventoryId);
    });

    await test.step('Exactly Alternate Code and Item Description are editable, plus a Change history section', async () => {
      await expect(inventoryItemHistoryPage.locators.alternateCodeInput).toBeEditable();
      await expect(inventoryItemHistoryPage.locators.itemDescriptionInput).toBeEditable();
      await expect(inventoryItemHistoryPage.locators.changeHistoryHeading).toBeVisible();
    });
  });

  test('TC:4 Verify Alternate Code is a genuinely required field', async ({
    inventoryItemHistoryPage,
  }) => {
    const inventoryId = 'THSB-SB0301CH';

    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.openItem(inventoryId);
    await inventoryItemHistoryPage.expectOnUpdateForm(inventoryId);

    await test.step('Clear Alternate Code and attempt Update — blocked, no save, no navigation', async () => {
      await inventoryItemHistoryPage.fillAlternateCode('');
      await inventoryItemHistoryPage.clickUpdate();
      await inventoryItemHistoryPage.expectAlternateCodeRequiredError();
      await inventoryItemHistoryPage.expectStillOnUpdateForm(inventoryId);
    });
  });

  test('TC:5 Verify Item Description is a genuinely required field', async ({
    inventoryItemHistoryPage,
  }) => {
    const inventoryId = 'THSB-SB0301CH';

    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.openItem(inventoryId);
    await inventoryItemHistoryPage.expectOnUpdateForm(inventoryId);

    await test.step('Clear Item Description and attempt Update — blocked, no save, no navigation', async () => {
      await inventoryItemHistoryPage.fillItemDescription('');
      await inventoryItemHistoryPage.clickUpdate();
      await inventoryItemHistoryPage.expectItemDescriptionRequiredError();
      await inventoryItemHistoryPage.expectStillOnUpdateForm(inventoryId);
    });
  });

  test('TC:6 Verify Cancel discards unsaved changes without navigating away silently', async ({
    inventoryItemHistoryPage,
  }) => {
    const inventoryId = 'THSB-SB0301CH';

    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.openItem(inventoryId);
    await inventoryItemHistoryPage.expectOnUpdateForm(inventoryId);

    await test.step('Change a field, then Cancel — never saved, no API call made', async () => {
      await inventoryItemHistoryPage.fillItemDescription('TEMP — should never be saved');
      await inventoryItemHistoryPage.clickCancel();
      await inventoryItemHistoryPage.expectBackOnList();
    });
  });

  test("TC:7 Verify the Change history section's real empty state", async ({
    inventoryItemHistoryPage,
  }) => {
    // Confirmed live across THSB-SB0301CH, GSM406EW29032, GSM406EW29030 —
    // every item checked in this session shows the same empty state; no
    // populated-history example was found (see the module's own
    // test-case doc Notes).
    for (const inventoryId of ['THSB-SB0301CH', 'GSM406EW29032', 'GSM406EW29030']) {
      await test.step(`${inventoryId} shows "No audit history yet for this item."`, async () => {
        await inventoryItemHistoryPage.open();
        await inventoryItemHistoryPage.openItem(inventoryId);
        await inventoryItemHistoryPage.expectOnUpdateForm(inventoryId);
        await inventoryItemHistoryPage.expectNoAuditHistoryYet();
      });
    }
  });

  test('TC:8 Verify list search by Inventory ID', async ({ inventoryItemHistoryPage }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    await test.step('Exact Inventory ID narrows to exactly one row', async () => {
      await inventoryItemHistoryPage.search('GSM406EW29032');
      await inventoryItemHistoryPage.expectRowVisible('GSM406EW29032');
      // header row + exactly one data row
      await inventoryItemHistoryPage.expectRowCount(2);
    });
  });

  test('TC:9 Verify list search by a partial Item Description keyword', async ({
    inventoryItemHistoryPage,
  }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    await test.step('A keyword shared by several descriptions narrows the grid to all of them', async () => {
      await inventoryItemHistoryPage.search('STRAIGHT');
      // At least the header row plus one match — avoids hard-coding the
      // exact seeded count, which can drift as dev data changes.
      const rowCount = await inventoryItemHistoryPage.rowCount();
      expect(rowCount).toBeGreaterThan(1);
    });
  });

  test('TC:10 Verify list search with no matches shows the real empty state', async ({
    inventoryItemHistoryPage,
  }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    await test.step('A guaranteed-no-match term shows the confirmed-live empty state text', async () => {
      await inventoryItemHistoryPage.search('ZZZZZNOPE999');
      await inventoryItemHistoryPage.expectNoItemsFoundMessage();
    });
  });

  test('TC:11 Verify column sort on Inventory ID', async ({ inventoryItemHistoryPage }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    await test.step('First click sorts ascending', async () => {
      await inventoryItemHistoryPage.sortByInventoryId();
      await expect(inventoryItemHistoryPage.locators.row('ADJ0000001')).toBeVisible();
    });

    await test.step('Second click reverses to descending', async () => {
      await inventoryItemHistoryPage.sortByInventoryId();
      await expect(inventoryItemHistoryPage.locators.row('ZIP0000001')).toBeVisible();
    });
  });

  test('TC:12 Verify Export CSV', async ({ inventoryItemHistoryPage }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    const download = await inventoryItemHistoryPage.clickExportCsvAndGetDownload();
    expect(download.suggestedFilename()).toBe('inventory-item-history.csv');
  });

  test('TC:13 Verify "Configure columns" panel lists exactly the 13 real columns', async ({
    inventoryItemHistoryPage,
  }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.openConfigureColumnsPanel();
    await inventoryItemHistoryPage.expectColumnsPanelShowsCount(13);
  });

  test('TC:14 Verify pagination via "Jump to page"', async ({ inventoryItemHistoryPage }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();

    await test.step('Page 1 shows a different set of rows than page 2', async () => {
      const page1FirstRowText = await inventoryItemHistoryPage.rowTextAt(1);

      await inventoryItemHistoryPage.jumpToPage(2);

      const page2FirstRowText = await inventoryItemHistoryPage.rowTextAt(1);

      expect(page2FirstRowText).not.toEqual(page1FirstRowText);
    });
  });

  test('TC:15 Verify "Filters" and "Toggle cell filters" accessible-name collision', async ({
    inventoryItemHistoryPage,
  }) => {
    await inventoryItemHistoryPage.open();
    await inventoryItemHistoryPage.expectLoaded();
    await inventoryItemHistoryPage.expectFiltersNameCollision();
  });

  // Intentionally not automated — see this module's own test-case doc
  // (inventory-item-history-testcases.md, Notes section) for the full
  // reasoning. Every row on this screen is real, shared, production-like
  // dev inventory data, and this screen has no "New" entry point to
  // create a disposable record instead. A genuine end-to-end Update (fill
  // valid Alternate Code/Item Description, click Update, confirm the real
  // success toast text, confirm whether "Change history" actually
  // populates an entry) would durably mutate a shared dev record with no
  // guaranteed way back to its exact original state, and was explicitly
  // flagged as an unverified gap during manual exploration rather than
  // guessed at. Left here as a fixme, not silently dropped, so the gap
  // stays visible instead of looking like full coverage. If a dedicated,
  // safe-to-mutate sandbox inventory item is ever seeded for this screen,
  // implement this for real against that record only.
  test.fixme('Verify a real Update actually persists (toast text + Change history population) — intentionally not automated, see comment above', async () => {});
});
