import * as allure from 'allure-js-commons';
import { RecipesListPage } from '../../../src/pages/planning/recipes-list.page';
import { RecipeDetailPage } from '../../../src/pages/planning/recipe-detail.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  addOperation,
  asPersona,
  createRecipe,
  knownBug,
  openRecipe,
  personaCredentials,
  personaSkipReason,
  setupPage,
  washRecipe,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Recipes & Operations: Create / Edit Recipe Operation.
 *
 * Source of truth for these cases: test-cases/planning/recipe-operations.md
 * (ClickUp "Planning -Sprint -1 - Recipes & Operations"). The New/Edit
 * operation form replaces the Operations table in place on the recipe's
 * detail page; saving recalculates the recipe totals immediately. Every
 * case works on QA-AUTO Wash recipes this file created; cases that check
 * totals build their own recipe so the numbers are known.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const OP_A = 'QA-AUTO wash op A';
const OP_B = 'QA-AUTO tumble op B';

test.describe('Planning - Recipe Operations', () => {
  // Deletes / retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let recipe = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (each create ~10–20 s on dev).
    test.setTimeout(240_000);
    const page = await setupPage(browser);
    recipe = await createRecipe(page, washRecipe());
    await addOperation(page, {
      step: '10',
      name: OP_A,
      machineType: 'WASH-FRONT-350',
      cycleTime: '30',
      temperature: '60',
    });
    await addOperation(page, {
      step: '20',
      name: OP_B,
      machineType: 'WASH-TUMBLE-120',
      cycleTime: '22',
    });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Recipes & Operations');
    await allure.owner('Planning QA');
  });

  // ── Create operation ──────────────────────────────────────────────────

  test('TC-CO-01 "New operation" opens the operation form in place', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fh'), 'TC-CO-01 (ClickUp)');
    // Corrected 2026-09-09: a full form replacing the table (same URL) is the design.
    await openRecipe(page, recipe);
    const url = page.url();
    await recipeDetailPage.openNewOperation();
    await operationFormPage.expectOpenForCreate();
    expect(page.url()).toBe(url);
    await operationFormPage.cancel();
  });

  test('TC-CO-02 Step number may be blank on a draft and must be unique within the recipe', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fj'), 'TC-CO-02 (ClickUp)');
    // Updated 2026-10-09 (the user): on a draft recipe an operation may be
    // saved without its "Step number *"; required fields are only enforced
    // before the recipe is sent for approval (not automated — the suite never
    // sends for approval).
    await test.step('A draft operation saves without a step (shown as "–")', async () => {
      await createRecipe(page, washRecipe());
      await addOperation(page, { name: 'QA-AUTO no step', cycleTime: '10' });
      await recipeDetailPage.expectOperationRowContains('QA-AUTO no step', '–');
    });
    await test.step('A Step number already used in the recipe is blocked', async () => {
      await openRecipe(page, recipe);
      await recipeDetailPage.openNewOperation();
      await operationFormPage.fill({ step: '10', name: 'QA-AUTO duplicate step' });
      await operationFormPage.submitExpectingStepTaken('create');
    });
  });

  test('TC-CO-03 Operation name may be blank on a draft', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fk'), 'TC-CO-03 (ClickUp)');
    // Updated 2026-10-09 (the user): "Operation *" is only enforced before the
    // recipe is sent for approval; a draft operation saves unnamed.
    await createRecipe(page, washRecipe());
    await recipeDetailPage.openNewOperation();
    await operationFormPage.fill({ step: '10', cycleTime: '10' });
    expect(await operationFormPage.create()).toBe('submitted');
    await recipeDetailPage.expectUnnamedOperationRow();
  });

  test('TC-CO-04 Machine type is picked from the machine master', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fm'), 'TC-CO-04 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openNewOperation();
    expect(await operationFormPage.machineTypeOptions()).toEqual(
      expect.arrayContaining(['WASH-FRONT-350', 'WASH-TUMBLE-120']),
    );
    await operationFormPage.cancel();
    await recipeDetailPage.expectOperationRowContains(OP_A, 'WASH-FRONT-350');
  });

  test('TC-CO-05 Standard minutes is optional; a wash operation runs on Cycle time and Temperature', async ({
    page,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5fn'), 'TC-CO-05 (ClickUp)');
    await createRecipe(page, washRecipe());
    await addOperation(page, { step: '10', name: OP_A, cycleTime: '30', temperature: '60' });
    await recipeDetailPage.expectOperationRowContains(OP_A, '60°C');
    await recipeDetailPage.expectOperationsHeading(1, 30);
    await recipeDetailPage.reload();
    expect(await recipeDetailPage.totalDuration()).toBe('30');
    expect(await recipeDetailPage.standardMinutes()).toBe('—');
  });

  test('TC-CO-06 Add and remove a Chemical row via "Add chemical" / "×"', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fp'), 'TC-CO-06 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openNewOperation();
    await operationFormPage.fill({ step: '30', name: 'QA-AUTO chemical op' });
    await operationFormPage.addChemical('DESIZE-QA', '1.5');
    await operationFormPage.removeChemical();
    await operationFormPage.expectChemicalRows(0);
    await operationFormPage.addChemical('DESIZE-QA', '1.5');
    expect(await operationFormPage.create()).toBe('submitted');
    await recipeDetailPage.expectOperationRowContains('QA-AUTO chemical op', 'DESIZE-QA 1.5 g/l');
  });

  test('TC-CO-07 Add a technique Setting via "Add setting"', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fq'), 'TC-CO-07 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openNewOperation();
    await operationFormPage.fill({ step: '40', name: 'QA-AUTO setting op' });
    await operationFormPage.addSetting('Load ratio', '1:3');
    expect(await operationFormPage.create()).toBe('submitted');
    await recipeDetailPage.expectOperationRowContains('QA-AUTO setting op', 'Load ratio: 1:3');
  });

  test('TC-CO-08 "Dry process" defaults to No and can be set to Yes', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fr'), 'TC-CO-08 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openNewOperation();
    await operationFormPage.expectDryProcessDefaultNo();
    await operationFormPage.fill({ step: '50', name: 'QA-AUTO dry op', dryProcess: true });
    expect(await operationFormPage.create()).toBe('submitted');
    await recipeDetailPage.reload();
    await recipeDetailPage.openOperationForEdit('QA-AUTO dry op');
    await operationFormPage.expectDryProcess(true);
  });

  test('TC-CO-09 Saving a new operation recalculates Total duration and Operations count immediately', async ({
    page,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5ft'), 'TC-CO-09 (ClickUp)');
    await createRecipe(page, washRecipe());
    await addOperation(page, { step: '10', name: OP_A, cycleTime: '30' });
    await recipeDetailPage.expectOperationsHeading(1, 30);
    await addOperation(page, { step: '20', name: OP_B, cycleTime: '22' });
    await recipeDetailPage.expectOperationsHeading(2, 52);
  });

  test('TC-CO-10 Search operations within the recipe by name or machine', async ({
    page,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5fu'), 'TC-CO-10 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.searchOperations('tumble');
    await recipeDetailPage.expectOperationRow(OP_B);
    await recipeDetailPage.expectNoOperationRow(OP_A);
    await recipeDetailPage.searchOperations('WASH-FRONT');
    await recipeDetailPage.expectOperationRow(OP_A);
    await recipeDetailPage.expectNoOperationRow(OP_B);
  });

  test('TC-CO-11 Discarding a new, unsaved operation leaves the count unchanged', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fv'), 'TC-CO-11 (ClickUp)');
    await createRecipe(page, washRecipe());
    await addOperation(page, { step: '10', name: OP_A, cycleTime: '30' });
    await recipeDetailPage.openNewOperation();
    await operationFormPage.fill({ step: '20', name: 'QA-AUTO unsaved op', cycleTime: '40' });
    await recipeDetailPage.reload();
    await recipeDetailPage.expectOperationsHeading(1, 30);
    await recipeDetailPage.expectNoOperationRow('QA-AUTO unsaved op');
  });

  test('TC-CO-12 Only a user with write permission can add an operation', async ({ personas }) => {
    await allure.tms(cu('z941abu5fw'), 'TC-CO-12 (ClickUp)');
    await allure.tms(cu('z941abybge'), 'TC-CO-12 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abybge (2026-10-09): read-only users are
    // offered write controls on some Planning screens (enabled, then refused
    // with "Access restricted" / 403) while others hide or disable them.
    // Marked with knownBug() until fixed.
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    knownBug('z941abybge');
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new RecipesListPage(page);
      await list.findRow(recipe);
      await list.openRow(recipe);
      await new RecipeDetailPage(page).expectNoNewOperation();
    });
  });

  // ── Edit operation ────────────────────────────────────────────────────

  test('TC-EO-01 Trailing "Edit" action opens the operation for editing', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fy'), 'TC-EO-01 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OP_A);
    await operationFormPage.expectOpenForEdit();
    await operationFormPage.cancel();
  });

  test('TC-EO-02 Editable fields persist after Save', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5fz'), 'TC-EO-02 (ClickUp)');
    await createRecipe(page, washRecipe());
    await addOperation(page, {
      step: '10',
      name: OP_A,
      machineType: 'WASH-FRONT-350',
      cycleTime: '30',
    });
    await recipeDetailPage.openOperationForEdit(OP_A);
    await operationFormPage.fill({
      name: 'QA-AUTO wash op edited',
      machineType: 'WASH-FRONT-200',
      cycleTime: '35',
      temperature: '55',
      dryProcess: true,
    });
    expect(await operationFormPage.saveChanges()).toBe('submitted');
    await recipeDetailPage.reload();
    await recipeDetailPage.expectOperationRowContains('QA-AUTO wash op edited', 'WASH-FRONT-200');
    await recipeDetailPage.expectOperationRowContains('QA-AUTO wash op edited', '55°C');
    await recipeDetailPage.openOperationForEdit('QA-AUTO wash op edited');
    await operationFormPage.expectValue('cycleTime', '35');
    await operationFormPage.expectDryProcess(true);
  });

  test("TC-EO-03 Editing an operation recalculates the recipe's totals immediately", async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g0'), 'TC-EO-03 (ClickUp)');
    await createRecipe(page, washRecipe());
    await addOperation(page, { step: '10', name: OP_A, cycleTime: '30' });
    await recipeDetailPage.expectOperationsHeading(1, 30);
    await recipeDetailPage.openOperationForEdit(OP_A);
    await operationFormPage.fill({ cycleTime: '52' });
    expect(await operationFormPage.saveChanges()).toBe('submitted');
    await recipeDetailPage.expectOperationsHeading(1, 52);
  });

  test('TC-EO-04 Recipe totals stay read-only while an operation is being edited', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g1'), 'TC-EO-04 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OP_A);
    await operationFormPage.expectOpenForEdit();
    await operationFormPage.expectNoRecipeTotalsInputs();
    await recipeDetailPage.expectTotalsReadOnly();
    await operationFormPage.cancel();
  });

  test('TC-EO-05 Edit and remove a Chemical row on an existing operation', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g2'), 'TC-EO-05 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openNewOperation();
    await operationFormPage.fill({ step: '60', name: 'QA-AUTO dosed op' });
    await operationFormPage.addChemical('DESIZE-QA', '1.5');
    expect(await operationFormPage.create()).toBe('submitted');

    await test.step('Change the dose', async () => {
      await recipeDetailPage.openOperationForEdit('QA-AUTO dosed op');
      await operationFormPage.setChemicalDose('2');
      expect(await operationFormPage.saveChanges()).toBe('submitted');
      await recipeDetailPage.expectOperationRowContains('QA-AUTO dosed op', 'DESIZE-QA 2 g/l');
    });
    await test.step('Remove the chemical', async () => {
      await recipeDetailPage.openOperationForEdit('QA-AUTO dosed op');
      await operationFormPage.removeChemical();
      expect(await operationFormPage.saveChanges()).toBe('submitted');
      await recipeDetailPage.reload();
      await recipeDetailPage.openOperationForEdit('QA-AUTO dosed op');
      await operationFormPage.expectChemicalRows(0);
    });
  });

  test('TC-EO-06 Add a Setting row to an existing operation while editing', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g4'), 'TC-EO-06 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OP_B);
    await operationFormPage.addSetting('Load ratio', '1:3');
    expect(await operationFormPage.saveChanges()).toBe('submitted');
    await recipeDetailPage.expectOperationRowContains(OP_B, 'Load ratio: 1:3');
  });

  test('TC-EO-07 Step number and Operation name may be cleared on a draft', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g5'), 'TC-EO-07 (ClickUp)');
    // Updated 2026-10-09 (the user): on a draft both may be cleared and saved;
    // they're only required before the recipe is sent for approval.
    await createRecipe(page, washRecipe());
    await addOperation(page, { step: '10', name: OP_A, cycleTime: '30' });
    await recipeDetailPage.openOperationForEdit(OP_A);
    await operationFormPage.clear('stepNumber');
    await operationFormPage.clear('operation');
    expect(await operationFormPage.saveChanges()).toBe('submitted');
    await recipeDetailPage.expectUnnamedOperationRow();
  });

  test('TC-EO-08 Step number uniqueness is re-enforced on edit', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g6'), 'TC-EO-08 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OP_B);
    await operationFormPage.fill({ step: '10' });
    await operationFormPage.submitExpectingStepTaken('save');
    await operationFormPage.cancel();
  });

  test('TC-EO-09 Cancel discards in-progress edits to the operation', async ({
    page,
    recipeDetailPage,
    operationFormPage,
  }) => {
    await allure.tms(cu('z941abu5g7'), 'TC-EO-09 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.openOperationForEdit(OP_A);
    await operationFormPage.fill({ name: 'QA-AUTO SHOULD NOT PERSIST', cycleTime: '99' });
    await operationFormPage.cancel();
    await recipeDetailPage.reload();
    await recipeDetailPage.expectOperationRow(OP_A);
    await recipeDetailPage.expectNoOperationRow('QA-AUTO SHOULD NOT PERSIST');
  });

  test('TC-EO-10 Only a user with write permission can edit an operation', async ({ personas }) => {
    await allure.tms(cu('z941abu5g8'), 'TC-EO-10 (ClickUp)');
    await allure.tms(cu('z941abybge'), 'TC-EO-10 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abybge (2026-10-09): read-only users are
    // offered write controls on some Planning screens (enabled, then refused
    // with "Access restricted" / 403) while others hide or disable them.
    // Marked with knownBug() until fixed.
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    knownBug('z941abybge');
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new RecipesListPage(page);
      await list.findRow(recipe);
      await list.openRow(recipe);
      await new RecipeDetailPage(page).expectReadOnly(OP_A);
    });
  });
});
