import { type Locator, type Page } from '@playwright/test';
import { timeTriggers } from './form-field.locators';

/**
 * Raw element locators for Planning > Master Data > Shifts & breaks
 * (/planning/master-data/shifts): the list, the shift create / edit form
 * (/shifts/new, /shifts/<CODE>/edit), a shift's detail page
 * (/shifts/<CODE>) with its "Breaks (N)" grid, and the break form that
 * replaces the grid on the same URL. No actions or assertions here, see
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
  readonly cancelButton: Locator;
  readonly saveNotice: Locator;
  // Detail
  readonly allShiftsLink: Locator;
  readonly detailHeading: Locator;
  readonly editButton: Locator;
  readonly breaksHeading: Locator;
  readonly newBreakButton: Locator;
  readonly breaksTable: Locator;
  readonly breaksSearch: Locator;
  readonly accessRestricted: Locator;
  // Break form
  readonly breadcrumb: Locator;
  readonly breakFormHeading: Locator;
  readonly breakName: Locator;
  readonly fallsAfterMidnight: Locator;
  readonly length: Locator;
  readonly paid: Locator;
  readonly createBreakButton: Locator;

  constructor(private readonly page: Page) {
    this.listHeading = page.getByRole('heading', { name: 'Shifts & breaks', level: 1 });
    this.newShiftButton = page.getByRole('button', { name: 'New shift' });
    this.noMatchState = page.getByText(/No shifts? match/i);
    this.newHeading = page.getByRole('heading', { name: 'New shift', level: 1 });
    this.code = page.getByRole('textbox', { name: 'Shift code' });
    this.codeFixedHelp = page.getByText(/The code is fixed once the record exists/);
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
    this.createButton = page.getByRole('button', { name: 'Create shift' });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
    this.allShiftsLink = page.getByRole('link', { name: 'All shifts' });
    this.detailHeading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit shift' });
    this.breaksHeading = page.getByRole('heading', { name: /^Breaks \(\d+\)/ });
    this.newBreakButton = page.getByRole('button', { name: 'New break' });
    this.breaksTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Length' }),
    });
    this.breaksSearch = page.getByRole('searchbox', { name: /^Search breaks in/ });
    this.accessRestricted = page.getByText(/Access restricted/i);
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.breakFormHeading = page.getByRole('heading', { name: /^(New|Edit) break$/, level: 1 });
    this.breakName = page.getByRole('textbox', { name: 'Break', exact: true });
    this.fallsAfterMidnight = page.getByRole('switch', { name: 'Falls after midnight' });
    this.length = page.getByRole('textbox', { name: 'Length' });
    this.paid = page.getByRole('switch', { name: 'Paid' });
    this.createBreakButton = page.getByRole('button', { name: 'Create break' });
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

  breakRows(): Locator {
    return this.breaksTable.getByRole('rowgroup').nth(1).getByRole('row').filter({ hasText: /\S/ });
  }

  breakEditButton(name: string): Locator {
    return this.breakRow(name).getByRole('button', { name: 'Edit', exact: true });
  }
}
