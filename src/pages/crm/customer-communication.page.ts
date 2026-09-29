import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerCommunicationLocators } from '../../locators/crm/customer-communication.locators';
import { LogCommunicationPage, type CommunicationLogDetails } from './log-communication.page';
import { KeyMeetingNotesPage } from './key-meeting-notes.page';
import { CommunicationsEmailPage } from './communications-email.page';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

export type CommunicationSubTab = 'logged' | 'notes' | 'emails';

/**
 * "Customer Communication screen" (CRM, Sprint 4) — the tri-tab container
 * on Customer Details that consolidates three previously separate Sprint-2
 * stories (Log a Communication, Key Meeting Notes, View Logged
 * Communications' Emails tab) into one cohesive tabbed view with badge
 * counts. Owned by the CRM QA.
 *
 * Confirmed LIVE against the running app (2026-09-25, local `tilt up`
 * stack) via throwaway `.scratch-comm-tab*.ts` probes (all deleted after
 * use — none left in the repo). This corrects a real, dated assumption in
 * three sibling page objects: `LogCommunicationPage`, `KeyMeetingNotesPage`,
 * and `CommunicationsEmailPage` each carry a 2026-09-22 comment claiming
 * the Communication tab is "an unbuilt scaffold" — that was true THEN, but
 * is stale now. The tab is real, fully built, and is EXACTLY those three
 * stories consolidated: clicking "Communication" on Customer Details
 * renders a `tablist "Communication views"` with three tabs, in this exact
 * confirmed order: "Logged Communications (N)", "Key Meeting Notes (N)",
 * "Emails" — matching TC:1's required sequence.
 *
 * Rather than re-implement any of the three already-confirmed underlying
 * flows, this page composes the three existing page objects (same `page`
 * instance) and calls straight into their already-confirmed methods for
 * every mutating/detail-view step (logging a communication, generating Key
 * Meeting Notes, opening a logged entry's or note's own detail view,
 * Notify Internally, the New Email modal). This page object's OWN
 * responsibility — the thing that didn't exist anywhere else — is the
 * sub-tab container itself: switching tabs, reading badge counts, reading
 * list order (newest-first), each sub-tab's real empty state, and the
 * Emails sub-tab's real (confirmed) unavailability in this environment.
 *
 * Real, confirmed findings worth flagging to whoever picks this up next:
 *
 * - The "Emails" tab carries NO numeric badge at all (unlike the other
 *   two), in every state observed. Root cause, confirmed directly: this
 *   environment has no Outlook integration configured — the Emails panel
 *   ALWAYS renders a real `alert`-role message, "Outlook is not set up on
 *   this environment, so emails cannot be shown.", regardless of how many
 *   (if any) emails might exist. Whether Emails ever shows a count once a
 *   real Outlook integration is configured is genuinely unconfirmable from
 *   here.
 * - Because of the above, TC:2/TC:5 (participant-based email filtering)
 *   are NOT attestable in this environment at all — there is no way to
 *   produce even one visible email, let alone two with differing
 *   participant sets. See customerCommunication.expectEmailsUnavailable()
 *   and the spec's `test.fixme()`s for TC:2/TC:5.
 * - A logged communication's/Key Meeting Note's detail view opens IN-PLACE
 *   on the SAME Customer Details screen (confirmed via URL query params,
 *   e.g. `?tab=comm&sub=logged&comm=<id>`) — not a separate route/screen.
 *   This is the exact same detail screen `LogCommunicationPage`/
 *   `KeyMeetingNotesPage` already open; reused directly here, not rebuilt.
 * - No dedicated audit/history UI section was found anywhere on this
 *   screen (or on Customer Details generally) — same confirmed absence
 *   `contact-detail.locators.ts` already documents for Contact Detail.
 *   Sending "Notify Internally" from a logged communication's detail view
 *   is confirmed to dispatch for real (toast "Notifications sent — {user}"
 *   appears, and the send only resolves once the mutation completes — see
 *   LogCommunicationPage.sendNotification()), but TC:3's literal claim that
 *   the event "records properly in the Customer's audit history" is NOT
 *   independently verifiable through this UI — there's simply no audit/
 *   history view to read it back from.
 * - Timestamp formatting is genuinely INCONSISTENT across this screen —
 *   see expectDateFieldFormat()/expectCreatedOnFieldFormat() below and
 *   TC:7 in the spec. The list rows and the detail view's own "Date" field
 *   both use DD-MM-YYYY; Key Meeting Notes' list/detail timestamps use
 *   DD-MM-YYYY HH:mm; but the Logged Communication detail view's own
 *   "Created On" field uses YYYY-MM-DD HH:mm — a different format than the
 *   "Date" field directly above it on the SAME screen. Real, confirmed app
 *   behavior, not a locator bug — worth flagging to product/dev.
 * - Switching sub-tabs while "Log a Communication" is open is not merely
 *   *warned against* — it's structurally impossible: the dialog is a real
 *   modal that removes the rest of the page (including the sub-tab strip)
 *   from the accessibility tree while open (confirmed: `getByRole('tab',
 *   ...)` finds zero matches with the dialog open). See
 *   expectSubTabsUnreachableWhileDialogOpen() and TC:8 in the spec.
 */
export class CustomerCommunicationPage extends BasePage {
  readonly locators: CustomerCommunicationLocators;

  /** Composed, not re-implemented — see class doc. */
  readonly logCommunication: LogCommunicationPage;
  readonly keyMeetingNotes: KeyMeetingNotesPage;
  readonly email: CommunicationsEmailPage;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerCommunicationLocators(page);
    this.logCommunication = new LogCommunicationPage(page);
    this.keyMeetingNotes = new KeyMeetingNotesPage(page);
    this.email = new CommunicationsEmailPage(page);
  }

  /**
   * Opens the Communication tab (the tri-sub-tab container) from an
   * existing Customer's Details screen. Confirmed directly (2026-09-25):
   * the tab is real and built — no "unbuilt scaffold" placeholder check
   * needed here (that placeholder no longer exists on this environment).
   */
  async openFromCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.communicationTabButton.click();
    await expect(this.locators.subTabList).toBeVisible();
  }

  /** Reads the three sub-tabs' accessible names, in DOM (left-to-right) order — TC:1's sequence check. */
  async subTabNames(): Promise<string[]> {
    return this.locators.subTabList.getByRole('tab').allInnerTexts();
  }

  /**
   * Switches to a sub-tab. Bakes in a short settle wait after the click —
   * confirmed the hard way (same debounce/transition-race pattern flagged
   * elsewhere in this suite, e.g. external-events.page.ts's tab switches):
   * reading the panel immediately after the click can catch it mid-render.
   */
  async selectSubTab(tab: CommunicationSubTab): Promise<void> {
    const target =
      tab === 'logged'
        ? this.locators.loggedCommunicationsTab
        : tab === 'notes'
          ? this.locators.keyMeetingNotesTab
          : this.locators.emailsTab;
    await target.click();
    await this.page.waitForTimeout(600);
  }

  async expectSubTabSelected(tab: CommunicationSubTab): Promise<void> {
    const target =
      tab === 'logged'
        ? this.locators.loggedCommunicationsTab
        : tab === 'notes'
          ? this.locators.keyMeetingNotesTab
          : this.locators.emailsTab;
    await expect(target).toHaveAttribute('aria-selected', 'true');
  }

  /** The badge count baked into a sub-tab's own accessible name, e.g. "Logged Communications (2)" -> 2. Emails carries no badge (see class doc) — returns null for it. */
  async subTabCount(tab: CommunicationSubTab): Promise<number | null> {
    const target =
      tab === 'logged'
        ? this.locators.loggedCommunicationsTab
        : tab === 'notes'
          ? this.locators.keyMeetingNotesTab
          : this.locators.emailsTab;
    // Confirmed under concurrent-worker load (same debounce/transition race
    // flagged elsewhere in this suite): the tab's accessible name can
    // briefly render WITHOUT its "(N)" badge yet (e.g. plain "Logged
    // Communications" for a beat before "(0)" resolves) right after the
    // Communication tab first mounts. Emails never carries a badge at all
    // (see class doc), so only wait for one on the other two.
    if (tab !== 'emails') {
      await expect(target).toHaveText(/\(\d+\)/, { timeout: 5_000 }).catch(() => undefined);
    }
    const text = await target.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? Number(match[1]) : null;
  }

  /** Logged Communications row titles, in DOM (rendered) order — TC:1's newest-first sorting check. */
  async loggedCommunicationTitlesInOrder(): Promise<string[]> {
    const count = await this.locators.loggedCommunicationRows.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      titles.push((await this.locators.loggedCommunicationRowTitle(i).innerText()).trim());
    }
    return titles;
  }

  async expectLoggedCommunicationsEmptyState(): Promise<void> {
    await expect(this.locators.loggedCommunicationsEmptyText).toBeVisible();
  }

  async expectKeyMeetingNotesEmptyState(): Promise<void> {
    await expect(this.locators.keyMeetingNotesEmptyText).toBeVisible();
  }

  /** Confirmed real, environment-wide state (see class doc) — not a per-Customer empty state. */
  async expectEmailsUnavailable(): Promise<void> {
    await expect(this.locators.emailsUnavailableAlert).toBeVisible();
  }

  // -------------------------------------------------------------------
  // Thin wrappers over the composed page objects — kept here purely for
  // spec readability (calling `customerCommunicationPage.logAndSave(...)`
  // instead of reaching into `.logCommunication`), never re-implementing
  // their already-confirmed logic.
  // -------------------------------------------------------------------

  /** Logs a communication via the toolbar button already on this screen (does NOT re-navigate). */
  async logCommunicationViaToolbar(details: CommunicationLogDetails): Promise<void> {
    await this.page.getByRole('button', { name: 'Log a Communication' }).click();
    await this.logCommunication.fill(details);
    await this.logCommunication.save();
    await this.logCommunication.expectSavedSuccessfully();
  }

  /** Opens a Logged Communications entry's own in-tab detail view. */
  async openLoggedCommunicationDetail(title: string): Promise<void> {
    await this.logCommunication.openLoggedCommunication(title);
  }

  /** The detail view's own "way back" link — confirmed plain text, not a dialog-close button. */
  async backToLoggedCommunicationsList(): Promise<void> {
    await this.locators.backToLoggedCommunicationsLink.click();
  }

  /** DD-MM-YYYY — confirmed shape of the detail view's own "Date" field AND every list row's `<time>`. */
  async expectDateFieldFormat(): Promise<void> {
    await expect(this.locators.detailDateField).toHaveText(/^\d{2}-\d{2}-\d{4}$/);
  }

  /**
   * YYYY-MM-DD HH:mm — confirmed shape of the detail view's own "Created
   * On" field. Deliberately a DIFFERENT regex than expectDateFieldFormat()
   * — this is the confirmed, real inconsistency documented in the class
   * doc, not a mistake being normalized away.
   */
  async expectCreatedOnFieldFormat(): Promise<void> {
    await expect(this.locators.detailCreatedOnField).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  }

  /**
   * TC:8 — confirmed real guard: with "Log a Communication" open, the
   * sub-tab strip is unreachable (removed from the accessibility tree by
   * the modal), not merely unresponsive. Opens the dialog, dirties the
   * title field, asserts the sub-tabs cannot be found, then cancels.
   */
  async expectSubTabsUnreachableWhileLogCommunicationDialogOpen(): Promise<void> {
    await this.page.getByRole('button', { name: 'Log a Communication' }).click();
    await this.logCommunication.expectDialogVisible();
    await this.logCommunication.locators.titleInput.fill('Dirty draft — should block sub-tab navigation');
    await expect(this.locators.keyMeetingNotesTab).toHaveCount(0);
    await expect(this.locators.emailsTab).toHaveCount(0);
    await this.logCommunication.cancel();
    await this.logCommunication.expectDialogClosed();
  }
}
