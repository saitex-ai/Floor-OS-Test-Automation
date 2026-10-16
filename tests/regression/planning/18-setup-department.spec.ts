import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/cross-module.fixtures';
import { SetupDepartmentPage } from '../../../src/pages/planning/setup-department.page';
import { ActivitiesListPage } from '../../../src/pages/planning/activities-list.page';
import { RecipesListPage } from '../../../src/pages/planning/recipes-list.page';
import { WorkCentresListPage } from '../../../src/pages/planning/work-centres-list.page';
import { MachinesListPage } from '../../../src/pages/planning/machines-list.page';
import {
  asPersona,
  machineTagFor,
  personaCredentials,
  personaSkipReason,
  QA_MACHINE_TYPE,
  setupPage,
  uniqueCode,
} from './support/test-data';
import { cleanUpWizardDepartments } from './support/cleanup';

/**
 * Planning — Set up my department wizard at
 * /planning/master-data/setup-department.
 *
 * Source of truth for these cases: test-cases/planning/setup-department.md
 * (ClickUp "Planning -Sprint -3 - Set up my Department Wizard"). The wizard
 * writes real master data from every step, so it only ever runs against a
 * QA-AUTO department this file creates (code QAD…) — every activity,
 * recipe, work centre, machine and employee added here belongs to it.
 * Real departments are only read (the scoping and "✓ confirmed" cases).
 * afterAll deletes the drafts and retires everything else, then the
 * department itself.
 *
 * The cases follow the wizard in order on one department, so they run
 * serially: a step that fails skips the steps after it.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
/** A task-grain certification the QA operator gets in Step 6. */
const QUALIFICATION_TASK = 'SEW-COINHEM';
const QUALIFICATIONS_PARKED =
  'Parked: the Qualifications screen was removed on 2026-10-14 (now Operators & Qualifications), and the wizard-created operator has no profile there.';
const CAPACITY_FIXME =
  'Step 5 (Capacity) still reads "This step is not built yet" — write this case when it ships.';

test.describe('Planning - Set up my Department', () => {
  test.describe.configure({ mode: 'serial' });

  const dept = uniqueCode('QAD');
  const deptName = `QA-AUTO ${dept} — Planning regression test data`;
  // Dev 2026-10-16 generates activity / recipe / work centre / machine codes on
  // save, so these records are found by their QA-AUTO names and their codes are
  // read back after each create.
  const ours = `QA-AUTO ${dept}-`;
  const activityName = `${ours}A1`;
  const recipeName = `${ours}R1`;
  const centreName = `${ours}WC1`;
  const machineTag = machineTagFor(`${dept}-M1`);
  let activity = '';
  let recipe = '';
  let centre = '';
  let machine = '';
  const operator = `QA-AUTO ${dept} operator`;
  /** What to clean up, in order: department codes, and "<kind>:<code or name>" for the rest. */
  const created: string[] = [];
  let page: Page;
  let wizard: SetupDepartmentPage;
  let confirmedBefore = 0;

  test.beforeAll(async ({ browser }) => {
    page = await setupPage(browser);
    wizard = new SetupDepartmentPage(page);
  });

  test.afterAll(async ({ browser }) => {
    // Deletes the drafts and retires the rest of each QA department (~2–4 min on dev).
    test.setTimeout(900_000);
    await page.close();
    await cleanUpWizardDepartments(browser, created);
  });

  test.beforeEach(async () => {
    // The wizard's inline creates each take ~10–20 s on dev.
    test.setTimeout(240_000);
    await allure.epic('Planning');
    await allure.feature('Set up my Department');
    await allure.owner('Planning QA');
  });

  // ── Entry & Step 1 ────────────────────────────────────────────────────

  test('TC-DW-NAV-01 The journey card shows progress and opens the wizard', async () => {
    await allure.tms(cu('z941abw0p1'), 'TC-DW-NAV-01 (ClickUp)');
    await wizard.openLanding();
    const { confirmed, total } = await wizard.confirmedCount();
    expect(total, 'departments counted on the card').toBeGreaterThan(0);
    expect(confirmed, 'confirmed ≤ total').toBeLessThanOrEqual(total);
    confirmedBefore = confirmed;
    await wizard.startFromCard();
  });

  test('TC-DW-DEPT-02 Confirmed departments carry "✓ confirmed" in the picker', async () => {
    await allure.tms(cu('z941abw0pb'), 'TC-DW-DEPT-02 (ClickUp)');
    const options = await wizard.departmentOptions();
    expect(options.filter((o) => o.endsWith('✓ confirmed')).length).toBeGreaterThan(0);
    expect(options.filter((o) => !o.endsWith('✓ confirmed')).length).toBeGreaterThan(0);
  });

  test('TC-DW-DEPT-03 "Create department" opens the full form inline', async () => {
    await allure.tms(cu('z941abw0pc'), 'TC-DW-DEPT-03 (ClickUp)');
    const url = page.url();
    await wizard.openCreateDepartment();
    await wizard.expectDepartmentFormFields();
    await wizard.expectInline(url);
  });

  test('TC-DW-DEPT-04 A new department is selected and becomes the one being set up', async () => {
    await allure.tms(cu('z941abw0pd'), 'TC-DW-DEPT-04 (ClickUp)');
    created.push(dept);
    await wizard.createDepartment({ code: dept, name: deptName });
    expect(await wizard.selectedDepartment()).toContain(dept);
    await wizard.continue();
    await wizard.expectOnStep('Confirm the work your department performs');
    expect(await wizard.cardCodes(ours)).toEqual([]);
  });

  test('TC-DW-NAV-02 The rail opens reached steps only', async () => {
    await allure.tms(cu('z941abw0p2'), 'TC-DW-NAV-02 (ClickUp)');
    await wizard.expectStepOpen('Department', true);
    await wizard.expectStepOpen('Activities', true);
    for (const step of ['Recipes & Operations', 'Capacity', 'Review & Complete'] as const)
      await wizard.expectStepOpen(step, false);
  });

  // ── Step 2: Activities ────────────────────────────────────────────────

  test('TC-DW-ACT-02 "Create a new activity" opens the full form inline', async () => {
    await allure.tms(cu('z941abw0ph'), 'TC-DW-ACT-02 (ClickUp)');
    // Dev 2026-10-14: a department created in Step 1 reaches Planning a few
    // seconds later — opened sooner, the activity form reads "Select…" and
    // Create is refused (400 "Unknown departmentCode"). Wait for it here so
    // the remaining steps can be checked (TC-DW-ACT-03 covers the form).
    await wizard.reopen(dept, deptName);
    const url = page.url();
    await wizard.openCreateActivity();
    await wizard.expectInline(url);
  });

  test('TC-DW-NAV-05 An activity added here is live master data at once', async () => {
    await allure.tms(cu('z941abw0p8'), 'TC-DW-NAV-05 (ClickUp)');
    activity = await wizard.submitActivity(activityName);
    created.push(`activity:${activity}`);
  });

  test('TC-DW-ACT-04 Edit opens the full activity form, prefilled', async () => {
    await allure.tms(cu('z941abw0pk'), 'TC-DW-ACT-04 (ClickUp)');
    await wizard.openEditActivity(activity);
    await wizard.expectActivityName(activityName);
    await wizard.cancelInlineForm();
  });

  test('TC-DW-NAV-03 Continue opens the next step; Back keeps what was entered', async () => {
    await allure.tms(cu('z941abw0p3'), 'TC-DW-NAV-03 (ClickUp)');
    await wizard.continue();
    await wizard.expectOnStep(/^Confirm recipes/);
    await wizard.expectStepOpen('Recipes & Operations', true);
    await wizard.back();
    await wizard.expectOnStep('Confirm the work your department performs');
    await wizard.expectCard(activity);
  });

  test("TC-DW-ACT-01 Step 2 lists only this department's activities", async () => {
    await allure.tms(cu('z941abw0pg'), 'TC-DW-ACT-01 (ClickUp)');
    expect(await wizard.cardCodes(ours)).toEqual([activityName]);
    expect(await wizard.cardCodes('CUT-')).toEqual([]);
  });

  // ── Step 3: Recipes ───────────────────────────────────────────────────

  test('TC-DW-REC-03 "Create a new recipe" opens the full form inline', async () => {
    await allure.tms(cu('z941abw0pv'), 'TC-DW-REC-03 (ClickUp)');
    await wizard.continue();
    await wizard.expectOnStep(/^Confirm recipes/);
    const url = page.url();
    await wizard.openCreateRecipe();
    await wizard.expectInline(url);
    await wizard.expectFormDepartmentPreset('recipe', deptName);
  });

  test("TC-DW-REC-02 A recipe's duration is derived, never typed", async () => {
    await allure.tms(cu('z941abw0pu'), 'TC-DW-REC-02 (ClickUp)');
    await wizard.expectNoTypedDuration();
    recipe = await wizard.submitRecipe(recipeName);
    created.push(`recipe:${recipe}`);
  });

  test("TC-DW-REC-01 Step 3 lists only this department's recipes", async () => {
    await allure.tms(cu('z941abw0pq'), 'TC-DW-REC-01 (ClickUp)');
    expect(await wizard.cardCodes(ours)).toEqual([recipeName]);
  });

  test('TC-DW-REC-04 Opening a recipe reaches its operations', async () => {
    await allure.tms(cu('z941abw0pw'), 'TC-DW-REC-04 (ClickUp)');
    await wizard.expectRecipeOperationsToggle(recipe);
  });

  // ── Step 4: Centres & machines ────────────────────────────────────────

  test('TC-DW-WC-02 "Add a work centre" / "Add a machine" open the full forms inline', async () => {
    await allure.tms(cu('z941abw0pz'), 'TC-DW-WC-02 (ClickUp)');
    await wizard.continue();
    await wizard.expectOnStep('Work centres and the machines inside them');
    const url = page.url();
    centre = await wizard.createWorkCentre(centreName);
    created.push(`centre:${centre}`);
    await wizard.openCreateMachine(centre);
    await wizard.expectInline(url);
  });

  test("TC-DW-WC-03 A machine can only go on this department's work centre", async () => {
    await allure.tms(cu('z941abw0q0'), 'TC-DW-WC-03 (ClickUp)');
    await wizard.expectMachineCentreLocked(centre);
    machine = await wizard.submitMachine(centre, QA_MACHINE_TYPE, machineTag);
    created.push(`machine:${machine}`);
  });

  test("TC-DW-WC-01 Step 4 lists only this department's centres and machines", async () => {
    await allure.tms(cu('z941abw0py'), 'TC-DW-WC-01 (ClickUp)');
    expect(await wizard.cardCodes(`${ours}WC`)).toEqual([centreName]);
    await wizard.showMachines(centre);
    await wizard.expectCard(machine);
  });

  test('TC-DW-WC-04 Editing a work centre here uses the standalone form', async () => {
    await allure.tms(cu('z941abw0q1'), 'TC-DW-WC-04 (ClickUp)');
    await wizard.openEditWorkCentre(centre);
    await wizard.expectWorkCentreEditForm();
    await wizard.cancelInlineForm();
  });

  test('TC-DW-WC-06 Only a user with write permission can add here', async ({ personas }) => {
    await allure.tms(cu('z941abw0q3'), 'TC-DW-WC-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const ro = new SetupDepartmentPage(roPage);
      // A read-only user is either kept out of the wizard or gets no working write action.
      if ((await ro.openForPermissionCheck()) === 'open')
        expect(await ro.isDepartmentWriteAvailable()).toBe(false);
    });
  });

  // ── Step 5: Capacity ──────────────────────────────────────────────────

  for (const [id, cid, title] of [
    [
      'TC-DW-CAP-01',
      'z941abw0q5',
      'Throughput rows and changeover rules are scoped to this department',
    ],
    [
      'TC-DW-CAP-02',
      'z941abw0q6',
      'Add throughput / changeover open the full forms, pinned to this department',
    ],
    ['TC-DW-CAP-03', 'z941abw0q7', 'A department-wide changeover rule still shows here'],
    ['TC-DW-CAP-04', 'z941abw0q8', 'The step banner reports real counts'],
    ['TC-DW-CAP-05', 'z941abw0q9', 'A throughput or changeover rule added here is live at once'],
  ] as const) {
    test(`${id} ${title}`, async () => {
      await allure.tms(cu(cid), `${id} (ClickUp)`);
      // Not written yet: fixme (not a pass) until Step 5 ships, so it shows up as a gap.
      test.fixme(true, CAPACITY_FIXME);
    });
  }

  // ── Step 6: Team & skills ─────────────────────────────────────────────

  test('TC-DW-TEAM-02 "Create employee" opens the Employee form, pinned to this department', async () => {
    await allure.tms(cu('z941abw0qb'), 'TC-DW-TEAM-02 (ClickUp)');
    // Through Step 5 (Capacity, not built yet — TC-DW-CAP-01..05) to Step 6.
    await wizard.continue();
    await wizard.expectOnStep('What your department can actually do');
    await wizard.continue();
    await wizard.expectOnStep('Your team and their qualifications');
    const url = page.url();
    await wizard.openCreateEmployee();
    await wizard.expectInline(url);
    await wizard.expectFormDepartmentPreset('employee', deptName);
  });

  test("TC-DW-TEAM-01 Step 6 lists only this department's operators", async () => {
    await allure.tms(cu('z941abw0qa'), 'TC-DW-TEAM-01 (ClickUp)');
    await wizard.cancelInlineForm();
    created.push(`operator:${operator}`);
    await wizard.createEmployee(operator);
    await wizard.expectCard(operator);
  });

  test('TC-DW-TEAM-03 "Skills" expands the operator\'s qualifications in place', async () => {
    await allure.tms(cu('z941abw0qc'), 'TC-DW-TEAM-03 (ClickUp)');
    const url = page.url();
    await wizard.openSkills(operator);
    await wizard.expectInline(url);
  });

  test("TC-DW-TEAM-05 The note says qualification changes need the manager's approval", async () => {
    await allure.tms(cu('z941abw0qe'), 'TC-DW-TEAM-05 (ClickUp)');
    await wizard.expectQualificationApprovalNote();
  });

  test('TC-DW-TEAM-04 "Add a qualification" writes a real qualification', async () => {
    await allure.tms(cu('z941abw0qd'), 'TC-DW-TEAM-04 (ClickUp)');
    await wizard.openAddQualification();
    await wizard.expectQualificationOperatorPreset(operator);
    await wizard.createQualification({
      task: QUALIFICATION_TASK,
      efficiency: '90',
      assessedBy: 'HR system',
    });
    await wizard.expectSkillRow(QUALIFICATION_TASK);
  });

  test('TC-DW-TEAM-06 A qualification added here appears on the Qualifications screen', async () => {
    await allure.tms(cu('z941abw0qf'), 'TC-DW-TEAM-06 (ClickUp)');
    // Parked with the Qualifications cases (the user, 2026-10-15): dev removed
    // the Qualifications screen on 2026-10-14. Its successor, Operators &
    // Qualifications, lists operator profiles, and the operator created in
    // Step 6 doesn't get one — after 2 min of reloads it still wasn't listed,
    // though the qualification shows in the wizard's Skills panel (TEAM-04).
    test.skip(true, QUALIFICATIONS_PARKED);
  });

  // ── Step 7: Review & complete ─────────────────────────────────────────

  test('TC-DW-FIN-01 Review counts every area live', async () => {
    await allure.tms(cu('z941abw0qh'), 'TC-DW-FIN-01 (ClickUp)');
    // Sept (dev-confirmed): the Capacity figures are placeholders until Step 5 is built.
    test.fixme(true, CAPACITY_FIXME);
  });

  test('TC-DW-FIN-02 An empty area shows "empty", not "ready"', async () => {
    await allure.tms(cu('z941abw0qj'), 'TC-DW-FIN-02 (ClickUp)');
    // Checked on a department with nothing in it (the journey's own one isn't
    // used: dev 2026-10-14 counts a just-built department's records on Review
    // only after a delay of minutes — reported with TC-DW-ACT-03).
    const empty = uniqueCode('QAD');
    created.push(empty);
    await wizard.goToStep('Department');
    await wizard.openCreateDepartment();
    await wizard.createDepartment({
      code: empty,
      name: `QA-AUTO ${empty} — Planning regression test data`,
    });
    for (let i = 0; i < 6; i += 1) await wizard.continue();
    await wizard.expectOnStep('What you are completing');
    // Dev 2026-10-13: an empty area reads "Nothing recorded yet · incomplete"
    // (the case says "empty"). Label only; the check is that it isn't "ready".
    for (const area of ['Activities', 'Recipes', 'Centres & machines', 'Team'])
      await test.step(`${area} is not "ready"`, async () => {
        await wizard.expectAreaChip(area, /^(incomplete|empty)$/);
      });
  });

  test('TC-DW-FIN-03 The review banner says changes are already live', async () => {
    await allure.tms(cu('z941abw0qk'), 'TC-DW-FIN-03 (ClickUp)');
    await allure.tms(cu('z941abw0rk'), 'TC-DW-FIN-03 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abw0rk (2026-09-22): the banner described an
    // in-place overwrite. On dev 2026-10-13 it reads as the case expects; the
    // ClickUp status is left to the user.
    await wizard.expectReviewBanner(
      'Effective from today. Everything added here is real master data — it appears on the standalone Master Data screens immediately. Orders already planned keep the versions they were planned with.',
    );
  });

  test('TC-DW-NAV-04 Progress follows the furthest step reached', async () => {
    await allure.tms(cu('z941abw0p7'), 'TC-DW-NAV-04 (ClickUp)');
    await wizard.goToStep('Department');
    await wizard.selectDepartment(dept);
    await wizard.goToStep('Review & Complete');
    await wizard.expectOnStep('What you are completing');
    await wizard.expectProgress(100);
    // Back to an earlier step: progress stays at the furthest one reached.
    await wizard.goToStep('Activities');
    await wizard.expectOnStep('Confirm the work your department performs');
    await wizard.expectProgress(100);
    await wizard.goToStep('Review & Complete');
    await wizard.expectOnStep('What you are completing');
  });

  test('TC-DW-FIN-04 "Complete department" confirms it', async () => {
    await allure.tms(cu('z941abw0qm'), 'TC-DW-FIN-04 (ClickUp)');
    await wizard.complete();
    expect(await wizard.confirmedSummaryText()).toMatch(
      /department\.updated published · \d+\/\d+ departments confirmed/,
    );
  });

  test('TC-DW-FIN-06 "Back to masters" returns to the landing page', async () => {
    await allure.tms(cu('z941abw0qp'), 'TC-DW-FIN-06 (ClickUp)');
    await wizard.backToMasters();
  });

  test('TC-DW-FIN-05 The card and the picker show the department confirmed', async () => {
    await allure.tms(cu('z941abw0qn'), 'TC-DW-FIN-05 (ClickUp)');
    await wizard.openLanding();
    expect((await wizard.confirmedCount()).confirmed).toBeGreaterThan(confirmedBefore);
    await wizard.startFromCard();
    const options = await wizard.departmentOptions();
    expect(options.find((o) => o.startsWith(`${dept} —`))).toMatch(/✓ confirmed$/);
  });

  // ── Live-data and scoping checks on the standalone screens ────────────

  test('TC-DW-ACT-05 The activity is on the standalone Activities screen', async () => {
    await allure.tms(cu('z941abw0pm'), 'TC-DW-ACT-05 (ClickUp)');
    await new ActivitiesListPage(page).findRow(activity);
  });

  test('TC-DW-REC-05 The recipe is on the standalone Recipes screen', async () => {
    await allure.tms(cu('z941abw0px'), 'TC-DW-REC-05 (ClickUp)');
    await new RecipesListPage(page).findRow(recipe);
  });

  test('TC-DW-WC-05 The centre and machine are on their standalone screens', async () => {
    await allure.tms(cu('z941abw0q2'), 'TC-DW-WC-05 (ClickUp)');
    await new WorkCentresListPage(page).findRow(centre);
    await new MachinesListPage(page).findRow(machine);
  });

  test('TC-DW-DEPT-05 A department edit here is the Departments master record', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    // Cross-module: reads the Master Data Departments screen (its own page,
    // from the merged fixtures) for the name edited in the wizard.
    await allure.tms(cu('z941abw0pe'), 'TC-DW-DEPT-05 (ClickUp)');
    await wizard.open();
    await wizard.selectDepartment(dept);
    await wizard.editDepartmentName(`${deptName} (edited)`);
    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.search(dept);
    await departmentsListPage.openDepartmentByCode(dept);
    await departmentFormPage.expectOnDetailPage();
    await departmentFormPage.expectNameShown(`${deptName} (edited)`);
  });

  test('TC-DW-DEPT-01 Switching department re-scopes the wizard', async () => {
    await allure.tms(cu('z941abw0pa'), 'TC-DW-DEPT-01 (ClickUp)');
    await wizard.open();
    await wizard.selectDepartment('CUT');
    await wizard.continue();
    // The step's cards load after the heading: wait for CUT's, then check none are ours.
    await expect.poll(async () => (await wizard.cardCodes('CUT-')).length).toBeGreaterThan(0);
    expect(await wizard.cardCodes(ours)).toEqual([]);
  });

  test('TC-DW-DEPT-06 Only a user with write permission can create or edit departments', async ({
    personas,
  }) => {
    await allure.tms(cu('z941abw0pf'), 'TC-DW-DEPT-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const ro = new SetupDepartmentPage(roPage);
      // A read-only user is either kept out of the wizard or gets no working write action.
      if ((await ro.openForPermissionCheck()) === 'open')
        expect(await ro.isDepartmentWriteAvailable()).toBe(false);
    });
  });

  test('TC-DW-NAV-06 "Cancel setup" keeps what was committed', async () => {
    await allure.tms(cu('z941abw0p9'), 'TC-DW-NAV-06 (ClickUp)');
    await wizard.open();
    await wizard.cancelSetup();
    await new ActivitiesListPage(page).findRow(activity);
  });

  // Last, so a failure here skips nothing: a department created in this page
  // session, as a user does it — Step 1 create, Continue, "New activity".
  test("TC-DW-ACT-03 The activity's department is pre-set and locked", async () => {
    await allure.tms(cu('z941abw0pj'), 'TC-DW-ACT-03 (ClickUp)');
    const fresh = uniqueCode('QAD');
    const freshName = `QA-AUTO ${fresh} — Planning regression test data`;
    created.push(fresh);
    await wizard.open();
    await wizard.openCreateDepartment();
    await wizard.createDepartment({ code: fresh, name: freshName });
    await wizard.continue();
    // Opened within ~2 s of the create, the form can still read "Select…"
    // (dev 2026-10-14); at a user's pace it shows the department — the user
    // graded this a pass. So reopen the form until it does, without a reload.
    await wizard.openCreateActivityOnceKnown(freshName);
    await wizard.expectFormDepartmentPreset('activity', freshName);
  });
});
