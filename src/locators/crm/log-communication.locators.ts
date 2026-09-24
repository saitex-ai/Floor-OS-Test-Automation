import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Log a Communication" screen (CRM, Sprint 2
 * user story) — no actions or assertions here, see
 * src/pages/crm/log-communication.page.ts for those.
 *
 * TODO(CRM QA): NOT yet confirmed against the running app — this file is a
 * best guess built from the ClickUp story text and this framework's
 * established UI patterns (combobox popups, dialog-scoped buttons, sonner
 * toasts), the same way create-customer.locators.ts started out before its
 * first live run. Re-derive every selector below via ariaSnapshot() against
 * a real Customer Details screen once the Communication section exists,
 * the same way create-customer.locators.ts and customer-detail.locators.ts
 * were confirmed. See test-cases/crm/log-a-communication.md for the full
 * list of open questions (especially the Date/Time "slider controls").
 */
export class LogCommunicationLocators {
  // Confirmed directly on local (2026-09-22): Customer Details is a
  // tabbed screen (Overview / Lead Qualification / Biz Docs /
  // Communication / Contacts) — the top-level "Communication" tab must
  // be selected before logCommunicationButton exists, and on this
  // environment it's currently an unbuilt scaffold ("Tab content — not
  // built yet."). See LogCommunicationPage.openFromCustomerDetail().
  readonly communicationTabButton: Locator;
  readonly communicationTabNotBuiltPlaceholder: Locator;

  // Entry point (Communication section of Customer/Contact Details)
  readonly logCommunicationButton: Locator;

  // Logging screen (assumed to render as a dialog)
  readonly dialog: Locator;
  readonly mediumCombobox: Locator;
  readonly timezoneCombobox: Locator;
  readonly dateInput: Locator;
  readonly titleInput: Locator;
  readonly reasonInput: Locator;
  readonly communicatorCombobox: Locator;
  readonly momTextbox: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.communicationTabButton = page.getByRole('button', { name: 'Communication', exact: true });
    this.communicationTabNotBuiltPlaceholder = page.getByText('Tab content — not built yet.');

    this.logCommunicationButton = page.getByRole('button', { name: 'Log a Communication' });

    this.dialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Log a Communication' });

    // Confirmed against the running app: every required field's accessible
    // name carries a trailing " *" (e.g. "Communication Medium *") — the old
    // `exact: true` + bare label never matched any of them. Dropping
    // `exact` (substring match) is simplest and survives the marker either
    // way.
    this.mediumCombobox = this.dialog.getByRole('combobox', { name: 'Communication Medium' });
    this.timezoneCombobox = this.dialog.getByRole('combobox', { name: 'Timezone' });
    // Confirmed against the running app: Date is a single native date
    // input, not the "slider controls" the ClickUp text describes — no
    // separate Time field exists on this screen at all.
    this.dateInput = this.dialog.getByRole('textbox', { name: 'Date' });
    this.titleInput = this.dialog.getByLabel('Communication Title');
    // Confirmed against the running app: "Communication Reason" renders as
    // a free-text textbox, not a master-data-driven combobox — the old role
    // was simply wrong, not just a naming mismatch.
    this.reasonInput = this.dialog.getByRole('textbox', { name: 'Communication Reason' });
    this.communicatorCombobox = this.dialog.getByRole('combobox', { name: 'Communicator' });
    this.momTextbox = this.dialog.getByLabel(/MOM|Minutes of Meeting/i);

    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.dialog.getByRole('button', { name: /Cancel|Close/ });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** A logged communication's row in the Communication section, by its Title. */
  loggedEntry(title: string): Locator {
    return this.page.getByText(title, { exact: false }).first();
  }
}
