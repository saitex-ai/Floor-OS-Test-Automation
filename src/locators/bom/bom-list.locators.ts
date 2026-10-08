import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the BOM list (/bom, "Bill of Materials") and
 * its "New BOM" → "Create BOM techpack" dialog — no actions or assertions
 * here, see src/pages/bom/bom-list.page.ts for those.
 *
 * All / Open / Approved are `aria-pressed` buttons, not tabs, and their
 * accessible name carries the count ("Open 42"). The count is part of
 * the regex on purpose: a bare /^Open/ also matches the shell's "Open
 * navigation" button.
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
  readonly toggleCellFiltersButton: Locator;
  readonly exportCsvButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly bestFitColumnsButton: Locator;
  readonly noSplitButton: Locator;
  readonly verticalSplitButton: Locator;
  readonly horizontalSplitButton: Locator;
  readonly addRuleButton: Locator;
  readonly applyButton: Locator;
  readonly filterRulesLabel: Locator;
  readonly filterAttributeLabel: Locator;
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

    this.allTab = page.getByRole('button', { name: /^All [\d,]+$/ });
    this.openTab = page.getByRole('button', { name: /^Open [\d,]+$/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved [\d,]+$/ });

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

    this.filtersButton = page.getByRole('button', { name: 'Filters', exact: true });
    this.toggleCellFiltersButton = page.getByRole('button', { name: 'Toggle cell filters' });
    this.exportCsvButton = page.getByRole('button', { name: 'Export CSV' });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.bestFitColumnsButton = page.getByRole('button', { name: 'Best-fit columns' });
    this.noSplitButton = page.getByRole('button', { name: 'No split' });
    this.verticalSplitButton = page.getByRole('button', { name: 'Vertical split' });
    this.horizontalSplitButton = page.getByRole('button', { name: 'Horizontal split' });
    this.addRuleButton = page.getByRole('button', { name: /Add rule/ });
    this.applyButton = page.getByRole('button', { name: 'Apply', exact: true });
    this.filterRulesLabel = page.getByText('Rules', { exact: true });
    this.filterAttributeLabel = page.getByText('Attribute');
    this.filterMatchCount = page.getByText(/^\d+ BOMs? match$/);
    this.showAllColumnsButton = page.getByRole('button', { name: 'Show all' });
    this.hideAllColumnsButton = page.getByRole('button', { name: 'Hide all' });

    this.splitRecordCount = page.getByText(/^\d+ records?$/);
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

  /** A toolbar/tab button by its (possibly translated) accessible name. */
  buttonNamed(name: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('button', { name });
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

  /** The per-column inline filter input revealed by "Toggle cell filters". */
  cellFilterInput(columnLabel: string): Locator {
    return this.page.getByPlaceholder(`Filter ${columnLabel}`);
  }

  /** A row of the techpack picker by its techpack code. */
  techpackPickerRow(code: string): Locator {
    return this.techpackPickerRows.filter({
      has: this.page.getByRole('cell', { name: code, exact: true }),
    });
  }
}
