import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Create External Event [created by user manually] (Sprint 4).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abvbkm.
 * Confirmed against the running app (2026-09-25) — see
 * external-events.locators.ts's class doc for the corrections made.
 *
 * TC:5's ClickUp text describes a "type to search" attendee picker —
 * confirmed directly this doesn't exist: SAITEX Attendees is a fixed,
 * unsearchable list of 5 employees. Written to test the real behavior
 * (select one from the list, confirm it populates the field) rather than
 * the imagined search-filter premise.
 */
test.describe('CRM - Create External Event (manual)', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Create External Event (manual)');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify successful manual creation of an External Event', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvbkt', 'TC:1 (ClickUp)');

    const title = `Regression Create Event ${Date.now()}`;
    await externalEventsPage.openFromEventsList();
    await externalEventsPage.fill({
      title,
      venue: 'Denim Meetup Ho Chi Minh City',
      date: '2026-09-20',
      about: 'A regression-created event.',
      attendee: 'Alice Planner',
      score: 8,
      numberOfLeads: 3,
      wentWell: 'Good turnout.',
      couldBeBetter: 'Nothing major.',
      attendNextEditions: 'Yes',
    });

    await test.step('Click Submit and confirm the save', async () => {
      await externalEventsPage.submit();
      await externalEventsPage.expectConfirmDialogVisible();
      await externalEventsPage.confirmSaveEvent();
    });

    await test.step('The event persists with a unique reference and the user lands on its own Details screen', async () => {
      await externalEventsPage.expectSavedSuccessfully();
      await expect(page).toHaveURL(/\/crm\/events\/[0-9a-f-]+/);
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    });
  });

  test('TC:2 Prevent submission with blank mandatory fields', async ({ externalEventsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abvbkv', 'TC:2 (ClickUp)');

    await externalEventsPage.openFromEventsList();

    await test.step('Submit with every field blank', async () => {
      await externalEventsPage.submit();
    });

    await test.step('Every mandatory field is individually flagged and the user stays on the form', async () => {
      const errors = externalEventsPage.locators.requiredFieldErrors();
      // Confirmed against the running app: Title/Venue/Date/About/Score/
      // "What went well?"/"What could have been better?"/"Attend next
      // editions?" show a plain "Required" error (8) — Number of Leads is
      // the one exception, showing its "Numeric" format hint instead, and
      // SAITEX Attendees shows its own "Select at least one attendee" text.
      await expect(errors).toHaveCount(8);
      await externalEventsPage.expectFieldError('Select at least one attendee');
      await expect(page).toHaveURL(/\/crm\/events\/new/);
    });
  });

  test('TC:3 Verify Cancel action functionality', async ({ externalEventsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abvbkx', 'TC:3 (ClickUp)');

    await externalEventsPage.openFromEventsList();
    await externalEventsPage.locators.titleInput.fill('Should Be Discarded On Cancel');

    await test.step('Click Cancel', async () => {
      await externalEventsPage.cancel();
    });

    await test.step('The form is safely abandoned with no save', async () => {
      await expect(page).toHaveURL(/\/crm\/events$/);
      await expect(externalEventsPage.locators.eventRow('Should Be Discarded On Cancel')).toHaveCount(0);
    });
  });

  test('TC:4 Verify Successful Navigation via "Create Event" Action', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvbkz', 'TC:4 (ClickUp)');

    await externalEventsPage.openList();

    await test.step('Click the Create Event button on the list screen', async () => {
      await externalEventsPage.locators.createEventButton.click();
    });

    await test.step('The user lands on the Create External Event form without delay', async () => {
      await expect(page).toHaveURL(/\/crm\/events\/new/);
      await expect(externalEventsPage.locators.titleInput).toBeVisible();
      await expect(externalEventsPage.locators.venueInput).toBeVisible();
      await expect(externalEventsPage.locators.dateInput).toBeVisible();
    });
  });

  test('TC:5 Verify Selecting an Attendee', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abvbm1', 'TC:5 (ClickUp)');

    await externalEventsPage.openFromEventsList();

    await test.step('Open the SAITEX Attendees picker and select a valid attendee', async () => {
      await externalEventsPage.selectAttendee('Alice Planner');
    });

    await test.step('The selected attendee populates the field', async () => {
      // Confirmed against the running app: no search/filter input exists in
      // this popup at all (a plain fixed list of 5 employees, typing does
      // not filter it) — the ClickUp text's "type to search" premise does
      // not hold here. What IS real: picking an option closes the popup
      // and the SAITEX Attendees trigger button itself now reads the
      // selected name — scoped to that button since "Alice Planner" also
      // matches the logged-in user's own nav-bar menu.
      await expect(externalEventsPage.locators.attendeesButton).toContainText('Alice Planner');
    });
  });
});
