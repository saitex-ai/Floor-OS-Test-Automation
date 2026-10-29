import * as allure from 'allure-js-commons';
import { ActivitiesListPage } from '../../../src/pages/planning/activities-list.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  asPersona,
  createActivityDraft,
  knownBug,
  openActivity,
  personaCredentials,
  personaSkipReason,
  taggedName,
  uniqueTag,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Create Activity ("New activity" → "Create draft").
 *
 * Source of truth for these cases: test-cases/planning/create-activity.md
 * (ClickUp "Planning -Sprint -1 - Activities"). Since Sprint 1 a new
 * activity is created as a draft ("Send it for approval from its page to
 * publish it") — the cases assert that, see the doc's "Adjusted" notes.
 * Since the 2026-10-16 dev deploy the activity code is generated on save
 * (ACT-0001…) and can't be typed: each draft carries a run-unique tag in its
 * name instead, and its code is read back from the list. Everything that
 * saves is a QA-AUTO draft.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
/** A generated activity code: upper-case prefix, a dash, digits (ACT-0027, CUT-0018). */
const GENERATED_CODE = /^[A-Z]+-\d+$/;

/**
 * The cycle cases need activities that can be picked as predecessors, and
 * only approved activities are offered — dev has no approval policy for
 * activities yet, so drafts never are. Checked against the existing QA
 * draft CUT-QA-CYCLE-A before anything is created, so a skipped run leaves
 * no orphan draft behind.
 */
const CYCLE_PROBE = 'CUT-QA-CYCLE-A';
const CYCLE_SKIP = `${CYCLE_PROBE} isn't offered as a predecessor — a cycle needs two approved activities, and dev has no approval policy for activities yet (Control Center › Approvals), so none can be published.`;
const SEED_ACTIVE_CODE = 'CUT-BUFFER';

test.describe('Planning - Create Activity', () => {
  // Deletes / retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Activities');
    await allure.owner('Planning QA');
  });

  test('TC-CA-01 Open "New activity" as a dedicated full page', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu4'), 'TC-CA-01 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectOnCreatePage();
    await expect(page).toHaveURL(/\/planning\/master-data\/activities\/new$/);
  });

  test('TC-CA-02 Block Create when a required field is empty', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu5'), 'TC-CA-02 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    // Since Sprint 1 a draft needs only a name to save (the code is generated
    // since the 2026-10-16 deploy); every other required field is checked
    // before it can be sent for approval.
    await test.step('Create is blocked while Activity name is empty; the code is generated', async () => {
      expect(await activityFormPage.create()).not.toBe('submitted');
      await activityFormPage.expectRequiredFlagged();
      await activityFormPage.expectOnCreatePage();
      await activityFormPage.expectCodeGenerated();
    });
    await test.step('A name-only draft lists the rest as approval prerequisites', async () => {
      const tag = uniqueTag('CUT-QA');
      await activityFormPage.fill({ name: taggedName(tag) });
      expect(await activityFormPage.create()).toBe('submitted');
      await openActivity(page, await activitiesListPage.codeOf(tag));
      await activityFormPage.expectApprovalPrerequisites([
        'Owning department',
        'Activity type',
        'Duration scales by',
        'Time applies',
        'Standard time (min)',
        'Actuals captured by',
        'Closed by',
      ]);
    });
  });

  test('TC-CA-03 Code must be unique among active activities', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu6'), 'TC-CA-03 (ClickUp)');
    // Dev 2026-10-16: the code is generated on save (ACT-0001…) and can't be
    // typed, so a duplicate can't be entered. Checks what replaces the rule:
    // the code field is locked and each new activity gets its own code.
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectCodeGenerated();
    const a = await createActivityDraft(page);
    const b = await createActivityDraft(page);
    // The prefix isn't always ACT-: on dev 2026-10-29 a Cutting activity got
    // CUT-0018. So this checks the generated code's shape only.
    for (const code of [a, b]) expect(code).toMatch(GENERATED_CODE);
    expect(b, 'each activity gets its own code').not.toBe(a);
  });

  test('TC-CA-04 Standard time must be > 0 and is always minutes', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu7'), 'TC-CA-04 (ClickUp)');
    // Updated 2026-10-09 (the user): Standard time must be greater than 0.
    // Sept's ">= 0" (BA, 2026-09-08) no longer applies.
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.fillAllRequired(taggedName(uniqueTag('CUT-QA')));
    await test.step('A negative value cannot be entered (the "-" never lands)', async () => {
      await activityFormPage.typeInto('standardTime', '-10');
      expect(await activityFormPage.inputValue('standardTime')).not.toContain('-');
    });
    await test.step('0 is rejected: "Must be greater than 0"', async () => {
      await activityFormPage.fill({ standardTime: '0' });
      expect(await activityFormPage.create()).not.toBe('submitted');
      await activityFormPage.expectFieldError('Must be greater than 0');
    });
    await test.step('A positive value in minutes ("Standard time (min)") saves', async () => {
      await createActivityDraft(page, { standardTime: '1' });
    });
  });

  test('TC-CA-05 Efficiency assumption accepts a decimal value', async ({
    page,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu8'), 'TC-CA-05 (ClickUp)');
    // The list rounds it for display (87.5 → "88%"); the record keeps 87.5.
    const code = await createActivityDraft(page, { efficiencyAssumed: '87.5' });
    await openActivity(page, code);
    await activityFormPage.startEditing();
    expect(await activityFormPage.inputValue('efficiencyAssumed')).toBe('87.5');
  });

  test('TC-CA-06 Completion event ("Closed by") is required', async ({
    page,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu9'), 'TC-CA-06 (ClickUp)');
    // Since Sprint 1 a draft saves without it; it is required before the
    // draft can be sent for approval (listed as a prerequisite).
    const code = await createActivityDraft(page, { closedBy: '' });
    await openActivity(page, code);
    await activityFormPage.expectApprovalPrerequisites(['Closed by']);
  });

  test('TC-CA-07 Repeating-row sub-CTAs add rows (predecessor / required input / downstream consumer)', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduc'), 'TC-CA-07 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.fillAllRequired(taggedName(uniqueTag('CUT-QA')));
    await activityFormPage.addPredecessorRule(SEED_ACTIVE_CODE);
    await activityFormPage.addRequiredInput('fabric.in_house');
    await activityFormPage.addDownstreamConsumer('lab_lead');
    await activityFormPage.expectSubRowsAdded();
    expect(await activityFormPage.create()).toBe('submitted');
    await activityFormPage.expectCreatedAsDraft();
  });

  test('TC-CA-08 Circular predecessor dependency is rejected', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdud'), 'TC-CA-08 (ClickUp)');
    await allure.tms(cu('z941abu4ac'), 'TC-CA-08 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abu4ac (2026-09-09): a two-activity cycle
    // (B follows A, then A edited to follow B) is accepted instead of
    // rejected. A cycle can only be closed by editing, so this create-side
    // case runs the same steps as TC-EA-06. Marked with knownBug() until fixed.
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectOnCreatePage();
    const probe = await activityFormPage.predecessorOptions(CYCLE_PROBE);
    test.skip(!probe.some((o) => o.startsWith(CYCLE_PROBE)), CYCLE_SKIP);
    knownBug('z941abu4ac');
    const a = await createActivityDraft(page);
    const bTag = uniqueTag('CUT-QA');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectOnCreatePage();
    const offered = await activityFormPage.predecessorOptions(a);
    test.skip(!offered.some((o) => o.startsWith(a)), `Draft ${a} isn't offered as a predecessor.`);
    await activityFormPage.fillAllRequired(taggedName(bTag));
    await activityFormPage.addPredecessorRule(a);
    expect(await activityFormPage.create()).toBe('submitted');
    const b = await activitiesListPage.codeOf(bTag);
    await openActivity(page, a);
    await activityFormPage.startEditing();
    await activityFormPage.addPredecessorRule(b);
    expect(
      await activityFormPage.saveChanges(),
      'a two-activity cycle should be rejected',
    ).not.toBe('submitted');
  });

  test('TC-CA-09 Cancel discards the form without creating a record', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdue'), 'TC-CA-09 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    const tag = uniqueTag('CUT-QA');
    await activityFormPage.fill({ name: taggedName(tag) });
    await activityFormPage.cancel();
    await activityFormPage.expectBackOnList();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.search(tag);
    await activitiesListPage.expectNoRowContaining(tag);
  });

  test('TC-CA-10 Only a user with write permission can create an activity', async ({
    personas,
  }) => {
    await allure.tms(cu('z941abtduf'), 'TC-CA-10 (ClickUp)');
    await allure.tms(cu('z941abybge'), 'TC-CA-10 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abybge (2026-10-09): read-only users are
    // offered write controls on some Planning screens (enabled, then refused
    // with "Access restricted" / 403) while others hide or disable them.
    // Not reproduced on this screen on dev 2026-10-29: "New activity" was unavailable
    // to the read-only login in every run, so it's no longer a knownBug()
    // here. The ClickUp status is left to the user.
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new ActivitiesListPage(page);
      await list.open();
      await list.expectNewUnavailable();
    });
  });

  test('TC-CA-11 Reject non-numeric input in Standard time and Efficiency assumption', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduh'), 'TC-CA-11 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.fillAllRequired(taggedName(uniqueTag('CUT-QA')));
    for (const field of ['standardTime', 'efficiencyAssumed'] as const) {
      await test.step(`"abc" never saves in ${field}`, async () => {
        await activityFormPage.typeInto(field, 'abc');
        if ((await activityFormPage.inputValue(field)).includes('abc')) {
          expect(await activityFormPage.create()).not.toBe('submitted');
        }
        await activityFormPage.typeInto(field, field === 'standardTime' ? '60' : '90');
      });
    }
  });

  test('TC-CA-12 Code uniqueness check is case-insensitive', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduj'), 'TC-CA-12 (ClickUp)');
    // Dev 2026-10-16: the code is generated on save and can't be typed, so a
    // lower-case copy of an existing code can't be entered. Checks the field
    // is locked and the generated code is upper case.
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectCodeGenerated();
    expect(await createActivityDraft(page)).toMatch(GENERATED_CODE);
  });

  test('TC-CA-13 An activity cannot list itself as its own predecessor', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduk'), 'TC-CA-13 (ClickUp)');
    // "The activity must already exist, and an activity cannot be its own
    // predecessor": the activity being created is never offered as a
    // predecessor (it has no code until saved, so look for its name tag).
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    const tag = uniqueTag('CUT-QA');
    await activityFormPage.fillAllRequired(taggedName(tag));
    const offered = await activityFormPage.predecessorOptions(tag);
    expect(offered.filter((o) => o.includes(tag))).toEqual([]);
  });
});
