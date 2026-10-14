import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { CodeListsLocators } from '../../locators/planning/code-lists.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Code lists: one row per lookup table (Code
 * list / Table / What it means / Values). Owned by the Planning QA. The
 * tables are a fixed manifest — there's no create at this level; a row
 * click opens that list's own page (CodeListValuesPage).
 */
export class CodeListsPage extends MasterDataListPage {
  readonly locators: CodeListsLocators;
  protected readonly route = '/planning/master-data/code-lists';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new CodeListsLocators(page);
    this.heading = this.locators.listHeading;
    this.newButton = this.locators.newCodeListButton;
  }

  async expectNoCreateAction(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.anyNewButton).toHaveCount(0);
  }
}

/**
 * One code list's own page (/planning/master-data/code-lists/<table>):
 * Table / In plain terms / Why it exists, All / In use / Retired tabs, and
 * the values grid (Value / Shown as / What it means / Display order / In
 * use) with "New value". A row click opens the value's view dialog — see
 * CodeListValueDialogPage.
 */
export class CodeListValuesPage extends MasterDataListPage {
  readonly locators: CodeListsLocators;
  protected readonly route: string;
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(
    page: Page,
    readonly table: string,
  ) {
    super(page);
    this.locators = new CodeListsLocators(page);
    this.route = `/planning/master-data/code-lists/${table}`;
    this.heading = this.locators.listTitle;
    this.newButton = this.locators.newValueButton;
  }

  /** Waits for the list's own page: its summary shows `table`. */
  async expectOnListPage(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/code-lists/${this.table}$`), {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.summaryText(this.table)).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectSummaryFields(): Promise<void> {
    for (const label of ['Table', 'In plain terms', 'Why it exists'])
      await expect(this.locators.summaryText(label)).toBeVisible();
  }

  async listName(): Promise<string> {
    return (await this.locators.listTitle.innerText()).trim();
  }

  /** The cells of one value row, keyed by column header. */
  async valueRow(code: string): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const column of ['Value', 'Shown as', 'What it means', 'Display order', 'In use'])
      out[column] = await this.cellValue(code, column);
    return out;
  }
}
