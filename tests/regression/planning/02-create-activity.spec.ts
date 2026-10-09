import * as allure from 'allure-js-commons';
import { ActivitiesListPage } from '../../../src/pages/planning/activities-list.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  asPersona,
  createActivityDraft,
  openActivity,
  personaCredentials,
  personaSkipReason,
  taggedName,
  uniqueCode,
} from './support/test-data';

/**
 * Planning — Create Activity ("New activity" → "Create draft").
 *
 * Source of truth for these cases: test-cases/planning/create-activity.md
 * (ClickUp "Planning -Sprint -1 - Activities"). Since Sprint 1 a new
 * activity is created as a draft ("Send it for approval from its page to
 * publish it") — the cases assert that, see the doc's "Adjusted" notes.
 * Uniqueness cases try a seeded active code (CUT-BUFFER) and are blocked
 * before anything is saved; everything that saves is a QA-AUTO draft.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const SEED_ACTIVE_CODE = 'CUT-BUFFER';

test.describe('Planning - Create Activity', () => {
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
    // Since Sprint 1 a draft needs only code + name to save; every other
    // required field is checked before it can be sent for approval.
    await test.step('Create is blocked while Activity code and name are empty', async () => {
      expect(await activityFormPage.create()).not.toBe('submitted');
      await activityFormPage.expectRequiredFlagged();
      await activityFormPage.expectOnCreatePage();
    });
    await test.step('A code-and-name-only draft lists the rest as approval prerequisites', async () => {
      const code = uniqueCode('CUT-QA');
      await activityFormPage.fill({ code, name: taggedName(code) });
      expect(await activityFormPage.create()).toBe('submitted');
      await openActivity(page, code);
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
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdu6'), 'TC-CA-03 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.fillAllRequired(SEED_ACTIVE_CODE, taggedName(SEED_ACTIVE_CODE));
    expect(await activityFormPage.create()).not.toBe('submitted');
    await activityFormPage.expectUniquenessError();
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
    const code = uniqueCode('CUT-QA');
    await activityFormPage.fillAllRequired(code, taggedName(code));
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
    const code = uniqueCode('CUT-QA');
    await activityFormPage.fillAllRequired(code, taggedName(code));
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
    // case runs the same steps as TC-EA-06. Expected to fail until fixed.
    const a = await createActivityDraft(page);
    const b = uniqueCode('CUT-QA');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectOnCreatePage();
    const offered = await activityFormPage.predecessorOptions(a);
    test.skip(
      !offered.some((o) => o.startsWith(a)),
      `Draft ${a} isn't offered as a predecessor — a cycle needs two approved activities, and dev has no approval policy for activities yet (Control Center › Approvals), so none can be published.`,
    );
    await activityFormPage.fillAllRequired(b, taggedName(b));
    await activityFormPage.addPredecessorRule(a);
    expect(await activityFormPage.create()).toBe('submitted');
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
    const code = uniqueCode('CUT-QA');
    await activityFormPage.fill({ code, name: taggedName(code) });
    await activityFormPage.cancel();
    await activityFormPage.expectBackOnList();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.search(code);
    await activitiesListPage.expectNoRow(code);
  });

  test('TC-CA-10 Only a user with write permission can create an activity', async ({ browser }) => {
    await allure.tms(cu('z941abtduf'), 'TC-CA-10 (ClickUp)');
    await allure.tms(cu('z941abybge'), 'TC-CA-10 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abybge (2026-10-09): read-only users are
    // offered write controls on some Planning screens (enabled, then refused
    // with "Access restricted" / 403) while others hide or disable them.
    // Expected to fail until fixed.
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(browser, 'READONLY', async (page) => {
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
    const code = uniqueCode('CUT-QA');
    await activityFormPage.fillAllRequired(code, taggedName(code));
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
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduj'), 'TC-CA-12 (ClickUp)');
    const lower = SEED_ACTIVE_CODE.toLowerCase();
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.fillAllRequired(lower, taggedName(lower));
    expect(await activityFormPage.create()).not.toBe('submitted');
    await activityFormPage.expectUniquenessError();
  });

  test('TC-CA-13 An activity cannot list itself as its own predecessor', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduk'), 'TC-CA-13 (ClickUp)');
    // "The activity must already exist, and an activity cannot be its own
    // predecessor": a code being created is never offered as a predecessor.
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    const code = uniqueCode('CUT-QA');
    await activityFormPage.fillAllRequired(code, taggedName(code));
    const offered = await activityFormPage.predecessorOptions(code);
    expect(offered.filter((o) => o.startsWith(`${code} `))).toEqual([]);
  });
});
