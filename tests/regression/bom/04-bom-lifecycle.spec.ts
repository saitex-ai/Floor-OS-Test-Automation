import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { BomListPage } from '../../../src/pages/bom/bom-list.page';
import { BomDetailPage } from '../../../src/pages/bom/bom-detail.page';
import { BomItemsPage } from '../../../src/pages/bom/bom-items.page';
import { createDisposableBom, DISPOSABLE_BOM_TIMEOUT } from './support/disposable-bom';

/**
 * BOM — Lifecycle (approve, complete, reopen, revise, reports).
 *
 * Source of truth for these cases: test-cases/bom/bom-lifecycle.md.
 *
 * Walks one disposable BOM (support/disposable-bom.ts — never someone
 * else's) through its real lifecycle on the live app: rev 0 Open →
 * Costing Approve → complete/un-complete → Reopen → re-approve → Create
 * Revision → rev 1 Open → Validate & Lock. Serial on purpose: each case
 * is a step in that one state machine, so a later case is only
 * meaningful once the earlier one has happened. Create Costing Request
 * is opened and cancelled, never submitted — submitting would raise a
 * real request in the Costing team's queue.
 */

const FABRIC = 'FAB0000002';
const LINES = [FABRIC, 'LBL0000001', 'TAG0000002', 'THD0000001'];

test.describe.serial('BOM - Lifecycle', () => {
  let page: Page;
  let bomListPage: BomListPage;
  let bomDetailPage: BomDetailPage;
  let bomItemsPage: BomItemsPage;
  let code = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(DISPOSABLE_BOM_TIMEOUT);
    page = await browser.newPage({ storageState: authFile('bom') });
    bomListPage = new BomListPage(page);
    bomDetailPage = new BomDetailPage(page);
    bomItemsPage = new BomItemsPage(page);
    code = await createDisposableBom(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    test.setTimeout(150_000);
    await allure.epic('BOM');
    await allure.feature('BOM Lifecycle');
    await allure.owner('BOM QA');
  });

  test('TC:1 Verify an Open BOM with no items offers no approve action', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    expect(await bomDetailPage.itemCount()).toBe(0);
    await expect(d.addLineButton).toBeVisible();
    await expect(d.costingApproveButton).toHaveCount(0);
    await expect(d.validateAndLockButton).toHaveCount(0);
  });

  test('TC:2 Verify rev 0 with items offers "Costing Approve", not "Validate & Lock"', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    await bomItemsPage.addLines(LINES);
    await bomDetailPage.expectItemCount(LINES.length);
    await expect(d.costingApproveButton).toBeEnabled();
    await expect(d.validateAndLockButton).toHaveCount(0);
  });

  test('TC:3 Verify "Costing Approve" asks to confirm, and Cancel leaves the BOM Open', async () => {
    await bomDetailPage.open(code, 0);
    await bomDetailPage.openCostingApproveDialog();
    await expect(bomDetailPage.locators.costingApproveDialog).toContainText(
      'Are you sure you want to costing-approve this B.O.M TechPack?',
    );
    await bomDetailPage.cancelCostingApproveDialog();
    expect(await bomDetailPage.status()).toBe('Open');
  });

  test('TC:4 Verify "Costing Approve" approves and locks rev 0, stamping who and when', async () => {
    await bomDetailPage.open(code, 0);
    const createdBy = await bomDetailPage.headerField('Created by');

    await test.step('Approve', async () => {
      await bomDetailPage.costingApprove();
    });

    await test.step('Approved, LOCKED, approved today by the current user, snapshot v0', async () => {
      await bomDetailPage.refresh();
      expect(await bomDetailPage.status()).toBe('Approved');
      expect(await bomDetailPage.headerField('Lock Status')).toBe('LOCKED');
      expect(await bomDetailPage.headerField('Approved By')).toBe(createdBy);
      expect(await bomDetailPage.headerField('Approved Date')).toBe(
        await bomDetailPage.headerField('Created Date'),
      );
      await expect(bomDetailPage.locators.lockedBanner).toHaveText('BOM locked — snapshot v0.');
    });
  });

  test('TC:5 Verify an Approved BOM is read-only', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    await expect(d.addLineButton).toHaveCount(0);
    await expect(d.bulkPasteButton).toHaveCount(0);
    await expect(d.copyBomButton).toHaveCount(0);
    await expect(d.costingApproveButton).toHaveCount(0);
    await expect(d.threadItemsTab).toBeDisabled();
    await expect(bomItemsPage.locators.rowCheckbox(FABRIC, 'Waist split')).toBeDisabled();
    await expect(bomItemsPage.locators.rowCheckbox(FABRIC, 'Customer supplied')).toBeDisabled();
    await expect(bomItemsPage.locators.rowDeleteButton(FABRIC)).toHaveCount(0);
  });

  test('TC:6 Verify an Approved BOM offers Reopen, Mark complete, Create Revision and Create Costing Request', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    for (const button of [
      d.reopenButton,
      d.markCompleteButton,
      d.createRevisionButton,
      d.createCostingRequestButton,
      d.reportsButton,
      d.exportButton,
    ]) {
      await expect(button).toBeEnabled();
    }
  });

  test('TC:7 Verify the BOM shows as Approved in the list, with its approver', async () => {
    await bomListPage.open();
    await bomListPage.searchFor(code);
    expect(await bomListPage.columnValues('Status')).toEqual(['Approved']);
    const [approvedBy] = await bomListPage.columnValues('Approved By');
    expect(approvedBy).not.toBe('');
    expect(approvedBy).not.toMatch(/^[0-9a-f]{8}-/i);
  });

  test('TC:8 Verify "Create Costing Request" asks for wash types and an estimated quantity', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    await bomDetailPage.openCostingRequestDialog();
    await expect(d.costingRequestDialog).toContainText(`From BOM Rev 00 of ${code}.`);
    await expect(d.costingRequestWashTypes).toBeVisible();
    await expect(d.costingRequestQuantity).toBeVisible();
    await expect(d.costingRequestDialog).toContainText('Whole units only, 1–9,999,999.');
    // Opened and cancelled only — submitting raises a real Costing request.
    await bomDetailPage.cancelCostingRequestDialog();
  });

  test('TC:9 Verify "Mark complete" asks to confirm, then marks the BOM completed', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);

    await test.step('The confirm asks to tick it completed', async () => {
      await bomDetailPage.openCompleteDialog(true);
      await expect(d.completeDialog).toContainText(
        'Are you sure you want to tick this BOM Tech Pack completed?',
      );
      await bomDetailPage.locators.dialogButton(d.completeDialog, 'Cancel').click();
    });

    await test.step('Complete — the header checkbox and toolbar flip to "not complete"', async () => {
      await bomDetailPage.setCompleted(true);
      await expect(d.completedCheckbox).toBeChecked();
    });

    await test.step('The list shows Completed "Yes"', async () => {
      await bomListPage.open();
      await bomListPage.searchFor(code);
      expect(await bomListPage.columnValues('Completed')).toEqual(['Yes']);
    });
  });

  test('TC:10 Verify "Mark not complete" asks to un-tick, then clears the completed flag', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);

    await bomDetailPage.openCompleteDialog(false);
    await expect(d.completeDialog).toContainText(
      'Are you sure you want to un-tick this BOM Tech Pack completed?',
    );
    await bomDetailPage.locators.dialogButton(d.completeDialog, 'Cancel').click();
    await bomDetailPage.setCompleted(false);
    await expect(d.completedCheckbox).not.toBeChecked();

    await bomListPage.open();
    await bomListPage.searchFor(code);
    expect(await bomListPage.columnValues('Completed')).toEqual(['No']);
  });

  test('TC:11 Verify Reopen requires a reason of at least 10 characters', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    await bomDetailPage.openReopenDialog();

    await test.step('The dialog warns about the downstream BOM_UNLOCKED event', async () => {
      await expect(d.reopenDialog).toContainText(
        'Re-opening sends a BOM_UNLOCKED event downstream — cost sheets and sample SOs will need re-cost.',
      );
    });

    await test.step('Empty → Re-Open disabled, "at least 10 characters (currently 0)"', async () => {
      await expect(d.reopenSubmitButton).toBeDisabled();
      await expect(d.reopenDialog).toContainText(
        'Reason must be at least 10 characters (currently 0).',
      );
    });

    await test.step('9 characters → still disabled', async () => {
      await d.reopenReasonInput.fill('123456789');
      await expect(d.reopenDialog).toContainText('(currently 9)');
      await expect(d.reopenSubmitButton).toBeDisabled();
    });

    await test.step('10 characters → enabled, with a "/200" counter', async () => {
      await d.reopenReasonInput.fill('1234567890');
      await expect(d.reopenSubmitButton).toBeEnabled();
      await expect(d.reopenDialog).toContainText('10/200');
    });

    await bomDetailPage.cancelReopenDialog();
    expect(await bomDetailPage.status()).toBe('Approved');
  });

  test('TC:12 Verify Reopen with a reason unlocks the BOM back to Open and editable', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);

    await bomDetailPage.reopen('QA regression: reopen check, buyer trim change');
    await bomDetailPage.expectToast('BOM unlocked. Cost sheets may need recosting.');

    await bomDetailPage.refresh();
    expect(await bomDetailPage.status()).toBe('Open');
    expect(await bomDetailPage.headerField('Lock Status')).toBe('UNLOCKED');
    expect(await bomDetailPage.headerField('Approved By')).toBe('—');
    await expect(d.addLineButton).toBeVisible();
    await expect(d.costingApproveButton).toBeEnabled();
  });

  test('TC:13 Verify "Create Revision" asks to confirm, then creates rev 1 alongside rev 0', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 0);
    await bomDetailPage.costingApprove();

    await test.step('The confirm says items and splits are copied', async () => {
      await bomDetailPage.openCreateRevisionDialog();
      await expect(d.createRevisionDialog).toContainText(
        'Create a new BOM revision? This will copy all current items and splits.',
      );
      await bomDetailPage.locators.dialogButton(d.createRevisionDialog, 'Cancel').click();
    });

    await test.step('Create it — rev 0 now offers "Open latest"', async () => {
      await bomDetailPage.submitCreateRevision();
      await expect(d.openLatestButton).toBeVisible();
    });

    await test.step('The revisions picker lists rev 1 (draft) and rev 0 (validated)', async () => {
      await bomDetailPage.openRevisionsPicker();
      await expect(d.revisionsSummary).toHaveText('2 of 2 revisions — click to open.');
      expect(await bomDetailPage.revisionStatus(1)).toBe('DRAFT');
      expect(await bomDetailPage.revisionStatus(0)).toBe('VALIDATED');
    });
  });

  test('TC:14 Verify rev 1 opens from the revisions picker as Open, unlocked, with the items copied', async () => {
    await bomDetailPage.open(code, 0);
    await bomDetailPage.openRevisionsPicker();
    await bomDetailPage.openRevisionFromPicker(1, code);

    expect(await bomDetailPage.headerField('B.O.M Rev No.')).toBe('01');
    expect(await bomDetailPage.status()).toBe('Open');
    expect(await bomDetailPage.headerField('Lock Status')).toBe('UNLOCKED');
    await bomDetailPage.expectItemCount(LINES.length);
    for (const id of LINES) await bomItemsPage.expectItemPresent(id);
  });

  test('TC:15 Verify rev 1 (not rev 0) offers "Validate & Lock" instead of "Costing Approve"', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 1);
    await expect(d.validateAndLockButton).toBeEnabled();
    await expect(d.costingApproveButton).toHaveCount(0);
  });

  test('TC:16 Verify "Validate & Lock" asks to confirm, then approves and locks rev 1', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 1);

    await bomDetailPage.openValidateAndLockDialog();
    await expect(d.validateAndLockDialog).toContainText(
      'This will run server-side validation and lock the BOM as VALIDATED.',
    );
    await bomDetailPage.locators.dialogButton(d.validateAndLockDialog, 'Validate & Lock').click();
    await bomDetailPage.expectStatus('Approved');

    await bomDetailPage.refresh();
    expect(await bomDetailPage.headerField('Lock Status')).toBe('LOCKED');
    await expect(d.lockedBanner).toHaveText('BOM locked — snapshot v1.');
    await bomDetailPage.openRevisionsPicker();
    expect(await bomDetailPage.revisionStatus(1)).toBe('VALIDATED');
    await bomDetailPage.closeRevisionsPicker();
  });

  test('TC:17 Verify the Reports menu lists BOM Report, THD Report and Trim Card', async () => {
    const d = bomDetailPage.locators;
    await bomDetailPage.open(code, 1);
    await bomDetailPage.openReportsMenu();
    await expect(d.bomReportItem).toBeVisible();
    await expect(d.thdReportItem).toBeVisible();
    await expect(d.trimCardItem).toBeVisible();
    await bomDetailPage.closeReportsMenu();
  });

  test('TC:18 Verify Export offers five formats per report, and Excel downloads a revision-named file', async () => {
    await bomDetailPage.open(code, 1);

    await test.step('PDF, HTML, Excel, CSV and Word under each of the three reports', async () => {
      await bomDetailPage.openExportMenu();
      for (const kind of ['BOM Report', 'THD Report', 'Trim Card'] as const) {
        expect(await bomDetailPage.exportFormatsFor(kind)).toEqual([
          'PDF',
          'HTML',
          'Excel (.xlsx)',
          'CSV',
          'Word (.doc)',
        ]);
      }
      await bomDetailPage.closeExportMenu();
    });

    await test.step('BOM Report → Excel downloads bom-<code>-rev01.xlsx', async () => {
      const download = await bomDetailPage.exportReport('BOM Report', 'Excel (.xlsx)');
      expect(download.suggestedFilename()).toBe(`bom-${code}-rev01.xlsx`);
    });
  });

  test('TC:19 Verify the revisions picker opens an older revision', async () => {
    await bomDetailPage.open(code, 1);
    await bomDetailPage.openRevisionsPicker();
    await bomDetailPage.openRevisionFromPicker(0, code);
    expect(await bomDetailPage.headerField('B.O.M Rev No.')).toBe('00');
  });
});

/**
 * TC:20/TC:21 — what an *older* revision still offers once a newer one is
 * Open. Kept out of the serial chain above so a failure here (both are
 * known-bad on uat, 2026-10-08: the refusals give misleading reasons)
 * can't skip the rest of the lifecycle. Default mode: in order in one
 * worker, and a fresh worker rebuilds the same starting state — rev 0
 * Approved, rev 1 Open — if one of them fails.
 */
test.describe('BOM - Lifecycle (older revisions)', () => {
  test.describe.configure({ mode: 'default' });
  let page: Page;
  let bomDetailPage: BomDetailPage;
  let code = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(DISPOSABLE_BOM_TIMEOUT);
    page = await browser.newPage({ storageState: authFile('bom') });
    bomDetailPage = new BomDetailPage(page);
    code = await createDisposableBom(page);
    await new BomItemsPage(page).addLines(LINES);
    await bomDetailPage.costingApprove();
    await bomDetailPage.submitCreateRevision();
    await expect(bomDetailPage.locators.openLatestButton).toBeVisible();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    test.setTimeout(150_000);
    await allure.epic('BOM');
    await allure.feature('BOM Lifecycle');
    await allure.owner('BOM QA');
  });

  test('TC:20 Verify reopening an older revision while a newer one is Open is refused with a clear reason', async () => {
    await bomDetailPage.open(code, 0);

    const toasts = await test.step('Submit Reopen on rev 0', async () => {
      await bomDetailPage.submitReopen('QA regression: stale revision reopen guard');
      await expect(bomDetailPage.locators.toasts.first()).toBeVisible();
      const texts = await bomDetailPage.toastTexts();
      test.info().annotations.push({ type: 'observed toast', description: texts.join(' | ') });
      return texts;
    });

    await test.step('rev 0 stays Approved', async () => {
      await bomDetailPage.refresh();
      expect(await bomDetailPage.status()).toBe('Approved');
    });

    await test.step('The refusal names the real reason, not a concurrent edit by "someone else"', async () => {
      expect(toasts.join(' | ')).not.toContain('This BOM was updated by someone else');
    });
  });

  test('TC:21 Verify creating another revision from an older revision is refused with a clear reason', async () => {
    await bomDetailPage.open(code, 0);

    const toasts = await test.step('Submit Create Revision on rev 0', async () => {
      await bomDetailPage.submitCreateRevision();
      await expect(bomDetailPage.locators.toasts.first()).toBeVisible();
      const texts = await bomDetailPage.toastTexts();
      test.info().annotations.push({ type: 'observed toast', description: texts.join(' | ') });
      return texts;
    });

    await test.step('No third revision is created', async () => {
      await bomDetailPage.openRevisionsPicker();
      await expect(bomDetailPage.locators.revisionsSummary).toHaveText(
        '2 of 2 revisions — click to open.',
      );
      await bomDetailPage.closeRevisionsPicker();
    });

    await test.step('The refusal does not claim the (Approved) revision is not Approved', async () => {
      expect(toasts.join(' | ')).not.toContain(
        'A new revision can only be created from an Approved BOM',
      );
    });
  });
});
