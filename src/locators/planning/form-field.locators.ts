import { type Locator, type Page } from '@playwright/test';

/**
 * Raw locators shared by the Planning master-data create/edit forms and
 * detail pages (Operations, Work Centres, Machines, …). No actions or
 * assertions here.
 */

/**
 * The inline validation message ("Required", "This code is already
 * taken", …) under one control. Each field renders its control and its
 * `role=alert` side by side in one wrapper, so the control's parent holds
 * exactly that field's message (confirmed 2026-10-12 on all three forms).
 * A number input sits one level deeper, in its own box with the
 * Increase / Decrease buttons — pass `levels: 2` for those.
 */
export function fieldAlert(control: Locator, levels: 1 | 2 = 1): Locator {
  return control.locator(levels === 1 ? 'xpath=..' : 'xpath=../..').getByRole('alert');
}

/** The validation messages (`role=alert`) inside `scope` — an inline-table row or one of its cells. */
export function alertsIn(scope: Locator): Locator {
  return scope.getByRole('alert');
}

/**
 * A read-only detail page renders each field as a label span followed by
 * its value span inside one wrapper — this is the value next to `label`.
 * Since the 2026-10-28 dev deploy a label with an info tooltip is wrapped
 * with its button in a span of its own (div > span > [span label, button]),
 * so the value is the sibling of whichever span sits directly in the div.
 */
export function detailValue(page: Page, label: string): Locator {
  return page
    .getByRole('main')
    .last()
    .getByText(label, { exact: true })
    .first()
    .locator('xpath=ancestor-or-self::span[parent::div][1]/following-sibling::span[1]');
}

/**
 * A field's help text: inline under the field, or — since the 2026-10-28 dev
 * deploy — the accessible name of the info-tooltip button beside its label.
 * `scope` narrows it, e.g. to a dialog.
 */
export function fieldHelp(scope: Page | Locator, text: RegExp): Locator {
  return scope.getByText(text).or(scope.getByRole('button', { name: text }));
}

/**
 * The calendar popover a "Pick date" / "Pick date and time" trigger opens:
 * a month grid of day buttons ("Today, Monday, October 12th, 2026"), and
 * for date-time fields a "Pick time" group plus "Done".
 */
export class DatePickerLocators {
  readonly dialog: Locator;
  readonly grid: Locator;
  readonly previousMonth: Locator;
  readonly nextMonth: Locator;
  readonly today: Locator;
  readonly timeGroup: Locator;
  readonly doneButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog').last();
    this.grid = this.dialog.getByRole('grid');
    // Since the 2026-10-28 dev deploy the popover is "Choose a date": the month
    // buttons are "Previous month" / "Next month", and a date is only kept on
    // "Apply".
    this.previousMonth = this.dialog.getByRole('button', {
      name: /^(Go to the Previous Month|Previous month)$/,
    });
    this.nextMonth = this.dialog.getByRole('button', {
      name: /^(Go to the Next Month|Next month)$/,
    });
    // Today's own day cell ("Today, Thursday, October 29th, 2026"), not the "Today"
    // button: the popover can open upward and clip that button off-screen.
    this.today = this.dialog.getByRole('button', { name: /^Today, / });
    this.timeGroup = this.dialog.getByRole('group', { name: 'Pick time' });
    this.doneButton = this.dialog.getByRole('button', { name: /^(Done|Apply)$/ });
  }

  day(name: RegExp): Locator {
    return this.grid.getByRole('button', { name });
  }

  /**
   * "Pick time" lists the hours 00–23 and then the minutes 00–59 as plain
   * buttons in one group, so an hour is the first button with that label
   * and a minute the last one.
   */
  hour(hh: string): Locator {
    return this.timeGroup.getByRole('button', { name: hh, exact: true }).first();
  }

  minute(mm: string): Locator {
    return this.timeGroup.getByRole('button', { name: mm, exact: true }).last();
  }
}

/**
 * A date (or date-time) field's trigger: "Pick date" / "Pick date and
 * time" while empty, "<value> Clear date[ and time]" once set. The inner
 * "Clear …" button is excluded by requiring text before it.
 */
export function dateTriggers(page: Page, withTime: boolean): Locator {
  return page
    .getByRole('main')
    .last()
    .getByRole('button', {
      name: withTime
        ? /^(Pick date and time|.+ Clear date and time)$/
        : /^(Pick date|.+ Clear date)$/,
    });
}

/** The "Clear date[ and time]" button inside a set date field's trigger. */
export function dateClearButton(trigger: Locator): Locator {
  return trigger.getByRole('button', { name: /^Clear date/ });
}

/** A toast in the shell's notifications region. */
export function toast(page: Page, text: string | RegExp): Locator {
  return page.getByRole('region', { name: /Notifications/ }).getByText(text);
}

/**
 * A time field's trigger: "Pick time" while empty; once set, its value plus
 * the nested clear button's label ("07:30 AM Clear time"). The popover is a
 * "Pick time" group: hours 00–23, then minutes in 5-minute steps (see
 * DatePickerLocators.hour / minute).
 */
export function timeTriggers(page: Page): Locator {
  return page
    .getByRole('main')
    .last()
    .getByRole('button', { name: /^(Pick time|\d\d:\d\d( [AP]M)?( Clear time)?)$/ });
}
