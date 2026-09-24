import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Create Contact" screen (CRM, Sprint 1 —
 * covers both create-contact.md and contact-creation-screen.md) — no
 * actions or assertions here, see src/pages/crm/create-contact.page.ts
 * for those. Confirmed against the real running form on a local
 * `tilt up` stack and against dev, not guessed from ClickUp text.
 *
 * - Required fields on blank save (confirmed): Contact Name, Designation,
 *   Email, City, Country — exactly 5, matching the app's own banner text
 *   "5 fields need attention — data-type errors are highlighted on the
 *   respective fields." (contact-creation-screen.md TC:6). Phone/Fax/
 *   Address/State/Postal Code/socials are optional.
 * - Contact Name is validated "Alphabets only" (confirmed on dev — a
 *   name containing digits gets rejected with an inline error). Unlike
 *   Customer Name on CreateCustomerLocators, don't suffix this field
 *   with `Date.now()` for uniqueness; use a fixed name and vary
 *   email/phone instead.
 * - "Customer Name" only renders as an editable combobox when this form
 *   is opened standalone (from the Contact list). Opened via a
 *   `?customerId=...&customerName=...` hand-off from a Customer's own
 *   context, it instead renders as locked plain text plus the helper
 *   copy "Customer is fixed by where this form was opened from and
 *   cannot be changed." (confirmed on dev).
 * - The Customer Name combobox's popup is a plain paginated `listbox`
 *   with no search textbox at all — unlike every other combobox in this
 *   app — with real customers ("Acme Textiles", "ACME Apparel", etc.)
 *   and a "Load 15 more" button once you scroll past the first page.
 * - A duplicate email is a BLOCKING inline error (confirmed on dev: "This
 *   email address is already used by {Contact} ({Contact Code}). Enter a
 *   different email address to create this Contact.") — not the
 *   non-blocking modal-with-"Save anyway" pattern Customers use.
 *   `duplicateWarningModal`/`saveAnywayButton` below are copied from
 *   CreateCustomerLocators' shape but not confirmed to ever appear here;
 *   left in case a different duplicate condition (e.g. matching phone)
 *   does use a modal, but don't assume it without checking.
 */
export class CreateContactLocators {
  readonly createContactEntry: Locator;

  // Customer Linkage section
  readonly customerNameCombobox: Locator;
  readonly customerLinkageLockedText: Locator;

  // Contact Profile fields
  readonly contactNameInput: Locator;
  readonly designationInput: Locator;
  readonly genderCombobox: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly faxInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly postalCodeInput: Locator;
  readonly countryCombobox: Locator;
  readonly linkedInInput: Locator;
  readonly facebookInput: Locator;
  readonly instagramInput: Locator;

  // Primary actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Provisional — not confirmed locally (blocked, see class doc)
  readonly customersDialog: Locator;
  readonly loadMoreCustomersButton: Locator;
  readonly postSaveCreateCustomerModal: Locator;
  readonly createCustomerButton: Locator;
  readonly postSaveCancelButton: Locator;
  readonly duplicateWarningModal: Locator;
  readonly saveAnywayButton: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.createContactEntry = page.getByRole('button', { name: 'Create Contact' });

    this.customerNameCombobox = page.getByRole('combobox', { name: 'Customer Name' });
    // Confirmed on dev: the reliably-present sentence is "Customer is
    // fixed by where this form was opened from and cannot be changed."
    // — a second sentence ("Fixed by where this form was opened from —
    // it cannot be changed here.") appeared alongside it during local
    // probing but not on dev, likely a hover-only tooltip that isn't
    // triggered without simulating a hover.
    this.customerLinkageLockedText = page.getByText(
      /Customer is fixed by where this form was opened from and cannot be changed\./,
    );

    this.contactNameInput = page.getByLabel('Contact Name');
    this.designationInput = page.getByLabel('Designation');
    this.genderCombobox = page.getByRole('combobox', { name: 'Gender' });
    this.emailInput = page.getByLabel('Email');
    // exact: true — getByLabel('Phone') without it also matches the
    // adjacent "Phone country code" combobox (confirmed: strict-mode
    // violation, 2 matches).
    this.phoneInput = page.getByLabel('Phone', { exact: true });
    this.faxInput = page.getByLabel('Fax');
    this.addressInput = page.getByLabel('Address');
    this.cityInput = page.getByLabel('City');
    this.stateInput = page.getByLabel('State');
    this.postalCodeInput = page.getByLabel('Postal Code');
    // "Country" is a substring of the "Country code" combobox's accessible
    // name too — same disambiguation CreateCustomerLocators needs.
    this.countryCombobox = page.getByRole('combobox', { name: 'Country', exact: true });
    this.linkedInInput = page.getByLabel('LinkedIn');
    this.facebookInput = page.getByLabel('Facebook');
    this.instagramInput = page.getByLabel('Instagram');

    this.saveButton = page.getByRole('button', { name: 'Save Contact' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.customersDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('listbox', { name: 'Customers' }) });
    this.loadMoreCustomersButton = this.customersDialog.getByRole('button', {
      name: 'Load 15 more',
    });

    // Not confirmed locally — the Customers list never finished loading, so
    // this flow could never be driven far enough to see the real modal.
    this.postSaveCreateCustomerModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /Proceed to create customer/i });
    this.createCustomerButton = this.postSaveCreateCustomerModal.getByRole('button', {
      name: 'Create customer',
    });
    this.postSaveCancelButton = this.postSaveCreateCustomerModal.getByRole('button', {
      name: 'Cancel',
    });

    this.duplicateWarningModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /may already exist/i });
    this.saveAnywayButton = this.duplicateWarningModal.getByRole('button', { name: 'Save anyway' });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  customerOption(customerName: string): Locator {
    return this.customersDialog.getByRole('option', { name: customerName });
  }
}
