import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  CalendarDetailPage,
  type WeekLineValues,
} from '../../../src/pages/planning/calendar-detail.page';
import {
  asPersona,
  createCalendar,
  openCalendar,
  personaCredentials,
  personaSkipReason,
  setupPage,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Calendar working week (List / Create / Edit working-week
 * lines), the "Default working week (N)" card on a calendar's detail page.
 *
 * Source of truth for these cases: test-cases/planning/calendar-working-week.md
 * (ClickUp "Planning -Sprint -3 - Calendar Working Week"). Lines are only
 * ever added to QA-AUTO calendars this file creates (retired by afterAll);
 * the shifts (A, B, NIGHT, SAT_AM, …) are seed data, only read.
 *
 * beforeAll builds `week` with Monday A, Tuesday A, Tuesday NIGHT and
 * Saturday SAT_AM (no Sunday), and `other` with a single Friday B line.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

async function addLines(page: Page, lines: WeekLineValues[]): Promise<void> {
  const detail = new CalendarDetailPage(page);
  for (const line of lines) {
    await detail.openNewWeekLine();
    await detail.fillWeekLine(line);
    expect(await detail.createWeekLine(), `line ${line.weekday} ${line.shift}`).toBe('submitted');
  }
  // Lines are added on step 2 of Edit calendar; Done goes back to the detail page.
  await detail.finishEditing();
}

test.describe('Planning - Calendar Working Week', () => {
  // Retires this file's QA-AUTO calendars once its cases are done.
  cleanUpAfterAll();

  let week = '';
  let other = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    week = await createCalendar(page);
    await addLines(page, [
      { weekday: 'Monday', shift: 'A' },
      { weekday: 'Tuesday', shift: 'A' },
      { weekday: 'Tuesday', shift: 'NIGHT' },
      { weekday: 'Saturday', shift: 'SAT_AM' },
    ]);
    other = await createCalendar(page);
    await addLines(page, [{ weekday: 'Friday', shift: 'B' }]);
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO calendars through the UI (~10–20 s each on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Calendar Working Week');
    await allure.owner('Planning QA');
  });

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LWK-01 The working week is scoped to its own calendar', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvnfk'), 'TC-LWK-01 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.expectWeekCount(4);
    await calendarDetailPage.expectNoWeekRow('Friday');
    await openCalendar(page, other);
    await calendarDetailPage.expectWeekCount(1);
    await calendarDetailPage.expectWeekRow('Friday', 'B');
    await calendarDetailPage.expectNoWeekRow('Monday');
  });

  test('TC-LWK-02 Columns match the spec', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvnfp'), 'TC-LWK-02 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.expectWeekRow('Monday', 'A');
    await calendarDetailPage.expectWeekColumns();
  });

  test('TC-LWK-03 A weekday can carry more than one shift line', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvnft'), 'TC-LWK-03 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.expectWeekRow('Tuesday', 'A');
    await calendarDetailPage.expectWeekRow('Tuesday', 'NIGHT');
  });

  test('TC-LWK-04 Rows sort by weekday, Monday first', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvnfw'), 'TC-LWK-04 (ClickUp)');
    await openCalendar(page, week);
    expect(await calendarDetailPage.weekdays()).toEqual([
      'Monday',
      'Tuesday',
      'Tuesday',
      'Saturday',
    ]);
  });

  test('TC-LWK-05 "Shift that runs" shows the shift\'s window and paid time', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvnfy'), 'TC-LWK-05 (ClickUp)');
    // The shifts are seed data whose times and breaks others change (dev
    // 2026-10-29: NIGHT read "7h 30m paid", not "8h"), so this checks the
    // cell's shape: window, "(+1d)" for the overnight NIGHT, then paid time.
    await openCalendar(page, week);
    await calendarDetailPage.expectWeekRow('Monday', 'A', {
      shift: /\d\d:\d\d → \d\d:\d\d · \d+h( \d\dm)? paid/,
    });
    await calendarDetailPage.expectWeekRow('Tuesday', 'NIGHT', {
      shift: /\d\d:\d\d → \d\d:\d\d \(\+1d\) · \d+h( \d\dm)? paid/,
    });
  });

  test('TC-LWK-06 Search matches the weekday name and the shift code', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvng1'), 'TC-LWK-06 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.searchWeek('monday');
    await calendarDetailPage.expectEveryWeekRowMatches('monday');
    await calendarDetailPage.searchWeek('NIGHT');
    await calendarDetailPage.expectEveryWeekRowMatches('NIGHT');
  });

  test('TC-LWK-07 "New working-week line" opens scoped to this calendar', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvng2'), 'TC-LWK-07 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openNewWeekLine();
    await calendarDetailPage.expectFormOpen('New', 'working-week line');
  });

  test('TC-LWK-08 A weekday with no line is a non-working day', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvng3'), 'TC-LWK-08 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.expectWeekRow('Saturday', 'SAT_AM');
    await calendarDetailPage.expectNoWeekRow('Sunday');
  });

  test('TC-LWK-09 A new calendar shows the custom empty working week', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvng4'), 'TC-LWK-09 (ClickUp)');
    await createCalendar(page);
    await calendarDetailPage.expectWeekCount(0);
    await calendarDetailPage.expectWeekEmptyState();
  });

  test('TC-LWK-10 The working week needs calendar read access', async ({ personas }) => {
    await allure.tms(cu('z941abvng5'), 'TC-LWK-10 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      await new CalendarDetailPage(page).openExpectingRestricted(week);
    });
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-CWK-01 "New working-week line" has the expected fields', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvng6'), 'TC-CWK-01 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openNewWeekLine();
    await calendarDetailPage.expectFormOpen('New', 'working-week line');
    await calendarDetailPage.expectWeekLineFields();
  });

  test('TC-CWK-02 Weekday and Shift are required', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvng7'), 'TC-CWK-02 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openNewWeekLine();
    await test.step('No weekday blocks Create', async () => {
      await calendarDetailPage.fillWeekLine({ shift: 'B' });
      expect(await calendarDetailPage.createWeekLine()).not.toBe('submitted');
      await calendarDetailPage.expectFormFieldFlagged('weekday');
    });
    await calendarDetailPage.cancelForm();
    await calendarDetailPage.openNewWeekLine();
    await test.step('No shift blocks Create', async () => {
      await calendarDetailPage.fillWeekLine({ weekday: 'Wednesday' });
      expect(await calendarDetailPage.createWeekLine()).not.toBe('submitted');
      await calendarDetailPage.expectFormFieldFlagged('shift');
    });
  });

  test('TC-CWK-03 There are no start/end time fields', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvng8'), 'TC-CWK-03 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openNewWeekLine();
    await calendarDetailPage.expectWeekLineFields();
  });

  test('TC-CWK-04 A weekday can take a second, different shift', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvng9'), 'TC-CWK-04 (ClickUp)');
    await createCalendar(page);
    await addLines(page, [
      { weekday: 'Monday', shift: 'A' },
      { weekday: 'Monday', shift: 'B' },
    ]);
    await calendarDetailPage.expectWeekRow('Monday', 'A');
    await calendarDetailPage.expectWeekRow('Monday', 'B');
    await calendarDetailPage.expectWeekCount(2);
  });

  test('TC-CWK-05 An exact duplicate weekday + shift is refused', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvnga'), 'TC-CWK-05 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openNewWeekLine();
    await calendarDetailPage.fillWeekLine({ weekday: 'Monday', shift: 'A' });
    await calendarDetailPage.submitExpectingToast(
      'line',
      'That shift already runs on that weekday. Pick another shift, or edit the line that exists.',
    );
  });

  test('TC-CWK-06 Standing overtime is set per line, independent of the shift', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvngb'), 'TC-CWK-06 (ClickUp)');
    await createCalendar(page);
    await addLines(page, [
      { weekday: 'Tuesday', shift: 'NIGHT', standingOvertime: true },
      { weekday: 'Wednesday', shift: 'NIGHT' },
    ]);
    await calendarDetailPage.expectWeekRow('Tuesday', 'NIGHT', { ot: 'Standing overtime' });
    await calendarDetailPage.expectWeekRow('Wednesday', 'NIGHT', { ot: 'Contracted' });
  });

  test('TC-CWK-07 Cancel adds no line', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvngc'), 'TC-CWK-07 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.expectWeekCount(4);
    await calendarDetailPage.openNewWeekLine();
    await calendarDetailPage.fillWeekLine({ weekday: 'Wednesday', shift: 'A_OT' });
    await calendarDetailPage.cancelForm();
    await calendarDetailPage.finishEditing();
    await calendarDetailPage.expectLoaded(week);
    await calendarDetailPage.expectWeekRow('Monday', 'A');
    await calendarDetailPage.expectNoWeekRow('Wednesday');
  });

  test('TC-CWK-08 Only a user with write permission can add a line', async ({
    page,
    personas,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvngd'), 'TC-CWK-08 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new CalendarDetailPage(roPage);
      await detail.open(other);
      // If "New working-week line" is usable for a read-only user, the create must be refused.
      if (await detail.isNewWeekLineAvailable()) {
        await detail.openNewWeekLine();
        await detail.fillWeekLine({ weekday: 'Thursday', shift: 'A' });
        await detail.createWeekLine();
      }
    });
    await openCalendar(page, other);
    await calendarDetailPage.expectWeekRow('Friday', 'B');
    await calendarDetailPage.expectNoWeekRow('Thursday');
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EWK-01 A line opens for editing', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvnge'), 'TC-EWK-01 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openWeekLineEdit('Monday', 'A');
    await calendarDetailPage.expectFormOpen('Edit', 'working-week line');
    await calendarDetailPage.expectWeekLineFields();
  });

  test('TC-EWK-02 Edits persist after Save changes', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvngf'), 'TC-EWK-02 (ClickUp)');
    await createCalendar(page);
    await addLines(page, [{ weekday: 'Monday', shift: 'A' }]);
    await calendarDetailPage.openWeekLineEdit('Monday', 'A');
    await calendarDetailPage.fillWeekLine({ shift: 'B', standingOvertime: true });
    expect(await calendarDetailPage.saveChanges()).toBe('submitted');
    await calendarDetailPage.finishEditing();
    await calendarDetailPage.expectWeekRow('Monday', 'B', { ot: 'Standing overtime' });
    await calendarDetailPage.expectNoWeekRow('Monday', 'A');
  });

  test('TC-EWK-03 Changing the weekday moves the line in place', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvngg'), 'TC-EWK-03 (ClickUp)');
    await createCalendar(page);
    await addLines(page, [{ weekday: 'Tuesday', shift: 'NIGHT' }]);
    await calendarDetailPage.openWeekLineEdit('Tuesday', 'NIGHT');
    await calendarDetailPage.fillWeekLine({ weekday: 'Sunday' });
    expect(await calendarDetailPage.saveChanges()).toBe('submitted');
    await calendarDetailPage.expectWeekRow('Sunday', 'NIGHT');
    await calendarDetailPage.expectNoWeekRow('Tuesday');
    await calendarDetailPage.expectWeekCount(1);
  });

  test('TC-EWK-04 Retiring a line updates the summary but keeps it listed', async ({
    page,
    calendarDetailPage,
    calendarsListPage,
  }) => {
    await allure.tms(cu('z941abvngh'), 'TC-EWK-04 (ClickUp)');
    const code = await createCalendar(page);
    await addLines(page, [
      { weekday: 'Monday', shift: 'A' },
      { weekday: 'Sunday', shift: 'NIGHT' },
    ]);
    await calendarsListPage.findRow(code);
    await calendarsListPage.expectRowContains(code, '2 working days · 2 shift lines');
    await openCalendar(page, code);
    await calendarDetailPage.openWeekLineEdit('Sunday', 'NIGHT');
    await calendarDetailPage.fillWeekLine({ active: false });
    expect(await calendarDetailPage.saveChanges()).toBe('submitted');
    await calendarDetailPage.expectWeekRow('Sunday', 'NIGHT', { active: 'Retired' });
    await calendarsListPage.findRow(code);
    await calendarsListPage.expectRowContains(code, '1 working day · 1 shift line');
  });

  test('TC-EWK-05 Cancel discards in-progress edits', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvngk'), 'TC-EWK-05 (ClickUp)');
    await openCalendar(page, week);
    await calendarDetailPage.openWeekLineEdit('Monday', 'A');
    await calendarDetailPage.fillWeekLine({ standingOvertime: true, active: false });
    await calendarDetailPage.cancelForm();
    await calendarDetailPage.finishEditing();
    await calendarDetailPage.expectLoaded(week);
    await calendarDetailPage.expectWeekRow('Monday', 'A', { ot: 'Contracted', active: 'Active' });
  });

  test('TC-EWK-06 Only a user with write permission can save line edits', async ({
    page,
    personas,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvngm'), 'TC-EWK-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new CalendarDetailPage(roPage);
      await detail.open(other);
      // If the row's Edit is usable for a read-only user, the save must be refused.
      if (await detail.isWeekLineEditAvailable('Friday', 'B')) {
        await detail.openWeekLineEdit('Friday', 'B');
        await detail.fillWeekLine({ standingOvertime: true });
        await detail.saveChanges();
      }
    });
    await openCalendar(page, other);
    await calendarDetailPage.expectWeekRow('Friday', 'B', { ot: 'Contracted' });
  });
});
