import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';

/**
 * Planning — Smoke suite. Module-loads check plus one happy-path test per
 * capability as they're built out, same shape as CRM's smoke suite
 * (tests/smoke/crm/smoke-recent.spec.ts) — minimal, no exhaustive field
 * coverage (that's what regression is for).
 */
test.describe('Planning module', () => {
  test.beforeEach(async () => {
    await allure.epic('Planning');
    await allure.feature('Smoke');
    await allure.owner('Planning QA');
  });

  test('loads after shell login', async ({ planningPage }) => {
    await planningPage.open();
    await planningPage.expectLoaded();
  });

  // Since the 2026-10-16 dev deploy the create forms generate the code on save
  // (CAL-0001…, and likewise for work centres and machines), so none is typed.
  // Since the 2026-10-28 dev deploy they're in two steps: step 1's "Save &
  // continue" creates the record.
  test('Create Calendar: successful creation with a name only', async ({
    calendarsListPage,
    calendarFormPage,
  }) => {
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.openNewCalendar();
    await calendarFormPage.expectOnCreatePage();

    await calendarFormPage.fillRequired({ name: `Playwright Smoke Calendar ${Date.now()}` });
    await calendarFormPage.create();
    await calendarFormPage.expectCreatedSuccessfully();
    expect(await calendarFormPage.finish()).toMatch(/^CAL-\d+$/);
  });

  test('Create Work Centre: successful creation with the required fields set', async ({
    workCentresListPage,
    workCentreFormPage,
  }) => {
    await workCentresListPage.open();
    await workCentresListPage.expectLoaded();
    await workCentresListPage.openNewWorkCentre();
    await workCentreFormPage.expectOnCreatePage();

    await workCentreFormPage.fillRequired({ name: `Playwright Smoke WC ${Date.now()}` });
    await workCentreFormPage.create();
    await workCentreFormPage.expectCreatedSuccessfully();
  });

  // Qualifications moved into operator profiles on the 2026-10-14 dev deploy
  // (the old Qualifications screen is gone). Read-only on purpose: adding a
  // row would edit a seed profile the suite doesn't own, so this checks the
  // add-a-qualification path is there and cancels without saving. It opens a
  // profile whose employee resolves: "Operator unavailable" profiles have no
  // add row, and on dev they fill the first page.
  test('Operators & Qualifications: a profile shows its qualifications and the add row', async ({
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.openFirstResolvedProfile();
    await operatorProfilePage.expectLoaded();

    await operatorProfilePage.startEditing();
    await operatorProfilePage.openQualificationsStep();
    await operatorProfilePage.expectAddQualificationRow();
    await operatorProfilePage.cancelEditing();
  });

  test('Create Machine: successful creation with a work centre assigned', async ({
    machinesListPage,
    machineFormPage,
  }) => {
    await machinesListPage.open();
    await machinesListPage.expectLoaded();
    await machinesListPage.openNewMachine();
    await machineFormPage.expectOnCreatePage();

    await machineFormPage.fillRequired({});
    await machineFormPage.create();
    await machineFormPage.expectCreatedSuccessfully();
  });
});
