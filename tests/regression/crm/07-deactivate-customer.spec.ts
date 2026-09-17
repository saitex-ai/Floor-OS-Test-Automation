import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';

/**
 * CRM — Deactivate Customer (Sprint 1).
 *
 * Source of truth: test-cases/crm/deactivate-customer.md (ClickUp task
 * https://app.clickup.com/t/86eyr7fap). Confirmed against a real save
 * on dev on 2026-09-16 — see customer-detail.page.ts for the confirmed
 * dialog shapes and the real Deactivation reason list (Business
 * misalignment, Payment issues, Low order frequency, Compliance
 * concerns, Unethical).
 */
test.describe('CRM - Deactivate Customer', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Deactivate Customer');
    await allure.owner('CRM QA');
  });

  /** New Customers save as Active — no setup step needed, unlike Activate. */
  async function createActiveCustomer(createCustomerPage: CreateCustomerPage): Promise<void> {
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Test Customer ${Date.now()}`,
      email: `pw-test-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
  }

  test('TC:1 Verify visibility of the "Deactivate" button on active Customer profile', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53d', 'TC:1 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await expect(customerDetailPage.locators.deactivateButton).toBeVisible();
    await expect(customerDetailPage.locators.activateButton).not.toBeVisible();
  });

  test('TC:2 Verify validation when mandatory deactivation fields are empty', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53e', 'TC:2 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Open Deactivate modal, leave both fields blank, click Proceed', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonProceedButton.click();
    });

    await test.step('Deactivation is blocked with both validation errors', async () => {
      await customerDetailPage.expectFieldEditError('Select at least one reason');
      await customerDetailPage.expectFieldEditError('Detailed reason is required');
    });
  });

  test('TC:3 Verify deactivation reason options and character limits', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53f', 'TC:3 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Expand the Reason dropdown and select a reason', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await expect(page.getByRole('option', { name: 'Business misalignment' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Payment issues' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Low order frequency' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Compliance concerns' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Unethical' })).toBeVisible();
      await page.getByRole('option', { name: 'Business misalignment' }).click();
      await page.keyboard.press('Escape');
    });

    await test.step('Enter detail text and check the character counter', async () => {
      await customerDetailPage.locators.detailedReasonTextbox.fill('Customer relocated overseas');
      await customerDetailPage.expectCharacterCount('Customer relocated overseas'.length);
    });
  });

  test('TC:4 Verify confirmation modal warning for linked Contacts', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53g', 'TC:4 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Fill mandatory reasons and click Proceed', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Business misalignment' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill('Customer relocated overseas');
      await customerDetailPage.locators.reasonProceedButton.click();
    });

    await test.step('Confirmation modal names the Customer and impact', async () => {
      await expect(customerDetailPage.locators.confirmDialog).toBeVisible();
      await expect(customerDetailPage.locators.confirmDialog).toContainText('and its Contacts?');
      await expect(
        customerDetailPage.locators.confirmDialog.getByText(/linked contacts/i),
      ).toBeVisible();
    });
  });

  test('TC:5 Verify successful customer and linked contacts deactivation', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53h', 'TC:5 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Deactivate with a valid reason and detail', async () => {
      await customerDetailPage.deactivate(['Business misalignment'], 'Customer relocated overseas');
    });

    await test.step('Status badge → Inactive, button toggles to Activate', async () => {
      await customerDetailPage.expectStatus('Inactive');
      await expect(customerDetailPage.locators.activateButton).toBeVisible();
      await expect(customerDetailPage.locators.deactivateButton).not.toBeVisible();
    });

    // TODO(CRM QA): "All linked contacts also go inactive" needs a real
    // linked Contact — this probe customer has none (Contacts (0)).
    // Revisit once create-contact.spec.ts's blocked linkage flow is
    // unblocked.
  });

  test('TC:6 Verify cascading deactivation of Customer in Master Data module', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53j', 'TC:6 (ClickUp)');

    test.fixme(
      true,
      "No Master Data page object exists yet (out of scope for the CRM QA — a Master Data QA would own that module per this framework's per-module ownership model)",
    );

    await createActiveCustomer(createCustomerPage);
    await customerDetailPage.deactivate(['Business misalignment'], 'Customer relocated overseas');
    // TODO(CRM QA / Master Data QA): navigate to the Master Data module
    // and confirm the Customer shows Inactive there.
  });

  test('TC:7 Verify cascading deactivation of Customer in Tech Pack module', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53k', 'TC:7 (ClickUp)');

    test.fixme(
      true,
      "No Tech Pack page object exists yet (out of scope for the CRM QA — a Tech Pack QA would own that module per this framework's per-module ownership model)",
    );

    await createActiveCustomer(createCustomerPage);
    await customerDetailPage.deactivate(['Business misalignment'], 'Customer relocated overseas');
    // TODO(CRM QA / Tech Pack QA): navigate to the Tech Pack module and
    // confirm the Customer is flagged Inactive / hidden from selection.
  });

  test('TC:8 Verify cancellation of Customer deactivation flow', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt53n', 'TC:8 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Open the Deactivate modal, then Cancel on the reason step', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonCancelButton.click();
    });

    await test.step('Modal closes, nothing saved, still Active', async () => {
      await expect(customerDetailPage.locators.reasonDialog).toBeHidden();
      await customerDetailPage.expectStatus('Active');
    });

    await test.step('Open again, proceed to final confirmation, then Cancel there', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Business misalignment' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill('Testing cancel');
      await customerDetailPage.locators.reasonProceedButton.click();
      await customerDetailPage.locators.confirmCancelButton.click();
    });

    await test.step('Still Active after canceling the final confirmation too', async () => {
      await customerDetailPage.expectStatus('Active');
    });
  });
});
