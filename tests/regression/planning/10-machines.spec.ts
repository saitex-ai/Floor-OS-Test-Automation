import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { MachinesListPage } from '../../../src/pages/planning/machines-list.page';
import { MachineDetailPage } from '../../../src/pages/planning/machine-detail.page';
import {
  MACHINE_REQUIRED,
  type MachineStatus,
} from '../../../src/pages/planning/machine-form.page';
import {
  addWindow,
  asPersona,
  createMachine,
  createWorkCentre,
  OTHER_MACHINE_TYPE,
  QA_MACHINE_TYPE,
  openMachine,
  personaCredentials,
  personaSkipReason,
  setupPage,
  uniqueCode,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Machines (Create / Edit / List) at
 * /planning/master-data/machines (nav tile "Machines & maintenance").
 *
 * Source of truth for these cases: test-cases/planning/machines.md
 * (ClickUp "Planning -Sprint-2 - Machine and maintenance"). Machines are
 * only ever created by this file, on a QA-AUTO work centre it creates;
 * a machine has no name field, so a "QA-AUTO" system link carries the
 * marker, and every QA machine is a "BTK · Bartack" (a type no seed machine
 * uses). Seed machines (WA-M1, DY-M1, …) are only read.
 *
 * The 2026-10-14 dev deploy replaced the free-text "Machine class" with a
 * "Machine type" picker (the Machine type master). Cases that changed,
 * cleared or searched the class now use the type; see the "Adjusted for
 * today's app" column in test-cases/planning/machines.md.
 *
 * beforeAll builds the QA work centre `centre`, a second one `other`, and
 * the Active machine `machine` (property capacity_kg = 350).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
/** Demo Feedback (ClickUp z941abwdad, implemented 2026-09-25): Version / Effective from / Effective to removed. */
const DEMO_FEEDBACK = cu('z941abwdad');

test.describe('Planning - Machines', () => {
  // Retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let centre = '';
  let other = '';
  let machine = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    centre = await createWorkCentre(page);
    other = await createWorkCentre(page);
    machine = await createMachine(page, centre, { property: ['capacity_kg', '350'] });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Machines');
    await allure.owner('Planning QA');
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CM-01 Open "New machine" as a dedicated page', async ({
    machinesListPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8q0'), 'TC-CM-01 (ClickUp)');
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    await machinesListPage.openNewMachine();
    await machineFormPage.expectDedicatedCreatePage();
    await machineFormPage.expectFullFieldSet();
  });

  test('TC-CM-02 Block Create when a required field is empty', async ({ machineFormPage }) => {
    await allure.tms(cu('z941abv8q2'), 'TC-CM-02 (ClickUp)');
    await machineFormPage.open();
    await machineFormPage.create();
    await machineFormPage.expectRequiredCount(MACHINE_REQUIRED.length);
    for (const field of MACHINE_REQUIRED) await machineFormPage.expectFieldFlagged(field);
  });

  test('TC-CM-03 Asset code must be unique, case-insensitively', async ({
    machineFormPage,
    machinesListPage,
  }) => {
    await allure.tms(cu('z941abv8q3'), 'TC-CM-03 (ClickUp)');
    await machineFormPage.open();
    await machineFormPage.fillRequired({
      code: machine.toLowerCase(),
      machineType: QA_MACHINE_TYPE,
      workCentre: centre,
    });
    expect(await machineFormPage.submitCreate()).not.toBe('submitted');
    await machineFormPage.expectCodeTaken();
    await machinesListPage.findRow(machine);
    await expect.poll(() => machinesListPage.visibleRowCount()).toBe(1);
  });

  test('TC-CM-04 Status accepts all four values, each with a distinct badge', async ({
    page,
    machineFormPage,
    machinesListPage,
  }) => {
    await allure.tms(cu('z941abv8q4'), 'TC-CM-04 (ClickUp)');
    test.setTimeout(300_000);
    const statuses: MachineStatus[] = ['Active', 'Down', 'In maintenance', 'Retired'];
    await machineFormPage.open();
    expect(await machineFormPage.statusOptions()).toEqual(statuses);
    // Down and In maintenance share the same orange pill; they differ by
    // label. The user graded that a pass (2026-10-12), so each status needs
    // its own labelled, coloured badge — not four different colours.
    for (const status of statuses) {
      await test.step(`A machine saved as ${status} shows a ${status} badge`, async () => {
        const code = await createMachine(page, centre, { status });
        await machinesListPage.findRow(code);
        expect(await machinesListPage.statusBadgeColours(code, status)).not.toMatch(/^transparent/);
      });
    }
  });

  test('TC-CM-05 Class-specific properties are typed key/value rows, not raw JSON', async ({
    page,
    machinesListPage,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8q6'), 'TC-CM-05 (ClickUp)');
    // `machine` was created with capacity_kg = 350 in beforeAll.
    await machinesListPage.findRow(machine);
    await machinesListPage.expectRowContains(machine, 'capacity_kg: 350');
    await openMachine(page, machine);
    await machineDetailPage.expectValueContains('Class-specific properties', 'capacity_kg: 350');
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
    await machineFormPage.expectPropertiesAsRows(1);
  });

  test('TC-CM-06 Cancel discards the form without creating a record', async ({
    machineFormPage,
    machinesListPage,
  }) => {
    await allure.tms(cu('z941abv8q7'), 'TC-CM-06 (ClickUp)');
    const code = uniqueCode('QA-M');
    await machineFormPage.open();
    await machineFormPage.fillRequired({
      code,
      machineType: QA_MACHINE_TYPE,
      workCentre: centre,
    });
    await machineFormPage.cancel();
    await machinesListPage.expectLoaded();
    await machinesListPage.search(code);
    await machinesListPage.expectNoRow(code);
  });

  test('TC-CM-07 Only a user with write permission can create a machine', async ({
    personas,
    machinesListPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8q8'), 'TC-CM-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens the create form', async () => {
      await machinesListPage.open();
      await machinesListPage.expectLoaded();
      await machinesListPage.openNewMachine();
      await machineFormPage.expectDedicatedCreatePage();
    });
    await test.step('Read-only user cannot get to a working create form', async () => {
      await asPersona(personas, 'READONLY', async (page) => {
        const list = new MachinesListPage(page);
        await list.open();
        await list.expectNewBlocked();
      });
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EM-01 Open a machine for editing; Asset code is read-only', async ({
    page,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8q9'), 'TC-EM-01 (ClickUp)');
    await openMachine(page, machine);
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
    await machineFormPage.expectCodeLocked(machine);
  });

  test('TC-EM-02 Editable fields persist after Save changes', async ({
    page,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qb'), 'TC-EM-02 (ClickUp)');
    const code = await createMachine(page, centre, { property: ['capacity_kg', '350'] });
    await openMachine(page, code);
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
    await test.step('The save notice is shown before saving', async () => {
      // Sept: "Saves as a new version — orders already planned keep the
      // version they were planned with." Version was removed on request
      // (Demo Feedback z941abwdad); the notice now says the save rewrites the record.
      await allure.link(DEMO_FEEDBACK, 'Demo Feedback z941abwdad (ClickUp)');
      await machineFormPage.expectSaveNotice('Saving rewrites this machine.');
    });
    await machineFormPage.setMachineType(OTHER_MACHINE_TYPE);
    await machineFormPage.setWorkCentre(other);
    await machineFormPage.setStatus('Down');
    await machineFormPage.pickInServiceSinceToday();
    await machineFormPage.setFirstPropertyValue('400');
    expect(await machineFormPage.saveChanges()).toBe('submitted');
    await openMachine(page, code);
    for (const [label, value] of [
      ['Machine type', /^OL-3T\b/],
      ['Work centre', other],
      ['Status', 'Down'],
      ['In service since', /^\d{4}-\d{2}-\d{2}$/],
      ['Class-specific properties', 'capacity_kg: 400'],
    ] as const)
      await test.step(`${label} persisted`, async () => {
        await machineDetailPage.expectValue(label, value);
      });
  });

  test('TC-EM-03 Block Save changes when a required field is cleared', async ({
    page,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qc'), 'TC-EM-03 (ClickUp)');
    // Until the 2026-10-14 deploy this cleared the free-text Machine class
    // and expected Save to be blocked. Now no required field can be emptied
    // on edit: Asset code is locked, and Machine type, Work centre and Status
    // are pickers with no empty choice — so that is what this checks.
    await openMachine(page, machine);
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
    await machineFormPage.expectCodeLocked(machine);
    await machineFormPage.expectNoEmptyMachineType();
  });

  test('TC-EM-04 Saving the machine keeps its maintenance windows', async ({
    page,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qd'), 'TC-EM-04 (ClickUp)');
    const code = await createMachine(page, centre);
    await openMachine(page, code);
    // Windows on one machine may not overlap (409 "already has a maintenance window over those hours").
    await addWindow(page, {
      why: `QA-AUTO planned window A ${code}`,
      start: '06:00',
      end: '07:00',
    });
    await addWindow(page, {
      why: `QA-AUTO planned window B ${code}`,
      start: '07:30',
      end: '08:00',
    });
    await machineDetailPage.expectWindowCount(2);
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
    await machineFormPage.pickInServiceSinceToday();
    expect(await machineFormPage.saveChanges()).toBe('submitted');
    await openMachine(page, code);
    await machineDetailPage.expectWindowCount(2);
    await machineDetailPage.expectWindowRow(`QA-AUTO planned window A ${code}`);
    await machineDetailPage.expectWindowRow(`QA-AUTO planned window B ${code}`);
  });

  test('TC-EM-05 Cancel discards in-progress edits', async ({
    page,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qe'), 'TC-EM-05 (ClickUp)');
    await openMachine(page, machine);
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
    await machineFormPage.setMachineType(OTHER_MACHINE_TYPE);
    await machineFormPage.setStatus('Down');
    await machineFormPage.cancel();
    await openMachine(page, machine);
    await machineDetailPage.expectValue('Machine type', /^BTK\b/);
    await machineDetailPage.expectValue('Status', 'Active');
  });

  test('TC-EM-06 Only a user with write permission can save edits', async ({
    personas,
    page,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qf'), 'TC-EM-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens the edit form', async () => {
      await openMachine(page, machine);
      await machineDetailPage.startEditing();
      await machineFormPage.expectOnEditPage();
    });
    await test.step('Read-only user can view it but not get to a working edit form', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        await openMachine(roPage, machine);
        await new MachineDetailPage(roPage).expectEditBlocked();
      });
    });
  });

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LM-01 "New machine" opens the create form as its own page', async ({
    machinesListPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qg'), 'TC-LM-01 (ClickUp)');
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    await machinesListPage.openNewMachine();
    await machineFormPage.expectDedicatedCreatePage();
  });

  test('TC-LM-02 Search filters by asset code, machine type or work centre', async ({
    machinesListPage,
  }) => {
    await allure.tms(cu('z941abv8qh'), 'TC-LM-02 (ClickUp)');
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    for (const [by, term] of [
      ['asset code', machine],
      // Was the free-text class before the 2026-10-14 deploy; BTK is only on QA machines.
      ['machine type', 'BTK'],
      ['work centre', centre],
    ] as const) {
      await test.step(`By ${by}`, async () => {
        await machinesListPage.search(term);
        await machinesListPage.expectRowVisible(machine);
        await machinesListPage.expectEveryRowMatches(term);
      });
    }
  });

  test('TC-LM-03 Tabs filter the grid with accurate counts', async ({ machinesListPage }) => {
    await allure.tms(cu('z941abv8qj'), 'TC-LM-03 (ClickUp)');
    await allure.tms(cu('z941abvc70'), 'TC-LM-03 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abvc70 (2026-09-16): "Needs attention"
    // counted only Down + In maintenance, leaving Retired machines out of
    // every tab but All. On dev 2026-10-12 it includes Retired (4 = 1 Down +
    // 1 In maintenance + 2 Retired), so this passes there; the ClickUp status
    // is left to the user.
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    // Counts are re-read together until they agree (records can change mid-read under parallel workers).
    await machinesListPage.expectTabCountsAddUp(['Active', 'Needs attention']);
    await test.step('Active shows only Active machines', async () => {
      await machinesListPage.selectTab('Active');
      await machinesListPage.expectTabCountMatchesRows('Active');
      await machinesListPage.setRowsPerPage(100);
      await expect
        .poll(async () => [...new Set(await machinesListPage.columnValues('Status'))])
        .toEqual(['Active']);
    });
    await test.step('Needs attention shows Down / In maintenance / Retired', async () => {
      await machinesListPage.selectTab('Needs attention');
      await machinesListPage.expectTabCountMatchesRows('Needs attention');
      const statuses = new Set(await machinesListPage.columnValues('Status'));
      expect(
        [...statuses].filter((s) => !['Down', 'In maintenance', 'Retired'].includes(s)),
      ).toEqual([]);
    });
  });

  test('TC-LM-04 Filters panel applies and clears a rule', async ({ machinesListPage }) => {
    await allure.tms(cu('z941abv8qm'), 'TC-LM-04 (ClickUp)');
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    await machinesListPage.openFilters();
    await machinesListPage.addFilterRule('Machine', machine);
    await machinesListPage.expectFiltersBadge(1);
    await machinesListPage.expectRowVisible(machine);
    await expect.poll(() => machinesListPage.visibleRowCount()).toBe(1);
    await test.step('Clear all restores the full list', async () => {
      await machinesListPage.clearAllFilters();
      await machinesListPage.expectNoFiltersBadge();
      await expect.poll(() => machinesListPage.visibleRowCount()).toBeGreaterThan(1);
    });
  });

  test('TC-LM-05 Columns icon hides a column', async ({ machinesListPage }) => {
    await allure.tms(cu('z941abv8qn'), 'TC-LM-05 (ClickUp)');
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    await machinesListPage.expectColumnVisible('Asset register & telemetry');
    await machinesListPage.hideColumn('Asset register & telemetry');
    await machinesListPage.expectColumnHidden('Asset register & telemetry');
    await machinesListPage.resetColumns();
    await machinesListPage.expectColumnVisible('Asset register & telemetry');
  });

  test('TC-LM-06 View switch re-renders without data loss', async ({ machinesListPage }) => {
    await allure.tms(cu('z941abv8qp'), 'TC-LM-06 (ClickUp)');
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    const { total } = await machinesListPage.showing();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await test.step(view, async () => {
        await machinesListPage.switchView(view);
        await machinesListPage.expectViewActive(view);
      });
    }
    await machinesListPage.expectGridVisible();
    expect((await machinesListPage.showing()).total).toBe(total);
  });

  test('TC-LM-07 Row click opens the detail page; Edit machine is a separate action', async ({
    machinesListPage,
    machineDetailPage,
    machineFormPage,
  }) => {
    await allure.tms(cu('z941abv8qq'), 'TC-LM-07 (ClickUp)');
    // Sept also listed Version and Effective from/to — removed on request
    // (Demo Feedback z941abwdad).
    await allure.link(DEMO_FEEDBACK, 'Demo Feedback z941abwdad (ClickUp)');
    await machinesListPage.findRow(machine);
    await machinesListPage.openRow(machine);
    await machineDetailPage.expectLoaded(machine);
    await machineDetailPage.expectReadOnlyView();
    await machineDetailPage.expectFields([
      'Asset code',
      'Machine type',
      'Work centre',
      'Status',
      'In service since',
      'Class-specific properties',
      'Asset register & telemetry',
    ]);
    await machineDetailPage.expectWindowsSection();
    await machineDetailPage.startEditing();
    await machineFormPage.expectOnEditPage();
  });

  test('TC-LM-08 Empty state and no-match state', async ({ machinesListPage }) => {
    await allure.tms(cu('z941abv8qr'), 'TC-LM-08 (ClickUp)');
    // The zero-records half can't run on a shared environment.
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    await machinesListPage.search(`no-such-machine-${Date.now()}`);
    await machinesListPage.expectNoMatchState();
  });

  test('TC-LM-09 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abv8qt'), 'TC-LM-09 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new MachinesListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });
});
