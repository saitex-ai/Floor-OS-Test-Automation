import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import type { CreateContactPage } from '../../../src/pages/crm/create-contact.page';
import type { AlertsPage } from '../../../src/pages/crm/alerts.page';

/**
 * CRM — Email an Alert (Sprint 5): "Email Alert Internally" and "Email
 * Alert to Customer" from the Alert detail view.
 *
 * Source of truth: ClickUp "CRM -Sprint -5-Email an Alert"
 * (https://app.clickup.com/t/z941abx7ga), TC:1–TC:9. Detailed (wider)
 * test-case doc: test-cases/crm/email-alert-internally-and-to-customer.md.
 * Confirmed against dev on 2026-10-15.
 *
 * Outlook boundary: both popups hand off to Outlook web by opening a
 * compose deep link in a new tab. Nothing about Outlook itself is used —
 * AlertsPage.redirectToOutlookAndCaptureCompose() stubs Outlook's hosts,
 * decodes the deep link's to/cc/subject/body (src/utils/outlook-compose.ts)
 * and closes the tab.
 *
 * Test data: Alerts are a FIXED, non-replenishable seed set with no Create
 * path — these tests only read the first Alert and never Check/Uncheck or
 * delete it. Customers/Contacts are created fresh per test via the UI
 * (uniquely named "PW Email Alert …"); only those are ever deactivated.
 *
 * Real dev findings (asserted as "BUG:" steps):
 * - TC:4: the Customer popup's empty-To error reads "Select a Customer
 *   email ID", not "Select at least one email address".
 * - TC:6: an active Customer with no email (and no Contacts) isn't listed
 *   at all — no "No email on file" (disabled) entry.
 * - TC:7: a deactivated Customer (and its Contact) is still offered in To.
 */
test.describe('CRM - Email an Alert', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Email an Alert');
    await allure.owner('CRM QA');
  });

  /** Internal directory users confirmed on dev (CRM manager + CRM executive test accounts). */
  const INTERNAL_MANAGER = 'crmmanager@flooros.dev';
  const INTERNAL_EXECUTIVE = 'crmexecutive@flooros.dev';

  const BODY_FIELDS_COMMON = [
    'ALERT:',
    'Type:',
    'Region:',
    'Published On:',
    'Effective From:',
    'Regulations:',
    'Official Source:',
  ];

  /** Creates an Active Customer via the UI (email optional) and returns its id. */
  async function createCustomer(
    createCustomerPage: CreateCustomerPage,
    page: Page,
    name: string,
    email?: string,
  ): Promise<string> {
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name,
      email,
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
    return page.url().split('/').pop()!;
  }

  /** Creates a Contact linked to the given Customer via the UI. */
  async function createLinkedContact(
    createContactPage: CreateContactPage,
    page: Page,
    customerId: string,
    customerName: string,
    contactName: string,
    email: string,
  ): Promise<void> {
    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(page).toHaveURL(/\/crm\/contacts\/[0-9a-f-]+$/);
  }

  /** Opens the first seeded Alert (skipping if none) and returns its title. */
  async function openAlert(alertsPage: AlertsPage): Promise<string> {
    const title = await alertsPage.openFirstAlertDetail();
    test.skip(title === null, 'No seeded Alerts in this environment.');
    return title!;
  }

  test('TC:1 Verify that selecting valid internal recipients correctly builds the body (including "Impact on SAITEX") and opens Outlook with pre-filled fields', async ({
    alertsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjby', 'TC:1 (ClickUp)');
    test.slow();

    const title = await openAlert(alertsPage);
    const alertBefore = await alertsPage.captureAlertDetailText();
    const officialSource = await alertsPage.locators.officialSourceLink.getAttribute('href');
    // Read before the modal opens — the open dialog hides the shell banner from the a11y tree.
    const userMenuText = await alertsPage.locators.userMenuButton.innerText();

    await test.step('Click Email Alert Internally', async () => {
      await alertsPage.openEmailInternallyDialog();
      await alertsPage.waitForRecipientsLoaded();
    });

    await test.step("From shows the logged-in user's name and email, read-only", async () => {
      const from = (await alertsPage.locators.emailFromValue.innerText()).trim();
      expect(from).toMatch(/^.+ <[^\s@<>]+@[^\s@<>]+>$/);
      const userName = from.replace(/ <.*$/, '');
      expect(userMenuText).toContain(userName);
      // Plain text, not a form control — nothing to type into.
      await expect(alertsPage.locators.emailDialog.getByRole('textbox')).toHaveCount(0);
      await expect(
        alertsPage.locators.emailDialog.getByRole('combobox', { name: 'From' }),
      ).toHaveCount(0);
      // Internal popup has no Cc.
      await expect(alertsPage.locators.customerCcCombobox).toHaveCount(0);
    });

    await test.step('Select two internal user email IDs in To', async () => {
      await alertsPage.selectRecipients('To', [INTERNAL_MANAGER, INTERNAL_EXECUTIVE]);
    });

    let preview = '';
    await test.step('Email Body preview has Title, Type, Region, dates, Regulations, Impact on SAITEX and Official Source', async () => {
      preview = await alertsPage.bodyPreviewText();
      expect(preview).toContain(`ALERT: ${title}`);
      for (const field of [...BODY_FIELDS_COMMON, 'Impact on SAITEX:'])
        expect(preview).toContain(field);
      if (officialSource) expect(preview).toContain(`Official Source: ${officialSource}`);
    });

    await test.step('Redirect to Outlook opens a compose tab with To, subject and body pre-filled', async () => {
      const compose = await alertsPage.redirectToOutlookAndCaptureCompose();
      expect(compose.to.sort()).toEqual([INTERNAL_EXECUTIVE, INTERNAL_MANAGER].sort());
      expect(compose.cc).toEqual([]);
      expect(compose.subject).toBe(`[SAITEX Alert] ${title}`);
      expect(compose.body).toBe(preview);
      expect(compose.body).toContain('Impact on SAITEX:');
    });

    await test.step('Popup closes with a "Redirected to Outlook" confirmation', async () => {
      await alertsPage.expectRedirectedConfirmation();
    });

    await test.step('The Alert record is unchanged', async () => {
      await alertsPage.expectAlertDetailUnchanged(alertBefore);
    });
  });

  test('TC:2 Verify redirection is blocked when no internal recipient is selected', async ({
    alertsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjbz', 'TC:2 (ClickUp)');

    await openAlert(alertsPage);
    await alertsPage.openEmailInternallyDialog();
    await alertsPage.waitForRecipientsLoaded();

    await test.step('Leave To empty and click Redirect to Outlook — no new tab opens', async () => {
      await alertsPage.expectNoNewTabDuring(() => alertsPage.attemptRedirectToOutlook());
    });

    await test.step('Inline "Select at least one user email ID" error; popup stays open', async () => {
      await expect(
        alertsPage.locators.emailDialog.getByText('Select at least one user email ID'),
      ).toBeVisible();
      await expect(alertsPage.locators.emailDialog).toBeVisible();
      await expect(alertsPage.locators.redirectedToOutlookToast).toBeHidden();
    });

    await alertsPage.closeEmailDialog();
  });

  test('TC:3 Verify Successful Redirection for Customer Email Alert (With Optional Cc)', async ({
    alertsPage,
    createCustomerPage,
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc0', 'TC:3 (ClickUp)');
    test.slow();

    const ts = Date.now();
    const customerName = `PW Email Alert TC3 ${ts}`;
    const customerEmail = `pw-email-alert-tc3-${ts}@example.com`;
    const contactEmail = `pw-email-alert-tc3-contact-${ts}@example.com`;
    await test.step('Setup: an active Customer with an email and a linked Contact', async () => {
      const customerId = await createCustomer(
        createCustomerPage,
        page,
        customerName,
        customerEmail,
      );
      await createLinkedContact(
        createContactPage,
        page,
        customerId,
        customerName,
        `PW EA Contact ${ts}`,
        contactEmail,
      );
    });

    const title = await openAlert(alertsPage);
    const alertBefore = await alertsPage.captureAlertDetailText();

    await test.step('Click Email Alert to Customer', async () => {
      await alertsPage.openEmailToCustomerDialog();
      await alertsPage.waitForRecipientsLoaded();
    });

    await test.step('Select the Customer and Contact emails in To and a CRM Manager in Cc', async () => {
      await alertsPage.selectRecipients('To', [customerEmail, contactEmail]);
      await alertsPage.selectRecipients('CC', [INTERNAL_MANAGER]);
    });

    let preview = '';
    await test.step('Preview has every Alert detail except "Impact on SAITEX"', async () => {
      preview = await alertsPage.bodyPreviewText();
      expect(preview).toContain(`ALERT: ${title}`);
      for (const field of BODY_FIELDS_COMMON) expect(preview).toContain(field);
      expect(preview).not.toContain('Impact on SAITEX');
    });

    await test.step('Outlook compose opens with To, Cc, subject and body populated', async () => {
      const compose = await alertsPage.redirectToOutlookAndCaptureCompose();
      expect(compose.to.sort()).toEqual([customerEmail, contactEmail].sort());
      expect(compose.cc).toEqual([INTERNAL_MANAGER]);
      expect(compose.subject).toBe(`[SAITEX Alert] ${title}`);
      expect(compose.body).toBe(preview);
    });

    await test.step('Popup closes with a "Redirected to Outlook" confirmation', async () => {
      await alertsPage.expectRedirectedConfirmation();
      await alertsPage.expectAlertDetailUnchanged(alertBefore);
    });
  });

  test('TC:4 Verify redirection is blocked when no customer recipient is selected', async ({
    alertsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc1', 'TC:4 (ClickUp)');

    await openAlert(alertsPage);
    await alertsPage.openEmailToCustomerDialog();
    await alertsPage.waitForRecipientsLoaded();

    await test.step('Leave To empty and click Redirect to Outlook — redirection is blocked', async () => {
      await alertsPage.expectNoNewTabDuring(() => alertsPage.attemptRedirectToOutlook());
      await expect(alertsPage.locators.emailDialog).toBeVisible();
      await expect(alertsPage.locators.redirectedToOutlookToast).toBeHidden();
    });

    // BUG (copy mismatch, confirmed on dev 2026-10-15): ClickUp TC:4 expects
    // "Select at least one email address" (the wording Key Meeting Notes'
    // "Notify the Customer" popup uses); the Alert Customer popup shows
    // "Select a Customer email ID" instead. Asserting the real text so the
    // block itself stays covered — flip once the copy is fixed.
    await test.step('BUG: inline error reads "Select a Customer email ID", not "Select at least one email address"', async () => {
      await expect(
        alertsPage.locators.emailDialog.getByText('Select a Customer email ID'),
      ).toBeVisible();
      await expect(
        alertsPage.locators.emailDialog.getByText('Select at least one email address'),
      ).toHaveCount(0);
    });

    await alertsPage.closeEmailDialog();
  });

  test('TC:5 Verify that customers and their contacts are properly grouped and formatted in the dropdown', async ({
    alertsPage,
    createCustomerPage,
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc2', 'TC:5 (ClickUp)');
    test.slow();

    const ts = Date.now();
    const customerName = `PW Email Alert TC5 ${ts}`;
    const customerEmail = `pw-email-alert-tc5-${ts}@example.com`;
    const contactName = `PW EA TC5 Contact ${ts}`;
    const contactEmail = `pw-email-alert-tc5-contact-${ts}@example.com`;
    await test.step('Setup: an active Customer with an email and a linked Contact', async () => {
      const customerId = await createCustomer(
        createCustomerPage,
        page,
        customerName,
        customerEmail,
      );
      await createLinkedContact(
        createContactPage,
        page,
        customerId,
        customerName,
        contactName,
        contactEmail,
      );
    });

    await openAlert(alertsPage);
    await alertsPage.openEmailToCustomerDialog();
    await alertsPage.waitForRecipientsLoaded();

    await test.step('Open the To dropdown and find the Customer', async () => {
      await alertsPage.openRecipientList('To');
      await alertsPage.searchRecipients(customerName);
      await expect(alertsPage.locators.recipientGroup(customerName)).toBeVisible();
    });

    await test.step("The Customer is a group header with its own email first, then its Contacts' name and email", async () => {
      await expect(
        alertsPage.locators.recipientGroup(customerName).getByText(customerName).first(),
      ).toBeVisible();
      await expect
        .poll(() => alertsPage.recipientGroupOptionNames(customerName))
        .toEqual([`${customerEmail} ${customerName}`, `${contactEmail} ${contactName}`]);
    });

    await alertsPage.closeRecipientList();
    await alertsPage.closeEmailDialog();
  });

  test('TC:6 Verify display behavior for active customers lacking an email address', async ({
    alertsPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc3', 'TC:6 (ClickUp)');
    test.slow();

    const customerName = `PW Email Alert NoEmail ${Date.now()}`;
    await test.step('Setup: an active Customer with no email and no Contacts', async () => {
      await createCustomer(createCustomerPage, page, customerName);
    });

    await openAlert(alertsPage);
    await alertsPage.openEmailToCustomerDialog();
    await alertsPage.waitForRecipientsLoaded();

    await test.step('Open the To dropdown and search for the Customer', async () => {
      await alertsPage.openRecipientList('To');
      await alertsPage.searchRecipients(customerName);
    });

    // BUG (confirmed on dev 2026-10-15): expected the Customer to be listed
    // with a disabled "No email on file" label. Instead it is left out of
    // the To list entirely (searching its exact name returns nothing, and
    // "No email on file" never appears) — so the user can't tell the
    // Customer exists but lacks an email. Not selectable either way.
    await test.step('BUG: the Customer is omitted from To instead of shown as "No email on file" (disabled)', async () => {
      const listbox = alertsPage.locators.recipientListbox('To');
      await expect(listbox).toBeVisible();
      // Give the filter time to settle before asserting absence.
      await expect(listbox.getByRole('option')).toHaveCount(0, { timeout: 10_000 });
      await expect(alertsPage.locators.recipientGroup(customerName)).toHaveCount(0);
      await expect(page.getByText('No email on file')).toHaveCount(0);
    });

    await alertsPage.closeRecipientList();
    await alertsPage.closeEmailDialog();
  });

  test('TC:7 Verify that inactive customers and inactive contacts are excluded from selection lists', async ({
    alertsPage,
    createCustomerPage,
    createContactPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc4', 'TC:7 (ClickUp)');
    test.slow();

    const ts = Date.now();
    const customerName = `PW Email Alert Inactive ${ts}`;
    const customerEmail = `pw-email-alert-inactive-${ts}@example.com`;
    const contactEmail = `pw-email-alert-inactive-contact-${ts}@example.com`;
    let customerId = '';
    await test.step('Setup: a Customer (with a linked Contact) of our own', async () => {
      customerId = await createCustomer(createCustomerPage, page, customerName, customerEmail);
      await createLinkedContact(
        createContactPage,
        page,
        customerId,
        customerName,
        `PW EA Inactive Contact ${ts}`,
        contactEmail,
      );
    });

    await openAlert(alertsPage);
    const alertUrl = page.url();

    await test.step('Precondition: while Active, the Customer and its Contact are offered in To', async () => {
      await alertsPage.openEmailToCustomerDialog();
      await alertsPage.waitForRecipientsLoaded();
      await alertsPage.openRecipientList('To');
      await alertsPage.searchRecipients(customerName);
      await expect(alertsPage.locators.recipientOption('To', customerEmail)).toBeVisible();
      await expect(alertsPage.locators.recipientOption('To', contactEmail)).toBeVisible();
      await alertsPage.closeRecipientList();
      await alertsPage.closeEmailDialog();
    });

    await test.step('Set the Customer to Inactive', async () => {
      await customerDetailPage.goto(`/crm/customers/${customerId}`);
      await customerDetailPage.deactivate(
        ['Business misalignment'],
        'Playwright: Email an Alert TC:7',
      );
      await customerDetailPage.expectStatus('Inactive');
    });

    await test.step('Re-open Email Alert to Customer and inspect the To dropdown', async () => {
      await alertsPage.openAlertByUrl(alertUrl);
      await alertsPage.openEmailToCustomerDialog();
      await alertsPage.waitForRecipientsLoaded();
      await alertsPage.openRecipientList('To');
      await alertsPage.searchRecipients(customerName);
    });

    // BUG (confirmed on dev 2026-10-15, after a full page reload): the
    // deactivated Customer's group — its own email AND its Contact — is
    // still offered in To. Expected: inactive Customers (and their
    // Contacts) are not listed.
    //
    // "Inactive Contact under an active Customer" can't be set up through
    // the UI: Contacts have no Activate/Deactivate control of their own,
    // and deactivating a Customer does not flip its Contacts' status (see
    // contacts-tab.page.ts). Only the inactive-Customer half is checked.
    await test.step('BUG: the inactive Customer and its Contact are still offered in To', async () => {
      await expect(alertsPage.locators.recipientGroup(customerName)).toBeVisible();
      await expect(alertsPage.locators.recipientOption('To', customerEmail)).toBeVisible();
      await expect(alertsPage.locators.recipientOption('To', contactEmail)).toBeVisible();
    });

    await alertsPage.closeRecipientList();
    await alertsPage.closeEmailDialog();
  });

  test('TC:8 Verify that an email address shared across multiple records appears only once in the selection list', async ({
    alertsPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc5', 'TC:8 (ClickUp)');
    test.slow();

    const ts = Date.now();
    const sharedEmail = `pw-email-alert-shared-${ts}@example.com`;
    await test.step('Setup: two Customers holding the exact same email address', async () => {
      await createCustomer(createCustomerPage, page, `PW Email Alert Shared A ${ts}`, sharedEmail);
      await createCustomer(createCustomerPage, page, `PW Email Alert Shared B ${ts}`, sharedEmail);
    });

    await openAlert(alertsPage);
    await alertsPage.openEmailToCustomerDialog();
    await alertsPage.waitForRecipientsLoaded();

    await test.step('Open the To list and look up the shared address', async () => {
      await alertsPage.openRecipientList('To');
      await alertsPage.searchRecipients(sharedEmail);
    });

    await test.step('The shared address appears only once', async () => {
      const option = alertsPage.locators.recipientOption('To', sharedEmail);
      await expect(option.first()).toBeVisible();
      await expect(option).toHaveCount(1);
    });

    await alertsPage.closeRecipientList();
    await alertsPage.closeEmailDialog();
  });

  test('TC:9 Verify that closing or cancelling the popup aborts the action without side effects', async ({
    alertsPage,
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyjc6', 'TC:9 (ClickUp)');
    test.slow();

    const ts = Date.now();
    const customerName = `PW Email Alert Cancel ${ts}`;
    const customerEmail = `pw-email-alert-cancel-${ts}@example.com`;
    let customerId = '';
    await test.step('Setup: a Customer of our own to address', async () => {
      customerId = await createCustomer(createCustomerPage, page, customerName, customerEmail);
    });

    await openAlert(alertsPage);
    const alertUrl = page.url();
    const alertBefore = await alertsPage.captureAlertDetailText();

    await test.step('Email Alert to Customer: select To and Cc, then Cancel — closes, no Outlook tab, no confirmation', async () => {
      await alertsPage.openEmailToCustomerDialog();
      await alertsPage.waitForRecipientsLoaded();
      await alertsPage.selectRecipients('To', [customerEmail]);
      await alertsPage.selectRecipients('CC', [INTERNAL_MANAGER]);
      await alertsPage.expectNoNewTabDuring(() => alertsPage.closeEmailDialog());
      await expect(alertsPage.locators.emailDialog).toBeHidden();
      await expect(alertsPage.locators.redirectedToOutlookToast).toBeHidden();
    });

    await test.step('Email Alert Internally: select To, then click outside the popup — closes, no Outlook tab', async () => {
      await alertsPage.openEmailInternallyDialog();
      await alertsPage.waitForRecipientsLoaded();
      await alertsPage.selectRecipients('To', [INTERNAL_MANAGER]);
      await alertsPage.expectNoNewTabDuring(() => alertsPage.clickOutsideEmailDialog());
      await expect(alertsPage.locators.emailDialog).toBeHidden();
      await expect(alertsPage.locators.redirectedToOutlookToast).toBeHidden();
    });

    await test.step('Re-opening starts clean — nothing was kept from the aborted attempt', async () => {
      await alertsPage.openEmailToCustomerDialog();
      await alertsPage.waitForRecipientsLoaded();
      await expect(alertsPage.locators.toCombobox).not.toContainText(customerEmail);
      await expect(alertsPage.locators.customerCcCombobox).not.toContainText(INTERNAL_MANAGER);
      await alertsPage.closeEmailDialog();
    });

    await test.step('Nothing was recorded: Alert unchanged, Customer has no logged communication', async () => {
      await alertsPage.expectAlertDetailUnchanged(alertBefore);
      await customerCommunicationPage.openFromCustomerDetail(customerId);
      expect(await customerCommunicationPage.subTabCount('logged')).toBe(0);
      await alertsPage.openAlertByUrl(alertUrl);
      await alertsPage.expectAlertDetailUnchanged(alertBefore);
    });
  });
});
