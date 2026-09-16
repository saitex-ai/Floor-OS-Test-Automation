import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Contact List screen (CRM, Sprint 1) — no
 * actions or assertions here, see src/pages/crm/contact-list.page.ts for
 * those. Confirmed against the real running screen (dumped via
 * ariaSnapshot() against a local `tilt up` stack).
 *
 * The layout switcher's real labels are "No split" / "Vertical split" /
 * "Horizontal split" — not "Table / Split / Stacked" as the ClickUp
 * test-case text loosely describes them.
 */
export class ContactListLocators {
  readonly heading: Locator;

  // Relationship tabs
  readonly allTab: Locator;
  readonly linkedTab: Locator;
  readonly unlinkedTab: Locator;

  // Toolbar
  readonly searchInput: Locator;
  readonly filtersButton: Locator;
  readonly toggleCellFiltersButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly noSplitButton: Locator;
  readonly verticalSplitButton: Locator;
  readonly horizontalSplitButton: Locator;
  readonly createContactButton: Locator;
  readonly moreActionsButton: Locator;

  // Filters panel (opens inline below the toolbar, not a dialog)
  readonly addRuleButton: Locator;
  readonly statusFilterButton: Locator;
  readonly countryFilterButton: Locator;
  readonly applyFiltersButton: Locator;

  // Configure Columns dialog
  readonly columnsDialog: Locator;
  readonly columnsSearchInput: Locator;
  readonly showAllColumnsButton: Locator;
  readonly hideAllColumnsButton: Locator;
  readonly resetColumnsButton: Locator;
  readonly applyColumnsButton: Locator;
  readonly closeColumnsDialogButton: Locator;

  // Table
  readonly table: Locator;
  readonly selectAllRowsCheckbox: Locator;
  readonly dataRows: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Contacts', level: 1 });

    this.allTab = page.getByRole('button', { name: /^All \d/ });
    this.linkedTab = page.getByRole('button', { name: /^Linked \d/ });
    this.unlinkedTab = page.getByRole('button', { name: /^Unlinked \d/ });

    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.filtersButton = page.getByRole('button', { name: 'Filters', exact: true });
    this.toggleCellFiltersButton = page.getByRole('button', { name: 'Toggle cell filters' });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.noSplitButton = page.getByRole('button', { name: 'No split' });
    this.verticalSplitButton = page.getByRole('button', { name: 'Vertical split' });
    this.horizontalSplitButton = page.getByRole('button', { name: 'Horizontal split' });
    this.createContactButton = page.getByRole('button', { name: 'Create Contact' });
    // exact: true — the Columns dialog also has "More actions for <column>"
    // buttons per row, which would otherwise substring-match this one.
    this.moreActionsButton = page.getByRole('button', { name: 'More actions', exact: true });

    this.addRuleButton = page.getByRole('button', { name: 'Add rule' });
    // getByRole('button', { name: 'Status' }) also matches the table's own
    // Status column sort button (confirmed: strict-mode violation). This
    // one has an explicit aria-label="Status"; the column button's name
    // comes from its text content instead — getByLabel() only matches the
    // former.
    this.statusFilterButton = page.getByLabel('Status', { exact: true });
    this.countryFilterButton = page.getByRole('button', { name: 'Country', exact: true });
    this.applyFiltersButton = page.getByRole('button', { name: 'Apply', exact: true });

    this.columnsDialog = page.getByRole('dialog', { name: 'Columns' });
    this.columnsSearchInput = this.columnsDialog.getByRole('textbox', { name: 'Search columns' });
    this.showAllColumnsButton = this.columnsDialog.getByRole('button', { name: 'Show all' });
    this.hideAllColumnsButton = this.columnsDialog.getByRole('button', { name: 'Hide all' });
    this.resetColumnsButton = this.columnsDialog.getByRole('button', { name: 'Reset to default' });
    this.applyColumnsButton = this.columnsDialog.getByRole('button', {
      name: 'Apply',
      exact: true,
    });
    this.closeColumnsDialogButton = this.columnsDialog.getByRole('button', { name: 'Close' });

    this.table = page.getByRole('table');
    this.selectAllRowsCheckbox = page.getByRole('checkbox', { name: 'Select all rows' });
    // Second rowgroup is the body — the first is the header row.
    this.dataRows = this.table.getByRole('rowgroup').nth(1).getByRole('row');
  }

  /** The sort button inside a given column's header (not its resize handle). */
  columnSortButton(columnName: string): Locator {
    return this.page
      .getByRole('columnheader', { name: new RegExp(columnName) })
      .getByRole('button', { name: columnName, exact: true });
  }

  columnHeader(columnName: string): Locator {
    return this.page.getByRole('columnheader', { name: new RegExp(columnName) });
  }

  /** Toggle a column's visibility checkbox in the Configure Columns dialog. */
  columnToggle(columnName: string): Locator {
    return this.columnsDialog.getByRole('checkbox', { name: `Toggle ${columnName}` });
  }

  linkedCustomerLink(customerName: string): Locator {
    return this.page.getByRole('link', { name: customerName });
  }

  contactRow(contactName: string): Locator {
    return this.dataRows.filter({ hasText: contactName }).first();
  }
}
