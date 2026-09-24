import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { QualifiedLeadToProspectLocators } from '../../locators/crm/qualified-lead-to-prospect.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Qualified Lead -> Prospect" (CRM, Sprint 2 user story). Owned by the CRM
 * QA.
 *
 * NOT yet confirmed against the running app — see the note atop
 * QualifiedLeadToProspectLocators and test-cases/crm/qualified-lead-to-prospect.md
 * for what's guessed vs. confirmed.
 *
 * This story is unusual among CRM stories: the *trigger* for the behavior it
 * describes — creating the first-ever "Sample Request" for a Lead — happens
 * in a DIFFERENT floorOS module (Sample Request, not CRM). This framework's
 * own architecture (see ONBOARDING.md: "one QA owns one module end to end")
 * means CRM QA has no Sample-Request-creation page object available, and
 * none is wired into src/fixtures/crm.fixtures.ts. So this page object only
 * covers what CRM genuinely owns: reading a Customer's CRM Stage on the
 * Customer Details screen, and the shell's notification bell/panel that a
 * real conversion would populate. It does not — and cannot, from this
 * module alone — create a Sample Request to actually fire the conversion.
 * See the spec file (tests/regression/crm/18-qualified-lead-to-prospect.spec.ts)
 * for which test cases are `test.fixme()`'d for exactly that reason.
 */
export class QualifiedLeadToProspectPage extends BasePage {
  readonly locators: QualifiedLeadToProspectLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new QualifiedLeadToProspectLocators(page);
  }

  /** Opens an existing Customer's Details screen directly by id. */
  async openCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
  }

  /**
   * Asserts the Customer Details screen's CRM Stage field reads the given
   * value. Confirmed directly on local (2026-09-22): the field renders as
   * one text node "CRM Stage • {value}" (the same "{Label} • {value}"
   * pattern as every other Profile/Management field in
   * customer-detail.locators.ts) — a bullet separator, not whitespace, so
   * a `\s*` regex against the whole page never matches. Scoped to
   * crmStageRow() and asserted via toContainText instead.
   */
  async expectCrmStage(stage: string): Promise<void> {
    await expect(this.locators.crmStageRow()).toContainText(stage);
  }

  async openNotificationPanel(): Promise<void> {
    await this.locators.notificationBellButton.click();
  }

  async expectNotificationPanelVisible(): Promise<void> {
    await expect(this.locators.notificationPanel).toBeVisible();
  }

  /** Clicks a notification entry matching the given text (best guess — see locators note). */
  async clickNotification(text: string | RegExp): Promise<void> {
    await this.locators.notificationEntry(text).click();
  }

  /** Confirms clicking a notification (or email hyperlink) landed on the given Customer's Details screen. */
  async expectRedirectedToCustomerDetail(customerId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/crm/customers/${customerId}`));
  }
}
