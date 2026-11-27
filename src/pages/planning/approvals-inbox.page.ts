import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { ApprovalsInboxLocators } from '../../locators/planning/approvals-inbox.locators';
import { WAIT } from './waits';

/** One request as the Inbox's own API returns it (GET /api/approval/requests/inbox). */
export interface InboxItem {
  code: string;
  status: string;
  submittedAt: string;
  levelActivatedAt: string | null;
  dueAt: string | null;
  yourPart: string | null;
}

/**
 * Approvals › Inbox (`/approvals`): every request (an Approvals admin) or the
 * ones the user is, or was, an approver on (approval.user). It replaced
 * Control Center's "All requests" on 2026-11-12. A row click opens the
 * request's page; see ApprovalRequestPage.
 */
export class ApprovalsInboxPage extends MasterDataListPage {
  readonly locators: ApprovalsInboxLocators;
  protected readonly route = '/approvals';
  protected readonly heading: Locator;
  // The Inbox has no "New …" action; nothing here ever clicks it.
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new ApprovalsInboxLocators(page);
    this.heading = this.locators.heading;
    this.newButton = page.getByRole('button', { name: 'New request' });
  }

  async expectAdminInbox(): Promise<void> {
    await expect(this.page).toHaveURL(/\/approvals\/?$/, { timeout: WAIT.NAVIGATION });
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.adminSubtitle).toBeVisible();
  }

  async expectSearchPlaceholder(text: string): Promise<void> {
    await expect(this.grid.searchInput).toHaveAttribute('placeholder', text);
  }

  /** The count on an entry of the "+2 more" menu (opens it and closes it again). */
  async moreTabCount(name: string): Promise<number> {
    await this.locators.moreTabsButton.click();
    const item = this.locators.moreTabItem(name);
    await expect(item).toBeVisible();
    const count = Number((await item.innerText()).match(/(\d+)/)?.[1] ?? NaN);
    await this.page.keyboard.press('Escape');
    return count;
  }

  /** Picks a status from the "+2 more" menu; it then shows as a tab. */
  async selectMoreTab(name: string): Promise<void> {
    await this.locators.moreTabsButton.click();
    await this.locators.moreTabItem(name).click();
    await expect(this.grid.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * The visible tabs' counts plus the "+2 more" ones add up to All, re-read
   * together until they agree (other people's requests can land meanwhile).
   */
  async expectStatusCountsAddUp(tabs: string[], more: string[]): Promise<void> {
    await expect(async () => {
      const all = await this.tabCount('All');
      let sum = 0;
      for (const t of tabs) sum += await this.tabCount(t);
      for (const m of more) sum += await this.moreTabCount(m);
      expect(sum, `${[...tabs, ...more].join(' + ')} = All`).toBe(all);
    }).toPass({ timeout: WAIT.SERVER * 2 });
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState).toBeVisible({ timeout: WAIT.SERVER });
  }

  /**
   * Opens the Filters panel at its rule builder ("Add rule"). Like the Planning
   * lists, the rule builder may sit under "Advanced filter".
   */
  async openRuleBuilder(): Promise<void> {
    await this.grid.filtersButton.click();
    await expect(this.grid.addRuleButton.or(this.grid.advancedFilterButton).first()).toBeVisible();
    if (
      (await this.grid.addRuleButton.count()) === 0 &&
      (await this.grid.advancedFilterButton.getAttribute('aria-expanded')) !== 'true'
    )
      await this.grid.advancedFilterButton.click();
    await expect(this.grid.addRuleButton).toBeVisible();
  }

  /** A tab with no requests has no row to check (uat holds few). */
  override async expectEveryRowMatches(term: string): Promise<void> {
    await this.expectLoadedOrEmpty();
    if (await this.gridIsEmpty()) return;
    await super.expectEveryRowMatches(term);
  }

  /** Filters → a rule "`attribute` contains `value`" → Apply (closes the panel). */
  async addRule(attribute: string, value: string): Promise<void> {
    await this.openRuleBuilder();
    await this.grid.addRuleButton.click();
    await this.grid.ruleAttribute.click();
    await this.locators.option(attribute).click();
    await this.grid.ruleValue.click();
    await this.page.keyboard.type(value);
    await this.locators.option().first().click();
    await this.applyFilters();
  }

  /** The Inbox's Filters panel names its button "Apply filters". */
  private async applyFilters(): Promise<void> {
    await this.locators.applyFiltersButton().click();
    // Applying closes the panel on its own.
    await expect(this.grid.filtersDialog).toBeHidden();
  }

  /** Filters → removes the rule → Apply (closes the panel). */
  async clearRule(): Promise<void> {
    await this.openRuleBuilder();
    await this.grid.removeRuleButton.click();
    await this.applyFilters();
  }

  /**
   * Requests as the Inbox's own API reports them, read while `term` is
   * searched — times are ISO strings exactly as the app has them (the grid
   * shows them rounded to the day).
   */
  async apiItems(term: string): Promise<InboxItem[]> {
    let items: InboxItem[] = [];
    await expect(async () => {
      await this.grid.searchInput.fill('');
      const [response] = await Promise.all([
        this.page.waitForResponse((r) => /\/api\/approval\/requests\/inbox/.test(r.url()), {
          timeout: WAIT.SERVER,
        }),
        this.grid.searchInput.fill(term),
      ]);
      const body = (await response.json()) as { items?: InboxItem[] };
      items = body.items ?? [];
      // The search applies after a debounce: retry until the response is the searched one.
      expect(items.some((i) => JSON.stringify(i).includes(term))).toBe(true);
    }).toPass({ timeout: WAIT.SERVER * 3 });
    return items;
  }

  /** One request's API view, found by searching its code. */
  async apiItem(code: string): Promise<InboxItem> {
    const items = await this.apiItems(code);
    const item = items.find((i) => i.code === code);
    if (!item) throw new Error(`${code} not in the Inbox API's results`);
    return item;
  }

  /** Every visible row's Submitted date is on or before the row above it (newest first). */
  async expectNewestFirst(): Promise<void> {
    const dates = (await this.columnValues('Submitted')).map((d) => Date.parse(d));
    expect(
      dates.every((d) => !Number.isNaN(d)),
      `Submitted dates: ${dates}`,
    ).toBe(true);
    for (let i = 1; i < dates.length; i += 1)
      expect(dates[i]!, 'newest first').toBeLessThanOrEqual(dates[i - 1]!);
  }

  /**
   * Decided requests (Approved / Rejected) on the open tab show a dash for Due. The tab
   * also lists requests still pending a later level that this user already approved, so
   * only decided rows count. Re-read until the grid settles: rows re-render between reads.
   */
  async expectDecidedRowsHaveNoDue(): Promise<void> {
    await expect(async () => {
      const status = await this.columnValues('Status');
      const due = await this.columnValues('Due');
      const timed = due.filter(
        (d, i) => d && d !== '—' && /^(Approved|Rejected)/.test(status[i] ?? ''),
      );
      expect(timed, 'decided requests with a Due time').toEqual([]);
    }).toPass({ timeout: WAIT.SERVER });
  }
}
