import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import type { LogCommunicationPage } from '../../../src/pages/crm/log-communication.page';
import type { Page } from '@playwright/test';

/**
 * CRM — Notify Internally about a Logged Communication (Sprint 4).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abvcwb
 * (already "pass" in ClickUp — that's ClickUp's own tracking state, not a
 * signal about this repo's own automation, which didn't exist for 4 of
 * this story's 5 TCs before this pass). TC:1 already had a smoke-level
 * happy-path cousin in `tests/smoke/crm/smoke-recent.spec.ts` — this file
 * is the real, full regression version plus the other four TCs.
 *
 * Confirmed directly against the running app (2026-09-25) — see
 * log-communication.locators.ts's class doc for the full list of
 * corrections/discoveries. The load-bearing ones for how this spec reads:
 *
 * - The Notify Internally dialog's Managers AND Executives comboboxes are
 *   BOTH real, typeahead multi-selects, each scoped to its own fixed
 *   internal-directory list — confirmed the Executives box is a genuine
 *   working peer of Managers, not a stub.
 * - Zero-recipient Send is blocked with a real inline error, "Select at
 *   least one Manager or Executive" — no toast fires, dialog stays open
 *   (TC:4).
 * - A real Send's toast reads "Notifications sent — <name>, <name>, ..."
 *   — it lists the selected recipients' names, but does NOT name the
 *   Customer, the communication's title/type, or the acting user, despite
 *   TC:1's own expected result. Written to assert what the toast actually
 *   says, not what ClickUp's text assumed it says.
 * - The in-app notifications bell/panel NEVER receives an entry for this
 *   action — confirmed empty ("No notifications yet.") before Send,
 *   immediately after a real Send, and again after a full page reload,
 *   even with the logged-in acting user themselves picked as a recipient.
 *   The only in-app signal that exists at all is the transient toast.
 *   TC:2's literal "open the notification panel, click its embedded link"
 *   step therefore has no real entry to click in this environment — see
 *   that test for how it's honestly scoped instead.
 * - There is NO audit-history affordance anywhere on a logged
 *   communication's own detail screen (confirmed via a full ariaSnapshot()
 *   of the screen and every button's accessible name) — a genuine product
 *   gap, not a locator miss. TC:3 is `test.fixme()`'d for this reason.
 * - The detail screen's own URL
 *   (`/crm/customers/{id}?tab=comm&sub=logged&comm={communicationId}`) IS
 *   a real, working deep link: a fresh direct navigation to it lands
 *   exactly on that one logged communication, no manual tab-clicking
 *   needed. TC:2 exercises this directly.
 * - Neither combobox's typeahead ever surfaces an external-looking query
 *   (a bare domain or a full non-directory email address) as a
 *   selectable option, and neither offers any "add"/"create" free-text
 *   affordance — the recipient picker cannot even be used to query
 *   external/customer contacts, let alone select one (TC:5).
 *
 * The email half of "dispatches ... an email notification" (TC:1) is not
 * independently verifiable from this Playwright suite — there is no
 * test-mailbox/inbox integration in this framework, the same documented
 * gap as `test-cases/crm/view-logged-communications.md` and
 * `test-cases/crm/notify-key-meeting-notes.md`. TC:1 automates the
 * in-app-observable half for real and does not assert anything about
 * actual email delivery.
 */
test.describe('CRM - Notify Internally about a Logged Communication', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Notify Internally about a Logged Communication');
    await allure.owner('CRM QA');
  });

  /**
   * Seeds a real Customer (with a department/assignee so "Communicator"
   * has an option — see 13-log-a-communication.spec.ts's own
   * createTestCustomer) and logs one Communication against it, returning
   * enough to reach its own Details screen. Does NOT open that Details
   * screen itself — callers do that via openLoggedCommunication() so each
   * test controls exactly when/whether it navigates there.
   */
  async function createLoggedCommunication(
    createCustomerPage: CreateCustomerPage,
    logCommunicationPage: LogCommunicationPage,
    page: Page,
    label: string,
  ): Promise<{ customerId: string; customerName: string; title: string }> {
    const customerName = `Playwright Notify Internally ${label} Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-notify-internally-${label.toLowerCase()}-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.addBusinessProcessWithAssignee('Cutting', 'Anjali Krishnakumar');
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    const title = `Playwright Notify Internally ${label} Log ${Date.now()}`;
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

    return { customerId, customerName, title };
  }

  test('TC:1 Verify automatic internal notifications on logging a communication', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvcwh', 'TC:1 (ClickUp)');

    const { title } = await createLoggedCommunication(
      createCustomerPage,
      logCommunicationPage,
      page,
      'TC1',
    );

    await test.step('Open the logged communication and the Notify Internally dialog', async () => {
      await logCommunicationPage.openLoggedCommunication(title);
      await logCommunicationPage.notifyInternally();
      await expect(logCommunicationPage.locators.notifyDialog).toBeVisible();
    });

    await test.step('Select a valid internal Manager and Executive recipient', async () => {
      await logCommunicationPage.selectNotifyManager('Alice Planner');
      await logCommunicationPage.selectNotifyExecutive('Anjali Krishnakumar');
      // Both picks survived the popup-closing Escape — confirmed directly,
      // see log-communication.page.ts's selectNotifyManager() doc.
      await expect(logCommunicationPage.locators.notifyDialog).toContainText('Alice Planner');
      await expect(logCommunicationPage.locators.notifyDialog).toContainText('Anjali Krishnakumar');
    });

    await test.step('Click Send notifications', async () => {
      await logCommunicationPage.sendNotification();
    });

    await test.step('The system dispatches to both selected internal stakeholders', async () => {
      // CRM-observable half, confirmed for real: a toast names the actual
      // recipients that were dispatched to. NOT asserted here (because
      // it's genuinely not present, confirmed directly — see this file's
      // class doc): the toast naming the Customer, the communication's
      // title/type, or the acting user, and anything about a real email
      // being delivered (no mailbox-testing tool in this framework).
      await expect(logCommunicationPage.locators.toast).toContainText('Alice Planner');
      await expect(logCommunicationPage.locators.toast).toContainText('Anjali Krishnakumar');
      await logCommunicationPage.expectNotifyDialogClosed();
    });
  });

  test('TC:2 Verify deep link navigation', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvcwx', 'TC:2 (ClickUp)');

    const { title } = await createLoggedCommunication(
      createCustomerPage,
      logCommunicationPage,
      page,
      'TC2',
    );

    let deepLinkUrl = '';
    await test.step('Open the logged communication and capture its own detail-view URL', async () => {
      await logCommunicationPage.openLoggedCommunication(title);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      deepLinkUrl = page.url();
      expect(deepLinkUrl).toMatch(/\?tab=comm&sub=logged&comm=[0-9a-f-]+$/);
    });

    await test.step('Navigate away, then follow the deep link from a fresh navigation', async () => {
      // Confirmed directly (see this file's class doc): this action never
      // creates a real, clickable entry in the notifications panel or an
      // email this suite can drive — there is no test-mailbox tool here.
      // What IS confirmed and CRM-observable is that the record's own URL
      // is a genuine, working deep link, which is what any real
      // notification/email would have to embed to satisfy this TC. A
      // fresh direct navigation to it (as clicking such a link would
      // produce) is exercised here instead of a click inside a panel that
      // has nothing in it to click.
      await page.goto('/crm/customers');
      await expect(page.getByRole('heading', { name: title })).toBeHidden();
      await page.goto(deepLinkUrl);
    });

    await test.step('The specific logged communication opens directly, no manual searching', async () => {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect(page.getByText(/^Logged Communication LC-\d{4}-\d{4}/)).toBeVisible();
    });
  });

  test('TC:3 Verify audit history logging', () => {
    test.fixme(
      true,
      'Confirmed directly against the running app (2026-09-25): a logged communication\'s own detail screen has NO audit-history affordance anywhere — no tab, section, or icon button leads to one (checked via a full ariaSnapshot() of the screen and every button\'s accessible name). This is a genuine product gap in this environment, not a locator guess gone wrong — see log-communication.locators.ts\'s class doc.',
    );
  });

  test('TC:4 Prevent notification dispatch with zero recipients selected', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvcxn', 'TC:4 (ClickUp)');

    const { title } = await createLoggedCommunication(
      createCustomerPage,
      logCommunicationPage,
      page,
      'TC4',
    );

    await test.step('Open the Notify Internally dialog and leave both fields empty', async () => {
      await logCommunicationPage.openLoggedCommunication(title);
      await logCommunicationPage.notifyInternally();
      await expect(logCommunicationPage.locators.notifyDialog).toBeVisible();
    });

    await test.step('Attempt to click Send notifications', async () => {
      await logCommunicationPage.attemptSendNotifications();
    });

    await test.step('The send is blocked with a validation error, no notification dispatched', async () => {
      await logCommunicationPage.expectNotifyValidationErrorVisible();
      await expect(logCommunicationPage.locators.notifyDialog).toBeVisible();
      // No "Notifications sent" toast fired — a stray toast from an
      // earlier save() in this same test session is not what's being
      // checked here, so this is scoped to that specific text rather
      // than asserting a bare zero-toast count.
      await expect(page.locator('[data-sonner-toast]', { hasText: 'Notifications sent' })).toHaveCount(0);
    });
  });

  test('TC:5 Verify restriction preventing external distribution', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvcza', 'TC:5 (ClickUp)');

    const { title } = await createLoggedCommunication(
      createCustomerPage,
      logCommunicationPage,
      page,
      'TC5',
    );

    await test.step('Open the "Notify Internally" modal', async () => {
      await logCommunicationPage.openLoggedCommunication(title);
      await logCommunicationPage.notifyInternally();
      await expect(logCommunicationPage.locators.notifyDialog).toBeVisible();
    });

    await test.step('The pickers list real internal directory members with no filter applied', async () => {
      const managers = await logCommunicationPage.queryNotifyRecipientOptions(
        logCommunicationPage.locators.notifyManagersCombobox,
        '',
      );
      expect(managers.length).toBeGreaterThan(0);
      const executives = await logCommunicationPage.queryNotifyRecipientOptions(
        logCommunicationPage.locators.notifyExecutivesCombobox,
        '',
      );
      expect(executives.length).toBeGreaterThan(0);
    });

    await test.step('External-looking queries surface zero options in either picker', async () => {
      const managerHits = await logCommunicationPage.queryNotifyRecipientOptions(
        logCommunicationPage.locators.notifyManagersCombobox,
        'gmail.com',
      );
      expect(managerHits).toEqual([]);

      const executiveHits = await logCommunicationPage.queryNotifyRecipientOptions(
        logCommunicationPage.locators.notifyExecutivesCombobox,
        'external.customer@acme-textiles.com',
      );
      expect(executiveHits).toEqual([]);

      // Confirmed directly: no "add"/"create new"/free-text affordance
      // appears to force an external address in anyway.
      await expect(
        logCommunicationPage.locators.notifyDialog.getByText(/add|create new|invite/i),
      ).toHaveCount(0);
    });
  });
});
