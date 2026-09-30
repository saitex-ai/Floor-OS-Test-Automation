import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the CRM-side surfaces of "Qualified Lead ->
 * Prospect" (CRM, Sprint 2 user story) — no actions or assertions here, see
 * src/pages/crm/qualified-lead-to-prospect.page.ts for those.
 *
 * TODO(CRM QA): NOT yet confirmed against the running app — this file is a
 * best guess built from the ClickUp story text and this framework's
 * established UI patterns (the shell's Notifications button already
 * confirmed to exist in `BasePage.gotoAuthenticated()`, dialog/menu popup
 * shapes, the "{Label} • {value}" field-row pattern confirmed for Customer
 * Details in customer-detail.locators.ts). Re-derive every selector below
 * via ariaSnapshot() once a real conversion has actually been observed to
 * fire a notification, the same way create-customer.locators.ts and
 * customer-detail.locators.ts were confirmed.
 *
 * This story is unusual: the *trigger* (creating the first-ever Sample
 * Request for a Lead) happens in Floor OS's Sample Request module, not CRM
 * — see the class doc on QualifiedLeadToProspectPage and
 * test-cases/crm/qualified-lead-to-prospect.md for the full explanation.
 * Everything here only covers the CRM-side receiving end: the CRM Stage
 * field on Customer Details, and the shell's notification bell/panel.
 */
export class QualifiedLeadToProspectLocators {
  // Shell notification bell — same button BasePage.gotoAuthenticated() uses
  // as its "already authenticated" marker, scoped to the top banner (an
  // unscoped match also hits an unrelated "Control Center Notifications"
  // button elsewhere on the page — confirmed for that other button in
  // base.page.ts; assumed to still apply here).
  readonly notificationBellButton: Locator;

  // Popup the bell opens. Confirmed directly on local (2026-09-22): it
  // carries no dialog/menu role at all — its content ("Inbox",
  // "Notification actions", "Notification preferences" buttons, "No
  // notifications yet." text) sits flat in the accessibility tree with no
  // distinguishing container role, so a role=dialog/menu locator never
  // matches. Using the "Notification preferences" button — only present
  // once the panel is open — as the open/visible marker instead.
  readonly notificationPanel: Locator;

  constructor(private readonly page: Page) {
    this.notificationBellButton = page
      .getByRole('banner')
      .getByRole('button', { name: /Notifications/ });

    this.notificationPanel = page.getByRole('button', { name: 'Notification preferences' });
  }

  /**
   * A single notification entry inside the panel, matched by its text
   * (e.g. the Customer's name, or wording like "converted to Prospect").
   * Parameterized lookup, not a fixed locator — still just locates, same
   * idiom as CustomerDetailLocators.fieldContainer(label).
   *
   * Still unconfirmed: every local run so far has hit the empty state
   * ("No notifications yet.") since nothing here can fire a real Sample
   * Request to trigger a genuine conversion notification (see the class
   * doc). notificationPanel is now a single button, not a container, so
   * this searches the whole page rather than scoping into it — re-scope
   * once a real notification list item has been observed.
   */
  notificationEntry(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * The "CRM Stage" field row on the Customer Details screen. Confirmed
   * directly on local (2026-09-22): renders as "CRM Stage • {value}",
   * the same "{Label} • {value}" pattern as other Profile/Management
   * fields in customer-detail.locators.ts (`fieldContainer()`).
   */
  crmStageRow(): Locator {
    return this.page
      .getByText(/CRM Stage/i)
      .first()
      .locator('..');
  }
}
