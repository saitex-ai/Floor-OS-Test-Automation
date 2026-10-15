import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  ProspectToCustomerConversionLocators,
  type OverflowStageTab,
} from '../../locators/crm/prospect-to-customer-conversion.locators';

export { type OverflowStageTab } from '../../locators/crm/prospect-to-customer-conversion.locators';

/** Customers list, under the CRM module (confirmed against the running app). */
const CUSTOMERS_LIST_PATH = '/crm/customers';

/**
 * "Prospect to Customer Conversion (1st Ever Sample Order)" (CRM, Sprint 5).
 * Owned by the CRM QA.
 *
 * Covers the Customers-list side of the story (stage tab membership, the
 * CRM Stage column). The other two CRM surfaces it touches are reused from
 * existing page objects rather than duplicated:
 *
 * - CRM Stage on Customer Details — QualifiedLeadToProspectPage.expectCrmStage().
 * - The Biz Docs Orders tile (the trigger's entry point) —
 *   BizDocPage.expectOrdersTileIsUnavailablePlaceholder().
 *
 * Confirmed on dev (2026-10-15): there is no way to create an Order from
 * CRM (or any other app in the drawer) — the Orders tile is a read-only
 * note saying "Purchase Orders is not available in floorOS yet". See
 * test-cases/crm/prospect-to-customer-conversion.md.
 */
export class ProspectToCustomerConversionPage extends BasePage {
  readonly locators: ProspectToCustomerConversionLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ProspectToCustomerConversionLocators(page);
  }

  async openCustomerList(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
  }

  /** Selects the Prospects / Customers stage tab from the "+2 more" overflow menu. */
  async selectOverflowStageTab(tab: OverflowStageTab): Promise<void> {
    await this.locators.moreStageTabsButton.click();
    await this.locators.overflowStageTab(tab).click();
  }

  async searchCustomer(customerName: string): Promise<void> {
    await this.locators.searchInput.fill(customerName);
  }

  /** The Customer's list row is shown, and its CRM Stage column reads `stage`. */
  async expectCustomerListedWithStage(customerName: string, stage: string): Promise<void> {
    const row = this.locators.customerRow(customerName);
    await expect(row).toHaveCount(1);
    await expect(this.locators.crmStageCell(row)).toHaveText(stage);
  }
}
