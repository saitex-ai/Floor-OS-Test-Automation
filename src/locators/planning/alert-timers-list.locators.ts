import { type Locator, type Page } from '@playwright/test';
import { MasterDataListLocators } from './master-data-list.locators';

/**
 * Raw element locators for Planning > Master Data > Alert timers
 * (/planning/master-data/alert-timers) and its tile on the Master Data hub.
 * The grid itself (search, tabs, table, sort buttons) is the shared Master
 * Data grid, so `grid` reuses MasterDataListLocators. No actions or
 * assertions here, see src/pages/planning/alert-timers-list.page.ts.
 */
export class AlertTimersListLocators {
  readonly grid: MasterDataListLocators;
  readonly heading: Locator;
  readonly newButton: Locator;
  /** "Alert timers / Organisation · delivery · sections · channels" on /planning/master-data. */
  readonly hubTile: Locator;
  /** Any tile link on the Master Data hub (to tell "hub loaded, no tile" from "hub not loaded"). */
  readonly hubFilter: Locator;
  /** The directory-degraded notice ("Names and emails are unavailable right now…"). */
  readonly degradedNotice: Locator;
  /** The App Launcher's "Pinned Modules" heading: where a user with no Planning app lands. */
  readonly launcherHeading: Locator;
  /** The tabs of the first tab list in the page body. */
  readonly tabs: Locator;
  /** The count cards above the tabs: a term ("Real time") per card. */
  readonly countCardTerms: Locator;

  constructor(private readonly page: Page) {
    this.grid = new MasterDataListLocators(page);
    this.heading = page.getByRole('heading', { name: 'Alert timers', level: 1 });
    this.newButton = page.getByRole('button', { name: 'New alert timer' });
    this.hubTile = page.getByRole('link', { name: /^Alert timers\b/ });
    this.hubFilter = page.getByRole('textbox', { name: 'Filter master data' });
    this.degradedNotice = page.getByText('Names and emails are unavailable right now', {
      exact: false,
    });
    this.launcherHeading = page.getByRole('heading', { name: 'Pinned Modules' });
    this.tabs = page.getByRole('main').getByRole('tablist').first().getByRole('tab');
    this.countCardTerms = page.getByRole('main').getByRole('term');
  }

  /** The count card's caption ("6 active accounts") under a cadence term. */
  countCardCaption(term: string): Locator {
    return this.page
      .getByRole('main')
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${term}$`) })
      .locator('xpath=following-sibling::*[1]');
  }

  /** The "Disabled" badge inside a row's User cell. */
  disabledBadge(row: Locator): Locator {
    return row.getByRole('cell').first().getByText('Disabled', { exact: true });
  }

  /**
   * A row's first (User) cell holding `username`, for filtering rows. Only
   * the first cell: Last saved also names a user ("Sep 28 15:57 · ie.admin").
   */
  userCellText(username: string): Locator {
    return this.page
      .locator('[role="cell"]:first-child, td:first-child')
      .filter({ has: this.page.getByText(username, { exact: true }) });
  }

  /** The cells of `username`'s row (`rowLocator` is that row). */
  cells(rowLocator: Locator): Locator {
    return rowLocator.getByRole('cell');
  }

  /** An inline Edit control (button or link) inside a row. */
  rowEditControls(rowLocator: Locator): Locator {
    return rowLocator
      .getByRole('button', { name: /edit/i })
      .or(rowLocator.getByRole('link', { name: /edit/i }));
  }

  /** The username text in the first cell of a row. */
  usernameIn(rowLocator: Locator, username: string): Locator {
    return this.cells(rowLocator).first().getByText(username, { exact: true });
  }
}
