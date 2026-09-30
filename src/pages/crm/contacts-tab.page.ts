import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ContactsTabLocators } from '../../locators/crm/contacts-tab.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Contacts tab in Customer Details screen" (CRM, Sprint 2 user story).
 * Owned by the CRM QA. The tab lives WITHIN the existing Customer Details
 * screen (see customer-detail.page.ts) — this class only drives the
 * Contacts tab itself, not the Profile/Management/Departments sections
 * that screen already owns.
 *
 * Confirmed against the running app (2026-09-23) — see
 * contacts-tab.locators.ts's class doc for the corrections this made to
 * the original best-guess file, in particular: linking is driven through
 * a "Contacts to link" combobox (not a separate dialog trigger), a
 * linked Contact is "Delink"ed (not "Unlink"ed) through a real
 * confirmation dialog, and "New Contact" reuses create-contact.page.ts's
 * existing pre-linked creation route directly.
 *
 * Status propagation (the vague premise behind TC:6 in the spec):
 * confirmed NOT to happen — deactivating a Customer does not flip its
 * linked Contact's own status. Verified directly: created a Customer and
 * a linked Contact, deactivated the Customer, then opened the Contact's
 * own Details screen — it still read "Active". There is also no status
 * text on a linked Contact's row within this tab to propagate anything
 * INTO in the first place.
 */
export class ContactsTabPage extends BasePage {
  readonly locators: ContactsTabLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ContactsTabLocators(page);
  }

  /** Opens the Contacts tab from an existing Customer's Details screen. */
  async open(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.contactsTabTrigger.click();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.locators.emptyStateMessage).toBeVisible();
  }

  async expectContactLinked(name: string): Promise<void> {
    await expect(this.locators.linkedContactButton(name)).toBeVisible();
  }

  async expectContactNotLinked(name: string): Promise<void> {
    await expect(this.locators.linkedContactButton(name)).toHaveCount(0);
  }

  /**
   * The combobox itself is the entry point — clicking it opens the popup
   * (search textbox + listbox) rather than a separate "Link Contact"
   * trigger button.
   */
  async openLinkPanel(): Promise<void> {
    await this.locators.contactsToLinkCombobox.click();
    await expect(this.locators.linkContactListbox).toBeVisible();
  }

  async searchContact(query: string): Promise<void> {
    await this.locators.linkContactSearchInput.fill(query);
  }

  /** Selecting an option marks it `[selected]` and keeps the popup open — multi-select before a single confirm. */
  async selectContactOption(name: string): Promise<void> {
    await this.locators.linkContactOption(name).click();
  }

  async confirmLink(): Promise<void> {
    await this.locators.confirmLinkButton.click();
  }

  /** Convenience: search for, select, and link one or more existing Contacts in one call. */
  async linkExistingContacts(names: string[]): Promise<void> {
    await this.openLinkPanel();
    for (const name of names) {
      await this.searchContact(name);
      await this.selectContactOption(name);
    }
    await this.confirmLink();
  }

  /** Delink flow, through the confirmation dialog (TC:3/TC:4). */
  async delinkContact(name: string): Promise<void> {
    await this.locators.delinkButton(name).click();
    await expect(this.locators.delinkConfirmDialog(name)).toBeVisible();
    await this.locators.delinkConfirmButton(name).click();
  }

  /** Navigates to the same pre-linked Create Contact form create-contact.page.ts already drives. */
  async openCreateContactFromTab(): Promise<void> {
    await this.locators.newContactButton.click();
  }

  /** Selecting a linked Contact's own button navigates to its Details screen. */
  async openLinkedContact(name: string): Promise<void> {
    await this.locators.linkedContactButton(name).click();
  }

  async expectNavigatedToContactDetails(): Promise<void> {
    await expect(this.page).toHaveURL(/\/crm\/contacts\/[0-9a-f-]+$/);
  }

  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.locators.toast).toBeVisible();
  }
}
