import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Alert Detail Screen (Sprint 3).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abv3qr.
 * Confirmed against the running app (2026-09-25) — see
 * alerts.locators.ts and alerts.page.ts's class docs for the corrections
 * that made.
 *
 * TC:3/TC:4/TC:8 (Internal sharing, Customer sharing, Restrict Customer
 * Share to Inactive) are marked `test.skip()` — already marked skip in
 * ClickUp, and confirmed against the running app that both "Email
 * Alert..." actions are the same "Redirect to Outlook" handoff already
 * established for Communications Email/Key Meeting Notes elsewhere in
 * this app: whether a real email actually dispatches, or which Customers
 * populate the picker, isn't attestable from this Playwright suite
 * either way. TC:7 (blank-recipient validation on the Internal dialog)
 * IS real and run, since that's CRM-side-observable.
 *
 * TC:5 (Delete with Confirmation) stops at confirming the confirmation
 * dialog itself opens correctly — Alerts have no "Create" path anywhere
 * in the UI (confirmed directly), so this environment's 6-alert seed
 * pool is fixed and NOT replenishable; actually deleting one would be a
 * real, irreversible loss for every other Alert test. See
 * alerts.page.ts's class doc.
 */
test.describe('CRM - Alert Detail Screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Alert Detail Screen');
    await allure.owner('CRM QA');
  });

  /** Every test needs a real Alert to open — picks the first row on the list. */
  async function openFirstAlert(
    alertsPage: import('../../../src/pages/crm/alerts.page').AlertsPage,
    page: import('@playwright/test').Page,
  ): Promise<void> {
    await alertsPage.openList();
    await expect(alertsPage.locators.pageHeading).toBeVisible();
    const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    const hasRows = await rows
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasRows, 'No seeded Alerts in this environment.');
    await rows.first().click();
    // Wait for the detail page to actually mount before handing back
    // control — confirmed against the running app: checking
    // checkButton/uncheckButton visibility immediately after the click
    // races the navigation (detail page still loading), so an
    // isVisible().catch(() => false) read right after this can silently
    // see neither button and misread the alert's real Checked/Unchecked
    // state.
    await expect(alertsPage.locators.checkButton.or(alertsPage.locators.uncheckButton)).toBeVisible();
  }

  test('TC:2 Verify "Uncheck" functionality', async ({ alertsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abv3tz', 'TC:2 (ClickUp)');

    await openFirstAlert(alertsPage, page);
    // Normalize to Checked first — confirmed reversible both directions,
    // so a prior run leaving it Unchecked doesn't break this one.
    if (await alertsPage.locators.checkButton.isVisible().catch(() => false)) {
      await alertsPage.toggleChecked();
    }
    await alertsPage.expectStatusText('Checked');

    await test.step('Click Uncheck', async () => {
      await alertsPage.toggleChecked();
    });

    await test.step('The status badge flips to Unchecked', async () => {
      await alertsPage.expectStatusText('Unchecked');
    });

    // Restore — leaves the shared seed alert as found for other runs/tests.
    await alertsPage.toggleChecked();
    await alertsPage.expectStatusText('Checked');
  });

  test('TC:3 Verify Internal Alert Sharing', () => {
    test.fixme(
      true,
      'Marked skip in ClickUp. Confirmed against the running app: "Email Alert Internally" is the same "Redirect to Outlook" handoff already established for Communications Email/Key Meeting Notes elsewhere — whether a real email actually dispatches is not attestable from this suite.',
    );
  });

  test('TC:4 Verify Customer Alert Sharing', () => {
    test.fixme(
      true,
      'Marked skip in ClickUp. Same Outlook-handoff boundary as TC:3 — see that test\'s reason.',
    );
  });

  test('TC:5 Verify Alert Deletion with Confirmation', async ({ alertsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abv3u2', 'TC:5 (ClickUp)');

    await openFirstAlert(alertsPage, page);

    await test.step('Click the Delete (trash) icon', async () => {
      await alertsPage.openDeleteConfirmDialog();
    });

    await test.step('A real confirmation gate appears', async () => {
      await alertsPage.expectDeleteConfirmDialogVisible();
    });

    // Deliberately does NOT confirm — see this file's class doc and
    // alerts.page.ts: Alerts have no UI create path, so this environment's
    // fixed seed pool can't be replenished if actually deleted.
    await alertsPage.cancelDelete();
  });

  test('TC:6 Verify Official Source Link Navigation', async ({ alertsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abv3u3', 'TC:6 (ClickUp)');

    await openFirstAlert(alertsPage, page);

    await test.step('Click the official source URL', async () => {
      const newTab = await alertsPage.clickOfficialSourceAndAwaitNewTab();
      expect(newTab, 'expected the regulatory source page to open in a new tab').not.toBeNull();
    });
  });

  test('TC:7 Prevent Internal Share without Recipients', async ({ alertsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abv3u4', 'TC:7 (ClickUp)');

    await openFirstAlert(alertsPage, page);
    await alertsPage.openEmailInternallyDialog();

    await test.step('Leave To blank and attempt Redirect to Outlook', async () => {
      await alertsPage.attemptRedirectToOutlook();
    });

    await test.step('The system blocks the action with a validation error', async () => {
      await alertsPage.expectFieldError('Select at least one user email ID');
    });

    await alertsPage.closeEmailDialog();
  });

  test('TC:8 Restrict Customer Share to Inactive Customers', () => {
    test.fixme(
      true,
      'Marked skip in ClickUp. Same Outlook-handoff boundary as TC:3/TC:4 — the Customer picker itself was seen, but which Customers populate it isn\'t independently attestable without a confirmed-inactive seeded Customer to check against.',
    );
  });
});
