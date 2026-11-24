import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage, becomesUsable, expectAbsentOrDisabled } from './master-data-list.page';
import { AlertTimersListLocators } from '../../locators/planning/alert-timers-list.locators';
import { SECTION_LABELS } from '../../locators/planning/alert-timer-form.locators';
import type { AlertTimerRow } from './alert-timers-network';
import { ensureRoute } from './navigation';
import { isLauncherLanding } from './alert-timers-access';
import { WAIT } from './waits';

const HUB = '/planning/master-data';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** The Alert timer pill: "Real time", "Daily 07:00", "Weekly Mon 07:00" or "Off". */
export const PILL = new RegExp(
  `^(Real time|Daily \\d{2}:\\d{2}|Weekly (${WEEKDAYS.join('|')}) \\d{2}:\\d{2}|Off)$`,
);
const SECTION_CODES: Record<string, string> = {
  risks: 'Delivery risks',
  slips: 'Date slips',
  capacity: 'Capacity',
  accuracy: 'Estimate accuracy',
  prep_completion: 'Prep completion',
};
const CADENCE_RANK = { real_time: 0, daily: 1, weekly: 2 } as const;

/** The pill text a stored timer should show in the list and on its Details page. */
export function pillFor(row: AlertTimerRow): string {
  if (!row.isEnabled) return 'Off';
  if (row.cadence === 'real_time') return 'Real time';
  if (row.cadence === 'daily') return `Daily ${row.sendAt}`;
  return `Weekly ${WEEKDAYS[(row.sendWeekday ?? 1) - 1]} ${row.sendAt}`;
}

/** Section codes → labels, in the order the timer stores them. */
export function sectionLabels(codes: string[]): string[] {
  return codes.map((c) => SECTION_CODES[c] ?? c);
}

export type SortColumn = 'User' | 'Group' | 'Alert timer' | 'Last saved';

/**
 * Planning > Master Data > Alert timers list
 * (/planning/master-data/alert-timers) and its tile on the Master Data hub.
 * The grid is the shared Master Data grid (search, tabs, sort); rows are
 * one saved timer per person, identified by the username in the User cell.
 */
export class AlertTimersListPage extends MasterDataListPage {
  readonly locators: AlertTimersListLocators;
  protected readonly route = '/planning/master-data/alert-timers';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new AlertTimersListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newButton;
  }

  /** Heading and tabs are up. Unlike other masters, the grid may be legitimately empty (uat). */
  override async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.grid.tab('All')).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** Waits until the grid shows a first row. */
  async expectRowsLoaded(): Promise<void> {
    await expect(this.grid.bodyRows().first()).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  // ── Master Data hub ─────────────────────────────────────────────────

  /**
   * Navigates without waiting for the app shell, for a user with no Planning
   * app: on a Planning URL the shell shows "Loading Planning…" and moves to
   * the launcher URL without its user menu, so gotoAuthenticated() would
   * time out (dev, 2026-11-17).
   */
  async gotoAsOutsider(path: 'hub' | 'list'): Promise<void> {
    await this.page.goto(path === 'hub' ? HUB : this.route);
  }

  async openHub(): Promise<void> {
    await this.gotoAuthenticated(HUB);
    await ensureRoute(this.page, HUB);
  }

  /** The hub shows the "Alert timers" tile under Organisation, linking to the list. */
  async expectHubTile(): Promise<void> {
    const tile = this.locators.hubTile;
    await expect(tile).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(tile).toHaveAccessibleName(
      'Alert timers Organisation · delivery · sections · channels',
    );
    await expect(tile).toHaveAttribute('href', this.route);
  }

  async openFromHubTile(): Promise<void> {
    await this.locators.hubTile.click();
    await expect(this.page).toHaveURL(new RegExp(`${this.route}$`), { timeout: WAIT.NAVIGATION });
    await this.expectLoaded();
  }

  /**
   * A user without `planning:digest:read` gets no tile: either the hub
   * loads without it, or (no Planning app at all) the shell sends them back
   * to the launcher before the hub renders.
   */
  async expectNoHubTile(): Promise<void> {
    await expect
      .poll(
        async () =>
          isLauncherLanding(this.page.url(), HUB) ||
          (await this.locators.hubFilter.isVisible().catch(() => false)),
        {
          message: 'the hub loaded, or the user landed on the app launcher (not the login page)',
          timeout: WAIT.PAGE_LOAD,
        },
      )
      .toBe(true);
    await expect(this.locators.hubTile).toHaveCount(0);
  }

  // ── Header: count cards and tabs ────────────────────────────────────

  /** The tabs are exactly `names`, in order (no "Not set"). */
  async expectTabsExactly(names: string[]): Promise<void> {
    await expect(this.grid.tab(names[0]!)).toBeVisible({ timeout: WAIT.SERVER });
    const tabs = this.locators.tabs;
    const labels = (await tabs.allInnerTexts()).map((t) => t.replace(/\s*\d+\s*$/, '').trim());
    expect(labels).toEqual(names);
  }

  /** One count card per cadence, captioned "N active account(s)" ("-" while there are none). */
  async expectCountCards(names: string[]): Promise<void> {
    await expect(this.locators.countCardTerms.first()).toBeVisible({ timeout: WAIT.SERVER });
    expect((await this.locators.countCardTerms.allInnerTexts()).map((t) => t.trim())).toEqual(
      names,
    );
    for (const name of names)
      await expect(this.locators.countCardCaption(name)).toHaveText(
        /^(1\s*active account|\d+\s*active accounts|-)$/,
      );
  }

  // ── Rows ────────────────────────────────────────────────────────────

  /** The grid row whose User cell holds `username`. */
  rowFor(username: string): Locator {
    return this.grid.bodyRows().filter({ has: this.locators.userCellText(username) });
  }

  async expectRowShown(username: string): Promise<void> {
    await expect(this.userCell(username)).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** The grid (re-rendered) no longer shows `username`. */
  async expectRowNotShown(username: string): Promise<void> {
    await expect(this.rowFor(username)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /** The usernames the grid shows, top to bottom. */
  async usersInOrder(): Promise<string[]> {
    return (await this.columnValues('User')).map((u) => u.split(/\s/)[0]!);
  }

  /**
   * Every row's cells hold what the columns promise: a known pill, sections
   * from the known five, channels from In-app / Email, an email or "—", and
   * "<date> · <who>" under Last saved; and each row matches the timer the
   * server returned for it.
   */
  async expectRowsMatch(rows: AlertTimerRow[]): Promise<void> {
    await this.expectRowsLoaded();
    for (const row of rows.slice(0, 10)) await this.expectRowCells(row);
  }

  private async expectRowCells(row: AlertTimerRow): Promise<void> {
    const username = row.username!;
    const cells = this.rowFor(username).first().getByRole('cell');
    await expect(cells.nth(2), `${username} pill`).toHaveText(pillFor(row));
    expect(pillFor(row)).toMatch(PILL);
    const sections = (await cells.nth(3).innerText()).split(',').map((s) => s.trim());
    expect(sections, `${username} sections`).toEqual(sectionLabels(row.sections));
    for (const s of sections) expect(SECTION_LABELS as readonly string[]).toContain(s);
    const channels = (await cells.nth(4).innerText()).split(',').map((s) => s.trim());
    expect(['In-app', 'Email'], `${username} channels`).toEqual(expect.arrayContaining(channels));
    expect(channels.length).toBe(row.channels.length);
    await expect(cells.nth(5), `${username} email`).toHaveText(row.email ?? '—');
    await expect(cells.nth(6), `${username} last saved`).toHaveText(
      new RegExp(`^[A-Z][a-z]{2} \\d{1,2} \\d{2}:\\d{2} · ${row.lastSavedBy?.username ?? '.+'}$`),
    );
  }

  /** The username renders in a monospace face. */
  async expectUsernameMonospace(username: string): Promise<void> {
    await expect(this.userCell(username)).toHaveCSS('font-family', /mono/i);
  }

  /** The User cell shows a "Disabled" badge next to the username. */
  async expectDisabledBadge(username: string): Promise<void> {
    await expect(this.locators.disabledBadge(this.rowFor(username).first())).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  /** Clicking the User cell opens that person's Details page (/alert-timers/<userId>). */
  async openTimer(row: AlertTimerRow): Promise<void> {
    await this.userCell(row.username!).click();
    await expect(this.page).toHaveURL(new RegExp(`${this.route}/${row.userId}$`), {
      timeout: WAIT.NAVIGATION,
    });
  }

  /** The row carries no inline Edit control (button or link). */
  async expectNoRowEdit(username: string): Promise<void> {
    const row = this.rowFor(username);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: /edit/i })).toHaveCount(0);
    await expect(row.getByRole('link', { name: /edit/i })).toHaveCount(0);
  }

  /** The "New alert timer" toolbar button is there and usable. */
  async expectNewAvailable(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    expect(await becomesUsable(this.newButton), '"New alert timer" usable').toBe(true);
  }

  /** A read-only user gets no usable "New alert timer". */
  async expectNoNewButton(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectAbsentOrDisabled(this.newButton);
  }

  /** The search box's placeholder names everything it matches. */
  async expectSearchPlaceholder(text: string): Promise<void> {
    await expect(this.grid.searchInput).toHaveAttribute('placeholder', text);
  }

  // ── Sort ────────────────────────────────────────────────────────────

  /**
   * The rendered User column follows `rows` (the server's answer for this
   * sort) top to bottom.
   */
  async expectRenderedOrder(rows: AlertTimerRow[]): Promise<void> {
    const expected = rows.map((r) => r.username ?? r.userId);
    await expect.poll(() => this.usersInOrder(), { timeout: WAIT.SERVER }).toEqual(expected);
  }

  // ── Directory degraded ──────────────────────────────────────────────

  /** Banner shown; rows fall back to account ids, with no email. */
  async expectDegraded(rows: AlertTimerRow[]): Promise<void> {
    await expect(this.locators.degradedNotice).toHaveText(
      'Names and emails are unavailable right now. Timers are shown by account id.',
      { timeout: WAIT.PAGE_LOAD },
    );
    await this.expectRowsLoaded();
    const users = await this.columnValues('User');
    const emails = await this.columnValues('Email');
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) expect(u.split(/\s/)[0], 'User cell is the account id').toMatch(UUID);
    expect(rows.map((r) => r.userId)).toEqual(
      expect.arrayContaining(users.map((u) => u.split(/\s/)[0])),
    );
    for (const e of emails) expect(e, 'Email cell').toBe('—');
  }

  private userCell(username: string): Locator {
    return this.rowFor(username).first().getByRole('cell').first().getByText(username, {
      exact: true,
    });
  }
}

/**
 * Sort key the list orders by, per sortable column, as the server applies
 * it: Group follows the lookups' group order (Admin, Industrial engineering,
 * Planning, Line supervisor, …), Alert timer Real time < Daily < Weekly < Off.
 */
export function sortKey(
  column: SortColumn,
  row: AlertTimerRow,
  groupOrder: string[],
): string | number {
  switch (column) {
    case 'User':
      return row.username ?? '';
    case 'Group':
      return groupOrder.indexOf(row.groups[0]?.code ?? '');
    case 'Alert timer':
      return row.isEnabled ? CADENCE_RANK[row.cadence] : 3;
    case 'Last saved':
      return Date.parse(row.lastSavedAt);
  }
}

/** The list request's sortBy for each column. */
export const SORT_PARAM: Record<SortColumn, string> = {
  User: 'username',
  Group: 'group',
  'Alert timer': 'cadence',
  'Last saved': 'lastSaved',
};
