import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/** Contacts list, under the CRM module (confirmed against the running app). */
const CONTACTS_LIST_PATH = '/crm/contacts';
const CREATE_CONTACT_PATH = '/crm/contacts/new';

/**
 * "Create Contact" (CRM, Sprint 1 — covers both create-contact.md and
 * contact-creation-screen.md, which describe the same screen at two
 * granularities). Owned by the CRM QA.
 *
 * Locators confirmed against the real running form on a local `tilt up`
 * stack (dumped via ariaSnapshot()), not guessed from ClickUp text. Two
 * things worth knowing before touching this file:
 *
 * - Required fields on blank save (confirmed): Contact Name, Designation,
 *   Email, City, Country — exactly 5, matching the app's own banner text
 *   "5 fields need attention — data-type errors are highlighted on the
 *   respective fields." (contact-creation-screen.md TC:6). Phone/Fax/
 *   Address/State/Postal Code/socials are optional.
 * - Contact Name is validated "Alphabets only" (confirmed on dev — a
 *   name containing digits, e.g. a timestamp-suffixed test name, gets
 *   rejected with an inline error). Unlike Customer Name on
 *   CreateCustomerPage, don't suffix this field with `Date.now()` for
 *   uniqueness; use a fixed name and vary email/phone instead.
 * - "Customer Name" only renders as an editable combobox when this form is
 *   opened standalone (from the Contact list). Opened via a
 *   `?customerId=...&customerName=...` hand-off from a Customer's own
 *   context, it instead renders as locked plain text plus the helper
 *   copy "Customer is fixed by where this form was opened from and
 *   cannot be changed." (confirmed on dev — not the slightly different
 *   wording the ClickUp task quotes) — see openFromCustomerContext().
 * - The Customer Name combobox's popup (a `dialog` wrapping a
 *   `listbox "Customers"`) got stuck on "Loading customers…" indefinitely
 *   on local (zero customers seeded there — not a broken popup). On dev
 *   it resolves fine: a plain paginated listbox with real customers
 *   ("Acme Textiles", "ACME Apparel", etc.) and no search textbox at
 *   all — unlike every other combobox in this app. See
 *   linkToCustomer().
 * - Typing a not-yet-existing Customer name and saving does NOT show a
 *   "create this Customer now?" prompt on dev, despite create-contact.md
 *   TC:5/TC:6 and contact-creation-screen.md TC:3/4/5 describing one —
 *   confirmed directly: the Contact just saves as Unlinked, silently
 *   discarding the typed text. Either the feature isn't built yet or
 *   there's a different trigger for it than free-typing; flag to the
 *   team rather than assume the ClickUp text is wrong.
 * - A duplicate email is a BLOCKING inline error (confirmed on dev: "This
 *   email address is already used by {Contact} ({Contact Code}). Enter a
 *   different email address to create this Contact.") — not the
 *   non-blocking modal-with-"Save anyway" pattern Customers use.
 *   `duplicateWarningModal`/`saveAnywayButton` below are copied from
 *   CreateCustomerPage's shape but not confirmed to ever appear here;
 *   left in case a different duplicate condition (e.g. matching phone)
 *   does use a modal, but don't assume it without checking.
 */
export interface ContactProfileDetails {
  name?: string;
  designation?: string;
  gender?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  linkedIn?: string;
  facebook?: string;
  instagram?: string;
}

export class CreateContactPage extends BasePage {
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
  readonly postSaveCreateCustomerModal: Locator;
  readonly createCustomerButton: Locator;
  readonly postSaveCancelButton: Locator;
  readonly duplicateWarningModal: Locator;
  readonly saveAnywayButton: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    super(page);

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
    this.phoneInput = page.getByLabel('Phone');
    this.faxInput = page.getByLabel('Fax');
    this.addressInput = page.getByLabel('Address');
    this.cityInput = page.getByLabel('City');
    this.stateInput = page.getByLabel('State');
    this.postalCodeInput = page.getByLabel('Postal Code');
    // "Country" is a substring of the "Country code" combobox's accessible
    // name too — same disambiguation CreateCustomerPage needs.
    this.countryCombobox = page.getByRole('combobox', { name: 'Country', exact: true });
    this.linkedInInput = page.getByLabel('LinkedIn');
    this.facebookInput = page.getByLabel('Facebook');
    this.instagramInput = page.getByLabel('Instagram');

    this.saveButton = page.getByRole('button', { name: 'Save Contact' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.customersDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('listbox', { name: 'Customers' }) });

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

  async openFromContactList(): Promise<void> {
    await this.gotoAuthenticated(CONTACTS_LIST_PATH);
    await this.createContactEntry.click();
  }

  /** contact-creation-screen.md TC:1 — Customer→Contact hand-off. */
  async openFromCustomerContext(customerId: string, customerName: string): Promise<void> {
    const query = `?customerId=${encodeURIComponent(customerId)}&customerName=${encodeURIComponent(customerName)}`;
    await this.gotoAuthenticated(`${CREATE_CONTACT_PATH}${query}`);
  }

  async fillProfile(details: ContactProfileDetails): Promise<void> {
    if (details.name !== undefined) await this.contactNameInput.fill(details.name);
    if (details.designation !== undefined) await this.designationInput.fill(details.designation);
    if (details.gender !== undefined)
      await this.selectComboboxOption(this.genderCombobox, details.gender);
    if (details.email !== undefined) await this.emailInput.fill(details.email);
    if (details.phone !== undefined) await this.phoneInput.fill(details.phone);
    if (details.fax !== undefined) await this.faxInput.fill(details.fax);
    if (details.address !== undefined) await this.addressInput.fill(details.address);
    if (details.city !== undefined) await this.cityInput.fill(details.city);
    if (details.state !== undefined) await this.stateInput.fill(details.state);
    if (details.postalCode !== undefined) await this.postalCodeInput.fill(details.postalCode);
    if (details.country !== undefined)
      await this.selectComboboxOption(this.countryCombobox, details.country);
    if (details.linkedIn !== undefined) await this.linkedInInput.fill(details.linkedIn);
    if (details.facebook !== undefined) await this.facebookInput.fill(details.facebook);
    if (details.instagram !== undefined) await this.instagramInput.fill(details.instagram);
  }

  /** Same shape as CreateCustomerPage's — see that file for why both paths are tried. */
  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }

  /**
   * Confirmed on dev: unlike every other combobox in this app, the
   * Customers popup is a plain paginated `listbox` with no search
   * textbox at all — just options ("Acme Textiles CTC0000306 · Qualified
   * Lead", etc.) and a "Load 15 more" button once you scroll past the
   * first page. Only click "Load 15 more" if the target isn't visible
   * yet (it wasn't stuck "Loading customers…" forever on local — that
   * was a zero-customers-seeded local environment, not a broken popup).
   */
  async linkToCustomer(customerName: string): Promise<void> {
    await this.customerNameCombobox.click();
    const option = this.customersDialog.getByRole('option', { name: customerName });
    const loadMoreButton = this.customersDialog.getByRole('button', { name: 'Load 15 more' });
    for (let attempt = 0; attempt < 10; attempt++) {
      if (
        await option
          .first()
          .isVisible()
          .catch(() => false)
      )
        break;
      if (!(await loadMoreButton.isVisible().catch(() => false))) break;
      await loadMoreButton.click();
    }
    await option.first().click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectValidationBanner(message: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('alert').filter({ hasText: message }).first()).toBeVisible();
  }

  async expectCustomerLinkageLocked(customerName: string): Promise<void> {
    await expect(this.customerNameCombobox).not.toBeVisible();
    await expect(this.page.getByText(customerName)).toBeVisible();
    await expect(this.customerLinkageLockedText).toBeVisible();
  }
}
