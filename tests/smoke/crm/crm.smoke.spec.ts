import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import type { CreateContactPage } from '../../../src/pages/crm/create-contact.page';
import type { CustomerDetailPage } from '../../../src/pages/crm/customer-detail.page';

/**
 * CRM — Smoke suite. One happy-path test per distinct capability, so a
 * run here is a fast "is anything badly broken" check rather than full
 * coverage — that still lives in the regression suite. Deliberately
 * deduplicated: the regression suite keeps near-identical tests that
 * reach the same action from a different screen (each traces to its own
 * ClickUp subtask, so those are kept there even when word-for-word
 * identical), but smoke has no traceability goal — only one test per
 * capability survives here (e.g. one "create a Customer" check, not
 * three). Each test is self-contained (creates whatever Customer/Contact
 * it needs) rather than depending on another test's state.
 */
test.describe('CRM Smoke', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.owner('CRM QA');
  });

  /** From createActiveCustomer() in 07/08/10-*.spec.ts — new Customers save as Active. */
  async function createActiveCustomer(createCustomerPage: CreateCustomerPage): Promise<void> {
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Smoke Customer ${Date.now()}`,
      email: `pw-smoke-${Date.now()}@example.com`,
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
    await createCustomerPage.locators.postSaveCancelButton.click();
  }

  /** From createAndDeactivateCustomer() in 05/06-*.spec.ts — Activate needs an Inactive Customer first. */
  async function createAndDeactivateCustomer(
    createCustomerPage: CreateCustomerPage,
    customerDetailPage: CustomerDetailPage,
  ): Promise<void> {
    await createActiveCustomer(createCustomerPage);
    await customerDetailPage.deactivate(['Business misalignment'], 'Setup for Activate smoke test');
    await customerDetailPage.expectStatus('Inactive');
  }

  /** From createLinkedContact() in 04-customer-detail.spec.ts. */
  async function createLinkedContact(
    createCustomerPage: CreateCustomerPage,
    createContactPage: CreateContactPage,
    page: Page,
  ): Promise<{ customerName: string; contactName: string }> {
    const customerName = `Playwright Smoke Detail Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-smoke-detail-cust-${Date.now()}@example.com`,
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

    const contactName = 'Playwright Smoke Detail Contact';
    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email: `pw-smoke-detail-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();
    await expect(page).toHaveURL(/\/crm\/contacts\/[0-9a-f-]+$/);

    return { customerName, contactName };
  }

  /** From 01-create-customer.spec.ts TC:7. */
  test('Create Customer: successful creation without a linked Contact', async ({
    createCustomerPage,
  }) => {
    await allure.feature('Create Customer');
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Smoke Customer ${Date.now()}`,
      email: `pw-smoke-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      crmStage: 'Lead',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
    });
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible()) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
  });

  /** From 04-customer-detail.spec.ts TC:1. */
  test('Contact Detail: layout and header summary render for a real Contact', async ({
    createCustomerPage,
    createContactPage,
    contactDetailPage,
    page,
  }) => {
    await allure.feature('Contact Detail');
    const { customerName, contactName } = await createLinkedContact(
      createCustomerPage,
      createContactPage,
      page,
    );
    await expect(contactDetailPage.locators.nameHeading).toHaveText(contactName);
    await contactDetailPage.expectHeaderSummary('Active', 'Buyer');
    await contactDetailPage.expectLinkedToCustomer(customerName);
  });

  /** From 05-activate-customer.spec.ts TC:5. */
  test('Activate Customer: reactivating an Inactive Customer succeeds', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.feature('Activate Customer');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);
    await customerDetailPage.activate(['Negotiation'], 'Reactivating after negotiation');
    await customerDetailPage.expectStatus('Active');
    await expect(customerDetailPage.locators.deactivateButton).toBeVisible();
    await expect(customerDetailPage.locators.activateButton).not.toBeVisible();
  });

  /** From 07-deactivate-customer.spec.ts TC:5. */
  test('Deactivate Customer: deactivating an active Customer succeeds', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.feature('Deactivate Customer');
    await createActiveCustomer(createCustomerPage);
    await customerDetailPage.deactivate(['Business misalignment'], 'Customer relocated overseas');
    await customerDetailPage.expectStatus('Inactive');
    await expect(customerDetailPage.locators.activateButton).toBeVisible();
    await expect(customerDetailPage.locators.deactivateButton).not.toBeVisible();
  });

  /** From 09-contact-list.spec.ts TC:1. */
  test('Contact List: default screen loads with expected columns and controls', async ({
    contactListPage,
  }) => {
    await allure.feature('Contact List');
    await contactListPage.open();
    await expect(contactListPage.locators.heading).toBeVisible();
    await expect(contactListPage.locators.allTab).toBeVisible();
    await expect(contactListPage.locators.linkedTab).toBeVisible();
    await expect(contactListPage.locators.unlinkedTab).toBeVisible();
    await expect(contactListPage.locators.searchInput).toBeVisible();
    await expect(contactListPage.locators.table).toBeVisible();
  });

  /** From 10-edit-customer-contact.spec.ts TC:2. */
  test('Edit Customer / Contact: inline edit saves and reflects immediately', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.feature('Edit Customer / Contact');
    await createActiveCustomer(createCustomerPage);
    await customerDetailPage.editField('City', 'Chennai');
    await expect(page.getByText('Chennai', { exact: true })).toBeVisible();
  });

  /** From 11-create-contact.spec.ts TC:3. */
  test('Create Contact: linking to an existing Customer succeeds', async ({
    createContactPage,
  }) => {
    await allure.feature('Create Contact');
    await createContactPage.openFromContactList();
    await createContactPage.fillProfile({
      name: 'Playwright Smoke Contact',
      designation: 'Buyer',
      email: `pw-smoke-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.linkToCustomer('Acme Textiles');
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();
  });

  /** From crm.spec.ts. */
  test('CRM module: loads after shell login', async ({ crmPage }) => {
    await allure.feature('CRM Module');
    await crmPage.open();
    await crmPage.expectLoaded();
  });
});
