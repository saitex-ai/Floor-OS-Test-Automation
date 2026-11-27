import { type Locator, type Page, type Request, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { RoutingTemplatesListLocators } from '../../locators/planning/routing-templates-list.locators';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { WAIT } from './waits';

/** One template as the list's API returns it (only the fields the suite reads). */
export interface RoutingTemplateSummary {
  code: string;
  name: string;
  cycleKindId: string;
  cycleKindLabel: string;
  productType: string | null;
  washType: string | null;
  statusCode: string;
  sourceCode: string;
}

/** The editor's pick lists, as `GET /api/planning/routing-templates/lookups` returns them. */
export interface RoutingTemplateLookups {
  cycleKinds: { id: string; code: string; label: string; stageGroup: string; active: boolean }[];
  productTypes: { code: string; label: string; active?: boolean }[];
  washTypes: { code: string; label: string; active?: boolean }[];
}

/** What the list page loads on open: every template (up to 200) and the lookups. */
export interface RoutingTemplatesSnapshot {
  templates: RoutingTemplateSummary[];
  lookups: RoutingTemplateLookups;
}

/** Any of the app's own API calls: they carry the user's bearer token. */
const isApiCall = (r: Request) =>
  /\/api\//.test(new URL(r.url()).pathname) && !!r.headers()['authorization'];

/**
 * Planning > Master Data > Routing Templates list. Owned by the Planning QA.
 * Cycle kind pills and status tabs (All / Draft / Active / Retired) filter
 * the grid; each row has inline Duplicate and (Active rows) Retire actions.
 * A row click opens the template's editor — see RoutingTemplateEditorPage.
 */
export class RoutingTemplatesListPage extends MasterDataListPage {
  readonly locators: RoutingTemplatesListLocators;
  protected readonly route = '/planning/master-data/routing-templates';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new RoutingTemplatesListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newTemplateButton;
  }

  /**
   * Past the loading skeleton. The status tabs carry their counts once the
   * list has loaded — even when it is empty (uat has no templates), which
   * the shared expectLoaded (waits for a first row) can't cope with.
   */
  override async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.grid.tab('All')).toHaveText(/^All\s*\d+$/, { timeout: WAIT.PAGE_LOAD });
  }

  /**
   * Opens the list and reads every template and the editor lookups from the
   * API, with the bearer token the list's own request carries. Used to pick
   * a cycle kind × product type × wash type no live template uses, so
   * publishing a QA-AUTO template never supersedes someone else's.
   */
  async openReadingTemplates(): Promise<RoutingTemplatesSnapshot> {
    // The token is read off the app's own API calls while the page loads (no
    // timeout of its own: dev's shell can take over a minute to start). If
    // none was seen, Refresh makes the grid call the API again.
    let token = '';
    const record = (r: Request) => {
      if (isApiCall(r)) token = r.headers()['authorization']!;
    };
    this.page.on('request', record);
    try {
      await this.open();
      await this.expectLoaded();
      if (!token)
        await Promise.all([
          this.page.waitForRequest(isApiCall, { timeout: WAIT.SERVER }),
          this.locators.refreshButton.click(),
        ]);
    } finally {
      this.page.off('request', record);
    }
    const headers = { authorization: token };
    const base = '/api/planning/routing-templates';
    // The API pages at most 200 at a time (the list itself asks for 200).
    const templates: RoutingTemplateSummary[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await this.page.request.get(`${base}?offset=${offset}&limit=200`, { headers });
      expect(page.status(), 'GET routing templates').toBe(200);
      const items = ((await page.json()) as { items: RoutingTemplateSummary[] }).items;
      templates.push(...items);
      if (items.length < 200) break;
    }
    const lookups = await this.page.request.get(`${base}/lookups`, { headers });
    expect(lookups.status(), 'GET routing-template lookups').toBe(200);
    return { templates, lookups: (await lookups.json()) as RoutingTemplateLookups };
  }

  /**
   * Searches `term` and waits until every row matches it (or the grid is
   * empty): the search applies after a debounce, and a keystroke typed while
   * the list is still settling is sometimes dropped, so it is re-typed.
   */
  override async search(term: string): Promise<void> {
    await expect(async () => {
      await this.grid.searchInput.fill(term);
      await expect(this.grid.searchInput).toHaveValue(term, { timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.SERVER });
  }

  /** Opens the list, searches `code`, and waits for its row. */
  override async findRow(code: string): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await expect(async () => {
      await this.search(code);
      await expect(this.grid.row(code)).toBeVisible({ timeout: WAIT.SERVER });
    }).toPass({ timeout: WAIT.NAVIGATION * 2 });
  }

  /**
   * Opens the status tab `tab`, searches `code` and expects its row to be
   * there (present) or not. Retried: the grid re-filters after a refetch.
   */
  async expectRowInTab(code: string, tab: string, present: boolean): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await this.selectTab(tab);
    await expect(async () => {
      await this.search(code);
      await expect(this.grid.row(code)).toHaveCount(present ? 1 : 0, { timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.NAVIGATION * 2 });
  }

  /** Opens a template's editor from its row (a click on its Name cell). */
  override async openRow(code: string): Promise<void> {
    await this.grid.row(code).getByRole('cell').nth(1).click();
  }

  /** The row's text, cells joined by a single space. */
  async rowText(code: string): Promise<string> {
    return (await this.grid.row(code).innerText()).replace(/\s+/g, ' ').trim();
  }

  async expectRowAction(code: string, action: 'Duplicate' | 'Retire'): Promise<void> {
    await expect(this.locators.rowAction(this.grid.row(code), action)).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  /**
   * Duplicates the template on `code`'s row and returns the copy's code, read
   * from the create response. Where dev lands afterwards is the caller's.
   */
  async duplicate(code: string): Promise<string> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' && /\/api\/planning\/routing-templates/.test(r.url()),
        { timeout: WAIT.NAVIGATION },
      ),
      this.locators.rowAction(this.grid.row(code), 'Duplicate').click(),
    ]);
    expect(response.status(), `duplicate ${code}`).toBeLessThan(300);
    const body = (await response.json()) as { template?: { code: string }; code?: string };
    const copy = body.template?.code ?? body.code;
    if (!copy) throw new Error(`No code in the duplicate response for ${code}`);
    return copy;
  }

  async openRetire(code: string): Promise<void> {
    await this.locators.rowAction(this.grid.row(code), 'Retire').click();
  }

  async expectRetireDialog(code: string): Promise<void> {
    await expect(this.locators.retireDialog).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.retireDialog).toHaveAccessibleName(`Retire ${code}?`);
  }

  async retireDialogText(): Promise<string> {
    return (await this.locators.retireDialog.innerText()).replace(/\s+/g, ' ');
  }

  /** The Successor picker's options (opened, read, closed again). */
  async successorOptions(): Promise<string[]> {
    await this.locators.successorPicker.click();
    const options = this.locators.options();
    await expect(options.first()).toBeVisible({ timeout: WAIT.SERVER });
    const texts = (await options.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    await this.page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
    return texts;
  }

  async expectSuccessor(text: string): Promise<void> {
    await expect(this.locators.successorPicker).toHaveText(text);
  }

  async cancelRetire(): Promise<void> {
    await this.locators.retireCancelButton.click();
    await expect(this.locators.retireDialog).toBeHidden();
  }

  /** Confirms the open Retire dialog; waits for the retire call to succeed. */
  async confirmRetire(): Promise<void> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() !== 'GET' &&
          /\/api\/planning\/routing-templates\/[0-9a-f-]{36}/.test(r.url()),
        { timeout: WAIT.NAVIGATION },
      ),
      this.locators.retireConfirmButton.click(),
    ]);
    expect(response.status(), 'retire').toBeLessThan(300);
    await expect(this.locators.retireDialog).toBeHidden({ timeout: WAIT.SERVER });
  }

  async expectCantRetire(code: string, message: string | RegExp): Promise<void> {
    const dialog = this.locators.cantRetireDialog;
    await expect(dialog).toBeVisible({ timeout: WAIT.SERVER });
    await expect(dialog).toHaveAccessibleName(`Can't retire ${code}`);
    await expect(dialog).toContainText(message);
    await expect(this.locators.retireDialog).toHaveCount(0);
  }

  async closeCantRetire(): Promise<void> {
    await this.locators.cantRetireDialog.getByRole('button', { name: 'OK' }).click();
    await expect(this.locators.cantRetireDialog).toBeHidden();
  }

  // ── Cycle kind pills ──────────────────────────────────────────────────

  async selectCycleKind(label: string): Promise<void> {
    const pill = this.locators.cycleKindPill(label);
    await pill.click();
    await expect(pill).toHaveAttribute('aria-pressed', 'true');
  }

  async expectCycleKindSelected(label: string): Promise<void> {
    await expect(this.locators.cycleKindPill(label)).toHaveAttribute('aria-pressed', 'true');
  }

  /** Every pill's label, in order ("All" first), once the cycle kinds have loaded. */
  async cycleKindPillLabels(): Promise<string[]> {
    const pills = this.locators.cycleKindPills.getByRole('button');
    await expect
      .poll(() => pills.count(), { message: 'cycle kind pills load', timeout: WAIT.SERVER })
      .toBeGreaterThan(1);
    return (await pills.allInnerTexts()).map((t) => t.trim());
  }

  /**
   * One column's cell texts, read in a single pass (allInnerTexts): the
   * grid re-renders after a filter, and reading row by row can wait forever
   * on a row that was replaced.
   */
  async columnTexts(column: string): Promise<string[]> {
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const index = headers.indexOf(column);
    if (index < 0) throw new Error(`No "${column}" column in ${headers.join(', ')}`);
    const cells = this.grid.bodyRows().locator(`xpath=./*[${index + 1}]`);
    return (await cells.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  /**
   * Every row's Cycle kind cell reads `label`, once the grid has re-filtered
   * (retried: the filter applies after a refetch).
   */
  async expectEveryRowOfCycleKind(label: string): Promise<void> {
    await expect
      .poll(async () => (await this.columnTexts('Cycle kind')).filter((v) => v !== label), {
        message: `every row should be of cycle kind "${label}"`,
        timeout: WAIT.SERVER,
      })
      .toEqual([]);
  }

  /** Every visible row's Code or Name contains `term` (case-insensitive). */
  async expectEveryRowCodeOrNameMatches(term: string): Promise<void> {
    const t = term.toLowerCase();
    await expect
      .poll(
        async () => {
          const codes = await this.columnTexts('Code');
          const names = await this.columnTexts('Name');
          return codes
            .map((c, i) => `${c} ${names[i]}`)
            .filter((row) => !row.toLowerCase().includes(t));
        },
        { message: `every row's code or name should contain "${term}"`, timeout: WAIT.SERVER },
      )
      .toEqual([]);
  }

  // ── Split view preview ────────────────────────────────────────────────

  /** Selects `code` in a split view, where the list is a column of record buttons rather than table rows. */
  async selectRow(code: string): Promise<void> {
    await this.locators.splitRecord(code).click();
  }

  /** The preview pane, found as the region holding the selected template's heading. */
  previewPane(name: string): Locator {
    return this.page
      .locator('section, aside, [role="region"], div')
      .filter({ has: this.page.getByRole('heading', { name, exact: true }) })
      .filter({ has: this.locators.previewStepsHeading() })
      .last();
  }

  async expectPreview(name: string, expected: (string | RegExp)[]): Promise<void> {
    const pane = this.previewPane(name);
    await expect(pane).toBeVisible({ timeout: WAIT.SERVER });
    for (const text of expected) await expect(pane).toContainText(text);
    await expect(pane.getByRole('tab', { name: 'Table', exact: true })).toBeVisible();
    await expect(pane.getByRole('tab', { name: 'Visual', exact: true })).toBeVisible();
  }

  async previewShowVisual(name: string): Promise<void> {
    const pane = this.previewPane(name);
    await pane.getByRole('tab', { name: 'Visual', exact: true }).click();
    await expect(pane.getByRole('group', { name: 'Step dependency graph' })).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  /** A code cell's exact-text matcher, for callers that check a row is gone. */
  static codeCell(code: string): RegExp {
    return new RegExp(`^${escapeRegExp(code)}$`);
  }
}
