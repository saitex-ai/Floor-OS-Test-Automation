import { type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './master-data-list.locators';

/**
 * Raw locators for the inline tables on step 2 of Planning's stepped
 * create / edit forms (dev deploy 2026-10-28): a machine's maintenance
 * windows, a shift's breaks, a calendar's working week and entries, an
 * operation's allowances, a recipe's operations, a work centre's stations.
 * No actions or assertions here, see src/pages/planning/inline-table.ts.
 *
 * The table is named "<Title> (N)". Its last body row is the add row: one
 * input per column, then "Add <noun>" (and "Clear" once it's been used). A
 * saved row's "Edit <noun>" turns that row into inputs with Save / Cancel.
 * Each row saves on its own, the moment Add or Save is pressed. The
 * record's detail page shows the same table read-only, without the add row.
 */
export class InlineTableLocators {
  readonly table: Locator;
  readonly heading: Locator;
  readonly addButton: Locator;
  /** The row of inputs a new row is typed into. */
  readonly addRow: Locator;
  readonly clearButton: Locator;
  readonly saveButton: Locator;
  /** The saved row currently open for editing (it holds Save / Cancel). */
  readonly editingRow: Locator;
  readonly cancelButton: Locator;

  /** `scope` narrows to one tab panel where a step holds two tables (a calendar's). */
  constructor(
    private readonly page: Page,
    title: string,
    private readonly noun: string,
    scope?: Locator,
  ) {
    const root = scope ?? page.getByRole('main').last();
    const name = new RegExp(`^${escapeRegExp(title)} \\(\\d+\\)`);
    this.table = root.getByRole('table', { name });
    this.heading = root.getByRole('heading', { name });
    // A `has:` filter is queried inside each row, so its inner locator
    // starts from the page, not from the table.
    const add = page.getByRole('button', { name: `Add ${noun}`, exact: true });
    const save = page.getByRole('button', { name: 'Save', exact: true });
    this.addRow = this.table.getByRole('row').filter({ has: add });
    this.addButton = this.addRow.getByRole('button', { name: `Add ${noun}`, exact: true });
    this.clearButton = this.addRow.getByRole('button', { name: 'Clear', exact: true });
    this.editingRow = this.table.getByRole('row').filter({ has: save });
    this.saveButton = this.editingRow.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = this.editingRow.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** The options of whichever row dropdown is open. */
  options(): Locator {
    return this.page.getByRole('option');
  }

  /** A saved row, matched on one cell's exact text (its key, e.g. a window's Why). */
  row(key: string): Locator {
    return this.table.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: key, exact: true }),
    });
  }

  editButton(key: string): Locator {
    return this.row(key).getByRole('button', { name: `Edit ${this.noun}`, exact: true });
  }

  /** The saved rows: every body row except the add row and the empty-table message. */
  dataRows(): Locator {
    return this.table
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .filter({
        hasNot: this.page.getByRole('button', { name: `Add ${this.noun}`, exact: true }),
      })
      .filter({ hasNot: this.page.getByRole('cell', { name: /^No .+\.$/ }) });
  }
}
