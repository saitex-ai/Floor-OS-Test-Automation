import * as allure from 'allure-js-commons';
import { RecipesListPage } from '../../../src/pages/planning/recipes-list.page';
import { RecipeDetailPage } from '../../../src/pages/planning/recipe-detail.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  addOperation,
  asPersona,
  createRecipe,
  openRecipe,
  personaCredentials,
  personaSkipReason,
  setupPage,
  nameOf,
  taggedName,
  uniqueCode,
  uniqueTag,
  washRecipe,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Recipes & Operations: List / Create / Edit Recipe.
 *
 * Source of truth for these cases: test-cases/planning/recipes.md
 * (ClickUp "Planning -Sprint -1 - Recipes & Operations"). A new recipe is
 * created as draft v1 and only a draft can be edited, so every case works
 * on QA-AUTO recipes this file created. Operations cases are in
 * 06-recipe-operations.spec.ts.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

test.describe('Planning - Recipes', () => {
  // Deletes / retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let recipe = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (each create ~10–20 s on dev).
    test.setTimeout(180_000);
    const page = await setupPage(browser);
    recipe = await createRecipe(page);
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Recipes & Operations');
    await allure.owner('Planning QA');
  });

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LR-01 "+ New recipe" opens the create form as its own page', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5f3'), 'TC-LR-01 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await recipeFormPage.expectOnCreatePage();
  });

  test('TC-LR-02 Department tabs filter the grid with accurate counts', async ({
    recipesListPage,
  }) => {
    await allure.tms(cu('z941abu5f4'), 'TC-LR-02 (ClickUp)');
    // Corrected 2026-09-09: tabs are by owning department, not recipe type.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    for (const tab of ['All', 'Cutting']) {
      await test.step(`"${tab}" tab count matches the grid's own total`, async () => {
        await recipesListPage.selectTab(tab);
        const badge = await recipesListPage.tabCount(tab);
        await expect.poll(async () => (await recipesListPage.showing()).total).toBe(badge);
      });
    }
    await recipesListPage.expectEveryRowMatches('Cutting');
  });

  test('TC-LR-03 Search recipes by code or name', async ({ recipesListPage }) => {
    await allure.tms(cu('z941abu5f5'), 'TC-LR-03 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.search(recipe);
    await recipesListPage.expectRowVisible(recipe);
    await recipesListPage.expectEveryRowMatches(recipe);
    await recipesListPage.search(nameOf(recipe).slice(0, 25));
    await recipesListPage.expectRowVisible(recipe);
  });

  test('TC-LR-04 Filter icon applies and clears a rule', async ({ recipesListPage }) => {
    await allure.tms(cu('z941abu5f6'), 'TC-LR-04 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    const all = (await recipesListPage.showing()).total;
    await recipesListPage.openFilters();
    await recipesListPage.addFilterRule('Code', recipe);
    await recipesListPage.expectFiltersBadge(1);
    await recipesListPage.expectEveryRowMatches(recipe);
    await recipesListPage.removeFilterRule();
    await recipesListPage.expectNoFiltersBadge();
    await expect.poll(async () => (await recipesListPage.showing()).total).toBe(all);
  });

  test('TC-LR-05 Columns icon opens the column-configuration picker', async ({
    recipesListPage,
  }) => {
    await allure.tms(cu('z941abu5f7'), 'TC-LR-05 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    try {
      await recipesListPage.hideColumn('Fills activity');
      await recipesListPage.expectColumnHidden('Fills activity');
    } finally {
      await recipesListPage.resetColumns();
    }
    await recipesListPage.expectColumnVisible('Fills activity');
  });

  test('TC-LR-06 Inline filter toggles a per-column filter row', async ({ recipesListPage }) => {
    await allure.tms(cu('z941abu5f8'), 'TC-LR-06 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.toggleCellFilters();
    await recipesListPage.expectCellFilterRow('Code');
    await recipesListPage.filterColumn('Code', recipe);
    await recipesListPage.expectRowVisible(recipe);
    await recipesListPage.expectEveryRowMatches(recipe);
  });

  test('TC-LR-07 View switch toggles table/split/stacked layouts', async ({ recipesListPage }) => {
    await allure.tms(cu('z941abu5f9'), 'TC-LR-07 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await recipesListPage.switchView(view);
      await recipesListPage.expectViewActive(view);
      await recipesListPage.expectGridVisible();
    }
  });

  test("TC-LR-08 Operations count and Total duration columns reflect the recipe's own operations", async ({
    page,
    recipesListPage,
  }) => {
    await allure.tms(cu('z941abu5fb'), 'TC-LR-08 (ClickUp)');
    const code = await createRecipe(page, washRecipe());
    await addOperation(page, { step: '10', name: 'QA-AUTO op A', cycleTime: '30' });
    await recipesListPage.findRow(code);
    expect(await recipesListPage.cellValue(code, 'Operations')).toBe('1');
    expect(await recipesListPage.cellValue(code, 'Total duration (min)')).toBe('30');

    await openRecipe(page, code);
    await addOperation(page, { step: '20', name: 'QA-AUTO op B', cycleTime: '22' });
    await recipesListPage.findRow(code);
    expect(await recipesListPage.cellValue(code, 'Operations')).toBe('2');
    expect(await recipesListPage.cellValue(code, 'Total duration (min)')).toBe('52');
  });

  test('TC-LR-09 Maturity column shows the correct state per recipe', async ({
    page,
    recipesListPage,
  }) => {
    await allure.tms(cu('z941abu5fc'), 'TC-LR-09 (ClickUp)');
    const provisional = await createRecipe(page, { maturity: 'Provisional' });
    await recipesListPage.findRow(provisional);
    await recipesListPage.expectMaturity(provisional, 'Provisional');
    await recipesListPage.search(recipe);
    await recipesListPage.expectMaturity(recipe, 'Estimated');
  });

  test('TC-LR-10 Row click opens the recipe detail; no inline Edit or master links', async ({
    recipesListPage,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5fd'), 'TC-LR-10 (ClickUp)');
    // Corrected 2026-09-09: no trailing Edit action and no linked cells, by design.
    await recipesListPage.findRow(recipe);
    await recipesListPage.expectNoRowAction(recipe, 'Edit');
    await recipesListPage.openRow(recipe);
    await recipeDetailPage.expectLoaded(recipe);
    await recipeDetailPage.expectEditRecipeAvailable();
  });

  test('TC-LR-11 Empty state and no-match state', async ({ recipesListPage }) => {
    await allure.tms(cu('z941abu5fe'), 'TC-LR-11 (ClickUp)');
    await allure.tms(cu('z941abu5kq'), 'TC-LR-11 bug (ClickUp)');
    // Bug z941abu5kq (2026-09-09): a no-match search showed the zero-records
    // message "No recipes yet — Use New recipe above…". On 2026-10-09 dev
    // showed a distinct "No recipes match your filters" — this checks it.
    // The zero-records half needs an empty shared table, so it isn't run.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.search(`no-such-recipe-${Date.now()}`);
    await recipesListPage.expectNoMatchState();
  });

  test('TC-LR-12 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abu5fg'), 'TC-LR-12 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new RecipesListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CR-01 Open "New recipe" as a dedicated full page', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5e7'), 'TC-CR-01 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await recipeFormPage.expectOnCreatePage();
  });

  test('TC-CR-02 Block Create when a required field is empty', async ({
    recipesListPage,
    recipeFormPage,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5e8'), 'TC-CR-02 (ClickUp)');
    // Since Sprint 1 a recipe is created as a draft: only Recipe blocks
    // saving (the code is generated since the 2026-10-16 deploy); the rest
    // are listed as approval prerequisites.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await test.step('Create is blocked while Recipe is empty; the code is generated', async () => {
      expect(await recipeFormPage.create()).not.toBe('submitted');
      await recipeFormPage.expectRequiredFlagged(1);
      await recipeFormPage.expectCodeGenerated();
    });
    await test.step('A name-only draft lists the rest before approval', async () => {
      await recipeFormPage.fill({ name: taggedName(uniqueTag('QAR-')) });
      expect(await recipeFormPage.create()).toBe('submitted');
      await recipeDetailPage.expectLoaded(await recipeDetailPage.createdCode());
      await recipeDetailPage.expectApprovalPrerequisites([
        'Owning department',
        'Fills activity',
        'Maturity',
        'Source',
        'Add at least one active operation',
      ]);
    });
  });

  test('TC-CR-03 Recipe code must be unique', async ({ page, recipesListPage, recipeFormPage }) => {
    await allure.tms(cu('z941abu5e9'), 'TC-CR-03 (ClickUp)');
    // Dev 2026-10-16: the code is generated on save (RCP-0001…) and can't be
    // typed, so a duplicate can't be entered. Checks what replaces the rule:
    // the code field is locked and each new recipe gets its own code.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await recipeFormPage.expectCodeGenerated();
    const another = await createRecipe(page);
    for (const code of [recipe, another]) expect(code).toMatch(/^RCP-\d+$/);
    expect(another, 'each recipe gets its own code').not.toBe(recipe);
  });

  test('TC-CR-04 The field set is the same for every recipe type', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5ea'), 'TC-CR-04 (ClickUp)');
    // Corrected 2026-09-09: no type-driven field visibility exists, by design.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    for (const type of ['Wash', 'Operation bulletin', 'Embroidery']) {
      await recipeFormPage.fill({ recipeType: type });
      await recipeFormPage.expectBatchFieldsVisible();
    }
  });

  test('TC-CR-05 Batch size and Batch unit are optional for every recipe type', async ({
    page,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5eb'), 'TC-CR-05 (ClickUp)');
    // Updated 2026-10-09 (the user): batch fields aren't required for any
    // type — Sept's "Required for a wash recipe" no longer applies.
    for (const recipeType of ['Wash', 'Embroidery']) {
      await test.step(`${recipeType} with empty batch fields saves`, async () => {
        await createRecipe(page, {
          recipeType,
          fillsActivity: recipeType === 'Wash' ? 'WASH-STONE' : 'CUT-BULK',
        });
        await recipeDetailPage.expectNoApprovalPrerequisite('Batch');
      });
    }
  });

  test('TC-CR-06 Owning department and Fills activity come from their masters and are required', async ({
    recipesListPage,
    recipeFormPage,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5ed'), 'TC-CR-06 (ClickUp)');
    // Required before approval, not to save the draft (since Sprint 1).
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    expect(await recipeFormPage.departmentOptions()).toEqual(expect.arrayContaining(['Cutting']));
    await recipeFormPage.fill({
      name: taggedName(uniqueTag('QAR-')),
      recipeType: 'Other',
      source: 'Entered by hand',
      maturity: 'Estimated',
    });
    expect(await recipeFormPage.create()).toBe('submitted');
    await recipeDetailPage.expectLoaded(await recipeDetailPage.createdCode());
    await recipeDetailPage.expectApprovalPrerequisites(['Owning department', 'Fills activity']);
  });

  test('TC-CR-07 Fills activity is a searchable combo', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5ee'), 'TC-CR-07 (ClickUp)');
    // Corrected 2026-09-09: options show code · name (no department), by design.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    // The search is fuzzy (e.g. "WASH" also offers WH-FGPUTAWAY): the best
    // matches come first, each shown as "CODE · name".
    const options = await recipeFormPage.fillsActivityOptions('WASH');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]!.toUpperCase()).toContain('WASH');
    for (const option of options) expect(option).toMatch(/^\S+ · .+/);
  });

  test('TC-CR-09 Risk numbers are optional and presented as visible buffers', async ({
    page,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5eg'), 'TC-CR-09 (ClickUp)');
    const code = await createRecipe(page, {
      shrinkageVariance: '3.5',
      shadeFailRate: '1.2',
      labTurnaround: '2',
    });
    await openRecipe(page, code);
    await recipeDetailPage.expectRisksPresentedAsBuffers();
    await recipeDetailPage.expectSummaryContains('3.5');
    await recipeDetailPage.expectSummaryContains('1.2');
  });

  test('TC-CR-10 Source is a dropdown of four origins', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5eh'), 'TC-CR-10 (ClickUp)');
    // Corrected 2026-09-09: Source is a free required dropdown per the prototype.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    expect(await recipeFormPage.optionsOf('source')).toEqual([
      'Entered by hand',
      'Developed in sampling',
      'AI proposed',
      'Imported bulletin',
    ]);
  });

  test('TC-CR-11 Maturity is a dropdown and the chosen value is saved', async ({
    page,
    recipesListPage,
    recipeFormPage,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5ej'), 'TC-CR-11 (ClickUp)');
    // Corrected 2026-09-09: Maturity is a dropdown per the prototype. Its
    // options are now Estimated / Provisional / Approved (Sept had Draft).
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    expect(await recipeFormPage.optionsOf('maturity')).toEqual([
      'Estimated',
      'Provisional',
      'Approved',
    ]);
    const code = await createRecipe(page, { maturity: 'Provisional' });
    await openRecipe(page, code);
    await recipeDetailPage.expectSummaryContains(/Maturity\s*Provisional/);
  });

  test('TC-CR-12 Computed duration and Total SAM have no create-time input', async ({
    page,
    recipesListPage,
    recipeFormPage,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5ek'), 'TC-CR-12 (ClickUp)');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await recipeFormPage.expectNoTotalsInputs();
    await openRecipe(page, recipe);
    expect(await recipeDetailPage.totalDuration()).toBe('—');
    expect(await recipeDetailPage.standardMinutes()).toBe('—');
  });

  test('TC-CR-13 External refs are available to an admin', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5em'), 'TC-CR-13 (ClickUp)');
    // Admin half only (alice). The non-admin half was verified manually by
    // the user in Sept; no scoped non-admin recipe:write account on dev.
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await recipeFormPage.expectSystemLinksSection();
  });

  test('TC-CR-14 Cancel discards the form without creating a record', async ({
    recipesListPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5en'), 'TC-CR-14 (ClickUp)');
    const tag = uniqueTag('QAR-');
    await recipesListPage.open();
    await recipesListPage.expectLoaded();
    await recipesListPage.openNew();
    await recipeFormPage.fill({ name: taggedName(tag), recipeType: 'Other' });
    await recipeFormPage.cancel();
    await recipeFormPage.expectBackOnList();
    await recipesListPage.expectLoaded();
    await recipesListPage.search(tag);
    await recipesListPage.expectNoMatchState();
  });

  test('TC-CR-15 Only a user with write permission can create a recipe', async ({ personas }) => {
    await allure.tms(cu('z941abu5ep'), 'TC-CR-15 (ClickUp)');
    await allure.tms(cu('z941abybge'), 'TC-CR-15 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abybge (2026-10-09): read-only users are
    // offered write controls on some Planning screens (enabled, then refused
    // with "Access restricted" / 403) while others hide or disable them.
    // Not reproduced on this screen on dev 2026-10-29: "New recipe" was unavailable
    // to the read-only login in every run, so it's no longer a knownBug()
    // here. The ClickUp status is left to the user.
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new RecipesListPage(page);
      await list.open();
      await list.expectNewUnavailable();
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-ER-01 Open an existing recipe for editing via "Edit recipe"', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5eq'), 'TC-ER-01 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.startEditing();
    await recipeFormPage.expectOnEditPage();
  });

  test('TC-ER-02 Recipe code is locked on Edit', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5et'), 'TC-ER-02 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.startEditing();
    await recipeFormPage.expectCodeLocked();
  });

  test('TC-ER-03 Editable fields persist after Save changes', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5eu'), 'TC-ER-03 (ClickUp)');
    const code = await createRecipe(page, washRecipe());
    const renamed = `${nameOf(code)} (edited)`;
    await recipeDetailPage.startEditing();
    await recipeFormPage.fill({
      name: renamed,
      fillsActivity: 'WASH-ENZYME',
      batchSize: '75',
      shrinkageVariance: '4.4',
      shadeFailRate: '2.2',
      labTurnaround: '3',
    });
    expect(await recipeFormPage.saveChanges()).toBe('submitted');

    await openRecipe(page, code);
    await recipeDetailPage.expectSummaryContains('WASH-ENZYME');
    await recipeDetailPage.startEditing();
    await recipeFormPage.expectValue('name', renamed);
    await recipeFormPage.expectValue('batchSize', '75');
    await recipeFormPage.expectValue('shrinkageVariance', '4.4');
    await recipeFormPage.expectValue('shadeFailRate', '2.2');
    await recipeFormPage.expectValue('labTurnaround', '3');
  });

  test('TC-ER-04 Block Save changes when a required field is cleared', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5ew'), 'TC-ER-04 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.startEditing();
    await recipeFormPage.fill({ name: '' });
    expect(await recipeFormPage.saveChanges()).not.toBe('submitted');
    await recipeFormPage.expectRequiredFlagged();
  });

  test('TC-ER-05 Maturity can be advanced on Edit', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5ex'), 'TC-ER-05 (ClickUp)');
    // Corrected 2026-09-09: no separate Promote action — Maturity is a field
    // on Edit; the owning-department restriction was verified manually.
    const code = await createRecipe(page);
    await recipeDetailPage.startEditing();
    await recipeFormPage.fill({ maturity: 'Approved' });
    expect(await recipeFormPage.saveChanges()).toBe('submitted');
    await openRecipe(page, code);
    await recipeDetailPage.expectSummaryContains(/Maturity\s*Approved/);
  });

  test('TC-ER-07 Computed duration and Total SAM recalculate immediately from operations', async ({
    page,
    recipeDetailPage,
  }) => {
    await allure.tms(cu('z941abu5ez'), 'TC-ER-07 (ClickUp)');
    await createRecipe(page, washRecipe());
    await recipeDetailPage.expectTotalsReadOnly();
    await addOperation(page, {
      step: '10',
      name: 'QA-AUTO timed op',
      standardMinutes: '6',
      cycleTime: '30',
    });
    await recipeDetailPage.expectOperationsHeading(1, 30);
    await recipeDetailPage.reload();
    expect(await recipeDetailPage.totalDuration()).toBe('30');
    expect(await recipeDetailPage.standardMinutes()).toBe('6');
    await recipeDetailPage.expectTotalsReadOnly();
  });

  test('TC-ER-08 Add and remove an External refs row (admin)', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5f0'), 'TC-ER-08 (ClickUp)');
    // Admin half only, as TC-CR-13.
    const code = await createRecipe(page);
    const ref = `OB-${uniqueCode('')}`;
    await recipeDetailPage.startEditing();
    await recipeFormPage.addSystemLink('gsd', ref);
    expect(await recipeFormPage.saveChanges()).toBe('submitted');
    await openRecipe(page, code);
    await recipeDetailPage.expectSummaryContains(ref);

    await recipeDetailPage.startEditing();
    await recipeFormPage.removeLastSystemLink();
    expect(await recipeFormPage.saveChanges()).toBe('submitted');
    await openRecipe(page, code);
    await recipeDetailPage.expectSummaryLacks(ref);
  });

  test('TC-ER-09 Cancel discards in-progress edits', async ({
    page,
    recipeDetailPage,
    recipeFormPage,
  }) => {
    await allure.tms(cu('z941abu5f1'), 'TC-ER-09 (ClickUp)');
    await openRecipe(page, recipe);
    await recipeDetailPage.startEditing();
    await recipeFormPage.fill({ name: `${nameOf(recipe)} SHOULD NOT PERSIST` });
    await recipeFormPage.cancel();
    await openRecipe(page, recipe);
    await recipeDetailPage.expectSummaryLacks('SHOULD NOT PERSIST');
  });

  test('TC-ER-10 Only a user with write permission can save edits', async ({ personas }) => {
    await allure.tms(cu('z941abu5f2'), 'TC-ER-10 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    // The owning-department half ("only the owning department can promote")
    // was verified manually by the user in Sept.
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new RecipesListPage(page);
      await list.findRow(recipe);
      await list.openRow(recipe);
      // Recipe-level edit only; operation actions are TC-CO-12 / TC-EO-10.
      await new RecipeDetailPage(page).expectNoEditRecipe();
    });
  });
});
