import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { ShellLoginPage } from '../../../src/pages/shell/shell-login.page';
import { CrmPage } from '../../../src/pages/crm/crm.page';
import { MODULES } from '../../../src/config/modules';
import { moduleCredentials } from '../../../src/config/env';

/**
 * A small, separately-requested smoke check covering just three
 * capabilities: real login, Create Customer, Create Contact. Kept apart
 * from crm.smoke.spec.ts rather than folded in, per how it was asked for.
 */
test.describe('CRM Smoke — Recent', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Smoke — Recent');
    await allure.owner('CRM QA');
  });

  test.describe('Login functionality', () => {
    // A genuinely fresh, unauthenticated context — the module project's
    // cached storageState would skip the real login this test exists to
    // check. `storageState: undefined` does NOT clear it (confirmed
    // 2026-09-21: Keycloak silently approved via the still-cached session,
    // never showing the login form, so the username/password fill timed
    // out) — an explicit empty state is required to actually override it.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Login functionality', async ({ page }) => {
      const { username, password } = moduleCredentials(MODULES.crm);
      const loginPage = new ShellLoginPage(page);
      await loginPage.goto('/');
      await loginPage.login(username, password);

      const crmPage = new CrmPage(page);
      await crmPage.open();
      await crmPage.expectLoaded();
    });
  });

  test('Create Customer: successful creation without a linked Contact', async ({
    createCustomerPage,
  }) => {
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Smoke Customer ${Date.now()}`,
      email: `pw-smoke-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      crmStage: 'Lead',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
    });
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible()) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
  });

  test('Create Contact: linking to an existing Customer succeeds', async ({
    createContactPage,
  }) => {
    await createContactPage.openFromContactList();
    await createContactPage.fillProfile({
      name: 'Playwright Smoke Contact',
      designation: 'Buyer',
      email: `pw-smoke-contact-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.linkToCustomer('Acme Textiles');
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();
  });
});
