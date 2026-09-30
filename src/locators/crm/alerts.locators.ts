import { type Locator, type Page } from '@playwright/test';

/** Alerts list, under the CRM module (confirmed against the running app). */
export const ALERTS_LIST_PATH = '/crm/alerts';

/**
 * Raw element locators for the "Alert Detail Screen" (CRM, Sprint 3 user
 * story) — no actions or assertions here, see src/pages/crm/alerts.page.ts
 * for those.
 *
 * Confirmed against the running app (2026-09-25):
 * - Alerts (regulatory-compliance alerts: type/region/effective dates,
 *   AI-generated Regulations/Impact-on-SAITEX/Official-Source sections)
 *   are ENTIRELY AI/system-generated — there is NO "Create Alert" button
 *   anywhere in the UI. The seed pool in this environment is a FIXED,
 *   NON-REPLENISHABLE set of 6 alerts. Deleting one (TC:5) is therefore
 *   genuinely destructive with no way to recreate it via the UI — see
 *   alerts.page.ts's class doc for how this suite handles that.
 * - "Checked"/"Unchecked" is a simple, REVERSIBLE toggle (button label
 *   flips between "Check"/"Uncheck", confirmed both directions work) —
 *   safe to exercise repeatedly.
 * - "Email Alert Internally" and "Email Alert to Customer" are NOT a
 *   direct-send action — they're the same "Email Preview... composing
 *   continues in Outlook" / "Redirect to Outlook" handoff pattern
 *   already confirmed for Communications Email (see
 *   communications-email.locators.ts) and Key Meeting Notes/Log a
 *   Communication's own Notify Internally flows. From is the logged-in
 *   user (read-only); Internal sharing's "To" is a multi-select of user
 *   email IDs; Customer sharing's "To" is a single-Customer picker with
 *   a separate optional "CC" multi-select of user email IDs.
 * - The Official Source section renders its URL as a real `link`, not a
 *   button — a plain `target="_blank"` new-tab open is the expected
 *   mechanism (same un-attestable-external-page boundary as every other
 *   "opens in Outlook/opens in a new tab" flow elsewhere in this app).
 */
export class AlertsLocators {
  // List screen
  readonly pageHeading: Locator;
  readonly searchInput: Locator;

  // Detail screen
  readonly emailInternallyButton: Locator;
  readonly emailToCustomerButton: Locator;
  readonly checkButton: Locator;
  readonly uncheckButton: Locator;
  readonly deleteAlertButton: Locator;
  readonly officialSourceLink: Locator;
  readonly toast: Locator;

  // Email dialogs (shared shape — From/To[/CC]/body preview/Cancel/Redirect to Outlook)
  readonly emailDialog: Locator;
  /** The "To" combobox — multi-select of user email IDs on the Internal dialog, single-Customer picker on the Customer dialog (same locator works for both; only one dialog is ever open). */
  readonly toCombobox: Locator;
  readonly customerCcCombobox: Locator;
  readonly redirectToOutlookButton: Locator;
  readonly emailCancelButton: Locator;

  // Delete confirmation
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.pageHeading = page.getByRole('heading', { name: 'Alerts', level: 1 });
    this.searchInput = page.getByRole('textbox', { name: 'Search' });

    this.emailInternallyButton = page.getByRole('button', { name: 'Email Alert Internally' });
    this.emailToCustomerButton = page.getByRole('button', { name: 'Email Alert to Customer' });
    this.checkButton = page.getByRole('button', { name: 'Check', exact: true });
    this.uncheckButton = page.getByRole('button', { name: 'Uncheck' });
    this.deleteAlertButton = page.getByRole('button', { name: 'Delete alert' });
    // Confirmed against the running app: the only external (http[s])
    // link on this screen — simplest reliable way to target it without
    // an assumed container around the "Official Source" heading.
    this.officialSourceLink = page.locator('a[href^="http"]').last();
    this.toast = page.locator('[data-sonner-toast]').first();

    this.emailDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /^Email Alert/ });
    this.toCombobox = this.emailDialog.getByRole('combobox', { name: 'To', exact: true });
    this.customerCcCombobox = this.emailDialog.getByRole('combobox', { name: 'CC', exact: true });
    this.redirectToOutlookButton = this.emailDialog.getByRole('button', { name: 'Redirect to Outlook' });
    this.emailCancelButton = this.emailDialog.getByRole('button', { name: 'Cancel', exact: true });

    // Confirmed against the running app: "Delete this Alert?" with a
    // plain Cancel/Confirm pair — no "type the alert name to confirm"
    // step as the ClickUp text guessed. TC:5 never actually clicks
    // Confirm (see alerts.page.ts's class doc on why).
    this.deleteConfirmDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Delete this Alert?' });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', { name: 'Confirm', exact: true });
    this.deleteCancelButton = this.deleteConfirmDialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** A status/category tab on the List screen, by its bare name — accessible name carries a live count suffix, e.g. "Garment Trims 3". */
  statusTab(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name} \\d+$`) });
  }

  /** A row in the alerts table, by its Alert title (partial match — titles are long). */
  alertRow(titleSubstring: string): Locator {
    return this.page.getByRole('row').filter({ hasText: titleSubstring });
  }
}
