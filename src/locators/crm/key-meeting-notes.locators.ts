import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Key Meeting Notes" screens (CRM, Sprint 2)
 * — no actions or assertions here, see
 * src/pages/crm/key-meeting-notes.page.ts for those.
 *
 * TODO(CRM QA): NOT yet confirmed against the running app — this file is a
 * best guess built from three ClickUp user stories' text (Generate/View/
 * Notify about a Key Meeting Notes) and this framework's established UI
 * patterns (combobox popups, dialog-scoped buttons, sonner toasts, the
 * shell's "Notifications" banner button — see BasePage.gotoAuthenticated()),
 * the same way log-communication.locators.ts started out before its own
 * first live run. Re-derive every selector below via ariaSnapshot() against
 * a real Customer Details screen once the Communication section supports
 * Key Meeting Notes. See the three test-case docs
 * (test-cases/crm/generate-key-meeting-notes.md,
 * view-key-meeting-notes.md, notify-key-meeting-notes.md) for the full list
 * of open questions.
 *
 * This ONE locators class (paired with KeyMeetingNotesPage) covers all
 * three related user stories — same precedent as
 * customer-detail.locators.ts covering activate/deactivate/edit-contact.
 *
 * Specific assumptions baked in here (also called out in the .md notes):
 * - Generation is triggered from a button in the Customer/Contact Details
 *   "Communication" section (same section log-communication.locators.ts
 *   assumes "Log a Communication" lives in), or from a "Generate Key
 *   Meeting Notes" action on an individual logged-communication row.
 * - The "generation screen" and "review/edit screen" the Generate user
 *   story separately names are modeled as ONE dialog whose content changes
 *   (upload/ready state -> generating -> structured draft to review), not
 *   two distinct screens/routes — mirrors how "Log a Communication"
 *   models its whole flow as a single dialog.
 * - The notes' sections are modeled defensively for BOTH label sets seen in
 *   the ClickUp text: the Functional Requirements paragraph says "summary,
 *   discussion points, decisions, action items" while TC:3's own title says
 *   "(Agenda, Discussion Points, Action Items)" — genuinely inconsistent
 *   ClickUp text, not a typo we get to silently resolve. summaryOrAgenda*
 *   locators try both headings.
 * - The Key Meeting Notes "detail screen" (View user story) is modeled as
 *   its own dialog too (not a distinct route) — opened by clicking an entry
 *   in the Communication history list, the same way every other Sprint-2
 *   detail-ish view in this codebase (Log a Communication, Activate/
 *   Deactivate reason + confirm dialogs) renders as a dialog rather than a
 *   route. This is the single most likely thing to need rework once seen
 *   live, alongside the Date/Time sliders in log-communication.locators.ts.
 * - "Notify Internally" / "Notify the Customer" buttons and the audit
 *   history block are assumed to appear on that same detail dialog.
 * - The in-app notifications panel is assumed to open from the shell's
 *   existing "Notifications" banner button (the same one
 *   BasePage.gotoAuthenticated() already uses as its post-login marker).
 */
export class KeyMeetingNotesLocators {
  // Confirmed directly on local (2026-09-22): Customer Details renders as
  // a tab strip (Overview / Lead Qualification / Biz Docs / Communication /
  // Contacts (n)), not one long scrollable page — the Communication
  // section (and anything inside it, like the Generate button) only
  // exists once this tab is selected.
  readonly communicationTabButton: Locator;

  // Confirmed directly on local (2026-09-22): the Communication tab is
  // currently an unbuilt scaffold on this environment — its whole content
  // is literally "Tab content — not built yet." / "Scaffold placeholder —
  // no screen built yet." Every entry point in KeyMeetingNotesPage checks
  // this and test.skip()s rather than timing out waiting for a button
  // that can never appear.
  readonly communicationTabNotBuiltPlaceholder: Locator;

  // Entry points (Communication section of Customer/Contact Details)
  readonly generateFromCommunicationButton: Locator;

  // Generate/review dialog (one dialog, changing content across the flow)
  readonly generateDialog: Locator;
  readonly fileUploadInput: Locator;
  readonly readyToGenerateIndicator: Locator;
  readonly generateDraftButton: Locator;
  readonly generatingIndicator: Locator;

  // Structured draft sections (rendered inside generateDialog once
  // generation completes, and again read-only on the detail dialog)
  readonly summaryOrAgendaSection: Locator;
  readonly discussionPointsSection: Locator;
  readonly decisionsSection: Locator;
  readonly actionItemsSection: Locator;

  readonly notesTitleInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly generatedNoteTitle: Locator;

  // Notification actions (assumed present on the generate/review dialog
  // once notes exist, and again on the detail dialog for re-triggering)
  readonly notifyInternallyButton: Locator;
  readonly notifyCustomerButton: Locator;

  // Notify dialog — confirmed against the running app: clicking either
  // Notify button opens a REAL dialog (not a one-click dispatch), titled
  // "Notify Internally" or "Notify the Customer". Internal mode offers
  // empty Managers/Executives comboboxes to pick from; Customer mode's
  // "Customer" combobox comes PRE-FILLED with the customer's own name, so
  // Send needs no picking there. Both end in the same toast, only after
  // the send mutation actually resolves (see meeting-note-detail.tsx's
  // onSend — the dialog stays open and shows its own error on failure).
  readonly notifyDialog: Locator;
  readonly notifyManagersCombobox: Locator;
  readonly notifyExecutivesCombobox: Locator;
  readonly sendNotificationsButton: Locator;
  readonly notifyDialogCancelButton: Locator;

  // Communication history (existing "Communication" section on Customer
  // Details — same section log-communication.locators.ts targets)
  readonly communicationHistorySection: Locator;

  // Key Meeting Notes detail dialog (opened from a Communication-history
  // entry — see class doc for why this is modeled as a dialog, not a route)
  readonly detailDialog: Locator;
  readonly sourceInteractionText: Locator;
  /** Confirmed against the running app: literal link text, back to the list view. */
  readonly backToNotesListLink: Locator;

  // In-app notifications panel (shell-level, shared across every module)
  readonly notificationsBellButton: Locator;
  readonly notificationsPanel: Locator;

  readonly noRecipientsWarning: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.communicationTabButton = page.getByRole('button', { name: 'Communication', exact: true });
    this.communicationTabNotBuiltPlaceholder = page.getByText('Tab content — not built yet.');

    this.generateFromCommunicationButton = page.getByRole('button', {
      name: 'Generate Key Meeting Notes',
    });

    this.generateDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Generate Key Meeting Notes' });

    this.fileUploadInput = this.generateDialog.locator('input[type="file"]');
    // Confirmed against the running app: the upload row's status word is
    // bare "ready" (e.g. "53 B — ready"), not the phrase "ready to
    // generate" — the old regex never matched it.
    this.readyToGenerateIndicator = this.generateDialog.getByText(/\bready\b/i);
    // Confirmed against the running app: the button reads "Generate notes",
    // not bare "Generate" — the old exact-match regex never matched it,
    // timing out every test that reached this dialog.
    this.generateDraftButton = this.generateDialog.getByRole('button', {
      name: /^Generate notes$/i,
    });
    this.generatingIndicator = this.generateDialog.getByText(/generating/i);

    // Functional Requirements text says "summary" where TC:3's title says
    // "Agenda" — unresolved discrepancy in the source ClickUp text, so this
    // tries both rather than guessing which one is right. Deliberately
    // scoped to the whole page, not just generateDialog — these same
    // section headings are asserted again read-only on detailDialog (the
    // View Key Meeting Notes story), and only one such dialog is ever open
    // at a time.
    //
    // Confirmed against the running app: only the note's own title renders
    // as a real `heading` role ([level=2]) — "Agenda", "Discussion Points"
    // and "Action Items" are plain text labels, not headings. The old
    // getByRole('heading', ...) locators never matched them, so every
    // caller timed out even when generation genuinely succeeded.
    // Anchored (full-string) regexes, not plain substrings — confirmed
    // against the running app: the card's own "Structure: Agenda ·
    // Discussion Points · Action Items" breadcrumb line contains every one
    // of these phrases as a substring too, so an unanchored getByText
    // strict-mode-violates the moment both the breadcrumb and the real
    // section label are on screen together (only the View flow's detail
    // page happened to exercise this — the Generate dialog's TC:3 never
    // ran, being fixme'd).
    this.summaryOrAgendaSection = page.getByText(/^(Summary|Agenda)$/i);
    this.discussionPointsSection = page.getByText(/^Discussion Points$/i);
    this.decisionsSection = page.getByText(/^Decisions$/i);
    this.actionItemsSection = page.getByText(/^Action Items$/i);

    // Confirmed against the running app: there is no editable title field or
    // Save/Cancel step after generation at all. meeting-note-detail.tsx's own
    // docblock says so directly ("READ-ONLY, DELIBERATELY... No edit
    // affordance anywhere, matching the prototype") — generation persists
    // the note immediately with an AI-composed title, with nothing to fill
    // or save. Kept as a Locator (not removed) so a caller that still
    // references it fails fast and legibly rather than with a missing
    // property.
    this.notesTitleInput = page.getByLabel(/Key Meeting Notes Title|Title/i);
    this.saveButton = this.generateDialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.generateDialog.getByRole('button', { name: /Cancel|Close/ });
    // The note's own AI-composed title — confirmed against the running app
    // as the only `heading` at [level=2] on this view (the customer's own
    // name is level=1).
    this.generatedNoteTitle = page.getByRole('heading', { level: 2 });

    this.notifyInternallyButton = page.getByRole('button', { name: 'Notify Internally' });
    this.notifyCustomerButton = page.getByRole('button', { name: 'Notify the Customer' });

    this.notifyDialog = page
      .getByRole('dialog')
      .filter({ hasText: /Notify Internally|Notify the Customer/i });
    this.notifyManagersCombobox = this.notifyDialog.getByRole('combobox', { name: 'Managers' });
    this.notifyExecutivesCombobox = this.notifyDialog.getByRole('combobox', {
      name: 'Executives',
    });
    this.sendNotificationsButton = this.notifyDialog.getByRole('button', {
      name: 'Send notifications',
    });
    this.notifyDialogCancelButton = this.notifyDialog.getByRole('button', { name: 'Cancel' });

    // Not a heading confirmed to exist yet — matches the same "assume a
    // Communication section exists" caveat log-communication.locators.ts
    // already carries.
    this.communicationHistorySection = page.getByRole('heading', {
      name: /Communication( History)?/i,
    });

    // Confirmed against the running app: there is no dialog here at all.
    // Generating a note CLOSES the upload dialog and renders the note
    // inline, replacing the Communication tab's list view (a "← Back to
    // Key Meeting Notes" link, not a dialog close button) — same pattern
    // generate-meeting-notes-dialog.tsx's own docblock describes
    // ("GENERATION progress... belongs to the note"). Kept the property
    // name to avoid churning every call site; it now scopes to the whole
    // page, same reasoning as summaryOrAgendaSection above.
    this.detailDialog = page.locator('body');
    this.sourceInteractionText = page.getByText(/generated from/i);
    this.backToNotesListLink = page.getByText('Back to Key Meeting Notes');

    // Scoped to the shell's top banner — same disambiguation
    // BasePage.gotoAuthenticated() already documents (an unscoped
    // "Notifications" match also hits an unrelated "Control Center
    // Notifications" button elsewhere on the page).
    this.notificationsBellButton = page
      .getByRole('banner')
      .getByRole('button', { name: /Notifications/ });
    // Confirmed against the running app: this popover carries no distinct
    // `dialog`/`menu` role at all — its buttons ("Inbox", "Notification
    // actions", "Notification preferences") and content sit flattened
    // directly in the banner. "Inbox" is the one thing that only exists
    // once the popover is open, so it stands in for "the panel is open";
    // notificationItem() below searches the whole page rather than a
    // (non-existent) scoped container.
    this.notificationsPanel = page.getByRole('button', { name: 'Inbox' });

    this.noRecipientsWarning = page.getByText(/no (notification )?recipients configured/i);

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** A Key Meeting Notes entry's row in the Communication history, by its title. */
  keyMeetingNotesEntry(title: string): Locator {
    return this.page.getByText(title, { exact: false }).first();
  }

  /**
   * An individual action item within actionItemsSection, by its text.
   * Assumed to render as a list item — unconfirmed shape, see class doc.
   */
  actionItem(text: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: text });
  }

  /** The owner badge/tag on an action item, distinguishing it from plain discussion text. */
  actionItemOwner(owner: string): Locator {
    return this.page.getByText(new RegExp(`Owner:\\s*${owner}`, 'i'));
  }

  /** A system field row ("{Label} • {value}") on the detail dialog — same shape as customer-detail.locators.ts's fieldContainer(). */
  systemField(label: string): Locator {
    return this.detailDialog.getByText(label, { exact: false }).first();
  }

  /** A notification item in the notifications panel, by the title it names. */
  notificationItem(title: string): Locator {
    return this.page.getByText(title, { exact: false }).first();
  }

  /**
   * An audit/history entry on the detail dialog, by its text (e.g. a
   * notification-dispatch line). `.first()` — confirmed against the
   * running app: a repeated action (e.g. re-sending a notification) adds
   * another matching line rather than replacing it, so more than one match
   * is a real, expected outcome, not a strict-mode bug to "fix" upstream.
   */
  auditEntry(text: string | RegExp): Locator {
    return this.detailDialog.getByText(text).first();
  }
}
