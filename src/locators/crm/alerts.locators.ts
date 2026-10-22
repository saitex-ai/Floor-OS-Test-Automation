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
 *   email IDs; Customer sharing's "To" is a multi-select of Customer
 *   and Contact email addresses grouped by Customer (corrected
 *   2026-10-15 — earlier described as a single-Customer picker), with a
 *   separate optional "CC" multi-select of user email IDs.
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
  /** Read-only "From" value — a plain `<p>` ("Name <email>"), not an input (confirmed 2026-10-15). */
  readonly emailFromValue: Locator;
  /** Any text box in the Email dialog — there should be none (From is plain text; To/CC are comboboxes). */
  readonly emailDialogTextboxes: Locator;
  readonly emailFromCombobox: Locator;
  /** "Email Body — Alert Details" preview — a whitespace-pre-wrap `<div>` holding exactly the text handed to Outlook as the body. */
  readonly emailBodyPreview: Locator;
  /** The search box at the top of an open To/CC recipient popover (only one popover is ever open). */
  readonly recipientSearchInput: Locator;
  readonly redirectedToOutlookToast: Locator;

  // Detail screen content (for "record unchanged" checks)
  readonly alertTitleHeading: Locator;
  /** The detail screen's own inner `main` (the outer app-shell `main` also holds toasts). */
  readonly alertDetailContent: Locator;
  readonly userMenuButton: Locator;

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
    this.redirectToOutlookButton = this.emailDialog.getByRole('button', {
      name: 'Redirect to Outlook',
    });
    this.emailCancelButton = this.emailDialog.getByRole('button', { name: 'Cancel', exact: true });
    // Confirmed 2026-10-15 (Sprint 5 "Email an Alert"): From is the only
    // paragraph in the dialog; the body preview is the only div directly
    // following the "Email Body — Alert Details" label.
    this.emailFromValue = this.emailDialog.getByRole('paragraph').first();
    this.emailDialogTextboxes = this.emailDialog.getByRole('textbox');
    this.emailFromCombobox = this.emailDialog.getByRole('combobox', { name: 'From' });
    this.emailBodyPreview = this.emailDialog
      .locator('label', { hasText: 'Email Body — Alert Details' })
      .locator('xpath=following-sibling::div[1]');
    this.recipientSearchInput = page.getByRole('textbox', { name: 'Search…' });
    this.redirectedToOutlookToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Redirected to Outlook' })
      .first();

    this.alertTitleHeading = page.getByRole('heading', { level: 1 });
    this.alertDetailContent = page
      .getByRole('main')
      .filter({ has: page.getByRole('link', { name: 'Back to alerts' }) })
      .last();
    this.userMenuButton = page.getByRole('banner').getByRole('button', { name: /^Open user menu/ });

    // Confirmed against the running app: "Delete this Alert?" with a
    // plain Cancel/Confirm pair — no "type the alert name to confirm"
    // step as the ClickUp text guessed. TC:5 never actually clicks
    // Confirm (see alerts.page.ts's class doc on why).
    this.deleteConfirmDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Delete this Alert?' });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Confirm',
      exact: true,
    });
    this.deleteCancelButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
  }

  /** A status/category tab on the List screen, by its bare name — accessible name carries a live count suffix, e.g. "Garment Trims 3". */
  statusTab(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name} \\d+$`) });
  }

  /** A row in the alerts table, by its Alert title (partial match — titles are long). */
  alertRow(titleSubstring: string): Locator {
    return this.page.getByRole('row').filter({ hasText: titleSubstring });
  }

  /**
   * The open To/CC recipient popover's listbox (the popover is a separate
   * `dialog` portal, outside the Email dialog; its listbox is labelled
   * after its field). Customer "To" renders one `group` per Customer
   * (aria-label = Customer name), the Customer's own email first, then its
   * Contacts; each `option`'s accessible name is "<email> <person/customer name>".
   */
  recipientListbox(field: 'To' | 'CC'): Locator {
    return this.page.getByRole('listbox', { name: field, exact: true });
  }

  /** One recipient option by its exact email address (the accessible name starts with it). */
  recipientOption(field: 'To' | 'CC', email: string): Locator {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.recipientListbox(field).getByRole('option', {
      name: new RegExp(`^${escaped}( |$)`),
    });
  }

  /** Text inside the Email dialog (e.g. an inline validation error). */
  emailDialogText(text: string): Locator {
    return this.emailDialog.getByText(text);
  }

  /** The open recipient popover's empty state: "No match for “<query>”" (confirmed 2026-10-21). */
  recipientNoMatch(query: string): Locator {
    return this.page.getByText(`No match for “${query}”`, { exact: true });
  }

  /** A Customer's group in the Customer "To" list, by exact Customer name. */
  recipientGroup(customerName: string): Locator {
    return this.recipientListbox('To').getByRole('group', { name: customerName, exact: true });
  }
}
