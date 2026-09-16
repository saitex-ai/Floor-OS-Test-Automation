import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';

/**
 * CRM — Create Contact (Sprint 1).
 *
 * Source of truth: test-cases/crm/create-contact.md (ClickUp task
 * https://app.clickup.com/t/86eyr7daq). TC:1/TC:2 are confirmed against a
 * real local `tilt up` run. TC:3-10 all depend on either the Customer
 * Name linkage combobox's popup resolving past "Loading customers…" or
 * Country being selectable ("Country list unavailable" locally) — both
 * blocked on local by the same class of missing-reference-data gap
 * documented in create-customer.page.ts, and not yet re-checked on dev
 * (unreachable over VPN as of 2026-09-16). Each of those tests is written
 * against the ClickUp text and marked with a TODO rather than skipped, so
 * the next run against a working environment only needs the TODOs
 * resolved, not the tests rewritten from scratch.
 */
test.describe('CRM - Create Contact', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Create Contact');
    await allure.owner('CRM QA');
  });

  test('TC:1 Save blocked when mandatory Profile fields are missing', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtq2r', 'TC:1 (ClickUp)');

    await test.step('Open Create Contact form and leave all fields blank', async () => {
      await createContactPage.openFromContactList();
    });

    await test.step('Click Save with everything blank', async () => {
      await createContactPage.save();
    });

    await test.step('Every mandatory field is individually flagged', async () => {
      await createContactPage.expectValidationBanner(/fields need attention/i);
      await createContactPage.expectFieldError('Required');
    });
  });

  test('TC:2 Field-level format validation — invalid email/phone', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtq3j', 'TC:2 (ClickUp)');
    await createContactPage.openFromContactList();

    await test.step('Enter an invalid email and phone number', async () => {
      await createContactPage.fillProfile({ email: 'not-an-email', phone: '123' });
    });

    await test.step('Click Save', async () => {
      await createContactPage.save();
    });

    await test.step('Email and phone each show a specific format error', async () => {
      await createContactPage.expectFieldError('Enter a valid email address');
      await createContactPage.expectFieldError('Digits only');
    });
  });

  test('TC:3 Create Contact linked to an existing Customer', async ({ createContactPage }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtq4g', 'TC:3 (ClickUp)');
    await createContactPage.openFromContactList();

    // TODO(CRM QA): the Customer Name popup never resolves past "Loading
    // customers…" locally (zero customers seeded, or a genuine bug) — pick
    // a real existing Customer name here once verified on an environment
    // with seeded data.
    await test.step('Complete mandatory Profile fields', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
    });

    await test.step('Search and select an existing Customer', async () => {
      await createContactPage.linkToCustomer('Acme Textiles'); // TODO: placeholder name
    });

    await test.step('Save and verify success', async () => {
      await createContactPage.save();
      await expect(createContactPage.toast).toBeVisible();
    });
  });

  test('TC:4 Create Contact and explicitly leave it unlinked', async ({ createContactPage }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtq52', 'TC:4 (ClickUp)');
    await createContactPage.openFromContactList();

    await test.step('Complete mandatory Profile fields, leave Customer Name blank', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India', // TODO: blocked locally — "Country list unavailable"
      });
    });

    await test.step('Save without linking a Customer', async () => {
      await createContactPage.save();
      await expect(createContactPage.toast).toBeVisible();
    });
  });

  test('TC:5-6 New Customer name at save time, then accept the create-Customer prompt', async ({
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtq5u', 'TC:5 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/86eyrtq95', 'TC:6 (ClickUp)');
    await createContactPage.openFromContactList();

    // TODO(CRM QA): sequential per the doc's note — TC:6 only makes sense
    // after TC:5's save. Not yet run end-to-end (blocked, see class doc).
    await test.step('Complete mandatory fields with a not-yet-existing Customer name', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.customerNameCombobox.click();
      await createContactPage.customerNameCombobox.fill('Totally New Customer XYZ');
    });

    await test.step('Save and expect the "create this Customer now?" prompt', async () => {
      await createContactPage.save();
      await expect(createContactPage.postSaveCreateCustomerModal).toBeVisible();
    });

    await test.step('Accept the prompt — routed into Customer creation, pre-linked', async () => {
      await createContactPage.createCustomerButton.click();
      await expect(page).toHaveURL(/\/crm\/customers\/new\?.*contactId=/);
    });
  });

  test('TC:7-8 Customer field pre-filled and locked from Customer context, then saved', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtqa1', 'TC:7 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/86eyrtqbc', 'TC:8 (ClickUp)');

    await test.step("Initiate Create Contact from within a Customer's context", async () => {
      // TODO(CRM QA): real customerId/customerName once a customer can be
      // saved locally — confirmed the hand-off itself renders correctly
      // (locked text + exact helper copy) via this same query-param shape.
      await createContactPage.openFromCustomerContext('cust-abc', 'Acme Textiles');
    });

    await test.step('Customer field is pre-populated and locked', async () => {
      await createContactPage.expectCustomerLinkageLocked('Acme Textiles');
    });

    await test.step('Complete mandatory Profile fields and Save', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India', // TODO: blocked locally
      });
      await createContactPage.save();
      await expect(createContactPage.toast).toBeVisible();
    });
  });

  test('TC:9 Duplicate Contact warning shown, user can proceed', async ({ createContactPage }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtqc8', 'TC:9 (ClickUp)');
    await createContactPage.openFromContactList();

    // TODO(CRM QA): needs a real existing Contact's email/phone at the
    // same Customer to trigger the duplicate check — not available
    // locally (zero seeded contacts).
    await test.step('Enter email/phone matching an existing Contact', async () => {
      await createContactPage.fillProfile({
        name: `Playwright Test Contact ${Date.now()}`,
        designation: 'Buyer',
        email: 'existing-contact@example.com', // TODO: placeholder
        city: 'Coimbatore',
        country: 'India',
      });
    });

    await test.step('Save and acknowledge the non-blocking duplicate warning', async () => {
      await createContactPage.save();
      await expect(createContactPage.duplicateWarningModal).toBeVisible();
      await createContactPage.saveAnywayButton.click();
      await expect(createContactPage.toast).toBeVisible();
    });
  });

  test('TC:10 Creation metadata and audit trail recorded', async ({ createContactPage }) => {
    await allure.tms('https://app.clickup.com/t/86eyrtqdq', 'TC:10 (ClickUp)');

    // Marked `fail` in ClickUp already — the audit/history view for
    // Contacts may not exist as a checkable UI element yet. Written
    // against the ClickUp text for when that's confirmed one way or the
    // other, not run to a real assertion here.
    test.fixme(
      true,
      'Marked fail in ClickUp — audit/history view not confirmed to exist for Contacts yet',
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
    // TODO(CRM QA): open the saved Contact's detail/history view and
    // assert creation timestamp, creating user, and a "record created"
    // audit entry once that view is confirmed to exist.
  });
});
