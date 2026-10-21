import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { ShiftKindsPage } from '../../../src/pages/planning/shift-kinds.page';
import {
  asPersona,
  createShiftKind,
  personaCredentials,
  personaSkipReason,
  setupPage,
  TEST_DATA_TAG,
  uniqueKindCode,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Shift kinds (List / Create / Edit) at
 * /planning/master-data/shift-kinds — every flow is a modal over the list.
 *
 * Source of truth for these cases: test-cases/planning/shift-kinds.md
 * (ClickUp "Planning -Sprint -3 - Shift (kind and break)", TC-LSK / CSK /
 * ESK). Kinds are only ever added by this file (QA-AUTO, lookup code
 * qa_auto_k…); the seed kinds (standard, overtime, night) are only read.
 * Kinds can't be deleted — afterAll retires this file's own.
 *
 * beforeAll builds `kind` (Counts against overtime cap off, display order 990).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const label = (code: string) => `QA-AUTO ${code}`;

test.describe('Planning - Shift Kinds', () => {
  // Retires this file's QA-AUTO shift kinds once its cases are done.
  cleanUpAfterAll();

  let kind = '';

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    const page = await setupPage(browser);
    kind = await createShiftKind(page, { displayOrder: '990' });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO shift kinds through the UI (~10 s each on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Shift Kinds');
    await allure.owner('Planning QA');
  });

  async function openKind(kinds: ShiftKindsPage, code: string): Promise<void> {
    await kinds.findRow(code);
    await kinds.openRow(code);
    await kinds.expectViewOpen(label(code));
  }

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LSK-01 The list shows the right columns', async ({ page }) => {
    await allure.tms(cu('z941abw5m6'), 'TC-LSK-01 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.expectColumnHeaders([
      'Code',
      'Label',
      'Counts against overtime cap',
      'Description',
      'Display order',
      'Active',
    ]);
  });

  test('TC-LSK-02 Row click opens a read-only view popup', async ({ page }) => {
    await allure.tms(cu('z941abw5m7'), 'TC-LSK-02 (ClickUp)');
    await allure.tms(cu('z941abw5tr'), 'TC-LSK-02 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abw5tr (2026-09-23): a row click opened the
    // editable form directly. On dev 2026-10-13 it opens a read-only view
    // (Close / Edit); the ClickUp status is left to the user.
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, kind);
    await kinds.expectViewShows(kind);
    await kinds.expectNotOnNewPage();
  });

  test("TC-LSK-03 The popup's Edit swaps it into a form in place", async ({ page }) => {
    await allure.tms(cu('z941abw5m8'), 'TC-LSK-03 (ClickUp)');
    await allure.tms(cu('z941abw5tr'), 'TC-LSK-03 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abw5tr — see TC-LSK-02.
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, kind);
    await kinds.startEditing();
    await kinds.expectCodeLocked(kind);
    await kinds.expectNotOnNewPage();
  });

  test("TC-LSK-04 The popup's one-click Retire / Restore flips Active", async ({ page }) => {
    await allure.tms(cu('z941abw5m9'), 'TC-LSK-04 (ClickUp)');
    const code = await createShiftKind(page);
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, code);
    await kinds.toggleRetire();
    await kinds.closeDialog();
    await kinds.findRow(code);
    await kinds.expectRowContains(code, 'Retired');
    await kinds.openRow(code);
    await kinds.toggleRetire();
    await kinds.closeDialog();
    await kinds.findRow(code);
    await kinds.expectRowContains(code, 'Active');
  });

  test('TC-LSK-05 Search filters by code, label or description', async ({ page }) => {
    await allure.tms(cu('z941abw5ma'), 'TC-LSK-05 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await test.step('By code / label: "overtime"', async () => {
      await kinds.search('overtime');
      await kinds.expectRowVisible('overtime');
      await kinds.expectEveryRowMatches('overtime');
    });
    await test.step('By description', async () => {
      await kinds.search('Planning regression test data');
      await kinds.expectRowVisible(kind);
    });
  });

  test('TC-LSK-06 Filters panel applies and clears a rule', async ({ page }) => {
    await allure.tms(cu('z941abw5mb'), 'TC-LSK-06 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    const { total } = await kinds.showing();
    await kinds.openFilters();
    await kinds.addFilterRule('Code', kind);
    await kinds.expectFiltersBadge(1);
    await kinds.expectRowVisible(kind);
    await expect.poll(() => kinds.visibleRowCount()).toBe(1);
    await kinds.clearAllFilters();
    await kinds.expectNoFiltersBadge();
    await expect.poll(async () => (await kinds.showing()).total).toBe(total);
  });

  test('TC-LSK-07 Columns icon hides a column', async ({ page }) => {
    await allure.tms(cu('z941abw5mc'), 'TC-LSK-07 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.hideColumn('Display order');
    await kinds.expectColumnHidden('Display order');
    await kinds.resetColumns();
    await kinds.expectColumnVisible('Display order');
  });

  test('TC-LSK-08 View switch re-renders without data loss', async ({ page }) => {
    await allure.tms(cu('z941abw5md'), 'TC-LSK-08 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    const { total } = await kinds.showing();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await kinds.switchView(view);
      await kinds.expectViewActive(view);
    }
    await kinds.expectGridVisible();
    expect((await kinds.showing()).total).toBe(total);
  });

  test('TC-LSK-09 "New shift kind" opens a modal, not a page', async ({ page }) => {
    await allure.tms(cu('z941abw5me'), 'TC-LSK-09 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.openNew();
    await kinds.expectNewOpen();
    await kinds.expectNotOnNewPage();
  });

  test('TC-LSK-10 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abw5mf'), 'TC-LSK-10 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const kinds = new ShiftKindsPage(page);
      await kinds.open();
      await kinds.expectAccessRestricted();
    });
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CSK-01 "New shift kind" opens over the list with every field', async ({ page }) => {
    await allure.tms(cu('z941abw5mg'), 'TC-CSK-01 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.openNew();
    await kinds.expectNewOpen();
  });

  test('TC-CSK-02 Lookup code and Display label are required', async ({ page }) => {
    await allure.tms(cu('z941abw5mh'), 'TC-CSK-02 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    for (const field of ['code', 'label'] as const) {
      await test.step(`Empty ${field} blocks Create`, async () => {
        const code = uniqueKindCode();
        await kinds.openNew();
        await kinds.fill({ code, label: label(code), description: TEST_DATA_TAG, [field]: '' });
        await kinds.submitExpectingFlagged('create', field);
        await kinds.cancelDialog();
      });
    }
  });

  test('TC-CSK-03 Lookup code must be unique', async ({ page }) => {
    await allure.tms(cu('z941abw5mm'), 'TC-CSK-03 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.openNew();
    await kinds.fill({ code: kind, label: `${label(kind)} dup`, description: TEST_DATA_TAG });
    expect(await kinds.create()).not.toBe('submitted');
    await kinds.cancelDialog();
    await kinds.findRow(kind);
    await expect.poll(() => kinds.visibleRowCount()).toBe(1);
  });

  test('TC-CSK-04 "Counts against overtime cap" starts off', async ({ page }) => {
    await allure.tms(cu('z941abw5mp'), 'TC-CSK-04 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.openNew();
    await kinds.expectCountsAgainstCap(false);
  });

  test('TC-CSK-05 Display order is optional and numbers-only', async ({ page }) => {
    await allure.tms(cu('z941abw5mr'), 'TC-CSK-05 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await test.step('Letters never land in Display order', async () => {
      await kinds.open();
      await kinds.expectLoaded();
      await kinds.openNew();
      expect(await kinds.typeDisplayOrder('abc')).not.toMatch(/[a-z]/i);
      await kinds.cancelDialog();
    });
    await test.step('A blank Display order saves', async () => {
      const code = await createShiftKind(page, { displayOrder: '' });
      await kinds.findRow(code);
    });
  });

  test('TC-CSK-06 Cancel closes the dialog without creating a kind', async ({ page }) => {
    await allure.tms(cu('z941abw5mv'), 'TC-CSK-06 (ClickUp)');
    const code = uniqueKindCode();
    const kinds = new ShiftKindsPage(page);
    await kinds.open();
    await kinds.expectLoaded();
    await kinds.openNew();
    await kinds.fill({ code, label: label(code) });
    await kinds.cancelDialog();
    await kinds.expectNoDialog();
    await kinds.search(code);
    await kinds.expectNoRow(code);
  });

  test('TC-CSK-07 Only a user with write permission can create a kind', async ({ personas }) => {
    await allure.tms(cu('z941abw5n9'), 'TC-CSK-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const kinds = new ShiftKindsPage(page);
      await kinds.open();
      await kinds.expectNewBlocked();
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-ESK-01 Edit opens from the view popup, still a modal', async ({ page }) => {
    await allure.tms(cu('z941abw5na'), 'TC-ESK-01 (ClickUp)');
    await allure.tms(cu('z941abw5tr'), 'TC-ESK-01 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abw5tr — see TC-LSK-02.
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, kind);
    await kinds.startEditing();
    await kinds.expectNotOnNewPage();
  });

  test('TC-ESK-02 Lookup code is read-only once the kind exists', async ({ page }) => {
    await allure.tms(cu('z941abw5nb'), 'TC-ESK-02 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, kind);
    await kinds.startEditing();
    await kinds.expectCodeLocked(kind);
  });

  test('TC-ESK-03 Edits persist after Save changes', async ({ page }) => {
    await allure.tms(cu('z941abw5nc'), 'TC-ESK-03 (ClickUp)');
    const code = await createShiftKind(page);
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, code);
    await kinds.startEditing();
    await kinds.fill({
      label: `${label(code)} edited`,
      description: `${TEST_DATA_TAG} Edited.`,
      countsAgainstCap: true,
      displayOrder: '995',
    });
    expect(await kinds.saveChanges()).toBe('submitted');
    await kinds.closeDialog();
    await kinds.findRow(code);
    for (const text of [`${label(code)} edited`, 'Edited.', '995'])
      await kinds.expectRowContains(code, text);
    expect(await kinds.cellValue(code, 'Counts against overtime cap')).toBe('Yes');
  });

  test('TC-ESK-04 A cleared Display label blocks Save', async ({ page }) => {
    await allure.tms(cu('z941abw5nd'), 'TC-ESK-04 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, kind);
    await kinds.startEditing();
    await kinds.fill({ label: '' });
    await kinds.submitExpectingFlagged('save', 'label');
  });

  test('TC-ESK-05 Retiring through Edit matches the one-click Retire', async ({ page }) => {
    await allure.tms(cu('z941abw5ne'), 'TC-ESK-05 (ClickUp)');
    const code = await createShiftKind(page);
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, code);
    await kinds.startEditing();
    await kinds.fill({ active: false });
    expect(await kinds.saveChanges()).toBe('submitted');
    await kinds.expectViewShows('Retired');
    await kinds.closeDialog();
    await kinds.findRow(code);
    await kinds.expectRowContains(code, 'Retired');
  });

  test('TC-ESK-06 Cancel discards in-progress edits', async ({ page }) => {
    await allure.tms(cu('z941abw5nf'), 'TC-ESK-06 (ClickUp)');
    const kinds = new ShiftKindsPage(page);
    await openKind(kinds, kind);
    await kinds.startEditing();
    await kinds.fill({ label: 'QA-AUTO SHOULD NOT PERSIST', countsAgainstCap: true });
    await kinds.cancelDialog();
    await kinds.findRow(kind);
    await kinds.expectRowContains(kind, label(kind));
    expect(await kinds.cellValue(kind, 'Counts against overtime cap')).toBe('No');
  });

  test('TC-ESK-07 Only a user with write permission can save edits', async ({ page, personas }) => {
    await allure.tms(cu('z941abw5ng'), 'TC-ESK-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const kinds = new ShiftKindsPage(roPage);
      await kinds.findRow(kind);
      await kinds.openRow(kind);
      // If the view offers a working Edit, the save itself must be refused.
      if (await kinds.isEditAvailable()) {
        await kinds.startEditing();
        await kinds.fill({ label: 'QA-AUTO read-only attempt' });
        await kinds.saveChanges();
      }
    });
    const kinds = new ShiftKindsPage(page);
    await kinds.findRow(kind);
    await kinds.expectRowContains(kind, label(kind));
  });
});
