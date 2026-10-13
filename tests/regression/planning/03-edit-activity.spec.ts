import * as allure from 'allure-js-commons';
import { ActivitiesListPage } from '../../../src/pages/planning/activities-list.page';
import { ActivityFormPage } from '../../../src/pages/planning/activity-form.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  asPersona,
  createActivityDraft,
  knownBug,
  openActivity,
  personaCredentials,
  personaSkipReason,
  setupPage,
  taggedName,
  uniqueCode,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Edit Activity (detail page → "Edit activity" → "Save draft").
 *
 * Source of truth for these cases: test-cases/planning/edit-activity.md
 * (ClickUp "Planning -Sprint -1 - Activities"). Every case edits a
 * QA-AUTO draft this file created — a published (seed) activity can only
 * be changed through a new revision that needs approval, which this suite
 * never opens.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

/**
 * The cycle cases need activities that can be picked as predecessors, and
 * only approved activities are offered — dev has no approval policy for
 * activities yet, so drafts never are. Checked against the existing QA
 * draft CUT-QA-CYCLE-A before anything is created, so a skipped run leaves
 * no orphan draft behind.
 */
const CYCLE_PROBE = 'CUT-QA-CYCLE-A';
const CYCLE_SKIP = `${CYCLE_PROBE} isn't offered as a predecessor — a cycle needs two approved activities, and dev has no approval policy for activities yet (Control Center › Approvals), so none can be published.`;

test.describe('Planning - Edit Activity', () => {
  // Deletes / retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let code = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (each create ~10–20 s on dev).
    test.setTimeout(180_000);
    const page = await setupPage(browser);
    code = await createActivityDraft(page);
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Activities');
    await allure.owner('Planning QA');
  });

  test('TC-EA-01 Open an existing activity for editing', async ({ page, activityFormPage }) => {
    await allure.tms(cu('z941abtdup'), 'TC-EA-01 (ClickUp)');
    await openActivity(page, code);
    await activityFormPage.startEditing();
  });

  test('TC-EA-02 Code is read-only on Edit', async ({ page, activityFormPage }) => {
    await allure.tms(cu('z941abtduq'), 'TC-EA-02 (ClickUp)');
    await openActivity(page, code);
    await activityFormPage.startEditing();
    await activityFormPage.expectCodeLocked();
  });

  test('TC-EA-03 Editable fields persist after Save changes', async ({
    page,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdur'), 'TC-EA-03 (ClickUp)');
    const renamed = `${taggedName(code)} (edited)`;
    await openActivity(page, code);
    await activityFormPage.startEditing();
    await activityFormPage.fill({ name: renamed, standardTime: '75' });
    expect(await activityFormPage.saveChanges()).toBe('submitted');

    await openActivity(page, code);
    await activityFormPage.startEditing();
    await activityFormPage.expectNameValue(renamed);
    expect(await activityFormPage.inputValue('standardTime')).toBe('75');
  });

  test('TC-EA-04 Block Save changes when a required field is cleared', async ({
    page,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduu'), 'TC-EA-04 (ClickUp)');
    await openActivity(page, code);
    await activityFormPage.startEditing();
    await activityFormPage.fill({ name: '' });
    expect(await activityFormPage.saveChanges()).not.toBe('submitted');
    await activityFormPage.expectRequiredFlagged();
  });

  test('TC-EA-05 Sub-CTAs behave the same as on Create', async ({ page, activityFormPage }) => {
    await allure.tms(cu('z941abtduv'), 'TC-EA-05 (ClickUp)');
    const own = await createActivityDraft(page);
    await openActivity(page, own);
    await activityFormPage.startEditing();
    await activityFormPage.addPredecessorRule('CUT-BUFFER');
    await activityFormPage.addRequiredInput('fabric.in_house');
    await activityFormPage.addDownstreamConsumer('lab_lead');
    await activityFormPage.expectSubRowsAdded();
    expect(await activityFormPage.saveChanges()).toBe('submitted');
  });

  test('TC-EA-06 Circular predecessor dependency is rejected on Save changes', async ({
    page,
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduw'), 'TC-EA-06 (ClickUp)');
    await allure.tms(cu('z941abu4ac'), 'TC-EA-06 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abu4ac (2026-09-09): A created, B created
    // following A, then A edited to follow B — the save is accepted and
    // closes a real cycle. Marked with knownBug() until fixed.
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectOnCreatePage();
    const probe = await activityFormPage.predecessorOptions(CYCLE_PROBE);
    test.skip(!probe.some((o) => o.startsWith(CYCLE_PROBE)), CYCLE_SKIP);
    knownBug('z941abu4ac');
    const a = await createActivityDraft(page);
    const b = uniqueCode('CUT-QA');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    const offered = await activityFormPage.predecessorOptions(a);
    test.skip(!offered.some((o) => o.startsWith(a)), `Draft ${a} isn't offered as a predecessor.`);
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

  test('TC-EA-07 Cancel discards in-progress edits', async ({ page, activityFormPage }) => {
    await allure.tms(cu('z941abtdux'), 'TC-EA-07 (ClickUp)');
    await openActivity(page, code);
    await activityFormPage.startEditing();
    const before = await activityFormPage.inputValue('name');
    await activityFormPage.fill({ name: `${before} SHOULD NOT PERSIST` });
    await activityFormPage.cancel();

    await openActivity(page, code);
    await activityFormPage.startEditing();
    await activityFormPage.expectNameValue(before);
  });

  test('TC-EA-08 Only a user with write permission can save edits', async ({ personas }) => {
    await allure.tms(cu('z941abtduy'), 'TC-EA-08 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    // Read-only: the seeded published activity CUT-BUFFER is only viewed.
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new ActivitiesListPage(page);
      await list.findRow('CUT-BUFFER');
      await list.openRow('CUT-BUFFER');
      await new ActivityFormPage(page).expectNoEditAction();
    });
  });

  test('TC-EA-09 Reject non-numeric input in Standard time and Efficiency assumption', async ({
    page,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtduz'), 'TC-EA-09 (ClickUp)');
    await openActivity(page, code);
    await activityFormPage.startEditing();
    for (const field of ['standardTime', 'efficiencyAssumed'] as const) {
      await test.step(`"abc" never saves in ${field}`, async () => {
        const before = await activityFormPage.inputValue(field);
        await activityFormPage.typeInto(field, 'abc');
        if ((await activityFormPage.inputValue(field)).includes('abc')) {
          expect(await activityFormPage.saveChanges()).not.toBe('submitted');
        }
        await activityFormPage.typeInto(field, before || '90');
      });
    }
  });

  test('TC-EA-10 An activity cannot be given a self-referencing predecessor while editing', async ({
    page,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdv0'), 'TC-EA-10 (ClickUp)');
    await openActivity(page, code);
    await activityFormPage.startEditing();
    const offered = await activityFormPage.predecessorOptions(code);
    expect(offered.filter((o) => o.startsWith(`${code} `))).toEqual([]);
  });
});
