import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { TransitionRulesListLocators } from '../../locators/planning/transition-rules.locators';
import { CHANGE_CLASSES, TRANSITION_RULES_ROUTE } from './transition-rule-editor.page';
import { WAIT } from './waits';

export interface SummaryCard {
  label: string;
  count: number;
  caption: string;
}

/** One list row, read from its cells. `days` is null where the rule has no curve ("—"). */
export interface RuleRowValues {
  code: string;
  changeClass: string;
  days: number | null;
  priority: number;
}

/**
 * Transition rules list (/planning/master-data/transition-rules): the shared
 * Master Data grid plus change-class summary cards above the All / Active /
 * Inactive tabs. A rule's code has no column of its own: the Rule cell reads
 * "<name> <subtitle> · <CODE>", so rows are found by that suffix.
 */
export class TransitionRulesListPage extends MasterDataListPage {
  protected readonly route = TRANSITION_RULES_ROUTE;
  protected readonly heading: Locator;
  protected readonly newButton: Locator;
  readonly l: TransitionRulesListLocators;

  constructor(page: Page) {
    super(page);
    this.l = new TransitionRulesListLocators(page);
    this.heading = this.l.heading;
    this.newButton = this.l.newButton;
  }

  /** Opens the list in List view: the split mode a previous visit picked is remembered. */
  override async open(): Promise<void> {
    await super.open();
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.grid.table.or(this.l.splitRecords).first()).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
    if (await this.l.splitRecords.isVisible()) await this.switchView('No split');
  }

  /** For a user without access: the list never renders (restricted, or sent away). */
  async expectNoAccess(): Promise<void> {
    // Not gotoAuthenticated(): a user without Planning never gets the app's
    // user menu (dev 2026-11-17: the no-access user sits on "Loading Planning…" at /).
    await this.goto(TRANSITION_RULES_ROUTE);
    await this.expectAccessRestricted();
  }

  /** Planning › Master Data hub → the Transition rules tile. */
  async openFromHub(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data');
    await this.l.hubTile.click();
    await expect(this.page).toHaveURL(new RegExp(`${TRANSITION_RULES_ROUTE}$`), {
      timeout: WAIT.NAVIGATION,
    });
  }

  /** The heading and tabs are up (the grid may legitimately be empty). */
  async expectOpen(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.grid.tab('All')).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectHeader(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.l.subtitle).toHaveText(
      /^What it costs a work centre when the thing it runs changes — minutes at the boundary, and efficiency afterwards\. A plain master/,
    );
    await expect(this.page).toHaveURL(new RegExp(`${TRANSITION_RULES_ROUTE}$`));
  }

  /**
   * Searches `term` and waits until the grid shows the server's answer: the
   * list searches server-side (`?search=`), and while it fetches the grid can
   * briefly show the old rows, no rows, or the no-match state. A search the
   * page already ran can come from its cache with no request: then the caller's
   * own row check (which retries) decides.
   */
  override async search(term: string): Promise<void> {
    if ((await this.grid.searchInput.inputValue()) === term) return;
    const [response] = await Promise.all([
      this.page
        .waitForResponse(
          (r) => {
            const url = new URL(r.url());
            return (
              r.request().method() === 'GET' &&
              url.pathname.endsWith('/transition-rules') &&
              url.searchParams.get('search') === term &&
              url.searchParams.get('limit') !== '1'
            );
          },
          { timeout: WAIT.SERVER },
        )
        .catch(() => null),
      this.grid.searchInput.fill(term),
    ]);
    if (!response) {
      // No request: the page served this search from its cache. Don't judge the old grid:
      // wait until it shows rows or the no-match state, then the caller's own row check decides.
      await expect(this.grid.bodyRows().first().or(this.l.noMatchState)).toBeVisible({
        timeout: WAIT.SERVER,
      });
      return;
    }
    const { items } = (await response.json()) as { items: { code: string }[] };
    if (!items.length) {
      await expect(this.l.noMatchState).toBeVisible({ timeout: WAIT.SERVER });
      return;
    }
    // A description match isn't visible in the row, so match the rows by the codes found.
    await expect
      .poll(
        async () => {
          const texts = await this.grid.bodyRows().allInnerTexts();
          return (
            texts.length === items.length &&
            items.every((item) => texts.some((t) => t.includes(`· ${item.code}`)))
          );
        },
        {
          message: `the grid shows the ${items.length} rule(s) found for "${term}"`,
          timeout: WAIT.SERVER,
        },
      )
      .toBe(true);
  }

  ruleRow(code: string): Locator {
    return this.l.row(this.grid.table, code);
  }

  /** Opens the list, searches the code, and waits for the rule's row. */
  async findRule(code: string): Promise<void> {
    await this.open();
    await this.expectOpen();
    await this.search(code);
    await expect(this.ruleRow(code)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectRule(code: string): Promise<void> {
    await expect(this.ruleRow(code)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectSingleRow(code: string): Promise<void> {
    await expect(this.ruleRow(code)).toHaveCount(1, { timeout: WAIT.SERVER });
  }

  async expectNoRule(code: string): Promise<void> {
    await expect(this.ruleRow(code)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /** Clicks the rule's name (not the row checkbox) to open its view page. */
  async openRule(code: string): Promise<void> {
    await this.ruleRow(code).getByRole('cell').nth(1).click();
    await expect(this.page).toHaveURL(/\/transition-rules\/[0-9a-f-]{36}$/, {
      timeout: WAIT.NAVIGATION,
    });
  }

  /** The texts of a rule's cells, keyed by column header. */
  async ruleCells(code: string): Promise<Record<string, string>> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const cells = (await this.ruleRow(code).first().getByRole('cell').allInnerTexts()).map((c) =>
      c.replace(/\s+/g, ' ').trim(),
    );
    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (h) values[h] = cells[i] ?? '';
    });
    return values;
  }

  async expectAmbiguousFlag(code: string, shown: boolean): Promise<void> {
    await expect(this.l.ambiguousFlag(this.ruleRow(code))).toHaveCount(shown ? 1 : 0, {
      timeout: WAIT.SERVER,
    });
  }

  /** The Loss cell's hover text (its `title`). */
  async lossTitle(code: string): Promise<string> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const cell = this.ruleRow(code).getByRole('cell').nth(headers.indexOf('Loss'));
    return (await this.l.titled(cell).getAttribute('title')) ?? '';
  }

  /** The four change-class summary cards, in order. */
  async summaryCards(): Promise<SummaryCard[]> {
    await expect(this.l.cardCaptions).toHaveCount(4, { timeout: WAIT.SERVER });
    const cards: SummaryCard[] = [];
    for (const caption of await this.l.cardCaptions.all())
      cards.push({
        label: (await this.l.cardLabel(caption).innerText()).trim(),
        count: Number((await this.l.cardCount(caption).innerText()).trim()),
        caption: (await caption.innerText()).trim(),
      });
    return cards;
  }

  /** Every row the current tab shows (up to 100), with its class, days and priority. */
  async rowValues(): Promise<RuleRowValues[]> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const [rule, cls, days, priority] = ['Rule', 'Change class', 'Days', 'Priority'].map((h) =>
      headers.indexOf(h),
    );
    const out: RuleRowValues[] = [];
    for (const row of await this.grid.bodyRows().all()) {
      const cells = (await row.getByRole('cell').allInnerTexts()).map((c) =>
        c.replace(/\s+/g, ' ').trim(),
      );
      if (cells.length < headers.length) continue;
      const code = cells[rule!]!.match(/· ([A-Z0-9][A-Z0-9-]*)(?:· ambiguous)?$/)?.[1] ?? '';
      const d = cells[days!]!;
      out.push({
        code,
        changeClass: cells[cls!]!,
        days: d === '—' || d === '' ? null : Number(d),
        priority: Number(cells[priority!]),
      });
    }
    return out;
  }

  /**
   * After a search for `term`: the codes of the rows it finds (waits for the
   * search to apply: every row holds the term, or there are none).
   */
  async activeCodes(term: string): Promise<string[]> {
    await this.search(term);
    return (await this.rowValues()).map((r) => r.code).filter(Boolean);
  }

  /**
   * After a search for `term`: each row's rule-cell text (name, then "· CODE") and code.
   * Used by the start-of-run sweep to read the run tag out of leftover rules' names.
   */
  async ruleLabels(term: string): Promise<{ code: string; label: string }[]> {
    await this.search(term);
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const rule = headers.indexOf('Rule');
    const out: { code: string; label: string }[] = [];
    for (const row of await this.grid.bodyRows().all()) {
      const cells = await row.getByRole('cell').allInnerTexts();
      const label = (cells[rule] ?? '').replace(/\s+/g, ' ').trim();
      const code = label.match(/· ([A-Z0-9][A-Z0-9-]*)(?:· ambiguous)?$/)?.[1] ?? '';
      if (code) out.push({ code, label });
    }
    return out;
  }

  /** Shows up to 100 rows (the grid defaults to 50). */
  async showAllRows(): Promise<void> {
    if ((await this.showing()).total > 50) await this.setRowsPerPage(100);
  }

  /** The class order the cards and the default sort use. */
  classOrder(): string[] {
    return [...CHANGE_CLASSES];
  }

  /** Opens Filters, picks `value` in the field `label`, applies and closes the sheet. */
  async filterBy(label: string, value: string): Promise<void> {
    await this.grid.filtersButton.click();
    await expect(this.grid.filtersDialog).toBeVisible();
    await this.l.filterField(this.grid.filtersDialog, label).click();
    await this.l.option(value).click();
    await this.page.keyboard.press('Escape');
    if (!(await this.grid.filtersDialog.isVisible())) await this.grid.filtersButton.click();
    await this.grid.applyButton.click();
    await this.closeFilters();
  }

  async expectFilterFields(labels: string[]): Promise<void> {
    await this.grid.filtersButton.click();
    await expect(this.grid.filtersDialog).toBeVisible();
    for (const label of labels)
      await expect(this.l.filterField(this.grid.filtersDialog, label), label).toBeVisible();
    await this.closeFilters();
  }

  async expectGridTools(): Promise<void> {
    await expect(this.grid.configureColumnsButton).toBeVisible();
    await expect(this.grid.toggleCellFiltersButton).toBeVisible();
  }

  /** In a split view: selects the rule's card, which shows it in the preview pane. */
  async selectInSplit(code: string): Promise<void> {
    await this.l.splitCard(code).click();
  }

  async editFromPreview(): Promise<void> {
    await this.l.previewEditButton.click();
    await expect(this.page).toHaveURL(/\/transition-rules\/[^/]+\/edit$/, {
      timeout: WAIT.NAVIGATION,
    });
  }

  /** The preview pane (main, beside the cards) holds `text`. */
  async expectPreviewShows(text: string | RegExp): Promise<void> {
    await expect(this.l.previewPane).toContainText(text);
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.l.emptyState).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.l.emptyStateHint).toBeVisible();
    await expect(this.l.noMatchState).toHaveCount(0);
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.l.noMatchState).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.l.noMatchHint).toBeVisible();
    await expect(this.l.emptyState).toHaveCount(0);
  }

  /**
   * Serves this page an empty rules list and summary (the zero-rule state an
   * environment only has before its first rule). Only the list reads change.
   */
  async serveNoRules(): Promise<void> {
    await this.page.route(/\/api\/planning\/transition-rules(\?.*)?$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({ json: { items: [], total: 0 } });
    });
    await this.page.route(/\/api\/planning\/transition-rules\/summary(\?.*)?$/, (route) =>
      route.fulfill({
        json: {
          items: CHANGE_CLASSES.map((_, i) => ({
            changeClass: ['repeat', 'similar', 'new_variant', 'new_product'][i],
            count: 0,
            minDays: null,
            maxDays: null,
          })),
        },
      }),
    );
  }

  /** Selects a row's checkbox, which brings up the bulk bar. */
  async selectRow(code: string): Promise<void> {
    await this.ruleRow(code).getByRole('checkbox').check();
  }

  async expectBulkBar(): Promise<void> {
    await expect(this.l.clearSelectionButton).toBeVisible();
    await expect(this.l.bulkDeactivateButton.or(this.l.bulkActivateButton).first()).toBeVisible();
  }

  async clearSelection(): Promise<void> {
    await this.l.clearSelectionButton.click();
  }

  /** Whether the list offers a Duplicate action on a row (right-click menu or row action). */
  async hasDuplicateAction(code: string): Promise<boolean> {
    await this.ruleRow(code).click({ button: 'right' });
    // Give a menu time to open first (on dev/uat the row has no menu at all): a menu that
    // opens late must not read as "no Duplicate". The probe is bounded, then the page is checked.
    await this.l.rowMenu.waitFor({ state: 'visible', timeout: 3_000 }).then(
      () => true,
      () => false,
    );
    const offered = (await this.l.duplicateAction.count()) > 0;
    await this.page.keyboard.press('Escape');
    return offered;
  }
}
