import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Contacts tab in Customer Details screen (Sprint 2).
 *
 * Source of truth: test-cases/crm/contacts-tab-customer-details.md
 * (ClickUp task https://app.clickup.com/t/z941abu03d, User Story
 * https://app.clickup.com/t/z941abta54). Confirmed against the running
 * app (2026-09-23) — see contacts-tab.locators.ts's class doc for the
 * corrections this made to the original ClickUp-text guesses, notably:
 * linking goes through a "Contacts to link" combobox (not a separate
 * dialog trigger), and a linked Contact is "Delink"ed (not "Unlink"ed).
 */
/** Contact Name is validated "Alphabets only" — no digits allowed, so timestamps can't be used for uniqueness there. */
function randomLetters(length = 8): string {
  return Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
}

test.describe('CRM - Contacts tab in Customer Details', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Contacts tab in Customer Details');
    await allure.owner('CRM QA');
  });

  /** Every test needs a real Customer to open the Contacts tab against. */
  async function createTestCustomer(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    page: import('@playwright/test').Page,
  ): Promise<{ customerId: string; customerName: string }> {
    const customerName = `Playwright Contacts-Tab Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-contacts-tab-${Date.now()}@example.com`,
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
    return { customerId: page.url().split('/').pop()!, customerName };
  }

  /** Creates a Contact pre-linked to the given Customer, via the confirmed hand-off pattern. */
  async function createContactLinkedTo(
    createContactPage: import('../../../src/pages/crm/create-contact.page').CreateContactPage,
    customerId: string,
    customerName: string,
  ): Promise<string> {
    const contactName = 'Playwright Test Contact';
    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email: `pw-linked-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();
    return contactName;
  }

  test('TC:1 Verify default/empty state of Contacts tab when no contacts are linked', async ({
    createCustomerPage,
    contactsTabPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu03j', 'TC:1 (ClickUp)');

    const { customerId } = await createTestCustomer(createCustomerPage, page);

    await test.step('Open the Contacts tab on a Customer with no linked Contacts', async () => {
      await contactsTabPage.open(customerId);
    });

    await test.step('Tab shows an empty state and entry points to link/create', async () => {
      await contactsTabPage.expectEmptyState();
      await expect(contactsTabPage.locators.contactsToLinkCombobox).toBeVisible();
      await expect(contactsTabPage.locators.newContactButton).toBeVisible();
    });
  });

  test('TC:2 Verify searching, selecting, and linking existing contacts', async ({
    createCustomerPage,
    createContactPage,
    contactsTabPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu03k', 'TC:2 (ClickUp)');

    // A real, standalone (not pre-linked) Contact — created fresh rather
    // than relying on seed data, since linking it here removes it from
    // the unlinked pool for good until delinked, which would make a
    // hardcoded seeded name unreliable across repeated runs. Contact Name
    // is validated "Alphabets only" (confirmed — see
    // create-contact.locators.ts), so uniqueness comes from a random
    // letters-only suffix, not a timestamp.
    const existingUnlinkedContact = `Playwright Unlinked Contact ${randomLetters()}`;
    await createContactPage.openFromContactList();
    await createContactPage.fillProfile({
      name: existingUnlinkedContact,
      designation: 'Buyer',
      email: `pw-unlinked-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();

    const { customerId } = await createTestCustomer(createCustomerPage, page);
    await contactsTabPage.open(customerId);

    await test.step('Search for and select an existing unlinked Contact', async () => {
      await contactsTabPage.linkExistingContacts([existingUnlinkedContact]);
    });

    await test.step('The linked Contact now appears in the tab', async () => {
      await contactsTabPage.expectContactLinked(existingUnlinkedContact);
    });
  });

  test('TC:3 Verify unlinking a contact from Customer without deleting record', async ({
    createCustomerPage,
    createContactPage,
    contactsTabPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu03n', 'TC:3 (ClickUp)');

    const { customerId, customerName } = await createTestCustomer(createCustomerPage, page);
    const contactName = await createContactLinkedTo(createContactPage, customerId, customerName);

    await test.step('Open the Contacts tab and confirm the Contact is linked', async () => {
      await contactsTabPage.open(customerId);
      await contactsTabPage.expectContactLinked(contactName);
    });

    await test.step('Delink the Contact', async () => {
      await contactsTabPage.delinkContact(contactName);
    });

    await test.step('Contact no longer listed in the tab', async () => {
      await contactsTabPage.expectContactNotLinked(contactName);
    });

    await test.step('The Contact record itself still exists, now unlinked', async () => {
      // Confirmed against the running app: a delinked Contact reappears
      // in the "Contacts to link" popup's unlinked pool immediately —
      // the record survives, only the link is removed. `.first()`: the
      // helper's hardcoded name means other runs' now-unlinked Contacts
      // of the same name can also be in this pool.
      await contactsTabPage.openLinkPanel();
      await expect(contactsTabPage.locators.linkContactOption(contactName).first()).toBeVisible();
    });
  });

  test('TC:4 Verify unlinking a contact from a customer', async ({
    createCustomerPage,
    createContactPage,
    contactsTabPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu03p', 'TC:4 (ClickUp)');

    // TC:3 and TC:4 both describe "unlinking a contact" near-identically
    // in ClickUp's own text — implemented as written (two separate
    // tests) rather than merged; see contacts-tab-customer-details.md's
    // "Notes for whoever picks this up next".
    const { customerId, customerName } = await createTestCustomer(createCustomerPage, page);
    const contactName = await createContactLinkedTo(createContactPage, customerId, customerName);

    await test.step('Open the Contacts tab and confirm the Contact is linked', async () => {
      await contactsTabPage.open(customerId);
      await contactsTabPage.expectContactLinked(contactName);
    });

    await test.step('Delink the Contact and confirm', async () => {
      await contactsTabPage.delinkContact(contactName);
    });

    await test.step('Contact no longer listed in the tab', async () => {
      await contactsTabPage.expectContactNotLinked(contactName);
    });
  });

  test('TC:5 Verify navigation to Contact Details from the linked contacts list', async ({
    createCustomerPage,
    createContactPage,
    contactsTabPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu03r', 'TC:5 (ClickUp)');

    const { customerId, customerName } = await createTestCustomer(createCustomerPage, page);
    const contactName = await createContactLinkedTo(createContactPage, customerId, customerName);

    await contactsTabPage.open(customerId);

    await test.step('Select the linked Contact', async () => {
      await contactsTabPage.openLinkedContact(contactName);
    });

    await test.step("Navigates to that Contact's own Details screen", async () => {
      await contactsTabPage.expectNavigatedToContactDetails();
    });
  });

  test('TC:6 Verify status propagation (Active / Deactivate governance)', async ({
    createCustomerPage,
    createContactPage,
    customerDetailPage,
    contactsTabPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu09y', 'TC:6 (ClickUp)');

    // Confirmed against the running app: this does NOT happen. A linked
    // Contact's row in this tab shows no status at all (just its name and
    // a Delink button — see contacts-tab.locators.ts), and deactivating
    // the Customer leaves the Contact's own Details screen reading
    // "Active" unchanged. Kept as fixme (not deleted, not asserted as
    // passing) so this gap between the ClickUp text and the real app
    // stays visible — same discipline as TC:3/TC:5 in
    // 14-generate-key-meeting-notes.spec.ts.
    test.fixme(
      true,
      "Status does not propagate from Customer to linked Contact — confirmed against the running app, contradicting contacts-tab-customer-details.md's premise.",
    );

    const { customerId, customerName } = await createTestCustomer(createCustomerPage, page);
    const contactName = await createContactLinkedTo(createContactPage, customerId, customerName);

    await contactsTabPage.open(customerId);
    await contactsTabPage.openLinkedContact(contactName);
    await expect(page.getByText('Active', { exact: false }).first()).toBeVisible();

    await test.step('Deactivate the Customer', async () => {
      // Confirmed shape reused from customer-detail.page.ts — real
      // Deactivation reasons are "Business misalignment", "Payment
      // issues", "Low order frequency", "Compliance concerns", "Unethical".
      await customerDetailPage.deactivate(
        ['Business misalignment'],
        'Playwright status-propagation check.',
      );
    });

    await test.step("Linked Contact's own status should reflect the Customer's new status", async () => {
      await contactsTabPage.open(customerId);
      await contactsTabPage.openLinkedContact(contactName);
      await expect(page.getByText('Inactive', { exact: false }).first()).toBeVisible();
    });
  });
});
