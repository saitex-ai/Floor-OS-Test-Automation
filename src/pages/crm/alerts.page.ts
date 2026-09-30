import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AlertsLocators, ALERTS_LIST_PATH } from '../../locators/crm/alerts.locators';

/**
 * "Alert Detail Screen" (CRM, Sprint 3 user story). Owned by the CRM QA.
 * Confirmed against the running app (2026-09-25) — see AlertsLocators'
 * class doc for the corrections that made to the original ClickUp text.
 *
 * TC:5 (Delete with Confirmation) is deliberately NOT exercised to
 * completion: alerts are entirely AI/system-generated with no "Create
 * Alert" path anywhere in the UI, and this environment's seed pool is a
 * FIXED set of 6 — confirmed directly (no create button exists). Actually
 * deleting one would permanently and irreversibly shrink that pool for
 * every other Alert test, with no way to restore it. `expectDeleteConfirmDialogVisible()`
 * verifies the confirmation gate itself exists and works; the test stops
 * there rather than completing a real, unrecoverable delete.
 */
export class AlertsPage extends BasePage {
  readonly locators: AlertsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AlertsLocators(page);
  }

  async openList(): Promise<void> {
    await this.gotoAuthenticated(ALERTS_LIST_PATH);
  }

  async openAlert(titleSubstring: string): Promise<void> {
    await this.locators.alertRow(titleSubstring).click();
  }

  /** Whichever of Check/Uncheck is currently showing (the button label flips with state — confirmed reversible both directions). */
  async toggleChecked(): Promise<void> {
    const uncheck = this.locators.uncheckButton;
    if (await uncheck.isVisible().catch(() => false)) {
      await uncheck.click();
    } else {
      await this.locators.checkButton.click();
    }
  }

  async expectStatusText(status: 'Checked' | 'Unchecked'): Promise<void> {
    await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible();
  }

  async openEmailInternallyDialog(): Promise<void> {
    await this.locators.emailInternallyButton.click();
    await expect(this.locators.emailDialog).toBeVisible();
  }

  async openEmailToCustomerDialog(): Promise<void> {
    await this.locators.emailToCustomerButton.click();
    await expect(this.locators.emailDialog).toBeVisible();
  }

  /** Attempts the Outlook handoff with whatever the dialog currently holds — used both for the real flow and for TC:7's blank-recipient validation. */
  async attemptRedirectToOutlook(): Promise<void> {
    await this.locators.redirectToOutlookButton.click();
  }

  async closeEmailDialog(): Promise<void> {
    await this.locators.emailCancelButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  /** TC:6 — confirms the Official Source link opens in a new tab, without asserting on that external page's own content (same un-attestable boundary as every other new-tab handoff in this app). */
  async clickOfficialSourceAndAwaitNewTab(): Promise<Page | null> {
    const newPagePromise = this.page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
    await this.locators.officialSourceLink.click();
    return newPagePromise;
  }

  /** TC:5 — opens the delete confirmation gate. Does NOT confirm — see class doc. */
  async openDeleteConfirmDialog(): Promise<void> {
    await this.locators.deleteAlertButton.click();
  }

  async expectDeleteConfirmDialogVisible(): Promise<void> {
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
  }

  async cancelDelete(): Promise<void> {
    await this.locators.deleteCancelButton.click();
  }
}
