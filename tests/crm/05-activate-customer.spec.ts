import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';
import type { CreateCustomerPage } from '../../src/pages/crm/create-customer.page';
import type { CustomerDetailPage } from '../../src/pages/crm/customer-detail.page';

/**
 * CRM — Activate Customer (Sprint 1).
 *
 * Source of truth: test-cases/crm/activate-customer.md (ClickUp task
 * https://app.clickup.com/t/86eyr7fkc). Confirmed against a real save
 * on dev on 2026-09-16 — local can't reach this screen at all (Country
 * has no options, so no Customer can ever be saved there). See
 * customer-detail.page.ts for the confirmed dialog shapes and the real
 * Activation reason list (Negotiation, Sampling, New orders, Seasonal,
 * Business Realignment).
 */
test.describe('CRM - Activate Customer', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Activate Customer');
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
    await createCustomerPage.locators.postSaveCancelButton.click();

    await customerDetailPage.deactivate(
      ['Business misalignment'],
      'Setup for Activate Customer test',
    );
    await customerDetailPage.expectStatus('Inactive');
  }

  test('TC:1 Verify "Activate" is only offered on an Inactive Customer', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt79u', 'TC:1 (ClickUp)');

    await test.step('Create a Customer (Active by default) — "Deactivate" is shown, not "Activate"', async () => {
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

      await expect(customerDetailPage.locators.deactivateButton).toBeVisible();
      await expect(customerDetailPage.locators.activateButton).not.toBeVisible();
    });

    await test.step('Deactivate it — "Activate" is now shown, not "Deactivate"', async () => {
      await customerDetailPage.deactivate(['Business misalignment'], 'TC:1 setup');
      await expect(customerDetailPage.locators.activateButton).toBeVisible();
      await expect(customerDetailPage.locators.deactivateButton).not.toBeVisible();
    });
  });

  test('TC:2 Verify mandatory field validation on Activate Customer modal', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt79v', 'TC:2 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Open Activate modal, leave both fields blank, click Proceed', async () => {
      await customerDetailPage.locators.activateButton.click();
      await customerDetailPage.locators.reasonProceedButton.click();
    });

    await test.step('Activation is blocked with both validation errors', async () => {
      await customerDetailPage.expectFieldEditError('Select at least one reason');
      await customerDetailPage.expectFieldEditError('Detailed reason is required');
    });
  });

  test('TC:3 Verify reason selection and character counter on Activate Customer modal', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt79w', 'TC:3 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Select a valid reason and enter detailed text', async () => {
      await customerDetailPage.locators.activateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill(
        'Reactivating after negotiation',
      );
    });

    await test.step('Selected reason chip appears; character counter updates', async () => {
      await expect(
        customerDetailPage.locators.reasonMultiSelect.getByText('Negotiation'),
      ).toBeVisible();
      await customerDetailPage.expectCharacterCount('Reactivating after negotiation'.length);
    });
  });

  test('TC:4 Verify confirmation modal for Customer and Contacts activation', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt79x', 'TC:4 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Complete mandatory fields and click Proceed', async () => {
      await customerDetailPage.locators.activateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill(
        'Reactivating after negotiation',
      );
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

  test('TC:5 Verify successful Customer and linked Contacts reactivation', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt79y', 'TC:5 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Activate with a valid reason and detail', async () => {
      await customerDetailPage.activate(['Negotiation'], 'Reactivating after negotiation');
    });

    await test.step('Status badge → Active, button toggles to Deactivate', async () => {
      await customerDetailPage.expectStatus('Active');
      await expect(customerDetailPage.locators.deactivateButton).toBeVisible();
      await expect(customerDetailPage.locators.activateButton).not.toBeVisible();
    });

    // TODO(CRM QA): "All previously deactivated linked Contacts are
    // reactivated automatically" needs a real linked Contact — this
    // probe customer has none (Contacts (0)). Revisit once
    // create-contact.spec.ts's blocked linkage flow is unblocked.
  });

  test('TC:6 Verify cascading reactivation in Master Data module', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7a0', 'TC:6 (ClickUp)');

    test.fixme(
      true,
      'Marked fail in ClickUp — Master Data cascade may currently be broken app behavior, not just untested. Confirm with the team before automating.',
    );

    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);
    await customerDetailPage.activate(['Negotiation'], 'Reactivating after negotiation');
    // TODO(CRM QA): navigate to Master Data module and confirm the
    // Customer shows Active there — no Master Data page object exists
    // yet (out of scope for the CRM QA's ownership boundary too).
  });

  test('TC:7 Verify cascading reactivation in Tech Pack module', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7a2', 'TC:7 (ClickUp)');

    test.fixme(
      true,
      'Marked fail in ClickUp — Tech Pack cascade may currently be broken app behavior, not just untested. Confirm with the team before automating.',
    );

    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);
    await customerDetailPage.activate(['Negotiation'], 'Reactivating after negotiation');
    // TODO(CRM QA): navigate to Tech Pack module and confirm the
    // Customer is selectable — no Tech Pack page object exists yet
    // (out of scope for the CRM QA's ownership boundary too).
  });

  test('TC:8 Verify cancellation during Customer activation flow', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7a3', 'TC:8 (ClickUp)');
    await createAndDeactivateCustomer(createCustomerPage, customerDetailPage);

    await test.step('Open the Activate modal, then Cancel on the reason step', async () => {
      await customerDetailPage.locators.activateButton.click();
      await customerDetailPage.locators.reasonCancelButton.click();
    });

    await test.step('Modal closes, nothing saved, still Inactive', async () => {
      await expect(customerDetailPage.locators.reasonDialog).toBeHidden();
      await customerDetailPage.expectStatus('Inactive');
    });

    await test.step('Open again, proceed to final confirmation, then Cancel there', async () => {
      await customerDetailPage.locators.activateButton.click();
      await customerDetailPage.locators.reasonMultiSelect.click();
      await page.getByRole('option', { name: 'Negotiation' }).click();
      await page.keyboard.press('Escape');
      await customerDetailPage.locators.detailedReasonTextbox.fill('Testing cancel');
      await customerDetailPage.locators.reasonProceedButton.click();
      await customerDetailPage.locators.confirmCancelButton.click();
    });

    await test.step('Still Inactive after canceling the final confirmation too', async () => {
      await customerDetailPage.expectStatus('Inactive');
    });
  });
});
