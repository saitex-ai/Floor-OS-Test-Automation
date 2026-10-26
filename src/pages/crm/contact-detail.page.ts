import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ContactDetailLocators } from '../../locators/crm/contact-detail.locators';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

  /**
   * Header (2026-10-23 design): the status is its own badge under the
   * name, and the subtitle beside the name reads "<Designation> • <Customer>".
   * Both are checked inside the header only.
   */
  async expectHeaderSummary(
    status: 'Active' | 'Inactive',
    designation: string,
    customerName?: string,
  ): Promise<void> {
    const header = this.locators.header;
    await expect(header.getByText(status, { exact: true })).toBeVisible();
    const customer = customerName ? escapeRegExp(customerName) : '\\S';
    await expect(
      header.getByText(new RegExp(`^${escapeRegExp(designation)}\\s*[·•]\\s*${customer}`)),
    ).toBeVisible();
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

  /**
   * Corrected (2026-10-01, dev): the Contact Profile section edits as a
   * whole — one "Edit Contact Profile" button opens every field at once,
   * with one Save/Cancel pair for the section. So opening, saving and
   * cancelling take no field label; only fillFieldEdit() targets a field.
   */
  async openFieldEdit(): Promise<void> {
    await this.locators.editProfileButton.click();
  }

  async fillFieldEdit(label: string, value: string): Promise<void> {
    await this.locators.fieldInput(label).fill(value);
  }

  async saveFieldEdit(): Promise<void> {
    await this.locators.saveProfileButton.click();
  }

  async cancelFieldEdit(): Promise<void> {
    await this.locators.cancelProfileButton.click();
  }

  /** Opens the Contact Profile editor, sets one field, and saves in one step. */
  async editField(label: string, value: string): Promise<void> {
    await this.openFieldEdit();
    await this.fillFieldEdit(label, value);
    await this.saveFieldEdit();
  }

  async expectFieldEditError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }
}
