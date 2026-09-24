import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "View Logged Communications" (Outlook email
 * integration) area of the Communication section, Customer/Contact Details
 * screen (CRM, Sprint 2 user story) — no actions or assertions here, see
 * src/pages/crm/communications-email.page.ts for those.
 *
 * Confirmed against the running app (2026-09-23) — corrections to the
 * original ClickUp-text guesses:
 * - The "New Email" modal shows a From/To preview (confirmed), but with
 *   NO CC field — only From and To exist.
 * - From/To are plain, non-labelled paragraphs, not form inputs — there is
 *   no `<label>` association, so `getByLabel` never matches them. Each
 *   value is a `<p>` immediately following its own "From"/"To" text node.
 * - From shows the CURRENTLY LOGGED-IN CRM user (e.g.
 *   "Alice Planner <alice@flooros.dev>"), not a fixed address — the
 *   sender is whoever is signed in, not a static From address.
 * - The confirm button reads "Redirect to Outlook" (not "Compose in
 *   Outlook"/"Open in Outlook").
 *
 * Still unconfirmed: whatever actually triggers the Outlook handoff
 * (composeInOutlookButton, an email row, or a notification item) is
 * assumed to open Outlook in a new browser tab/window (observable via
 * `page.context().on('page', ...)` in CommunicationsEmailPage). If the
 * real app instead does a same-tab `window.location` redirect or a
 * `mailto:`/deep-link `<a href>`, the redirect assertion in the page
 * object needs rework — see the TODOs there.
 */
export class CommunicationsEmailLocators {
  // Confirmed directly on local (2026-09-22): Customer Details is a tabbed
  // screen (Overview / Lead Qualification / Biz Docs / Communication /
  // Contacts) — the top-level "Communication" tab must be selected before
  // anything below exists, and on this environment it's currently an
  // unbuilt scaffold ("Tab content — not built yet."). See
  // CommunicationsEmailPage.openFromCustomerDetail().
  readonly communicationTabButton: Locator;
  readonly communicationTabNotBuiltPlaceholder: Locator;

  // Entry point (Communication section of Customer/Contact Details)
  readonly newEmailButton: Locator;
  readonly emailsTab: Locator;

  // "New Email" modal (assumed shape — see class doc above)
  readonly newEmailModal: Locator;
  readonly fromField: Locator;
  readonly toField: Locator;
  readonly composeInOutlookButton: Locator;
  readonly cancelButton: Locator;

  // Emails tab contents (TC-3/TC-4 — both marked skip in ClickUp; kept here
  // for completeness of the screen, not exercised by any non-skipped test)
  readonly emailsPanel: Locator;
  readonly emailRows: Locator;

  // System notification for an incoming Customer/Contact email (TC-5/TC-6 —
  // both marked skip in ClickUp). Reuses the shell banner's Notifications
  // button — see the comment on BasePage.gotoAuthenticated() for why that's
  // scoped to `banner` specifically (an unscoped match hits a second,
  // unrelated "Control Center Notifications" button elsewhere on the page).
  readonly notificationsButton: Locator;
  readonly notificationsPanel: Locator;

  constructor(private readonly page: Page) {
    this.communicationTabButton = page.getByRole('button', { name: 'Communication', exact: true });
    this.communicationTabNotBuiltPlaceholder = page.getByText('Tab content — not built yet.');

    this.newEmailButton = page.getByRole('button', { name: 'New Email' });
    this.emailsTab = page.getByRole('tab', { name: 'Emails' });

    this.newEmailModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'New Email' });
    // Confirmed against the running app: From/To are plain, non-labelled
    // paragraphs — "From"/"To" render as their own text node, immediately
    // followed by a sibling `<p>` holding the value (getByLabel never
    // matches — there is no <label> association at all). There is no CC
    // field on this screen. From shows the logged-in CRM user (e.g.
    // "Alice Planner <alice@flooros.dev>"), not a fixed address.
    this.fromField = this.newEmailModal
      .getByText('From', { exact: true })
      .locator('xpath=following-sibling::p[1]');
    this.toField = this.newEmailModal
      .getByText('To', { exact: true })
      .locator('xpath=following-sibling::p[1]');
    // Confirmed against the running app: the real label is "Redirect to
    // Outlook", not "Compose in Outlook"/"Open in Outlook".
    this.composeInOutlookButton = this.newEmailModal.getByRole('button', {
      name: 'Redirect to Outlook',
    });
    this.cancelButton = this.newEmailModal.getByRole('button', { name: 'Cancel' });

    // Only one tabpanel is expected visible at a time — unscoped is fine
    // until proven otherwise against a real multi-tab Communication section.
    this.emailsPanel = page.getByRole('tabpanel');
    this.emailRows = this.emailsPanel.getByRole('listitem');

    this.notificationsButton = page
      .getByRole('banner')
      .getByRole('button', { name: /Notifications/ });
    this.notificationsPanel = page
      .getByRole('dialog')
      .or(page.getByRole('menu'))
      .filter({
        hasText: /Notifications/i,
      });
  }

  /** A row in the Emails tab list, located by its Email Subject (FR-2.6). */
  emailRow(subject: string): Locator {
    return this.emailsPanel.getByText(subject, { exact: false }).first();
  }

  /** A system notification for an incoming email, located by its subject/text. */
  notificationItem(subject: string): Locator {
    return this.notificationsPanel.getByText(subject, { exact: false }).first();
  }
}
