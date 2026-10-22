import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';

/**
 * CRM — Customer Overview -> Edit (Sprint 5).
 *
 * Source of truth: test-cases/crm/customer-overview-edit.md (ClickUp task
 * https://app.clickup.com/t/z941abwd6w). Section-level Edit/Save/Cancel on
 * the Customer Detail screen's Overview tab, confirmed against dev on
 * 2026-10-15 with a freshly created Customer per test. TC:4 (Audit
 * History) is a `test.fail()` known failure — no Audit History tab/section
 * exists on the screen (also marked "fail" in ClickUp); it asserts the
 * expected tab, so it flips once the feature ships.
 */
test.describe('CRM - Customer Overview Edit', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Customer Overview Edit');
    await allure.owner('CRM QA');
  });

  interface CreatedCustomer {
    name: string;
    email: string;
  }

  /** Creates a fresh Customer via the UI and lands on its Detail (Overview) page. */
  async function createCustomer(createCustomerPage: CreateCustomerPage): Promise<CreatedCustomer> {
    const stamp = Date.now();
    const customer = {
      name: `Playwright Overview Edit ${stamp}`,
      email: `pw-overview-edit-${stamp}@example.com`,
    };
    await test.step('Create a fresh Customer and open its Overview tab', async () => {
      await createCustomerPage.openFromCrmHome();
      await createCustomerPage.fillProfile({
        name: customer.name,
        email: customer.email,
        city: 'Coimbatore',
        country: 'India',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
        crmStage: 'Lead',
      });
      await createCustomerPage.saveAndOpenDetail();
    });
    return customer;
  }

  test('TC:1 verify Successful Section-Level Edit and Immediate UI Reflection', async ({
    createCustomerPage,
    customerOverviewEditPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abwd6z', 'TC:1 (ClickUp)');
    test.slow();
    await createCustomer(createCustomerPage);
    const url = page.url();

    await test.step('Click Edit on the Customer Profile section', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Profile');
      await customerOverviewEditPage.expectSectionInEditMode('Customer Profile');
    });

    await test.step('Update Phone Number and Address, then Save', async () => {
      await customerOverviewEditPage.fillPhoneNumber('9876543210');
      await customerOverviewEditPage.fillField('Customer Profile', 'Address', '12 Avinashi Road');
      await customerOverviewEditPage.saveSection('Customer Profile');
    });

    await test.step('Section saves successfully and returns to read-only view', async () => {
      await customerOverviewEditPage.expectSuccessToast('Customer Profile updated');
      await customerOverviewEditPage.expectSectionReadOnly('Customer Profile');
    });

    await test.step('Updated values show immediately on the Overview tab (no browser refresh)', async () => {
      await expect(page).toHaveURL(url);
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'Phone', '9876543210');
      await customerOverviewEditPage.expectFieldValue(
        'Customer Profile',
        'Address',
        '12 Avinashi Road',
      );
    });
  });

  test('TC:2 Independent Section Editing (Isolation Check)', async ({
    createCustomerPage,
    customerOverviewEditPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abwd73', 'TC:2 (ClickUp)');
    test.slow();
    await createCustomer(createCustomerPage);

    await test.step('Click Edit on the Customer Profile section', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Profile');
    });

    await test.step('Only Customer Profile enters edit mode; all other sections stay read-only', async () => {
      await customerOverviewEditPage.expectSectionInEditMode('Customer Profile');
      await customerOverviewEditPage.expectSectionReadOnly('Customer Management');
      await customerOverviewEditPage.expectSectionReadOnly('System');
      await customerOverviewEditPage.expectSectionReadOnly('Departments and Assignees');
    });

    await test.step('Make (unsaved) changes in Customer Profile — other sections still read-only', async () => {
      await customerOverviewEditPage.fillField('Customer Profile', 'City', 'Chennai');
      await customerOverviewEditPage.fillPhoneNumber('9123456780');
      await customerOverviewEditPage.expectSectionInEditMode('Customer Profile');
      await customerOverviewEditPage.expectSectionReadOnly('Customer Management');
      await customerOverviewEditPage.expectSectionReadOnly('System');
      await customerOverviewEditPage.expectSectionReadOnly('Departments and Assignees');
    });
  });

  test('TC:3 Discard Changes via Cancel Action', async ({
    createCustomerPage,
    customerOverviewEditPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abwd74', 'TC:3 (ClickUp)');
    test.slow();
    await createCustomer(createCustomerPage);
    const originalManagement = await customerOverviewEditPage.sectionText('Customer Management');

    await test.step('Open edit mode on Customer Management', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Management');
      await customerOverviewEditPage.expectSectionInEditMode('Customer Management');
    });

    await test.step('Modify CRM Stage, Buyer and Referred By', async () => {
      await customerOverviewEditPage.selectFieldOption(
        'Customer Management',
        'CRM Stage',
        'Qualified Lead',
      );
      await customerOverviewEditPage.selectFieldOption('Customer Management', 'Buyer', 'Garment');
      await customerOverviewEditPage.fillField(
        'Customer Management',
        'Referred By',
        'Should Not Persist',
      );
    });

    await test.step('Click Cancel', async () => {
      await customerOverviewEditPage.cancelSection('Customer Management');
    });

    await test.step('Section reverts to read-only with the original values', async () => {
      await customerOverviewEditPage.expectSectionReadOnly('Customer Management');
      await customerOverviewEditPage.expectSectionText('Customer Management', originalManagement);
      await customerOverviewEditPage.expectFieldValue('Customer Management', 'CRM Stage', 'Lead');
      await customerOverviewEditPage.expectFieldValue('Customer Management', 'Buyer', 'Fabric');
      await customerOverviewEditPage.expectFieldNotShowing(
        'Customer Management',
        'Should Not Persist',
      );
    });

    await test.step('Original values are still stored after a page reload', async () => {
      await customerOverviewEditPage.reload();
      await customerOverviewEditPage.expectSectionText('Customer Management', originalManagement);
    });
  });

  test('TC:4 verify Audit History', async ({ createCustomerPage, customerOverviewEditPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abwd75', 'TC:4 (ClickUp)');
    // Known failure. Probed on dev (2026-10-15): the Customer Detail
    // screen's only tabs are Overview, Lead Qualification, Biz Docs,
    // Communication and Contacts — none contains any "Audit"/"History"
    // text. The only change trace is System → Updated On/Updated By and
    // the Profile's Version counter, with no per-field change list. No bug
    // ticket yet; ClickUp has this TC marked "fail". Flips to "unexpectedly
    // passed" once an Audit History tab ships.
    test.fail(
      true,
      'No Audit History tab/section on the Customer Detail screen (https://app.clickup.com/t/z941abwd75).',
    );
    test.slow();
    await createCustomer(createCustomerPage);

    await test.step('Update and save the Customer Profile section', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Profile');
      await customerOverviewEditPage.fillField('Customer Profile', 'City', 'Chennai');
      await customerOverviewEditPage.saveSection('Customer Profile');
      await customerOverviewEditPage.expectSuccessToast('Customer Profile updated');
    });

    await test.step("The Customer's Audit History tab is available", async () => {
      // TODO(CRM QA): once the tab ships, also assert the new entry
      // (changed field, timestamp, acting user ID).
      await customerOverviewEditPage.openAuditHistoryTab();
    });
  });

  test('TC:5 Mandatory Field Validation Block and Error Flagging', async ({
    createCustomerPage,
    customerOverviewEditPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abwd76', 'TC:5 (ClickUp)');
    test.slow();
    const customer = await createCustomer(createCustomerPage);

    await test.step('Clear the mandatory Customer Name and fill non-mandatory fields', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Profile');
      await customerOverviewEditPage.fillField('Customer Profile', 'Customer Name', '');
      await customerOverviewEditPage.fillPhoneNumber('9123456780');
      await customerOverviewEditPage.fillField('Customer Profile', 'City', 'Chennai');
    });

    await test.step('Click Save', async () => {
      await customerOverviewEditPage.saveSection('Customer Profile');
    });

    await test.step('Save is blocked, section stays in edit mode, Customer Name flagged "Required"', async () => {
      await customerOverviewEditPage.expectFieldRequiredError('Customer Profile', 'Customer Name');
      await customerOverviewEditPage.expectSectionInEditMode('Customer Profile');
      await customerOverviewEditPage.expectNoSuccessToast('Customer Profile updated');
    });

    await test.step('Cancel shows the original values', async () => {
      await customerOverviewEditPage.cancelSection('Customer Profile');
      await customerOverviewEditPage.expectSectionReadOnly('Customer Profile');
      await customerOverviewEditPage.expectFieldValue(
        'Customer Profile',
        'Customer Name',
        customer.name,
      );
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'City', 'Coimbatore');
    });

    await test.step('Nothing was persisted — after a reload the stored values are the originals', async () => {
      await customerOverviewEditPage.reload();
      await customerOverviewEditPage.expectFieldValue(
        'Customer Profile',
        'Customer Name',
        customer.name,
      );
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'City', 'Coimbatore');
      await customerOverviewEditPage.expectFieldNotShowing('Customer Profile', '9123456780');
    });
  });

  test('TC:6 Verify System-Derived / Locked Fields Non-Editable Check', async ({
    createCustomerPage,
    customerOverviewEditPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abwd77', 'TC:6 (ClickUp)');
    test.slow();
    await createCustomer(createCustomerPage);

    await test.step('Customer Profile in edit mode: Version stays locked', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Profile');
      await customerOverviewEditPage.expectFieldLocked('Customer Profile', 'Version');
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'Version', '1');
    });

    await test.step('System fields stay locked while a section is being edited', async () => {
      for (const label of [
        'Customer Code',
        'Created On',
        'Created By',
        'Updated On',
        'Updated By',
      ]) {
        await customerOverviewEditPage.expectFieldLocked('System', label);
      }
      await customerOverviewEditPage.expectSectionReadOnly('System');
      await customerOverviewEditPage.cancelSection('Customer Profile');
    });

    await test.step('Customer Management in edit mode: Status stays locked', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Management');
      await customerOverviewEditPage.expectFieldLocked('Customer Management', 'Status');
      await customerOverviewEditPage.expectFieldValue('Customer Management', 'Status', 'Active');
      await customerOverviewEditPage.cancelSection('Customer Management');
    });
  });

  test('TC:7 Verify Partial Section Update Isolation (Other Sections Unaffected)', async ({
    createCustomerPage,
    customerOverviewEditPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abwdcn', 'TC:7 (ClickUp)');
    test.slow();
    await createCustomer(createCustomerPage);
    const originalManagement = await customerOverviewEditPage.sectionText('Customer Management');

    await test.step('Edit and save only the Customer Profile section', async () => {
      await customerOverviewEditPage.openSectionEdit('Customer Profile');
      await customerOverviewEditPage.fillField('Customer Profile', 'City', 'Chennai');
      await customerOverviewEditPage.fillField('Customer Profile', 'State', 'Tamil Nadu');
      await customerOverviewEditPage.saveSection('Customer Profile');
      await customerOverviewEditPage.expectSuccessToast('Customer Profile updated');
      await customerOverviewEditPage.expectSectionReadOnly('Customer Profile');
    });

    await test.step('Customer Profile shows the new values', async () => {
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'City', 'Chennai');
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'State', 'Tamil Nadu');
    });

    await test.step('Customer Management is untouched by the Profile save', async () => {
      await customerOverviewEditPage.expectSectionText('Customer Management', originalManagement);
    });

    await test.step('After reload: Profile change persisted, Management still untouched', async () => {
      await customerOverviewEditPage.reload();
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'City', 'Chennai');
      await customerOverviewEditPage.expectFieldValue('Customer Profile', 'State', 'Tamil Nadu');
      await customerOverviewEditPage.expectSectionText('Customer Management', originalManagement);
    });
  });
});
