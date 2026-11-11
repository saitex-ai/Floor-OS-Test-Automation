import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { BomDetailPage } from '../../../src/pages/bom/bom-detail.page';
import { BomItemsPage } from '../../../src/pages/bom/bom-items.page';
import {
  createDisposableBom,
  DISPOSABLE_BOM_TIMEOUT,
  MATERIALS_REDESIGN,
} from './support/disposable-bom';

/**
 * BOM — Items (the "B.O.M Items" table on an Open BOM).
 *
 * Source of truth for these cases: test-cases/bom/bom-items.md.
 *
 * Every case runs on a disposable BOM this file builds for itself
 * (support/disposable-bom.ts) — never someone else's. One browser tab is
 * shared across the file (as in the BOM smoke suite); default (not
 * serial) mode, so one failure doesn't skip the rest — a fresh worker
 * just builds a fresh BOM.
 *
 * Since the materials redesign (dev 2026-11-05, uat by 2026-11-11) items
 * are added with "Add material": products from the product catalogue,
 * one product line each. Which products the catalogue offers is data
 * (13 on dev, 1 on uat on 2026-11-11), so cases pick whatever it offers
 * and a case that needs a line adds the first offered product when the
 * BOM has none. The cases written for "Add line" with no equivalent on
 * the redesign (description and UOM edits with a reason, split-type
 * checkboxes, destination split, the items filter, the alternate-code
 * split form, Thread Items) skip on it with MATERIALS_REDESIGN until new
 * cases are written from its prototype.
 */

/**
 * Baseline lines for the "Add line" cases, seeded only on a BOM without
 * the materials redesign — MDM codes present on both uat and dev (dev has
 * no ZIP0000004/BUT0000002). THD is a thread item — it can't be
 * destination-split.
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
  let redesign = false;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(DISPOSABLE_BOM_TIMEOUT);
    page = await browser.newPage({ storageState: authFile('bom') });
    bomDetailPage = new BomDetailPage(page);
    bomItemsPage = new BomItemsPage(page);
    code = await createDisposableBom(page);
    redesign = await bomDetailPage.hasMaterialsWorkspace();
    if (!redesign) await bomItemsPage.addLines(BASELINE);
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

  test('TC:1 Verify "Add material" opens the product catalogue picker', async () => {
    const l = bomItemsPage.locators;
    await bomItemsPage.openAddMaterial();

    await test.step('Title, search box, Category filter, "Show SKUs awaiting approval" and the product table', async () => {
      await expect(l.addMaterialDialog).toContainText('Pick the materials.');
      await expect(l.materialSearchBox).toBeVisible();
      await expect(l.materialCategorySelect).toBeVisible();
      await expect(l.showAwaitingApprovalCheckbox).toBeVisible();
      await expect(l.materialPickCheckboxes.first()).toBeVisible();
    });

    await test.step('"Add lines" is disabled until a product is picked, then counts it', async () => {
      await expect(l.addLinesButton).toBeDisabled();
      const [first] = await bomItemsPage.offeredMaterialCodes();
      await bomItemsPage.pickMaterials([first!]);
      await bomItemsPage.unpickMaterial(first!);
      await expect(l.addLinesButton).toBeDisabled();
    });

    await test.step('A search with no match says so', async () => {
      await l.materialSearchBox.fill(`QA-AUTO no such material ${Date.now()}`);
      await expect(l.materialNoMatchHeading).toBeVisible();
    });

    await bomItemsPage.closeAddMaterial();
  });

  test('TC:2 Verify adding one material adds one product line and bumps the item count', async () => {
    const before = await bomDetailPage.itemCount();
    await bomItemsPage.openAddMaterial();
    const [product] = await bomItemsPage.offeredMaterialCodes();
    await bomItemsPage.closeAddMaterial();

    await bomItemsPage.addMaterials([product!]);
    await bomDetailPage.expectToast('Added 1 line.');
    await bomDetailPage.expectItemCount(before + 1);
  });

  test('TC:3 Verify adding several materials at once adds one line per product', async () => {
    const onBom = await bomItemsPage.productLineCodes();
    await bomItemsPage.openAddMaterial();
    const fresh = [...new Set(await bomItemsPage.offeredMaterialCodes())].filter(
      (product) => !onBom.includes(product),
    );
    await bomItemsPage.closeAddMaterial();
    test.skip(
      fresh.length < 2,
      `"Add material" offers ${fresh.length} product(s) not on this BOM yet; this case needs 2 (catalogue data).`,
    );

    const before = await bomDetailPage.itemCount();
    await bomItemsPage.addMaterials(fresh.slice(0, 2));
    await bomDetailPage.expectToast(/^Added 2 lines?\./);
    await bomDetailPage.expectItemCount(before + 2);
  });

  test('TC:4 Verify a product already on the BOM can\'t be picked again in "Add material"', async () => {
    const product = await bomItemsPage.ensureProductLine();
    await bomItemsPage.openAddMaterial();
    await bomItemsPage.searchMaterial(product);
    // "Add line" hid items already on the BOM; "Add material" lists them
    // with Pick disabled and the line they're on (dev and uat, 2026-11-11).
    await expect(bomItemsPage.locators.materialPickCheckbox(product).first()).toBeDisabled();
    await expect(bomItemsPage.locators.materialStatusCell(product).first()).toHaveText(
      /^On this BOM · line \d+$/,
    );
    await bomItemsPage.closeAddMaterial();
  });

  test('TC:5 Verify product lines are grouped under category headers whose counts add up', async () => {
    await bomItemsPage.ensureProductLine();
    const lines = (await bomItemsPage.productLineCodes()).length;
    const counts = await bomItemsPage.categoryLineCounts();
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(lines);
  });

  test('TC:6 Verify deleting a line asks to confirm, Cancel keeps it, and Delete removes it', async () => {
    const product = await bomItemsPage.ensureProductLine();
    const before = await bomDetailPage.itemCount();

    await test.step('Delete asks to confirm, warning it also removes splits', async () => {
      await bomItemsPage.openDeleteProductLine(product);
      await expect(bomItemsPage.locators.deleteLineDialog).toContainText(
        `Delete "${product}"? This removes the line and all its splits — this cannot be undone.`,
      );
    });

    await test.step('Cancel keeps the line', async () => {
      await bomItemsPage.cancelDelete();
      await expect(bomItemsPage.locators.productLine(product).first()).toBeVisible();
    });

    await test.step('Delete removes it', async () => {
      await bomItemsPage.deleteProductLine(product);
      await bomDetailPage.expectItemCount(before - 1);
    });
  });

  test('TC:7 Verify editing a description cannot be saved without a reason', async () => {
    // Materials redesign: No description edit on a product line (the material comes from the catalogue).
    test.skip(redesign, MATERIALS_REDESIGN);
    const l = bomItemsPage.locators;
    await bomItemsPage.openEditDescription(FABRIC);

    await test.step('Save is disabled, with "Save disabled until you record why."', async () => {
      await expect(l.descriptionSaveButton).toBeDisabled();
      await expect(l.descriptionReasonHint).toBeVisible();
    });

    await test.step('A changed description alone still leaves Save disabled', async () => {
      // The dialog can still be loading the line's current text when it
      // opens, which would overwrite what was typed, so check it stuck.
      const description = `QA regression description ${Date.now()}`;
      await expect(async () => {
        await l.descriptionInput.fill(description);
        await expect(l.descriptionInput).toHaveValue(description, { timeout: 2_000 });
      }).toPass({ timeout: 15_000 });
      await expect(l.descriptionSaveButton).toBeDisabled();
    });

    await test.step('Adding a reason enables Save', async () => {
      await l.descriptionReasonInput.fill('QA regression: reason gate check');
      await expect(l.descriptionReasonInput).toHaveValue('QA regression: reason gate check');
      await expect(l.descriptionSaveButton).toBeEnabled();
    });

    await test.step('Close without saving — nothing is staged', async () => {
      await bomItemsPage.closeDialog(l.editDescriptionDialog);
      await expect(l.pendingChanges).toBeHidden();
    });
  });

  test('TC:8 Verify a description edit with a reason is staged, then saved with a confirmation', async () => {
    // Materials redesign: No description edit on a product line (the material comes from the catalogue).
    test.skip(redesign, MATERIALS_REDESIGN);
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
    // Materials redesign: No staged edits on a product line.
    test.skip(redesign, MATERIALS_REDESIGN);
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
    // Materials redesign: The UOM comes from the product; there is no UOM change with a reason.
    test.skip(redesign, MATERIALS_REDESIGN);
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

  test('TC:11 Verify a Remark saves on its own and is still there after a refresh', async () => {
    const product = await bomItemsPage.ensureProductLine();
    const remark = `QA-AUTO remark ${Date.now()}`;
    await bomItemsPage.setProductLineRemark(product, remark);
    await bomDetailPage.refresh();
    await expect(bomItemsPage.locators.productLineRemarkInput(product).first()).toHaveValue(remark);
  });

  test('TC:12 Verify the split types are mutually exclusive — ticking Waist split replaces Item-level split', async () => {
    // Materials redesign: Split-type checkboxes became the "Changes with" select (No split / Inseam / Waist / Inseam + Waist).
    test.skip(redesign, MATERIALS_REDESIGN);
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
    // Materials redesign: Split-type checkboxes became the "Changes with" select (No split / Inseam / Waist / Inseam + Waist).
    test.skip(redesign, MATERIALS_REDESIGN);
    await bomItemsPage.switchSplitType(PACKAGING, 'Inseam split');
    await bomItemsPage.clickCheckbox(PACKAGING, 'Inseam split');
    await expect.poll(() => bomItemsPage.activeSplitTypes(PACKAGING)).toEqual(['Item-level split']);
  });

  test('TC:14 Verify "Show barcode" is only available on a GMT size set line', async () => {
    // Materials redesign: No "Show barcode" / GMT size set on a product line.
    test.skip(redesign, MATERIALS_REDESIGN);
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
    // Materials redesign: Destination split became the "Destinations" column (z941aby8eb was about the old checkbox).
    test.skip(redesign, MATERIALS_REDESIGN);
    await allure.tms('https://app.clickup.com/t/z941aby8eb', 'TC:15 bug (ClickUp)');
    // Regression check for ClickUp z941aby8eb (2026-10-08: ticking
    // Destination split on a THD line saved silently). In every run since
    // 2026-10-23, each on a fresh BOM, it has been refused: with a toast on
    // dev (POST …/items/<THD> → 400 THD_NO_DESTINATION_SPLIT), and with a
    // "Not Allowed" dialog on uat since its 2026-10-26 deploy. The bug has
    // been retested and is closed (Done) in ClickUp. The cleanup step
    // unticks it again if it ever saves, so the rest of this file sees the
    // line as seeded.
    const l = bomItemsPage.locators;

    await test.step('Its country cell shows "—" (or "-") instead of "Pick country"', async () => {
      await expect(l.rowPickCountryButton(THREAD)).toHaveCount(0);
      await expect(l.rowNoCountryCell(THREAD)).toBeVisible();
    });

    let failure: unknown;
    try {
      await test.step('Ticking Destination split is refused ("Not Allowed" dialog or toast)', async () => {
        await bomItemsPage.clickCheckbox(THREAD, 'Destination split');
        await bomItemsPage.expectRefused('THD items are NOT ALLOWED to do Destination Split!');
      });

      await test.step('After a refresh, the thread line still has no Destination split', async () => {
        await bomDetailPage.refresh();
        expect(await bomItemsPage.activeSplitTypes(THREAD)).not.toContain('Destination split');
      });
    } catch (error) {
      failure = error;
    }

    // Undo it if it did save, so later cases see the line as seeded. If the
    // test has already failed, a cleanup error is recorded instead of thrown,
    // so it can't replace the real failure.
    try {
      await bomDetailPage.refresh();
      if (await bomItemsPage.isChecked(THREAD, 'Destination split')) {
        await bomItemsPage.clickCheckbox(THREAD, 'Destination split');
        await expect(l.rowCheckbox(THREAD, 'Destination split')).not.toBeChecked();
      }
    } catch (cleanupError) {
      if (failure === undefined) throw cleanupError;
      test.info().annotations.push({
        type: 'cleanup',
        description: `Could not untick Destination split on ${THREAD}: ${String(cleanupError).split('\n')[0]}`,
      });
    }
    if (failure !== undefined) throw failure;
  });

  test('TC:16 Verify "Pick country" turns on Destination split and opens the country picker', async () => {
    // Materials redesign: Destination split became the "Destinations" column; no "Pick country".
    test.skip(redesign, MATERIALS_REDESIGN);
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
    const product = await bomItemsPage.ensureProductLine();
    const box = bomItemsPage.locators.productLineCustomerSuppliedCheckbox(product).first();
    const initial = await box.isChecked();

    await test.step('Toggle it — still toggled after a refresh', async () => {
      await bomItemsPage.toggleCustomerSupplied(product);
      await expect(box).toBeChecked({ checked: !initial });
      await bomDetailPage.refresh();
      await expect(box).toBeChecked({ checked: !initial });
    });

    await test.step('Toggle it back — still back after a refresh', async () => {
      await bomItemsPage.toggleCustomerSupplied(product);
      await expect(box).toBeChecked({ checked: initial });
      await bomDetailPage.refresh();
      await expect(box).toBeChecked({ checked: initial });
    });
  });

  test('TC:18 Verify the items filter narrows the table', async () => {
    // Materials redesign: No items filter on the product lines table.
    test.skip(redesign, MATERIALS_REDESIGN);
    await bomItemsPage.filterItems(THREAD);
    await expect.poll(() => bomItemsPage.itemIds()).toEqual([THREAD]);
    await bomItemsPage.filterItems('');
    await expect.poll(async () => (await bomItemsPage.itemIds()).length).toBeGreaterThan(1);
  });

  test("TC:19 Verify a line's alternate code opens the split form for its split type", async () => {
    // Materials redesign: The alternate-code split form became the "Variants & consumption" dialog.
    test.skip(redesign, MATERIALS_REDESIGN);
    await bomItemsPage.openSplitForm(FABRIC, 'Item Level Split Screen Form');
    await expect(
      bomItemsPage.locators.splitFormDialog('Item Level Split Screen Form'),
    ).toContainText(FABRIC);
    await bomItemsPage.closeDialog(
      bomItemsPage.locators.splitFormDialog('Item Level Split Screen Form'),
    );
  });

  test('TC:20 Verify the "Split Details" tab lists the BOM\'s split rows', async () => {
    const product = await bomItemsPage.ensureProductLine();
    await bomItemsPage.showSplitDetailsTab();
    expect(await bomItemsPage.splitDetailsColumnHeaders()).toEqual(
      expect.arrayContaining([
        'Material',
        'SKU',
        'Filled by',
        'Colour',
        'Size',
        'Changes with',
        'Destinations',
        'Std cons',
      ]),
    );
    await expect(bomItemsPage.locators.splitDetailsRow(product).first()).toBeVisible();
  });

  test('TC:21 Verify "Thread Items" opens the thread workspace listing the BOM\'s thread line', async () => {
    // Materials redesign: No "Thread Items" tab; Thread is a catalogue category.
    test.skip(redesign, MATERIALS_REDESIGN);
    const l = bomItemsPage.locators;
    const dialog = l.threadItemsDialog;
    await bomItemsPage.openThreadItems();
    await expect(dialog).toContainText(new RegExp(`${code}\\s*Rev 0`));
    await expect(l.threadItemCheckbox(THREAD)).toBeVisible();
    await expect(l.threadItemsSaveButton).toBeDisabled();
    await bomItemsPage.closeDialog(dialog);
  });

  test('TC:22 Verify "Bulk paste" only lets you read rows once something is pasted', async () => {
    const l = bomItemsPage.locators;
    await bomItemsPage.openBulkPaste();
    await expect(l.bulkPasteDialog).toContainText(
      'One row per material, from Excel or Google Sheets',
    );
    await expect(l.parseRowsButton).toBeDisabled();
    await l.bulkPasteInput.fill('Alternate Code\tColour\tStd cons\nQA-AUTO-0001\t\t1');
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
    await bomItemsPage.ensureProductLine();
    const headers = await bomItemsPage.locators.productLineColumnHeaders.allInnerTexts();
    expect(headers.length).toBeGreaterThan(5);
    expect(headers.some((h) => /^section$/i.test(h.trim()))).toBe(false);
  });
});
