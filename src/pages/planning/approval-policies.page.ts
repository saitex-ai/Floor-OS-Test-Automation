import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage, expectAbsentOrDisabled } from './master-data-list.page';
import {
  ApprovalPoliciesLocators,
  ApprovalPolicyFormLocators,
} from '../../locators/planning/approval-policies.locators';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { WAIT } from './waits';

/**
 * Approvals › Policies (`/approvals/policies`): the grid of approval
 * policies — which chain a record goes through, per source app and entity
 * type. It moved out of Control Center into its own Approvals app on
 * 2026-11-12. A row click opens Edit policy in place; see
 * ApprovalPolicyFormPage.
 */
export class ApprovalPoliciesPage extends MasterDataListPage {
  readonly locators: ApprovalPoliciesLocators;
  protected readonly route = '/approvals/policies';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new ApprovalPoliciesLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newPolicyButton;
  }

  /** Opens the Approvals app at its Inbox and follows the side navigation to Policies. */
  async openFromApprovalsNav(): Promise<void> {
    await this.gotoAuthenticated('/approvals');
    await expect(this.locators.inboxNavLink).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await this.locators.policiesNavLink.click();
  }

  async expectNavLinks(): Promise<void> {
    await expect(this.locators.inboxNavLink).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.policiesNavLink).toBeVisible();
  }

  async expectOnPolicies(): Promise<void> {
    await expect(this.page).toHaveURL(/\/approvals\/policies$/, { timeout: WAIT.NAVIGATION });
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.subtitle).toBeVisible();
    await expect(this.newButton).toBeVisible();
  }

  async expectSearchPlaceholder(text: string): Promise<void> {
    await expect(this.grid.searchInput).toHaveAttribute('placeholder', text);
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** Opens the list, searches the policy by its (unique) name and opens Edit policy. */
  async openPolicy(name: string): Promise<void> {
    await this.findRow(name);
    // The form fills a level's timing from the SLA configs a moment after it
    // opens (dev 2026-11-18): read nothing before that response is in.
    await Promise.all([
      this.page
        .waitForResponse((r) => /\/api\/sla\/v1\/configs\b/.test(r.url()), {
          timeout: WAIT.NAVIGATION,
        })
        .catch(() => null),
      this.openRow(name),
    ]);
    await expect(new ApprovalPolicyFormLocators(this.page).editHeading).toBeVisible({
      timeout: WAIT.NAVIGATION,
    });
  }

  /** `column` of `name`'s row, re-read until it shows `expected` (a save refetches the grid). */
  async expectCell(name: string, column: string, expected: string | RegExp): Promise<void> {
    await expect
      .poll(() => this.cellValue(name, column), { timeout: WAIT.NAVIGATION })
      .toMatch(typeof expected === 'string' ? new RegExp(`^${escapeRegExp(expected)}$`) : expected);
  }

  /** The policy's Version, as a number. */
  async version(name: string): Promise<number> {
    return Number(await this.cellValue(name, 'Version'));
  }

  /** The cell filter row ("Toggle cell filters") is shown. */
  async showCellFilters(): Promise<void> {
    if ((await this.grid.toggleCellFiltersButton.getAttribute('aria-pressed')) !== 'true')
      await this.grid.toggleCellFiltersButton.click();
    await expect(this.grid.cellFilter('Policy')).toBeVisible();
  }

  /** A dropdown cell filter ("Filter Status" …): picks `value` ("All Status" clears it). */
  async filterColumnBy(column: string, value: string): Promise<void> {
    await this.grid.table.getByRole('combobox', { name: `Filter ${column}`, exact: true }).click();
    await this.locators.filterOption(value).click();
  }

  /** The options a dropdown cell filter offers. */
  async columnFilterOptions(column: string): Promise<string[]> {
    await this.grid.table.getByRole('combobox', { name: `Filter ${column}`, exact: true }).click();
    const options = this.locators.filterOptions();
    await expect(options.first()).toBeVisible();
    const texts = (await options.allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    return texts;
  }

  /**
   * Waits out the footer's "Refreshing…": the grid refetches from the server
   * on every tab, search and sort (it took over 15 s on dev, 2026-11-18).
   */
  async settle(): Promise<void> {
    await expect(this.locators.refreshing).toHaveCount(0, { timeout: WAIT.PAGE_LOAD });
  }

  /** Loaded: the heading and either rows or an empty grid (uat has no policies until a suite makes some). */
  async expectLoaded(): Promise<void> {
    await this.expectLoadedOrEmpty();
  }

  /** Every visible row's `column` reads `value`. */
  async expectEveryRowHas(column: string, value: string): Promise<void> {
    await this.settle();
    // A tab with no policies has no row to check.
    if (await this.gridIsEmpty()) return;
    await expect(this.grid.bodyRows().first()).toBeVisible({ timeout: WAIT.SERVER });
    await expect
      // Rows scrolled out of the grid's viewport render empty cells: skip those.
      .poll(async () => (await this.columnValues(column)).filter((v) => v && v !== value), {
        message: `every ${column} should read "${value}"`,
        timeout: WAIT.SERVER,
      })
      .toEqual([]);
  }

  /** Clicks a column's sort and waits for the server's re-sorted page. */
  async sortAndWait(column: string): Promise<void> {
    await this.sortBy(column);
    await this.settle();
  }

  /** The column header is plain text: no sort button. */
  async expectNotSortable(column: string): Promise<void> {
    await expect(this.grid.columnHeader(column)).toBeVisible();
    await expect(this.grid.columnSortButton(column)).toHaveCount(0);
  }

  /**
   * A split view: the policies as a list of cards beside (or above) the
   * selected policy's detail, which offers Edit and Deactivate / Activate.
   */
  async expectSplitDetail(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible({
      timeout: WAIT.SERVER,
    });
    await expect(this.grid.showingText).toBeVisible();
  }

  /**
   * Toggles "Best-fit columns". While it's on the columns size to their
   * content and lose their resize handles.
   */
  async toggleBestFit(on: boolean): Promise<void> {
    await this.locators.bestFitButton.click();
    await expect(this.locators.bestFitButton).toHaveAttribute('aria-pressed', String(on));
    await expect(this.grid.table.getByRole('button', { name: 'Resize Policy column' })).toHaveCount(
      on ? 0 : 1,
    );
  }

  /**
   * The names of the active policies that apply to `appliesTo` (e.g.
   * "planning · activity"), read from the Active tab.
   */
  async activePoliciesFor(appliesTo: string): Promise<string[]> {
    await this.open();
    await this.expectLoaded();
    await this.selectTab('Active');
    const term = appliesTo.split(' · ').pop()!;
    await this.search(term);
    await this.settle();
    await expect
      .poll(
        async () =>
          (await this.locators.noMatchState.isVisible()) ||
          // Rows scrolled out of the grid's viewport render empty: skip those.
          (await this.grid.bodyRows().allInnerTexts())
            .filter((t) => t.trim())
            .every((t) => t.toLowerCase().includes(term.toLowerCase())),
        { message: `rows should all match "${term}"`, timeout: WAIT.NAVIGATION },
      )
      .toBe(true);
    if (await this.locators.noMatchState.isVisible()) return [];
    const names = await this.columnValues('Policy');
    const scopes = await this.columnValues('Applies to');
    return names.filter((name, i) => name && scopes[i] === appliesTo);
  }

  /**
   * Someone without Approvals admin rights opening Policies directly sees no
   * policy grid and no New policy — whether the app sends them away, says
   * access is restricted or (dev 2026-11-13, approval.user) renders an empty page.
   */
  async expectNoPolicyAccess(): Promise<void> {
    await this.gotoAuthenticated(this.route);
    await expectAbsentOrDisabled(this.newButton);
    await expect(this.grid.bodyRows()).toHaveCount(0);
    await expect(this.heading).toHaveCount(0);
  }
}
