import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { ShellLoginPage } from '../../../src/pages/shell/shell-login.page';
import { CrmPage } from '../../../src/pages/crm/crm.page';
import { MODULES } from '../../../src/config/modules';
import { moduleCredentials } from '../../../src/config/env';

/**
 * Confirmed on dev (2026-09-25) but NOT on local: Create Customer's
 * Management section can carry a required "Company" combobox that
 * createCustomerPage.fillProfile() doesn't fill. Defensive rather than
 * unconditional — only acts when the field is actually present, so this
 * doesn't change behavior on local or on a dev deploy where it's absent.
 */
async function fillCompanyIfPresent(page: Page): Promise<void> {
  const combo = page.getByRole('combobox', { name: 'Company', exact: true });
  if (await combo.isVisible().catch(() => false)) {
    await combo.click();
    await page.getByRole('option').first().click();
  }
}

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
    page,
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
    await fillCompanyIfPresent(page);
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
