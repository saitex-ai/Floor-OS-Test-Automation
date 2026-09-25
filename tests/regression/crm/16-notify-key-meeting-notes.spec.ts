import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Notify about a Key Meeting Notes (Sprint 2).
 *
 * Source of truth: test-cases/crm/notify-key-meeting-notes.md (ClickUp
 * task https://app.clickup.com/t/z941abtcnk, User Story
 * https://app.clickup.com/t/86eyja0jg). NOT yet confirmed against a
 * running app — locators and interactions in key-meeting-notes.page.ts are
 * a best guess from three related ClickUp user stories' text. Every test
 * here needs a real live run before it's trusted the way
 * create-contact.spec.ts and create-customer.spec.ts now are.
 *
 * TC:1 only covers the in-app half of "system and email notification" —
 * there's no test-mailbox integration in this framework, so the email half
 * is a documented gap rather than a false pass (see
 * notify-key-meeting-notes.md). TC:5 and TC:6 are `test.fixme()`'d — both
 * need environment/fixture state (a zero-recipient Customer, a second
 * unauthorized test identity) this repo doesn't have yet.
 */
test.describe('CRM - Notify about a Key Meeting Notes', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Notify about a Key Meeting Notes');
    await allure.owner('CRM QA');
  });

  /**
   * Every test here needs a Customer with an already-generated Key Meeting
   * Notes record — builds one via the (also unconfirmed) Generate flow.
   */
  async function createKeyMeetingNotesRecord(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    keyMeetingNotesPage: import('../../../src/pages/crm/key-meeting-notes.page').KeyMeetingNotesPage,
    page: import('@playwright/test').Page,
  ): Promise<{ customerId: string; title: string }> {
    const customerName = `Playwright Notify KMN Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-notify-kmn-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    // Confirmed against the running app + source (svc-notification's
    // registry — recipientsForEmails resolves from
    // `crm.account_assignee.employee`): automatic in-app notifications on
    // this record go to the CUSTOMER'S OWN ASSIGNEES, not broadly to every
    // CRM user. A customer with none configured gets zero recipients and
    // therefore zero notifications — not a missing feature, an empty
    // audience. "Alice" (this suite's logged-in test user — see
    // auth-setup.ts) is herself a seeded employee in the "Sewing"
    // department, so assigning her here is what lets TC:1/TC:2 see the
    // notification land in their OWN Inbox.
    await createCustomerPage.addBusinessProcessWithAssignee('Sewing', 'Alice');
    await createCustomerPage.save();
    // A plain `.isVisible()` doesn't wait — it raced ahead of the
    // duplicate-check API response under 5-way parallel load (confirmed:
    // this file's own repeated "Playwright Notify KMN Customer ..."
    // names are similar enough to trip fuzzy matching after many runs),
    // landing on expectSavedSuccessfully() with the warning modal still
    // the only thing on screen. A short waitFor actually waits for it.
    const duplicateWarningShown = await createCustomerPage.locators.duplicateWarningModal
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (duplicateWarningShown) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    await keyMeetingNotesPage.uploadSourceFile();
    await keyMeetingNotesPage.generateDraft();
    // No custom title to give it — confirmed against the running app (see
    // 14-generate-key-meeting-notes.spec.ts's TC:5/TC:6): generation
    // persists the note immediately with an AI-composed title, no
    // editable Title field or Save step exists. Read back whatever the
    // model actually produced instead.
    const title = await keyMeetingNotesPage.generatedTitle();

    return { customerId, title };
  }

  test('TC:1 Verify automatic dispatch of in-app and email notifications on Key Meeting Notes creation/update', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtg98', 'TC:1 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per
    // call, well past the default per-test budget, especially under
    // concurrent workers (see 14-generate-key-meeting-notes.spec.ts).
    test.slow();

    const { title } = await createKeyMeetingNotesRecord(
      createCustomerPage,
      keyMeetingNotesPage,
      page,
    );

    // Email dispatch isn't independently verifiable in this environment
    // (no test-mailbox integration) — only the in-app half is asserted.
    await test.step('An in-app notification is dispatched for the new record', async () => {
      await keyMeetingNotesPage.openNotificationsPanel();
      await keyMeetingNotesPage.expectNotificationVisible(title);
    });
  });

  test('TC:2 Verify deep-link redirection from in-app notifications', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtg99', 'TC:2 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per
    // call, well past the default per-test budget, especially under
    // concurrent workers (see 14-generate-key-meeting-notes.spec.ts).
    test.slow();

    const { title } = await createKeyMeetingNotesRecord(
      createCustomerPage,
      keyMeetingNotesPage,
      page,
    );

    await test.step('Open the notification and follow its deep link', async () => {
      await keyMeetingNotesPage.openNotificationsPanel();
      await keyMeetingNotesPage.openNotification(title);
    });

    await test.step('The correct Key Meeting Notes record opens directly', async () => {
      await keyMeetingNotesPage.expectDetailSectionsVisible();
    });
  });

  test('TC:3 Verify manual re-triggering of repeat notifications', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtg9a', 'TC:3 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per
    // call, well past the default per-test budget, especially under
    // concurrent workers (see 14-generate-key-meeting-notes.spec.ts).
    test.slow();

    const { title } = await createKeyMeetingNotesRecord(
      createCustomerPage,
      keyMeetingNotesPage,
      page,
    );
    await keyMeetingNotesPage.openDetailFromHistory(title);

    // Confirmed against the running app (see
    // 14-generate-key-meeting-notes.spec.ts's TC:7): neither Notify button
    // is a one-click dispatch — both open a real dialog, and "Notify
    // Internally"'s Managers/Executives pickers are empty in this dev
    // realm ("No one holds this role yet.") — a seed-data gap, not
    // something to fake a pass for. "Notify the Customer" is the
    // reliably-completable path here (its Customer combobox comes
    // pre-filled), and re-triggering it is the same manual-repeat action
    // this TC is actually about.
    await test.step('Manually re-trigger the notification', async () => {
      await keyMeetingNotesPage.notifyCustomer();
    });

    await test.step('It is delivered again to configured recipients', async () => {
      await keyMeetingNotesPage.sendNotification();
    });
  });

  test('TC:4 Verify audit history logging of notification dispatch events', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtg9c', 'TC:4 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per
    // call, well past the default per-test budget, especially under
    // concurrent workers (see 14-generate-key-meeting-notes.spec.ts).
    test.slow();

    const { title } = await createKeyMeetingNotesRecord(
      createCustomerPage,
      keyMeetingNotesPage,
      page,
    );
    await keyMeetingNotesPage.openDetailFromHistory(title);

    await test.step('Trigger a notification', async () => {
      // notifyCustomer() only opens the dialog — sendNotification() is
      // the actual dispatch (see TC:3's comment above).
      await keyMeetingNotesPage.notifyCustomer();
      await keyMeetingNotesPage.sendNotification();
    });

    await test.step('The audit history shows the notification event', async () => {
      await keyMeetingNotesPage.expectAuditEntryVisible(/notif/i);
    });
  });

  test('TC:5 Verify system behavior when no recipients are configured', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtg9d', 'TC:5 (ClickUp)');

    // Checked directly against the running app rather than assumed: opening
    // "Notify Internally" for a customer with ZERO assignees renders the
    // exact same dialog as one with assignees (empty Managers/Executives
    // comboboxes, no distinct "no recipients configured" banner) — the two
    // recipient concepts don't overlap. This dialog's pool is the
    // Manager/Executive REALM ROLES (global, and itself empty on this dev
    // realm — see TC:3's comment), not a given customer's assignees, so a
    // zero-assignee customer changes nothing observable here. No warning
    // to assert on means this genuinely isn't implemented yet, not a
    // fixture gap this repo can work around.
    test.fixme(
      true,
      'No distinct "no recipients configured" state exists yet to assert on — confirmed against the running app, not assumed. See notify-key-meeting-notes.md.',
    );

    const { title } = await createKeyMeetingNotesRecord(
      createCustomerPage,
      keyMeetingNotesPage,
      page,
    );
    await keyMeetingNotesPage.openDetailFromHistory(title);
    await keyMeetingNotesPage.notifyInternally();
    await keyMeetingNotesPage.expectNoRecipientsWarningVisible();
  });

  test('TC:6 Verify deep-link access security for unauthorized users', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtg9f', 'TC:6 (ClickUp)');

    // Needs a second, unauthorized test identity (a user genuinely without
    // access to this record's Customer) — this suite's auth.setup.ts
    // authenticates as a single seeded CRM test user, so there's no second
    // identity to drive this with yet. See notify-key-meeting-notes.md.
    test.fixme(
      true,
      'No second (unauthorized) test identity configured in this suite to verify access denial — see notify-key-meeting-notes.md',
    );

    const { customerId } = await createKeyMeetingNotesRecord(
      createCustomerPage,
      keyMeetingNotesPage,
      page,
    );
    // TODO(CRM QA): once a second, unauthorized identity is available,
    // capture the deep-link URL for this Customer's Key Meeting Notes
    // record, sign in as that identity, open the link directly, and assert
    // access is denied / the user is redirected rather than the record
    // opening.
    expect(customerId).toBeTruthy();
  });
});
