import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { MachineDetailPage } from '../../../src/pages/planning/machine-detail.page';
import { MaintenanceWindowFormPage } from '../../../src/pages/planning/maintenance-window-form.page';
import {
  addWindow,
  asPersona,
  createMachine,
  createWorkCentre,
  openMachine,
  personaCredentials,
  personaSkipReason,
  setupPage,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Maintenance windows (Add / Edit). Since the 2026-10-28 dev
 * deploy they're an inline table on step 2 of Edit machine: a new window is
 * typed into the add row ("Add maintenance window"), a saved one edited in
 * place (Save / Cancel on the row). The machine's detail page shows the
 * grid read-only.
 *
 * Source of truth for these cases: test-cases/planning/maintenance-windows.md
 * (ClickUp "Planning -Sprint-2 - Machine and maintenance"). Every window
 * lives on a QA-AUTO machine this file creates, and its Why says QA-AUTO.
 * Window times are today's date at a fixed hh:mm.
 *
 * beforeAll builds the QA work centre and the Active machine `machine`
 * with one closed Planned window (`closed`, 06:00–07:00). Windows on one
 * machine may not overlap, and an open one (no end) blocks every later
 * window — dev refuses with 409 "This machine already has a maintenance
 * window over those hours…" — so open windows always go on a fresh machine.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

test.describe('Planning - Maintenance Windows', () => {
  // Retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let machine = '';
  let centre = '';
  let closed = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    centre = await createWorkCentre(page);
    machine = await createMachine(page, centre);
    closed = `QA-AUTO closed window ${machine}`;
    await openMachine(page, machine);
    await addWindow(page, { kind: 'Planned', start: '06:00', end: '07:00', why: closed });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Maintenance Windows');
    await allure.owner('Planning QA');
  });

  // ── Add ───────────────────────────────────────────────────────────────

  test('TC-CMW-01 Open "New maintenance window" scoped to the owning machine', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8qv'), 'TC-CMW-01 (ClickUp)');
    await openMachine(page, machine);
    await machineDetailPage.openNewWindow();
    await maintenanceWindowFormPage.expectOpenForCreate();
    await maintenanceWindowFormPage.expectFields();
  });

  test('TC-CMW-02 Block Create when Kind or Window start is empty', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8qx'), 'TC-CMW-02 (ClickUp)');
    const code = await createMachine(page, centre);
    const why = `QA-AUTO minimal window ${code}`;
    await openMachine(page, code);
    await machineDetailPage.openNewWindow();
    await test.step('Empty form: only Kind and Window start are flagged', async () => {
      expect(await maintenanceWindowFormPage.create()).not.toBe('submitted');
      await maintenanceWindowFormPage.expectRequiredCount(2);
      await maintenanceWindowFormPage.expectFieldFlagged('kind');
      await maintenanceWindowFormPage.expectFieldFlagged('windowStart');
    });
    await test.step('Kind but no Window start is still blocked', async () => {
      await maintenanceWindowFormPage.fill({ kind: 'Planned' });
      expect(await maintenanceWindowFormPage.create()).not.toBe('submitted');
      await maintenanceWindowFormPage.expectFieldFlagged('windowStart');
    });
    await test.step('Kind + Window start alone save (end, Why, anomaly optional)', async () => {
      await maintenanceWindowFormPage.fill({ start: '05:00', why });
      expect(await maintenanceWindowFormPage.create()).toBe('submitted');
      await machineDetailPage.expectWindowRow(why, { kind: 'Planned' });
    });
  });

  test('TC-CMW-03 A blank Window end shows the stoppage as "Still open"', async ({
    page,
    machineDetailPage,
  }) => {
    await allure.tms(cu('z941abv8qy'), 'TC-CMW-03 (ClickUp)');
    await allure.tms(cu('z941abvd2p'), 'TC-CMW-03 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abvd2p (2026-09-16): the Window end column
    // said "Open" where the prototype says "Still open". On dev 2026-10-12 it
    // says "Still open", so this passes there; the ClickUp status is left to
    // the user.
    const code = await createMachine(page, centre);
    const why = `QA-AUTO open stoppage ${code}`;
    await openMachine(page, code);
    await addWindow(page, { kind: 'Unplanned', start: '04:00', why });
    await machineDetailPage.expectWindowRow(why, { kind: 'Unplanned', end: 'Still open' });
  });

  test('TC-CMW-04 Planned and Unplanned windows get distinct Kind badges', async ({
    page,
    machineDetailPage,
  }) => {
    await allure.tms(cu('z941abv8qz'), 'TC-CMW-04 (ClickUp)');
    const unplanned = `QA-AUTO unplanned closed window ${machine}`;
    await openMachine(page, machine);
    await addWindow(page, { kind: 'Unplanned', start: '08:00', end: '09:00', why: unplanned });
    await machineDetailPage.expectWindowRow(closed, { kind: 'Planned' });
    await machineDetailPage.expectWindowRow(unplanned, { kind: 'Unplanned' });
    const planned = await machineDetailPage.kindBadgeColours(closed, 'Planned');
    const unplannedColours = await machineDetailPage.kindBadgeColours(unplanned, 'Unplanned');
    expect(planned, `Planned ${planned} vs Unplanned ${unplannedColours}`).not.toBe(
      unplannedColours,
    );
  });

  test('TC-CMW-05 An open window and the machine header', async ({ page, machineDetailPage }) => {
    await allure.tms(cu('z941abv8r0'), 'TC-CMW-05 (ClickUp)');
    // The case expected a "Stoppage open" badge on the machine header; the
    // user checked the prototype (2026-09-16) and it has no such indicator,
    // so this checks the header still shows the machine's own Status badge
    // next to an open window.
    const code = await createMachine(page, centre);
    const why = `QA-AUTO open stoppage ${code}`;
    await openMachine(page, code);
    await addWindow(page, { kind: 'Unplanned', start: '03:00', why });
    await machineDetailPage.expectWindowRow(why, { end: 'Still open' });
    await machineDetailPage.expectHeaderBadge('Active');
  });

  test('TC-CMW-06 Cancel discards the window without adding it', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8r1'), 'TC-CMW-06 (ClickUp)');
    // The heading reads "(0)" until rows load, so absence is checked next to
    // a row that's known to be there (`closed`).
    const why = `QA-AUTO cancelled window ${machine}`;
    await openMachine(page, machine);
    await machineDetailPage.openNewWindow();
    await maintenanceWindowFormPage.fill({ kind: 'Planned', start: '10:00', why });
    await maintenanceWindowFormPage.cancel();
    await openMachine(page, machine);
    await machineDetailPage.expectWindowRow(closed);
    await machineDetailPage.expectNoWindowRow(why);
  });

  test('TC-CMW-07 Only a user with write permission can add a window', async ({
    personas,
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8r3'), 'TC-CMW-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    const attempted = `QA-AUTO read-only window attempt ${machine}`;
    await test.step('Planner (write) opens New maintenance window', async () => {
      await openMachine(page, machine);
      await machineDetailPage.openNewWindow();
      await maintenanceWindowFormPage.expectOpenForCreate();
    });
    await test.step('Read-only user cannot add a window', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        const detail = new MachineDetailPage(roPage);
        await openMachine(roPage, machine);
        // "New maintenance window" renders enabled for a read-only user on
        // dev (ClickUp z941abybge); if it opens, the create must be refused.
        if (await detail.isNewWindowAvailable()) {
          const form = new MaintenanceWindowFormPage(roPage);
          await detail.openNewWindow();
          await form.expectOpenForCreate();
          await form.fill({ kind: 'Planned', start: '11:00', why: attempted });
          await form.create();
        }
      });
    });
    await test.step('No window was added', async () => {
      await openMachine(page, machine);
      await machineDetailPage.expectWindowRow(closed);
      await machineDetailPage.expectNoWindowRow(attempted);
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EMW-01 Open an existing window for editing', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8r5'), 'TC-EMW-01 (ClickUp)');
    await allure.link(cu('z941abvc71'), 'TC-EMW-01 Sept bug z941abvc71 (ClickUp)');
    await allure.link(cu('z941abwdad'), 'Demo Feedback z941abwdad (ClickUp)');
    // Sept: bug z941abvc71 — no "Saves as a new version" notice. Versioning
    // was removed on request (Demo Feedback z941abwdad), so a window saves in
    // place — graded a pass by the user (2026-10-12).
    await openMachine(page, machine);
    await machineDetailPage.openWindowEdit(closed);
    await maintenanceWindowFormPage.expectOpenForEdit();
    // Since the 2026-10-28 deploy the notice is part of the table's note:
    // "A save rewrites the window in place; a retired window still resolves
    // for everything that already references it, …".
    await maintenanceWindowFormPage.expectSaveNotice(
      'A save rewrites the window in place; a retired window still resolves for everything that already references it',
    );
  });

  test('TC-EMW-02 Setting Window end on an open window closes it', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8r6'), 'TC-EMW-02 (ClickUp)');
    const code = await createMachine(page, centre);
    const why = `QA-AUTO stoppage to close ${code}`;
    await openMachine(page, code);
    await addWindow(page, { kind: 'Unplanned', start: '06:15', why });
    await machineDetailPage.expectWindowRow(why, { end: 'Still open' });
    await machineDetailPage.openWindowEdit(why);
    await maintenanceWindowFormPage.expectOpenForEdit();
    await maintenanceWindowFormPage.fill({ end: '09:30' });
    expect(await maintenanceWindowFormPage.saveChanges()).toBe('submitted');
    await openMachine(page, code);
    await machineDetailPage.expectWindowRow(why, { end: /^\d{4}-\d{2}-\d{2} 09:30$/ });
  });

  test('TC-EMW-03 Block Save changes when Window start is cleared', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8r7'), 'TC-EMW-03 (ClickUp)');
    await openMachine(page, machine);
    await machineDetailPage.openWindowEdit(closed);
    await maintenanceWindowFormPage.expectOpenForEdit();
    await test.step('Kind is a select with no empty choice', async () => {
      await maintenanceWindowFormPage.expectKindHasNoEmptyChoice();
    });
    await test.step('Clearing Window start blocks Save changes', async () => {
      await maintenanceWindowFormPage.clearWindowStart();
      expect(await maintenanceWindowFormPage.saveChanges()).not.toBe('submitted');
      await maintenanceWindowFormPage.expectFieldFlagged('windowStart');
    });
  });

  test('TC-EMW-04 Cancel discards in-progress edits', async ({
    page,
    machineDetailPage,
    maintenanceWindowFormPage,
  }) => {
    await allure.tms(cu('z941abv8r8'), 'TC-EMW-04 (ClickUp)');
    await openMachine(page, machine);
    await machineDetailPage.openWindowEdit(closed);
    await maintenanceWindowFormPage.expectOpenForEdit();
    await maintenanceWindowFormPage.fill({ why: `${closed} (cancelled)`, end: '10:45' });
    await maintenanceWindowFormPage.cancel();
    await openMachine(page, machine);
    await machineDetailPage.expectWindowRow(closed, { end: /07:00$/ });
    await machineDetailPage.expectNoWindowRow(`${closed} (cancelled)`);
  });

  test('TC-EMW-05 Only a user with write permission can save window edits', async ({
    personas,
    page,
    machineDetailPage,
  }) => {
    await allure.tms(cu('z941abv8r9'), 'TC-EMW-05 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    const attempted = `${closed} (read-only attempt)`;
    await test.step('Read-only user cannot save a change to the window', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        const detail = new MachineDetailPage(roPage);
        await openMachine(roPage, machine);
        // The row's Edit renders for a read-only user on dev (ClickUp
        // z941abybge); if it opens, the save itself must be refused.
        if (await detail.isWindowEditAvailable(closed)) {
          const form = new MaintenanceWindowFormPage(roPage);
          await detail.openWindowEdit(closed);
          await form.expectOpenForEdit();
          await form.fill({ why: attempted });
          await form.saveChanges();
        }
      });
    });
    await test.step('The window is unchanged', async () => {
      await openMachine(page, machine);
      await machineDetailPage.expectWindowRow(closed);
      await machineDetailPage.expectNoWindowRow(attempted);
    });
  });
});
