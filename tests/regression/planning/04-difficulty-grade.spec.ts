import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { DifficultyGradeFormPage } from '../../../src/pages/planning/difficulty-grade-form.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { DifficultyGradeListPage } from '../../../src/pages/planning/difficulty-grade-list.page';
import { RecipeDetailPage } from '../../../src/pages/planning/recipe-detail.page';
import { OperationFormPage } from '../../../src/pages/planning/operation-form.page';
import {
  addOperation,
  asPersona,
  createGrade,
  createRecipe,
  openGrade,
  openRecipe,
  personaCredentials,
  personaSkipReason,
  setupPage,
  TEST_DATA_TAG,
  uniqueCode,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Difficulty Grade (Create / Edit / List).
 *
 * Source of truth for these cases: test-cases/planning/difficulty-grade.md
 * (ClickUp "Planning -Sprint -1 - Difficulty Grade"). Grades are only
 * ever created by this file — never touch the seed grades (A, BM, B, C,
 * D, M) beyond reading them. Grades can't be deleted, only retired, so
 * every one carries the QA-AUTO tag in its Description.
 *
 * The "in use" / dropdown-order cases need a grade referenced by a real
 * operation: beforeAll builds one QA-AUTO recipe with one operation rated
 * at grade `inUse`.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const label = (code: string) => `QA-AUTO ${code}`;
const OPERATION = 'QA-AUTO graded op';

test.describe('Planning - Difficulty Grade', () => {
  // Deletes / retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let grade = '';
  let unused = '';
  let sortEarly = '';
  let sortMoved = '';
  let inUse = '';
  let recipe = '';

  /** Opens the graded operation's edit form and returns its Difficulty grade options. */
  async function gradeOptionsOnOperation(page: Page): Promise<string[]> {
    await openRecipe(page, recipe);
    await new RecipeDetailPage(page).openOperationForEdit(OPERATION);
    const form = new OperationFormPage(page);
    await form.expectOpenForEdit();
    const options = await form.difficultyGradeOptions();
    await form.cancel();
    return options;
  }

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (each create ~10–20 s on dev).
    test.setTimeout(420_000);
    const page = await setupPage(browser);
    grade = await createGrade(page);
    unused = await createGrade(page);
    sortEarly = await createGrade(page, { sort: '12' });
    sortMoved = await createGrade(page, { sort: '12' });
    inUse = await createGrade(page, { factor: '1.1' });
    recipe = await createRecipe(page);
    await addOperation(page, { step: '10', name: OPERATION, difficultyGrade: label(inUse) });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Difficulty Grade');
    await allure.owner('Planning QA');
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CG-01 Open "New difficulty grade" as a dedicated page', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3rm'), 'TC-CG-01 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.expectOnCreatePage();
  });

  test('TC-CG-02 Block Create when a required field is empty', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3rn'), 'TC-CG-02 (ClickUp)');
    // Corrected 2026-09-09: only Lookup code, Display label and Factor are required.
    const code = uniqueCode('QG');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    const valid = { code, label: label(code), factor: '1.1', description: TEST_DATA_TAG };
    for (const field of ['code', 'label', 'factor'] as const) {
      await test.step(`Empty ${field} blocks Create`, async () => {
        await difficultyGradeFormPage.fill({ ...valid, [field]: '' });
        expect(await difficultyGradeFormPage.create()).not.toBe('submitted');
        await difficultyGradeFormPage.expectRequiredFlagged();
      });
    }
  });

  test('TC-CG-03 Lookup code must be unique', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3rp'), 'TC-CG-03 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.fill({ code: grade, label: label(grade), factor: '1.1' });
    expect(await difficultyGradeFormPage.create()).not.toBe('submitted');
    await difficultyGradeFormPage.expectCodeTaken();
  });

  test('TC-CG-04 Factor has no range check (0.90 and 1.60 both save)', async ({
    page,
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3rq'), 'TC-CG-04 (ClickUp)');
    // Corrected 2026-09-09: the 1.00–1.50 range is not enforced, by design.
    for (const factor of ['0.9', '1.6']) {
      const code = await createGrade(page, { factor });
      await difficultyGradeListPage.findRow(code);
      await difficultyGradeListPage.expectRowContains(code, `×${Number(factor).toFixed(2)}`);
    }
  });

  test('TC-CG-05 "Off-machine (manual)" defaults to No and explains itself when set to Yes', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3rr'), 'TC-CG-05 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.expectOffMachineDefaultNo();
    await difficultyGradeFormPage.turnOffMachineOnAndExpectExplanation();
  });

  test('TC-CG-06 Sort places the new grade correctly in the "hardest first" order', async ({
    page,
  }) => {
    await allure.tms(cu('z941abu3rt'), 'TC-CG-06 (ClickUp)');
    // sortEarly has Sort 12: between seed A (10) and BM (15) in every operation's dropdown.
    const options = await gradeOptionsOnOperation(page);
    const at = (name: string) => options.findIndex((o) => o.startsWith(name));
    expect(at(label(sortEarly))).toBeGreaterThan(at('A — '));
    expect(at(label(sortEarly))).toBeLessThan(at('B — '));
  });

  test('TC-CG-07 Active defaults to Yes for a new grade', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3ru'), 'TC-CG-07 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.expectStatusDefaultActive();
    await difficultyGradeListPage.findRow(grade);
    await difficultyGradeListPage.expectRowContains(grade, 'Active');
  });

  test('TC-CG-08 Description is optional', async ({ page, difficultyGradeListPage }) => {
    await allure.tms(cu('z941abu3rv'), 'TC-CG-08 (ClickUp)');
    // Corrected 2026-09-09: Description is optional. The label still carries QA-AUTO.
    const code = await createGrade(page, { description: '' });
    await difficultyGradeListPage.findRow(code);
  });

  test('TC-CG-09 Cancel discards the form without creating a record', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3rw'), 'TC-CG-09 (ClickUp)');
    const code = uniqueCode('QG');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.fill({ code, label: label(code) });
    await difficultyGradeFormPage.cancel();
    await difficultyGradeFormPage.expectBackOnList();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.search(code);
    await difficultyGradeListPage.expectNoMatchState();
  });

  test('TC-CG-10 Only a user with write permission can create a grade', async ({ personas }) => {
    await allure.tms(cu('z941abu3rx'), 'TC-CG-10 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new DifficultyGradeListPage(page);
      await list.open();
      await list.expectNewUnavailable();
    });
  });

  test('TC-CG-11 Reject non-numeric input in Factor and Sort', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3ry'), 'TC-CG-11 (ClickUp)');
    const code = uniqueCode('QG');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.fill({ code, label: label(code), description: TEST_DATA_TAG });
    for (const field of ['factor', 'sort'] as const) {
      await test.step(`"abc" never saves in ${field}`, async () => {
        await difficultyGradeFormPage.typeInto(field, 'abc');
        if ((await difficultyGradeFormPage.fieldValue(field)).includes('abc')) {
          expect(await difficultyGradeFormPage.create()).not.toBe('submitted');
        }
        await difficultyGradeFormPage.typeInto(field, field === 'factor' ? '1.1' : '70');
      });
    }
  });

  test('TC-CG-12 Lookup code accepts more than two characters', async ({
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3rz'), 'TC-CG-12 (ClickUp)');
    // Corrected 2026-09-09: no length limit, by design. This file's own codes are 6+ characters.
    expect(grade.length).toBeGreaterThan(2);
    await difficultyGradeListPage.findRow(grade);
  });

  test('TC-CG-13 A newly created grade appears immediately in the list and its dropdown', async ({
    page,
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3t0'), 'TC-CG-13 (ClickUp)');
    await difficultyGradeListPage.findRow(grade);
    expect(await gradeOptionsOnOperation(page)).toContain(label(grade));
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EG-01 Open an existing difficulty grade for editing', async ({
    page,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t1'), 'TC-EG-01 (ClickUp)');
    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
  });

  test('TC-EG-02 Lookup code is read-only on Edit', async ({ page, difficultyGradeFormPage }) => {
    await allure.tms(cu('z941abu3t2'), 'TC-EG-02 (ClickUp)');
    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.expectCodeLocked();
  });

  test('TC-EG-03 Editable fields persist after Save changes', async ({
    page,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t3'), 'TC-EG-03 (ClickUp)');
    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ label: `${label(grade)} edited`, factor: '1.2' });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');

    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.expectFieldValue('label', `${label(grade)} edited`);
    await difficultyGradeFormPage.expectFieldValue('factor', '1.2');
    await difficultyGradeFormPage.fill({ label: label(grade) });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');
  });

  test('TC-EG-04 An operation keeps the grade factor it was rated with after the grade changes', async ({
    page,
    difficultyGradeFormPage,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu3t4'), 'TC-EG-04 (ClickUp)');
    // Sept: grade edits made a new version and operations stayed pinned to
    // theirs. Grades now "save in place" — the pin is re-checked here.
    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OPERATION);
    const before = await operationFormPage.gradeFactorValue();
    await operationFormPage.cancel();

    await openGrade(page, inUse);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ factor: '1.35' });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');

    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OPERATION);
    expect(await operationFormPage.gradeFactorValue()).toBe(before);
    await operationFormPage.cancel();
  });

  test('TC-EG-05 Editing Factor shows no affected-operations preview', async ({
    page,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t5'), 'TC-EG-05 (ClickUp)');
    // Corrected 2026-09-09: the prototype never had an affected-count preview.
    await openGrade(page, inUse);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ factor: '1.4' });
    await difficultyGradeFormPage.expectNoAffectedOperationsPreview();
    await difficultyGradeFormPage.cancel();
  });

  test('TC-EG-06 Deactivating a grade still in use is allowed', async ({
    page,
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t6'), 'TC-EG-06 (ClickUp)');
    // Corrected 2026-09-09: the prototype never refused or warned here.
    // "Retired rows still resolve for anything that already references them."
    await openGrade(page, inUse);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ active: false });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');
    await difficultyGradeListPage.findRow(inUse);
    await difficultyGradeListPage.expectRowContains(inUse, 'Retired');
  });

  test('TC-EG-07 A grade with no referencing operations can be deactivated', async ({
    page,
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t7'), 'TC-EG-07 (ClickUp)');
    await openGrade(page, unused);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ active: false });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');
    await difficultyGradeListPage.findRow(unused);
    await difficultyGradeListPage.expectRowContains(unused, 'Retired');
  });

  test('TC-EG-08 Factor has no range check on edit either', async ({
    page,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t8'), 'TC-EG-08 (ClickUp)');
    const code = await createGrade(page);
    await openGrade(page, code);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ factor: '0.5' });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');
  });

  test('TC-EG-09 Block Save changes when a required field is cleared', async ({
    page,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3t9'), 'TC-EG-09 (ClickUp)');
    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ label: '' });
    expect(await difficultyGradeFormPage.saveChanges()).not.toBe('submitted');
    await difficultyGradeFormPage.expectRequiredFlagged();
  });

  test('TC-EG-10 Cancel discards in-progress edits', async ({ page, difficultyGradeFormPage }) => {
    await allure.tms(cu('z941abu3ta'), 'TC-EG-10 (ClickUp)');
    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
    const before = await difficultyGradeFormPage.fieldValue('label');
    await difficultyGradeFormPage.fill({ label: `${before} SHOULD NOT PERSIST` });
    await difficultyGradeFormPage.cancel();

    await openGrade(page, grade);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.expectFieldValue('label', before);
  });

  test('TC-EG-11 Only a user with write permission can save edits', async ({ personas }) => {
    await allure.tms(cu('z941abu3tb'), 'TC-EG-11 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new DifficultyGradeListPage(page);
      await list.findRow(grade);
      await list.openRow(grade);
      await new DifficultyGradeFormPage(page).expectNoEditAction();
    });
  });

  test('TC-EG-12 Sort reorders the grade in the operation dropdown immediately', async ({
    page,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3tc'), 'TC-EG-12 (ClickUp)');
    // sortMoved starts at Sort 12 (between A and B); moved to 25 it sits between B (20) and C (30).
    await openGrade(page, sortMoved);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ sort: '25' });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');

    const options = await gradeOptionsOnOperation(page);
    const at = (name: string) => options.findIndex((o) => o.startsWith(name));
    expect(at(label(sortMoved))).toBeGreaterThan(at('B — '));
    expect(at(label(sortMoved))).toBeLessThan(at('C — '));
  });

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LG-01 "+ New difficulty grade" opens the create form', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3td'), 'TC-LG-01 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.openNew();
    await difficultyGradeFormPage.expectOnCreatePage();
  });

  test('TC-LG-02 List loads with the documented columns in order', async ({
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3tf'), 'TC-LG-02 (ClickUp)');
    // Sept's extra "Version" column is gone (2026-10-09).
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.expectColumnHeaders([
      'Code',
      'Label',
      'Factor',
      'Off-machine',
      'Sort',
      'Description',
      'Status',
    ]);
  });

  test('TC-LG-03 Default sort is by Sort ascending (hardest first)', async ({
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3tg'), 'TC-LG-03 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    const sorts = (await difficultyGradeListPage.columnValues('Sort')).map(Number);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
  });

  test('TC-LG-04 Search filters by code, label, and description', async ({
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3th'), 'TC-LG-04 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    for (const term of [grade, label(grade), `${grade}-D`]) {
      await test.step(`Search "${term}"`, async () => {
        await difficultyGradeListPage.search(term);
        await difficultyGradeListPage.expectRowVisible(grade);
      });
    }
  });

  test('TC-LG-05 Column sort toggles ascending/descending', async ({ difficultyGradeListPage }) => {
    await allure.tms(cu('z941abu3tj'), 'TC-LG-05 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    const factors = async () =>
      (await difficultyGradeListPage.columnValues('Factor')).map((f) => Number(f.replace('×', '')));
    const asc = (xs: number[]) => xs.every((x, i) => i === 0 || (xs[i - 1] ?? x) <= x);
    const desc = (xs: number[]) => xs.every((x, i) => i === 0 || (xs[i - 1] ?? x) >= x);
    // The grid re-renders after the click, so poll for the sorted order.
    await difficultyGradeListPage.sortBy('Factor');
    await expect
      .poll(async () => asc(await factors()), { message: 'first click sorts ascending' })
      .toBe(true);
    await difficultyGradeListPage.sortBy('Factor');
    await expect
      .poll(async () => desc(await factors()), { message: 'second click sorts descending' })
      .toBe(true);
  });

  test('TC-LG-06 Row click opens the read-only detail, with Edit to reach the form', async ({
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3tk'), 'TC-LG-06 (ClickUp)');
    // Corrected 2026-09-09: read-only detail first is the intended design.
    await difficultyGradeListPage.findRow(grade);
    await difficultyGradeListPage.openRow(grade);
    await difficultyGradeFormPage.expectOnDetailPage();
    await difficultyGradeFormPage.expectEditAvailable();
  });

  test('TC-LG-07 Factor displays with its "×" multiplier format', async ({
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3tn'), 'TC-LG-07 (ClickUp)');
    await difficultyGradeListPage.findRow(unused);
    await difficultyGradeListPage.expectRowContains(unused, '×1.10');
  });

  test('TC-LG-08 Off-machine and Status columns render as words', async ({
    difficultyGradeListPage,
  }) => {
    await allure.tms(cu('z941abu3tp'), 'TC-LG-08 (ClickUp)');
    // "Active" is a Status column (Active / Retired), not a Yes/No column.
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    const offMachine = await difficultyGradeListPage.columnValues('Off-machine');
    const status = await difficultyGradeListPage.columnValues('Status');
    expect(new Set(offMachine)).toEqual(
      new Set(offMachine.filter((v) => ['Yes', 'No'].includes(v))),
    );
    expect(new Set(status)).toEqual(
      new Set(status.filter((v) => ['Active', 'Retired'].includes(v))),
    );
    // QA grades from earlier runs can fill the first page, so the one
    // off-machine seed grade (M — manual) is searched for to see a "Yes".
    await test.step('The off-machine seed grade M reads "Yes"', async () => {
      await difficultyGradeListPage.search('manual');
      await difficultyGradeListPage.expectRowVisible('M');
      expect(await difficultyGradeListPage.cellValue('M', 'Off-machine')).toBe('Yes');
    });
  });

  test('TC-LG-09 Pagination controls', async ({ difficultyGradeListPage }) => {
    await allure.tms(cu('z941abu3tq'), 'TC-LG-09 (ClickUp)');
    await difficultyGradeListPage.open();
    await difficultyGradeListPage.expectLoaded();
    await difficultyGradeListPage.setRowsPerPage(10);
    const { total } = await difficultyGradeListPage.showing();
    test.skip(
      total <= 10,
      `Only ${total} grades — need 11+ for a second page at 10 rows per page.`,
    );
    expect(await difficultyGradeListPage.visibleRowCount()).toBe(10);
    await difficultyGradeListPage.nextPage();
    await difficultyGradeListPage.expectOnPage(2);
    expect((await difficultyGradeListPage.showing()).from).toBe(11);
    await difficultyGradeListPage.previousPage();
    await difficultyGradeListPage.expectOnPage(1);
  });

  test('TC-LG-11 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abu3tt'), 'TC-LG-11 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new DifficultyGradeListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });

  test('TC-LG-12 Retired grades stay in the list, marked Retired', async ({
    page,
    difficultyGradeListPage,
    difficultyGradeFormPage,
  }) => {
    await allure.tms(cu('z941abu3tu'), 'TC-LG-12 (ClickUp)');
    const code = await createGrade(page);
    await openGrade(page, code);
    await difficultyGradeFormPage.startEditing();
    await difficultyGradeFormPage.fill({ active: false });
    expect(await difficultyGradeFormPage.saveChanges()).toBe('submitted');

    await difficultyGradeListPage.findRow(code);
    await difficultyGradeListPage.expectRowContains(code, 'Retired');
    await difficultyGradeListPage.selectTab('Retired');
    await difficultyGradeListPage.expectRowVisible(code);
  });
});
