import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { OperationsListPage } from '../../../src/pages/planning/operations-list.page';
import { OperationDetailPage } from '../../../src/pages/planning/operation-detail.page';
import {
  OPERATION_REQUIRED,
  OperationMasterFormPage,
  type OperationMasterValues,
} from '../../../src/pages/planning/operation-master-form.page';
import {
  asPersona,
  createOperation,
  OFF_MACHINE_GRADE,
  ON_MACHINE_GRADE,
  openOperation,
  personaCredentials,
  personaSkipReason,
  setupPage,
  taggedName,
  uniqueCode,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Operations (Create / Edit / List), the "Operation Master"
 * screen at /planning/master-data/operations.
 *
 * Source of truth for these cases: test-cases/planning/operations.md
 * (ClickUp "Planning -Sprint -2 - Operations and Allowance"). Operations
 * are only ever created by this file (QA-AUTO tagged, code prefix QA-OP),
 * never a seed operation beyond reading it. They can't be deleted, only
 * retired.
 *
 * beforeAll builds `op` (an off-machine Draft with one domain parameter)
 * and `studied` (backed by a motion study, last studied today).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const NOT_FINALIZED =
  'ClickUp status skip (2026-09-16): the business rule is not finalized yet — hold off on a verdict.';

test.describe('Planning - Operations', () => {
  // Retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let op = '';
  let studied = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (each create ~10–20 s on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    const form = new OperationMasterFormPage(page);
    op = uniqueCode('QA-OP');
    await form.open();
    await form.fill({
      code: op,
      name: taggedName(op),
      department: /^Sewing$/,
      grade: OFF_MACHINE_GRADE,
      skillGrade: /^S3/,
      defaultSam: '1.1',
    });
    await form.addParameter('seam_cm', '12.5');
    expect(await form.create(), `create operation ${op}`).toBe('submitted');

    studied = uniqueCode('QA-OP');
    await form.open();
    await form.fill({
      code: studied,
      name: taggedName(studied),
      department: /^Sewing$/,
      grade: OFF_MACHINE_GRADE,
      skillGrade: /^S3/,
      defaultSam: '1.1',
    });
    await form.setMotionStudy(true);
    await form.pickLastStudiedOnToday();
    expect(await form.create(), `create studied operation ${studied}`).toBe('submitted');
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Operations');
    await allure.owner('Planning QA');
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CO-01 Open "New operation" as a dedicated page', async ({
    operationsListPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8mu'), 'TC-CO-01 (ClickUp)');
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    await operationsListPage.openNew();
    await operationMasterFormPage.expectOnCreatePage();
    await operationMasterFormPage.expectFullFieldSet();
  });

  test('TC-CO-02 Block Create when a required field is empty', async ({
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8mw'), 'TC-CO-02 (ClickUp)');
    // Standard time basis is pre-set to SAM and has no empty option, so it
    // can't be left empty. Each other field is left empty on an otherwise
    // complete form (off-machine grade, so Machine type isn't needed).
    // Minimum skill grade has no asterisk and isn't required (the user,
    // 2026-10-12): leaving it empty saves.
    test.setTimeout(300_000);
    for (const field of OPERATION_REQUIRED) {
      await test.step(`Empty ${field} blocks Create`, async () => {
        const code = uniqueCode('QA-OP');
        const values: OperationMasterValues = {
          code,
          name: taggedName(code),
          department: /^Sewing$/,
          grade: OFF_MACHINE_GRADE,
          skillGrade: /^S3/,
        };
        delete values[field];
        await operationMasterFormPage.open();
        await operationMasterFormPage.fill(values);
        await operationMasterFormPage.submitExpectingBlocked('create');
        await operationMasterFormPage.expectFieldFlagged(field);
      });
    }
    await test.step('Empty Minimum skill grade (no asterisk) still saves', async () => {
      const code = uniqueCode('QA-OP');
      await operationMasterFormPage.open();
      await operationMasterFormPage.fill({
        code,
        name: taggedName(code),
        department: /^Sewing$/,
        grade: OFF_MACHINE_GRADE,
      });
      expect(await operationMasterFormPage.create()).toBe('submitted');
    });
  });

  test('TC-CO-03 Operation code must be unique, case-insensitively', async ({
    operationMasterFormPage,
    operationsListPage,
  }) => {
    await allure.tms(cu('z941abv8mx'), 'TC-CO-03 (ClickUp)');
    // ClickUp status fail (2026-09-16), never filed: dev's message was the
    // generic "This code is already taken"; the prototype names the colliding
    // operation ("Already used by <name> — operation code must be unique").
    // On dev 2026-10-12 the message names it, so this passes.
    await operationMasterFormPage.open();
    await operationMasterFormPage.fill({
      code: op.toLowerCase(),
      name: taggedName(`${op}-DUP`),
      department: /^Sewing$/,
      grade: OFF_MACHINE_GRADE,
      skillGrade: /^S3/,
    });
    expect(await operationMasterFormPage.create()).not.toBe('submitted');
    await operationMasterFormPage.expectCodeTaken();
    await test.step('No duplicate row was created', async () => {
      await operationsListPage.findRow(op);
      await expect.poll(() => operationsListPage.visibleRowCount()).toBe(1);
    });
    await test.step('The message names the colliding operation (prototype)', async () => {
      await operationMasterFormPage.open();
      await operationMasterFormPage.fill({
        code: op.toLowerCase(),
        name: taggedName(op.toLowerCase()),
      });
      await operationMasterFormPage.fill({
        department: /^Sewing$/,
        grade: OFF_MACHINE_GRADE,
        skillGrade: /^S3/,
      });
      expect(await operationMasterFormPage.create()).not.toBe('submitted');
      await operationMasterFormPage.expectCodeTakenNaming(taggedName(op));
    });
  });

  test('TC-CO-04 Machine type is required unless the Difficulty grade is off-machine', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
    operationsListPage,
  }) => {
    await allure.tms(cu('z941abv8my'), 'TC-CO-04 (ClickUp)');
    const code = uniqueCode('QA-OP');
    await operationMasterFormPage.open();
    await test.step('On-machine grade with no Machine type is blocked', async () => {
      await operationMasterFormPage.fill({
        code,
        name: taggedName(code),
        department: /^Sewing$/,
        grade: ON_MACHINE_GRADE,
        skillGrade: /^S3/,
      });
      await operationMasterFormPage.expectMachineTypeRequired(true);
      await operationMasterFormPage.submitExpectingBlocked('create', 1);
      await operationMasterFormPage.expectFieldFlagged('machineType');
    });
    await test.step('Off-machine grade with no Machine type saves', async () => {
      const offMachine = await createOperation(page);
      await operationsListPage.findRow(offMachine);
      await openOperation(page, offMachine);
      await operationDetailPage.expectValue('Grade', /^M — manual/);
      await operationDetailPage.expectValue('Machine', '—');
    });
  });

  test('TC-CO-05 Standard time basis determines which default-time field is required', async ({
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8mz'), 'TC-CO-05 (ClickUp)');
    test.skip(true, NOT_FINALIZED);
    await operationMasterFormPage.open();
  });

  test('TC-CO-06 Default SAM minutes cannot be set below Minimum time', async ({
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8n0'), 'TC-CO-06 (ClickUp)');
    test.skip(true, NOT_FINALIZED);
    await operationMasterFormPage.open();
  });

  test('TC-CO-07 "Last studied on" is required when "Backed by a motion study" is on', async ({
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8n1'), 'TC-CO-07 (ClickUp)');
    const code = uniqueCode('QA-OP');
    await operationMasterFormPage.open();
    await operationMasterFormPage.fill({
      code,
      name: taggedName(code),
      department: /^Sewing$/,
      grade: OFF_MACHINE_GRADE,
      skillGrade: /^S3/,
    });
    await operationMasterFormPage.expectLastStudiedOnShown(false);
    await test.step('Motion study on + no date blocks Create', async () => {
      await operationMasterFormPage.setMotionStudy(true);
      await operationMasterFormPage.expectLastStudiedOnShown(true);
      expect(await operationMasterFormPage.create()).not.toBe('submitted');
      await operationMasterFormPage.expectLastStudiedOnRequired();
    });
    await test.step('Motion study off again: the date is gone and Create succeeds', async () => {
      await operationMasterFormPage.setMotionStudy(false);
      await operationMasterFormPage.expectLastStudiedOnShown(false);
      expect(await operationMasterFormPage.create()).toBe('submitted');
    });
  });

  test('TC-CO-08 Domain parameters are typed key/value rows, not raw JSON', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8n3'), 'TC-CO-08 (ClickUp)');
    // `op` was created with seam_cm = 12.5 in beforeAll.
    await openOperation(page, op);
    await operationDetailPage.expectDomainParameter('seam_cm', '12.5');
    await operationDetailPage.startEditing();
    await operationMasterFormPage.expectOnEditPage();
    await operationMasterFormPage.expectParametersAsRows(1);
  });

  test('TC-CO-09 Cancel discards the form without creating a record', async ({
    operationsListPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8n4'), 'TC-CO-09 (ClickUp)');
    const code = uniqueCode('QA-OP');
    await operationMasterFormPage.open();
    await operationMasterFormPage.fill({ code, name: taggedName(code), department: /^Sewing$/ });
    await operationMasterFormPage.cancel();
    await operationsListPage.expectLoaded();
    await operationsListPage.search(code);
    await operationsListPage.expectNoRow(code);
  });

  test('TC-CO-10 Only a user with write permission can create an operation', async ({
    personas,
    operationsListPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8n7'), 'TC-CO-10 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens the create form', async () => {
      await operationsListPage.open();
      await operationsListPage.expectLoaded();
      await operationsListPage.openNew();
      await operationMasterFormPage.expectOnCreatePage();
    });
    await test.step('Read-only user cannot get to a working create form', async () => {
      await asPersona(personas, 'READONLY', async (page) => {
        const list = new OperationsListPage(page);
        await list.open();
        await list.expectNewBlocked();
      });
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EO-01 Open an existing operation for editing; Operation code is read-only', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8na'), 'TC-EO-01 (ClickUp)');
    await openOperation(page, op);
    await operationDetailPage.startEditing();
    await operationMasterFormPage.expectOnEditPage();
    await operationMasterFormPage.expectCodeLocked(op);
    // Sept: "Saves as a new version — the record's version increments on
    // every save." Version was removed on request (Demo Feedback
    // z941abwdad, implemented 2026-09-25); the notice now says the save rewrites it.
    await allure.link(cu('z941abwdad'), 'Demo Feedback z941abwdad (ClickUp)');
    await operationMasterFormPage.expectSaveNotice('Saving rewrites this operation.');
  });

  test('TC-EO-02 Editable fields persist after Save changes', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nc'), 'TC-EO-02 (ClickUp)');
    const code = await createOperation(page);
    const renamed = taggedName(`${code} edited`);
    await openOperation(page, code);
    await operationDetailPage.startEditing();
    await operationMasterFormPage.expectOnEditPage();
    await operationMasterFormPage.fill({
      name: renamed,
      department: /^Cutting$/,
      grade: ON_MACHINE_GRADE,
      machineType: 'Single needle lockstitch',
      skillGrade: /^S2/,
      defaultSam: '1.25',
      defaultBasic: '0.95',
      minimumTime: '0.8',
    });
    expect(await operationMasterFormPage.saveChanges()).toBe('submitted');
    await openOperation(page, code);
    for (const [label, value] of [
      ['Operation', renamed],
      ['Department', 'Cutting'],
      ['Machine', 'Single needle lockstitch'],
      ['Grade', /^D — simple/],
      ['Minimum skill grade', /^S2/],
      ['Default SAM', '1.250'],
      ['Default basic minutes', '0.9500'],
      ['Minimum time', '0.800'],
    ] as const)
      await test.step(`${label} persisted`, async () => {
        await operationDetailPage.expectValue(label, value);
      });
  });

  test('TC-EO-03 Block Save changes when a required field is cleared', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nd'), 'TC-EO-03 (ClickUp)');
    // Owning department / Difficulty grade / Minimum skill grade are selects
    // with no empty option once set, so the name is the field that can be cleared.
    await openOperation(page, op);
    await operationDetailPage.startEditing();
    await operationMasterFormPage.expectOnEditPage();
    await operationMasterFormPage.clearName();
    await operationMasterFormPage.submitExpectingBlocked('save', 1);
    await operationMasterFormPage.expectFieldFlagged('name');
  });

  test('TC-EO-04 Changing Machine type prompts for a restudy', async ({
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nf'), 'TC-EO-04 (ClickUp)');
    test.skip(true, NOT_FINALIZED);
    await operationMasterFormPage.open();
  });

  test('TC-EO-05 Status is set on the edit form, as in the prototype', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8ng'), 'TC-EO-05 (ClickUp)');
    // Sept: Activate / Approve / Retire were dedicated confirm dialogs on the
    // detail page. Dev now sets Status on the edit form, which matches the
    // prototype (graded a pass by the user, 2026-10-12). The "retiring an
    // in-use operation is refused" half needs a QA recipe that uses the
    // operation; it wasn't re-tested in Sept either.
    await openOperation(page, op);
    await test.step('The detail page has no separate status actions', async () => {
      await operationDetailPage.expectNoStatusActions();
    });
    await test.step('The edit form sets Status: Draft / Active / Retired', async () => {
      await operationDetailPage.startEditing();
      await operationMasterFormPage.expectOnEditPage();
      expect(await operationMasterFormPage.optionsOf('status')).toEqual([
        'Draft',
        'Active',
        'Retired',
      ]);
    });
  });

  test('TC-EO-06 Cancel discards in-progress edits', async ({
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nh'), 'TC-EO-06 (ClickUp)');
    await openOperation(page, op);
    await operationDetailPage.startEditing();
    await operationMasterFormPage.expectOnEditPage();
    await operationMasterFormPage.fill({ name: taggedName(`${op} cancelled`), defaultSam: '9.9' });
    await operationMasterFormPage.cancel();
    await openOperation(page, op);
    await operationDetailPage.expectValue('Operation', taggedName(op));
    await operationDetailPage.expectValue('Default SAM', '1.100');
  });

  test('TC-EO-07 Only a user with write permission can save edits', async ({
    personas,
    page,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nj'), 'TC-EO-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens the edit form', async () => {
      await openOperation(page, op);
      await operationDetailPage.startEditing();
      await operationMasterFormPage.expectOnEditPage();
    });
    await test.step('Read-only user can view it but has no Edit operation', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        const detail = new OperationDetailPage(roPage);
        await detail.open(op);
        await detail.expectNoEditAction();
      });
    });
  });

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LO-01 "New operation" opens the create form as its own page', async ({
    operationsListPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nk'), 'TC-LO-01 (ClickUp)');
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    await operationsListPage.openNew();
    await operationMasterFormPage.expectOnCreatePage();
  });

  test('TC-LO-02 Search filters by code, operation name, department, or machine', async ({
    operationsListPage,
  }) => {
    await allure.tms(cu('z941abv8nn'), 'TC-LO-02 (ClickUp)');
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    await test.step('By code', async () => {
      await operationsListPage.search(op);
      await operationsListPage.expectRowVisible(op);
      await operationsListPage.expectEveryRowMatches(op);
    });
    await test.step('By operation name', async () => {
      await operationsListPage.search(taggedName(op).slice(0, 25));
      await operationsListPage.expectRowVisible(op);
    });
    await test.step('By department', async () => {
      await operationsListPage.search('Sewing');
      await operationsListPage.expectEveryRowMatches('Sewing');
    });
    await test.step('By machine', async () => {
      await operationsListPage.search('5-thread safety overlock');
      await operationsListPage.expectEveryRowMatches('5-thread safety overlock');
    });
  });

  test('TC-LO-03 Filters panel applies and clears a rule', async ({ operationsListPage }) => {
    await allure.tms(cu('z941abv8nq'), 'TC-LO-03 (ClickUp)');
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    await operationsListPage.openFilters();
    await operationsListPage.addFilterRule('Code', op);
    await operationsListPage.expectFiltersBadge(1);
    await operationsListPage.expectRowVisible(op);
    await expect.poll(() => operationsListPage.visibleRowCount()).toBe(1);
    await test.step('Clear all restores the full list', async () => {
      await operationsListPage.clearAllFilters();
      await operationsListPage.expectNoFiltersBadge();
      await expect.poll(() => operationsListPage.visibleRowCount()).toBeGreaterThan(1);
    });
  });

  test('TC-LO-04 Columns icon opens the column picker', async ({ operationsListPage }) => {
    await allure.tms(cu('z941abv8nt'), 'TC-LO-04 (ClickUp)');
    // "Motion elements" isn't a default column; Default SAM is.
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    await operationsListPage.expectColumnVisible('Default SAM');
    await operationsListPage.hideColumn('Default SAM');
    await operationsListPage.expectColumnHidden('Default SAM');
    await operationsListPage.resetColumns();
    await operationsListPage.expectColumnVisible('Default SAM');
  });

  test('TC-LO-05 View switch re-renders without data loss', async ({ operationsListPage }) => {
    await allure.tms(cu('z941abv8nv'), 'TC-LO-05 (ClickUp)');
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    const { total } = await operationsListPage.showing();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await test.step(view, async () => {
        await operationsListPage.switchView(view);
        await operationsListPage.expectViewActive(view);
      });
    }
    await operationsListPage.expectGridVisible();
    expect((await operationsListPage.showing()).total).toBe(total);
  });

  test('TC-LO-06 Row click opens operation detail; Edit is a separate action', async ({
    operationsListPage,
    operationDetailPage,
    operationMasterFormPage,
  }) => {
    await allure.tms(cu('z941abv8nw'), 'TC-LO-06 (ClickUp)');
    await operationsListPage.findRow(op);
    await operationsListPage.openRow(op);
    await operationDetailPage.expectLoaded(op);
    await operationDetailPage.expectReadOnlyView();
    for (const label of [
      'Default SAM',
      'Default basic minutes',
      'Default cycle time',
      'Minimum time',
      'Backed by a motion study',
      'Last studied on',
      'Motion elements',
    ])
      await operationDetailPage.expectSummaryContains(label);
    await operationDetailPage.expectDomainParameter('seam_cm', '12.5');
    await operationDetailPage.expectAllowancesSection();
    await operationDetailPage.startEditing();
    await operationMasterFormPage.expectOnEditPage();
  });

  test('TC-LO-07 "Studied" and "Estimate" render as visually distinct badges', async ({
    operationsListPage,
  }) => {
    await allure.tms(cu('z941abv8nx'), 'TC-LO-07 (ClickUp)');
    await operationsListPage.findRow(studied);
    const studiedColours = await operationsListPage.studiedBadgeColours(studied, 'Studied');
    await operationsListPage.findRow(op);
    const estimateColours = await operationsListPage.studiedBadgeColours(op, 'Estimate');
    expect(studiedColours, `Studied ${studiedColours} vs Estimate ${estimateColours}`).not.toBe(
      estimateColours,
    );
  });

  test('TC-LO-08 Empty state and no-match state', async ({ operationsListPage }) => {
    await allure.tms(cu('z941abv8ny'), 'TC-LO-08 (ClickUp)');
    // ClickUp status fail (2026-09-16), never filed: a search that matched
    // nothing showed the empty-table "No operations yet — …". On dev
    // 2026-10-12 it shows a distinct "No operations match …" message, so this
    // passes. The zero-records half can't run on a shared environment.
    await operationsListPage.open();
    await operationsListPage.expectLoaded();
    await operationsListPage.search(`no-such-operation-${Date.now()}`);
    await operationsListPage.expectNoMatchState();
  });

  test('TC-LO-09 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abv8p0'), 'TC-LO-09 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new OperationsListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });
});
