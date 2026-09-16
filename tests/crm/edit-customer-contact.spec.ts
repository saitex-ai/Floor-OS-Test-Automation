import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../src/pages/crm/create-customer.page';

/**
 * CRM — Edit Customer / Contact (Sprint 1).
 *
 * Source of truth: test-cases/crm/edit-customer-contact.md (ClickUp task
 * https://app.clickup.com/t/z941abt7dw). Written against the Customer
 * Details screen (TC:6's Business Process editing is Customer-only —
 * Business Processes don't exist on Contacts). Confirmed against a real
 * save on dev on 2026-09-16.
 */
test.describe('CRM - Edit Customer / Contact', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Edit Customer / Contact');
    await allure.owner('CRM QA');
  });

  async function createActiveCustomer(createCustomerPage: CreateCustomerPage): Promise<void> {
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Test Customer ${Date.now()}`,
      email: `pw-test-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.postSaveCancelButton.click();
  }

  test('TC:1 Verify system-generated and locked fields cannot be edited', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g3', 'TC:1 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Inspect the System section fields', async () => {
      await customerDetailPage.expectFieldNotEditable('Customer Code');
      await customerDetailPage.expectFieldNotEditable('Created On');
      await customerDetailPage.expectFieldNotEditable('Created By');
      await customerDetailPage.expectFieldNotEditable('Updated On');
      await customerDetailPage.expectFieldNotEditable('Updated By');
    });
  });

  test('TC:2 Verify successful inline editing and confirmation of a valid field value', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g4', 'TC:2 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Edit City to a new valid value', async () => {
      await customerDetailPage.editField('City', 'Chennai');
    });

    await test.step('Detail view shows the updated value without a full reload', async () => {
      // The header summary line also renders "Chennai, India" — exact:
      // true is needed to isolate the field row's own value.
      await expect(page.getByText('Chennai', { exact: true })).toBeVisible();
    });
  });

  test('TC:3 Verify canceling an in-progress inline edit', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g5', 'TC:3 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Open edit mode on City, modify the text, then Cancel', async () => {
      await customerDetailPage.openFieldEdit('City');
      await customerDetailPage.fillFieldEdit('Should Not Persist');
      await customerDetailPage.cancelFieldEdit();
    });

    await test.step('Original value remains unchanged', async () => {
      await expect(page.getByText('Should Not Persist')).toHaveCount(0);
      // exact: true — the header summary line also renders "Coimbatore, India".
      await expect(page.getByText('Coimbatore', { exact: true })).toBeVisible();
    });
  });

  test('TC:4 Verify field-level validation rules during inline edit', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g6', 'TC:4 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Edit Email to an invalid format and try to save', async () => {
      await customerDetailPage.openFieldEdit('Email');
      await customerDetailPage.fillFieldEdit('not-an-email');
      await customerDetailPage.saveFieldEdit();
    });

    await test.step('Change is rejected with an inline error, field stays in edit mode', async () => {
      await customerDetailPage.expectFieldEditError('Enter a valid email address');
      await expect(page.getByRole('textbox').last()).toBeVisible();
    });
  });

  test('TC:5 Verify resetting of dependent fields when a driver field is modified', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g7', 'TC:5 (ClickUp)');

    test.fixme(
      true,
      'Not yet confirmed against the running app whether editing a driver field (e.g. Origin Type) on the Detail screen resets a dependent field (e.g. Referred By) the way the Create form does — written from the ClickUp text only',
    );

    await createActiveCustomer(createCustomerPage);
    // TODO(CRM QA): edit Origin Type away from "Referral" and confirm
    // "Referred By" clears/resets, once the real edit affordance for
    // that field is confirmed (it may not use the same combobox-in-place
    // pattern as the Create form).
  });

  test('TC:6 Verify Business Process and Assignee group editing validation', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g8', 'TC:6 (ClickUp)');

    // Confirmed inconsistent against the real app during investigation
    // (2026-09-16): clicking the filled Assignees combobox does clear it
    // visually (confirmed directly, repeatedly), but whether that clear
    // is actually in effect by the time Save is clicked right after is
    // not reliable — some runs correctly block with "A department needs
    // at least one assignee", others silently persist the old assignee
    // with no error at all, in both headed and headless runs, with no
    // locator/timing fix found that made it deterministic (see
    // clearLastRowAssignee()'s doc comment for what was tried). This
    // reads as a real intermittent issue in the app's own save handling,
    // not a gap in this test's locators — flag to the team before
    // spending more time on it.
    test.fixme(
      true,
      'Save-after-clearing-Assignees is inconsistently validated by the app itself — confirmed via repeated live investigation, not a locator issue on our side. See comment above.',
    );

    await createActiveCustomer(createCustomerPage);

    await test.step('Add a Department row with an assignee, then save', async () => {
      await customerDetailPage.openDepartmentsEdit();
      await customerDetailPage.addDepartmentRow('Cutting', 'Anjali Krishnakumar');
      await customerDetailPage.saveDepartments();
      await expect(customerDetailPage.toast).toBeVisible();
    });

    await test.step('Edit again and remove the only assignee (0 assignees)', async () => {
      await customerDetailPage.openDepartmentsEdit();
      await customerDetailPage.clearLastRowAssignee();
      await customerDetailPage.saveDepartments();
    });

    await test.step('Blocked with a targeted "at least one assignee" error', async () => {
      await customerDetailPage.expectFieldEditError('A department needs at least one assignee');
    });
  });

  test('TC:7 Verify audit trail generation after successful field edit', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7g9', 'TC:7 (ClickUp)');

    test.fixme(
      true,
      'No Audit History / Activity section was found on the Customer Details screen during probing — not confirmed to exist as a checkable UI element',
    );

    await createActiveCustomer(createCustomerPage);
    await customerDetailPage.editField('City', 'Chennai');
    // TODO(CRM QA): navigate to the record's Audit History / Activity
    // section and assert the appended entry, once that section is
    // confirmed to exist.
  });
});
