import { type Locator, type Page } from '@playwright/test';

/**
 * Techpack Dashboard (the module landing, `/techpacks`): element locators
 * only, see src/pages/techpack/techpack.page.ts for actions/assertions.
 *
 * Rewritten 2026-10-23 for the FloorOS design-system release of 2026-10-22,
 * confirmed live on uat (ARIA dumps, see test-cases/techpack/techpack-list.md):
 *
 * - The landing is a "Dashboard": a summary strip, a "Production Stages"
 *   region (STEP 1-6 buttons that filter the grid) and the techpack grid.
 * - "Create New" replaced the "New Techpack" split button. It always opens
 *   AI Mode (`/techpacks/new/copilot`) and has no menu.
 * - Techpack codes in the grid are buttons, not links, and open
 *   `/techpacks/view/{id}`.
 * - Toolbar: Search, Filters (a "Filter" dialog, plus an "Advanced Filters"
 *   rule builder), Configure columns (a "Columns" dialog), View (a menu:
 *   List View / Vertical Split / Grid View) and Export. "Toggle cell
 *   filters" and the split buttons are gone.
 * - There are two nested <main> elements; the content is the last one.
 */
export class TechpackLocators {
  readonly main: Locator;
  readonly heading: Locator;
  readonly createNewButton: Locator;
  readonly summaryStrip: Locator;

  // Production Stages (STEP 1-6). Selecting one adds a "Clear" button inside the region.
  readonly productionStages: Locator;
  readonly stagesClearButton: Locator;

  // Status tabs (label includes a live count, e.g. "Open 11" — match by
  // prefix so the count doesn't need to be hardcoded).
  readonly allTab: Locator;
  readonly draftTab: Locator;
  readonly openTab: Locator;
  readonly approvedTab: Locator;

  // Toolbar
  readonly searchInput: Locator;
  readonly filtersButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly viewButton: Locator;
  readonly exportButton: Locator;

  // "Filter" dialog
  readonly filterDialog: Locator;
  readonly filterApplyButton: Locator;
  readonly filterClearButton: Locator;
  readonly advancedFilterButton: Locator;
  readonly filterChips: Locator;
  readonly clearAllFiltersButton: Locator;

  // "Advanced Filters" dialog (the rule builder)
  readonly advancedFilterDialog: Locator;
  readonly addRuleButton: Locator;
  readonly noCustomRulesText: Locator;
  readonly ruleMatchCountText: Locator;
  readonly removeRuleButton: Locator;

  // "Columns" dialog
  readonly columnsDialog: Locator;
  readonly columnsCounterText: Locator;
  readonly columnsApplyButton: Locator;
  readonly columnsResetButton: Locator;
  readonly columnsShowAllButton: Locator;
  readonly lockedColumnCheckbox: Locator;

  // "View" menu and its layouts
  readonly viewMenu: Locator;
  readonly openTechPackButton: Locator;
  readonly gridViewCards: Locator;

  // Row selection bar
  readonly itemsSelectedText: Locator;
  readonly clearSelectionButton: Locator;
  readonly compareButton: Locator;

  // Pager
  readonly showingCountText: Locator;
  readonly pageText: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly rowsPerPageSelect: Locator;

  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly bodyRows: Locator;
  /** Every techpack code button in the grid (`TP202610-000131`, `DRAFT/01M5GZWAD0WY`). */
  readonly codeButtons: Locator;
  readonly emptyResultText: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main').last();
    this.heading = page.getByRole('heading', { name: 'Dashboard', level: 1 });
    this.createNewButton = this.main.getByRole('button', { name: 'Create New', exact: true });
    // The strip has no roles of its own: the ARIA tree shows it as one text node.
    this.summaryStrip = this.main.getByText(/Active packs/);

    this.productionStages = this.main.getByRole('region', { name: 'Production Stages' });
    this.stagesClearButton = this.productionStages.getByRole('button', {
      name: 'Clear',
      exact: true,
    });

    this.allTab = this.main.getByRole('button', { name: /^All \d+/ });
    this.draftTab = this.main.getByRole('button', { name: /^Draft \d+/ });
    this.openTab = this.main.getByRole('button', { name: /^Open \d+/ });
    this.approvedTab = this.main.getByRole('button', { name: /^Approved \d+/ });

    this.searchInput = this.main.getByRole('textbox', { name: 'Search' });
    // "Filters" becomes "Filters (1 applied)" once a filter is applied.
    this.filtersButton = this.main.getByRole('button', { name: /^Filters/ });
    this.configureColumnsButton = this.main.getByRole('button', { name: 'Configure columns' });
    this.viewButton = this.main.getByRole('button', { name: 'View', exact: true });
    this.exportButton = this.main.getByRole('button', { name: 'Export', exact: true });

    this.filterDialog = page.getByRole('dialog', { name: 'Filter', exact: true });
    this.filterApplyButton = this.filterDialog.getByRole('button', { name: 'Apply', exact: true });
    this.filterClearButton = this.filterDialog.getByRole('button', { name: 'Clear', exact: true });
    this.advancedFilterButton = this.filterDialog.getByRole('button', { name: 'Advanced Filter' });
    this.filterChips = this.main.getByRole('button', { name: /^Remove / });
    this.clearAllFiltersButton = this.main.getByRole('button', { name: 'Clear all', exact: true });

    this.advancedFilterDialog = page.getByRole('dialog', { name: 'Advanced Filters' });
    this.addRuleButton = this.advancedFilterDialog.getByRole('button', { name: 'Add rule' });
    this.noCustomRulesText = this.advancedFilterDialog.getByText(/^No custom rules/);
    this.ruleMatchCountText = this.advancedFilterDialog.getByText(/^\d+ techpacks? match/);
    this.removeRuleButton = this.advancedFilterDialog.getByRole('button', { name: 'Remove rule' });

    this.columnsDialog = page.getByRole('dialog', { name: 'Columns', exact: true });
    this.columnsCounterText = this.columnsDialog.getByText(/^\d+\/\d+$/);
    this.columnsApplyButton = this.columnsDialog.getByRole('button', {
      name: 'Apply',
      exact: true,
    });
    this.columnsResetButton = this.columnsDialog.getByRole('button', { name: 'Reset to Default' });
    this.columnsShowAllButton = this.columnsDialog.getByRole('button', { name: 'Show All' });
    this.lockedColumnCheckbox = this.columnsDialog.getByRole('checkbox', {
      name: 'Name and Code is always visible',
    });

    this.viewMenu = page.getByRole('menu', { name: 'View' });
    this.openTechPackButton = this.main.getByRole('button', { name: 'Open Tech Pack' });
    // Grid View cards: `button "Select <code>-<rev> <name> <code>"`.
    this.gridViewCards = this.main.getByRole('button', { name: /^Select (TP|DRAFT)/ });

    // The count ("1") is its own element beside the "item selected" label;
    // their parent (the selection bar) starts "1 item selected".
    this.itemsSelectedText = page.getByText(/^items? selected$/).locator('..');
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.compareButton = page.getByRole('button', { name: 'Compare', exact: true });

    this.showingCountText = this.main.getByText(/^Showing \d+ packs?$/);
    this.pageText = this.main.getByText(/^\d+ of \d+$/);
    this.previousPageButton = this.main.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = this.main.getByRole('button', { name: 'Next page' });
    this.rowsPerPageSelect = this.main.getByRole('combobox', { name: 'Rows per page' });

    this.table = this.main.getByRole('table');
    this.columnHeaders = this.table.getByRole('columnheader');
    this.bodyRows = this.table.locator('tbody').getByRole('row');
    this.codeButtons = this.table.getByRole('button', { name: /^(TP\d{6}-\d+|DRAFT\/\w+)$/ });
    this.emptyResultText = this.main.getByText('No results found', { exact: true });
  }

  /** A techpack's code button in the grid (clicking it opens `/techpacks/view/{id}`). */
  codeButton(techpackCode: string): Locator {
    return this.table.getByRole('button', { name: techpackCode, exact: true });
  }

  /** A Production Stages step, e.g. `productionStage(3)` → "STEP 3 Fitting 5". */
  productionStage(step: number): Locator {
    return this.productionStages.getByRole('button', { name: new RegExp(`^STEP ${step} `) });
  }

  /** One of the "Filter" dialog's three collapsible sections. */
  filterSection(name: 'General Information' | 'Garment Specifications' | 'System Info'): Locator {
    return this.filterDialog.getByRole('region', { name });
  }

  /** The Show/Hide toggle of a "Filter" dialog section. Only one section is open at a time. */
  filterSectionToggle(
    name: 'General Information' | 'Garment Specifications' | 'System Info',
  ): Locator {
    return this.filterSection(name).getByRole('button', { name: /^(Show|Hide)$/ });
  }

  /**
   * A field in an open "Filter" dialog section. The comboboxes have no
   * accessible name of their own ("Select"); each one directly follows its
   * label text, so a field is the first combobox after its label. For the
   * date fields (Created Date / Approved Date) this is the operator picker.
   */
  filterField(label: string): Locator {
    return this.filterDialog
      .getByText(label, { exact: true })
      .locator('xpath=following::*[@role="combobox"][1]');
  }

  /** An option in whichever listbox is open (filter fields, rows-per-page). */
  listboxOption(name: string | RegExp): Locator {
    return this.page.getByRole('listbox').last().getByRole('option', { name, exact: true });
  }

  /** A column's checkbox in the "Columns" dialog ("Toggle <label>"). */
  columnCheckbox(columnLabel: string): Locator {
    return this.columnsDialog.getByRole('checkbox', { name: `Toggle ${columnLabel}` });
  }

  /** Every column label in the "Columns" dialog, in list order. */
  columnsDialogCheckboxes(): Locator {
    return this.columnsDialog.getByRole('checkbox');
  }

  /** A "View" menu layout. */
  viewOption(name: 'List View' | 'Vertical Split' | 'Grid View'): Locator {
    return this.viewMenu.getByRole('menuitemradio', { name });
  }

  /** A section heading in the Vertical Split detail pane. */
  detailPaneSection(
    name: 'General Information' | 'Garment Specifications' | 'System Info',
  ): Locator {
    return this.main.getByRole('heading', { name, level: 3 });
  }

  /** A row's checkbox, by its code and revision ("Select row TP202610-000131-0"). */
  rowCheckbox(techpackCode: string, revNo = 0): Locator {
    return this.table.getByRole('checkbox', { name: `Select row ${techpackCode}-${revNo}` });
  }

  /** A row checkbox by 0-based row index (not counting the header "select all" checkbox). */
  rowCheckboxAt(index: number): Locator {
    return this.table.getByRole('checkbox', { name: /^Select row / }).nth(index);
  }

  /** A status tab by its full accessible name, e.g. a translated "Mở 12". */
  statusTabNamed(name: RegExp): Locator {
    return this.main.getByRole('button', { name });
  }

  statusTab(tab: 'All' | 'Draft' | 'Open' | 'Approved'): Locator {
    return {
      All: this.allTab,
      Draft: this.draftTab,
      Open: this.openTab,
      Approved: this.approvedTab,
    }[tab];
  }
}
