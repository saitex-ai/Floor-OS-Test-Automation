import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Contact Detail screen (CRM, Sprint 1) — no
 * actions or assertions here, see src/pages/crm/contact-detail.page.ts
 * for those. Route confirmed on dev: `/crm/contacts/{uuid}`, reached
 * after saving via CreateContactPage. Covers customer-detail.md, which —
 * despite its filename and its ClickUp task's name ("Customer detail
 * Screen") — is entirely about this Contact screen (TC:2 explicitly
 * navigates from Contact to a linked Customer), confirmed by reading the
 * real subtask text.
 *
 * Confirmed directly against a real save on dev (2026-09-16):
 *
 * - Header summary is one line: "{Active|Inactive} {Designation} ·
 *   {linked Customer name, as a real link to /crm/customers/{id}}" — or
 *   "· Unlinked contact" (plain text, no link) when nothing is linked.
 * - Every Contact Profile field (including the Customer linkage itself)
 *   has its own uniquely-named "Edit {Label}" button — not a generic
 *   "Edit" like CustomerDetailPage. Clicking it swaps that row for a
 *   textbox plus "Save {Label}" and "Cancel editing {Label}" buttons,
 *   also uniquely named.
 * - System section only has Created On/By and Updated On/By — no visible
 *   "Contact ID" field anywhere on the screen despite customer-detail.md
 *   TC:3 listing one as a locked field to check; that part of the
 *   ClickUp text doesn't match the real screen.
 * - No Audit/History section or link exists anywhere on this screen
 *   (confirmed: zero matches searching for "audit" or "history" text) —
 *   customer-detail.md TC:6 isn't checkable as described.
 */
export class ContactDetailLocators {
  readonly nameHeading: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.nameHeading = page.getByRole('heading', { level: 1 });
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** The header summary's linked Customer name, when one is linked. */
  linkedCustomerLink(customerName: string | RegExp): Locator {
    return this.page.getByRole('link', { name: customerName });
  }

  /** Every Profile field row is "{Label} {value}" + its own "Edit {Label}" button. */
  fieldContainer(label: string): Locator {
    return this.page.getByText(label, { exact: false }).first().locator('..');
  }

  editButton(label: string): Locator {
    return this.page.getByRole('button', { name: `Edit ${label}` });
  }

  saveButton(label: string): Locator {
    return this.page.getByRole('button', { name: `Save ${label}` });
  }

  cancelButton(label: string): Locator {
    return this.page.getByRole('button', { name: `Cancel editing ${label}` });
  }
}
