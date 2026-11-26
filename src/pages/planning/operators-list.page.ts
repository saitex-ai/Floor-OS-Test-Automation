import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { OperatorsListLocators } from '../../locators/planning/operators-list.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Operators & Qualifications list. Owned by the
 * Planning QA. Tabs are by deployment (All / Fixed / Floating / Rotating
 * crew). A click on an operator's name opens their profile — see
 * OperatorProfilePage; the chevron in the same cell only expands the row
 * into that operator's qualifications.
 */
export class OperatorsListPage extends MasterDataListPage {
  readonly locators: OperatorsListLocators;
  protected readonly route = '/planning/master-data/operators';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new OperatorsListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newButton;
  }

  /**
   * Opens the first profile whose employee resolves — a seed record; read-only
   * callers only. A profile whose employee record is gone ("Operator
   * unavailable") has no "Add a qualification" row when edited, and such
   * profiles can fill whole pages (dev, 2026-10-28: 76 of 95, and all 50 rows
   * of page 1), so this pages forward until it finds one.
   */
  async openFirstResolvedProfile(): Promise<void> {
    const resolved = this.locators.resolvedRows(this.grid.bodyRows());
    while ((await resolved.count()) === 0) {
      expect(
        await this.grid.nextPageButton.isEnabled(),
        'no operator profile with a resolving employee on any page',
      ).toBe(true);
      const { from } = await this.showing();
      await this.nextPage();
      await expect.poll(async () => (await this.showing()).from).not.toBe(from);
    }
    await resolved.first().click();
  }

  /** Planning › Master Data, then its "Operators & Qualifications" tile. */
  async openFromMasterDataLanding(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data');
    await expect(this.locators.landingTile()).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** The landing's tiles that mention operators or qualifications: their accessible names. */
  async landingTileNames(): Promise<string[]> {
    return this.locators.landingTiles().allInnerTexts();
  }

  async openLandingTile(): Promise<void> {
    await this.locators.landingTile().click();
    await expect(this.page).toHaveURL(/\/planning\/master-data\/operators$/, {
      timeout: WAIT.NAVIGATION,
    });
    await this.expectLoaded();
  }

  /** Opens the list with a plain goto (no English sign-in markers: works in any language). */
  async gotoDirect(): Promise<void> {
    await this.page.goto(this.route);
  }

  /** The page's H1 reads `text` (also a translated one). */
  async expectTitle(text: string): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: text })).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
  }

  /** Heading, its description line and the "All masters" way back. */
  async expectHeader(description: string): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.description).toHaveText(description);
    await expect(this.locators.allMastersButton.first()).toBeVisible();
  }

  async searchPlaceholder(): Promise<string> {
    return (await this.grid.searchInput.getAttribute('placeholder')) ?? '';
  }

  /** The "Showing X to Y of Z" footer, once the grid has settled after a search. */
  async searchTotal(term: string): Promise<number> {
    await this.search(term);
    await this.expectEveryRowMatchesOrNone(term);
    return (await this.showing()).total;
  }

  private async expectEveryRowMatchesOrNone(term: string): Promise<void> {
    // The search applies after a debounce: wait until the footer stops moving.
    let previous = '';
    await expect
      .poll(
        async () => {
          const now = (await this.grid.showingText.innerText().catch(() => '')) + term;
          const settled = now === previous;
          previous = now;
          return settled;
        },
        { intervals: [750], timeout: WAIT.SERVER },
      )
      .toBe(true);
  }

  /** Opens the list and searches `employeeNo` until its row shows. */
  async findOperator(employeeNo: string): Promise<void> {
    await expect(async () => {
      await this.open();
      await this.expectLoaded();
      await this.search(employeeNo);
      await expect(this.locators.operatorRow(employeeNo)).toBeVisible({
        timeout: WAIT.SERVER,
      });
    }).toPass({ timeout: 90_000, intervals: [5_000] });
  }

  async expectOperatorRow(employeeNo: string): Promise<void> {
    await expect(this.locators.operatorRow(employeeNo)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNoOperatorRow(employeeNo: string): Promise<void> {
    await expect(this.locators.operatorRow(employeeNo)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /**
   * Searching `term` lists `employeeNo`'s row (on whichever page). A broad
   * term matches many operators and other workers add more while this runs,
   * so every attempt re-reads the results from page 1 at 100 rows a page
   * instead of continuing from wherever the last attempt stopped.
   */
  async expectSearchFindsOperator(term: string, employeeNo: string): Promise<void> {
    await this.search(term);
    await expect(this.grid.bodyRows().first()).toBeVisible({ timeout: WAIT.SERVER });
    await this.setRowsPerPage(100);
    await expect(async () => {
      await this.firstPage();
      while ((await this.locators.operatorRow(employeeNo).count()) === 0) {
        expect(
          await this.grid.nextPageButton.isEnabled(),
          `${employeeNo} in the results for "${term}"`,
        ).toBe(true);
        const { from } = await this.showing();
        await this.nextPage();
        await expect.poll(async () => (await this.showing()).from).not.toBe(from);
      }
    }).toPass({ timeout: 60_000, intervals: [1_000, 2_000, 5_000] });
  }

  async expectPreviousPageDisabled(): Promise<void> {
    await expect(this.grid.previousPageButton).toBeDisabled();
  }

  /**
   * A user without access lands on "Access restricted" (Planning, but not
   * this master) or on the App Launcher (no Planning app); the list never renders.
   */
  async expectAccessRestricted(): Promise<void> {
    await expect(this.grid.accessRestricted.first().or(this.locators.launcherModules)).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
    await expect(this.newButton).toHaveCount(0);
    await expect(this.grid.bodyRows()).toHaveCount(0);
  }

  async expectOperatorRowContains(employeeNo: string, text: string): Promise<void> {
    await expect(this.locators.operatorRow(employeeNo)).toContainText(text);
  }

  /** Searching `term` doesn't list `employeeNo` (the results fit one page, or none). */
  async expectSearchMisses(term: string, employeeNo: string): Promise<void> {
    await this.search(term);
    await this.setRowsPerPage(100);
    await expect(this.locators.operatorRow(employeeNo)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /** One cell of `employeeNo`'s row, by column header. */
  async operatorCell(employeeNo: string, column: string): Promise<string> {
    await expect(this.grid.columnHeader(column)).toBeVisible({ timeout: WAIT.SERVER });
    const headers = (await this.grid.table.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    const index = headers.indexOf(column);
    if (index < 0) throw new Error(`No "${column}" column in ${headers.join(', ')}`);
    const row = this.locators.operatorRow(employeeNo).first();
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    return (await row.getByRole('cell').nth(index).innerText()).trim();
  }

  /** Clicks the operator's name (not the chevron) and waits for the profile. */
  async openOperator(employeeNo: string): Promise<void> {
    const row = this.locators.operatorRow(employeeNo).first();
    await row.getByText(employeeNo, { exact: true }).first().click();
    await expect(this.page).toHaveURL(/\/planning\/master-data\/operators\/[0-9a-f-]{36}$/, {
      timeout: WAIT.NAVIGATION,
    });
  }

  async expectExpander(employeeNo: string, present: boolean): Promise<void> {
    await expect(this.locators.expander(this.locators.operatorRow(employeeNo).first())).toHaveCount(
      present ? 1 : 0,
    );
  }

  /** Clicks the chevron; returns the URL it left unchanged. */
  async toggleQualifications(employeeNo: string): Promise<string> {
    const url = this.page.url();
    await this.locators.expander(this.locators.operatorRow(employeeNo).first()).click();
    return url;
  }

  async expanderLabel(employeeNo: string): Promise<string> {
    return (
      (await this.locators
        .expander(this.locators.operatorRow(employeeNo).first())
        .getAttribute('aria-label')) ??
      (await this.locators.expander(this.locators.operatorRow(employeeNo).first()).innerText())
    );
  }

  async expectExpanded(): Promise<void> {
    await expect(this.locators.expandedTable()).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectCollapsed(): Promise<void> {
    await expect(this.locators.expandedTable()).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  async expandedHeaders(): Promise<string[]> {
    return (await this.locators.expandedTable().getByRole('columnheader').allInnerTexts()).map(
      (h) => h.trim(),
    );
  }

  /** The expanded table's body rows, each as its cells' texts. */
  async expandedRows(): Promise<string[][]> {
    const rows = await this.locators
      .expandedTable()
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .all();
    const out: string[][] = [];
    // A cell can hold two lines ("SEW-COINHEM" / "task"): one space instead.
    for (const row of rows)
      out.push(
        (await row.getByRole('cell').allInnerTexts()).map((c) => c.replace(/\s+/g, ' ').trim()),
      );
    return out;
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchHeading).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.noMatchHint).toBeVisible();
  }

  /** Whether the column's header offers a sort button (roll-up columns don't). */
  async isSortable(column: string): Promise<boolean> {
    return (await this.grid.columnSortButton(column).count()) > 0;
  }

  /** Configure columns: untick each of `names`, then Apply. */
  async hideColumns(names: string[]): Promise<void> {
    await this.grid.configureColumnsButton.click();
    for (const name of names) await this.grid.columnToggle(name).uncheck();
    await this.grid.columnsApplyButton().click();
    await expect(this.grid.columnsDialog).toBeHidden();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.expectLoaded();
  }

  /** The Filters panel's rule attributes (the "Attribute" picker's options), then closes the picker. */
  async filterAttributes(): Promise<string[]> {
    await this.grid.addRuleButton.click();
    await this.grid.ruleAttribute.click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible();
    const names = (await options.allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    await this.grid.removeRuleButton.last().click();
    return names;
  }

  /** The Filters panel's values for a choice attribute (e.g. Deployment), then removes the rule. */
  async filterValues(attribute: string): Promise<string[]> {
    await this.grid.addRuleButton.click();
    await this.grid.ruleAttribute.click();
    await this.page.getByRole('option', { name: attribute, exact: true }).click();
    await this.grid.ruleValue.click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible();
    const values = (await options.allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    await this.grid.removeRuleButton.last().click();
    return values;
  }

  /** "Go to" a page with the pager's page input, if the pager has one. */
  async firstPage(): Promise<void> {
    const first = this.page.getByRole('button', { name: 'First page' });
    if (await first.isVisible()) await first.click();
    else while (await this.grid.previousPageButton.isEnabled()) await this.previousPage();
  }

  /** The app's "Not Found" page is showing (a removed route). */
  async expectNotFoundPage(): Promise<void> {
    await expect(this.page.getByText('Not Found').first()).toBeVisible({ timeout: 60_000 });
  }

  /** The Master Data landing page has no link to the old Qualifications route. */
  async expectNoOldQualificationsLink(): Promise<void> {
    await expect(this.page.locator('a[href*="/planning/master-data/qualifications"]')).toHaveCount(
      0,
    );
  }
}
