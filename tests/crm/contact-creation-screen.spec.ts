import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';

/**
 * CRM — Contact Creation Screen (Sprint 1).
 *
 * Source of truth: test-cases/crm/contact-creation-screen.md (ClickUp
 * task https://app.clickup.com/t/z941abt3bc). This overlaps heavily with
 * create-contact.spec.ts (same screen, same CreateContactPage) but is
 * kept as its own file per team decision — narrower focus on the
 * hand-off pre-fill/lock behavior and the reverse "create Customer from
 * Contact" flow. TC:1 and TC:6 are confirmed against a real local
 * `tilt up` run; TC:2-5 and TC:7 depend on the Customer Name linkage
 * popup resolving or on a real saved Contact existing, both blocked
 * locally the same way documented in create-contact.spec.ts.
 */
test.describe('CRM - Contact Creation Screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Contact Creation Screen');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify Customer Linkage pre-filled & locked from Customer context', async ({
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3bd', 'TC:1 (ClickUp)');

    await test.step('Click "Create Contact" from a Customer screen (via hand-off route)', async () => {
      await createContactPage.openFromCustomerContext('cust-abc', 'Acme Textiles');
    });

    await test.step('Customer Name is pre-filled, locked, with the exact helper text', async () => {
      await expect(page).toHaveURL(/customerId=.*customerName=/);
      await createContactPage.expectCustomerLinkageLocked('Acme Textiles');
    });
  });

  test('TC:2 Create Contact with an explicit existing-Customer link', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3be', 'TC:2 (ClickUp)');
    await createContactPage.openFromContactList();

    // TODO(CRM QA): blocked locally — the Customers popup never resolves
    // past "Loading customers…" (zero customers seeded, or a genuine
    // bug); pick a real active Customer name once verified elsewhere.
    await test.step('Search and select an active existing Customer', async () => {
      await createContactPage.linkToCustomer('Acme Textiles'); // TODO: placeholder
    });

    await test.step('Complete mandatory profile details and Save', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India', // TODO: blocked locally — "Country list unavailable"
      });
      await createContactPage.save();
      await expect(createContactPage.toast).toBeVisible();
    });
  });

  test('TC:3-4-5 Non-existent Customer name → save prompt → create Customer → cancel path', async ({
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3bj', 'TC:3 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/z941abt3cf', 'TC:4 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/z941abt3cg', 'TC:5 (ClickUp)');
    await createContactPage.openFromContactList();

    // TODO(CRM QA): one continuous flow per the doc's note. Not yet run
    // end-to-end — blocked on the same Customer-linkage popup issue.
    await test.step('Enter a non-existent Customer name and complete mandatory fields', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.customerNameCombobox.click();
      await createContactPage.customerNameCombobox.fill('newcustt');
    });

    await test.step('Save — toast confirms, modal prompts to create the Customer', async () => {
      await createContactPage.save();
      await expect(createContactPage.toast).toBeVisible();
      await expect(createContactPage.postSaveCreateCustomerModal).toBeVisible();
    });

    await test.step('Click "Create customer" — redirected with pre-fill params', async () => {
      await createContactPage.createCustomerButton.click();
      await expect(page).toHaveURL(/\/crm\/customers\/new\?name=newcustt.*contactId=/);
    });
  });

  test('TC:6 Verify field-level inline errors on mandatory field submission failure', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3ck', 'TC:6 (ClickUp)');

    await test.step('Open Create Contact and leave mandatory fields blank', async () => {
      await createContactPage.openFromContactList();
    });

    await test.step('Click Save Contact', async () => {
      await createContactPage.save();
    });

    await test.step('Exact banner text and per-field "Required" inline errors', async () => {
      // Confirmed word-for-word against the running app.
      await createContactPage.expectValidationBanner(
        '5 fields need attention — data-type errors are highlighted on the respective fields.',
      );
      await createContactPage.expectFieldError('Required');
    });
  });

  test('TC:7 Verify Audit Entry and Manager Notification post-creation', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3d0', 'TC:7 (ClickUp)');

    test.fixme(
      true,
      'Needs a successfully saved Contact to open its Details/Audit view — blocked locally (Country list unavailable + Customer linkage popup never resolves)',
    );

    await createContactPage.openFromContactList();
    await createContactPage.fillProfile({
      name: `Playwright Test Contact ${Date.now()}`,
      designation: 'Buyer',
      email: `pw-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    // TODO(CRM QA): navigate to the created Contact's Details screen and
    // assert the System/Audit section + Manager notification once that
    // screen exists as a confirmed page object (see customer-detail.md).
  });
});
