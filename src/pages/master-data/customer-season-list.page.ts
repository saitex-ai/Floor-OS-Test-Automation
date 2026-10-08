import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CustomerSeasonListLocators } from '../../locators/master-data/customer-season-list.locators';

const SEASON_LIST_PATH = '/master-data/system-management/seasons';

/**
 * Customer Season Master list, under the top-level Master Data module's
 * System Management group. Real route:
 * /master-data/system-management/seasons. Owned by the Master Data QA
 * (shared module). Element locators live in CustomerSeasonListLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class CustomerSeasonListPage extends BasePage {
  readonly locators: CustomerSeasonListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerSeasonListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(SEASON_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newSeasonButton).toBeVisible();
  }

  async openNewSeason(): Promise<void> {
    await this.locators.newSeasonButton.click();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  /** Clicking a row opens the "Edit Season" dialog directly — confirmed live. */
  async openEdit(exactCellText: string): Promise<void> {
    await this.locators.row(exactCellText).click();
  }

  /**
   * Reads the live total off the "All {n}" tab — confirmed live to
   * re-scope to an active search filter. Waits for a genuinely positive
   * count first — right after navigation the tab can transiently read
   * "All 0" before the real data finishes loading (same shared list
   * component as Company/Customer Master).
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
