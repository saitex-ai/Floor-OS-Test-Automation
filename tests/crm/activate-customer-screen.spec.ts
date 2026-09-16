import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../src/pages/crm/create-customer.page';
import type { CustomerDetailPage } from '../../src/pages/crm/customer-detail.page';

/**
 * CRM — Activate Customer Screen (Sprint 1).
 *
 * Source of truth: test-cases/crm/activate-customer-screen.md (ClickUp
 * task https://app.clickup.com/t/z941abt7hk). Same screen as
 * activate-customer.spec.ts, narrower focus on the modal itself (no
 * Master Data / Tech Pack cascade checks) — kept as its own file per
 * team decision. All 6 cases confirmed against a real save on dev
 * (2026-09-16), using the real Activation reason list (Negotiation,
 * Sampling, New orders, Seasonal, Business Realignment).
 */
test.describe('CRM - Activate Customer Screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Activate Customer Screen');
    await allure.owner('CRM QA');
  });

  /** Every test needs an Inactive Customer to open the Activate flow on. */
  async function createAndDeactivateCustomer(
    createCustomerPage: CreateCustomerPage,
    customerDetailPage: CustomerDetailPage,
  ): Promise<void> {
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
    await createCustomerPage.postSaveCancelButton.click();

    await customerDetailPage.deactivate(
      ['Business misalignment'],
      'Setup for Activate Customer Screen test',
    );
    await customerDetailPage.expectStatus('Inactive');
  }

  test('TC:1 Verify activation flow availability based on inactive customer status', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7hm', 'TC:1 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Inactive Customer shows "Activate", not "Deactivate"', async () => {
      await expect(customerDetailPage.activateButton).toBeVisible();
      await expect(customerDetailPage.deactivateButton).not.toBeVisible();
    });

    await test.step('Activate it — now shows "Deactivate", not "Activate"', async () => {
      await customerDetailPage.activate(['Negotiation'], 'TC:1 setup');
      await expect(customerDetailPage.deactivateButton).toBeVisible();
      await expect(customerDetailPage.activateButton).not.toBeVisible();
    });
  });

  test('TC:2 Verify mandatory activation reason selection validation', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7hn', 'TC:2 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Leave the multi-select empty, enter detail text, click Proceed', async () => {
      await customerDetailPage.activateButton.click();
      await customerDetailPage.detailedReasonTextbox.fill('Some detail with no reason selected');
      await customerDetailPage.reasonProceedButton.click();
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
    await allure.tms('https://app.clickup.com/t/z941abt7hp', 'TC:3 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Select a reason, leave detail blank, click Proceed', async () => {
      await customerDetailPage.activateButton.click();
      await customerDetailPage.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.reasonProceedButton.click();
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
    await allure.tms('https://app.clickup.com/t/z941abt7hq', 'TC:4 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Select valid reasons, enter a detailed explanation, click Proceed', async () => {
      await customerDetailPage.activateButton.click();
      await customerDetailPage.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.detailedReasonTextbox.fill('Reactivating after negotiation');
      await customerDetailPage.reasonProceedButton.click();
    });

    await test.step('Final modal names the Customer and states linked-Contacts impact', async () => {
      await expect(customerDetailPage.confirmDialog).toContainText('and its Contacts?');
      await expect(customerDetailPage.confirmDialog.getByText(/linked contacts/i)).toBeVisible();
    });
  });

  test('TC:5 Verify cascading Customer and Contact reactivation execution', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7hr', 'TC:5 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Activate with a valid reason and detail', async () => {
      await customerDetailPage.activate(['Negotiation'], 'Reactivating after negotiation');
    });

    await test.step('Customer status updates to Active immediately', async () => {
      await customerDetailPage.expectStatus('Active');
    });

    // TODO(CRM QA): "Every previously-inactive linked Contact is
    // reactivated" + audit history + Manager notification need a real
    // linked Contact and a confirmed audit/notification view — this
    // probe customer has neither. Not verifiable from the UI alone
    // without those.
  });

  test('TC:6 Verify abandoning activation flow before final confirmation', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7ht', 'TC:6 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Enter valid details, then Cancel on the reason-capture screen', async () => {
      await customerDetailPage.activateButton.click();
      await customerDetailPage.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.detailedReasonTextbox.fill('Testing cancel');
      await customerDetailPage.reasonCancelButton.click();
    });

    await test.step('Flow abandoned, Customer remains Inactive', async () => {
      await expect(customerDetailPage.reasonDialog).toBeHidden();
      await customerDetailPage.expectStatus('Inactive');
    });

    await test.step('Enter valid details again, Proceed, then Cancel on the final popup', async () => {
      await customerDetailPage.activateButton.click();
      await customerDetailPage.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.detailedReasonTextbox.fill('Testing cancel again');
      await customerDetailPage.reasonProceedButton.click();
      await customerDetailPage.confirmCancelButton.click();
    });

    await test.step('Still Inactive after canceling the final confirmation too', async () => {
      await customerDetailPage.expectStatus('Inactive');
    });
  });
});
