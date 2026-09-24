import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Qualified Lead -> Prospect (Sprint 2).
 *
 * Source of truth: test-cases/crm/qualified-lead-to-prospect.md (ClickUp
 * QA parent https://app.clickup.com/t/z941abtajf, User Story
 * https://app.clickup.com/t/86eye4dtg). NOT yet confirmed against a
 * running app — locators and interactions in
 * qualified-lead-to-prospect.page.ts are a best guess from the ClickUp
 * text (see the note there).
 *
 * Unusual among CRM stories: the *trigger* — creating the first-ever
 * Sample Request for a Qualified Lead — happens in Floor OS's Sample
 * Request module, not CRM. This framework has one QA own one module end
 * to end (see ONBOARDING.md), so there's no Sample-Request-creation page
 * object available here and none wired into crm.fixtures.ts. TC:1, TC:2,
 * TC:5, and TC:6 all genuinely need that trigger to assert anything real,
 * so each is written as best-effort CRM-side automation (seeding a
 * Customer at the relevant CRM Stage via CreateCustomerPage and checking
 * what CRM alone can observe) but marked `test.fixme()` with the
 * cross-module gap spelled out — the same honesty pattern used for TC:10
 * in 11-create-contact.spec.ts, rather than forced to a false pass. TC:3
 * is written as a real, non-fixme test, but only partially covers its own
 * ClickUp text for the same reason — see the class doc on
 * QualifiedLeadToProspectPage and the Notes section of
 * qualified-lead-to-prospect.md for the full explanation. TC:4 is marked
 * `test.skip()` because it's already marked skip in ClickUp — a distinct,
 * deliberate product decision, not a framework limitation.
 */
test.describe('CRM - Qualified Lead -> Prospect', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Qualified Lead -> Prospect');
    await allure.owner('CRM QA');
  });

  /**
   * Seeds a real Customer at the given CRM Stage. Standin for the state a
   * real Qualified Lead -> Prospect conversion would leave a record in
   * (or its pre-conversion starting state), since this module has no way
   * to trigger a real conversion itself. `crmStage` values ('Qualified
   * Lead', 'Prospect') are taken verbatim from the ClickUp text — only
   * 'Lead' is confirmed as a real CRM Stage option elsewhere in this repo,
   * so re-verify both against the live CRM Stage dropdown.
   */
  async function createTestCustomer(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    page: import('@playwright/test').Page,
    crmStage: string,
  ): Promise<string> {
    const customerName = `Playwright QL-to-Prospect ${crmStage} ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-ql-prospect-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage,
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

  test('TC:1 Verify automatic conversion of Qualified Lead to Prospect upon first Sample Request creation', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtajg', 'TC:1 (ClickUp)');

    test.fixme(
      true,
      "The trigger (creating the first-ever Sample Request for this Lead in Floor OS) is outside the CRM module's page objects — needs a cross-module fixture or a pre-seeded test Lead-with-Sample-Request on the target environment.",
    );

    let customerId = '';
    await test.step('Seed a Qualified Lead Customer (pre-condition)', async () => {
      customerId = await createTestCustomer(createCustomerPage, page, 'Qualified Lead');
    });

    // TODO(CRM QA): create the first-ever Sample Request for this Customer
    // in Floor OS here once a cross-module fixture exists, then re-run
    // this test for real.
    await test.step('CRM Stage still reads Qualified Lead until the Floor OS trigger fires', async () => {
      await qualifiedLeadToProspectPage.openCustomerDetail(customerId);
      await qualifiedLeadToProspectPage.expectCrmStage('Qualified Lead');
    });
  });

  test('TC:2 Verify generation of in-app system and email notifications to Lead Owner', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtajh', 'TC:2 (ClickUp)');

    test.fixme(
      true,
      "In-app + email notifications are only generated by the real conversion event (first Sample Request creation in Floor OS), which is outside CRM's page objects — needs a cross-module fixture or a pre-seeded test Lead-with-Sample-Request on the target environment.",
    );

    let customerId = '';
    await test.step('Seed a Qualified Lead Customer (pre-condition)', async () => {
      customerId = await createTestCustomer(createCustomerPage, page, 'Qualified Lead');
    });

    // TODO(CRM QA): create the first-ever Sample Request for this Customer
    // in Floor OS here once a cross-module fixture exists, then assert a
    // system notification actually names this Customer/Owner. Until then
    // this only proves the notification bell/panel UI is reachable, not
    // that a real conversion notification was generated.
    await test.step('Notification bell/panel is at least reachable (structural, not content-verified)', async () => {
      await qualifiedLeadToProspectPage.openCustomerDetail(customerId);
      await qualifiedLeadToProspectPage.openNotificationPanel();
      await qualifiedLeadToProspectPage.expectNotificationPanelVisible();
    });

    // TODO(CRM QA): the email notification half of this TC (FR-3) can't be
    // checked at all from this Playwright spec — no email-inbox fixture
    // exists in this framework. Needs a mailbox-testing tool (e.g.
    // Mailosaur/Mailtrap API) wired in separately.
  });

  test('TC:3 Verify redirection to Customer Details screen via CRM system notification', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtajj', 'TC:3 (ClickUp)');

    // Best-effort, partial coverage — see the class doc on
    // QualifiedLeadToProspectPage and qualified-lead-to-prospect.md's
    // Notes. The real trigger that would generate a genuine system
    // notification is outside CRM's page objects, so this can't click an
    // actual conversion-generated notification. It seeds a Customer
    // already at Prospect stage instead (a valid, real CRM-only
    // precondition standing in for the post-conversion state) and
    // verifies the two CRM-side pieces this module can observe on its
    // own: the redirect's destination screen, and the notification
    // bell/panel itself.
    let customerId = '';

    await test.step('Seed a Customer already at Prospect stage (proxy for post-conversion state)', async () => {
      customerId = await createTestCustomer(createCustomerPage, page, 'Prospect');
    });

    await test.step('Customer Details (the redirect destination) shows CRM Stage: Prospect', async () => {
      await qualifiedLeadToProspectPage.openCustomerDetail(customerId);
      await qualifiedLeadToProspectPage.expectCrmStage('Prospect');
    });

    await test.step('CRM notification bell/panel opens (structural check of the redirect entry point)', async () => {
      await qualifiedLeadToProspectPage.openNotificationPanel();
      await qualifiedLeadToProspectPage.expectNotificationPanelVisible();
    });
  });

  test.skip('TC:4 Verify redirection to Customer Details screen via email notification hyperlink', async () => {
    await allure.tms('https://app.clickup.com/t/z941abtajk', 'TC:4 (ClickUp)');
    // Marked skip in ClickUp already. Also has no automation path today
    // regardless: there's no email-inbox fixture in this framework to
    // receive/click a real email hyperlink from (FR-5).
  });

  test('TC:5 Verify negative/edge behavior on subsequent Sample Requests (no duplicate conversion/notifications)', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtajm', 'TC:5 (ClickUp)');

    test.fixme(
      true,
      "Requires triggering a first AND a second Sample Request creation for the same Lead in Floor OS to prove no re-conversion/duplicate notification happens — both are outside CRM's page objects. Needs a cross-module fixture or a pre-seeded test Lead-with-Sample-Requests on the target environment.",
    );

    let customerId = '';
    await test.step('Seed a Customer already at Prospect stage (simulating post-first-conversion state)', async () => {
      customerId = await createTestCustomer(createCustomerPage, page, 'Prospect');
    });

    // TODO(CRM QA): create a second Sample Request for this Customer in
    // Floor OS here once a cross-module fixture exists, then assert CRM
    // Stage is still Prospect (not re-converted) and no second/duplicate
    // notification was generated.
    await test.step('CRM Stage remains Prospect (no re-conversion) for the already-converted record', async () => {
      await qualifiedLeadToProspectPage.openCustomerDetail(customerId);
      await qualifiedLeadToProspectPage.expectCrmStage('Prospect');
    });
  });

  test('TC:6 Verify system behavior when Sample Request creation fails or is cancelled in Floor OS', async ({
    createCustomerPage,
    qualifiedLeadToProspectPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtcgb', 'TC:6 (ClickUp)');

    test.fixme(
      true,
      "Requires attempting a failed/cancelled Sample Request creation in Floor OS to prove no conversion occurs — entirely outside CRM's page objects and this module's observation surface. Needs a cross-module fixture or a pre-seeded scenario on the target environment.",
    );

    let customerId = '';
    await test.step('Seed a Qualified Lead Customer (pre-condition)', async () => {
      customerId = await createTestCustomer(createCustomerPage, page, 'Qualified Lead');
    });

    // TODO(CRM QA): attempt and then fail/cancel a Sample Request for this
    // Customer in Floor OS here once a cross-module fixture exists, then
    // assert CRM Stage is still Qualified Lead (no conversion) and no
    // notification was generated.
    await test.step('CRM Stage remains Qualified Lead (no conversion) when the trigger never really fires', async () => {
      await qualifiedLeadToProspectPage.openCustomerDetail(customerId);
      await qualifiedLeadToProspectPage.expectCrmStage('Qualified Lead');
    });
  });
});
