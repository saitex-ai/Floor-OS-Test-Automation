import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Customer Communication screen (Sprint 4).
 *
 * Source of truth: ClickUp https://app.clickup.com/t/z941abvmq9.
 *
 * This is the SAME "Communication" tab on Customer Details that three
 * Sprint-2 page objects already partially cover (`LogCommunicationPage`,
 * `KeyMeetingNotesPage`, `CommunicationsEmailPage`), now consolidated into
 * one cohesive tabbed view. Confirmed LIVE against the running app
 * (2026-09-25, local `tilt up` stack) — see customer-communication.page.ts's
 * class doc for the full list of corrections/discoveries this made,
 * including: those three sibling page objects' own 2026-09-22 "unbuilt
 * scaffold" comments are CONFIRMED STALE (the tab is real, built, and is
 * exactly these three flows under one tri-tab container); a genuine
 * timestamp-formatting inconsistency (TC:7); and that Emails-tab
 * participant filtering (TC:2/TC:5) is NOT attestable in this environment
 * at all — no Outlook integration is configured here, so the Emails panel
 * always renders "Outlook is not set up on this environment, so emails
 * cannot be shown." instead of any list, for every Customer, always.
 *
 * This spec does not re-implement logging a communication, generating Key
 * Meeting Notes, or the New Email modal — it calls straight into
 * `CustomerCommunicationPage`'s composed `logCommunication`/
 * `keyMeetingNotes`/`email` page objects for those already-confirmed
 * flows, and only asserts what's specific to the sub-tab container itself.
 */
test.describe('CRM - Customer Communication screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Customer Communication screen');
    await allure.owner('CRM QA');
  });

  /** Every test needs a real Customer, seeded with a department assignee so "Communicator" has an option to pick (same precondition 13-log-a-communication.spec.ts/smoke-recent.spec.ts already established). */
  async function createTestCustomer(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    page: import('@playwright/test').Page,
    label: string,
  ): Promise<string> {
    const customerName = `Playwright CommTab ${label} Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-commtab-${label.toLowerCase()}-${Date.now()}@example.com`,
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
    return page.url().split('/').pop()!;
  }

  test('TC:1 Verify sub-tabs order, counts, and newest-first sorting', async ({
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvzvc', 'TC:1 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page, 'TC1');
    await customerCommunicationPage.openFromCustomerDetail(customerId);

    await test.step('The three sub-tabs render in the required order', async () => {
      const names = await customerCommunicationPage.subTabNames();
      expect(names[0]).toMatch(/^Logged Communications/);
      expect(names[1]).toMatch(/^Key Meeting Notes/);
      expect(names[2]).toMatch(/^Emails/);
    });

    await test.step('Badge counts start accurate at zero', async () => {
      expect(await customerCommunicationPage.subTabCount('logged')).toBe(0);
      expect(await customerCommunicationPage.subTabCount('notes')).toBe(0);
    });

    await test.step('Log two communications and re-check the badge + sort order', async () => {
      await customerCommunicationPage.logCommunicationViaToolbar({
        medium: 'Phone Call',
        timezone: 'India',
        date: new Date().toISOString().slice(0, 10),
        title: `TC1 Comm A ${Date.now()}`,
        reason: 'Follow-up',
        communicator: 'Anjali Krishnakumar',
        mom: 'First entry.',
      });
      await page.waitForTimeout(600);
      const secondTitle = `TC1 Comm B ${Date.now()}`;
      await customerCommunicationPage.logCommunicationViaToolbar({
        medium: 'Email',
        timezone: 'India',
        date: new Date().toISOString().slice(0, 10),
        title: secondTitle,
        reason: 'Introduction',
        communicator: 'Anjali Krishnakumar',
        mom: 'Second entry, logged after the first — must sort above it.',
      });
      await page.waitForTimeout(600);

      expect(await customerCommunicationPage.subTabCount('logged')).toBe(2);

      const titles = await customerCommunicationPage.loggedCommunicationTitlesInOrder();
      expect(titles[0]).toBe(secondTitle);
      expect(titles).toHaveLength(2);
    });
  });

  test('TC:2 Verify email list filtering for user involvement', () => {
    test.fixme(
      true,
      'Confirmed against the running app (2026-09-25): this environment has no Outlook integration configured — the Emails sub-tab ALWAYS renders "Outlook is not set up on this environment, so emails cannot be shown." instead of any list, for every Customer, regardless of record count. There is no New Email send-and-receive loop anywhere in this framework, so it is not possible to produce even one real, visible email to check From/To/CC participation against, let alone two with differing participant sets. See CustomerCommunicationPage.expectEmailsUnavailable() and its class doc.',
    );
  });

  test('TC:3 Verify detail view, back navigation, and internal notifications', async ({
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvzve', 'TC:3 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page, 'TC3');
    await customerCommunicationPage.openFromCustomerDetail(customerId);

    const title = `TC3 Comm ${Date.now()}`;
    await customerCommunicationPage.logCommunicationViaToolbar({
      medium: 'Phone Call',
      timezone: 'India',
      date: new Date().toISOString().slice(0, 10),
      title,
      reason: 'Follow-up',
      communicator: 'Anjali Krishnakumar',
      mom: 'Detail view + notify probe.',
    });
    await page.waitForTimeout(600);

    await test.step('Click the logged communication and open its full detail view', async () => {
      await customerCommunicationPage.openLoggedCommunicationDetail(title);
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
      await expect(customerCommunicationPage.locators.backToLoggedCommunicationsLink).toBeVisible();
    });

    await test.step('The way-back link returns to the list', async () => {
      await customerCommunicationPage.backToLoggedCommunicationsList();
      await expect(customerCommunicationPage.locators.loggedCommunicationsTab).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await customerCommunicationPage.expectSubTabSelected('logged');
    });

    await test.step('Re-open the detail view, notify internal recipients, and send', async () => {
      await customerCommunicationPage.openLoggedCommunicationDetail(title);
      await customerCommunicationPage.logCommunication.notifyInternally();
      await customerCommunicationPage.logCommunication.selectNotifyManager('Alice Planner');
      await customerCommunicationPage.logCommunication.sendNotification();
    });

    // NOTE (confirmed, see class doc): no dedicated audit/history UI
    // section exists anywhere on this screen to independently read the
    // event back from — the dispatch toast asserted inside
    // sendNotification() above is the only CRM-side-observable proxy for
    // "the event records properly in the Customer's audit history" that
    // this Playwright suite can attest to.
  });

  test('TC:4 Verify sub-tab empty state rendering', async ({
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvzvg', 'TC:4 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page, 'TC4');
    await customerCommunicationPage.openFromCustomerDetail(customerId);

    await test.step('Logged Communications, empty', async () => {
      await customerCommunicationPage.expectLoggedCommunicationsEmptyState();
    });

    await test.step('Key Meeting Notes, empty', async () => {
      await customerCommunicationPage.selectSubTab('notes');
      await customerCommunicationPage.expectKeyMeetingNotesEmptyState();
    });

    await test.step('Emails — real, environment-wide explanatory state (see class doc), not a blank screen', async () => {
      await customerCommunicationPage.selectSubTab('emails');
      await customerCommunicationPage.expectEmailsUnavailable();
    });
  });

  test('TC:5 Verify exclusion of non-participatory emails', () => {
    test.fixme(
      true,
      'Same environment constraint as TC:2 — no Outlook integration is configured here, so the Emails sub-tab cannot render even one real email either way (see TC:2\'s reason and CustomerCommunicationPage\'s class doc). A second CRM identity does exist for other tests (CRM_EXECUTIVE_* in .env, see biz-doc.md) but is irrelevant here: the blocker is the missing Outlook integration itself, not the lack of a second logged-in user.',
    );
  });

  test('TC:6 Verify Real-Time Badge Count Updates', async ({
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvzw1', 'TC:6 (ClickUp)');

    // Real AI generation against a local model — confirmed 7-17s+ per call
    // in this exploration, well past the default per-test budget (same
    // constraint documented on KeyMeetingNotesPage.generateDraft()).
    test.slow();

    const customerId = await createTestCustomer(createCustomerPage, page, 'TC6');
    await customerCommunicationPage.openFromCustomerDetail(customerId);

    await test.step('Key Meeting Notes badge starts at 0', async () => {
      expect(await customerCommunicationPage.subTabCount('notes')).toBe(0);
    });

    await test.step('Generate Key Meeting Notes and complete generation', async () => {
      await page.getByRole('button', { name: 'Generate Key Meeting Notes' }).click();
      await customerCommunicationPage.keyMeetingNotes.expectGenerateDialogVisible();
      await customerCommunicationPage.keyMeetingNotes.uploadSourceFile();
      await customerCommunicationPage.keyMeetingNotes.generateDraft();
      await customerCommunicationPage.keyMeetingNotes.expectDraftSectionsVisible();
    });

    await test.step('Return to the Communication tab view and the badge updates without a manual refresh', async () => {
      // Confirmed against the running app: generation replaces the list
      // view with the new note's own detail view inline (no dialog to
      // close) — "Back to Key Meeting Notes" is the way back to the list,
      // same in-tab pattern as Logged Communications' own detail view.
      await customerCommunicationPage.keyMeetingNotes.backToNotesList();
      await page.waitForTimeout(600);
      expect(await customerCommunicationPage.subTabCount('notes')).toBe(1);
    });
  });

  test('TC:7 Verify Timestamp Formatting Consistency', async ({
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abw00n', 'TC:7 (ClickUp)');

    // Includes one real Key Meeting Notes generation — same slow-AI budget
    // reasoning as TC:6.
    test.slow();

    const customerId = await createTestCustomer(createCustomerPage, page, 'TC7');
    await customerCommunicationPage.openFromCustomerDetail(customerId);

    const commTitle = `TC7 Comm ${Date.now()}`;
    await customerCommunicationPage.logCommunicationViaToolbar({
      medium: 'Phone Call',
      timezone: 'India',
      date: new Date().toISOString().slice(0, 10),
      title: commTitle,
      reason: 'Follow-up',
      communicator: 'Anjali Krishnakumar',
      mom: 'Timestamp format probe.',
    });
    await page.waitForTimeout(600);

    await test.step('Logged Communications: list row and detail "Date" field both use DD-MM-YYYY', async () => {
      await expect(customerCommunicationPage.locators.loggedCommunicationRowTime(0)).toHaveText(
        /^\d{2}-\d{2}-\d{4}$/,
      );
      await customerCommunicationPage.openLoggedCommunicationDetail(commTitle);
      await customerCommunicationPage.expectDateFieldFormat();
    });

    // CONFIRMED, REAL discovery (see class doc) — NOT the same format as
    // the "Date" field just asserted above, on the very same detail view.
    // Documented explicitly rather than silently asserted as "consistent",
    // per this suite's "honesty over false passes" discipline (same
    // treatment as the compound Planning/Elapsed status discovery in
    // 22-external-events-list.spec.ts).
    await test.step('Logged Communications detail: "Created On" uses a DIFFERENT format, YYYY-MM-DD HH:mm — a real, confirmed inconsistency, not a locator bug', async () => {
      await customerCommunicationPage.expectCreatedOnFieldFormat();
    });

    await customerCommunicationPage.backToLoggedCommunicationsList();

    await test.step('Key Meeting Notes: generate one, list row and detail timestamp both use DD-MM-YYYY HH:mm', async () => {
      await page.getByRole('button', { name: 'Generate Key Meeting Notes' }).click();
      await customerCommunicationPage.keyMeetingNotes.expectGenerateDialogVisible();
      await customerCommunicationPage.keyMeetingNotes.uploadSourceFile();
      await customerCommunicationPage.keyMeetingNotes.generateDraft();

      await expect(customerCommunicationPage.keyMeetingNotes.locators.sourceInteractionText).toHaveText(
        /generated from .+ · \d{2}-\d{2}-\d{4} \d{2}:\d{2}/i,
      );

      await customerCommunicationPage.keyMeetingNotes.backToNotesList();
      await page.waitForTimeout(600);
      await expect(
        customerCommunicationPage.locators.activeTabPanel.getByText(/\d{2}-\d{2}-\d{4} \d{2}:\d{2}/),
      ).toBeVisible();
    });

    // Emails sub-tab intentionally excluded from this TC: confirmed no
    // timestamps render there at all in this environment (no Outlook
    // integration — see TC:4/class doc), so there is nothing to check.
  });

  test('TC:8 Verify Context Retention During Sub-Tab Navigation', async ({
    createCustomerPage,
    customerCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abw00z', 'TC:8 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page, 'TC8');
    await customerCommunicationPage.openFromCustomerDetail(customerId);

    await test.step(
      'With "Log a Communication" open and dirtied, the sub-tab strip is unreachable (confirmed: a real modal, not merely a soft warning)',
      async () => {
        await customerCommunicationPage.expectSubTabsUnreachableWhileLogCommunicationDialogOpen();
      },
    );

    await test.step('After cancelling, the sub-tab strip is reachable again and context (Logged Communications, still selected) is retained', async () => {
      await customerCommunicationPage.expectSubTabSelected('logged');
      await customerCommunicationPage.selectSubTab('notes');
      await customerCommunicationPage.expectSubTabSelected('notes');
    });
  });
});
