import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type {
  ExternalEventsPage,
  ExternalEventDetails,
} from '../../../src/pages/crm/external-events.page';

/**
 * CRM — External Events [created by user manually] Details screen (Sprint 4).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abvg17.
 * Confirmed against the running app (2026-09-25) — see
 * external-events.locators.ts/external-events.page.ts's class docs for the
 * corrections made.
 *
 * CRITICAL, confirmed premise correction shared by several TCs here: a
 * manually-created event has NO "Planning" tab and is born directly at
 * status "Attended" — the create form itself requires the full Feedback
 * Form to be filled in before it can even submit (see
 * `28-create-external-event.spec.ts`). There is therefore no reachable
 * "un-attended manually-created event" state anywhere in this app, and no
 * separate, empty Feedback Form to "complete" afterward — it's already
 * submitted, read-only, right from creation. TC:2/TC:3/TC:6 are written
 * to verify the real, corrected behavior rather than force the original
 * (Planning-lifecycle-shaped) premise onto a flow that doesn't have one —
 * the genuine un-attended-lock behavior these TCs originally describe is
 * already covered, for AI-discovered events, by
 * `23-external-event-details.spec.ts`'s TC:1/TC:6.
 */
async function createManualEvent(
  externalEventsPage: ExternalEventsPage,
  overrides: Partial<ExternalEventDetails> = {},
): Promise<string> {
  const title = overrides.title ?? `QA-AUTO Regression Manual Details Event ${Date.now()}`;
  await externalEventsPage.openFromEventsList();
  await externalEventsPage.fill({
    title,
    venue: 'Regression City / Venue',
    date: '2026-09-20',
    about: 'A regression exploration event for the Details screen.',
    attendee: 'Alice Planner',
    score: 7,
    numberOfLeads: 2,
    wentWell: 'Good turnout.',
    couldBeBetter: 'Nothing major.',
    attendNextEditions: 'Yes',
    ...overrides,
  });
  await externalEventsPage.submit();
  await externalEventsPage.expectConfirmDialogVisible();
  await externalEventsPage.confirmSaveEvent();
  await externalEventsPage.expectSavedSuccessfully();
  return title;
}

test.describe('CRM - External Events (manual) Details screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('External Events (manual) Details screen');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify Overview Tab Display', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abvg1e', 'TC:1 (ClickUp)');

    const title = await createManualEvent(externalEventsPage);

    await test.step('Open the Overview tab', async () => {
      await externalEventsPage.openOverviewTab();
    });

    await test.step('All core event details and System fields render accurately', async () => {
      await externalEventsPage.expectOverviewShows({
        title,
        venue: 'Regression City / Venue',
        about: 'A regression exploration event for the Details screen.',
        status: 'Attended',
      });
    });
  });

  test('TC:2 Verify a manually-created event is born already Attended, tabs unlocked', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvg1f', 'TC:2 (ClickUp)');

    await createManualEvent(externalEventsPage);

    await test.step('Feedback Form and Leads are reachable immediately — no unlock transition to observe', async () => {
      // Corrected from the ClickUp premise — see this file's class doc.
      // There is no un-attended manual-event state to transition FROM, so
      // this verifies the real, confirmed end state instead: both tabs
      // work right away.
      await externalEventsPage.openFeedbackFormTab();
      await expect(page.getByText('Saved').first()).toBeVisible();
      await externalEventsPage.openLeadsTab();
      await expect(externalEventsPage.locators.leadsEmptyStateMessage).toBeVisible();
    });
  });

  test('TC:3 Verify Feedback Form renders the submitted feedback (read-only, already complete)', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvg1g', 'TC:3 (ClickUp)');

    await createManualEvent(externalEventsPage, { score: 9, numberOfLeads: 4 });

    await test.step('Open the Feedback Form tab', async () => {
      await externalEventsPage.openFeedbackFormTab();
    });

    await test.step('The feedback submitted at creation is already saved and displayed — no separate fill/submit step exists', async () => {
      // Corrected from the ClickUp premise — see this file's class doc: no
      // "Edit" affordance exists on this tab for a manually-created event.
      const body = page.locator('main').last();
      await expect(body).toContainText('Saved');
      await expect(body).toContainText('9 / 10');
      // Case-insensitive: this label's casing isn't stable across runs
      // (confirmed CSS text-transform timing race — see class doc).
      await expect(body).toContainText(/number of leads/i);
      await expect(body).toContainText('4');
    });
  });

  test('TC:4 Verify Customer Creation from Leads Tab', async ({
    externalEventsPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvg1w', 'TC:4 (ClickUp)');
    const customerName = `Playwright Leads Customer ${Date.now()}`;
    const l = createCustomerPage.locators;

    const title = await test.step('Create a manual event and open its Leads tab', async () => {
      const eventTitle = await createManualEvent(externalEventsPage);
      await externalEventsPage.openLeadsTab();
      await expect(externalEventsPage.locators.leadsTabButton).toHaveText('Leads (0)');
      return eventTitle;
    });

    await test.step('Create Customer opens the form pre-linked to the event', async () => {
      await externalEventsPage.openCreateCustomerFromLeads();
      await expect(l.profileSection).toBeVisible();
      await expect(page).toHaveURL(/\/crm\/customers\/new\?eventId=/);
    });

    await test.step('Fill the profile: CRM Stage is Lead, Origin Type is locked to External Event, Origin stays empty', async () => {
      await createCustomerPage.fillProfile({
        name: customerName,
        email: `pw-leads-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
        buyer: 'Fabric',
      });
      await expect(l.crmStageCombobox).toHaveText(/^Lead$/);
      await expect(l.originTypeCombobox).toHaveText(/^External Event$/);
      await expect(l.originTypeCombobox).toBeDisabled();
      // Origin is left empty and disabled here, and the Customer still
      // saves: expected — only Customer Name is mandatory (prototype field
      // rules, dev 2026-10-26). Decision recorded on the test case:
      // https://app.clickup.com/t/z941abvg1w?comment=1100750000236468
      await expect(l.originCombobox).toHaveText(/^Select$/);
      await expect(l.originCombobox).toBeDisabled();
    });

    await test.step('Save creates the Customer', async () => {
      await createCustomerPage.save();
      await createCustomerPage.expectSavedSuccessfully();
    });

    await test.step("The new Customer is listed on the event's Leads tab", async () => {
      await externalEventsPage.openList();
      await externalEventsPage.search(title);
      await externalEventsPage.openEventRow(title);
      await externalEventsPage.openLeadsTab();
      await externalEventsPage.expectLeadListed(customerName, 1);
    });
  });

  test('TC:5 Verify Audit History Tracking (System section)', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvg1x', 'TC:5 (ClickUp)');

    const title = await createManualEvent(externalEventsPage);

    await test.step('Open the Overview tab and inspect its System section', async () => {
      await externalEventsPage.openOverviewTab();
    });

    await test.step('Created/Updated On and By are present and accurate', async () => {
      // Confirmed against the running app: this screen has NO separate
      // audit-trail/history tab or per-change log anywhere — "System" is a
      // single Created On/By + Updated On/By pair, not a list of every
      // status change/edit/feedback submission the ClickUp text describes.
      // This asserts the real, CRM-observable slice; the fuller
      // "every event individually logged" claim does not hold here.
      const body = page.locator('main').last();
      await expect(body).toContainText(title);
      // Case-insensitive: confirmed CSS text-transform timing race on
      // this label family — see external-events.page.ts's class doc.
      await expect(body).toContainText(/created on/i);
      await expect(body).toContainText(/created by/i);
      await expect(body).toContainText(/updated on/i);
      await expect(body).toContainText(/updated by/i);
    });
  });

  test('TC:6 Restrict Feedback/Leads access on an un-attended event', () => {
    test.fixme(
      true,
      'Confirmed against the running app (2026-09-25): a manually-created event is always born status Attended (the create form requires the full Feedback Form before it can submit at all) — there is no reachable "un-attended manually-created event" state to test this against. The equivalent real lock behavior, for AI-discovered Planning events, is already covered by 23-external-event-details.spec.ts TC:1/TC:6.',
    );
  });
});
