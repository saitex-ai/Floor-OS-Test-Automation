import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { CodeListsPage, CodeListValuesPage } from '../../../src/pages/planning/code-lists.page';
import { CodeListValueDialogPage } from '../../../src/pages/planning/code-list-value-dialog.page';
import {
  asPersona,
  CODE_LIST_A,
  CODE_LIST_B,
  createCodeListValue,
  knownBug,
  openCodeListValue,
  personaCredentials,
  personaSkipReason,
  TEST_DATA_TAG,
  uniqueValueCode,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Code lists (List code lists / List, Create, Edit code-list
 * values) at /planning/master-data/code-lists.
 *
 * Source of truth for these cases: test-cases/planning/code-lists.md
 * (ClickUp "Planning -Sprint -3 - Code Lists"). Values are only ever added
 * to two low-traffic lists (CODE_LIST_A = delay_owner, CODE_LIST_B =
 * severity), QA-AUTO tagged; values can't be deleted, so each file's
 * afterAll retires them ("In use" off). The busy lists the cases name
 * (Activity type, Recipe type, Unit of measure) are only read.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

test.describe('Planning - Code Lists', () => {
  // Retires this file's QA-AUTO values once its cases are done.
  cleanUpAfterAll();

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO values through the UI (~10 s each on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Code Lists');
    await allure.owner('Planning QA');
  });

  // ── List code lists ───────────────────────────────────────────────────

  test('TC-LCL-01 Every lookup table is listed with the correct columns', async ({ page }) => {
    await allure.tms(cu('z941abvh1n'), 'TC-LCL-01 (ClickUp)');
    // Sept (ClickUp fail): 33 rows, "Capacity model" (capacity_model) missing
    // from the 34-table manifest. On 2026-10-12 dev lists 39 tables,
    // capacity_model included — the manifest has grown since the case was written.
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    await lists.expectColumnHeaders(['Code list', 'Table', 'What it means', 'Values']);
    await lists.setRowsPerPage(100);
    const tables = await lists.columnValues('Table');
    expect(tables).toContain('capacity_model');
    expect(new Set(tables).size, 'no table listed twice').toBe(tables.length);
    expect((await lists.showing()).total).toBe(tables.length);
  });

  test('TC-LCL-02 No create action exists for the code lists themselves', async ({ page }) => {
    await allure.tms(cu('z941abvh1p'), 'TC-LCL-02 (ClickUp)');
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    await lists.expectNoCreateAction();
  });

  test('TC-LCL-03 "Values" reflects each list\'s live value count', async ({ page }) => {
    await allure.tms(cu('z941abvh1q'), 'TC-LCL-03 (ClickUp)');
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    await lists.search('activity_type');
    await lists.expectRowVisible('activity_type');
    const shown = Number(await lists.cellValue('activity_type', 'Values'));
    const values = new CodeListValuesPage(page, 'activity_type');
    await lists.openRow('activity_type');
    await values.expectOnListPage();
    await expect.poll(async () => (await values.showing()).total).toBe(shown);
  });

  test('TC-LCL-04 Search filters by code-list name, table name, or description', async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh1r'), 'TC-LCL-04 (ClickUp)');
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    // The search also covers "Why it exists", which the grid doesn't show,
    // so these check the expected list is found rather than every row's text.
    await test.step('By name: "Recipe"', async () => {
      await lists.search('Recipe');
      await lists.expectRowVisible('recipe_type');
      await lists.expectNoRow('uom');
    });
    await test.step('By table name: "uom"', async () => {
      await lists.search('uom');
      await lists.expectRowVisible('uom');
      await lists.expectEveryRowMatches('uom');
    });
    await test.step('By description: "interpret std_time_minutes"', async () => {
      await lists.search('interpret std_time_minutes');
      await lists.expectRowVisible('std_time_basis');
      await expect.poll(() => lists.visibleRowCount()).toBe(1);
    });
  });

  test('TC-LCL-05 Filters panel applies and clears a rule', async ({ page }) => {
    await allure.tms(cu('z941abvh1t'), 'TC-LCL-05 (ClickUp)');
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    const { total } = await lists.showing();
    await lists.openFilters();
    await lists.addFilterRule('Table', 'block_status');
    await lists.expectFiltersBadge(1);
    await lists.expectRowVisible('block_status');
    await expect.poll(() => lists.visibleRowCount()).toBe(1);
    await test.step('Clear all restores every list', async () => {
      await lists.clearAllFilters();
      await lists.expectNoFiltersBadge();
      await expect.poll(async () => (await lists.showing()).total).toBe(total);
    });
  });

  test('TC-LCL-06 Columns icon hides a column', async ({ page }) => {
    await allure.tms(cu('z941abvh1u'), 'TC-LCL-06 (ClickUp)');
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    await lists.hideColumn('Table');
    await lists.expectColumnHidden('Table');
    await lists.resetColumns();
    await lists.expectColumnVisible('Table');
  });

  test('TC-LCL-07 View switch re-renders without data loss', async ({ page }) => {
    await allure.tms(cu('z941abvh1v'), 'TC-LCL-07 (ClickUp)');
    const lists = new CodeListsPage(page);
    await lists.open();
    await lists.expectLoaded();
    const { total } = await lists.showing();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await test.step(view, async () => {
        await lists.switchView(view);
        await lists.expectViewActive(view);
      });
    }
    await lists.expectGridVisible();
    expect((await lists.showing()).total).toBe(total);
  });

  test("TC-LCL-08 Row click opens the code list's own page, not a value's edit form", async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh1w'), 'TC-LCL-08 (ClickUp)');
    const lists = new CodeListsPage(page);
    const values = new CodeListValuesPage(page, 'activity_type');
    await lists.findRow('activity_type');
    await lists.openRow('activity_type');
    await values.expectOnListPage();
    await values.expectSummaryFields();
    await values.expectGridVisible();
    await values.expectNewButtonEnabled();
    await new CodeListValueDialogPage(page).expectClosed();
  });

  test('TC-LCL-09 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abvh1x'), 'TC-LCL-09 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const lists = new CodeListsPage(page);
      await lists.open();
      await lists.expectAccessRestricted();
    });
  });

  // ── List code-list values ─────────────────────────────────────────────

  test('TC-LCV-01 Values are scoped to the one code list they were opened from', async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh1y'), 'TC-LCV-01 (ClickUp)');
    // A QA value added to list A must show in A's grid and never in B's.
    const code = await createCodeListValue(page, CODE_LIST_A);
    const a = new CodeListValuesPage(page, CODE_LIST_A);
    const b = new CodeListValuesPage(page, CODE_LIST_B);
    await a.findRow(code);
    await b.open();
    await b.expectLoaded();
    await b.search(code);
    await b.expectNoRow(code);
  });

  test('TC-LCV-02 Columns match the common contract', async ({ page }) => {
    await allure.tms(cu('z941abvh1z'), 'TC-LCV-02 (ClickUp)');
    // The per-row Edit action is now the row click (view dialog → Edit).
    const values = new CodeListValuesPage(page, 'activity_type');
    await values.open();
    await values.expectLoaded();
    await values.expectColumnHeaders([
      'Value',
      'Shown as',
      'What it means',
      'Display order',
      'In use',
    ]);
  });

  test('TC-LCV-03 Rows are ordered by Display order, not by Value', async ({ page }) => {
    await allure.tms(cu('z941abvh20'), 'TC-LCV-03 (ClickUp)');
    const values = new CodeListValuesPage(page, 'activity_type');
    await values.open();
    await values.expectLoaded();
    const orders = (await values.columnValues('Display order')).map(Number);
    expect(orders).toEqual([...orders].sort((x, y) => x - y));
    const codes = await values.columnValues('Value');
    expect(codes, 'not alphabetical by Value').not.toEqual([...codes].sort());
  });

  test('TC-LCV-04 "New value" opens the create form scoped to this list', async ({ page }) => {
    await allure.tms(cu('z941abvh21'), 'TC-LCV-04 (ClickUp)');
    // It opens as a modal (Sept: matches the prototype), so there's no
    // "Code list · …" breadcrumb; the scope is the list it was opened from.
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await values.open();
    await values.expectLoaded();
    await values.openNew();
    await dialog.expectNewOpen();
    await dialog.expectNoListPicker();
  });

  test('TC-LCV-05 Search filters values by value, label, or description within one list', async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh22'), 'TC-LCV-05 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A, {
      whatItMeans: `${TEST_DATA_TAG} Searchable description.`,
    });
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    for (const [by, term] of [
      ['value', code],
      ['label', `QA-AUTO ${code}`],
      ['description', 'Searchable description'],
    ] as const) {
      await test.step(`By ${by}`, async () => {
        await values.search(term);
        await values.expectRowVisible(code);
        await values.expectEveryRowMatches(term);
      });
    }
  });

  test('TC-LCV-06 Filters panel applies and clears a rule', async ({ page }) => {
    await allure.tms(cu('z941abvh24'), 'TC-LCV-06 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await values.open();
    await values.expectLoaded();
    const { total } = await values.showing();
    await values.openFilters();
    await values.addFilterRule('Value', code);
    await values.expectFiltersBadge(1);
    await values.expectRowVisible(code);
    await expect.poll(() => values.visibleRowCount()).toBe(1);
    await values.clearAllFilters();
    await values.expectNoFiltersBadge();
    await expect.poll(async () => (await values.showing()).total).toBe(total);
  });

  test('TC-LCV-07 Columns icon and view switch behave like every other list', async ({ page }) => {
    await allure.tms(cu('z941abvh25'), 'TC-LCV-07 (ClickUp)');
    const values = new CodeListValuesPage(page, 'activity_type');
    await values.open();
    await values.expectLoaded();
    const { total } = await values.showing();
    await values.hideColumn('What it means');
    await values.expectColumnHidden('What it means');
    await values.resetColumns();
    await values.expectColumnVisible('What it means');
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await values.switchView(view);
      await values.expectViewActive(view);
    }
    expect((await values.showing()).total).toBe(total);
  });

  test('TC-LCV-08 Retired values stay visible in the list, not deleted', async ({ page }) => {
    await allure.tms(cu('z941abvh26'), 'TC-LCV-08 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A, { inUse: false });
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await values.findRow(code);
    expect(await values.cellValue(code, 'In use')).toBe('No');
    await values.selectTab('Retired');
    await values.expectRowVisible(code);
  });

  test('TC-LCV-09 Pagination reflects the exact row count for this list', async ({ page }) => {
    await allure.tms(cu('z941abvh27'), 'TC-LCV-09 (ClickUp)');
    const values = new CodeListValuesPage(page, 'uom');
    await values.open();
    await values.expectLoaded();
    await values.setRowsPerPage(100);
    // The tab count, the "of N" footer and the rows shown, re-read together.
    await values.expectTabCountMatchesRows('All');
    await expect(async () => {
      const { total, to } = await values.showing();
      expect(to, 'one page holds every row').toBe(total);
      expect(await values.visibleRowCount(), 'rows shown').toBe(total);
    }).toPass();
  });

  test('TC-LCV-10 Values access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abvh28'), 'TC-LCV-10 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const values = new CodeListValuesPage(page, 'activity_type');
      await values.open();
      await values.expectAccessRestricted();
    });
  });

  // ── Create code-list value ────────────────────────────────────────────

  test('TC-CCV-01 "New value" opens the create form', async ({ page }) => {
    await allure.tms(cu('z941abvh29'), 'TC-CCV-01 (ClickUp)');
    // A modal, not a page — matches the prototype (accepted in Sept).
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await values.open();
    await values.expectLoaded();
    await values.openNew();
    await dialog.expectNewOpen();
  });

  test('TC-CCV-02 Block Create when a required field is empty', async ({ page }) => {
    await allure.tms(cu('z941abvh2b'), 'TC-CCV-02 (ClickUp)');
    await allure.tms(cu('z941abyqd7'), 'TC-CCV-02 bug (ClickUp)');
    test.setTimeout(300_000);
    // Confirmed bug, ClickUp z941abyqd7 (2026-10-14): a cleared Display order
    // doesn't block Create — dev saves the value with order 99 (Sept: blocked).
    // Marked with knownBug() until fixed.
    knownBug('z941abyqd7');
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    for (const field of ['value', 'shownAs', 'whatItMeans', 'displayOrder'] as const) {
      await test.step(`Empty ${field} blocks Create`, async () => {
        const code = uniqueValueCode();
        await values.open();
        await values.expectLoaded();
        await values.openNew();
        await dialog.fill({
          value: code,
          shownAs: `QA-AUTO ${code}`,
          whatItMeans: TEST_DATA_TAG,
          displayOrder: '990',
          [field]: '',
        });
        await dialog.submitExpectingFlagged('create', field);
        await dialog.cancel();
      });
    }
  });

  test('TC-CCV-03 Value is unique within its list but may repeat across lists', async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh2c'), 'TC-CCV-03 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await test.step('The same value again in the same list is blocked', async () => {
      await values.open();
      await values.expectLoaded();
      await values.openNew();
      await dialog.fill({
        value: code,
        shownAs: `QA-AUTO ${code} dup`,
        whatItMeans: TEST_DATA_TAG,
      });
      await dialog.create();
      await dialog.expectCodeTaken();
      await dialog.cancel();
    });
    await test.step('The same value in another list saves', async () => {
      await createCodeListValue(page, CODE_LIST_B, { value: code });
      await new CodeListValuesPage(page, CODE_LIST_B).findRow(code);
    });
  });

  test('TC-CCV-04 Value is saved lower case', async ({ page }) => {
    await allure.tms(cu('z941abvh2d'), 'TC-CCV-04 (ClickUp)');
    // Sept, accepted by the user as the prototype's behaviour: upper case is
    // lowered on save; spaces stay. Created already retired (it isn't a
    // trackable snake_case code, so cleanup wouldn't find it).
    const code = uniqueValueCode();
    const typed = code.replace(/_/g, ' ').toUpperCase();
    await createCodeListValue(page, CODE_LIST_A, { value: typed, inUse: false });
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await values.findRow(typed.toLowerCase());
  });

  test('TC-CCV-05 Display order takes numbers only; duplicate orders are accepted', async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh2e'), 'TC-CCV-05 (ClickUp)');
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await test.step('Letters never land in Display order', async () => {
      await values.open();
      await values.expectLoaded();
      await values.openNew();
      expect(await dialog.typeDisplayOrder('abc')).not.toMatch(/[a-z]/i);
      await dialog.cancel();
    });
    await test.step('Two values with the same Display order both save', async () => {
      const first = await createCodeListValue(page, CODE_LIST_A, { displayOrder: '991' });
      const second = await createCodeListValue(page, CODE_LIST_A, { displayOrder: '991' });
      await values.findRow(first);
      await values.search(second);
      await values.expectRowVisible(second);
      expect(await values.cellValue(second, 'Display order')).toBe('991');
    });
  });

  test('TC-CCV-06 "In use" can be created as either Yes or No', async ({ page }) => {
    await allure.tms(cu('z941abvh2f'), 'TC-CCV-06 (ClickUp)');
    const yes = await createCodeListValue(page, CODE_LIST_A);
    const no = await createCodeListValue(page, CODE_LIST_A, { inUse: false });
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await values.findRow(yes);
    expect(await values.cellValue(yes, 'In use')).toBe('Yes');
    await values.search(no);
    await values.expectRowVisible(no);
    expect(await values.cellValue(no, 'In use')).toBe('No');
  });

  test('TC-CCV-07 Cancel discards the form without creating a value', async ({ page }) => {
    await allure.tms(cu('z941abvh2g'), 'TC-CCV-07 (ClickUp)');
    const code = uniqueValueCode();
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await values.open();
    await values.expectLoaded();
    await values.openNew();
    await dialog.fill({ value: code, shownAs: `QA-AUTO ${code}` });
    await dialog.cancel();
    await dialog.expectClosed();
    await values.search(code);
    await values.expectNoRow(code);
  });

  test('TC-CCV-08 Only a user with write permission can create a value', async ({ personas }) => {
    await allure.tms(cu('z941abvh2h'), 'TC-CCV-08 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const values = new CodeListValuesPage(page, CODE_LIST_A);
      await values.open();
      await values.expectNewBlocked();
    });
  });

  test("TC-CCV-09 The new value's list can't be changed from the form", async ({ page }) => {
    await allure.tms(cu('z941abvh2j'), 'TC-CCV-09 (ClickUp)');
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await values.open();
    await values.expectLoaded();
    await values.openNew();
    await dialog.expectNewOpen();
    await dialog.expectNoListPicker();
  });

  // ── Edit code-list value ──────────────────────────────────────────────

  test('TC-ECV-01 A value opens for editing; Value is read-only', async ({ page }) => {
    await allure.tms(cu('z941abvh2k'), 'TC-ECV-01 (ClickUp)');
    // Row click opens a read-only view (since Sept); Edit turns it into the form.
    const code = await createCodeListValue(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    await dialog.expectValueLocked(code);
  });

  test('TC-ECV-02 The edit form says it saves in place, not as a new version', async ({ page }) => {
    await allure.tms(cu('z941abvh2m'), 'TC-ECV-02 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    await dialog.expectSaveNotice(
      'Saves in place. Retired values still resolve for anything that already references them.',
    );
  });

  test('TC-ECV-03 Edits persist after Save changes', async ({ page }) => {
    await allure.tms(cu('z941abvh2n'), 'TC-ECV-03 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    await dialog.fill({
      shownAs: `QA-AUTO ${code} edited`,
      whatItMeans: `${TEST_DATA_TAG} Edited.`,
      displayOrder: '995',
      inUse: false,
    });
    expect(await dialog.saveChanges()).toBe('submitted');
    await dialog.close();
    await values.findRow(code);
    expect(await values.valueRow(code)).toMatchObject({
      'Shown as': `QA-AUTO ${code} edited`,
      'What it means': `${TEST_DATA_TAG} Edited.`,
      'Display order': '995',
      'In use': 'No',
    });
  });

  test("TC-ECV-04 Required fields can't be saved empty", async ({ page }) => {
    await allure.tms(cu('z941abvh2p'), 'TC-ECV-04 (ClickUp)');
    // Sept (accepted): a cleared Display order never saves blank — it falls
    // back instead of erroring. Shown as / What it means block the save.
    const code = await createCodeListValue(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    for (const field of ['shownAs', 'whatItMeans'] as const) {
      await test.step(`Cleared ${field} blocks Save`, async () => {
        await dialog.fill({ [field]: '' });
        await dialog.submitExpectingFlagged('save', field);
        await dialog.fill({
          shownAs: `QA-AUTO ${code}`,
          whatItMeans: TEST_DATA_TAG,
        });
      });
    }
    await test.step('A cleared Display order never saves blank', async () => {
      await dialog.fill({ displayOrder: '' });
      await dialog.saveChanges();
      await values.open();
      await values.expectLoaded();
      await values.search(code);
      await values.expectRowVisible(code);
      expect(await values.cellValue(code, 'Display order')).toMatch(/^\d+$/);
    });
  });

  test('TC-ECV-05 Retiring a value (In use → No) does not delete it', async ({ page }) => {
    await allure.tms(cu('z941abvh2q'), 'TC-ECV-05 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    await dialog.setInUse(false);
    expect(await dialog.saveChanges()).toBe('submitted');
    await dialog.close();
    await values.findRow(code);
    expect(await values.cellValue(code, 'In use')).toBe('No');
  });

  test('TC-ECV-06 Cancel discards in-progress edits', async ({ page }) => {
    await allure.tms(cu('z941abvh2r'), 'TC-ECV-06 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    const dialog = new CodeListValueDialogPage(page);
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    await dialog.fill({ shownAs: 'QA-AUTO SHOULD NOT PERSIST', displayOrder: '1' });
    await dialog.cancel();
    await values.findRow(code);
    expect(await values.valueRow(code)).toMatchObject({
      'Shown as': `QA-AUTO ${code}`,
      'Display order': '990',
    });
  });

  test('TC-ECV-07 Only a user with write permission can save edits', async ({ page, personas }) => {
    await allure.tms(cu('z941abvh2u'), 'TC-ECV-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    const code = await createCodeListValue(page, CODE_LIST_A);
    await asPersona(personas, 'READONLY', async (roPage) => {
      const values = new CodeListValuesPage(roPage, CODE_LIST_A);
      const dialog = new CodeListValueDialogPage(roPage);
      await values.findRow(code);
      await values.openRow(code);
      // If the view offers a working Edit, the save itself must be refused.
      if (await dialog.isEditAvailable()) {
        await dialog.startEditing();
        await dialog.fill({ shownAs: 'QA-AUTO read-only attempt' });
        await dialog.saveChanges();
      }
    });
    const values = new CodeListValuesPage(page, CODE_LIST_A);
    await values.findRow(code);
    expect(await values.cellValue(code, 'Shown as')).toBe(`QA-AUTO ${code}`);
  });

  test('TC-ECV-08 Editing a value in one list leaves the same code in another list alone', async ({
    page,
  }) => {
    await allure.tms(cu('z941abvh2v'), 'TC-ECV-08 (ClickUp)');
    const code = await createCodeListValue(page, CODE_LIST_A);
    await createCodeListValue(page, CODE_LIST_B, { value: code });
    const dialog = new CodeListValueDialogPage(page);
    await openCodeListValue(page, CODE_LIST_A, code);
    await dialog.startEditing();
    await dialog.fill({ shownAs: `QA-AUTO ${code} in A only` });
    expect(await dialog.saveChanges()).toBe('submitted');
    await dialog.close();
    const b = new CodeListValuesPage(page, CODE_LIST_B);
    await b.findRow(code);
    expect(await b.cellValue(code, 'Shown as')).toBe(`QA-AUTO ${code}`);
  });
});
