import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ContactListLocators } from '../../locators/crm/contact-list.locators';

/** Contact List, under the CRM module (confirmed against the running app). */
const CONTACTS_LIST_PATH = '/crm/contacts';

/**
 * "Contact List" (CRM, Sprint 1). Owned by the CRM QA.
 *
 * Element locators live in ContactListLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them.
 *
 * As of this writing, **both local and dev have zero contacts**
 * ("All 0" / "Linked 0" / "Unlinked 0", confirmed on both) — anything
 * that needs a real row (search matches, row-click navigation, linked
 * Customer navigation, inline editing) is blocked on seed data,
 * independent of anything in this file. See test-cases/crm/contact-list.md.
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

  async openConfigureColumns(): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeVisible();
  }

  async selectRelationshipTab(tab: 'All' | 'Linked' | 'Unlinked'): Promise<void> {
    const l = this.locators;
    const button = { All: l.allTab, Linked: l.linkedTab, Unlinked: l.unlinkedTab }[tab];
    await button.click();
  }

  async selectLayout(layout: 'No split' | 'Vertical split' | 'Horizontal split'): Promise<void> {
    const l = this.locators;
    const button = {
      'No split': l.noSplitButton,
      'Vertical split': l.verticalSplitButton,
      'Horizontal split': l.horizontalSplitButton,
    }[layout];
    await button.click();
  }

  async expectLayoutSelected(
    layout: 'No split' | 'Vertical split' | 'Horizontal split',
  ): Promise<void> {
    const l = this.locators;
    const button = {
      'No split': l.noSplitButton,
      'Vertical split': l.verticalSplitButton,
      'Horizontal split': l.horizontalSplitButton,
    }[layout];
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  async selectContactRow(contactName: string): Promise<void> {
    await this.locators.contactRow(contactName).click();
  }

  async selectLinkedCustomer(customerName: string): Promise<void> {
    await this.locators.linkedCustomerLink(customerName).click();
  }
}
