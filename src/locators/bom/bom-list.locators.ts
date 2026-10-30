import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the BOM list (/bom, "Bill of Materials") and
 * its "New BOM" → "Create BOM techpack" dialog — no actions or assertions
 * here, see src/pages/bom/bom-list.page.ts for those.
 *
 * All / Open / Approved are tabs (`role="tab"`, `aria-selected`) since
 * dev's 2026-10-30 deploy (uat too, same day); they were `aria-pressed`
 * buttons before. Their accessible name carries the count ("Open 42").
 */
export class BomListLocators {
  readonly heading: Locator;

  readonly allTab: Locator;
  readonly openTab: Locator;
  readonly approvedTab: Locator;

  readonly newBomButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly rows: Locator;
  readonly footerSummary: Locator;

  // "New BOM" → "Create BOM techpack" dialog
  readonly newBomDialog: Locator;
  readonly noTechpackSelected: Locator;
  readonly createBomButton: Locator;
  readonly cancelButton: Locator;
  readonly selectTechpackButton: Locator;
  readonly searchTechpacksButton: Locator;

  // "Pick a techpack (N)" — opened from the dialog's code field, and also
  // (as a BOM switcher) from a BOM detail page's "B.O.M Code" button. A
  // table, not a listbox: a single row click picks a techpack. Its
  // "Showing 1-4 of 4" footer is the reliable "finished loading" signal —
  // it renders "Showing 0 of 0" when nothing is eligible, where waiting
  // on a row would just hang.
  readonly techpackPickerDialog: Locator;
  readonly techpackPickerSearch: Locator;
  readonly techpackPickerHeaderCells: Locator;
  readonly techpackPickerRows: Locator;
  readonly techpackPickerFooter: Locator;
  readonly techpackPickerCloseButton: Locator;

  // Toolbar — the same shared list-screen framework as the Techpacks list.
  readonly filtersButton: Locator;
  readonly exportCsvButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly addRuleButton: Locator;
  readonly applyButton: Locator;
  readonly filterRulesLabel: Locator;
  // "Filter" dialog (2026-10-22 redesign): label + unnamed combobox fields,
  // date ranges, a live "N BOMs match" count, and an "Advanced Filter" rule
  // builder behind a toggle.
  readonly filterDialog: Locator;
  readonly filterIntroText: Locator;
  readonly filterApplyButton: Locator;
  readonly filterClearButton: Locator;
  readonly advancedFilterButton: Locator;
  readonly noCustomRulesText: Locator;
  readonly ruleAttributeCombobox: Locator;
  readonly ruleValueCombobox: Locator;
  readonly removeRuleButton: Locator;
  // "View" menu (List View / Vertical Split / Horizontal Split), which
  // replaced the No / Vertical / Horizontal split buttons.
  readonly viewButton: Locator;
  readonly viewMenu: Locator;
  readonly filterMatchCount: Locator;
  readonly showAllColumnsButton: Locator;
  readonly hideAllColumnsButton: Locator;

  // Vertical/Horizontal split's compact record list
  readonly splitRecordCount: Locator;
  readonly splitRecordRows: Locator;
  readonly previewBreadcrumb: Locator;

  // Row selection bar
  readonly selectionLabel: Locator;
  readonly selectionBar: Locator;
  readonly exportSelectedButton: Locator;
  readonly clearSelectionButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Bill of Materials' });

    this.allTab = page.getByRole('tab', { name: /^All [\d,]+$/ });
    this.openTab = page.getByRole('tab', { name: /^Open [\d,]+$/ });
    this.approvedTab = page.getByRole('tab', { name: /^Approved [\d,]+$/ });

    this.newBomButton = page.getByRole('button', { name: 'New BOM' });
    this.searchInput = page.getByRole('textbox', { name: 'Search', exact: true });
    this.table = page.getByRole('main').getByRole('table');
    this.columnHeaders = this.table.locator('thead').getByRole('columnheader');
    this.rows = this.table.locator('tbody').getByRole('row');
    this.footerSummary = page.getByText(/^Showing [\d,]+ to [\d,]+ of [\d,]+$/);

    this.newBomDialog = page.getByRole('dialog', { name: 'Create BOM techpack' });
    this.noTechpackSelected = this.newBomDialog.getByText('No techpack selected.');
    this.createBomButton = this.newBomDialog.getByRole('button', { name: 'Create BOM' });
    this.cancelButton = this.newBomDialog.getByRole('button', { name: 'Cancel' });
    this.selectTechpackButton = this.newBomDialog.getByRole('button', { name: 'Select techpack' });
    this.searchTechpacksButton = this.newBomDialog.getByRole('button', {
      name: 'Search techpacks',
    });

    this.techpackPickerDialog = page.getByRole('dialog', { name: /^Pick a techpack/ });
    this.techpackPickerSearch = this.techpackPickerDialog.getByRole('searchbox', {
      name: 'Search techpacks',
    });
    // Header rows hold columnheaders; data rows hold cells.
    this.techpackPickerHeaderCells = this.techpackPickerDialog
      .getByRole('table')
      .getByRole('row')
      .first()
      .getByRole('columnheader');
    this.techpackPickerRows = this.techpackPickerDialog
      .getByRole('table')
      .getByRole('row')
      // Only rows carrying a techpack code — not the "no match" placeholder row.
      .filter({ has: page.getByRole('cell', { name: /^TP\d{6}-\d+$/ }) });
    this.techpackPickerCloseButton = this.techpackPickerDialog.getByRole('button', {
      name: 'Close',
      exact: true,
    });
    this.techpackPickerFooter = this.techpackPickerDialog.getByText(/^Showing [\d-]+ of \d+$/);

    this.filtersButton = page.getByRole('button', { name: /^Filters/ });
    this.exportCsvButton = page.getByRole('button', { name: 'Export CSV' });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    this.filterDialog = page.getByRole('dialog', { name: 'Filter', exact: true });
    this.filterIntroText = this.filterDialog.getByText(
      'Use the fields to narrow down the list. Clear all filters to reset the view.',
    );
    this.filterApplyButton = this.filterDialog.getByRole('button', { name: 'Apply', exact: true });
    this.filterClearButton = this.filterDialog.getByRole('button', { name: 'Clear', exact: true });
    this.advancedFilterButton = this.filterDialog.getByRole('button', { name: 'Advanced Filter' });
    this.addRuleButton = this.filterDialog.getByRole('button', { name: /Add rule/ });
    this.filterRulesLabel = this.filterDialog.getByText('Rules', { exact: true });
    this.noCustomRulesText = this.filterDialog.getByText(
      'No custom rules. Add one to filter on any attribute.',
    );
    // "Attribute..." / "Value..." are the comboboxes' shown text, not their names.
    this.ruleAttributeCombobox = this.filterDialog
      .getByRole('combobox')
      .filter({ hasText: 'Attribute...' });
    this.ruleValueCombobox = this.filterDialog
      .getByRole('combobox')
      .filter({ hasText: 'Value...' });
    this.removeRuleButton = this.filterDialog.getByRole('button', { name: 'Remove rule' });
    this.filterMatchCount = page.getByText(/^[\d,]+ BOMs? match$/);
    this.viewButton = page
      .getByRole('main')
      .last()
      .getByRole('button', { name: 'View', exact: true });
    this.viewMenu = page.getByRole('menu', { name: 'View' });
    this.showAllColumnsButton = page.getByRole('button', { name: 'Show all' });
    this.hideAllColumnsButton = page.getByRole('button', { name: 'Hide all' });

    this.splitRecordCount = page.getByText(/^[\d,]+ records?$/);
    this.splitRecordRows = page.getByRole('main').getByRole('button', { name: /^Select row TP/ });
    // A split layout's preview panel renders the selected BOM's own detail
    // view, breadcrumb included.
    this.previewBreadcrumb = page.getByRole('main').getByRole('navigation', { name: 'Breadcrumb' });

    // The count badge ("1") and "item selected" are separate elements; the
    // bar is the innermost element holding both the label and its Export.
    this.selectionLabel = page.getByText(/^items? selected$/);
    this.exportSelectedButton = page.getByRole('button', { name: 'Export', exact: true });
    this.selectionBar = page
      .locator('div')
      .filter({ has: this.selectionLabel })
      .filter({ has: this.exportSelectedButton })
      .last();
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
  }

  /** The list's h1 in whatever language the shell is in. */
  headingNamed(name: string): Locator {
    return this.page.getByRole('heading', { level: 1, name });
  }

  /** A toolbar button by its (possibly translated) accessible name. */
  buttonNamed(name: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('button', { name });
  }

  /** A status tab by its (possibly translated) accessible name. */
  tabNamed(name: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('tab', { name });
  }

  /** The search box by its (possibly translated) placeholder. */
  searchByPlaceholder(placeholder: string): Locator {
    return this.page.getByPlaceholder(placeholder, { exact: true });
  }

  /** A row's techpack code chip (role=link) — clicking it opens that BOM. */
  techpackLink(code: string): Locator {
    return this.table.getByRole('link', { name: code, exact: true });
  }

  /** A row's own "Select row <code>/<rev>" checkbox. */
  rowCheckbox(index: number): Locator {
    return this.rows.nth(index).getByRole('checkbox');
  }

  /** A column's checkbox in the "Configure columns" panel, e.g. "Toggle Rev No". */
  columnCheckbox(columnLabel: string): Locator {
    return this.page.getByRole('checkbox', { name: `Toggle ${columnLabel}` });
  }

  /** A column's header sort button in the grid (its label, without the "Resize" control). */
  columnHeaderButton(columnLabel: string): Locator {
    return this.columnHeaders.getByRole('button', { name: columnLabel, exact: true });
  }

  /**
   * A "Filter" dialog field by its label. The comboboxes have no name of
   * their own ("Select"); each directly follows its label text.
   */
  filterField(label: string): Locator {
    return this.filterDialog
      .getByText(label, { exact: true })
      .locator('xpath=following::*[@role="combobox"][1]');
  }

  /** A "Filter" dialog label (fields and date ranges), e.g. "Approved date". */
  filterLabel(label: string): Locator {
    return this.filterDialog.getByText(label, { exact: true });
  }

  /** The rule builder's operator picker for the rule row (disabled until an attribute is picked). */
  ruleOperatorCombobox(): Locator {
    return this.ruleAttributeCombobox.locator('xpath=following::*[@role="combobox"][1]');
  }

  /** A "View" menu layout. */
  viewOption(name: 'List View' | 'Vertical Split' | 'Horizontal Split'): Locator {
    return this.viewMenu.getByRole('menuitemradio', { name });
  }

  /** A grid row's Status cell, a plain cell to click without following the code link. */
  rowStatusCell(index: number): Locator {
    return this.rows.nth(index).getByRole('cell', { name: /^(Open|Approved)$/ });
  }

  /** A row of the techpack picker by its techpack code. */
  techpackPickerRow(code: string): Locator {
    return this.techpackPickerRows.filter({
      has: this.page.getByRole('cell', { name: code, exact: true }),
    });
  }
}
