import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the shared data grid every Planning > Master
 * Data list screen is built on (Activities, Difficulty grades, Recipes &
 * operations, ...): search box, tabs, toolbar icons (Filters, Configure
 * columns, Toggle cell filters, view switch), the table itself and its
 * pagination footer. No actions or assertions here, see
 * src/pages/planning/master-data-list.page.ts for those.
 */
export class MasterDataListLocators {
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly filtersButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly toggleCellFiltersButton: Locator;
  /** Opens the rule builder ("Add rule") under the Filters panel's per-field pickers. */
  readonly advancedFilterButton: Locator;
  readonly addRuleButton: Locator;
  readonly ruleAttribute: Locator;
  readonly ruleValue: Locator;
  readonly removeRuleButton: Locator;
  readonly filterMatchCount: Locator;
  readonly applyButton: Locator;
  /** The Filters side sheet (since the 2026-10-28 dev deploy) and its Close. */
  readonly filtersDialog: Locator;
  readonly closeFiltersButton: Locator;
  readonly clearAllButton: Locator;
  readonly doneButton: Locator;
  readonly resetColumnsButton: Locator;
  readonly columnsDialog: Locator;
  readonly rowsPerPage: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly pageJump: Locator;
  readonly showingText: Locator;
  readonly accessRestricted: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.table = page.getByRole('table').first();
    // "Filters", or "Filters (1 applied)" once a rule is applied.
    this.filtersButton = page.getByRole('button', { name: /^Filters( \(\d+ applied\))?$/ });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.toggleCellFiltersButton = page.getByRole('button', { name: 'Toggle cell filters' });
    this.advancedFilterButton = page.getByRole('button', { name: 'Advanced filter' });
    this.addRuleButton = page.getByRole('button', { name: 'Add rule' });
    this.ruleAttribute = page
      .getByRole('combobox')
      .filter({ hasText: /^Attribute/ })
      .last();
    this.ruleValue = page
      .getByRole('combobox')
      .filter({ hasText: /^Value/ })
      .last();
    this.removeRuleButton = page.getByRole('button', { name: 'Remove rule' });
    this.filterMatchCount = page.getByText(/\d+ \w+ match/);
    this.applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    this.filtersDialog = page.getByRole('dialog', { name: 'Filters' });
    this.closeFiltersButton = this.filtersDialog.getByRole('button', { name: 'Close' });
    this.clearAllButton = page
      .getByRole('button', { name: 'Clear all' })
      .or(page.getByRole('link', { name: 'Clear all' }));
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
    this.resetColumnsButton = page.getByRole('button', { name: 'Reset to default' });
    this.columnsDialog = page.getByRole('dialog', { name: 'Columns' });
    this.rowsPerPage = page.getByRole('combobox', { name: 'Rows per page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.previousPageButton = page.getByRole('button', { name: 'Previous page' });
    // Was a "Jump to page" textbox until the 2026-10-28 dev deploy; now plain "N of M" text.
    this.pageJump = page.getByText(/^\d+ of \d+$/);
    this.showingText = page.getByText(/^Showing \d+ to \d+ of \d+/);
    this.accessRestricted = page.getByText(/Access restricted/i);
  }

  /** A form's submit button by name ("Create …" / "Save changes"). */
  submitButton(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name });
  }

  /** Status/department tabs above the grid, e.g. "All 101", "Production 58". */
  /** A tab: its label, then its count ("All 377"); not the page's "All masters" back link. */
  tab(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}( \\d+)?$`) });
  }

  /**
   * The page toolbar's "View" menu button (since the 2026-10-28 dev deploy;
   * it replaced the three No split / Vertical split / Horizontal split
   * buttons). A split view can render a second grid (e.g. a recipe's
   * operations) with its own View, so this takes the first.
   */
  viewMenuButton(): Locator {
    return this.page.getByRole('button', { name: 'View', exact: true }).first();
  }

  /** The open View menu. */
  viewMenu(): Locator {
    return this.page.getByRole('menu', { name: 'View' });
  }

  /** One choice in the open View menu: "List View", "Vertical Split", "Horizontal Split". */
  viewOption(name: 'List View' | 'Vertical Split' | 'Horizontal Split'): Locator {
    return this.viewMenu().getByRole('menuitemradio', { name });
  }

  /**
   * A row matched on a cell whose whole text is `code` — never a loose
   * substring match on the row, because another row that references this
   * code (e.g. as its predecessor) would also match and trip strict mode.
   * Versioned records (recipes) show one row per version; callers that
   * care pick one with .first()/.filter().
   */
  row(code: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${escapeRegExp(code)}$`) }),
    });
  }

  /**
   * Every data row of the grid: the body rowgroup's rows that have text.
   * (Not "Select row …" — a read-only user's grid has no checkbox column —
   * and not the loading skeleton, whose rows are empty.)
   */
  bodyRows(): Locator {
    return this.table.getByRole('rowgroup').nth(1).getByRole('row').filter({ hasText: /\S/ });
  }

  /** Header cells are named "<Column> Resize <Column> column"; the sort control is a button. */
  columnHeader(name: string): Locator {
    return this.table.getByRole('columnheader', {
      name: new RegExp(`^${escapeRegExp(name)} Resize`),
    });
  }

  columnSortButton(name: string): Locator {
    return this.columnHeader(name).getByRole('button', { name, exact: true });
  }

  /** A column's checkbox inside the "Columns" drawer ("Toggle <column>"). */
  columnToggle(name: string): Locator {
    return this.columnsDialog.getByRole('checkbox', { name: `Toggle ${name}`, exact: true });
  }

  /** An applied-rule chip above the grid, e.g. 'Code contains "CUT-QA…"'. */
  filterChip(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  columnsApplyButton(): Locator {
    return this.columnsDialog.getByRole('button', { name: 'Apply', exact: true });
  }

  /** The per-column input ("Filter <column>") in the row "Toggle cell filters" adds. */
  cellFilter(column: string): Locator {
    return this.table.getByRole('textbox', { name: `Filter ${column}`, exact: true });
  }
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
