import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Contacts tab" on the Customer Details
 * screen (CRM, Sprint 2 user story) — no actions or assertions here, see
 * src/pages/crm/contacts-tab.page.ts for those.
 *
 * Confirmed against the running app (2026-09-23), correcting the
 * following guesses this file started with:
 *
 * - The tab trigger is a `button` (like Customer Details' other sub-tabs
 *   — Overview/Biz Docs/Communication), not a `role="tab"`, and its
 *   accessible name carries a live linked-Contact count, e.g.
 *   "Contacts (0)". Selecting it also sets a `?tab=contacts` query param
 *   on the URL (confirmed, though not relied on here).
 * - There is no "Link existing Contact" modal dialog with its own
 *   trigger button. The entry point IS the "Contacts to link" combobox
 *   itself — clicking it opens a popup (Radix-style, `role="dialog"`
 *   with no accessible name) containing a search textbox and a
 *   `role="listbox"` of unlinked Contacts. Selecting an option marks it
 *   `[selected]`, fills the combobox with its name, and leaves the popup
 *   open (multi-select is possible, though not exercised here) — a
 *   separate, initially-disabled "Link Contact" button outside the popup
 *   confirms the link.
 * - The empty-state copy is "No Contacts yet." (a `paragraph`, not a
 *   generic "no contacts linked" guess), shown alongside (not instead
 *   of) the "New Contact" button and the "Contacts to link" combobox —
 *   there's no separate list/empty toggle, just the record area being
 *   empty.
 * - The "create a new Contact pre-linked" entry point is actually
 *   labeled "New Contact" (not "Create Contact"), and — confirmed — it
 *   navigates to the SAME `/crm/contacts/new?customerId=...` route
 *   create-contact.page.ts's `openFromCustomerContext()` already drives,
 *   so no separate page object is needed for the form itself.
 * - A linked Contact renders as two adjacent buttons, not a data-grid
 *   row: `"{name} {designation}"` (clicking it navigates to that
 *   Contact's own Details screen, confirmed) and `"Delink {name}"`
 *   (not "Unlink"). There is no separate "row" container in the
 *   accessibility tree to scope against.
 * - Delink goes through a real confirmation dialog — `role="dialog"`
 *   named "Delink {name}?", with a "Cancel" and a "Delink contact"
 *   button — matching the Deactivate-confirmation shape already
 *   established elsewhere in this app.
 * - Status propagation (TC:6's premise): confirmed NOT to happen —
 *   deactivating a Customer leaves its linked Contact's own status
 *   ("Active") unchanged on the Contact's Details screen. See
 *   contacts-tab.page.ts's class doc.
 */
export class ContactsTabLocators {
  /** Customer Details' own sub-tab trigger — accessible name carries a live count, e.g. "Contacts (0)". */
  readonly contactsTabTrigger: Locator;

  /** No confirmed panel container exists — scoped to the whole page, matching this codebase's established fallback (e.g. biz-doc.locators.ts's listContainer()). */
  readonly contactsTabPanel: Locator;

  readonly linkedContactsHeading: Locator;

  /** Confirmed against the running app: the real empty-state copy. */
  readonly emptyStateMessage: Locator;

  // Entry points
  readonly newContactButton: Locator;
  readonly contactsToLinkCombobox: Locator;

  // "Contacts to link" popup (opened by clicking the combobox above)
  readonly linkContactSearchInput: Locator;
  readonly linkContactListbox: Locator;
  readonly confirmLinkButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.contactsTabTrigger = page.getByRole('button', { name: /^Contacts \(\d+\)$/ });
    this.contactsTabPanel = page.locator('body');

    this.linkedContactsHeading = page.getByRole('heading', { level: 2, name: 'Linked contacts' });
    this.emptyStateMessage = page.getByText(/^No Contacts yet\.?$/i);

    this.newContactButton = page.getByRole('button', { name: 'New Contact' });
    this.contactsToLinkCombobox = page.getByRole('combobox', { name: 'Contacts to link' });

    this.linkContactSearchInput = page.getByRole('textbox', { name: 'Search unlinked contacts…' });
    this.linkContactListbox = page.getByRole('listbox', { name: 'Contacts to link' });
    this.confirmLinkButton = page.getByRole('button', { name: 'Link Contact' });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** A selectable, still-unlinked Contact inside the "Contacts to link" popup. Matched by name PREFIX — options carry a trailing designation, e.g. "Owen Bradley Buyer". */
  linkContactOption(name: string): Locator {
    return this.linkContactListbox.getByRole('option', { name: new RegExp(`^${escapeRegExp(name)}`) });
  }

  /** A linked Contact's own name+designation button — clicking it navigates to that Contact's Details screen. */
  linkedContactButton(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\b`) });
  }

  /** A linked Contact's own "Delink {name}" button. */
  delinkButton(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^Delink ${escapeRegExp(name)}`) });
  }

  /** The delink confirmation dialog, named "Delink {name}?". */
  delinkConfirmDialog(name: string): Locator {
    return this.page.getByRole('dialog', { name: new RegExp(`^Delink ${escapeRegExp(name)}\\?`) });
  }

  delinkConfirmButton(name: string): Locator {
    return this.delinkConfirmDialog(name).getByRole('button', { name: 'Delink contact' });
  }

  delinkCancelButton(name: string): Locator {
    return this.delinkConfirmDialog(name).getByRole('button', { name: 'Cancel' });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
