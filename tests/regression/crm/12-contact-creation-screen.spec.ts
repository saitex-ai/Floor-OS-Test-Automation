import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Contact Creation Screen (Sprint 1).
 *
 * Source of truth: test-cases/crm/contact-creation-screen.md (ClickUp
 * task https://app.clickup.com/t/z941abt3bc). This overlaps heavily with
 * create-contact.spec.ts (same screen, same CreateContactPage) but is
 * kept as its own file per team decision — narrower focus on the
 * hand-off pre-fill/lock behavior and the reverse "create Customer from
 * Contact" flow. TC:1 confirmed against dev on 2026-09-16 with a real
 * saved Customer's id (dev validates `customerId` against a real
 * record — a fabricated id like the one used during local probing is
 * silently ignored there, unlike local). TC:2 depends on the Customer
 * Name linkage popup resolving; TC:3-5 don't match real app behavior
 * (see that test's comment); TC:7 needs a confirmed audit view — see
 * each test for specifics.
 */
test.describe('CRM - Contact Creation Screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Contact Creation Screen');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify Customer Linkage pre-filled & locked from Customer context', async ({
    createCustomerPage,
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3bd', 'TC:1 (ClickUp)');

    const customerName = `Playwright Handoff Customer ${Date.now()}`;
    let customerId = '';

    await test.step('Create a real Customer to hand off from', async () => {
      await createCustomerPage.openFromCrmHome();
      await createCustomerPage.fillProfile({
        name: customerName,
        email: `pw-handoff-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
        crmStage: 'Lead',
      });
      await createCustomerPage.save();
      if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
        await createCustomerPage.locators.saveAnywayButton.click();
      }
      await createCustomerPage.expectSavedSuccessfully();
      await createCustomerPage.locators.postSaveCancelButton.click();
      await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
      customerId = page.url().split('/').pop()!;
    });

    await test.step('Click "Create Contact" from that Customer screen (via hand-off route)', async () => {
      await createContactPage.openFromCustomerContext(customerId, customerName);
    });

    await test.step('Customer Name is pre-filled, locked, with the exact helper text', async () => {
      await expect(page).toHaveURL(/customerId=.*customerName=/);
      await createContactPage.expectCustomerLinkageLocked(customerName);
    });
  });

  test('TC:2 Create Contact with an explicit existing-Customer link', async ({
    createContactPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3be', 'TC:2 (ClickUp)');
    await createContactPage.openFromContactList();

    // "Acme Textiles" is a real existing Customer on dev (confirmed
    // directly via the Customers popup listing) — not a placeholder.
    await test.step('Search and select an active existing Customer', async () => {
      await createContactPage.linkToCustomer('Acme Textiles');
    });

    await test.step('Complete mandatory profile details and Save', async () => {
      await createContactPage.fillProfile({
        name: 'Playwright Test Contact',
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.save();
      await expect(createContactPage.locators.toast).toBeVisible();
    });
  });

  test('TC:3-4-5 Non-existent Customer name → save prompt → create Customer → cancel path', async ({
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3bj', 'TC:3 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/z941abt3cf', 'TC:4 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/z941abt3cg', 'TC:5 (ClickUp)');

    // Confirmed directly on dev (2026-09-16): typing a non-existent
    // Customer name and saving does NOT show a "create this Customer
    // now?" prompt the way this ClickUp task describes — the Contact
    // just saves as Unlinked, silently discarding the typed text. Not a
    // test-side bug; flagging as a spec-vs-implementation mismatch
    // rather than forcing an assertion against behavior that isn't
    // there. See create-contact.page.ts's class doc for the same note.
    test.fixme(
      true,
      'The app does not show a "create this Customer now?" prompt when a non-existent Customer name is typed — confirmed directly, contradicts this ClickUp task. Flag to the team: either the feature is unbuilt, or there is a different trigger for it.',
    );

    await createContactPage.openFromContactList();

    await test.step('Enter a non-existent Customer name and complete mandatory fields', async () => {
      await createContactPage.fillProfile({
        name: 'Playwright Test Contact',
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.locators.customerNameCombobox.click();
      await createContactPage.locators.customerNameCombobox.fill('newcustt');
    });

    await test.step('Save — toast confirms, modal prompts to create the Customer', async () => {
      await createContactPage.save();
      await expect(createContactPage.locators.toast).toBeVisible();
      await expect(createContactPage.locators.postSaveCreateCustomerModal).toBeVisible();
    });

    await test.step('Click "Create customer" — redirected with pre-fill params', async () => {
      await createContactPage.locators.createCustomerButton.click();
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
      'Needs a confirmed Audit History / Activity section on the Contact Details screen and a way to check Manager notifications — neither confirmed to exist as checkable UI yet',
    );

    await createContactPage.openFromContactList();
    await createContactPage.fillProfile({
      name: 'Playwright Test Contact',
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
