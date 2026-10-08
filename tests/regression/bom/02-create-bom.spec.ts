import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { BomListPage } from '../../../src/pages/bom/bom-list.page';
import { BomDetailPage } from '../../../src/pages/bom/bom-detail.page';
import { BomItemsPage } from '../../../src/pages/bom/bom-items.page';
import { ShellHeaderPage } from '../../../src/pages/shell/shell-header.page';
import {
  createApprovedTechpack,
  DISPOSABLE_BOM_TIMEOUT,
  TEST_DATA_TAG,
} from './support/disposable-bom';

/**
 * BOM — Create BOM ("New BOM" → "Create BOM techpack").
 *
 * Source of truth for these cases: test-cases/bom/create-bom.md.
 *
 * Builds its own Approved techpack first (support/disposable-bom.ts) and
 * creates exactly one BOM for it — never a BOM for someone else's
 * techpack, since a techpack can only ever get one rev-0 BOM. Serial on
 * purpose: the cases walk one techpack from "eligible, no BOM" through
 * Cancel, Create, and "already has a BOM", so a later case is only
 * meaningful once the earlier one has happened. One browser tab is shared
 * across the file (as in the BOM smoke suite) so that hand-off is the
 * same page the user would be on.
 */
test.describe.serial('BOM - Create BOM', () => {
  let page: Page;
  let bomListPage: BomListPage;
  let bomDetailPage: BomDetailPage;
  let bomItemsPage: BomItemsPage;
  let shellHeaderPage: ShellHeaderPage;
  let techpackCode = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(DISPOSABLE_BOM_TIMEOUT);
    page = await browser.newPage({ storageState: authFile('bom') });
    bomListPage = new BomListPage(page);
    bomDetailPage = new BomDetailPage(page);
    bomItemsPage = new BomItemsPage(page);
    shellHeaderPage = new ShellHeaderPage(page);
    techpackCode = await createApprovedTechpack(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    test.setTimeout(120_000);
    await allure.epic('BOM');
    await allure.feature('Create BOM');
    await allure.owner('BOM QA');
  });

  test('TC:1 Verify "New BOM" opens the Create BOM techpack dialog in its empty state', async () => {
    const l = bomListPage.locators;
    await bomListPage.open();
    await bomListPage.openNewBomDialog();

    await test.step('Subtitle, "< NEW >" code field and the required-field markers', async () => {
      await expect(l.newBomDialog).toContainText(
        'Choose an approved techpack to seed the new BOM with customer, style, fabric and product details.',
      );
      await expect(l.selectTechpackButton).toHaveText('< NEW >');
      for (const field of ['Customer', 'Season', 'Style', 'Fabric', 'Wash', 'Product Type']) {
        await expect(l.newBomDialog).toContainText(`${field} required`);
      }
      await expect(l.newBomDialog).toContainText(
        'Select a techpack code using the search button to populate this form.',
      );
    });

    await test.step('"No techpack selected." and Create BOM is disabled', async () => {
      await expect(l.noTechpackSelected).toBeVisible();
      await expect(l.createBomButton).toBeDisabled();
    });

    await bomListPage.cancelNewBomDialog();
  });

  test('TC:2 Verify the techpack picker only offers Approved techpacks, including a freshly approved one', async () => {
    await bomListPage.open();
    await bomListPage.openNewBomDialog();
    await bomListPage.openTechpackPicker();

    await test.step('Every offered techpack is Approved, and the footer total matches the title count', async () => {
      const statuses = await bomListPage.techpackPickerColumnValues('Status');
      expect(statuses.length).toBeGreaterThan(0);
      expect(new Set(statuses)).toEqual(new Set(['Approved']));
      const total = await bomListPage.techpackPickerTotal();
      await expect(bomListPage.locators.techpackPickerFooter).toHaveText(
        new RegExp(`of ${total}$`),
      );
    });

    await test.step(`The just-approved ${techpackCode} is offered`, async () => {
      await bomListPage.searchTechpackPicker(techpackCode);
      await expect(bomListPage.locators.techpackPickerRow(techpackCode)).toBeVisible();
    });

    await bomListPage.closeTechpackPicker();
    await bomListPage.cancelNewBomDialog();
  });

  test('TC:3 Verify the picker search narrows to one techpack, and a non-match shows "Showing 0 of 0"', async () => {
    await bomListPage.open();
    await bomListPage.openNewBomDialog();
    await bomListPage.openTechpackPicker();

    await test.step('Searching the exact code leaves exactly that row', async () => {
      await bomListPage.searchTechpackPicker(techpackCode);
      await expect(bomListPage.locators.techpackPickerRows).toHaveCount(1);
      await expect(bomListPage.locators.techpackPickerFooter).toHaveText('Showing 1-1 of 1');
    });

    await test.step('A code that matches nothing empties the picker', async () => {
      await bomListPage.searchTechpackPicker(`NO-SUCH-TP-${Date.now()}`);
      await expect(bomListPage.locators.techpackPickerFooter).toHaveText('Showing 0 of 0');
      await expect(bomListPage.locators.techpackPickerRows).toHaveCount(0);
    });

    await bomListPage.closeTechpackPicker();
    await bomListPage.cancelNewBomDialog();
  });

  test('TC:4 Verify picking a techpack seeds the form from that techpack and enables Create BOM', async () => {
    const l = bomListPage.locators;
    await bomListPage.open();
    await bomListPage.openNewBomDialog();
    await bomListPage.openTechpackPicker();
    const seed = await bomListPage.techpackPickerRowValues(techpackCode, [
      'Customer',
      'Season',
      'Style',
      'Fabric Name',
      'Wash Name',
      'Product Name',
    ]);

    await test.step('Pick it — the picker closes and the footer reads "Techpack <code> ready."', async () => {
      await bomListPage.pickTechpack(techpackCode);
      await expect(l.selectTechpackButton).toHaveText(techpackCode);
    });

    await test.step('Customer, Season, Style, Fabric, Wash and Product Type come from the techpack', async () => {
      for (const value of Object.values(seed)) {
        expect(value, 'picker row value').not.toBe('');
        await expect(l.newBomDialog).toContainText(value);
      }
      await expect(l.newBomDialog).toContainText(
        'Techpack selected. Items can be added after the BOM is created.',
      );
    });

    await test.step('Create BOM is enabled', async () => {
      await expect(l.createBomButton).toBeEnabled();
    });

    await bomListPage.cancelNewBomDialog();
  });

  test('TC:5 Verify Cancel after picking a techpack creates nothing', async () => {
    await bomListPage.open();

    await test.step('Pick the techpack, then Cancel', async () => {
      await bomListPage.openNewBomDialog();
      await bomListPage.openTechpackPicker();
      await bomListPage.pickTechpack(techpackCode);
      await bomListPage.cancelNewBomDialog();
    });

    await test.step('No BOM exists for it in the list', async () => {
      await bomListPage.search(techpackCode);
      await expect(bomListPage.locators.rows).toHaveCount(0);
    });

    await test.step('It is still offered in the picker', async () => {
      await bomListPage.openNewBomDialog();
      await bomListPage.openTechpackPicker();
      await bomListPage.searchTechpackPicker(techpackCode);
      await expect(bomListPage.locators.techpackPickerRow(techpackCode)).toBeVisible();
      await bomListPage.closeTechpackPicker();
      await bomListPage.cancelNewBomDialog();
    });
  });

  test('TC:6 Verify Create BOM sends only the techpack code, confirms, and opens the new BOM at rev 0', async () => {
    await bomListPage.open();
    await bomListPage.openNewBomDialog();
    await bomListPage.openTechpackPicker();
    await bomListPage.pickTechpack(techpackCode);

    const request = await test.step('Create BOM', async () => bomListPage.createBom(techpackCode));

    await test.step('The create request body is exactly { techpackCode }', async () => {
      expect(request.postDataJSON()).toEqual({ techpackCode });
    });

    await test.step('A "BOM created" toast, and the detail page for rev 0', async () => {
      await bomDetailPage.expectToast(`BOM created for ${techpackCode}`);
      await bomDetailPage.expectOpenFor(techpackCode, 0);
    });
  });

  test('TC:7 Verify a new BOM starts Open, unlocked, not completed, unapproved and empty', async () => {
    await bomDetailPage.open(techpackCode, 0);
    const d = bomDetailPage.locators;

    await test.step('Header: rev 00, Open, UNLOCKED, not completed, created by the current user', async () => {
      expect(await bomDetailPage.headerField('B.O.M Code')).toBe(techpackCode);
      expect(await bomDetailPage.headerField('B.O.M Rev No.')).toBe('00');
      expect(await bomDetailPage.status()).toBe('Open');
      expect(await bomDetailPage.headerField('Lock Status')).toBe('UNLOCKED');
      await expect(d.notCompletedIcon).toBeVisible();
      const createdBy = await bomDetailPage.headerField('Created by');
      expect(createdBy).not.toMatch(/^(N\/A|—|)$/);
      await expect(shellHeaderPage.locators.userMenuButton).toContainText(createdBy);
      expect(await bomDetailPage.headerField('Approved Date')).toBe('—');
      expect(await bomDetailPage.headerField('Approved By')).toBe('—');
    });

    await test.step('No items yet, so no approve action is offered', async () => {
      expect(await bomDetailPage.itemCount()).toBe(0);
      await expect(bomItemsPage.locators.emptyState).toBeVisible();
      await expect(d.costingApproveButton).toHaveCount(0);
      await expect(d.validateAndLockButton).toHaveCount(0);
      await expect(d.addLineButton).toBeVisible();
    });
  });

  test('TC:8 Verify the new BOM appears in the list as Open, B.O.M rev 0, not completed', async () => {
    // Also a regression check for ClickUp z941abwgtw (a new BOM's
    // status_name wasn't stored, so the list's Status read blank).
    await allure.tms('https://app.clickup.com/t/z941abwgtw', 'z941abwgtw (ClickUp)');
    await bomListPage.open();
    await bomListPage.searchFor(techpackCode);

    expect(await bomListPage.columnValues('Status')).toEqual(['Open']);
    expect(await bomListPage.columnValues('B.O.M Rev No')).toEqual(['0']);
    expect(await bomListPage.columnValues('Completed')).toEqual(['No']);
    expect(await bomListPage.columnValues('Approved Date')).toEqual(['']);
    // The suite's test-data tag carries through to the BOM, so it's identifiable for clean-up.
    expect(await bomListPage.columnValues('Remark')).toEqual([TEST_DATA_TAG]);
  });

  test('TC:9 Verify a techpack that already has a BOM is no longer offered by New BOM', async () => {
    await bomListPage.open();
    await bomListPage.openNewBomDialog();
    await bomListPage.openTechpackPicker();
    await bomListPage.searchTechpackPicker(techpackCode);
    await expect(bomListPage.locators.techpackPickerFooter).toHaveText('Showing 0 of 0');
    await bomListPage.closeTechpackPicker();
    await bomListPage.cancelNewBomDialog();
  });

  test('TC:10 Verify the detail page\'s "B.O.M Code" opens a BOM switcher that lists this BOM', async () => {
    await bomDetailPage.open(techpackCode, 0);
    const l = bomListPage.locators;

    await test.step('"B.O.M Code" opens "Pick a techpack to open its BOM."', async () => {
      await bomDetailPage.locators.bomCodeButton.click();
      await bomListPage.expectTechpackPickerLoaded();
      await expect(l.techpackPickerDialog).toContainText('Pick a techpack to open its BOM.');
    });

    await test.step('This techpack is listed there', async () => {
      await bomListPage.searchTechpackPicker(techpackCode);
      await expect(l.techpackPickerRow(techpackCode)).toBeVisible();
    });

    await bomListPage.closeTechpackPicker();
  });
});
