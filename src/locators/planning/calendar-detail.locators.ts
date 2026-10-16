import { type Locator, type Page } from '@playwright/test';
import { dateTriggers } from './form-field.locators';

/**
 * Raw element locators for a calendar's read-only detail page
 * (/planning/master-data/calendars/<CODE>): summary, "Default working week
 * (N)" and "Calendar entries (N)" grids, and the two nested forms that
 * replace a grid on the same URL ("New / Edit working-week line", "New /
 * Edit calendar entry"). No actions or assertions here, see
 * src/pages/planning/calendar-detail.page.ts.
 */
export class CalendarDetailLocators {
  readonly allCalendarsLink: Locator;
  readonly accessRestricted: Locator;
  /** The edit form's Name — never on the read-only detail page. */
  readonly nameInput: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly weekHeading: Locator;
  readonly entriesHeading: Locator;
  readonly newWeekLineButton: Locator;
  readonly newEntryButton: Locator;
  readonly weekTable: Locator;
  readonly entriesTable: Locator;
  readonly weekSearch: Locator;
  readonly weekEmptyState: Locator;
  // Nested forms (one at a time)
  readonly breadcrumb: Locator;
  readonly formHeading: Locator;
  readonly formNotice: Locator;
  readonly weekday: Locator;
  readonly shift: Locator;
  readonly standingOvertime: Locator;
  readonly active: Locator;
  readonly entryDate: Locator;
  readonly dayType: Locator;
  readonly why: Locator;
  readonly createLineButton: Locator;
  readonly createEntryButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly timeFields: Locator;

  constructor(private readonly page: Page) {
    this.allCalendarsLink = page.getByRole('link', { name: 'All calendars' });
    this.accessRestricted = page.getByText(/Access restricted/i);
    this.nameInput = page
      .getByRole('main')
      .last()
      .getByRole('textbox', { name: 'Name', exact: true });
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit calendar' });
    this.weekHeading = page.getByRole('heading', { name: /^Default working week \(\d+\)/ });
    this.entriesHeading = page.getByRole('heading', { name: /^Calendar entries \(\d+\)/ });
    this.newWeekLineButton = page.getByRole('button', { name: 'New working-week line' });
    this.newEntryButton = page.getByRole('button', { name: 'New calendar entry' });
    this.weekTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Weekday' }),
    });
    this.entriesTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Day type' }),
    });
    this.weekSearch = page.getByRole('searchbox', { name: /^Search the working week of/ });
    this.weekEmptyState = page.getByText('No working week yet');
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.formHeading = page.getByRole('heading', {
      name: /^(New|Edit) (working-week line|calendar entry)$/,
      level: 1,
    });
    this.formNotice = page.getByText(/^(Saving|Saves)\b/);
    this.weekday = page.getByRole('combobox', { name: 'Weekday', exact: true });
    this.shift = page.getByRole('combobox', { name: 'Shift that runs', exact: true });
    this.standingOvertime = page.getByRole('switch', { name: 'Standing overtime' });
    this.active = page.getByRole('switch', { name: 'Active', exact: true });
    this.entryDate = dateTriggers(page, false).first();
    this.dayType = page.getByRole('combobox', { name: 'Day type', exact: true });
    this.why = page.getByRole('textbox', { name: 'Why', exact: true });
    this.createLineButton = page.getByRole('button', { name: 'Create working-week line' });
    this.createEntryButton = page.getByRole('button', { name: 'Create calendar entry' });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.timeFields = page
      .getByRole('main')
      .last()
      .getByRole('textbox', { name: /(start|end|time)/i });
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

  weekBodyRows(): Locator {
    return this.weekTable.getByRole('rowgroup').nth(1).getByRole('row').filter({ hasText: /\S/ });
  }

  /** An entry row, matched on its Why cell. */
  entryRow(why: string): Locator {
    return this.entriesTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: why, exact: true }) });
  }

  rowEditButton(row: Locator): Locator {
    return row.getByRole('button', { name: 'Edit', exact: true });
  }
}
