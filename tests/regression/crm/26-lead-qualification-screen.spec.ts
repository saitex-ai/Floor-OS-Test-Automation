import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import { LeadQualificationPage } from '../../../src/pages/crm/lead-qualification.page';
import { ShellLoginPage } from '../../../src/pages/shell/shell-login.page';
import { moduleCredentials } from '../../../src/config/env';

/**
 * CRM — Lead Qualification screen (Sprint 4).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abvd5t.
 * Confirmed against the running app (2026-09-25) — see
 * lead-qualification.locators.ts and lead-qualification.page.ts's class
 * docs for the full list of corrections made to the original ClickUp
 * text. The headline ones, load-bearing for these TCs:
 *
 * - Convert enables after the FIRST saved department review, for ANY one
 *   department — not after all four, as TC:2/TC:5's "Convert bar"
 *   premise implies (already established before this story, reused here).
 * - The Manager combobox is NOT filtered by Department (TC:1's "select a
 *   manager filtered to that department" step doesn't hold) — same 5
 *   managers regardless of department.
 * - Resubmitting the top-of-form fields for a department that already has
 *   a saved review creates a SECOND, duplicate row. The only real
 *   edit-in-place path is a row's own "Edit review" button.
 * - The Lead Qualification tab itself is entirely ABSENT (not merely
 *   locked/gated) once a Customer's CRM Stage has moved past "Lead" —
 *   confirmed for Qualified Lead and Prospect. TC:3's "historic-data
 *   account" premise (navigate to the tab of a past-Lead account) is
 *   therefore unreachable as literally written; the one genuinely
 *   reachable empty state is a fresh, zero-review Lead.
 * - TC:5's disabled-Convert tooltip is a real hover-triggered tooltip
 *   (role=tooltip), just with different text than ClickUp's "all four
 *   department reviews are required": "At least one Manager's Review and
 *   Score must exist." — consistent with the one-review-unlocks finding.
 * - TC:6 (Executive role): the Convert button doesn't render at all for
 *   the seeded Executive user (`fayaz.ahmad`) — replaced by explicit text
 *   "Conversion is limited to Managers. You can read the dossier and add
 *   reviews, but not convert this lead."
 *
 * TC:2 is written as a real (non-fixme) test — it covers everything CRM
 * genuinely observes (stage flip Lead -> Qualified Lead, review records
 * staying intact post-conversion) but does NOT assert the ClickUp text's
 * "stage-log entry (actor/timestamp/trigger)", "notification is
 * broadcast", or "green completion banner naming the conversion date and
 * acting user" claims: all three were checked for directly (screenshots +
 * full-body text dumps immediately after conversion and polled for
 * several seconds after, on the Lead Qualification tab, the Customer's
 * Overview tab, and the shell's notification panel) and none were
 * observed anywhere. Same "real CRM-side coverage, documented partial"
 * pattern as TC:3 in qualified-lead-to-prospect.page.ts/.md — treat this
 * TC's "✅" as "the real, CRM-observable slice", not full ClickUp-text
 * coverage. See test-cases/crm/lead-qualification-screen.md's Notes.
 */

async function createFreshLeadCustomer(page: Page): Promise<string> {
  const createCustomerPage = new CreateCustomerPage(page);
  await createCustomerPage.openFromCrmHome();
  const name = `Playwright Regression LQ Lead ${Date.now()}`;
  await createCustomerPage.fillProfile({
    name,
    email: `pw-regression-lq-${Date.now()}@example.com`,
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

test.describe('CRM - Lead Qualification screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Lead Qualification screen');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify successful saving and updating of a Department Review', async ({ page }) => {
    await allure.tms('https://app.clickup.com/t/z941abvd70', 'TC:1 (ClickUp)');

    const customerId = await createFreshLeadCustomer(page);
    const lq = new LeadQualificationPage(page);
    await lq.openFromCustomerDetail(customerId);

    const review = {
      department: 'Fabric Mill',
      manager: 'Alice Planner',
      score: 7,
      review: 'Fabric Mill fits current volumes well. Recommend proceeding.',
    };

    await test.step('Save a new department review', async () => {
      await lq.submitReview(review);
      // Row renders with an avatar (manager initials), department chip,
      // score pill, timestamp, and the review text — confirmed directly.
      await lq.expectReviewRowVisible(review);
      await lq.expectReviewCount(1);
    });

    await test.step('Editing the same department review updates it in place (no duplicate)', async () => {
      // Confirmed directly: resubmitting the top-of-form fields instead
      // creates a SECOND row for the same department. The real edit path
      // is the row's own "Edit review" button.
      const updated = { score: 9, review: 'Updated after a follow-up call — recommend proceeding.' };
      await lq.editMostRecentReview(updated);
      await lq.expectReviewCount(1);
      await lq.expectReviewRowVisible({ ...review, ...updated });
    });
  });

  test('TC:2 Verify successful lead conversion by a Manager', async ({ page }) => {
    await allure.tms('https://app.clickup.com/t/z941abvd72', 'TC:2 (ClickUp)');

    const customerId = await createFreshLeadCustomer(page);
    const lq = new LeadQualificationPage(page);
    await lq.openFromCustomerDetail(customerId);

    const review = {
      department: 'Fabric Mill',
      manager: 'Alice Planner',
      score: 8,
      review: 'Fabric Mill review looks solid. Recommend proceeding.',
    };

    await test.step('Convert bar enables after the first saved review (real correction to the "four chips" premise)', async () => {
      await lq.submitReview(review);
      await lq.expectConvertEnabled();
    });

    await test.step('Converting flips the CRM Stage from Lead to Qualified Lead', async () => {
      await lq.convertToQualifiedLead();
      await lq.expectStageIsQualifiedLead();
    });

    await test.step('Review records remain intact for audit after conversion', async () => {
      await lq.expectReviewRowVisible(review);
    });

    // Not asserted (checked for directly, not found anywhere — see class
    // doc above and test-cases/crm/lead-qualification-screen.md Notes):
    // a stage-log entry naming actor/timestamp/trigger, an in-app
    // notification, and a green completion banner naming the conversion
    // date and acting user.
  });

  test('TC:3 Verify empty state for accounts with no Lead Qualification dossier', async ({
    page,
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abvd73', 'TC:3 (ClickUp)');

    await test.step('Correction: the tab itself is absent once CRM Stage has moved past Lead', async () => {
      await createCustomerPage.openFromCrmHome();
      await createCustomerPage.fillProfile({
        name: `Playwright Regression LQ Historic ${Date.now()}`,
        email: `pw-regression-lq-historic-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
        crmStage: 'Qualified Lead',
      });
      await createCustomerPage.save();
      if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
        await createCustomerPage.locators.saveAnywayButton.click();
      }
      await createCustomerPage.expectSavedSuccessfully();
      await createCustomerPage.locators.postSaveCancelButton.click();
      await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);

      const lq = new LeadQualificationPage(page);
      await expect(lq.locators.tabButton).toHaveCount(0);
    });

    await test.step('The reachable empty state: a genuinely fresh Lead with zero reviews', async () => {
      const customerId = await createFreshLeadCustomer(page);
      const lq = new LeadQualificationPage(page);
      await lq.openFromCustomerDetail(customerId);

      // Clean, explanatory messages — not broken or blank cards.
      await lq.expectNoDossierEmptyState();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test('TC:4 Prevent saving department review with missing fields', async ({ page }) => {
    await allure.tms('https://app.clickup.com/t/z941abvd74', 'TC:4 (ClickUp)');

    const customerId = await createFreshLeadCustomer(page);
    const lq = new LeadQualificationPage(page);
    await lq.openFromCustomerDetail(customerId);

    await test.step('Attempt Save with every field left blank', async () => {
      await lq.attemptSaveBlank();
    });

    await test.step('Inline validation errors appear and highlight the offending fields', async () => {
      await lq.expectFieldValidationErrors();
    });
  });

  test('TC:5 Prevent lead conversion when zero reviews exist', async ({ page }) => {
    await allure.tms('https://app.clickup.com/t/z941abvd77', 'TC:5 (ClickUp)');

    const customerId = await createFreshLeadCustomer(page);
    const lq = new LeadQualificationPage(page);
    await lq.openFromCustomerDetail(customerId);

    await test.step('Convert stays disabled with a real (hover) explanatory tooltip', async () => {
      // Correction, confirmed directly: the tooltip reads "At least one
      // Manager's Review and Score must exist." — not "all four
      // department reviews are required" as the ClickUp text implies,
      // consistent with the "one review unlocks Convert" finding used in
      // TC:2. Still holds for the genuinely zero-review case this TC
      // describes.
      await lq.expectConvertDisabledWithRequirementNote();
    });
  });

  test.describe('TC:6 Restrict conversion access for Executive role', () => {
    // A genuinely fresh, unauthenticated context — the crm project's
    // cached storageState is for the Manager-ish `alice` user. Same
    // pattern as smoke-recent.spec.ts's "Login functionality" test.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('TC:6 Restrict conversion access for Executive role', async ({ page }) => {
      await allure.tms('https://app.clickup.com/t/z941abvjym', 'TC:6 (ClickUp)');

      // Seed the Lead as the default (Manager-ish) user first, in its own
      // authenticated context, then hand the same customerId to a second,
      // Executive-logged-in context to inspect.
      const seedBrowser = page.context().browser()!;
      const managerContext = await seedBrowser.newContext({ storageState: '.auth/crm.json' });
      const managerPage = await managerContext.newPage();
      const customerId = await createFreshLeadCustomer(managerPage);
      await managerContext.close();

      await test.step('Log in as the seeded Executive user', async () => {
        const { username, password } = moduleCredentials('CRM_EXECUTIVE');
        const loginPage = new ShellLoginPage(page);
        await loginPage.goto('/');
        await loginPage.login(username, password);
      });

      await test.step('Convert is locked, with an explicit Manager-only restriction note', async () => {
        const lq = new LeadQualificationPage(page);
        await lq.openFromCustomerDetail(customerId);
        await lq.expectConvertLockedForExecutive();
      });
    });
  });
});
