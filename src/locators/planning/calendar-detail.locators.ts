import { type Locator, type Page } from '@playwright/test';

/** Where a row's input is looked up: its row, or the page (for a `has:` filter). */
type Scope = Locator | Page;

/**
 * Raw element locators for a calendar's read-only detail page
 * (/planning/master-data/calendars/<CODE>): summary, and the "Default
 * working week (N)" and "Calendar entries (N)" grids behind two tabs. Since
 * the 2026-10-28 dev deploy lines and entries are added and edited on step 2
 * of Edit calendar ("Working week and entries"), as rows of the same two
 * tables made inline (see InlineTableLocators): a row's inputs are looked up
 * inside the row passed in. No actions or assertions here, see
 * src/pages/planning/calendar-detail.page.ts.
 */
export class CalendarDetailLocators {
  readonly allCalendarsLink: Locator;
  readonly accessRestricted: Locator;
  /** The edit form's Name — never on the read-only detail page. */
  readonly nameInput: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly weekTab: Locator;
  readonly entriesTab: Locator;
  readonly weekPanel: Locator;
  readonly entriesPanel: Locator;
  readonly weekHeading: Locator;
  readonly entriesHeading: Locator;
  readonly weekTable: Locator;
  readonly entriesTable: Locator;
  readonly weekSearch: Locator;
  readonly weekEmptyState: Locator;
  // Step 2 of Edit calendar
  readonly linesStep: Locator;
  readonly stepTitle: Locator;
  /** The tables' note, e.g. "Each line is saved the moment its + or Save is pressed." */
  readonly formNotice: Locator;
  /** The form's footer Cancel (a row being edited has its own Cancel, above it). */
  readonly cancelButton: Locator;
  readonly doneButton: Locator;

  constructor(private readonly page: Page) {
    this.allCalendarsLink = page.getByRole('link', { name: 'All calendars' });
    this.accessRestricted = page.getByText(/Access restricted/i);
    this.nameInput = page
      .getByRole('main')
      .last()
      .getByRole('textbox', { name: 'Name', exact: true });
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit calendar' });
    this.weekTab = page.getByRole('tab', { name: 'Working week' });
    this.entriesTab = page.getByRole('tab', { name: 'Calendar entries' });
    this.weekPanel = page.getByRole('tabpanel', { name: 'Working week' });
    this.entriesPanel = page.getByRole('tabpanel', { name: 'Calendar entries' });
    this.weekHeading = page.getByRole('heading', { name: /^Default working week \(\d+\)/ });
    this.entriesHeading = page.getByRole('heading', { name: /^Calendar entries \(\d+\)/ });
    this.weekTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Weekday' }),
    });
    this.entriesTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Day type' }),
    });
    this.weekSearch = page.getByRole('searchbox', { name: /^Search the working week/ });
    this.weekEmptyState = page.getByText('No working week yet');
    this.linesStep = page.getByRole('list', { name: 'Steps' }).getByRole('button', {
      name: /^Working week and entries/,
    });
    this.stepTitle = page.getByText('STEP 2 OF 2 · WORKING WEEK AND ENTRIES');
    this.formNotice = page.getByText(/^Each (line|entry) is saved the moment/);
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).last();
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }

  /** Working-week rows for a weekday (optionally one shift's line). */
  weekRows(weekday: string, shift?: string): Locator {
    const rows = this.weekTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: weekday, exact: true }) });
    return shift
      ? rows.filter({ has: this.page.getByRole('cell', { name: new RegExp(`^${shift}\\b`) }) })
      : rows;
  }

  /** Saved working-week rows: not the add row, not the empty-grid message. */
  weekBodyRows(): Locator {
    return this.weekTable
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .filter({ hasText: /\S/ })
      .filter({ hasNot: this.page.getByRole('button', { name: 'Add working-week line' }) })
      .filter({ hasNotText: /^No working week/ });
  }

  /** An entry row, matched on its Why cell. */
  entryRow(why: string): Locator {
    return this.entriesTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: why, exact: true }) });
  }

  // A line's or entry's inputs, inside its row (the add row, or a saved row being edited).

  weekday(row: Scope): Locator {
    return row.getByRole('combobox', { name: 'Weekday', exact: true });
  }

  shift(row: Scope): Locator {
    return row.getByRole('combobox', { name: 'Shift that runs', exact: true });
  }

  standingOvertime(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Standing overtime' });
  }

  /** A saved row being edited only — a new line or entry is always Active. */
  active(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Active', exact: true });
  }

  /** The date trigger: "Pick date", or "<date> Clear date" once set. */
  entryDate(row: Scope): Locator {
    return row.getByRole('group', { name: 'Date' }).getByRole('button').first();
  }

  dayType(row: Scope): Locator {
    return row.getByRole('combobox', { name: 'Day type', exact: true });
  }

  why(row: Scope): Locator {
    return row.getByRole('textbox', { name: 'Why', exact: true });
  }

  /** Any start / end / time input in the row (a line has none — hours live on the shift). */
  timeFields(row: Scope): Locator {
    return row.getByRole('textbox', { name: /(start|end|time)/i });
  }

  /**
   * The cell holding `control`, where its message renders. Pass the control
   * built on the page (e.g. `kind(page)`): a `has:` filter is queried inside
   * each cell.
   */
  cellOf(row: Locator, control: Locator): Locator {
    return row.getByRole('cell').filter({ has: control });
  }

  rowEditButton(row: Scope, noun: 'working-week line' | 'calendar entry'): Locator {
    return row.getByRole('button', { name: `Edit ${noun}`, exact: true });
  }
}
