import { type Locator, type Page } from '@playwright/test';

/** Where a row's input is looked up: its row, or the page (for a `has:` filter). */
type Scope = Locator | Page;

/**
 * Raw element locators for a maintenance window's inputs. Since the
 * 2026-10-28 dev deploy a window is a row of the "Maintenance windows (N)"
 * inline table on step 2 of Edit machine (see InlineTableLocators): the add
 * row for a new one, a saved row after its "Edit maintenance window". Each
 * input is looked up inside the row passed in. No actions or assertions
 * here, see src/pages/planning/maintenance-window-form.page.ts.
 */
export class MaintenanceWindowFormLocators {
  readonly stepTitle: Locator;
  /** The table's note, ending "A save rewrites the window in place; …". */
  readonly saveNotice: Locator;
  /** The step's footer Cancel (a row being edited has its own Cancel, above it). */
  readonly cancelButton: Locator;
  /** The column header: the input is a picker only once the machine has anomalies. */
  readonly anomalyColumn: Locator;

  constructor(private readonly page: Page) {
    this.stepTitle = page.getByText('STEP 2 OF 2 · MAINTENANCE WINDOWS');
    this.saveNotice = page.getByText(/^Periods this asset is unavailable\./);
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).last();
    this.anomalyColumn = page.getByRole('columnheader', { name: 'Anomaly that prompted it' });
  }

  kind(row: Scope): Locator {
    return row.getByRole('combobox', { name: 'Kind', exact: true });
  }

  /** The date-time trigger: "Pick date and time", or "<value> Clear date and time". */
  windowStart(row: Scope): Locator {
    return row.getByRole('group', { name: 'Window start' }).getByRole('button').first();
  }

  /** "Still open" while empty. */
  windowEnd(row: Scope): Locator {
    return row.getByRole('group', { name: 'Window end' }).getByRole('button').first();
  }

  why(row: Scope): Locator {
    return row.getByRole('textbox', { name: 'Why', exact: true });
  }

  /** On a saved row being edited only — a new window is always Active. */
  active(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Active', exact: true });
  }

  machinePicker(row: Scope): Locator {
    return row.getByRole('combobox', { name: /^Machine/ });
  }

  /**
   * The cell holding `control`, where its "Required" message renders. Pass
   * the control built on the page (e.g. `kind(page)`): a `has:` filter is
   * queried inside each cell.
   */
  cellOf(row: Locator, control: Locator): Locator {
    return row.getByRole('cell').filter({ has: control });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
