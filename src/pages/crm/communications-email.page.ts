import { type Page, expect, test } from '@playwright/test';
import { BasePage } from '../base.page';
import { CommunicationsEmailLocators } from '../../locators/crm/communications-email.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * From/To of the Outlook draft the "New Email" flow pre-populates
 * (FR-2.3). No `cc` — confirmed against the running app, this screen has
 * no CC field.
 */
export interface ExpectedRecipients {
  from?: string | RegExp;
  to?: string | RegExp;
}

/**
 * "View Logged Communications" (CRM, Sprint 2 user story) — the CRM's
 * Outlook integration: a "New Email" button that hands off to Outlook with
 * a pre-populated draft, an "Emails" tab listing past emails
 * chronologically, and a system notification on an incoming email. Owned by
 * the CRM QA.
 *
 * Confirmed against the running app (2026-09-23) — see the note atop
 * CommunicationsEmailLocators for the corrections that made. Same sibling
 * relationship to log-communication.page.ts as that file describes: same
 * Communication section of Customer/Contact Details, different
 * sub-feature (Outlook email vs. manual communication log).
 *
 * The load-bearing caveat for this whole file: every path here ends with
 * "redirects to Outlook" — an external application entirely outside this
 * Playwright framework's (and floorOS's) control. Nothing about Outlook's
 * own UI/mailbox/draft state is asserted anywhere below. What IS asserted,
 * and is genuinely CRM-side-observable:
 *   - the button/tab/notification exist, are visible, and are clickable;
 *   - the From/To fields the CRM itself renders before handoff are
 *     populated with the right values (FR-2.3) — this is CRM state, not
 *     Outlook's;
 *   - a redirect was *attempted* — approximated here by
 *     `page.context().waitForEvent('page')` on the assumption the handoff
 *     opens Outlook in a new browser tab (a plausible, common shape for an
 *     internal-app -> external-mailbox handoff, but NOT confirmed). If the
 *     real app instead does a same-tab `window.location` redirect or hands
 *     off via a plain `mailto:`/deep-link `<a href>`, `waitForNewOutlookTab()`
 *     below needs reworking to check that `href`/navigation instead — flagged
 *     inline at that method.
 */
export class CommunicationsEmailPage extends BasePage {
  readonly locators: CommunicationsEmailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CommunicationsEmailLocators(page);
  }

  /**
   * Opens the Communication section's Emails area from an existing
   * Customer's Details screen. Confirmed directly on local (2026-09-22):
   * Customer Details is a tabbed screen (Overview is the default tab) —
   * the Communication tab has to be selected first. Also confirmed the
   * same run: that tab is currently an unbuilt scaffold on this
   * environment ("Tab content — not built yet.") — rather than every
   * caller time out waiting on elements that can never appear, this
   * checks for that placeholder right after switching tabs and
   * test.skip()s with a clear reason (same pattern as
   * KeyMeetingNotesPage.openGenerateFromCustomerDetail()).
   */
  async openFromCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.communicationTabButton.click();
    const notBuilt = await this.locators.communicationTabNotBuiltPlaceholder
      .isVisible()
      .catch(() => false);
    test.skip(
      notBuilt,
      'Communication tab is an unbuilt scaffold placeholder on this environment (confirmed 2026-09-22 — "Tab content — not built yet.")',
    );
  }

  // ---------------------------------------------------------------------
  // New Email (FR-2.1 - FR-2.4, TC-1/TC-2/TC-7)
  // ---------------------------------------------------------------------

  async expectNewEmailButtonVisible(): Promise<void> {
    await expect(this.locators.newEmailButton).toBeVisible();
  }

  /** Clicks "New Email" — CRM-side observable: the button itself invokes a modal (TC-1). */
  async openNewEmailModal(): Promise<void> {
    await this.locators.newEmailButton.click();
  }

  async expectNewEmailModalVisible(): Promise<void> {
    await expect(this.locators.newEmailModal).toBeVisible();
  }

  /**
   * Asserts the draft preview's From/To fields match the expected
   * addresses (FR-2.3) — this is CRM-rendered state, fully attestable
   * without touching Outlook itself. Confirmed against the running app:
   * these are plain paragraphs, not form inputs, so matched by text
   * content, not `.toHaveValue()`.
   */
  async expectRecipientsPrepopulated(expected: ExpectedRecipients): Promise<void> {
    const l = this.locators;
    if (expected.from !== undefined) await expect(l.fromField).toContainText(expected.from);
    if (expected.to !== undefined) await expect(l.toField).toContainText(expected.to);
  }

  /**
   * Confirms the draft from the "New Email" modal, which the ClickUp story
   * says redirects to Outlook (FR-2.2/AC-2.1). Un-attestable part: anything
   * about the Outlook draft that opens. Attestable proxy used here: a new
   * browser tab/window opening, via `context().waitForEvent('page')`.
   *
   * TODO(CRM QA): confirmed only that this compiles against the assumed
   * modal shape — rework once live: if no new tab opens (e.g. a same-tab
   * navigation, or a `mailto:` link Playwright doesn't observe as a new
   * page), replace the `waitForEvent('page')` race below with whatever the
   * real mechanism turns out to be.
   */
  async confirmAndAwaitOutlookRedirect(): Promise<Page | null> {
    const newPagePromise = this.page
      .context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);
    await this.locators.composeInOutlookButton.click();
    return newPagePromise;
  }

  /** Cancels the "New Email" modal without triggering any Outlook handoff (TC-7). */
  async cancelNewEmail(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectNewEmailModalClosed(): Promise<void> {
    await expect(this.locators.newEmailModal).toBeHidden();
  }

  // ---------------------------------------------------------------------
  // Emails tab (FR-2.5 - FR-2.7, TC-3/TC-4 — both marked skip in ClickUp)
  // ---------------------------------------------------------------------

  async openEmailsTab(): Promise<void> {
    await this.locators.emailsTab.click();
  }

  async expectEmailVisible(subject: string): Promise<void> {
    await expect(this.locators.emailRow(subject)).toBeVisible();
  }

  /**
   * Clicking an email row is documented as redirecting to Outlook to read
   * it (FR-2.7) — same un-attestable boundary and same new-tab proxy as
   * confirmAndAwaitOutlookRedirect() above.
   */
  async openEmailAndAwaitOutlookRedirect(subject: string): Promise<Page | null> {
    const newPagePromise = this.page
      .context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);
    await this.locators.emailRow(subject).click();
    return newPagePromise;
  }

  // ---------------------------------------------------------------------
  // Email notification (FR-2.8 - FR-2.9, TC-5/TC-6 — both marked skip in ClickUp)
  // ---------------------------------------------------------------------

  async openNotificationsPanel(): Promise<void> {
    await this.locators.notificationsButton.click();
  }

  async expectIncomingEmailNotificationVisible(subject: string): Promise<void> {
    await expect(this.locators.notificationItem(subject)).toBeVisible();
  }

  /** Clicking the notification is documented as redirecting to Outlook (FR-2.9). */
  async clickNotificationAndAwaitOutlookRedirect(subject: string): Promise<Page | null> {
    const newPagePromise = this.page
      .context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);
    await this.locators.notificationItem(subject).click();
    return newPagePromise;
  }
}
