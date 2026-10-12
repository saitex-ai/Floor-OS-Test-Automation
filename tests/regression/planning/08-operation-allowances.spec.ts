import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { OperationDetailPage } from '../../../src/pages/planning/operation-detail.page';
import { AllowanceFormPage } from '../../../src/pages/planning/allowance-form.page';
import {
  addAllowance,
  asPersona,
  createOperation,
  openOperation,
  personaCredentials,
  personaSkipReason,
  setupPage,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Operation Allowance (Create / Edit), nested in an operation's
 * detail page: "New allowance" and a row's "Edit" swap the Allowances grid
 * for the allowance form on the same URL.
 *
 * Source of truth for these cases: test-cases/planning/operation-allowances.md
 * (ClickUp "Planning -Sprint -2 - Operations and Allowance"). Every
 * allowance lives on a QA-AUTO operation this file creates.
 *
 * beforeAll builds `op` with two rows: "Human motion fatigue" overridden
 * to 12.3456% (with a reason) and "Material handling" at its type default,
 * and `opOne` with only the "Human motion fatigue" row. An off-machine
 * operation is offered exactly these two types (no "Machine
 * interruption"), so `op` has no type left to add.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const FATIGUE = 'Human motion fatigue';
const HANDLING = 'Material handling';
const REASON = 'QA-AUTO override reason';

test.describe('Planning - Operation Allowances', () => {
  // Retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let op = '';
  let opOne = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    op = await createOperation(page);
    await openOperation(page, op);
    await addAllowance(page, { type: FATIGUE, percentage: '12.3456', why: REASON });
    await addAllowance(page, { type: HANDLING });
    opOne = await createOperation(page);
    await openOperation(page, opOne);
    await addAllowance(page, { type: FATIGUE });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Operation Allowances');
    await allure.owner('Planning QA');
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-COA-01 Open "New allowance" scoped to the owning operation', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8p1'), 'TC-COA-01 (ClickUp)');
    const fresh = await createOperation(page);
    await openOperation(page, fresh);
    await operationDetailPage.openNewAllowance();
    await allowanceFormPage.expectOpenForCreate(fresh);
    await allowanceFormPage.expectFields();
    await allowanceFormPage.pickType(FATIGUE);
    await allowanceFormPage.setDiffers(true);
    await allowanceFormPage.expectWhyShown();
  });

  test('TC-COA-02 Block Create when a required field is empty', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8p2'), 'TC-COA-02 (ClickUp)');
    // Sept: a blank percentage fell back to the type default. On 2026-10-12
    // dev blocks it with "Required", as this case expects.
    const fresh = await createOperation(page);
    await openOperation(page, fresh);
    await operationDetailPage.openNewAllowance();
    await test.step('No Allowance type blocks Create', async () => {
      expect(await allowanceFormPage.create()).not.toBe('submitted');
      await allowanceFormPage.expectFieldFlagged('type');
    });
    await test.step('A type with a blank percentage blocks Create', async () => {
      await allowanceFormPage.pickType(FATIGUE);
      await allowanceFormPage.setPercentage('');
      expect(await allowanceFormPage.create()).not.toBe('submitted');
      await allowanceFormPage.expectFieldFlagged('percentage');
    });
    await allowanceFormPage.cancel();
    await operationDetailPage.expectAllowanceCount(0);
  });

  test('TC-COA-03 Percentage applied keeps four-decimal precision', async ({
    page,
    operationDetailPage,
  }) => {
    await allure.tms(cu('z941abv8p3'), 'TC-COA-03 (ClickUp)');
    // A deliberately non-round value (12.3456) so rounding can't pass by chance.
    await openOperation(page, op);
    await operationDetailPage.expectAllowanceRow(FATIGUE, { percentage: '12.3456%' });
    await page.reload();
    await operationDetailPage.expectAllowanceRow(FATIGUE, { percentage: '12.3456%' });
  });

  test('TC-COA-04 "Why the default was not used" is required for an override', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8p5'), 'TC-COA-04 (ClickUp)');
    const fresh = await createOperation(page);
    await openOperation(page, fresh);
    await operationDetailPage.openNewAllowance();
    await allowanceFormPage.pickType(FATIGUE);
    await allowanceFormPage.expectDiffers(false);
    await test.step('A percentage away from the default turns "Differs" on', async () => {
      await allowanceFormPage.setPercentage('15');
      await allowanceFormPage.expectDiffers(true);
    });
    await test.step('No reason blocks Create', async () => {
      expect(await allowanceFormPage.create()).not.toBe('submitted');
      await allowanceFormPage.expectFieldFlagged('why');
    });
    await test.step('With a reason it saves as an Override row', async () => {
      await allowanceFormPage.fillWhy(REASON);
      expect(await allowanceFormPage.create()).toBe('submitted');
      await operationDetailPage.expectAllowanceRow(FATIGUE, {
        percentage: '15%',
        override: 'Override',
        why: REASON,
      });
    });
  });

  test('TC-COA-05 Only one allowance row per type on an operation', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8p7'), 'TC-COA-05 (ClickUp)');
    // Enforced up front: a type already on the operation isn't offered again.
    await test.step('A type already on the operation is not offered', async () => {
      await openOperation(page, opOne);
      await operationDetailPage.openNewAllowance();
      const offered = await allowanceFormPage.typeOptions();
      expect(offered.filter((o) => o.startsWith(FATIGUE))).toEqual([]);
      expect(offered.filter((o) => o.startsWith(HANDLING))).toHaveLength(1);
      await allowanceFormPage.cancel();
    });
    await test.step('With every type used, New allowance is disabled', async () => {
      await openOperation(page, op);
      await operationDetailPage.expectNewAllowanceDisabled();
    });
  });

  test('TC-COA-06 Cancel discards the form without adding a row', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8p8'), 'TC-COA-06 (ClickUp)');
    const fresh = await createOperation(page);
    await openOperation(page, fresh);
    await operationDetailPage.openNewAllowance();
    await allowanceFormPage.pickType(HANDLING);
    await allowanceFormPage.setPercentage('7');
    await allowanceFormPage.cancel();
    await page.reload();
    await operationDetailPage.expectLoaded(fresh);
    await operationDetailPage.expectAllowanceCount(0);
  });

  test('TC-COA-07 Only a user with write permission can create an allowance', async ({
    personas,
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8pa'), 'TC-COA-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await test.step('Planner (write) opens New allowance', async () => {
      await openOperation(page, opOne);
      await operationDetailPage.openNewAllowance();
      await allowanceFormPage.expectOpenForCreate(opOne);
    });
    await test.step('Read-only user cannot add an allowance', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        const detail = new OperationDetailPage(roPage);
        await detail.open(opOne);
        // "New allowance" renders enabled for a read-only user on dev when a
        // type is still free (ClickUp z941abybge); if it opens, the create
        // itself must be refused.
        if (await detail.isNewAllowanceAvailable()) {
          const form = new AllowanceFormPage(roPage);
          await detail.openNewAllowance();
          await form.expectOpenForCreate(opOne);
          await form.pickType(HANDLING);
          await form.create();
        }
      });
    });
    await test.step('No row was added', async () => {
      await openOperation(page, opOne);
      await operationDetailPage.expectAllowanceCount(1);
    });
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EOA-01 Open an existing allowance row for editing', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8pd'), 'TC-EOA-01 (ClickUp)');
    // The case expected a "Saves as a new version" notice. Versioning was
    // removed on request (Demo Feedback z941abwdad), so the notice says the
    // row is overwritten — graded a pass by the user (2026-10-12).
    await allure.link(cu('z941abwdad'), 'Demo Feedback z941abwdad (ClickUp)');
    await openOperation(page, op);
    await operationDetailPage.openAllowanceEdit(HANDLING);
    await allowanceFormPage.expectOpenForEdit(op);
    await allowanceFormPage.expectSaveNotice(
      'Saving overwrites this allowance — it is not versioned, so no earlier state is kept.',
    );
  });

  test('TC-EOA-02 Editable fields persist after Save changes', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8pe'), 'TC-EOA-02 (ClickUp)');
    // The row's Version isn't shown anywhere in the UI, so only the values are checked.
    const fresh = await createOperation(page);
    await openOperation(page, fresh);
    await addAllowance(page, { type: FATIGUE });
    await operationDetailPage.expectAllowanceRow(FATIGUE, { override: 'Default' });
    await operationDetailPage.openAllowanceEdit(FATIGUE);
    await allowanceFormPage.expectOpenForEdit(fresh);
    await allowanceFormPage.setPercentage('18');
    await allowanceFormPage.expectDiffers(true);
    await allowanceFormPage.fillWhy(`${REASON} (edit)`);
    expect(await allowanceFormPage.saveChanges()).toBe('submitted');
    await page.reload();
    await operationDetailPage.expectLoaded(fresh);
    await operationDetailPage.expectAllowanceRow(FATIGUE, {
      percentage: '18%',
      override: 'Override',
      why: `${REASON} (edit)`,
    });
  });

  test('TC-EOA-03 Block Save changes when a required field is cleared', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8pf'), 'TC-EOA-03 (ClickUp)');
    // Allowance type is locked on edit (TC-EOA-05), so only the percentage can be cleared.
    await openOperation(page, op);
    await operationDetailPage.openAllowanceEdit(HANDLING);
    await allowanceFormPage.expectOpenForEdit(op);
    await allowanceFormPage.expectTypeLocked();
    await allowanceFormPage.setPercentage('');
    expect(await allowanceFormPage.saveChanges()).not.toBe('submitted');
    await allowanceFormPage.expectFieldFlagged('percentage');
  });

  test('TC-EOA-04 "Why the default was not used" is required when an edit makes it an override', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8ph'), 'TC-EOA-04 (ClickUp)');
    await openOperation(page, op);
    await operationDetailPage.expectAllowanceRow(HANDLING, { override: 'Default' });
    await operationDetailPage.openAllowanceEdit(HANDLING);
    await allowanceFormPage.expectOpenForEdit(op);
    await allowanceFormPage.expectDiffers(false);
    await allowanceFormPage.setPercentage('6.5');
    await allowanceFormPage.expectDiffers(true);
    expect(await allowanceFormPage.saveChanges()).not.toBe('submitted');
    await allowanceFormPage.expectFieldFlagged('why');
  });

  test('TC-EOA-05 Allowance type cannot be changed to a duplicate (it is locked on edit)', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8pj'), 'TC-EOA-05 (ClickUp)');
    await openOperation(page, op);
    await operationDetailPage.openAllowanceEdit(FATIGUE);
    await allowanceFormPage.expectOpenForEdit(op);
    await allowanceFormPage.expectTypeLocked();
  });

  test('TC-EOA-06 Cancel discards in-progress edits', async ({
    page,
    operationDetailPage,
    allowanceFormPage,
  }) => {
    await allure.tms(cu('z941abv8pk'), 'TC-EOA-06 (ClickUp)');
    await openOperation(page, op);
    const original = await operationDetailPage.allowancePercentage(FATIGUE);
    await operationDetailPage.openAllowanceEdit(FATIGUE);
    await allowanceFormPage.expectOpenForEdit(op);
    await allowanceFormPage.setPercentage('55.5555');
    await allowanceFormPage.cancel();
    await page.reload();
    await operationDetailPage.expectLoaded(op);
    await operationDetailPage.expectAllowanceRow(FATIGUE, { percentage: original });
  });

  test('TC-EOA-07 Only a user with write permission can save allowance edits', async ({
    personas,
    page,
    operationDetailPage,
  }) => {
    await allure.tms(cu('z941abv8pm'), 'TC-EOA-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await openOperation(page, op);
    const original = await operationDetailPage.allowancePercentage(HANDLING);
    await test.step('Read-only user cannot save a change to the row', async () => {
      await asPersona(personas, 'READONLY', async (roPage) => {
        const detail = new OperationDetailPage(roPage);
        await detail.open(op);
        // The row's Edit renders for a read-only user on dev (ClickUp
        // z941abybge); if it opens, the save itself must be refused.
        if (await detail.isAllowanceEditAvailable(HANDLING)) {
          const form = new AllowanceFormPage(roPage);
          await detail.openAllowanceEdit(HANDLING);
          await form.expectOpenForEdit(op);
          await form.setPercentage('6');
          await form.fillWhy(`${REASON} (read-only attempt)`);
          await form.saveChanges();
        }
      });
    });
    await test.step('The row is unchanged', async () => {
      await page.reload();
      await operationDetailPage.expectLoaded(op);
      await operationDetailPage.expectAllowanceRow(HANDLING, { percentage: original });
    });
  });
});
