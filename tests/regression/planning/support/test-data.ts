import { type Browser, type Page, expect, test } from '@playwright/test';
import { authFile } from '../../../../src/fixtures/auth-setup';
import { track } from './created';
import {
  type Persona,
  type PersonaSessions,
  personaCredentials,
  personaSkipReason,
} from '../../../../src/fixtures/planning-personas';
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
import {
  OperationMasterFormPage,
  type OperationMasterValues,
} from '../../../../src/pages/planning/operation-master-form.page';
import { OperationDetailPage } from '../../../../src/pages/planning/operation-detail.page';
import { AllowanceFormPage } from '../../../../src/pages/planning/allowance-form.page';
import { WorkCentresListPage } from '../../../../src/pages/planning/work-centres-list.page';
import {
  WorkCentreFormPage,
  type CapabilityValues,
} from '../../../../src/pages/planning/work-centre-form.page';
import { WorkCentreDetailPage } from '../../../../src/pages/planning/work-centre-detail.page';
import { MachinesListPage } from '../../../../src/pages/planning/machines-list.page';
import {
  MachineFormPage,
  type MachineStatus,
} from '../../../../src/pages/planning/machine-form.page';
import { MachineDetailPage } from '../../../../src/pages/planning/machine-detail.page';
import {
  MaintenanceWindowFormPage,
  type WindowValues,
} from '../../../../src/pages/planning/maintenance-window-form.page';

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

/**
 * A code unique to this run: `<prefix><run id><n>`, upper case (grade codes
 * display upper case). Recorded against the calling spec file so its
 * afterAll can clean the record up (support/cleanup.ts).
 */
export function uniqueCode(prefix: string): string {
  counter += 1;
  const code = `${prefix}${RUN}${counter.toString(36).toUpperCase()}`;
  track(prefix, code);
  return code;
}

/** The part of every code this worker hands out for `prefix` — one search finds them all. */
export function runPrefix(prefix: string): string {
  return `${prefix}${RUN}`;
}

export { personaCredentials, personaSkipReason, type Persona };

/**
 * Marks the running case as an expected failure for an open ClickUp bug:
 * `test.fail()` keeps the run green while the bug exists, and once it's
 * fixed the case shows up as an unexpected pass — the cue to remove this
 * call. Adds the bug as an "issue" annotation for the report. Call it after
 * any `test.skip()` so a missing login still skips.
 */
export function knownBug(clickUpId: string): void {
  const url = `https://app.clickup.com/t/${clickUpId}`;
  test.info().annotations.push({ type: 'issue', description: url });
  test.fail(true, `Known bug, ClickUp ${clickUpId} — expected to fail until fixed`);
}

/** Runs `fn` on a fresh page as `persona`, in that persona's per-worker logged-in context. */
export async function asPersona(
  personas: PersonaSessions,
  persona: Persona,
  fn: (page: Page) => Promise<void>,
): Promise<void> {
  const page = await personas.newPage(persona);
  try {
    await fn(page);
  } finally {
    await page.close();
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

// ── Sprint 2: Operations & Allowance, Work Centres, Machines & Maintenance ──

/** An off-machine grade: Machine type isn't required with it. */
export const OFF_MACHINE_GRADE = /^M — manual/;
/** An on-machine grade: Machine type is required with it. */
export const ON_MACHINE_GRADE = /^D — simple/;

/**
 * Creates a Draft operation with every field the form insists on
 * (department Sewing, the off-machine grade "M — manual", skill grade S3)
 * and returns its code. Lands back on the list.
 */
export async function createOperation(
  page: Page,
  overrides: OperationMasterValues = {},
): Promise<string> {
  const code = overrides.code ?? uniqueCode('QA-OP');
  const form = new OperationMasterFormPage(page);
  await form.open();
  await form.fill({
    code,
    name: taggedName(code),
    department: /^Sewing$/,
    grade: OFF_MACHINE_GRADE,
    skillGrade: /^S3/,
    defaultSam: '1.1',
    ...overrides,
  });
  expect(await form.create(), `create operation ${code}`).toBe('submitted');
  return code;
}

/** Opens an operation's detail page (its URL carries the code). */
export async function openOperation(page: Page, code: string): Promise<void> {
  await new OperationDetailPage(page).open(code);
}

/**
 * On an operation's detail page: adds one allowance row. Leaving
 * `percentage` out keeps the type's own default (so it's not an override).
 */
export async function addAllowance(
  page: Page,
  values: { type: string; percentage?: string; why?: string },
): Promise<void> {
  const detail = new OperationDetailPage(page);
  const form = new AllowanceFormPage(page);
  await detail.openNewAllowance();
  await form.pickType(values.type);
  if (values.percentage !== undefined) await form.setPercentage(values.percentage);
  if (values.why !== undefined) await form.fillWhy(values.why);
  expect(await form.create(), `create allowance ${values.type}`).toBe('submitted');
  await detail.expectAllowanceRow(values.type);
}

/** Creates an Active work centre (department Sewing, Time based, Minutes) and returns its code. */
export async function createWorkCentre(
  page: Page,
  options: { usedFor?: string; capability?: CapabilityValues } = {},
): Promise<string> {
  const code = uniqueCode('QA-WC');
  const form = new WorkCentreFormPage(page);
  await form.open();
  await form.fillRequired({ code, name: taggedName(code), usedFor: options.usedFor });
  if (options.capability) await form.addCapability(options.capability);
  expect(await form.submitCreate(), `create work centre ${code}`).toBe('submitted');
  return code;
}

/** Opens a work centre's detail page from the list. */
export async function openWorkCentre(page: Page, code: string): Promise<void> {
  const list = new WorkCentresListPage(page);
  await list.findRow(code);
  await list.openRow(code);
  await new WorkCentreDetailPage(page).expectLoaded(code);
}

/**
 * Machine type of every machine the suite creates: "BTK · Bartack", which no
 * seed machine uses (checked 2026-10-14), so a search by type finds only QA rows.
 */
export const QA_MACHINE_TYPE = /^BTK · /;
/** The type TC-EM-02 / TC-EM-05 switch to. */
export const OTHER_MACHINE_TYPE = /^OL-3T · /;

/**
 * The QA-AUTO marker a machine carries. A machine has no name, and since the
 * 2026-10-14 deploy its type is a picker, so the marker is a system link
 * (System "QA-AUTO", Identifier "<code> — …"), shown on the list and detail.
 */
export function machineTagFor(code: string): string {
  return `${code} — Planning regression test data (pw-hybrid-framework). Safe to delete.`;
}

/** Creates a machine on `workCentre` and returns its asset code. */
export async function createMachine(
  page: Page,
  workCentre: string,
  options: { status?: MachineStatus; property?: [string, string] } = {},
): Promise<string> {
  const code = uniqueCode('QA-M');
  const form = new MachineFormPage(page);
  await form.open();
  await form.fillRequired({
    code,
    machineType: QA_MACHINE_TYPE,
    workCentre,
    status: options.status,
  });
  if (options.property) await form.addProperty(...options.property);
  await form.addSystemLink('QA-AUTO', machineTagFor(code));
  expect(await form.submitCreate(), `create machine ${code}`).toBe('submitted');
  return code;
}

/** Opens a machine's detail page from the list. */
export async function openMachine(page: Page, code: string): Promise<void> {
  const list = new MachinesListPage(page);
  await list.findRow(code);
  await list.openRow(code);
  await new MachineDetailPage(page).expectLoaded(code);
}

/** On a machine's detail page: adds one maintenance window (Why is required here, as its row key). */
export async function addWindow(page: Page, values: WindowValues & { why: string }): Promise<void> {
  const detail = new MachineDetailPage(page);
  const form = new MaintenanceWindowFormPage(page);
  await detail.openNewWindow();
  await form.fill({ kind: 'Planned', start: '06:00', ...values });
  expect(await form.create(), `create maintenance window ${values.why}`).toBe('submitted');
  await detail.expectWindowRow(values.why);
}
