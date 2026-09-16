import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ContactDetailLocators } from '../../locators/crm/contact-detail.locators';

/**
 * Contact Detail screen (CRM, Sprint 1 — customer-detail.md, despite its
 * filename/ClickUp task name being about the Contact screen, not the
 * Customer one). Owned by the CRM QA.
 *
 * Element locators live in ContactDetailLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them. See
 * that file's class doc for what's confirmed directly against dev.
 */
export class ContactDetailPage extends BasePage {
  readonly locators: ContactDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ContactDetailLocators(page);
  }

  async expectHeaderSummary(status: 'Active' | 'Inactive', designation: string): Promise<void> {
    await expect(this.page.getByText(new RegExp(`${status}\\s*${designation}\\s*·`))).toBeVisible();
  }

  async expectLinkedToCustomer(customerName: string): Promise<void> {
    await expect(this.locators.linkedCustomerLink(customerName)).toBeVisible();
  }

  async expectUnlinked(): Promise<void> {
    await expect(this.page.getByText('Unlinked contact')).toBeVisible();
  }

  async openLinkedCustomer(customerName: string | RegExp): Promise<void> {
    await this.locators.linkedCustomerLink(customerName).click();
  }

  async expectFieldNotEditable(label: string): Promise<void> {
    await expect(this.locators.editButton(label)).toHaveCount(0);
  }

  async openFieldEdit(label: string): Promise<void> {
    await this.locators.editButton(label).click();
  }

  async fillFieldEdit(label: string, value: string): Promise<void> {
    await this.locators.fieldContainer(label).getByRole('textbox').fill(value);
  }

  async saveFieldEdit(label: string): Promise<void> {
    await this.locators.saveButton(label).click();
  }

  async cancelFieldEdit(label: string): Promise<void> {
    await this.locators.cancelButton(label).click();
  }

  /** Opens a field's inline editor, sets a value, and saves in one step. */
  async editField(label: string, value: string): Promise<void> {
    await this.openFieldEdit(label);
    await this.fillFieldEdit(label, value);
    await this.saveFieldEdit(label);
  }

  async expectFieldEditError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }
}
