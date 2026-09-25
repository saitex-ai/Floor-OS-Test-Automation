import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { ShellLoginPage } from '../../../src/pages/shell/shell-login.page';
import { CrmPage } from '../../../src/pages/crm/crm.page';
import { MODULES } from '../../../src/config/modules';
import { moduleCredentials } from '../../../src/config/env';

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
 * A small, separately-requested smoke check covering just three
 * capabilities: real login, Create Customer, Create Contact. Kept apart
 * from crm.smoke.spec.ts rather than folded in, per how it was asked for.
 */
test.describe('CRM Smoke — Recent', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Smoke — Recent');
    await allure.owner('CRM QA');
  });

  test.describe('Login functionality', () => {
    // A genuinely fresh, unauthenticated context — the module project's
    // cached storageState would skip the real login this test exists to
    // check. `storageState: undefined` does NOT clear it (confirmed
    // 2026-09-21: Keycloak silently approved via the still-cached session,
    // never showing the login form, so the username/password fill timed
    // out) — an explicit empty state is required to actually override it.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Login functionality', async ({ page }) => {
      const { username, password } = moduleCredentials(MODULES.crm);
      const loginPage = new ShellLoginPage(page);
      await loginPage.goto('/');
      await loginPage.login(username, password);

      const crmPage = new CrmPage(page);
      await crmPage.open();
      await crmPage.expectLoaded();
    });
  });

  test('Create Customer: successful creation without a linked Contact', async ({
    createCustomerPage,
    page,
  }) => {
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
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible()) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
  });

  test('Create Contact: linking to an existing Customer succeeds', async ({
    createContactPage,
  }) => {
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

  // The three tests below are each ported from their regression spec's own
  // TC:3, confirmed passing there — see 17-contacts-tab-customer-details.spec.ts,
  // 14-generate-key-meeting-notes.spec.ts, and 13-log-a-communication.spec.ts.

  test('Contacts tab: TC:3 unlinking a Contact from a Customer without deleting the record', async ({
    createCustomerPage,
    createContactPage,
    contactsTabPage,
    page,
  }) => {
    const customerName = `Playwright Smoke Contacts-Tab Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-smoke-contacts-tab-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    const contactName = 'Playwright Smoke Test Contact';
    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email: `pw-smoke-linked-contact-${Date.now()}@example.com`,
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

  test('Generate Key Meeting Notes: TC:3 AI generation of a structured notes draft', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    // Real AI generation against a local model — confirmed 6-10s+ per call,
    // well past the default per-test budget.
    test.slow();

    const customerName = `Playwright Smoke KMN Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-smoke-kmn-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    await keyMeetingNotesPage.uploadSourceFile();
    await keyMeetingNotesPage.generateDraft();
    await keyMeetingNotesPage.expectDraftSectionsVisible();
  });

  test('Log a Communication: TC:3 successful saving and audit stamping', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    const customerName = `Playwright Smoke Log-Comm Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-smoke-log-comm-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    // "Communicator" lists this Customer's own department assignees — empty
    // until one is added (see 13-log-a-communication.spec.ts's createTestCustomer).
    await createCustomerPage.addBusinessProcessWithAssignee('Cutting', 'Anjali Krishnakumar');
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    await logCommunicationPage.openFromCustomerDetail(customerId);
    await logCommunicationPage.fill({
      medium: 'Phone Call',
      timezone: 'India',
      date: new Date().toISOString().slice(0, 10),
      title: `Playwright Smoke Communication ${Date.now()}`,
      reason: 'Follow-up',
      communicator: 'Anjali Krishnakumar',
      mom: 'Discussed pending sample approval.',
    });
    await logCommunicationPage.save();
    await logCommunicationPage.expectSavedSuccessfully();
  });

  // The three tests below cover CRM Sprint 4 stories, confirmed directly
  // against the running app (2026-09-25) — see lead-qualification.page.ts,
  // external-events.page.ts, and log-communication.page.ts's
  // notifyInternally()/selectNotifyManager()/sendNotification() for the
  // corrections each made to their own ClickUp text.

  test('Notify Internally: TC:1 automatic internal notifications on logging a communication', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    const customerName = `Playwright Smoke Notify Comm Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-smoke-notify-comm-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.addBusinessProcessWithAssignee('Cutting', 'Anjali Krishnakumar');
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    const title = `Playwright Smoke Notify Comm Log ${Date.now()}`;
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

  test('Lead Qualification: TC:2 successful lead conversion by a Manager', async ({
    createCustomerPage,
    leadQualificationPage,
    page,
  }) => {
    const customerName = `Playwright Smoke Lead Qual Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-smoke-lead-qual-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await fillCompanyIfPresent(page);
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

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

  test('External Events: TC:1 successful manual creation of an External Event', async ({
    externalEventsPage,
  }) => {
    const title = `Playwright Smoke External Event ${Date.now()}`;
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
});
