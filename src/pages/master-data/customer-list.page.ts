import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerListLocators } from '../../locators/master-data/customer-list.locators';

const CUSTOMER_LIST_PATH = '/master-data/system-management/customers';

/**
 * Customer Master list, under the top-level Master Data module's System
 * Management group. Real route: /master-data/system-management/customers.
 * Owned by the Master Data QA (shared module). Element locators live in
 * CustomerListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CustomerListPage extends BasePage {
  readonly locators: CustomerListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newCustomerButton).toBeVisible();
  }

  async openNewCustomer(): Promise<void> {
    await this.locators.newCustomerButton.click();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /** Clicking a row opens straight into Edit Customer — confirmed live, no detail view in between. */
  async openEdit(exactCellText: string): Promise<void> {
    await this.locators.row(exactCellText).click();
  }

  /**
   * Reads the live total off the "All {n}" tab, e.g. for before/after
   * Cancel comparisons. Waits for a genuinely positive count first —
   * confirmed live (on Company Master, same shared list component) that
   * right after navigation the tab can transiently read "All 0" before
   * the real data finishes loading.
   */
  async getAllCount(): Promise<number> {
    // No literal space in the regex: the "All" label and its count render
    // in separate nested elements with CSS gap, not an actual space
    // character in the combined text content — confirmed live.
    await expect(this.locators.allTab).toHaveText(/^All\s*[1-9]\d*$/, { timeout: 15_000 });
    const text = await this.locators.allTab.innerText();
    const match = /\d+/.exec(text);
    return match ? Number(match[0]) : NaN;
  }

  async expectRowVisible(exactCellText: string): Promise<void> {
    await expect(this.locators.row(exactCellText)).toBeVisible({ timeout: 15_000 });
  }

  async expectRowNotVisible(exactCellText: string): Promise<void> {
    await expect(this.locators.row(exactCellText)).toHaveCount(0);
  }

  async expectRowStatus(
    exactCellText: string,
    status: 'Draft' | 'Approved' | 'Inactive' | 'Rejected',
  ): Promise<void> {
    await expect(this.locators.statusCell(exactCellText)).toHaveText(status, { timeout: 15_000 });
  }
}
