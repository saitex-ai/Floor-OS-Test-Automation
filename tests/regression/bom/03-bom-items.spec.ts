import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { BomDetailPage } from '../../../src/pages/bom/bom-detail.page';
import { BomItemsPage } from '../../../src/pages/bom/bom-items.page';
import { createDisposableBom, DISPOSABLE_BOM_TIMEOUT } from './support/disposable-bom';

/**
 * BOM — Items (the "B.O.M Items" table on an Open BOM).
 *
 * Source of truth for these cases: test-cases/bom/bom-items.md.
 *
 * Every case runs on a disposable BOM this file builds for itself
 * (support/disposable-bom.ts) — never someone else's — seeded with a
 * baseline of four real MDM items from different categories (fabric,
 * thread, label, packaging). Cases that need more items add their own,
 * from codes no other case touches, so they don't depend on each
 * other's order. One browser tab is shared across the file (as in the
 * BOM smoke suite); default (not serial) mode, so one failure doesn't
 * skip the rest — a fresh worker just builds a fresh BOM.
 */

/**
 * Baseline lines seeded in beforeAll — MDM codes present on both uat and
 * dev (dev has no ZIP0000004/BUT0000002). THD is a thread item — it can't
 * be destination-split.
 */
const FABRIC = 'FAB0000002';
const THREAD = 'THD0000001';
const LABEL = 'LBL0000001';
const PACKAGING = 'TAG0000002';
const BASELINE = [FABRIC, THREAD, LABEL, PACKAGING];

// In order in one worker (one disposable BOM for the file), without one
// failure skipping the rest.
test.describe.configure({ mode: 'default' });

test.describe('BOM - Items', () => {
  let page: Page;
  let bomDetailPage: BomDetailPage;
  let bomItemsPage: BomItemsPage;
  let code = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(DISPOSABLE_BOM_TIMEOUT);
    page = await browser.newPage({ storageState: authFile('bom') });
    bomDetailPage = new BomDetailPage(page);
    bomItemsPage = new BomItemsPage(page);
    code = await createDisposableBom(page);
    await bomItemsPage.addLines(BASELINE);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    test.setTimeout(150_000);
    await allure.epic('BOM');
    await allure.feature('BOM Items');
    await allure.owner('BOM QA');
    await bomDetailPage.open(code, 0);
  });

  test('TC:1 Verify "Add line" opens the "Add Inventory Item" MDM picker', async () => {
    const l = bomItemsPage.locators;
    await bomItemsPage.openAddLine();

    await test.step('Title, description, search box and the paged MDM item table', async () => {
      await expect(l.addInventoryDialog).toContainText(
        'Pick an item from MDM. Already-added items are hidden.',
      );
      await expect(l.addInventorySearchBox).toBeVisible();
      await expect(l.addInventoryTable).toBeVisible();
      await expect(l.addInventoryFooter).toContainText(/of \d+/i);
    });

    await test.step('"Add Selected" only appears once something is ticked, with the count', async () => {
      await expect(l.addSelectedButton).toHaveCount(0);
      await bomItemsPage.searchInventory('CPT0000001');
      await l.inventoryOptionCheckbox('CPT0000001').check();
      await expect(l.addSelectedButton).toHaveText('Add Selected (1)');
      await l.inventoryOptionCheckbox('CPT0000001').uncheck();
      await expect(l.addSelectedButton).toHaveCount(0);
    });

    await bomItemsPage.closeAddLine();
  });

  test('TC:2 Verify adding a single line asks to confirm, then adds it and bumps the item count', async () => {
    const id = 'LIN0000002';
    const before = await bomDetailPage.itemCount();
    await bomItemsPage.openAddLine();

    await test.step('Clicking the item opens "Confirm item"', async () => {
      await bomItemsPage.pickSingleInventory(id);
      await expect(bomItemsPage.locators.confirmItemDialog).toContainText(`Add ${id} to this BOM?`);
    });

    await test.step('"Add line" adds it to the table, and B.O.M Items counts it', async () => {
      await bomItemsPage.locators.confirmItemAddButton.click();
      await bomItemsPage.expectItemPresent(id);
      await bomDetailPage.expectItemCount(before + 1);
    });
  });

  test('TC:3 Verify adding several lines goes through an "Add N items" review where lines can be removed', async () => {
    const keep = ['PKT0000001', 'PKT0000002'];
    const removed = 'TAG0000001';
    const before = await bomDetailPage.itemCount();
    await bomItemsPage.openAddLine();

    await test.step('Tick three items — "Add Selected (3)" opens the review', async () => {
      await bomItemsPage.selectInventoryForReview([...keep, removed]);
      await expect(bomItemsPage.locators.addItemsReviewDialog).toContainText(
        'Review items — remove any before adding.',
      );
    });

    await test.step('Remove one, then "Add 2 lines"', async () => {
      await bomItemsPage.removeFromReview(removed);
      await bomItemsPage.confirmReview(keep.length);
    });

    await test.step('Only the two kept items were added', async () => {
      for (const id of keep) await bomItemsPage.expectItemPresent(id);
      await bomItemsPage.expectItemAbsent(removed);
      await bomDetailPage.expectItemCount(before + keep.length);
    });
  });

  test('TC:4 Verify an item already on the BOM is hidden from "Add line"', async () => {
    await bomItemsPage.openAddLine();
    expect(await bomItemsPage.isInventoryOffered(FABRIC)).toBe(false);
    await bomItemsPage.closeAddLine();
  });

  test('TC:5 Verify lines are grouped under category headers with their line counts', async () => {
    for (const category of ['Fabric', 'Thread', 'Labels', 'Packaging']) {
      await bomItemsPage.expectCategoryHeader(category);
    }
  });

  test('TC:6 Verify deleting a line asks to confirm, Cancel keeps it, and Delete removes it', async () => {
    const id = 'LBL0000002';
    await bomItemsPage.addLine(id);
    const before = await bomDetailPage.itemCount();

    await test.step('Delete asks to confirm, warning it also removes splits', async () => {
      await bomItemsPage.openDeleteDialog(id);
      await expect(bomItemsPage.locators.deleteLineDialog).toContainText(
        `Delete "${id}"? This removes the line and all its splits — this cannot be undone.`,
      );
    });

    await test.step('Cancel keeps the line', async () => {
      await bomItemsPage.cancelDelete();
      await bomItemsPage.expectItemPresent(id);
    });

    await test.step('Delete removes it, with a "Deleted" toast', async () => {
      await bomItemsPage.deleteLine(id);
      await bomDetailPage.expectToast(`Deleted ${id}.`);
      await bomDetailPage.expectItemCount(before - 1);
    });
  });

  test('TC:7 Verify editing a description cannot be saved without a reason', async () => {
    const l = bomItemsPage.locators;
    await bomItemsPage.openEditDescription(FABRIC);

    await test.step('Save is disabled, with "Save disabled until you record why."', async () => {
      await expect(l.descriptionSaveButton).toBeDisabled();
      await expect(l.descriptionReasonHint).toBeVisible();
    });

    await test.step('A changed description alone still leaves Save disabled', async () => {
      await l.descriptionInput.fill(`QA regression description ${Date.now()}`);
      await expect(l.descriptionSaveButton).toBeDisabled();
    });

    await test.step('Adding a reason enables Save', async () => {
      await l.descriptionReasonInput.fill('QA regression: reason gate check');
      await expect(l.descriptionSaveButton).toBeEnabled();
    });

    await test.step('Close without saving — nothing is staged', async () => {
      await bomItemsPage.closeDialog(l.editDescriptionDialog);
      await expect(l.pendingChanges).toBeHidden();
    });
  });

  test('TC:8 Verify a description edit with a reason is staged, then saved with a confirmation', async () => {
    const description = `QA regression description ${Date.now()}`;

    await test.step('The edit is staged behind "1 change pending"', async () => {
      await bomItemsPage.stageDescription(
        FABRIC,
        description,
        'QA regression: corrected from techpack',
      );
      await expect(bomItemsPage.locators.pendingChanges).toHaveText('1 change pending');
    });

    await test.step('"Save 1 change" saves it with a "Saved 1 line edit" toast', async () => {
      await bomItemsPage.saveStagedEdits();
      await bomDetailPage.expectToast(/^Saved 1 line edit/);
    });

    await test.step('The new description is still there after a refresh', async () => {
      await bomDetailPage.refresh();
      expect(await bomItemsPage.descriptionOf(FABRIC)).toBe(description);
    });
  });

  test('TC:9 Verify discarding a staged edit restores the original value', async () => {
    const original = await bomItemsPage.descriptionOf(LABEL);
    await bomItemsPage.stageDescription(
      LABEL,
      `QA discard check ${Date.now()}`,
      'QA regression: discard',
    );

    await bomItemsPage.discardStagedEdits();
    expect(await bomItemsPage.descriptionOf(LABEL)).toBe(original);
    await bomDetailPage.refresh();
    expect(await bomItemsPage.descriptionOf(LABEL)).toBe(original);
  });

  test('TC:10 Verify changing a UOM asks why first, and cannot be staged without a reason', async () => {
    const l = bomItemsPage.locators;
    const original = await bomItemsPage.uomOf(PACKAGING);
    const other = (await bomItemsPage.uomOptions(PACKAGING)).find(
      (u) => u !== original && u !== '',
    );
    expect(other, 'a second UOM to switch to').toBeDefined();

    await test.step('Picking another UOM opens "Edit BOM line" asking why', async () => {
      await bomItemsPage.changeUom(PACKAGING, other!);
      await expect(l.editLineDialog).toContainText('Why?');
    });

    await test.step('"Stage edit" stays disabled until a reason is entered', async () => {
      await expect(l.stageEditButton).toBeDisabled();
      await l.editLineReasonInput.fill('QA regression: UOM reason gate');
      await expect(l.stageEditButton).toBeEnabled();
    });

    await test.step('Cancel leaves the UOM unchanged and nothing staged', async () => {
      await bomItemsPage.cancelEditLine();
      await expect(l.pendingChanges).toBeHidden();
      expect(await bomItemsPage.uomOf(PACKAGING)).toBe(original);
    });
  });

  test('TC:11 Verify a Remark saves on its own, without a reason or a staged change', async () => {
    const remark = `QA remark ${Date.now()}`;
    await bomItemsPage.setRemark(PACKAGING, remark);
    await expect(bomItemsPage.locators.pendingChanges).toBeHidden();

    await expect
      .poll(async () => {
        await bomDetailPage.refresh();
        return bomItemsPage.remarkOf(PACKAGING);
      })
      .toBe(remark);
  });

  test('TC:12 Verify the split types are mutually exclusive — ticking Waist split replaces Item-level split', async () => {
    await test.step('A new line starts on Item-level split only', async () => {
      expect(await bomItemsPage.activeSplitTypes(LABEL)).toEqual(['Item-level split']);
    });

    await test.step('Ticking Waist split leaves Waist split as the only split type', async () => {
      await bomItemsPage.switchSplitType(LABEL, 'Waist split');
    });

    await test.step('It sticks after a refresh', async () => {
      await bomDetailPage.refresh();
      expect(await bomItemsPage.activeSplitTypes(LABEL)).toEqual(['Waist split']);
    });

    await test.step('Ticking Item-level split again switches back', async () => {
      await bomItemsPage.switchSplitType(LABEL, 'Item-level split');
    });
  });

  test('TC:13 Verify unticking the active split type falls back to Item-level split', async () => {
    await bomItemsPage.switchSplitType(PACKAGING, 'Inseam split');
    await bomItemsPage.clickCheckbox(PACKAGING, 'Inseam split');
    await expect.poll(() => bomItemsPage.activeSplitTypes(PACKAGING)).toEqual(['Item-level split']);
  });

  test('TC:14 Verify "Show barcode" is only available on a GMT size set line', async () => {
    const barcode = bomItemsPage.locators.rowCheckbox(PACKAGING, 'Show barcode');

    await test.step('Disabled while the line is Item-level split', async () => {
      await expect(barcode).toBeDisabled();
    });

    await test.step('Enabled once "GMT size set" is the split type', async () => {
      await bomItemsPage.switchSplitType(PACKAGING, 'GMT size set');
      await expect(barcode).toBeEnabled();
    });

    await test.step('Disabled again after switching back to Item-level split', async () => {
      await bomItemsPage.switchSplitType(PACKAGING, 'Item-level split');
      await expect(barcode).toBeDisabled();
    });
  });

  test('TC:15 Verify a thread (THD) item cannot be destination-split', async () => {
    await allure.tms('https://app.clickup.com/t/z941aby8eb', 'TC:15 bug (ClickUp)');
    // Confirmed bug, ClickUp z941aby8eb (see test-case doc's own notes):
    // on uat and dev (2026-10-08) ticking Destination split on a THD line
    // saves silently — no "Not Allowed" alert, and it survives a refresh.
    // Expected to fail until that's fixed; the finally block unticks it
    // again so the rest of this file sees the line as seeded.
    const l = bomItemsPage.locators;

    await test.step('Its country cell shows "—" instead of "Pick country"', async () => {
      await expect(l.rowPickCountryButton(THREAD)).toHaveCount(0);
      await expect(l.rowNoCountryCell(THREAD)).toBeVisible();
    });

    try {
      await test.step('Ticking Destination split is refused with "Not Allowed"', async () => {
        await bomItemsPage.clickCheckbox(THREAD, 'Destination split');
        await expect
          .soft(l.notAllowedDialog)
          .toContainText('THD items are NOT ALLOWED to do Destination Split!');
      });

      await test.step('After a refresh, the thread line still has no Destination split', async () => {
        await bomDetailPage.refresh();
        expect(await bomItemsPage.activeSplitTypes(THREAD)).not.toContain('Destination split');
      });
    } finally {
      // Undo it if it did save, so later cases see the line as seeded.
      await bomDetailPage.refresh();
      if (await bomItemsPage.isChecked(THREAD, 'Destination split')) {
        await bomItemsPage.clickCheckbox(THREAD, 'Destination split');
        await expect(l.rowCheckbox(THREAD, 'Destination split')).not.toBeChecked();
      }
    }
  });

  test('TC:16 Verify "Pick country" turns on Destination split and opens the country picker', async () => {
    const l = bomItemsPage.locators;

    await test.step('"Pick country" on a non-thread line opens "Select a country"', async () => {
      await bomItemsPage.openPickCountry(PACKAGING);
    });

    await test.step("Destination split is now ticked, alongside the line's own split type", async () => {
      await bomItemsPage.closeDialog(l.countryDialog);
      await expect(l.rowCheckbox(PACKAGING, 'Destination split')).toBeChecked();
      await expect(l.rowCheckbox(PACKAGING, 'Item-level split')).toBeChecked();
    });

    await test.step('Untick Destination split again (no country was picked, so nothing is lost)', async () => {
      await bomItemsPage.clickCheckbox(PACKAGING, 'Destination split');
      await expect(l.rowCheckbox(PACKAGING, 'Destination split')).not.toBeChecked();
    });
  });

  test('TC:17 Verify "Customer supplied" can be ticked and unticked, and sticks', async () => {
    await test.step('Tick it — still ticked after a refresh', async () => {
      await bomItemsPage.clickCheckbox(LABEL, 'Customer supplied');
      await expect(bomItemsPage.locators.rowCheckbox(LABEL, 'Customer supplied')).toBeChecked();
      await bomDetailPage.refresh();
      await expect(bomItemsPage.locators.rowCheckbox(LABEL, 'Customer supplied')).toBeChecked();
    });

    await test.step('Untick it — still unticked after a refresh', async () => {
      await bomItemsPage.clickCheckbox(LABEL, 'Customer supplied');
      await expect(bomItemsPage.locators.rowCheckbox(LABEL, 'Customer supplied')).not.toBeChecked();
      await bomDetailPage.refresh();
      await expect(bomItemsPage.locators.rowCheckbox(LABEL, 'Customer supplied')).not.toBeChecked();
    });
  });

  test('TC:18 Verify the items filter narrows the table', async () => {
    await bomItemsPage.filterItems(THREAD);
    await expect.poll(() => bomItemsPage.itemIds()).toEqual([THREAD]);
    await bomItemsPage.filterItems('');
    await expect.poll(async () => (await bomItemsPage.itemIds()).length).toBeGreaterThan(1);
  });

  test("TC:19 Verify a line's alternate code opens the split form for its split type", async () => {
    await bomItemsPage.openSplitForm(FABRIC, 'Item Level Split Screen Form');
    await expect(
      bomItemsPage.locators.splitFormDialog('Item Level Split Screen Form'),
    ).toContainText(FABRIC);
    await bomItemsPage.closeDialog(
      bomItemsPage.locators.splitFormDialog('Item Level Split Screen Form'),
    );
  });

  test('TC:20 Verify "Split Details" opens the BOM-wide split list, empty for a BOM with no splits', async () => {
    const l = bomItemsPage.locators;
    const dialog = l.splitDetailsDialog;
    await bomItemsPage.openSplitDetails();
    await expect(dialog).toContainText(`${code} · rev 0 · 0 active`);
    await expect(dialog).toContainText('No split items found in this BOM.');
    await expect(l.splitDetailsDeleteButton).toHaveText('Delete (0)');
    await expect(l.splitDetailsDeleteButton).toBeDisabled();
    await expect(l.splitDetailsDeactivateButton).toHaveText('DeActive (0)');
    await expect(l.splitDetailsDeactivateButton).toBeDisabled();
    await bomItemsPage.closeDialog(dialog);
  });

  test('TC:21 Verify "Thread Items" opens the thread workspace listing the BOM\'s thread line', async () => {
    const l = bomItemsPage.locators;
    const dialog = l.threadItemsDialog;
    await bomItemsPage.openThreadItems();
    await expect(dialog).toContainText(new RegExp(`${code}\\s*Rev 0`));
    await expect(l.threadItemCheckbox(THREAD)).toBeVisible();
    await expect(l.threadItemsSaveButton).toBeDisabled();
    await bomItemsPage.closeDialog(dialog);
  });

  test('TC:22 Verify "Bulk paste" only lets you parse once something is pasted', async () => {
    const l = bomItemsPage.locators;
    await bomItemsPage.openBulkPaste();
    await expect(l.bulkPasteDialog).toContainText(
      'Paste rows from Excel, Google Sheets, or any techpack export. TSV and CSV are both supported.',
    );
    await expect(l.parseRowsButton).toBeDisabled();
    await l.bulkPasteInput.fill('Inventory ID\tBase Unit\nCPT0000001\tPCS');
    await expect(l.parseRowsButton).toBeEnabled();
    await bomItemsPage.closeDialog(l.bulkPasteDialog);
  });

  test('TC:23 Verify "Copy B.O.M" opens a source-BOM picker that says existing items are skipped', async () => {
    const l = bomItemsPage.locators;
    await bomItemsPage.openCopyBom();
    await expect(l.copyBomDialog).toContainText(
      'Pick a source BOM. Items already present in this BOM will be skipped.',
    );
    await expect(l.copySourceSearch).toBeVisible();
    await expect(l.copyBomDialog).toContainText('Latest revision');
    await bomItemsPage.closeDialog(l.copyBomDialog);
  });

  test('TC:24 Verify a BOM line has no "Section" field any more', async () => {
    const headers = await bomItemsPage.locators.itemColumnHeaders.allInnerTexts();
    expect(headers.length).toBeGreaterThan(5);
    expect(headers.some((h) => /^section$/i.test(h.trim()))).toBe(false);
  });
});
