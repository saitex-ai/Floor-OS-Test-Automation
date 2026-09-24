import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Log a Communication (Sprint 2).
 *
 * Source of truth: test-cases/crm/log-a-communication.md (ClickUp task
 * https://app.clickup.com/t/z941abtafh, User Story
 * https://app.clickup.com/t/86eye4dtd). NOT yet confirmed against a
 * running app — locators and interactions in log-communication.page.ts are
 * a best guess from the ClickUp text (see the note there, especially
 * around the "slider controls" Date/Time fields). Every test here needs a
 * real live run before it's trusted the way create-contact.spec.ts and
 * create-customer.spec.ts now are.
 */
test.describe('CRM - Log a Communication', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Log a Communication');
    await allure.owner('CRM QA');
  });

  /**
   * Every test needs a real Customer to log a communication against — and,
   * confirmed against the running app, a real ASSIGNEE too: "Communicator"
   * lists this customer's own department assignees (see
   * log-communication-dialog.tsx's `communicatorOptions`, sourced from
   * `assignees.data`), which is empty until a department/assignee row is
   * added. "Cutting" / "Anjali Krishnakumar" are real, currently-seeded
   * options (`svc-master-data.departments` — confirmed via a live run:
   * this table was itself empty until the `35-departments-demo.sql` seed
   * was applied, a separate environment gap fixed alongside this file).
   */
  async function createTestCustomer(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    page: import('@playwright/test').Page,
  ): Promise<string> {
    const customerName = `Playwright Log-Comm Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-log-comm-${Date.now()}@example.com`,
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

  test('TC-1 Verify display of "Log a Communication" screen and components', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtafn', 'TC-1 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);

    await test.step('Open the Logging screen from Customer Details', async () => {
      await logCommunicationPage.openFromCustomerDetail(customerId);
    });

    await test.step('All expected fields and Save are visible', async () => {
      await logCommunicationPage.expectDialogVisible();
      await expect(logCommunicationPage.locators.mediumCombobox).toBeVisible();
      await expect(logCommunicationPage.locators.timezoneCombobox).toBeVisible();
      await expect(logCommunicationPage.locators.dateInput).toBeVisible();
      await expect(logCommunicationPage.locators.titleInput).toBeVisible();
      await expect(logCommunicationPage.locators.reasonInput).toBeVisible();
      await expect(logCommunicationPage.locators.communicatorCombobox).toBeVisible();
      await expect(logCommunicationPage.locators.momTextbox).toBeVisible();
      await expect(logCommunicationPage.locators.saveButton).toBeVisible();
    });
  });

  test('TC-2 Verify dropdown options population from Master Data', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtafp', 'TC-2 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);
    await logCommunicationPage.openFromCustomerDetail(customerId);

    // Confirmed against the running app: "Communication Reason" is a free-text
    // field, not a master-data dropdown (see reasonInput in
    // log-communication.locators.ts) — dropped from this check, which is
    // specifically about dropdowns.
    await test.step('Medium and Communicator dropdowns each list options', async () => {
      await logCommunicationPage.locators.mediumCombobox.click();
      await expect(page.getByRole('option').first()).toBeVisible();
      await page.keyboard.press('Escape');

      await logCommunicationPage.locators.communicatorCombobox.click();
      await expect(page.getByRole('option').first()).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('Reason accepts free text', async () => {
      await expect(logCommunicationPage.locators.reasonInput).toBeVisible();
      await expect(logCommunicationPage.locators.reasonInput).toBeEditable();
    });
  });

  test('TC-3 Verify successful saving and audit stamping of logged communication', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtafq', 'TC-3 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);
    await logCommunicationPage.openFromCustomerDetail(customerId);

    const title = `Playwright Communication ${Date.now()}`;

    await test.step('Fill all fields with valid values and Save', async () => {
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
    });

    await test.step('Save succeeds', async () => {
      await logCommunicationPage.expectSavedSuccessfully();
    });

    // TODO(CRM QA): once the real Communication section/audit view is
    // confirmed, assert the created-by user and created date/time are
    // shown against this entry (FR-1.6/AC-1.5 in the User Story).
  });

  test('TC-4 Verify retrieval and display of saved communication log', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtafr', 'TC-4 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);
    const title = `Playwright Retrieve Communication ${Date.now()}`;

    await test.step('Log a communication', async () => {
      await logCommunicationPage.openFromCustomerDetail(customerId);
      await logCommunicationPage.fill({
        medium: 'Email',
        timezone: 'India',
        date: new Date().toISOString().slice(0, 10),
        title,
        reason: 'Follow-up',
        communicator: 'Anjali Krishnakumar',
        mom: 'Sent updated quote.',
      });
      await logCommunicationPage.save();
      await logCommunicationPage.expectSavedSuccessfully();
    });

    await test.step('Return to the Communication section and find it', async () => {
      await logCommunicationPage.expectLoggedEntryVisible(title);
    });
  });

  test('TC-5 Verify Save button functionality and database persistence', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtaft', 'TC-5 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);
    const title = `Playwright Persistence Communication ${Date.now()}`;

    await logCommunicationPage.openFromCustomerDetail(customerId);
    await logCommunicationPage.fill({
      medium: 'Phone Call',
      timezone: 'India',
      date: new Date().toISOString().slice(0, 10),
      title,
      reason: 'Follow-up',
      communicator: 'Anjali Krishnakumar',
      mom: 'Persistence check.',
    });
    await logCommunicationPage.save();
    await logCommunicationPage.expectSavedSuccessfully();

    await test.step('Reload and confirm the record persisted', async () => {
      await page.reload();
      await logCommunicationPage.expectLoggedEntryVisible(title);
    });
  });

  test('TC-6 Verify Date adjustment on the Date field', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtafu', 'TC-6 (ClickUp)');

    // Confirmed against the running app: there are no "slider controls" at
    // all (the ClickUp text's own guess) — Date is a single native date
    // input, and there is no separate Time field on this screen. Rewritten
    // to match, rather than left permanently fixme'd for an interaction
    // that was never real.
    const customerId = await createTestCustomer(createCustomerPage, page);
    await logCommunicationPage.openFromCustomerDetail(customerId);

    const adjustedDate = '2026-09-25';

    await test.step('Set a specific Date', async () => {
      await logCommunicationPage.locators.dateInput.fill(adjustedDate);
    });

    await test.step('The field reflects the value set', async () => {
      await expect(logCommunicationPage.locators.dateInput).toHaveValue(adjustedDate);
    });
  });

  test('TC-7 Validation / Negative — mandatory field validation on Save', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtafv', 'TC-7 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);

    await test.step('Open the Logging screen and leave fields blank', async () => {
      await logCommunicationPage.openFromCustomerDetail(customerId);
    });

    await test.step('Click Save with mandatory fields blank', async () => {
      await logCommunicationPage.save();
    });

    await test.step('Save is blocked with a validation error', async () => {
      await logCommunicationPage.expectFieldError('Required');
    });
  });

  test('TC-8 Verify Cancel / Close action without saving', async ({
    createCustomerPage,
    logCommunicationPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtag4', 'TC-8 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);
    const title = `Playwright Cancelled Communication ${Date.now()}`;

    await test.step('Open the Logging screen and enter some values', async () => {
      await logCommunicationPage.openFromCustomerDetail(customerId);
      await logCommunicationPage.fill({ title, mom: 'Should not be saved.' });
    });

    await test.step('Click Cancel instead of Save', async () => {
      await logCommunicationPage.cancel();
    });

    await test.step('Screen closes and nothing is persisted', async () => {
      await logCommunicationPage.expectDialogClosed();
      await expect(logCommunicationPage.locators.loggedEntry(title)).toHaveCount(0);
    });
  });
});
