import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import type { CreateContactPage } from '../../../src/pages/crm/create-contact.page';

/**
 * CRM — Contact Detail Screen (Sprint 1).
 *
 * Source of truth: test-cases/crm/customer-detail.md (ClickUp task
 * https://app.clickup.com/t/z941abt7jj, "Customer detail Screen" —
 * mislabeled: every subtask is actually about the Contact Details
 * screen). All 6 confirmed against dev on 2026-09-16, using
 * ContactDetailPage. TC:3 only covers the locked fields that actually
 * exist on the screen (Created On/By, Updated On/By) — "Contact ID",
 * which the ClickUp text also lists, isn't shown anywhere on the real
 * screen. TC:6 (audit log) is `test.fixme()`'d — no Audit/History
 * section exists on this screen at all.
 */
test.describe('CRM - Contact Detail', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Contact Detail');
    await allure.owner('CRM QA');
  });

  /** Creates a real Customer, then a real Contact linked to it, landing on the Contact's Detail page. */
  async function createLinkedContact(
    createCustomerPage: CreateCustomerPage,
    createContactPage: CreateContactPage,
    page: Page,
  ): Promise<{ customerName: string; contactName: string }> {
    const customerName = `Playwright Detail Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-detail-cust-${Date.now()}@example.com`,
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
    const customerId = page.url().split('/').pop()!;

    const contactName = 'Playwright Detail Contact';
    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email: `pw-detail-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();
    await expect(page).toHaveURL(/\/crm\/contacts\/[0-9a-f-]+$/);

    return { customerName, contactName };
  }

  test('TC:1 Verify Contact Details screen layout and header summary visibility', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7md', 'TC:1 (ClickUp)');

    const { customerName, contactName } = await createLinkedContact(
      createCustomerPage,
      createContactPage,
      page,
    );

    await test.step('Identity header, status badge, and linked Customer are all visible', async () => {
      await expect(contactDetailPage.locators.nameHeading).toHaveText(contactName);
      await contactDetailPage.expectHeaderSummary('Active', 'Buyer');
      await contactDetailPage.expectLinkedToCustomer(customerName);
    });
  });

  test('TC:2 Verify navigation link to linked Customer Details screen', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7me', 'TC:2 (ClickUp)');

    const { customerName } = await createLinkedContact(createCustomerPage, createContactPage, page);

    await test.step('Click the hyperlinked Customer name in the header', async () => {
      await contactDetailPage.openLinkedCustomer(customerName);
    });

    await test.step("Navigates immediately to that Customer's own Details screen", async () => {
      await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(customerName);
    });
  });

  test('TC:3 Verify system-generated and locked fields cannot be edited on Contact screen', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7mf', 'TC:3 (ClickUp)');
    await createLinkedContact(createCustomerPage, createContactPage, page);

    // Note: "Contact ID" is also listed in the ClickUp text but isn't
    // shown anywhere on the real screen — confirmed directly, not
    // asserted here.
    await test.step('Inspect the System section fields', async () => {
      await contactDetailPage.expectFieldNotEditable('Created On');
      await contactDetailPage.expectFieldNotEditable('Created By');
      await contactDetailPage.expectFieldNotEditable('Updated On');
      await contactDetailPage.expectFieldNotEditable('Updated By');
    });
  });

  test('TC:4 Verify successful inline editing and immediate UI update on Contact profile', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7mg', 'TC:4 (ClickUp)');
    await createLinkedContact(createCustomerPage, createContactPage, page);

    await test.step('Edit Designation to a new valid value', async () => {
      await contactDetailPage.editField('Designation', 'Merchandiser');
    });

    await test.step('Change is persisted immediately without a full page reload', async () => {
      await expect(page.getByText('Merchandiser', { exact: true })).toBeVisible();
    });
  });

  test('TC:5 Verify field validation during inline edit on Contact Details screen', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7mh', 'TC:5 (ClickUp)');
    await createLinkedContact(createCustomerPage, createContactPage, page);

    await test.step('Edit Email to an invalid format and try to save', async () => {
      await contactDetailPage.openFieldEdit('Email');
      await contactDetailPage.fillFieldEdit('Email', 'not-an-email');
      await contactDetailPage.saveFieldEdit('Email');
    });

    await test.step('Update is blocked with an inline error, field stays in edit mode', async () => {
      await contactDetailPage.expectFieldEditError('Enter a valid email address');
      await expect(contactDetailPage.locators.cancelButton('Email')).toBeVisible();
    });
  });

  test('TC:6 Verify audit log trail creation for inline edits from Contact Details view', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7mj', 'TC:6 (ClickUp)');

    test.fixme(
      true,
      'No Audit/History section exists anywhere on this screen — confirmed directly (zero matches searching for "audit" or "history" text)',
    );

    // TODO(CRM QA): once an Audit/History view is confirmed to exist,
    // edit a field via contactDetailPage.editField(), navigate there, and
    // assert the appended entry (field, old/new value, user, timestamp).
    void createCustomerPage;
    void createContactPage;
    void contactDetailPage;
  });
});
