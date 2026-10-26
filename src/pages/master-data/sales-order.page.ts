import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  SalesOrderLocators,
  type SalesOrderType,
} from '../../locators/master-data/sales-order.locators';

export { type SalesOrderType } from '../../locators/master-data/sales-order.locators';

const SALES_ORDER_PATH = '/master-data/sales-order-management/sales-order';

/** Column positions in a Sales Order list row (0 is the select checkbox). */
const COL = { orderNo: 1, orderType: 2, description: 6, customerCode: 8, season: 10 } as const;

export interface NewSalesOrder {
  type: SalesOrderType;
  customerCode: string;
  seasonCode: string;
  /** Unique per order — used to find the saved row and read its Order #. */
  description: string;
}

/**
 * Master Data → Sales Order Management → Sales Order. Per the screen's own
 * copy (confirmed on dev 2026-10-15): "An SMS (sample) or BULK order
 * converts a CRM Prospect into a Customer" — the trigger for CRM's
 * "Prospect to Customer Conversion" story
 * (tests/regression/crm/34-prospect-to-customer-conversion.spec.ts).
 * Header-only orders: only Order Type, Customer, Season and Requested Date
 * (defaulted to today) are required; Status defaults to "On Hold" and the
 * Description (otherwise defaulted to style_fabric_wash) is filled with a
 * unique value to find the order again.
 */
export class SalesOrderPage extends BasePage {
  readonly locators: SalesOrderLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SalesOrderLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(SALES_ORDER_PATH);
    await expect(this.locators.heading).toBeVisible();
  }

  /**
   * Opens "New Sales Order", fills the required header fields plus a unique
   * Description, saves, and returns the new Order # read back from the list.
   */
  async createOrder(order: NewSalesOrder): Promise<string> {
    const l = this.locators;
    await l.newSalesOrderButton.click();
    await expect(l.dialog).toBeVisible();

    await l.orderTypeCombobox.click();
    await l.orderTypeOption(order.type).click();
    await expect(l.orderTypeCombobox).toHaveText(order.type);

    // Inline searches (dev 2026-10-23): the button turns into a search box
    // in place; suggestions list "<Name> <Code>", and the pick shows as a
    // button with the same text. Season only offers the picked customer's.
    await l.customerPickerButton.click();
    await l.customerSearchInput.fill(order.customerCode);
    await l.pickerOption(order.customerCode).click();
    await expect(l.pickedValueButton(order.customerCode)).toBeVisible();

    await l.seasonPickerButton.click();
    await l.seasonSearchInput.fill(order.seasonCode);
    await l.pickerOption(order.seasonCode).click();
    await expect(l.pickedValueButton(order.seasonCode)).toBeVisible();

    await l.descriptionInput.fill(order.description);
    await l.saveButton.click();
    await expect(l.createdToast).toBeVisible({ timeout: 30_000 });
    await expect(l.dialog).toBeHidden();

    return this.getOrderNumber(order.description);
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /** Searches by the order's unique description and returns its Order #. */
  async getOrderNumber(description: string): Promise<string> {
    await this.search(description);
    const row = this.locators.rowByText(description);
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    return (await this.locators.rowCell(row, COL.orderNo).innerText()).trim();
  }

  /** The order is listed with the expected Order #, Type, Customer Code and Season. */
  async expectOrderListed(orderNo: string, order: NewSalesOrder): Promise<void> {
    await this.search(order.description);
    const row = this.locators.rowByText(order.description);
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await expect(this.locators.rowCell(row, COL.orderNo)).toHaveText(orderNo);
    await expect(this.locators.rowCell(row, COL.orderType)).toHaveText(order.type);
    await expect(this.locators.rowCell(row, COL.description)).toHaveText(order.description);
    await expect(this.locators.rowCell(row, COL.customerCode)).toHaveText(order.customerCode);
    await expect(this.locators.rowCell(row, COL.season)).toHaveText(order.seasonCode);
  }

  /**
   * Deletes the one order whose (unique) description is `description`:
   * ticks its row, clicks the list's Delete, confirms "Delete sales
   * order?", and waits for the row to disappear. For tearing down orders a
   * test created itself. Returns false — deleting nothing — when no such
   * order is listed (e.g. the test failed before its Save), so the teardown
   * doesn't report a cleanup failure for an order that never existed.
   */
  async deleteOrder(description: string): Promise<boolean> {
    const l = this.locators;
    await this.search(description);
    const row = l.rowByText(description);
    try {
      await expect(row).toHaveCount(1, { timeout: 15_000 });
    } catch (error) {
      if ((await row.count()) === 0) return false;
      throw error;
    }
    // The list can re-render (e.g. another order saved meanwhile) and drop
    // the row selection, hiding Delete again — so retry tick → Delete until
    // the confirm dialog is up, rather than waiting on one click forever.
    await expect(async () => {
      await l.rowCheckbox(row).check({ timeout: 5_000 });
      await l.deleteSelectedButton.click({ timeout: 5_000 });
      await expect(l.deleteConfirmDialog).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await l.confirmDeleteButton().click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });
    return true;
  }
}
