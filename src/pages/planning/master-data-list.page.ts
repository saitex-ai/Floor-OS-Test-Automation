import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  MasterDataListLocators,
  escapeRegExp,
} from '../../locators/planning/master-data-list.locators';
import { WAIT } from './waits';
import { ensureRoute } from './navigation';

/**
 * Shared flows for every Planning > Master Data list screen — they're all
 * the same grid component (search, tabs, Filters, Configure columns,
 * Toggle cell filters, view switch, pagination). Each concrete list page
 * (ActivitiesListPage, OperationsListPage, WorkCentresListPage, …) adds its
 * own route, heading and "New ..." button on top.
 */
/**
 * Whether `button` is (or becomes) present and enabled within
 * WAIT.PERMISSION_SETTLE. It's watched for the whole window, not read once:
 * write controls render after the user's permissions load, so a single read
 * right after the heading appears could miss one that shows up later.
 */
export async function becomesUsable(button: Locator): Promise<boolean> {
  const deadline = Date.now() + WAIT.PERMISSION_SETTLE;
  let usable = false;
  await expect
    .poll(
      async () => {
        usable = (await button.count()) > 0 && (await button.first().isEnabled());
        return usable || Date.now() >= deadline;
      },
      { intervals: [250], timeout: WAIT.PERMISSION_SETTLE + WAIT.SERVER },
    )
    .toBe(true);
  return usable;
}

/** Passes when `button` stays absent, or disabled, for WAIT.PERMISSION_SETTLE. */
export async function expectAbsentOrDisabled(button: Locator): Promise<void> {
  expect(await becomesUsable(button), 'control should be absent or disabled').toBe(false);
}

/**
 * A read-only user's "New …" / "Edit …" either isn't usable (absent or
 * disabled) or, where a screen still renders it enabled, leads to "Access
 * restricted" instead of a form with a working `submitName` button.
 * Screens differ in which of these they do — ClickUp z941abybge.
 */
export async function expectActionBlocked(
  page: Page,
  button: Locator,
  submitName: string | RegExp,
): Promise<void> {
  if (!(await becomesUsable(button))) return;
  const grid = new MasterDataListLocators(page);
  await button.first().click();
  await expect(grid.accessRestricted.first()).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  await expect(grid.submitButton(submitName)).toHaveCount(0);
}

export abstract class MasterDataListPage extends BasePage {
  readonly grid: MasterDataListLocators;

  protected abstract readonly route: string;
  protected abstract readonly heading: Locator;
  protected abstract readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = new MasterDataListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(this.route);
    await ensureRoute(this.page, this.route);
  }

  /** Waits past the loading skeleton: real rows carry a "Select row …" checkbox. */
  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.grid.bodyRows().first()).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectGridVisible(): Promise<void> {
    await expect(this.grid.table).toBeVisible();
  }

  async openNew(): Promise<void> {
    await this.newButton.click();
  }

  async expectNewButtonEnabled(): Promise<void> {
    await expect(this.newButton).toBeEnabled();
  }

  /** A read-only user either doesn't get the "New …" button or gets a real `<button disabled>`. */
  async expectNewUnavailable(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectAbsentOrDisabled(this.newButton);
  }

  /** A read-only user can't get to a working create form from "New …". */
  async expectNewBlocked(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.grid.bodyRows().first()).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectActionBlocked(this.page, this.newButton, /^Create\b/);
  }

  /**
   * A user without access is either shown "Access restricted" on the screen
   * (has Planning, lacks this master's read role) or sent back to the App
   * Launcher (no Planning app at all) — either way the grid never renders.
   */
  async expectAccessRestricted(): Promise<void> {
    const leftScreen = new RegExp(`^(?!.*${this.route.replace(/\//g, '\\/')}).*$`);
    await expect
      .poll(
        async () =>
          (await this.grid.accessRestricted.isVisible().catch(() => false)) ||
          leftScreen.test(this.page.url()),
        { message: 'blocked: "Access restricted" or redirected away', timeout: WAIT.PAGE_LOAD },
      )
      .toBe(true);
    await expect(this.newButton).toHaveCount(0);
    await expect(this.grid.bodyRows()).toHaveCount(0);
  }

  async search(term: string): Promise<void> {
    await this.grid.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.grid.searchInput.fill('');
  }

  /** Opens the list, searches for `code` and waits for its row. */
  async findRow(code: string): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await this.search(code);
    await expect(this.grid.row(code)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectRowVisible(code: string): Promise<void> {
    await expect(this.grid.row(code)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNoRow(code: string): Promise<void> {
    await expect(this.grid.row(code)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  async expectRowContains(code: string, text: string | RegExp): Promise<void> {
    await expect(this.grid.row(code)).toContainText(text, { timeout: WAIT.SERVER });
  }

  async openRow(code: string): Promise<void> {
    await this.grid.row(code).click();
  }

  /**
   * Every visible body row's text contains `term` (case-insensitive).
   * Search and filters apply after a debounce, so this retries until the
   * grid has settled rather than reading the rows once.
   */
  async expectEveryRowMatches(term: string): Promise<void> {
    const rows = this.grid.bodyRows();
    await expect(rows.first()).toBeVisible({ timeout: WAIT.SERVER });
    await expect
      .poll(
        async () =>
          (await rows.allInnerTexts()).filter((t) => !t.toLowerCase().includes(term.toLowerCase())),
        { message: `every row should match "${term}"`, timeout: WAIT.SERVER },
      )
      .toEqual([]);
  }

  /**
   * Searches `term` and returns each of `codes` that has a row, with that
   * row's text. The search applies after a debounce, so this first waits
   * until every visible row contains `term` (or the grid is empty) — a read
   * before that would still see the unfiltered first page.
   */
  /**
   * For cleanup: the codes of rows whose text holds one of `tags` (a record's
   * unique name tag), after searching `term`. Codes as dev generates them
   * (CAL-0001, SH-0002…): the first cell that reads like one.
   */
  async codesForTags(term: string, tags: string[]): Promise<string[]> {
    await this.search(term);
    await expect
      .poll(
        async () =>
          (await this.grid.bodyRows().allInnerTexts()).every((t) =>
            t.toLowerCase().includes(term.toLowerCase()),
          ),
        { message: `rows should all match "${term}"`, timeout: WAIT.SERVER },
      )
      .toBe(true);
    if (tags.length > 25) await this.setRowsPerPage(100);
    const codes: string[] = [];
    for (const tag of tags) {
      const row = this.grid.bodyRows().filter({ hasText: tag }).first();
      if ((await row.count()) === 0) continue;
      const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
      const code = cells.find((c) => /^[A-Z][A-Z0-9_]*-\d+$/.test(c));
      if (code) codes.push(code);
    }
    return codes;
  }

  async rowTexts(term: string, codes: string[]): Promise<Map<string, string>> {
    await this.search(term);
    const rows = this.grid.bodyRows();
    await expect
      .poll(
        async () =>
          (await rows.allInnerTexts()).every((t) => t.toLowerCase().includes(term.toLowerCase())),
        { message: `rows should all match "${term}"`, timeout: WAIT.SERVER },
      )
      .toBe(true);
    if (codes.length > 25) await this.setRowsPerPage(100);
    const found = new Map<string, string>();
    for (const code of codes) {
      const row = this.grid.row(code).first();
      if ((await row.count()) > 0) found.set(code, await row.innerText());
    }
    return found;
  }

  async visibleRowCount(): Promise<number> {
    return this.grid.bodyRows().count();
  }

  /** The number in a tab's label, e.g. 58 for "Production 58". */
  async tabCount(name: string): Promise<number> {
    const label = await this.grid.tab(name).innerText();
    const match = label.match(/(\d+)/);
    if (!match) throw new Error(`Tab "${name}" has no count: "${label}"`);
    return Number(match[1]);
  }

  async selectTab(name: string): Promise<void> {
    await this.grid.tab(name).click();
  }

  /**
   * The `parts` tab counts add up to `total`'s. Every count is re-read on each
   * attempt: another worker (or another file's afterAll cleanup) can create
   * or retire records between two reads, so one stale read mustn't decide it.
   */
  async expectTabCountsAddUp(parts: string[], total = 'All'): Promise<void> {
    await expect(async () => {
      const counts = await Promise.all([total, ...parts].map((t) => this.tabCount(t)));
      const [all, ...rest] = counts;
      expect(
        rest.reduce((a, b) => a + b, 0),
        `${parts.join(' + ')} = ${total}`,
      ).toBe(all);
    }).toPass({ timeout: WAIT.SERVER });
  }

  /** The selected tab's count matches the grid's "of N" total, both re-read together until they agree. */
  async expectTabCountMatchesRows(name: string): Promise<void> {
    await expect(async () => {
      const badge = await this.tabCount(name);
      expect((await this.showing()).total, `"${name}" tab count = rows shown`).toBe(badge);
    }).toPass({ timeout: WAIT.SERVER });
  }

  async expectColumnHeaders(names: string[]): Promise<void> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts())
      .map((h) => h.trim())
      .filter(Boolean);
    expect(headers).toEqual(expect.arrayContaining(names));
    const positions = names.map((n) => headers.indexOf(n));
    expect(positions, `columns in order ${names.join(', ')}; got ${headers.join(', ')}`).toEqual(
      [...positions].sort((a, b) => a - b),
    );
  }

  /** The texts of one column's cells, top to bottom. */
  async columnValues(column: string): Promise<string[]> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const index = headers.indexOf(column);
    if (index < 0) throw new Error(`No "${column}" column in ${headers.join(', ')}`);
    const rows = await this.grid.bodyRows().all();
    const values: string[] = [];
    for (const row of rows)
      values.push((await row.getByRole('cell').nth(index).innerText()).trim());
    return values;
  }

  /** One cell's text, by the row's code and the column's header. */
  async cellValue(code: string, column: string): Promise<string> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const index = headers.indexOf(column);
    if (index < 0) throw new Error(`No "${column}" column in ${headers.join(', ')}`);
    return (await this.grid.row(code).first().getByRole('cell').nth(index).innerText()).trim();
  }

  /** The row offers no inline action such as a trailing "Edit". */
  async expectNoRowAction(code: string, action: string): Promise<void> {
    await expect(
      this.grid.row(code).first().getByRole('button', { name: action, exact: true }),
    ).toHaveCount(0);
  }

  async sortBy(column: string): Promise<void> {
    await this.grid.columnSortButton(column).click();
  }

  async openFilters(): Promise<void> {
    await this.grid.filtersButton.click();
    await expect(this.grid.addRuleButton).toBeVisible();
  }

  /**
   * Filters → "Add rule" → Attribute / operator / Value → Apply. The panel
   * renders inline above the grid with a live "N <records> match" count.
   */
  async addFilterRule(attribute: string, value: string): Promise<void> {
    await this.grid.addRuleButton.click();
    await this.grid.ruleAttribute.click();
    await this.page.getByRole('option', { name: attribute, exact: true }).click();
    // Value is a searchable combobox: type, then pick the matching value
    // or its 'Use "<text>"' custom entry (offered for any free text).
    await this.grid.ruleValue.click();
    await this.page.keyboard.type(value);
    await this.page
      .getByRole('option', { name: value, exact: true })
      .or(this.page.getByRole('option', { name: new RegExp(`^Use "${escapeRegExp(value)}"`) }))
      .first()
      .click();
    await this.grid.applyButton.click();
  }

  async filterMatchCount(): Promise<number> {
    const text = await this.grid.filterMatchCount.innerText();
    return Number(text.match(/(\d+)/)![1]);
  }

  async expectFilterChip(text: string): Promise<void> {
    await expect(this.grid.filterChip(text)).toBeVisible();
  }

  async expectNoFilterChip(text: string): Promise<void> {
    await expect(this.grid.filterChip(text)).toHaveCount(0);
  }

  async clearAllFilters(): Promise<void> {
    await this.grid.clearAllButton.click();
  }

  async removeFilterRule(): Promise<void> {
    await this.grid.removeRuleButton.click();
    await this.grid.applyButton.click();
  }

  async expectFiltersBadge(count: number): Promise<void> {
    await expect(this.grid.filtersButton).toHaveAccessibleName(`Filters (${count} applied)`);
  }

  async expectNoFiltersBadge(): Promise<void> {
    await expect(this.grid.filtersButton).toHaveAccessibleName('Filters');
  }

  async hideColumn(name: string): Promise<void> {
    await this.grid.configureColumnsButton.click();
    await this.grid.columnToggle(name).uncheck();
    await this.grid.columnsApplyButton().click();
  }

  async resetColumns(): Promise<void> {
    await this.grid.configureColumnsButton.click();
    await this.grid.resetColumnsButton.click();
    const apply = this.grid.columnsApplyButton();
    if (await apply.isEnabled().catch(() => false)) await apply.click();
    else await this.page.keyboard.press('Escape');
  }

  async expectColumnVisible(name: string): Promise<void> {
    await expect(this.grid.columnHeader(name)).toBeVisible();
  }

  async expectColumnHidden(name: string): Promise<void> {
    await expect(this.grid.columnHeader(name)).toHaveCount(0);
  }

  async toggleCellFilters(): Promise<void> {
    await this.grid.toggleCellFiltersButton.click();
  }

  async expectCellFilterRow(column: string): Promise<void> {
    await expect(this.grid.cellFilter(column)).toBeVisible();
  }

  async filterColumn(column: string, value: string): Promise<void> {
    await this.grid.cellFilter(column).fill(value);
  }

  async switchView(name: 'No split' | 'Vertical split' | 'Horizontal split'): Promise<void> {
    await this.grid.viewButton(name).click();
  }

  async expectViewActive(name: 'No split' | 'Vertical split' | 'Horizontal split'): Promise<void> {
    await expect(this.grid.viewButton(name)).toHaveAttribute('aria-pressed', 'true');
  }

  async setRowsPerPage(rows: number): Promise<void> {
    await this.grid.rowsPerPage.click();
    await this.page.getByRole('option', { name: String(rows), exact: true }).click();
  }

  async nextPage(): Promise<void> {
    await this.grid.nextPageButton.click();
  }

  async previousPage(): Promise<void> {
    await this.grid.previousPageButton.click();
  }

  /** "Showing 1 to 100 of 110" → { from: 1, to: 100, total: 110 }. */
  async showing(): Promise<{ from: number; to: number; total: number }> {
    const text = await this.grid.showingText.innerText();
    const match = text.match(/(\d+) to (\d+) of (\d+)/);
    if (!match) throw new Error(`Unexpected footer text: "${text}"`);
    return { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) };
  }

  async expectOnPage(n: number): Promise<void> {
    await expect(this.grid.pageJump).toHaveValue(String(n));
  }
}
