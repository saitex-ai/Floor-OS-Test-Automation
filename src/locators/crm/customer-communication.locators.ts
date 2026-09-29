import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Customer Communication screen's SUB-TAB
 * CONTAINER (CRM, Sprint 4) — the tablist that hosts Logged Communications /
 * Key Meeting Notes / Emails as one cohesive tabbed view on Customer
 * Details, its badges, list ordering, and empty states. No actions or
 * assertions here — see customer-communication.page.ts for those.
 *
 * Confirmed live against the running app (2026-09-25, local `tilt up`
 * stack, via throwaway `.scratch-comm-tab*.ts` probes, all deleted after):
 *
 * - The three page objects this story's brief named as likely-stale
 *   ("Communication tab is an unbuilt scaffold... Tab content — not built
 *   yet.", dated 2026-09-22) are confirmed CORRECTED as of today — the tab
 *   is real and fully built. Confirmed directly: clicking the top-level
 *   "Communication" button on Customer Details renders a
 *   `tablist "Communication views"` with exactly three tabs, in this exact
 *   order: "Logged Communications (N)", "Key Meeting Notes (N)", "Emails"
 *   (no numeric badge on Emails — see class doc on
 *   CustomerCommunicationPage for why that's real, not a locator gap).
 * - "Log a Communication" / "Generate Key Meeting Notes" / "New Email"
 *   toolbar buttons sit beside the tablist and are visible regardless of
 *   which sub-tab is active — confirmed unchanged across all three.
 * - Each sub-tab's content renders in a single `tabpanel` (only one visible
 *   at a time — same "unscoped is fine" precedent already established in
 *   communications-email.locators.ts).
 * - A logged communication's row detail view opens IN-PLACE on the same
 *   Customer Details screen (confirmed via URL:
 *   `?tab=comm&sub=logged&comm=<id>`, tab bar/breadcrumb unchanged) — this
 *   is the SAME detail screen `LogCommunicationPage.openLoggedCommunication()`
 *   already opens, not a separate screen. Its own "way back" control is a
 *   plain text link, "Back to Logged Communications" — not previously
 *   captured in log-communication.locators.ts, so it lives here instead
 *   (this story owns the sub-tab container's own back-navigation).
 * - Key Meeting Notes' own detail view + "Back to Key Meeting Notes" link
 *   (key-meeting-notes.locators.ts) is the same in-tab pattern — reused
 *   directly via KeyMeetingNotesPage, nothing new needed here.
 */
export class CustomerCommunicationLocators {
  // Confirmed directly (2026-09-25): still the same top-level Customer
  // Details tab-strip button every sibling page object under this section
  // already uses.
  readonly communicationTabButton: Locator;

  /** The tri-tab sub-tab strip itself — confirmed accessible name "Communication views". */
  readonly subTabList: Locator;

  // Confirmed accessible names, in confirmed left-to-right order. Regexes
  // (not exact) so they still match once a badge count changes.
  readonly loggedCommunicationsTab: Locator;
  readonly keyMeetingNotesTab: Locator;
  readonly emailsTab: Locator;

  /** Only one tabpanel is ever visible at a time — confirmed directly. */
  readonly activeTabPanel: Locator;

  // Logged Communications panel contents
  readonly loggedCommunicationsEmptyText: Locator;
  readonly loggedCommunicationRows: Locator;
  readonly backToLoggedCommunicationsLink: Locator;
  // Confirmed directly: the "DATE" field row is DD-MM-YYYY (same shape as
  // the list rows' <time>), but the separate "CREATED ON" field row is
  // YYYY-MM-DD HH:mm — a genuine formatting inconsistency within the SAME
  // detail view. Both kept as distinct locators so a test can assert each
  // independently rather than conflating them.
  readonly detailDateField: Locator;
  readonly detailCreatedOnField: Locator;

  // Key Meeting Notes panel contents
  readonly keyMeetingNotesEmptyText: Locator;

  // Emails panel contents — confirmed directly: this environment has no
  // Outlook integration configured at all, so the panel ALWAYS renders a
  // real `alert`-role explanatory message instead of a list, regardless of
  // record count. See class doc on CustomerCommunicationPage.
  readonly emailsUnavailableAlert: Locator;

  constructor(private readonly page: Page) {
    this.communicationTabButton = page.getByRole('button', { name: 'Communication', exact: true });

    this.subTabList = page.getByRole('tablist', { name: 'Communication views' });
    this.loggedCommunicationsTab = this.subTabList.getByRole('tab', { name: /^Logged Communications/ });
    this.keyMeetingNotesTab = this.subTabList.getByRole('tab', { name: /^Key Meeting Notes/ });
    this.emailsTab = this.subTabList.getByRole('tab', { name: /^Emails/ });

    this.activeTabPanel = page.getByRole('tabpanel');

    this.loggedCommunicationsEmptyText = this.activeTabPanel.getByText('No communications logged yet.');
    this.loggedCommunicationRows = this.activeTabPanel.getByRole('listitem');
    this.backToLoggedCommunicationsLink = page.getByText('Back to Logged Communications', { exact: true });
    // Confirmed against the running app: these field labels render visually
    // as "DATE"/"CREATED ON" via CSS `uppercase`, but the real DOM text
    // content is title-case ("Date"/"Created On") — getByText matches text
    // content, not the rendered transform, so the exact-match string has to
    // be the title-case form or these never match. The value itself sits in
    // a SIBLING wrapper div (not a direct sibling text node), one level
    // down from the label's own wrapper — following-sibling::*[1] from the
    // label targets that wrapper, and its innerText resolves to just the
    // value (the read-only lock icon beside it carries no visible text).
    this.detailDateField = page.getByText('Date', { exact: true }).locator('xpath=following-sibling::*[1]');
    this.detailCreatedOnField = page
      .getByText('Created On', { exact: true })
      .locator('xpath=following-sibling::*[1]');

    this.keyMeetingNotesEmptyText = this.activeTabPanel.getByText(
      'No key meeting notes yet — use Generate Key Meeting Notes.',
    );

    this.emailsUnavailableAlert = page.getByRole('alert').filter({
      hasText: 'Outlook is not set up on this environment, so emails cannot be shown.',
    });
  }

  /** A logged communication row's own title paragraph, by index in DOM (newest-first) order. */
  loggedCommunicationRowTitle(index: number): Locator {
    return this.loggedCommunicationRows.nth(index).getByRole('paragraph').first();
  }

  /** The `<time>` element on a logged communication row, by index — confirmed DD-MM-YYYY text content. */
  loggedCommunicationRowTime(index: number): Locator {
    return this.loggedCommunicationRows.nth(index).locator('time');
  }
}
