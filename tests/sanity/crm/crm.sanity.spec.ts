import * as allure from 'allure-js-commons';
import { test, expect, type Page } from '@playwright/test';
import { authFile } from '../../../src/fixtures/auth-setup';
import { CrmPage } from '../../../src/pages/crm/crm.page';
import { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import { ContactListPage } from '../../../src/pages/crm/contact-list.page';
import { CreateContactPage } from '../../../src/pages/crm/create-contact.page';
import { CustomerDetailPage } from '../../../src/pages/crm/customer-detail.page';
import { ContactDetailPage } from '../../../src/pages/crm/contact-detail.page';
import { ContactsTabPage } from '../../../src/pages/crm/contacts-tab.page';
import { KeyMeetingNotesPage } from '../../../src/pages/crm/key-meeting-notes.page';
import { LogCommunicationPage } from '../../../src/pages/crm/log-communication.page';
import { LeadQualificationPage } from '../../../src/pages/crm/lead-qualification.page';
import { ExternalEventsPage } from '../../../src/pages/crm/external-events.page';

/**
 * Confirmed on dev (2026-09-25) but NOT on local: Create Customer's
 * Management section can carry a required "Company" combobox that
 * createCustomerPage.fillProfile() doesn't fill. Defensive rather than
 * unconditional — only acts when the field is actually present, so this
 * doesn't change behavior on local or on a dev deploy where it's absent.
 */
async function fillCompanyIfPresent(page: Page): Promise<void> {
  const combo = page.getByRole('combobox', { name: 'Company', exact: true });
  if (await combo.isVisible().catch(() => false)) {
    await combo.click();
    await page.getByRole('option').first().click();
  }
}

/**
 * CRM — Sanity suite. One happy-path test per distinct capability — a
 * broader targeted subset than the smoke suite (tests/smoke/crm/), still
 * not full coverage, which lives in the regression suite. Originally
 * built as the smoke suite itself; moved here once tests/smoke/crm/ got
 * its own deliberately smaller set (login, create Customer, create
 * Contact), leaving this broader set to serve as sanity instead.
 * Deliberately deduplicated: the regression suite keeps near-identical
 * tests that reach the same action from a different screen (each traces
 * to its own ClickUp subtask, so those are kept there even when
 * word-for-word identical), but sanity has no traceability goal — only
 * one test per capability survives here (e.g. one "create a Customer"
 * check, not three).
 *
 * Unlike every other suite in this framework, these tests share one
 * browser tab (opened once in beforeAll) instead of each getting its
 * own fresh one. Measured 2026-09-21: a fresh tab's sign-in handshake
 * costs ~11s (wait + click); a later navigation in an already-signed-in
 * tab costs ~7s (still a real page load, just no click) — sharing one
 * tab across this file's tests saves real time on a run this size.
 * That's a deliberate trade against test independence, acceptable here
 * because this suite is meant to be fast, not diagnostic:
 * test.describe.serial stops the file at the first failure rather than
 * let a corrupted shared page produce confusing failures in every test
 * after it. Each test still creates its own fresh Customer/Contact data,
 * only the tab itself is shared.
 *
 * Update (2026-09-29, PR review): the capability-specific happy-path
 * tests (Contacts tab, Generate Key Meeting Notes, Log a Communication,
 * Notify Internally, Lead Qualification, External Events) moved here
 * from tests/smoke/crm/smoke-recent.spec.ts, which had grown past this
 * repo's own smoke-vs-sanity precedent (see that file's own history —
 * this suite exists specifically because an earlier 8-test CRM smoke
 * suite was walked back to just Login/Create Customer/Create Contact).
 * Each keeps its originating regression spec's TC reference in a comment
 * rather than in the test name, matching this file's no-ClickUp-in-title
 * convention.
 */
test.describe.serial('CRM Sanity', () => {
  let page: Page;
  let crmPage: CrmPage;
  let createCustomerPage: CreateCustomerPage;
  let contactListPage: ContactListPage;
  let createContactPage: CreateContactPage;
  let customerDetailPage: CustomerDetailPage;
  let contactDetailPage: ContactDetailPage;
  let contactsTabPage: ContactsTabPage;
  let keyMeetingNotesPage: KeyMeetingNotesPage;
  let logCommunicationPage: LogCommunicationPage;
  let leadQualificationPage: LeadQualificationPage;
  let externalEventsPage: ExternalEventsPage;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ storageState: authFile('crm') });
    crmPage = new CrmPage(page);
    createCustomerPage = new CreateCustomerPage(page);
    contactsTabPage = new ContactsTabPage(page);
    keyMeetingNotesPage = new KeyMeetingNotesPage(page);
    logCommunicationPage = new LogCommunicationPage(page);
    leadQualificationPage = new LeadQualificationPage(page);
    externalEventsPage = new ExternalEventsPage(page);
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

  /**
   * Shared by the tests migrated from smoke-recent.spec.ts below — a
   * plain Lead-stage Customer, optionally with a department assignee
   * added first (needed for the Communicator dropdown on Log a
   * Communication/Notify Internally; see 13-log-a-communication.spec.ts's
   * own createTestCustomer).
   */
  async function createLeadCustomer(
    withAssignee = false,
  ): Promise<{ customerId: string; customerName: string }> {
    const customerName = `Playwright Sanity Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-sanity-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    if (withAssignee) {
      await createCustomerPage.addBusinessProcessWithAssignee('Cutting', 'Anjali Krishnakumar');
    }
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    return { customerId: page.url().split('/').pop()!, customerName };
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

  // The six tests below moved here from tests/smoke/crm/smoke-recent.spec.ts
  // (2026-09-29, PR review) — see this file's own class-doc Update note.

  /** From 17-contacts-tab-customer-details.spec.ts TC:3. */
  test('Contacts tab: unlinking a Contact from a Customer without deleting the record', async () => {
    await allure.feature('Contacts tab');
    const { customerId, customerName } = await createLeadCustomer();

    const contactName = 'Playwright Sanity Test Contact';
    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email: `pw-sanity-linked-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();

    await contactsTabPage.open(customerId);
    await contactsTabPage.expectContactLinked(contactName);

    await contactsTabPage.delinkContact(contactName);
    await contactsTabPage.expectContactNotLinked(contactName);

    // The record itself survives — it reappears in the unlinked pool.
    await contactsTabPage.openLinkPanel();
    await expect(contactsTabPage.locators.linkContactOption(contactName).first()).toBeVisible();
  });

  /** From 14-generate-key-meeting-notes.spec.ts TC:3. */
  test('Generate Key Meeting Notes: AI generation of a structured notes draft', async () => {
    // Real AI generation against a local model — confirmed 6-10s+ per call,
    // well past the default per-test budget.
    test.slow();

    await allure.feature('Generate Key Meeting Notes');
    const { customerId } = await createLeadCustomer();

    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    await keyMeetingNotesPage.uploadSourceFile();
    await keyMeetingNotesPage.generateDraft();
    await keyMeetingNotesPage.expectDraftSectionsVisible();
  });

  /** From 13-log-a-communication.spec.ts TC-3. */
  test('Log a Communication: successful saving and audit stamping', async () => {
    await allure.feature('Log a Communication');
    const { customerId } = await createLeadCustomer(true);

    const title = `Playwright Sanity Communication ${Date.now()}`;
    await logCommunicationPage.openFromCustomerDetail(customerId);
    await logCommunicationPage.fill({
      medium: 'Phone Call',
      timezone: 'India',
      date: new Date().toISOString().slice(0, 10),
      title,
      reason: 'Follow-up',
      communicator: 'Anjali Krishnakumar',
      mom: 'Discussed pending sample approval.',
    });
    await logCommunicationPage.save();
    await logCommunicationPage.expectSavedSuccessfully();

    // Confirmed against the running app: the logged entry's own Details
    // screen shows a real "Created On"/"Created By" pair. Case-insensitive
    // — confirmed CSS text-transform timing race on this label family.
    await logCommunicationPage.openLoggedCommunication(title);
    const body = page.locator('main').last();
    await expect(body).toContainText(/created on/i);
    await expect(body).toContainText(/created by/i);
  });

  /** From 25-notify-internally-logged-communication.spec.ts TC:1. */
  test('Notify Internally: automatic internal notifications on logging a communication', async () => {
    await allure.feature('Notify Internally');
    const { customerId } = await createLeadCustomer(true);

    const title = `Playwright Sanity Notify Comm Log ${Date.now()}`;
    await logCommunicationPage.openFromCustomerDetail(customerId);
    await logCommunicationPage.fill({
      medium: 'Phone Call',
      timezone: 'India',
      date: new Date().toISOString().slice(0, 10),
      title,
      reason: 'Follow-up',
      communicator: 'Anjali Krishnakumar',
      mom: 'Discussed pending sample approval.',
    });
    await logCommunicationPage.save();
    await logCommunicationPage.expectSavedSuccessfully();

    await logCommunicationPage.openLoggedCommunication(title);
    await logCommunicationPage.notifyInternally();
    await logCommunicationPage.selectNotifyManager('Alice Planner');
    await logCommunicationPage.sendNotification();
  });

  /** From 26-lead-qualification-screen.spec.ts TC:2. */
  test('Lead Qualification: successful lead conversion by a Manager', async () => {
    await allure.feature('Lead Qualification');
    const { customerId } = await createLeadCustomer();

    await leadQualificationPage.openFromCustomerDetail(customerId);
    // Confirmed against the running app: Convert enables after the FIRST
    // saved department review — not after all four departments, as the
    // ClickUp text's "Convert bar" premise implies.
    await leadQualificationPage.submitReview({
      department: 'Fabric Mill',
      manager: 'Alice Planner',
      score: 8,
      review: 'Fabric Mill review looks solid. Recommend proceeding.',
    });
    await leadQualificationPage.expectConvertEnabled();
    await leadQualificationPage.convertToQualifiedLead();
    await leadQualificationPage.expectStageIsQualifiedLead();
  });

  /** From 28-create-external-event.spec.ts TC:1. */
  test('External Events: successful manual creation of an External Event', async () => {
    await allure.feature('External Events');
    const title = `Playwright Sanity External Event ${Date.now()}`;
    await externalEventsPage.openFromEventsList();
    await externalEventsPage.fill({
      title,
      venue: 'Test City / Venue',
      date: '2026-09-20',
      about: 'A test event created by Playwright.',
      attendee: 'Alice Planner',
      score: 8,
      numberOfLeads: 3,
      wentWell: 'Good turnout and engagement.',
      couldBeBetter: 'Nothing major.',
      attendNextEditions: 'Yes',
    });
    await externalEventsPage.submit();
    await externalEventsPage.expectConfirmDialogVisible();
    await externalEventsPage.confirmSaveEvent();
    await externalEventsPage.expectSavedSuccessfully();
  });

  /** From crm.spec.ts. */
  test('CRM module: loads after shell login', async () => {
    await allure.feature('CRM Module');
    await crmPage.open();
    await crmPage.expectLoaded();
  });
});
