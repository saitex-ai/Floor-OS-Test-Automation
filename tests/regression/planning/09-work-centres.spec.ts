import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { WorkCentresListPage } from '../../../src/pages/planning/work-centres-list.page';
import { WorkCentreDetailPage } from '../../../src/pages/planning/work-centre-detail.page';
import {
  WORK_CENTRE_REQUIRED,
  type CapabilityValues,
} from '../../../src/pages/planning/work-centre-form.page';
import {
  asPersona,
  createMachine,
  createWorkCentre,
  openMachine,
  openWorkCentre,
  personaCredentials,
  personaSkipReason,
  nameOf,
  setupPage,
  taggedName,
  tagOf,
  uniqueTag,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Work Centres (Create / Edit / List) at
 * /planning/master-data/work-centres.
 *
 * Source of truth for these cases: test-cases/planning/work-centres.md
 * (ClickUp "Planning -Sprint-2 - Work Centre"). Work centres are only ever
 * created by this file (QA-AUTO tagged, a QA-WC… tag in the name; dev
 * generates the code, WC-0001…, since the 2026-10-16 deploy); seed centres
 * (WASH-A, LINE-30, …) are only read. They can't be deleted, only retired.
 *
 * beforeAll builds `sample` (a Sample centre that can run SEW-MAIN,
 * preferred) and `bulk` (a Bulk centre with no capabilities).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
/** Demo Feedback (ClickUp z941abwdad, implemented 2026-09-25): Version / Effective from / Effective to removed. */
const DEMO_FEEDBACK = cu('z941abwdad');
const CAPABILITY: CapabilityValues = { matchesOn: 'Activity', code: 'SEW-MAIN', preferred: 'Yes' };

test.describe('Planning - Work Centres', () => {
  // Retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let sample = '';
  let bulk = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    sample = await createWorkCentre(page, { usedFor: 'Sample', capability: CAPABILITY });
    bulk = await createWorkCentre(page);
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Work Centres');
    await allure.owner('Planning QA');
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CWC-01 Open "New work centre" as a dedicated page', async ({
    workCentresListPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb7w'), 'TC-CWC-01 (ClickUp)');
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.openNewWorkCentre();
    await workCentreFormPage.expectDedicatedCreatePage();
    // Effective from / to were removed on request (Demo Feedback z941abwdad).
    await allure.link(DEMO_FEEDBACK, 'Demo Feedback z941abwdad (ClickUp)');
    await workCentreFormPage.expectFullFieldSet();
  });

  test('TC-CWC-02 Block Create when a required field is empty', async ({ workCentreFormPage }) => {
    await allure.tms(cu('z941abvb7x'), 'TC-CWC-02 (ClickUp)');
    // Live required set (2026-10-12): the case's list minus Effective from
    // (removed on request, Demo Feedback z941abwdad) plus Centre type
    // (required since 2026-10-01), minus Centre code (generated on save
    // since the 2026-10-16 dev deploy).
    test.setTimeout(420_000);
    await workCentreFormPage.open();
    await test.step('An empty form flags exactly the 7 required fields; the code is generated', async () => {
      await workCentreFormPage.create();
      await workCentreFormPage.expectRequiredCount(WORK_CENTRE_REQUIRED.length);
      await workCentreFormPage.expectCodeGenerated();
    });
    for (const field of WORK_CENTRE_REQUIRED) {
      await test.step(`Empty ${field} blocks Create`, async () => {
        await workCentreFormPage.open();
        await workCentreFormPage.fillRequired(
          { name: taggedName(uniqueTag('QA-WC')) },
          { except: field },
        );
        expect(await workCentreFormPage.submitCreate()).not.toBe('submitted');
        await workCentreFormPage.expectFieldFlagged(field);
        await workCentreFormPage.expectRequiredCount(1);
      });
    }
  });

  test('TC-CWC-03 Centre code must be unique, case-insensitively', async ({
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb7y'), 'TC-CWC-03 (ClickUp)');
    // Dev 2026-10-16: the code is generated on save (WC-0001…) and can't be
    // typed, so a duplicate (in any case) can't be entered. Checks what
    // replaces the rule: the code field is locked and each new centre gets
    // its own upper-case code (`sample` and `bulk` from beforeAll).
    await workCentreFormPage.open();
    await workCentreFormPage.expectCodeGenerated();
    for (const code of [sample, bulk]) expect(code).toMatch(/^WC-\d+$/);
    expect(bulk, 'each work centre gets its own code').not.toBe(sample);
  });

  test('TC-CWC-04 "What it is used for" offers Bulk / Sample and matches the list tab', async ({
    workCentreFormPage,
    workCentresListPage,
  }) => {
    await allure.tms(cu('z941abvb7z'), 'TC-CWC-04 (ClickUp)');
    // The case also listed Subcontractor; dev offers Bulk and Sample only —
    // graded a pass by the user (2026-10-12).
    for (const [pool, code] of [
      ['Bulk', bulk],
      ['Sample', sample],
    ] as const) {
      await test.step(`A ${pool} centre is listed under the ${pool} tab`, async () => {
        await workCentresListPage.findRow(code);
        await workCentresListPage.selectTab(pool);
        await workCentresListPage.expectRowVisible(code);
        await workCentresListPage.expectEveryRowMatches(pool);
      });
    }
    await test.step('Bulk and Sample are offered', async () => {
      await workCentreFormPage.open();
      expect(await workCentreFormPage.usedForOptions()).toEqual(['Bulk', 'Sample']);
    });
  });

  test('TC-CWC-05 "Capacity per day" is derived, never typed', async ({
    page,
    workCentreFormPage,
    workCentreDetailPage,
  }) => {
    await allure.tms(cu('z941abvb80'), 'TC-CWC-05 (ClickUp)');
    // BA decision (2026-09-16): the field isn't on the create/edit form at
    // all; it's a read-only derived value on the detail page and list.
    await workCentreFormPage.open();
    await workCentreFormPage.expectNoCapacityPerDayInput();
    await openWorkCentre(page, bulk);
    await workCentreDetailPage.expectValue('Capacity / day', /min$/);
  });

  test('TC-CWC-06 "Activities it can run" rows round-trip; an empty list says so', async ({
    page,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb81'), 'TC-CWC-06 (ClickUp)');
    await test.step('No capabilities: "nothing can be scheduled here"', async () => {
      await openWorkCentre(page, bulk);
      await workCentreDetailPage.expectValue('Activities it can run', 'None');
      await workCentreDetailPage.startEditing();
      await workCentreFormPage.expectOnEditPage();
      await workCentreFormPage.expectNoCapabilities();
    });
    await test.step('Activity / SEW-MAIN / Preferred round-trips', async () => {
      await openWorkCentre(page, sample);
      await workCentreDetailPage.expectValue('Activities it can run', /SEW-MAIN/);
      await workCentreDetailPage.startEditing();
      await workCentreFormPage.expectOnEditPage();
      await workCentreFormPage.expectCapability(CAPABILITY);
    });
  });

  test('TC-CWC-07 Effective from / Effective to are no longer on a work centre', async ({
    page,
    workCentreFormPage,
    workCentreDetailPage,
  }) => {
    await allure.tms(cu('z941abvb82'), 'TC-CWC-07 (ClickUp)');
    // The case covered Effective from (required) / Effective to ("Current").
    // Both were removed on request (Demo Feedback z941abwdad, implemented
    // 2026-09-25) — graded a pass by the user (2026-10-12); this checks they stay gone.
    await allure.link(DEMO_FEEDBACK, 'Demo Feedback z941abwdad (ClickUp)');
    await workCentreFormPage.open();
    await workCentreFormPage.expectNoEffectiveDateFields();
    await openWorkCentre(page, bulk);
    await workCentreDetailPage.expectNoField(/^Effective (from|to)\b/);
  });

  test('TC-CWC-08 Cancel discards the form without creating a record', async ({
    workCentreFormPage,
    workCentresListPage,
  }) => {
    await allure.tms(cu('z941abvb83'), 'TC-CWC-08 (ClickUp)');
    const tag = uniqueTag('QA-WC');
    await workCentreFormPage.open();
    await workCentreFormPage.fillRequired({ name: taggedName(tag) });
    await workCentreFormPage.cancel();
    // On dev 2026-10-29 Cancel on a form opened by its URL didn't land on the
    // list, so the list is opened to look for the record.
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.search(tag);
    await workCentresListPage.expectNoRowContaining(tag);
  });

  test('TC-CWC-09 Only a user with write permission can create a work centre', async ({
    personas,
    workCentresListPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb84'), 'TC-CWC-09 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens the create form', async () => {
      await workCentresListPage.open();
      await workCentresListPage.expectLoaded();
      await workCentresListPage.openNewWorkCentre();
      await workCentreFormPage.expectDedicatedCreatePage();
    });
    await test.step('Read-only user cannot get to a working create form', async () => {
      await asPersona(personas, 'READONLY', async (page) => {
        const list = new WorkCentresListPage(page);
        await list.open();
        await list.expectNewBlocked();
      });
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EWC-01 Open a work centre for editing; Centre code is read-only', async ({
    page,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb85'), 'TC-EWC-01 (ClickUp)');
    await openWorkCentre(page, bulk);
    await workCentreDetailPage.startEditing();
    await workCentreFormPage.expectOnEditPage();
    await workCentreFormPage.expectCodeLocked(bulk);
  });

  test('TC-EWC-02 Editable fields persist after Save changes', async ({
    page,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb89'), 'TC-EWC-02 (ClickUp)');
    // Area has no options on dev (no layout drawn yet), so it's left alone.
    const code = await createWorkCentre(page);
    // A work centre's name is at most 96 characters (the full tag + "edited" is
    // longer). Keeps the run tag: cleanup finds the record by it.
    const renamed = `QA-AUTO ${tagOf(code)} edited — Planning regression test data`;
    await openWorkCentre(page, code);
    await workCentreDetailPage.startEditing();
    await workCentreFormPage.expectOnEditPage();
    await test.step('The save notice is shown before saving', async () => {
      // Sept: "saves as a new version" (v1 → v2). Version was removed on
      // request (Demo Feedback z941abwdad); the notice now says the save rewrites the record.
      await allure.link(DEMO_FEEDBACK, 'Demo Feedback z941abwdad (ClickUp)');
      await workCentreFormPage.expectSaveNotice('Saving rewrites this work centre.');
    });
    await workCentreFormPage.setName(renamed);
    await workCentreFormPage.setOwningDepartment('Cutting');
    // Baseline operators is left alone: since the 2026-10-28 dev deploy a
    // stations centre's headcount can't exceed its active stations ("Headcount
    // 14 is more than the 0 active station(s)…", 400), and this one has none.
    await workCentreFormPage.setTargetEfficiency('85');
    // Any calendar other than the current one: the seed calendars are year-bound ("Factory 2026-27").
    const calendar = await workCentreFormPage.pickAnotherWorkingCalendar();
    expect(await workCentreFormPage.saveChanges()).toBe('submitted');
    await openWorkCentre(page, code);
    for (const [label, value] of [
      ['Name', renamed],
      ['Owning department', /^CUT/],
      ['Target efficiency', '85%'],
      ['Working calendar', calendar],
    ] as const)
      await test.step(`${label} persisted`, async () => {
        await workCentreDetailPage.expectValue(label, value);
      });
  });

  test('TC-EWC-03 Block Save changes when a required field is cleared', async ({
    page,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb8a'), 'TC-EWC-03 (ClickUp)');
    // The required comboboxes have no empty option once set, so Name is cleared.
    await openWorkCentre(page, bulk);
    await workCentreDetailPage.startEditing();
    await workCentreFormPage.expectOnEditPage();
    await workCentreFormPage.setName('');
    expect(await workCentreFormPage.saveChanges()).not.toBe('submitted');
    await workCentreFormPage.expectFieldFlagged('name');
  });

  test('TC-EWC-04 "Machines" is a derived count of the active machines on the centre', async ({
    page,
    workCentreDetailPage,
    workCentreFormPage,
    machineFormPage,
    machineDetailPage,
  }) => {
    await allure.tms(cu('z941abvb8b'), 'TC-EWC-04 (ClickUp)');
    // A dedicated QA centre + machine pair, never a seed centre (LINE-30).
    const centre = await createWorkCentre(page);
    await test.step('No machines yet: 0, and the field is not editable', async () => {
      await openWorkCentre(page, centre);
      await workCentreDetailPage.expectValue('Machines', '0');
      await workCentreDetailPage.startEditing();
      await workCentreFormPage.expectMachinesDerived(0);
    });
    const machine = await createMachine(page, centre);
    await test.step('An active machine on the centre: 1', async () => {
      await openWorkCentre(page, centre);
      await workCentreDetailPage.expectValue('Machines', '1');
    });
    await test.step('Retiring that machine: back to 0', async () => {
      await openMachine(page, machine);
      await machineDetailPage.startEditing();
      await machineFormPage.expectOnEditPage();
      await machineFormPage.setStatus('Retired');
      expect(await machineFormPage.saveChanges()).toBe('submitted');
      await openWorkCentre(page, centre);
      await workCentreDetailPage.expectValue('Machines', '0');
    });
  });

  test('TC-EWC-05 Cancel discards in-progress edits', async ({
    page,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb8c'), 'TC-EWC-05 (ClickUp)');
    await openWorkCentre(page, bulk);
    const baseline = await workCentreDetailPage.value('Baseline operators');
    await workCentreDetailPage.startEditing();
    await workCentreFormPage.expectOnEditPage();
    await workCentreFormPage.setName(
      `QA-AUTO ${tagOf(bulk)} cancelled — Planning regression test data`,
    );
    await workCentreFormPage.setBaselineOperators('99');
    await workCentreFormPage.cancel();
    await openWorkCentre(page, bulk);
    await workCentreDetailPage.expectValue('Name', nameOf(bulk));
    await workCentreDetailPage.expectValue('Baseline operators', baseline);
  });

  test('TC-EWC-06 Only a user with write permission can save edits', async ({
    personas,
    page,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb8d'), 'TC-EWC-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens the edit form', async () => {
      await openWorkCentre(page, bulk);
      await workCentreDetailPage.startEditing();
      await workCentreFormPage.expectOnEditPage();
    });
    await test.step('Read-only user can view it but not get to a working edit form', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        await openWorkCentre(roPage, bulk);
        await new WorkCentreDetailPage(roPage).expectEditBlocked();
      });
    });
  });

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LWC-01 "New work centre" opens the create form as its own page', async ({
    workCentresListPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb8e'), 'TC-LWC-01 (ClickUp)');
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.openNewWorkCentre();
    await workCentreFormPage.expectDedicatedCreatePage();
  });

  test('TC-LWC-02 Search filters by code, name, department or capacity model', async ({
    workCentresListPage,
  }) => {
    await allure.tms(cu('z941abvb8f'), 'TC-LWC-02 (ClickUp)');
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await test.step('By code', async () => {
      await workCentresListPage.search(sample);
      await workCentresListPage.expectRowVisible(sample);
      await workCentresListPage.expectEveryRowMatches(sample);
    });
    await test.step('By name', async () => {
      await workCentresListPage.search(nameOf(sample).slice(0, 25));
      await workCentresListPage.expectRowVisible(sample);
    });
    await test.step('By capacity model', async () => {
      await workCentresListPage.search('Time based');
      await workCentresListPage.expectRowVisible(sample);
      await workCentresListPage.expectEveryRowMatches('Time based');
    });
    await test.step('By department', async () => {
      // The grid shows the department's code (Sewing → SEW).
      await workCentresListPage.search('SEW');
      await workCentresListPage.expectRowVisible(sample);
      await workCentresListPage.expectEveryRowMatches('SEW');
    });
  });

  test('TC-LWC-03 Tabs filter the grid with accurate counts', async ({ workCentresListPage }) => {
    await allure.tms(cu('z941abvb8g'), 'TC-LWC-03 (ClickUp)');
    // A pool's tab only appears once a centre uses it; `sample` makes sure Sample exists.
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    // Counts are re-read together until they agree (records can change mid-read under parallel workers).
    await test.step('Bulk + Sample = All', async () => {
      await workCentresListPage.expectTabCountsAddUp(['Bulk', 'Sample']);
    });
    for (const tab of ['Bulk', 'Sample']) {
      await test.step(`"${tab}" tab count matches its rows`, async () => {
        await workCentresListPage.selectTab(tab);
        await workCentresListPage.expectTabCountMatchesRows(tab);
        await workCentresListPage.expectEveryRowMatches(tab);
      });
    }
  });

  test('TC-LWC-04 Filters panel applies and clears a rule', async ({ workCentresListPage }) => {
    await allure.tms(cu('z941abvb8h'), 'TC-LWC-04 (ClickUp)');
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.openFilters();
    await workCentresListPage.addFilterRule('Centre', sample);
    await workCentresListPage.expectFiltersBadge(1);
    await workCentresListPage.expectRowVisible(sample);
    await expect.poll(() => workCentresListPage.visibleRowCount()).toBe(1);
    await test.step('Clear all restores the full list', async () => {
      await workCentresListPage.clearAllFilters();
      await workCentresListPage.expectNoFiltersBadge();
      await expect.poll(() => workCentresListPage.visibleRowCount()).toBeGreaterThan(1);
    });
  });

  test('TC-LWC-05 Columns icon hides a column', async ({ workCentresListPage }) => {
    await allure.tms(cu('z941abvb8j'), 'TC-LWC-05 (ClickUp)');
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.expectColumnVisible('Activities it can run');
    await workCentresListPage.hideColumn('Activities it can run');
    await workCentresListPage.expectColumnHidden('Activities it can run');
    await workCentresListPage.resetColumns();
    await workCentresListPage.expectColumnVisible('Activities it can run');
  });

  test('TC-LWC-06 View switch re-renders without data loss', async ({ workCentresListPage }) => {
    await allure.tms(cu('z941abvb8k'), 'TC-LWC-06 (ClickUp)');
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    const { total } = await workCentresListPage.showing();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await test.step(view, async () => {
        await workCentresListPage.switchView(view);
        await workCentresListPage.expectViewActive(view);
      });
    }
    await workCentresListPage.expectGridVisible();
    expect((await workCentresListPage.showing()).total).toBe(total);
  });

  test('TC-LWC-07 Row click opens the detail page; Edit is a separate action', async ({
    workCentresListPage,
    workCentreDetailPage,
    workCentreFormPage,
  }) => {
    await allure.tms(cu('z941abvb8m'), 'TC-LWC-07 (ClickUp)');
    await workCentresListPage.findRow(sample);
    await workCentresListPage.openRow(sample);
    await workCentreDetailPage.expectLoaded(sample);
    await workCentreDetailPage.expectReadOnlyView();
    await workCentreDetailPage.startEditing();
    await workCentreFormPage.expectOnEditPage();
  });

  test('TC-LWC-08 Empty state and no-match state', async ({ workCentresListPage }) => {
    await allure.tms(cu('z941abvb8n'), 'TC-LWC-08 (ClickUp)');
    // The zero-records half can't run on a shared environment.
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.search(`no-such-centre-${Date.now()}`);
    await workCentresListPage.expectNoMatchState();
  });

  test('TC-LWC-09 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abvb8p'), 'TC-LWC-09 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new WorkCentresListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });
});
