import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CreateContactLocators } from '../../locators/crm/create-contact.locators';

/** Contacts list, under the CRM module (confirmed against the running app). */
const CONTACTS_LIST_PATH = '/crm/contacts';
const CREATE_CONTACT_PATH = '/crm/contacts/new';

/**
 * "Create Contact" (CRM, Sprint 1 — covers both create-contact.md and
 * contact-creation-screen.md, which describe the same screen at two
 * granularities). Owned by the CRM QA.
 *
 * Element locators live in CreateContactLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them. One
 * behavior worth knowing before touching this file: typing a
 * not-yet-existing Customer name and saving does NOT show a "create this
 * Customer now?" prompt on dev, despite create-contact.md TC:5/TC:6 and
 * contact-creation-screen.md TC:3/4/5 describing one — confirmed
 * directly: the Contact just saves as Unlinked, silently discarding the
 * typed text. Either the feature isn't built yet or there's a different
 * trigger for it than free-typing; flag to the team rather than assume
 * the ClickUp text is wrong.
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
  readonly locators: CreateContactLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CreateContactLocators(page);
  }

  async openFromContactList(): Promise<void> {
    await this.gotoAuthenticated(CONTACTS_LIST_PATH);
    await this.locators.createContactEntry.click();
  }

  /** contact-creation-screen.md TC:1 — Customer→Contact hand-off. */
  async openFromCustomerContext(customerId: string, customerName: string): Promise<void> {
    const query = `?customerId=${encodeURIComponent(customerId)}&customerName=${encodeURIComponent(customerName)}`;
    await this.gotoAuthenticated(`${CREATE_CONTACT_PATH}${query}`);
  }

  async fillProfile(details: ContactProfileDetails): Promise<void> {
    const l = this.locators;
    if (details.name !== undefined) await l.contactNameInput.fill(details.name);
    if (details.designation !== undefined) await l.designationInput.fill(details.designation);
    if (details.gender !== undefined)
      await this.selectComboboxOption(l.genderCombobox, details.gender);
    if (details.email !== undefined) await l.emailInput.fill(details.email);
    if (details.phone !== undefined) await l.phoneInput.fill(details.phone);
    if (details.fax !== undefined) await l.faxInput.fill(details.fax);
    if (details.address !== undefined) await l.addressInput.fill(details.address);
    if (details.city !== undefined) await l.cityInput.fill(details.city);
    if (details.state !== undefined) await l.stateInput.fill(details.state);
    if (details.postalCode !== undefined) await l.postalCodeInput.fill(details.postalCode);
    if (details.country !== undefined)
      await this.selectComboboxOption(l.countryCombobox, details.country);
    if (details.linkedIn !== undefined) await l.linkedInInput.fill(details.linkedIn);
    if (details.facebook !== undefined) await l.facebookInput.fill(details.facebook);
    if (details.instagram !== undefined) await l.instagramInput.fill(details.instagram);
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
    await this.locators.customerNameCombobox.click();
    const option = this.locators.customerOption(customerName);
    for (let attempt = 0; attempt < 10; attempt++) {
      if (
        await option
          .first()
          .isVisible()
          .catch(() => false)
      )
        break;
      if (!(await this.locators.loadMoreCustomersButton.isVisible().catch(() => false))) break;
      await this.locators.loadMoreCustomersButton.click();
    }
    await option.first().click();
  }

  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectValidationBanner(message: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('alert').filter({ hasText: message }).first()).toBeVisible();
  }

  async expectCustomerLinkageLocked(customerName: string): Promise<void> {
    await expect(this.locators.customerNameCombobox).not.toBeVisible();
    await expect(this.page.getByText(customerName)).toBeVisible();
    await expect(this.locators.customerLinkageLockedText).toBeVisible();
  }
}
