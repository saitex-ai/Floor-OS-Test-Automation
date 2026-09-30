import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — View Logged Communications (Sprint 2).
 *
 * Source of truth: test-cases/crm/view-logged-communications.md (ClickUp
 * QA parent https://app.clickup.com/t/z941abtahf, User Story
 * https://app.clickup.com/t/86eye4dte). NOT yet confirmed against a
 * running app — locators and interactions in communications-email.page.ts
 * are a best guess from the ClickUp text (see the note there).
 *
 * IMPORTANT — Outlook-redirect boundary: TC-2, TC-4, and TC-6 all end with
 * "redirects to Outlook", an external application entirely outside this
 * framework's (and floorOS's) control. Nothing about Outlook's own UI is
 * asserted anywhere in this file. What's asserted instead is the
 * CRM-side-observable proxy: that a new browser tab was opened (via
 * `page.context().waitForEvent('page')`, wrapped in
 * communicationsEmailPage's `*AwaitOutlookRedirect()` methods) — see the
 * TODOs on those methods and the "Outlook-redirect limitation" note in the
 * .md file if that proxy turns out to be wrong once run live.
 *
 * TC-3/TC-4/TC-5/TC-6 are marked `skip` in ClickUp and are `test.skip()`'d
 * here accordingly, not written out as full assertions.
 */
test.describe('CRM - View Logged Communications', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('View Logged Communications');
    await allure.owner('CRM QA');
  });

  /** Every test needs a real Customer to view/send communications against. */
  async function createTestCustomer(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    page: import('@playwright/test').Page,
  ): Promise<{ customerId: string; customerEmail: string }> {
    const customerName = `Playwright View-Comm Customer ${Date.now()}`;
    const customerEmail = `pw-view-comm-${Date.now()}@example.com`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: customerEmail,
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
    return { customerId: page.url().split('/').pop()!, customerEmail };
  }

  test('TC-1 Verify "New Email" button display and modal invocation', async ({
    createCustomerPage,
    communicationsEmailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtahm', 'TC-1 (ClickUp)');

    const { customerId } = await createTestCustomer(createCustomerPage, page);

    await test.step('Open Customer Details and locate "New Email"', async () => {
      await communicationsEmailPage.openFromCustomerDetail(customerId);
      await communicationsEmailPage.expectNewEmailButtonVisible();
    });

    // CRM-side-observable only: the button invokes a modal. Nothing about
    // Outlook is touched by this test at all.
    await test.step('Clicking "New Email" invokes the modal', async () => {
      await communicationsEmailPage.openNewEmailModal();
      await communicationsEmailPage.expectNewEmailModalVisible();
    });
  });

  test('TC-2 Verify pre-population of recipient fields and redirection to Outlook', async ({
    createCustomerPage,
    communicationsEmailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtahn', 'TC-2 (ClickUp)');

    const { customerId, customerEmail } = await createTestCustomer(createCustomerPage, page);
    await communicationsEmailPage.openFromCustomerDetail(customerId);
    await communicationsEmailPage.openNewEmailModal();

    // CRM-side-observable: the draft preview's From/To are CRM-rendered
    // state (FR-2.3), not Outlook's. From is the logged-in CRM user
    // (confirmed against the running app — see communications-email.locators.ts),
    // not a fixed address; To is this Customer's own seeded email.
    await test.step('From/To are pre-populated per FR-2.3', async () => {
      await communicationsEmailPage.expectRecipientsPrepopulated({
        from: /alice@flooros\.dev/i,
        to: customerEmail,
      });
    });

    // Un-attestable boundary: everything past this point happens inside
    // Outlook, which this framework cannot see or assert on. The only
    // thing checked is the CRM-side proxy — that a new tab was opened.
    await test.step('Confirming the draft redirects to Outlook (new-tab proxy)', async () => {
      const outlookTab = await communicationsEmailPage.confirmAndAwaitOutlookRedirect();
      // TODO(CRM QA): unconfirmed whether the handoff truly opens a new
      // tab — see confirmAndAwaitOutlookRedirect()'s doc comment. Rework
      // this assertion once the real mechanism is observed live.
      expect(
        outlookTab,
        'expected a new browser tab/window to open for the Outlook handoff',
      ).not.toBeNull();
    });
  });

  test('TC-3 Verify display and chronological sorting under Emails tab', async () => {
    await allure.tms('https://app.clickup.com/t/z941abtahp', 'TC-3 (ClickUp)');
    test.skip(true, 'Marked skip in ClickUp');
  });

  test('TC-4 Verify email list item redirection to Outlook', async () => {
    await allure.tms('https://app.clickup.com/t/z941abtahq', 'TC-4 (ClickUp)');
    test.skip(true, 'Marked skip in ClickUp');
  });

  test('TC-5 Verify system notification display upon receiving an incoming email', async () => {
    await allure.tms('https://app.clickup.com/t/z941abtahr', 'TC-5 (ClickUp)');
    test.skip(true, 'Marked skip in ClickUp');
  });

  test('TC-6 Verify notification click redirection to Outlook', async () => {
    await allure.tms('https://app.clickup.com/t/z941abtaht', 'TC-6 (ClickUp)');
    test.skip(true, 'Marked skip in ClickUp');
  });

  test('TC-7 Verify Cancel action on New Email modal', async ({
    createCustomerPage,
    communicationsEmailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtahu', 'TC-7 (ClickUp)');

    const { customerId } = await createTestCustomer(createCustomerPage, page);
    await communicationsEmailPage.openFromCustomerDetail(customerId);

    await test.step('Open the New Email modal', async () => {
      await communicationsEmailPage.openNewEmailModal();
      await communicationsEmailPage.expectNewEmailModalVisible();
    });

    // CRM-side-observable only: Cancel is a purely CRM-side action — no
    // Outlook handoff should occur at all, so there's nothing un-attestable
    // to worry about in this particular test.
    await test.step('Click Cancel instead of confirming', async () => {
      await communicationsEmailPage.cancelNewEmail();
    });

    await test.step('Modal closes with no Outlook handoff attempted', async () => {
      await communicationsEmailPage.expectNewEmailModalClosed();
    });
  });
});
