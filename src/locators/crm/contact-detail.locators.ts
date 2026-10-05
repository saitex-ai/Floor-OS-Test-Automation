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
 * Confirmed directly against a real save on dev (2026-09-16), with one
 * correction confirmed on a later re-check (2026-10-01):
 *
 * - Header summary is one line: "{Active|Inactive} {Designation} ·
 *   {linked Customer name, as a real link to /crm/customers/{id}}" — or
 *   "· Unlinked contact" (plain text, no link) when nothing is linked.
 * - CORRECTED (2026-10-01, dev): the Contact Profile section edits as a
 *   WHOLE, not per-field. A single "Edit Contact Profile" button switches
 *   every field in the section (Contact Name, Designation, Gender,
 *   Email, Phone, ...) into its own labeled input at once, with ONE
 *   "Save"/"Cancel" pair for the whole section — not the per-field "Edit
 *   {Label}"/"Save {Label}"/"Cancel editing {Label}" buttons this was
 *   originally built against. That per-field shape may be what this
 *   screen looked like on 2026-09-16; it no longer does. `editButton()`
 *   is kept only for TC:3's "no edit affordance on System fields" check,
 *   which still holds either way (System fields were never part of the
 *   editable Profile section).
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
  readonly profileSection: Locator;
  readonly editProfileButton: Locator;
  readonly saveProfileButton: Locator;
  readonly cancelProfileButton: Locator;

  constructor(private readonly page: Page) {
    this.nameHeading = page.getByRole('heading', { level: 1 });
    this.toast = page.locator('[data-sonner-toast]').first();

    this.profileSection = page.getByRole('heading', { name: 'Contact Profile' }).locator('..');
    this.editProfileButton = page.getByRole('button', { name: 'Edit Contact Profile' });
    this.saveProfileButton = page.getByRole('button', { name: 'Save', exact: true });
    this.cancelProfileButton = page.getByRole('button', { name: 'Cancel', exact: true });
  }

  /**
   * A field's own labeled input, once the Contact Profile section is in
   * edit mode. Not exact: required fields' accessible labels carry a
   * trailing " *" (e.g. "Designation *"), same decoration already
   * confirmed elsewhere in this app (see log-communication.locators.ts).
   */
  fieldInput(label: string): Locator {
    return this.page.getByLabel(label, { exact: false });
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
