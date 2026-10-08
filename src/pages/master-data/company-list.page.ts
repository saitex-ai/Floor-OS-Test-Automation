import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CompanyListLocators } from '../../locators/master-data/company-list.locators';

const COMPANY_LIST_PATH = '/master-data/system-management/company';

/**
 * Company Master list, under the top-level Master Data module's System
 * Management group. Real route: /master-data/system-management/company.
 * Owned by the Master Data QA (shared module). Element locators live in
 * CompanyListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CompanyListPage extends BasePage {
  readonly locators: CompanyListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CompanyListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(COMPANY_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newCompanyButton).toBeVisible();
  }

  async openNewCompany(): Promise<void> {
    await this.locators.newCompanyButton.click();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /** Clicking a row opens straight into Edit Company — confirmed live, no detail view in between. */
  async openEdit(exactCellText: string): Promise<void> {
    await this.locators.row(exactCellText).click();
  }

  /**
   * Reads the live total off the "All {n}" tab, e.g. for before/after
   * Cancel comparisons. Waits for a genuinely positive count first —
   * confirmed live that right after navigation the tab can transiently
   * read "All 0" before the real data finishes loading, which a caller
   * reading too early would wrongly treat as the real baseline.
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

  async rowCountFor(exactCellText: string): Promise<number> {
    return this.locators.row(exactCellText).count();
  }

  async expectRowStatus(exactCellText: string, status: 'Active' | 'Inactive'): Promise<void> {
    await expect(this.locators.statusCell(exactCellText)).toHaveText(status, { timeout: 15_000 });
  }
}
