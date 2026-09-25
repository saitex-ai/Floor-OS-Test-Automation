import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { BIZ_DOC_TYPES } from '../../../src/locators/crm/biz-doc.locators';
import { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import { BizDocPage } from '../../../src/pages/crm/biz-doc.page';
import { ShellLoginPage } from '../../../src/pages/shell/shell-login.page';
import { moduleCredentials } from '../../../src/config/env';

/**
 * Creates a real, minimal Customer via CreateCustomerPage and returns its
 * UUID — the Biz Doc journey's only entry point is that Customer's Details
 * screen (`/crm/customers/{uuid}`, Biz Docs sub-tab). Mirrors the "create a
 * real Customer to open X from" pattern in 11-create-contact.spec.ts
 * (TC:7-8). Not part of the Biz Doc journey itself, which is read-only
 * from this point on.
 */
async function createRealCustomer(
  createCustomerPage: CreateCustomerPage,
  page: Page,
): Promise<string> {
  const stamp = Date.now();
  await createCustomerPage.openFromCrmHome();
  await createCustomerPage.fillProfile({
    name: `Playwright Biz Doc Customer ${stamp}`,
    email: `pw-bizdoc-${stamp}@example.com`,
    city: 'Coimbatore',
    country: 'India',
    originType: 'Referral',
    origin: 'Internal Referral',
    buyer: 'Fabric',
    referredBy: 'Jordan Smith',
    crmStage: 'Lead',
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

/**
 * CRM — Biz Doc (Sprint 2), a READ-ONLY viewing journey.
 *
 * Source of truth: test-cases/crm/biz-doc.md (ClickUp parent task
 * https://app.clickup.com/t/z941abt9c1, linked User Story
 * https://app.clickup.com/t/86eye4dtf). Confirmed against the running app
 * (2026-09-23) — see biz-doc.locators.ts's class doc for the corrections
 * this made to the original ClickUp-text guesses:
 *
 *   - There is no CRM Home entry point. The three icons (Sample Requests,
 *     Tech Packs, Quotes) live only under a Customer Details screen's own
 *     "Biz Docs" sub-tab.
 *   - "Sample Orders" and "Purchase Orders" are not separate clickable
 *     entries — there is a fourth, non-interactive "Orders" note whose
 *     own text says Purchase Orders isn't available in floorOS yet.
 *   - Clicking an icon does not navigate to a separate List screen — it
 *     toggles the icon and loads a data table in place.
 *
 * These entity types are created and owned by OTHER floorOS modules
 * upstream — CRM is a read-only consumer/viewer here, and this framework
 * has no way to guarantee a Customer with seed data of any given type
 * exists. TC:3 and TC:4 check `bizDocPage.hasAnyRecords()` before drilling
 * into a record and skip cleanly (with a reason) when a doc type's table
 * is empty, rather than asserting a hardcoded row exists — in this
 * environment, every available Customer has zero Biz Doc records, so that
 * drill-down path (and the Details-screen locators it depends on) remains
 * unconfirmed; see biz-doc.locators.ts. TC:5 (RBAC negative test) signs in
 * as a second, `job.crm-executive` identity (CRM_EXECUTIVE_* in .env) to
 * prove `crm:biz-docs:read` is genuinely manager-only, not just untested.
 */
test.describe('CRM - Biz Doc', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Biz Doc');
    await allure.owner('CRM QA');
  });

  test('TC:1 Three Biz Docs icons visible on Customer Details', async ({
    bizDocPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt9cj', 'TC:1 (ClickUp)');

    const customerId = await createRealCustomer(createCustomerPage, page);

    await test.step('Customer Details shows all three icons', async () => {
      await bizDocPage.openFromCustomerDetails(customerId);
      await bizDocPage.expectAllIconsVisible();
    });
  });

  test('TC:2 Each icon loads its data table', async ({
    bizDocPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt9cm', 'TC:2 (ClickUp)');

    const customerId = await createRealCustomer(createCustomerPage, page);
    await bizDocPage.openFromCustomerDetails(customerId);

    for (const docType of BIZ_DOC_TYPES) {
      await test.step(docType, async () => {
        await bizDocPage.openList(docType);
        await bizDocPage.expectListScreenVisible(docType);
      });
    }
  });

  // One test per doc type (data-driven, README's "Adding data-driven cases"
  // pattern) rather than one looped test — so a doc type with no seed data
  // skips on its own without masking a real drill-down failure on another.
  for (const docType of BIZ_DOC_TYPES) {
    test(`TC:3 Drill down from List to Details screen — ${docType}`, async ({
      bizDocPage,
      createCustomerPage,
      page,
    }) => {
      await allure.tms('https://app.clickup.com/t/z941abt9cn', 'TC:3 (ClickUp)');

      const customerId = await createRealCustomer(createCustomerPage, page);
      await bizDocPage.openFromCustomerDetails(customerId);
      await bizDocPage.openList(docType);
      await bizDocPage.expectListScreenVisible(docType);

      test.skip(
        !(await bizDocPage.hasAnyRecords()),
        `No seed data for "${docType}" in this environment — this entity type is owned by another floorOS module upstream, so this framework can't guarantee one exists. See test-cases/crm/biz-doc.md's Notes.`,
      );

      await test.step('Click the first record and land on its Details screen', async () => {
        await bizDocPage.openFirstRecord();
        await bizDocPage.expectDetailsScreenVisible();
      });
    });
  }

  test('TC:4 Biz Docs viewing journey is read-only end to end', async ({
    bizDocPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt9cq', 'TC:4 (ClickUp)');

    const customerId = await createRealCustomer(createCustomerPage, page);
    await bizDocPage.openFromCustomerDetails(customerId);

    for (const docType of BIZ_DOC_TYPES) {
      await test.step(`${docType} data table has no data-modifying control`, async () => {
        await bizDocPage.openList(docType);
        await bizDocPage.expectListScreenVisible(docType);
        await bizDocPage.expectListReadOnly();
      });

      await test.step(`${docType} Details screen has no data-modifying control (skipped if unseeded)`, async () => {
        if (!(await bizDocPage.hasAnyRecords())) {
          return;
        }
        await bizDocPage.openFirstRecord();
        await bizDocPage.expectDetailsScreenVisible();
        await bizDocPage.expectDetailsReadOnly();
      });
    }
  });

  test('TC:5 RBAC negative test for unauthorized roles', async ({ browser }) => {
    await allure.tms('https://app.clickup.com/t/z941abt9cr', 'TC:5 (ClickUp)');

    // `crm:biz-docs:read` is manager-only (services/svc-authz/migrations/
    // 1800000000060_crm_biz_docs_manager_only_and_page_keys.sql) —
    // `job.crm-executive` grants `crm.access` alone. See
    // src/config/env.ts's moduleCredentials('CRM_EXECUTIVE') for this
    // second, seeded `job.crm-executive` identity.
    const { username, password } = moduleCredentials('CRM_EXECUTIVE');

    // A fresh, storageState-free context — this suite's shared `crm.json`
    // storage state belongs to the Manager test user (see auth-setup.ts).
    const executiveContext = await browser.newContext();
    try {
      // browser.newContext() alone still carries the Manager's live
      // Keycloak session cookies in this setup — clear explicitly.
      await executiveContext.clearCookies();

      const executivePage = await executiveContext.newPage();
      const loginPage = new ShellLoginPage(executivePage);
      await loginPage.goto('/');
      await loginPage.login(username, password);

      // `GET /crm/customers/:id` 403s for an Executive on a customer a
      // MANAGER created (scoped to the customer's creator, a separate
      // gate from Biz Docs) — even as a department assignee. The
      // Executive creates their OWN customer so they can reach a Details
      // screen at all, isolating the Biz Docs check below to the
      // permission this test is actually about.
      const executiveCreateCustomerPage = new CreateCustomerPage(executivePage);
      const customerId = await createRealCustomer(executiveCreateCustomerPage, executivePage);

      const executiveBizDocPage = new BizDocPage(executivePage);
      await executiveBizDocPage.openFromCustomerDetailsWithoutTab(customerId);

      await test.step('The Biz Docs tab is withheld entirely for this role', async () => {
        await expect(executiveBizDocPage.locators.bizDocsTabButton).toBeHidden();
      });
    } finally {
      await executiveContext.close();
    }
  });
});
