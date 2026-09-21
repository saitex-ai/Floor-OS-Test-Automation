import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { CrmPage } from '../../../src/pages/crm/crm.page';
import { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import { ContactListPage } from '../../../src/pages/crm/contact-list.page';
import { CreateContactPage } from '../../../src/pages/crm/create-contact.page';
import { CustomerDetailPage } from '../../../src/pages/crm/customer-detail.page';
import { ContactDetailPage } from '../../../src/pages/crm/contact-detail.page';

/**
 * CRM — Smoke suite. One happy-path test per distinct capability, so a
 * run here is a fast "is anything badly broken" check rather than full
 * coverage — that still lives in the regression suite. Deliberately
 * deduplicated: the regression suite keeps near-identical tests that
 * reach the same action from a different screen (each traces to its own
 * ClickUp subtask, so those are kept there even when word-for-word
 * identical), but smoke has no traceability goal — only one test per
 * capability survives here (e.g. one "create a Customer" check, not
 * three).
 *
 * Unlike every other suite in this framework, these tests share one
 * browser tab (opened once in beforeAll) instead of each getting its
 * own fresh one. Measured 2026-09-21: a fresh tab's sign-in handshake
 * costs ~11s (wait + click); a later navigation in an already-signed-in
 * tab costs ~7s (still a real page load, just no click) — sharing one
 * tab across this file's 8 tests saves roughly 30s of an ~5.5min run.
 * That's a deliberate trade against test independence, acceptable here
 * because smoke is meant to be fast, not diagnostic: test.describe.serial
 * stops the file at the first failure rather than let a corrupted shared
 * page produce confusing failures in every test after it. Each test
 * still creates its own fresh Customer/Contact data, only the tab itself
 * is shared.
 */
test.describe.serial('CRM Smoke', () => {
  let page: Page;
  let crmPage: CrmPage;
  let createCustomerPage: CreateCustomerPage;
  let contactListPage: ContactListPage;
  let createContactPage: CreateContactPage;
  let customerDetailPage: CustomerDetailPage;
  let contactDetailPage: ContactDetailPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ storageState: authFile('crm') });
    crmPage = new CrmPage(page);
    createCustomerPage = new CreateCustomerPage(page);
    contactListPage = new ContactListPage(page);
    createContactPage = new CreateContactPage(page);
    customerDetailPage = new CustomerDetailPage(page);
    contactDetailPage = new ContactDetailPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.owner('CRM QA');
  });

  /** From createActiveCustomer() in 07/08/10-*.spec.ts — new Customers save as Active. */
  async function createActiveCustomer(): Promise<void> {
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
  async function createAndDeactivateCustomer(): Promise<void> {
    await createActiveCustomer();
    await customerDetailPage.deactivate(['Business misalignment'], 'Setup for Activate smoke test');
    await customerDetailPage.expectStatus('Inactive');
  }

  /** From createLinkedContact() in 04-customer-detail.spec.ts. */
  async function createLinkedContact(): Promise<{ customerName: string; contactName: string }> {
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
  test('Create Customer: successful creation without a linked Contact', async () => {
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
  test('Contact Detail: layout and header summary render for a real Contact', async () => {
    await allure.feature('Contact Detail');
    const { customerName, contactName } = await createLinkedContact();
    await expect(contactDetailPage.locators.nameHeading).toHaveText(contactName);
    await contactDetailPage.expectHeaderSummary('Active', 'Buyer');
    await contactDetailPage.expectLinkedToCustomer(customerName);
  });

  /** From 05-activate-customer.spec.ts TC:5. */
  test('Activate Customer: reactivating an Inactive Customer succeeds', async () => {
    await allure.feature('Activate Customer');
    await createAndDeactivateCustomer();
    await customerDetailPage.activate(['Negotiation'], 'Reactivating after negotiation');
    await customerDetailPage.expectStatus('Active');
    await expect(customerDetailPage.locators.deactivateButton).toBeVisible();
    await expect(customerDetailPage.locators.activateButton).not.toBeVisible();
  });

  /** From 07-deactivate-customer.spec.ts TC:5. */
  test('Deactivate Customer: deactivating an active Customer succeeds', async () => {
    await allure.feature('Deactivate Customer');
    await createActiveCustomer();
    await customerDetailPage.deactivate(['Business misalignment'], 'Customer relocated overseas');
    await customerDetailPage.expectStatus('Inactive');
    await expect(customerDetailPage.locators.activateButton).toBeVisible();
    await expect(customerDetailPage.locators.deactivateButton).not.toBeVisible();
  });

  /** From 09-contact-list.spec.ts TC:1. */
  test('Contact List: default screen loads with expected columns and controls', async () => {
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
  test('Edit Customer / Contact: inline edit saves and reflects immediately', async () => {
    await allure.feature('Edit Customer / Contact');
    await createActiveCustomer();
    await customerDetailPage.editField('City', 'Chennai');
    await expect(page.getByText('Chennai', { exact: true })).toBeVisible();
  });

  /** From 11-create-contact.spec.ts TC:3. */
  test('Create Contact: linking to an existing Customer succeeds', async () => {
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
  test('CRM module: loads after shell login', async () => {
    await allure.feature('CRM Module');
    await crmPage.open();
    await crmPage.expectLoaded();
  });
});
