import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  ContactListLocators,
  type ContactListLayout,
} from '../../locators/crm/contact-list.locators';

/** Contact List, under the CRM module (confirmed against the running app). */
const CONTACTS_LIST_PATH = '/crm/contacts';

/**
 * "Contact List" (CRM, Sprint 1). Owned by the CRM QA.
 *
 * Element locators live in ContactListLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them.
 */
export class ContactListPage extends BasePage {
  readonly locators: ContactListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ContactListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(CONTACTS_LIST_PATH);
  }

  async searchFor(text: string): Promise<void> {
    await this.locators.searchInput.fill(text);
  }

  async openFilters(): Promise<void> {
    await this.locators.filtersButton.click();
  }

  /** Expands the Filters panel's "Advanced filter" part, where custom rules live. */
  async openAdvancedFilter(): Promise<void> {
    await this.locators.advancedFilterButton.click();
    await expect(this.locators.advancedFilterButton).toHaveAttribute('aria-expanded', 'true');
  }

  async openConfigureColumns(): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeVisible();
  }

  async selectRelationshipTab(tab: 'All' | 'Linked' | 'Unlinked'): Promise<void> {
    const l = this.locators;
    const button = { All: l.allTab, Linked: l.linkedTab, Unlinked: l.unlinkedTab }[tab];
    await button.click();
  }

  async selectLayout(layout: ContactListLayout): Promise<void> {
    await this.locators.viewMenuButton.click();
    await this.locators.layoutOption(layout).click();
  }

  /** Reopens the View menu, checks `layout` is the selected item, and closes it. */
  async expectLayoutSelected(layout: ContactListLayout): Promise<void> {
    await this.locators.viewMenuButton.click();
    await expect(this.locators.layoutOption(layout)).toHaveAttribute('aria-checked', 'true');
    await this.page.keyboard.press('Escape');
  }

  async selectContactRow(contactName: string): Promise<void> {
    await this.locators.contactRow(contactName).click();
  }

  async selectLinkedCustomer(customerName: string): Promise<void> {
    await this.locators.linkedCustomerLink(customerName).click();
  }
}
