import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { randomLetters } from '../../../src/utils/test-data';

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
 * Name linkage popup resolving; TC:3-5 (the create-Customer prompt)
 * re-checked and enabled on dev 2026-10-23; TC:7 needs a confirmed audit
 * view — see each test for specifics.
 */
/**
 * A unique "Playwright Test Contact <letters>" name, so the prompt checks
 * can tell this run's Contact from earlier ones (Contact Name is letters only).
 */
function uniqueContactName(): string {
  return `Playwright Test Contact ${randomLetters()}`;
}

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
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt3bj', 'TC:3 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/z941abt3cf', 'TC:4 (ClickUp)');
    await allure.tms('https://app.clickup.com/t/z941abt3cg', 'TC:5 (ClickUp)');

    // Re-checked on dev (2026-10-23): the prompt now exists (test.fixme
    // since 2026-09-16, when the typed name was dropped). Each path saves
    // its own Contact; accepting only opens Create Customer, it doesn't
    // save a Customer.
    const modal = createContactPage.locators.postSaveCreateCustomerModal;

    /**
     * TC:3 — save a new Contact with a non-existent Customer name; returns
     * both names. Each call uses its own Contact name, so the second call's
     * toast check can't pass on the first call's toast.
     */
    async function saveWithNewCustomerName(): Promise<{
      contactName: string;
      newCustomerName: string;
    }> {
      const contactName = uniqueContactName();
      const newCustomerName = `Playwright Prompt Customer ${Date.now()}`;
      await createContactPage.openFromContactList();
      await createContactPage.enterNewCustomerName(newCustomerName);
      await createContactPage.fillProfile({
        name: contactName,
        designation: 'Buyer',
        email: `pw-contact-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.save();
      await expect(createContactPage.locators.toast).toContainText(
        `Contact ${contactName} created`,
      );
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(`Contact ${contactName} was saved successfully!`);
      await expect(modal).toContainText(`Proceed to create customer ${newCustomerName}?`);
      await expect(createContactPage.locators.postSaveCancelButton).toBeVisible();
      await expect(createContactPage.locators.createCustomerButton).toBeVisible();
      return { contactName, newCustomerName };
    }

    const { contactName, newCustomerName } = await test.step(
      'Non-existent Customer name: save shows a toast and the create-Customer prompt',
      saveWithNewCustomerName,
    );

    await test.step('"Create customer" opens Create Customer with the name and Contact pre-filled', async () => {
      await createContactPage.locators.createCustomerButton.click();
      await expect(page).toHaveURL(/\/crm\/customers\/new\?/);
      const params = new URL(page.url()).searchParams;
      expect(params.get('name')).toBe(newCustomerName);
      expect(params.get('contactId')).toMatch(/^[0-9a-f-]{36}$/);
      expect(params.get('contactName')).toBe(contactName);
      await expect(createCustomerPage.locators.customerNameInput).toHaveValue(newCustomerName);
      await expect(createCustomerPage.locators.linkContactsCombobox).toContainText(contactName);
    });

    await test.step("Cancel on the prompt: it closes on the new Contact's Details screen", async () => {
      const second = await saveWithNewCustomerName();
      await createContactPage.locators.postSaveCancelButton.click();
      await expect(modal).toBeHidden();
      await expect(page).toHaveURL(/\/crm\/contacts\/[0-9a-f-]{36}$/);
      await expect(page.getByRole('heading', { level: 1, name: second.contactName })).toBeVisible();
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
      // Confirmed live (2026-10-15): Contact Name and Email are both
      // mandatory ("2 fields need attention"), matching the agreed rule
      // (name and email mandatory; email unique). On 2026-10-05 only
      // Email was flagged ("1 field needs attention").
      await createContactPage.expectValidationBanner(
        '2 fields need attention — data-type errors are highlighted on the respective fields.',
      );
      await createContactPage.expectNameAndEmailRequired();
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
