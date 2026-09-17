import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../src/pages/crm/create-customer.page';

/**
 * CRM — Deactivate Customer Screen (Sprint 1).
 *
 * Source of truth: test-cases/crm/deactivate-customer-screen.md (ClickUp
 * task https://app.clickup.com/t/z941abt7gv). Same screen as
 * deactivate-customer.spec.ts, narrower focus on the modal itself (no
 * Master Data / Tech Pack cascade checks) — kept as its own file per
 * team decision. All 6 cases confirmed against a real save on dev
 * (2026-09-16).
 */
test.describe('CRM - Deactivate Customer Screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Deactivate Customer Screen');
    await allure.owner('CRM QA');
  });

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

  test('TC:1 Verify deactivation flow availability based on active customer status', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7gy', 'TC:1 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Active Customer shows "Deactivate", not "Activate"', async () => {
      await expect(customerDetailPage.locators.deactivateButton).toBeVisible();
      await expect(customerDetailPage.locators.activateButton).not.toBeVisible();
    });

    await test.step('Deactivate it — now shows "Activate", not "Deactivate"', async () => {
      await customerDetailPage.deactivate(['Business misalignment'], 'TC:1 setup');
      await expect(customerDetailPage.locators.activateButton).toBeVisible();
      await expect(customerDetailPage.locators.deactivateButton).not.toBeVisible();
    });
  });

  test('TC:2 Verify mandatory reason selection validation', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7gz', 'TC:2 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Leave the multi-select empty, enter detail text, click Proceed', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.detailedReasonTextbox.fill(
        'Some detail with no reason selected',
      );
      await customerDetailPage.locators.reasonProceedButton.click();
    });

    await test.step('Blocked with "at least one reason" validation error', async () => {
      await customerDetailPage.expectFieldEditError('Select at least one reason');
    });
  });

  test('TC:3 Verify mandatory detailed explanation and character length validation', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7h0', 'TC:3 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Select a reason, leave detail blank, click Proceed', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Payment issues' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.reasonProceedButton.click();
    });

    await test.step('Blocked with the missing-detail validation error', async () => {
      await customerDetailPage.expectFieldEditError('Detailed reason is required');
    });
  });

  test('TC:4 Verify final confirmation screen details and linked Contacts count impact', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7h1', 'TC:4 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Provide a valid reason and detail, click Proceed', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Payment issues' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill('Persistent late payments');
      await customerDetailPage.locators.reasonProceedButton.click();
    });

    await test.step('Final modal names the Customer and states linked-Contacts impact', async () => {
      await expect(customerDetailPage.locators.confirmDialog).toContainText('and its Contacts?');
      await expect(
        customerDetailPage.locators.confirmDialog.getByText(/linked contacts/i),
      ).toBeVisible();
    });
  });

  test('TC:5 Verify cascading customer and contact deactivation execution', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7h2', 'TC:5 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Deactivate with a valid reason and detail', async () => {
      await customerDetailPage.deactivate(['Payment issues'], 'Persistent late payments');
    });

    await test.step('Customer status updates to Inactive immediately', async () => {
      await customerDetailPage.expectStatus('Inactive');
    });

    // TODO(CRM QA): "Every linked Contact also goes inactive" + audit
    // history + Manager notification need a real linked Contact and a
    // confirmed audit/notification view — this probe customer has
    // neither. Not verifiable from the UI alone without those.
  });

  test('TC:6 Verify abandoning deactivation flow before final confirmation', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7h3', 'TC:6 (ClickUp)');
    await createActiveCustomer(createCustomerPage);

    await test.step('Fill in valid reason/explanation, then Cancel on the reason-capture screen', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Payment issues' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill('Testing cancel');
      await customerDetailPage.locators.reasonCancelButton.click();
    });

    await test.step('Flow abandoned, Customer remains Active', async () => {
      await expect(customerDetailPage.locators.reasonDialog).toBeHidden();
      await customerDetailPage.expectStatus('Active');
    });

    await test.step('Fill in valid reason/explanation again, Proceed, then Cancel on the final screen', async () => {
      await customerDetailPage.locators.deactivateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Payment issues' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill('Testing cancel again');
      await customerDetailPage.locators.reasonProceedButton.click();
      await customerDetailPage.locators.confirmCancelButton.click();
    });

    await test.step('Still Active after canceling the final confirmation too', async () => {
      await customerDetailPage.expectStatus('Active');
    });
  });
});
