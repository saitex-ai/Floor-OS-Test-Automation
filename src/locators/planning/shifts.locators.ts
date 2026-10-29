import { type Locator, type Page } from '@playwright/test';

/** Where a row's input is looked up: its row, or the page (for a `has:` filter). */
type Scope = Locator | Page;
import { fieldHelp, timeTriggers } from './form-field.locators';

/**
 * Raw element locators for Planning > Master Data > Shifts & breaks
 * (/planning/master-data/shifts): the list, the shift create / edit form
 * (/shifts/new, /shifts/<CODE>/edit), a shift's detail page
 * (/shifts/<CODE>) with its read-only "Breaks (N)" grid, and — since the
 * 2026-10-28 dev deploy — the breaks as an inline table on step 2 of the
 * create / edit form (see InlineTableLocators): a break's inputs are looked
 * up inside the row passed in. No actions or assertions here, see
 * src/pages/planning/shifts.page.ts.
 */
export class ShiftsLocators {
  // List
  readonly listHeading: Locator;
  readonly newShiftButton: Locator;
  readonly noMatchState: Locator;
  // Shift form
  readonly newHeading: Locator;
  readonly code: Locator;
  readonly codeFixedHelp: Locator;
  /** Since the 2026-10-16 deploy the code is generated on save: the create form says so under the locked field. */
  readonly codeGeneratedHelp: Locator;
  readonly name: Locator;
  readonly shiftKind: Locator;
  readonly starts: Locator;
  readonly ends: Locator;
  readonly crossesMidnight: Locator;
  readonly grossMinutes: Locator;
  readonly paidMinutesInput: Locator;
  readonly orderInDay: Locator;
  readonly active: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly doneButton: Locator;
  /** The form's footer Cancel (on step 2 a row being edited has its own Cancel, above it). */
  readonly cancelButton: Locator;
  readonly saveNotice: Locator;
  // Detail
  readonly allShiftsLink: Locator;
  readonly detailHeading: Locator;
  readonly editButton: Locator;
  readonly breaksHeading: Locator;
  readonly breaksTable: Locator;
  readonly breaksSearch: Locator;
  readonly accessRestricted: Locator;
  // Breaks step (step 2 of the form)
  readonly breaksStep: Locator;
  readonly breaksStepTitle: Locator;

  constructor(private readonly page: Page) {
    this.listHeading = page.getByRole('heading', { name: 'Shifts & breaks', level: 1 });
    this.newShiftButton = page.getByRole('button', { name: 'New shift' });
    this.noMatchState = page.getByText(/No shifts? match/i);
    this.newHeading = page.getByRole('heading', { name: 'New shift', level: 1 });
    this.code = page.getByRole('textbox', { name: 'Shift code' });
    this.codeFixedHelp = fieldHelp(page, /The code is fixed once the record exists/);
    this.codeGeneratedHelp = fieldHelp(page, /Assigned automatically when the record is saved/);
    this.name = page.getByRole('textbox', { name: 'Name', exact: true });
    this.shiftKind = page.getByRole('combobox', { name: 'Shift kind', exact: true });
    // The form's first two time fields: Starts, then Ends (shift or break form).
    this.starts = timeTriggers(page).nth(0);
    this.ends = timeTriggers(page).nth(1);
    this.crossesMidnight = page.getByRole('switch', { name: 'Crosses midnight' });
    this.grossMinutes = page.getByRole('textbox', { name: 'Gross minutes' });
    this.paidMinutesInput = page.getByRole('textbox', { name: 'Paid minutes' });
    this.orderInDay = page.getByRole('textbox', { name: 'Order in day' });
    this.active = page.getByRole('switch', { name: 'Active' });
    // Since the 2026-10-28 dev deploy create and edit are two steps: step 1's
    // "Save & continue" saves the shift and opens Breaks, whose "Done" opens
    // the detail page.
    this.createButton = page.getByRole('button', { name: 'Save & continue' });
    this.saveButton = this.createButton;
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).last();
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
    this.allShiftsLink = page.getByRole('link', { name: 'All shifts' });
    this.detailHeading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit shift' });
    this.breaksHeading = page.getByRole('heading', { name: /^Breaks \(\d+\)/ });
    this.breaksTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Length' }),
    });
    this.breaksSearch = page.getByRole('searchbox', { name: /^Search breaks/ });
    this.accessRestricted = page.getByText(/Access restricted/i);
    this.breaksStep = page.getByRole('list', { name: 'Steps' }).getByRole('button', {
      name: /^Breaks/,
    });
    this.breaksStepTitle = page.getByText('STEP 2 OF 2 · BREAKS');
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  /** A break row, matched on its Break (name) cell. */
  breakRow(name: string): Locator {
    return this.breaksTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }

  /** Saved break rows: not the add row, not the empty-grid message. */
  breakRows(): Locator {
    return this.breaksTable
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .filter({ hasText: /\S/ })
      .filter({ hasNot: this.page.getByRole('button', { name: 'Add break' }) })
      .filter({ hasNotText: /^No breaks/ });
  }

  // A break's inputs, inside its row (the add row, or a saved row being edited).

  breakName(row: Scope): Locator {
    return row.getByRole('textbox', { name: 'Break', exact: true });
  }

  /** The time trigger: "Pick time", or "<time> Clear time" once set. */
  breakTime(row: Scope, which: 'Starts' | 'Ends'): Locator {
    return row.getByRole('group', { name: which }).getByRole('button').first();
  }

  fallsAfterMidnight(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Falls after midnight' });
  }

  paid(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Paid' });
  }

  /** A saved row being edited only — a new break is always Active. */
  breakActive(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Active' });
  }

  /** Length: derived, shown as text in its cell (Break | Starts | Ends | Length | …). */
  lengthCell(row: Scope): Locator {
    return row.getByRole('cell').nth(3);
  }

  /** Any input in the Length cell (there should be none: Length is derived). */
  lengthInput(row: Locator): Locator {
    return this.lengthCell(row).getByRole('textbox');
  }

  /**
   * The cell holding `control`, where its message renders. Pass the control
   * built on the page (e.g. `kind(page)`): a `has:` filter is queried inside
   * each cell.
   */
  cellOf(row: Locator, control: Locator): Locator {
    return row.getByRole('cell').filter({ has: control });
  }
}
