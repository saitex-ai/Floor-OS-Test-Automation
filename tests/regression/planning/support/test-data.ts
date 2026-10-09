import { type Browser, type Page, expect } from '@playwright/test';
import { authFile } from '../../../../src/fixtures/auth-setup';
import { loginAsUser } from '../../../../src/fixtures/multi-user';
import { env } from '../../../../src/config/env';
import { ActivitiesListPage } from '../../../../src/pages/planning/activities-list.page';
import {
  ActivityFormPage,
  type ActivityFieldValues,
} from '../../../../src/pages/planning/activity-form.page';
import { DifficultyGradeListPage } from '../../../../src/pages/planning/difficulty-grade-list.page';
import {
  DifficultyGradeFormPage,
  type DifficultyGradeFieldValues,
} from '../../../../src/pages/planning/difficulty-grade-form.page';
import { RecipesListPage } from '../../../../src/pages/planning/recipes-list.page';
import {
  RecipeFormPage,
  type RecipeFieldValues,
} from '../../../../src/pages/planning/recipe-form.page';
import { RecipeDetailPage } from '../../../../src/pages/planning/recipe-detail.page';
import {
  OperationFormPage,
  type OperationFieldValues,
} from '../../../../src/pages/planning/operation-form.page';

/**
 * Test data for the Planning regression suite. Every record it creates is
 * its own — never a seed record — and carries this tag in its name (or,
 * for difficulty grades, its Description) so anyone looking at dev can
 * tell it's automated test data, safe to delete from the backend. Same
 * "QA-AUTO" prefix the BOM and Costing suites use.
 */
export const TEST_DATA_TAG =
  'QA-AUTO — Planning regression test data (pw-hybrid-framework). Safe to delete.';

/** "QA-AUTO <code> — Planning regression test data ...": the tag, naming its own record. */
export function taggedName(code: string): string {
  return TEST_DATA_TAG.replace('QA-AUTO', `QA-AUTO ${code}`);
}

// Run id = time + Playwright worker index: the config is fullyParallel with
// 2 workers on dev/CI, and each worker loads this module separately.
const RUN = `${Date.now().toString(36).toUpperCase().slice(-4)}${process.env.TEST_WORKER_INDEX ?? '0'}`;
let counter = 0;

/** A code unique to this run: `<prefix><run id><n>`, upper case (grade codes display upper case). */
export function uniqueCode(prefix: string): string {
  counter += 1;
  return `${prefix}${RUN}${counter.toString(36).toUpperCase()}`;
}

/**
 * The two extra logins the permission cases need, read from
 * `PLANNING_<PERSONA>_USER_<ENV>` / `PLANNING_<PERSONA>_PASSWORD_<ENV>`:
 * - READONLY: can read the Planning masters but not write them (e.g. a
 *   user holding only job.pln-viewer).
 * - NOACCESS: can't open the Planning masters at all.
 * Cases skip with `personaSkipReason()` when the login isn't set.
 */
export type Persona = 'READONLY' | 'NOACCESS';

export function personaCredentials(
  persona: Persona,
): { username: string; password: string } | undefined {
  const suffix = env.testEnv.toUpperCase();
  const username = process.env[`PLANNING_${persona}_USER_${suffix}`]?.trim();
  const password = process.env[`PLANNING_${persona}_PASSWORD_${suffix}`]?.trim();
  return username && password ? { username, password } : undefined;
}

export function personaSkipReason(persona: Persona): string {
  const suffix = env.testEnv.toUpperCase();
  const who =
    persona === 'READONLY'
      ? 'a read-only Planning user (e.g. only job.pln-viewer)'
      : 'a user without Planning master-data access';
  return `Needs ${who}: set PLANNING_${persona}_USER_${suffix} / PLANNING_${persona}_PASSWORD_${suffix}`;
}

/** Runs `fn` on a fresh page logged in as `persona` (a clean context, not alice's session). */
export async function asPersona(
  browser: Browser,
  persona: Persona,
  fn: (page: Page) => Promise<void>,
): Promise<void> {
  const creds = personaCredentials(persona);
  if (!creds) throw new Error(personaSkipReason(persona));
  const { page, close } = await loginAsUser(browser, creds.username, creds.password);
  try {
    await fn(page);
  } finally {
    await close();
  }
}

/** A page with the Planning login, for beforeAll setup outside any one test. */
export async function setupPage(browser: Browser): Promise<Page> {
  return browser.newPage({ storageState: authFile('planning') });
}

/**
 * Creates an activity draft ("Create draft") with every required field
 * set and returns its code. Activity codes are department-prefixed.
 */
export async function createActivityDraft(
  page: Page,
  overrides: ActivityFieldValues = {},
): Promise<string> {
  const code = overrides.code ?? uniqueCode('CUT-QA');
  const list = new ActivitiesListPage(page);
  const form = new ActivityFormPage(page);
  await list.open();
  await list.expectLoaded();
  await list.openNew();
  await form.expectOnCreatePage();
  await form.fillAllRequired(code, taggedName(code), overrides);
  expect(await form.create(), `create activity draft ${code}`).toBe('submitted');
  await form.expectCreatedAsDraft();
  return code;
}

/** Opens an activity's detail page from the list. */
export async function openActivity(page: Page, code: string): Promise<void> {
  const list = new ActivitiesListPage(page);
  await list.findRow(code);
  await list.openRow(code);
  await new ActivityFormPage(page).expectOnDetailPage();
}

/** Creates an Active difficulty grade with every field set and returns its code. */
export async function createGrade(
  page: Page,
  overrides: DifficultyGradeFieldValues = {},
): Promise<string> {
  const code = overrides.code ?? uniqueCode('QG');
  const list = new DifficultyGradeListPage(page);
  const form = new DifficultyGradeFormPage(page);
  await list.open();
  await list.expectLoaded();
  await list.openNew();
  await form.expectOnCreatePage();
  await form.fill({
    code,
    label: `QA-AUTO ${code}`,
    description: `${TEST_DATA_TAG} [${code}-D]`,
    factor: '1.1',
    sort: '70',
    ...overrides,
  });
  expect(await form.create(), `create grade ${code}`).toBe('submitted');
  return code;
}

/** Opens a grade's read-only detail page from the list. */
export async function openGrade(page: Page, code: string): Promise<void> {
  const list = new DifficultyGradeListPage(page);
  await list.findRow(code);
  await list.openRow(code);
  await new DifficultyGradeFormPage(page).expectOnDetailPage();
}

/** Creates a recipe (draft v1) and leaves the page on its detail page. Returns its code. */
export async function createRecipe(page: Page, overrides: RecipeFieldValues = {}): Promise<string> {
  const code = overrides.code ?? uniqueCode('QAR-');
  const list = new RecipesListPage(page);
  const form = new RecipeFormPage(page);
  await list.open();
  await list.expectLoaded();
  await list.openNew();
  await form.expectOnCreatePage();
  await form.fillAllRequired(code, taggedName(code), overrides);
  expect(await form.create(), `create recipe ${code}`).toBe('submitted');
  await new RecipeDetailPage(page).expectLoaded(code);
  return code;
}

/** A Wash recipe: needs Batch size + unit, fills a WASH activity. */
export function washRecipe(overrides: RecipeFieldValues = {}): RecipeFieldValues {
  return {
    recipeType: 'Wash',
    fillsActivity: 'WASH-STONE',
    batchSize: '50',
    batchUnit: 'Pieces',
    ...overrides,
  };
}

/** Opens a recipe's detail page (newest version) from the list. */
export async function openRecipe(page: Page, code: string): Promise<void> {
  const list = new RecipesListPage(page);
  await list.findRow(code);
  await list.openRow(code);
  await new RecipeDetailPage(page).expectLoaded(code);
}

/** On a recipe's detail page: adds and saves one operation. */
export async function addOperation(page: Page, values: OperationFieldValues): Promise<void> {
  const detail = new RecipeDetailPage(page);
  const form = new OperationFormPage(page);
  await detail.openNewOperation();
  await form.expectOpenForCreate();
  await form.fill(values);
  expect(await form.create(), `create operation ${values.name}`).toBe('submitted');
  await detail.expectOperationRow(values.name!);
}
