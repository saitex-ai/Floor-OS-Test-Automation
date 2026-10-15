import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  ProspectToCustomerConversionLocators,
  type OverflowStageTab,
} from '../../locators/crm/prospect-to-customer-conversion.locators';
import { QualifiedLeadToProspectLocators } from '../../locators/crm/qualified-lead-to-prospect.locators';

export { type OverflowStageTab } from '../../locators/crm/prospect-to-customer-conversion.locators';

const CUSTOMERS_LIST_PATH = '/crm/customers';
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Prospect to Customer Conversion (1st Ever Sample Order)" (CRM, Sprint 5).
 * Owned by the CRM QA.
 *
 * Confirmed on dev (2026-10-15): the conversion is triggered by creating a
 * Sales Order (Order Type SMS = sample, BULK = bulk) in Master Data → Sales
 * Order Management → Sales Order (SalesOrderPage) — NOT from CRM's Biz Docs
 * tab, whose Orders tile is still a read-only "not available in floorOS
 * yet" placeholder. This page object covers what CRM shows afterwards: the
 * CRM Stage on Customer Details and on the Customers list, the System
 * section's "Updated By", and the conversion notification.
 *
 * CRM views do NOT update in real time: an already-open Customer Details
 * or Customers list keeps showing "Prospect" until reloaded / Refresh is
 * clicked (confirmed live, 8s+ after the order) — so every check here
 * loads or refreshes first.
 */
export class ProspectToCustomerConversionPage extends BasePage {
  readonly locators: ProspectToCustomerConversionLocators;
  /** Reused: CRM Stage field row + notification bell/panel. */
  readonly sharedLocators: QualifiedLeadToProspectLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ProspectToCustomerConversionLocators(page);
    this.sharedLocators = new QualifiedLeadToProspectLocators(page);
  }

  // ---- Customers list ----

  async openCustomerList(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
  }

  /**
   * Selects the Prospects / Customers stage tab — directly if it is already
   * promoted into the tab bar, otherwise via the "+N more" overflow menu.
   */
  async selectOverflowStageTab(tab: OverflowStageTab): Promise<void> {
    const promoted = this.locators.promotedStageTab(tab);
    if (await promoted.isVisible()) {
      await promoted.click();
    } else {
      await this.locators.moreStageTabsButton.click();
      await this.locators.overflowStageTab(tab).click();
    }
    await expect(promoted).toHaveAttribute('aria-pressed', 'true');
  }

  async searchCustomer(customerName: string): Promise<void> {
    await this.locators.searchInput.fill(customerName);
  }

  /**
   * Clicks the list's Refresh button until the Customer's row drops out of
   * the currently selected stage tab (e.g. leaves "Prospects" once
   * converted). The conversion lands a few seconds after the Sales Order is
   * saved (async), so a single Refresh straight after the order can still
   * show the old stage.
   */
  async refreshUntilNotListed(customerName: string): Promise<void> {
    await expect(async () => {
      await this.locators.refreshButton.click();
      await expect(this.locators.customerRow(customerName)).toHaveCount(0, { timeout: 3_000 });
    }).toPass({ timeout: 60_000, intervals: [2_000, 5_000] });
  }

  /** The Customer's list row is shown, and its CRM Stage column reads `stage`. */
  async expectCustomerListedWithStage(
    customerName: string,
    stage: string,
    timeout = 15_000,
  ): Promise<void> {
    const row = this.locators.customerRow(customerName);
    await expect(row).toHaveCount(1, { timeout });
    await expect(this.locators.crmStageCell(row)).toHaveText(stage, { timeout });
  }

  // ---- Customer Details ----

  async openCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  /** CRM Stage field row on Customer Details ("CRM Stage • {value}"). */
  async expectCrmStage(stage: string): Promise<void> {
    await expect(this.sharedLocators.crmStageRow()).toContainText(stage, { timeout: 15_000 });
  }

  /** The Customer Code (e.g. "CTC0001860") from Customer Details' System section. */
  async getCustomerCode(): Promise<string> {
    await this.locators.customerCodeValue.waitFor({ state: 'visible' });
    return (await this.locators.customerCodeValue.innerText()).trim();
  }

  /** System section "Updated By" — "system:sales-order" once a Sales Order converted the Customer. */
  async expectUpdatedBy(value: string): Promise<void> {
    await expect(this.locators.updatedByValue(value)).toBeVisible();
  }

  /** Customer Details offers no Audit / History view (confirmed on dev 2026-10-15). */
  async expectNoAuditHistoryView(): Promise<void> {
    await expect(this.locators.overviewTabButton).toBeVisible();
    await expect(this.locators.auditHistoryTab).toHaveCount(0);
  }

  // ---- Notifications ----

  async openNotificationPanel(): Promise<void> {
    await this.sharedLocators.notificationBellButton.click();
    await expect(this.sharedLocators.notificationPanel).toBeVisible();
  }

  /**
   * Exactly one Prospect -> Customer conversion notification exists for
   * this Customer, naming `orderNo` as the triggering Sales Order.
   * Notifications are generated asynchronously, so this re-opens the panel
   * (fresh page load) until it shows up.
   */
  async expectSingleConversionNotification(customerId: string, orderNo: string): Promise<void> {
    const notifications = this.locators.conversionNotifications(customerId);
    await expect(async () => {
      await this.openCustomerDetail(customerId);
      await this.openNotificationPanel();
      await expect(notifications).toHaveCount(1, { timeout: 5_000 });
    }).toPass({ timeout: 60_000, intervals: [2_000, 5_000] });
    await expect(notifications).toContainText(
      `first ever Sales Order ${orderNo} has come in Floor OS`,
    );
  }

  /**
   * After a LATER order (`laterOrderNo`) for an already-converted Customer:
   * still exactly one conversion notification (the first order's), and none
   * naming the later order. Absence can't be polled for, so this first
   * waits out a settle window — the first order's notification was observed
   * to arrive within a few seconds on dev, so 15s is generous.
   */
  async expectNoRepeatConversionNotification(
    customerId: string,
    firstOrderNo: string,
    laterOrderNo: string,
  ): Promise<void> {
    await this.page.waitForTimeout(15_000);
    await this.openCustomerDetail(customerId);
    await this.openNotificationPanel();
    const notifications = this.locators.conversionNotifications(customerId);
    await expect(notifications).toHaveCount(1);
    await expect(notifications).toContainText(`Sales Order ${firstOrderNo} `);
    await expect(notifications.filter({ hasText: laterOrderNo })).toHaveCount(0);
  }
}
