import { type Locator, type Page, expect, test } from '@playwright/test';
import { BasePage } from '../base.page';
import { LogCommunicationLocators } from '../../locators/crm/log-communication.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Log a Communication" (CRM, Sprint 2 user story). Owned by the CRM QA.
 *
 * NOT yet confirmed against the running app — see the note atop
 * LogCommunicationLocators and test-cases/crm/log-a-communication.md for
 * what's guessed vs. confirmed. Written the same way create-customer.page.ts
 * started (best-guess actions on top of best-guess locators), to be
 * corrected after the first live run rather than left unautomated.
 */
export interface CommunicationLogDetails {
  medium?: string;
  timezone?: string;
  /** Native date input value, e.g. '2026-09-23'. */
  date?: string;
  title?: string;
  reason?: string;
  communicator?: string;
  mom?: string;
}

export class LogCommunicationPage extends BasePage {
  readonly locators: LogCommunicationLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new LogCommunicationLocators(page);
  }

  /** Opens the Logging screen from an existing Customer's Details screen. */
  /**
   * Confirmed directly on local (2026-09-22): Customer Details is a
   * tabbed screen (Overview is the default tab) — the Communication tab
   * has to be selected first, or logCommunicationButton never exists.
   * Also confirmed the same run: that tab is currently an unbuilt
   * scaffold on this environment ("Tab content — not built yet.") —
   * rather than time out waiting on it, this checks for that placeholder
   * right after switching tabs and test.skip()s with a clear reason
   * (same pattern as KeyMeetingNotesPage.openGenerateFromCustomerDetail()).
   */
  async openFromCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated
    (CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.communicationTabButton.click();
    const notBuilt = await this.locators.communicationTabNotBuiltPlaceholder
      .isVisible()
      .catch(() => false);
    test.skip(
      notBuilt,
      'Communication tab is an unbuilt scaffold placeholder on this environment (confirmed 2026-09-22 — "Tab content — not built yet.")',
    );
    await this.locators.logCommunicationButton.click();
  }

  async expectDialogVisible(): Promise<void> {
    await expect(this.locators.dialog).toBeVisible();
  }

  async fill(details: CommunicationLogDetails): Promise<void> {
    const l = this.locators;
    if (details.medium !== undefined)
      await this.selectComboboxOption(l.mediumCombobox, details.medium);
    if (details.timezone !== undefined)
      await this.selectComboboxOption(l.timezoneCombobox, details.timezone);
    if (details.date !== undefined) await l.dateInput.fill(details.date);
    if (details.title !== undefined) await l.titleInput.fill(details.title);
    // Confirmed against the running app: a free-text field, not a
    // master-data dropdown — see reasonInput in log-communication.locators.ts.
    if (details.reason !== undefined) await l.reasonInput.fill(details.reason);
    if (details.communicator !== undefined)
      await this.selectComboboxOption(l.communicatorCombobox, details.communicator);
    if (details.mom !== undefined) await l.momTextbox.fill(details.mom);
  }

  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }

  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.locators.toast).toBeVisible();
  }

  async expectLoggedEntryVisible(title: string): Promise<void> {
    await expect(this.locators.loggedEntry(title)).toBeVisible();
  }

  /** Opens a logged entry's own Details screen from the Communication tab's list. */
  async openLoggedCommunication(title: string): Promise<void> {
    await this.locators.openLoggedEntryButton(title).click();
  }

  /** Opens the "Notify Internally" dialog from a logged entry's Details screen — one click, does NOT send (see sendNotification). */
  async notifyInternally(): Promise<void> {
    await this.locators.notifyInternallyButton.click();
  }

  /**
   * Selects one Manager in the Notify Internally dialog's multi-select.
   * Confirmed against the running app: clicking the combobox opens a
   * SEPARATE popup dialog with a "Suggestions" listbox — clicking an
   * option does not close it, and pressing Escape clears the selection
   * instead of confirming it. Clicking the dialog's own heading (a
   * neutral point outside the popup) closes it while keeping the pick.
   */
  async selectNotifyManager(name: string): Promise<void> {
    await this.locators.notifyManagersCombobox.click();
    await this.page.getByRole('option', { name }).click();
    await this.locators.notifyDialog.getByRole('heading', { name: 'Notify Internally' }).click();
  }

  /** Completes a send from an already-open Notify Internally dialog and waits for its toast. */
  async sendNotification(): Promise<void> {
    await this.locators.sendNotificationsButton.click();
    await expect(this.locators.toast).toBeVisible();
  }

  async expectDialogClosed(): Promise<void> {
    await expect(this.locators.dialog).toBeHidden();
  }
}
