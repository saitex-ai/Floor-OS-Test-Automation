import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Scan&Create Customer/Contact" screen (CRM,
 * Sprint 2 user story) — no actions or assertions here, see
 * src/pages/crm/scan-create.page.ts for those.
 *
 * Confirmed against the running app (2026-09-23), including a full,
 * real, reproducible extraction run (real business-card PDF, local
 * vision model — see scan-create.page.ts's class doc for the
 * environment fix that made that possible). Corrections this made to
 * the original ClickUp-text guesses:
 *
 * - "Scan & Create" is a `menuitem` inside the Customers list's "More
 *   actions" dropdown, not a standalone button.
 * - There is NO `<section>`/`<fieldset>` wrapper around the three
 *   post-scan groups (Contact Profile / Customer Profile / Customer
 *   Management) — confirmed directly (a `section` locator query
 *   returned zero matches). It's one flat form, and several field
 *   LABELS are used verbatim in both the Contact Profile and Customer
 *   Profile groups (Email, Phone, Fax, Address, City, State, Postal
 *   Code, Country, LinkedIn, Facebook, Instagram) — the only reliable
 *   way to disambiguate them is DOM order: Contact Profile's fields
 *   render first, so `.nth(0)` is the Contact field and `.nth(1)` is
 *   the Customer one, for every duplicated label.
 * - Customer Management has exactly FOUR dropdowns — CRM Stage, Origin
 *   Type, Origin, Buyer. There is NO Owner, Business Process, Assignee,
 *   or Referred By field anywhere on this screen (unlike manual Create
 *   Customer) — confirmed by reading the full post-scan form.
 * - There is NO "link to an existing Customer" dropdown for the Contact
 *   at all. Scan & Create always creates a NEW Customer alongside the
 *   Contact and links them 1:1 automatically (the Customer Profile
 *   group's own subtitle says exactly this: "The contact will be
 *   linked to this customer on save").
 * - The Save button reads "Save customer & contact", not "Save".
 * - Save does NOT open a "created successfully" modal — it redirects
 *   straight to the new Customer's own Details screen, with an in-app
 *   toast reading "{Customer} + {Contact} created from scan".
 * - There is NO "Creation Method" system field on the resulting Customer
 *   (its System section is the same Customer Code/Created On/Created
 *   By/Updated On/Updated By shape every other Customer has) — the
 *   toast text above is the closest real analog to FR-9's intent.
 * - A failed/timed-out scan renders a distinct "Scan failed" state
 *   (heading + message + "Choose another file"/"Enter the details
 *   manually"/"Try again" buttons), not a silent empty form.
 */
export class ScanCreateLocators {
  // Entry point (Customers list). "Scan & Create" is a `menuitem` inside
  // the list's "More actions" dropdown menu.
  readonly moreActionsButton: Locator;
  readonly scanCreateMenuItem: Locator;

  // Upload / capture provisions (FR-1, TC:1)
  readonly fileUploadInput: Locator;
  readonly capturePhotoButton: Locator;
  readonly startScanButton: Locator;
  readonly scanningIndicator: Locator;

  // Post-scan outcome messages (no `<section>` wrapper exists — see class doc)
  readonly scanCompleteMessage: Locator;
  readonly noValuesReadMessage: Locator;
  readonly scanFailedHeading: Locator;
  readonly tryAgainButton: Locator;
  readonly enterManuallyButton: Locator;

  // Contact Profile fields — unique labels, no ambiguity
  readonly contactNameInput: Locator;
  readonly designationInput: Locator;

  // Customer Profile fields — unique labels, no ambiguity
  readonly customerNameInput: Locator;

  // Fields whose LABEL is reused verbatim between Contact Profile and
  // Customer Profile — disambiguated by DOM order (see class doc).
  readonly contactEmailInput: Locator;
  readonly customerEmailInput: Locator;
  readonly contactPhoneInput: Locator;
  readonly customerPhoneInput: Locator;
  readonly contactCityInput: Locator;
  readonly customerCityInput: Locator;
  readonly contactCountryCombobox: Locator;
  readonly customerCountryCombobox: Locator;

  // Customer Management dropdowns — exactly these four exist (FR-4's
  // Owner/Business Process/Assignee/Referred By do not — see class doc).
  readonly crmStageCombobox: Locator;
  readonly originTypeCombobox: Locator;
  readonly originCombobox: Locator;
  readonly buyerCombobox: Locator;

  // Primary actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Duplicate-detection modal (same shape as CreateCustomerLocators —
  // unconfirmed for THIS screen specifically, kept as the established
  // fallback shape until a real duplicate scan is exercised).
  readonly duplicateWarningModal: Locator;
  readonly saveAnywayButton: Locator;
  readonly cancelToReviewButton: Locator;

  readonly toast: Locator;

  // In-app notifications panel (shell-level, shared across every module —
  // same button BasePage.gotoAuthenticated() and
  // key-meeting-notes.locators.ts both already key off of)
  readonly notificationsBellButton: Locator;
  readonly notificationsPanel: Locator;

  constructor(private readonly page: Page) {
    this.moreActionsButton = page.getByRole('button', { name: 'More actions' });
    this.scanCreateMenuItem = page.getByRole('menuitem', { name: 'Scan & Create' });

    // Confirmed against the running app: a real (visually hidden) file
    // input backs the "Upload a file" button. "Capture a photo" and
    // "Start scan" are the real labels (not "Capture Photo"/"Use Camera"
    // or exact-case "Start Scan").
    this.fileUploadInput = page.locator('input[type="file"]');
    this.capturePhotoButton = page.getByRole('button', { name: /Capture a photo/i });
    this.startScanButton = page.getByRole('button', { name: /Start scan/i });
    this.scanningIndicator = page.getByText(/scanning/i);

    this.scanCompleteMessage = page.getByText(/^Scan complete/i);
    this.noValuesReadMessage = page.getByText(/No values could be read from this document/i);
    this.scanFailedHeading = page.getByRole('heading', { name: 'Scan failed' });
    this.tryAgainButton = page.getByRole('button', { name: 'Try again' });
    this.enterManuallyButton = page.getByRole('button', { name: 'Enter the details manually' });

    this.contactNameInput = page.getByRole('textbox', { name: 'Contact Name', exact: false });
    this.designationInput = page.getByRole('textbox', { name: 'Designation', exact: false });
    this.customerNameInput = page.getByRole('textbox', { name: 'Customer Name', exact: false });

    this.contactEmailInput = page.getByRole('textbox', { name: /^Email/ }).nth(0);
    this.customerEmailInput = page.getByRole('textbox', { name: /^Email/ }).nth(1);
    this.contactPhoneInput = page.getByRole('textbox', { name: 'Phone', exact: true }).nth(0);
    this.customerPhoneInput = page.getByRole('textbox', { name: 'Phone', exact: true }).nth(1);
    this.contactCityInput = page.getByRole('textbox', { name: /^City/ }).nth(0);
    this.customerCityInput = page.getByRole('textbox', { name: /^City/ }).nth(1);
    this.contactCountryCombobox = page.getByRole('combobox', { name: /^Country/ }).nth(0);
    this.customerCountryCombobox = page.getByRole('combobox', { name: /^Country/ }).nth(1);

    // Exact match: each combobox's accessible name is the bare label (no
    // asterisk) — confirmed against the running app — so "Origin" and
    // "Origin Type" don't collide.
    this.crmStageCombobox = page.getByRole('combobox', { name: 'CRM Stage', exact: true });
    this.originTypeCombobox = page.getByRole('combobox', { name: 'Origin Type', exact: true });
    this.originCombobox = page.getByRole('combobox', { name: 'Origin', exact: true });
    this.buyerCombobox = page.getByRole('combobox', { name: 'Buyer', exact: true });

    this.saveButton = page.getByRole('button', { name: 'Save customer & contact' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    // Confirmed elsewhere (create-customer.locators.ts) that this app's
    // confirmation-style modals render as role="alertdialog", not
    // role="dialog" — accepting either defensively here too. Unconfirmed
    // for THIS screen specifically — no duplicate scan has been run yet.
    this.duplicateWarningModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /may already exist/i });
    this.saveAnywayButton = this.duplicateWarningModal.getByRole('button', { name: 'Save anyway' });
    this.cancelToReviewButton = this.duplicateWarningModal.getByRole('button', {
      name: 'Cancel to review',
    });

    this.toast = page.locator('[data-sonner-toast]').first();

    // Scoped to the shell's top banner — same disambiguation
    // BasePage.gotoAuthenticated() documents (an unscoped "Notifications"
    // match also hits an unrelated "Control Center Notifications" button
    // elsewhere on the page).
    this.notificationsBellButton = page
      .getByRole('banner')
      .getByRole('button', { name: /Notifications/ });
    this.notificationsPanel = page
      .getByRole('dialog')
      .or(page.getByRole('menu'))
      .filter({
        hasText: /Notifications/i,
      });
  }

  /** A notification item in the notifications panel, by the text it names. */
  notificationItem(text: string): Locator {
    return this.notificationsPanel.getByText(text, { exact: false });
  }
}
