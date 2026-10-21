import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { CalendarsListPage } from '../../../src/pages/planning/calendars-list.page';
import { CalendarFormPage } from '../../../src/pages/planning/calendar-form.page';
import { CalendarDetailPage } from '../../../src/pages/planning/calendar-detail.page';
import {
  asPersona,
  createCalendar,
  nameOf,
  openCalendar,
  personaCredentials,
  personaSkipReason,
  setupPage,
  trackCode,
  uniqueTag,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Calendars (Create / Edit / List) and Calendar entries
 * (Create / Edit) at /planning/master-data/calendars.
 *
 * Source of truth for these cases: test-cases/planning/calendars.md
 * (ClickUp "Planning -Sprint -3 - Calendars"). Calendars are only ever
 * created by this file (QA-AUTO, code prefix QA-CAL); seed calendars
 * (FACTORY-2627, …) are only read. Calendars can't be deleted — each
 * file's afterAll retires its own.
 *
 * beforeAll builds `cal` (Department scope, top level) with one entry
 * (`ENTRY`, day 20 of the current month).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const ENTRY = 'QA-AUTO entry';

test.describe('Planning - Calendars', () => {
  // Retires this file's QA-AUTO calendars once its cases are done.
  cleanUpAfterAll();

  let cal = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    cal = await createCalendar(page);
    const detail = new CalendarDetailPage(page);
    await detail.openNewEntry();
    await detail.fillEntry({ day: 20, dayType: 'Holiday', why: ENTRY });
    expect(await detail.createEntry()).toBe('submitted');
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO calendars through the UI (~10–20 s each on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Calendars');
    await allure.owner('Planning QA');
  });

  // ── Create calendar ───────────────────────────────────────────────────

  test('TC-CC-01 Open "New calendar" as a dedicated page', async ({
    calendarsListPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf6e'), 'TC-CC-01 (ClickUp)');
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.openNewCalendar();
    await calendarFormPage.expectOnCreatePage();
    await calendarFormPage.expectCreateFields();
  });

  test('TC-CC-02 Block Create when a required field is empty', async ({ calendarFormPage }) => {
    await allure.tms(cu('z941abvf6f'), 'TC-CC-02 (ClickUp)');
    // Applies to and Time zone ship with a value and have no empty choice.
    await calendarFormPage.open();
    // Dev 2026-10-16: the code is generated on save, so only Name is left to fill.
    await test.step('Empty Name is flagged; the code is generated, not required', async () => {
      expect(await calendarFormPage.submitCreate()).not.toBe('submitted');
      await calendarFormPage.expectFieldFlagged('name');
      await calendarFormPage.expectCodeGenerated();
    });
    await test.step('Applies to has no empty choice', async () => {
      await calendarFormPage.expectNoEmptyChoice('appliesTo');
    });
  });

  test('TC-CC-03 Code must be unique, case-insensitively', async ({ page, calendarFormPage }) => {
    await allure.tms(cu('z941abvf6g'), 'TC-CC-03 (ClickUp)');
    // Dev 2026-10-16: the code is generated on save (CAL-0001…) and can't be
    // typed, so a duplicate can't be entered. Checks what replaces the rule:
    // the code field is locked and each new calendar gets its own code.
    await calendarFormPage.open();
    await calendarFormPage.expectCodeGenerated();
    const another = await createCalendar(page);
    expect(cal).toMatch(/^CAL-\d+$/);
    expect(another).toMatch(/^CAL-\d+$/);
    expect(another, 'each calendar gets its own code').not.toBe(cal);
  });

  test('TC-CC-04 "Applies to" accepts all four scopes', async ({ page, calendarsListPage }) => {
    await allure.tms(cu('z941abvf6j'), 'TC-CC-04 (ClickUp)');
    test.setTimeout(300_000);
    const form = new CalendarFormPage(page);
    await form.open();
    expect(await form.optionsOf('appliesTo')).toEqual([
      'Factory',
      'Department',
      'Work centre',
      'Shift',
    ]);
    for (const scope of ['Factory', 'Work centre', 'Shift'] as const) {
      await test.step(`A ${scope} calendar saves and shows its scope`, async () => {
        const code = await createCalendar(page, { appliesTo: scope });
        await new CalendarDetailPage(page).expectValue('Applies to', scope);
        await calendarsListPage.findRow(code);
        await calendarsListPage.expectRowContains(code, scope);
      });
    }
  });

  test('TC-CC-05 "Inherits from" is optional; blank means top level', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf6k'), 'TC-CC-05 (ClickUp)');
    const child = await createCalendar(page, { inheritsFrom: cal });
    await calendarDetailPage.expectValue('Inherits from', cal);
    await openCalendar(page, cal);
    await calendarDetailPage.expectValue('Inherits from', 'Nothing — top level');
    expect(child).not.toBe(cal);
  });

  test('TC-CC-06 Self-reference and loops are rejected', async ({ page, calendarFormPage }) => {
    await allure.tms(cu('z941abvf6n'), 'TC-CC-06 (ClickUp)');
    const parent = await createCalendar(page);
    const child = await createCalendar(page, { inheritsFrom: parent });
    await calendarFormPage.openEdit(parent);
    await test.step('A calendar is never offered as its own parent', async () => {
      const options = await calendarFormPage.optionsOf('inheritsFrom');
      expect(options.filter((o) => o.startsWith(`${parent} ·`))).toEqual([]);
    });
    await test.step('Closing a loop (parent → child) is refused', async () => {
      await calendarFormPage.fill({ inheritsFrom: child });
      await calendarFormPage.saveExpectingToast(
        `That parent would create a loop: ${parent} -> ${child}`,
      );
    });
  });

  test("TC-CC-07 A parent in another time zone warns but doesn't block", async ({
    page,
    calendarFormPage,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf6t'), 'TC-CC-07 (ClickUp)');
    const tag = uniqueTag('QA-CAL');
    await calendarFormPage.open();
    await calendarFormPage.fill({ name: `QA-AUTO ${tag} tz`, inheritsFrom: cal });
    await calendarFormPage.expectTimeZoneWarning(false);
    await calendarFormPage.fill({ timeZone: 'Europe/London' });
    await calendarFormPage.expectTimeZoneWarning(true);
    expect(await calendarFormPage.submitCreate()).toBe('submitted');
    const code = await calendarDetailPage.createdCode();
    trackCode('QA-CAL', code);
    await calendarDetailPage.expectValue('Time zone', 'Europe/London');
    expect(page.url()).toContain(code);
  });

  test('TC-CC-08 Cancel discards the form without creating a record', async ({
    calendarFormPage,
    calendarsListPage,
  }) => {
    await allure.tms(cu('z941abvf6w'), 'TC-CC-08 (ClickUp)');
    const tag = uniqueTag('QA-CAL');
    await calendarFormPage.open();
    await calendarFormPage.fill({ name: `QA-AUTO ${tag} cancelled` });
    await calendarFormPage.cancel();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.search(tag);
    await calendarsListPage.expectNoMatchState();
  });

  test('TC-CC-09 Only a user with write permission can create a calendar', async ({
    personas,
    calendarsListPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf6y'), 'TC-CC-09 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.openNewCalendar();
    await calendarFormPage.expectOnCreatePage();
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new CalendarsListPage(page);
      await list.open();
      await list.expectNewBlocked();
    });
  });

  // ── Edit calendar ─────────────────────────────────────────────────────

  test('TC-EC-01 A calendar opens for editing; Code is read-only', async ({
    page,
    calendarDetailPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf71'), 'TC-EC-01 (ClickUp)');
    await openCalendar(page, cal);
    await calendarDetailPage.startEditing();
    await calendarFormPage.expectOnEditPage();
    await calendarFormPage.expectCodeLocked(cal);
    await calendarFormPage.expectNoVersionField();
  });

  test('TC-EC-02 Edits persist after Save changes', async ({
    page,
    calendarDetailPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf72'), 'TC-EC-02 (ClickUp)');
    const parent = await createCalendar(page);
    const code = await createCalendar(page);
    await calendarFormPage.openEdit(code);
    await test.step('The save notice says the edit rewrites the calendar; no Version field', async () => {
      // Sept: "saves as a new version" and Version went v1 → v2. Dev 2026-10-13
      // rewrites in place and Version is gone from the form, detail and list —
      // graded a pass by the user 2026-10-14.
      expect(await calendarFormPage.saveNoticeText()).toMatch(
        /^Saving rewrites this calendar\. Anything already planned against it picks up the change\./,
      );
      await calendarFormPage.expectNoVersionField();
    });
    await calendarFormPage.fill({
      name: `QA-AUTO ${code} edited`,
      appliesTo: 'Shift',
      inheritsFrom: parent,
      timeZone: 'Europe/London',
      active: false,
    });
    expect(await calendarFormPage.saveChanges()).toBe('submitted');
    await openCalendar(page, code);
    for (const [label, value] of [
      ['Name', `QA-AUTO ${code} edited`],
      ['Applies to', 'Shift'],
      ['Inherits from', parent],
      ['Time zone', 'Europe/London'],
      ['Status', 'Retired'],
    ] as const)
      await test.step(`${label} persisted`, async () => {
        await calendarDetailPage.expectValue(label, value);
      });
  });

  test('TC-EC-03 Block Save changes when a required field is cleared', async ({
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf73'), 'TC-EC-03 (ClickUp)');
    // Applies to / Time zone are selects with no empty choice.
    await calendarFormPage.openEdit(cal);
    await calendarFormPage.setName('');
    expect(await calendarFormPage.saveChanges()).not.toBe('submitted');
    await calendarFormPage.expectFieldFlagged('name');
    await calendarFormPage.expectNoEmptyChoice('appliesTo');
  });

  test('TC-EC-04 A loop is refused on Save changes too', async ({ page, calendarFormPage }) => {
    await allure.tms(cu('z941abvf75'), 'TC-EC-04 (ClickUp)');
    const b = await createCalendar(page);
    const a = await createCalendar(page, { inheritsFrom: b });
    await calendarFormPage.openEdit(b);
    await calendarFormPage.fill({ inheritsFrom: a });
    await calendarFormPage.saveExpectingToast(`That parent would create a loop: ${b} -> ${a}`);
    await openCalendar(page, b);
    await new CalendarDetailPage(page).expectValue('Inherits from', 'Nothing — top level');
  });

  test('TC-EC-05 Cancel discards in-progress edits', async ({
    page,
    calendarDetailPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf76'), 'TC-EC-05 (ClickUp)');
    await calendarFormPage.openEdit(cal);
    await calendarFormPage.fill({ name: 'QA-AUTO SHOULD NOT PERSIST', appliesTo: 'Shift' });
    await calendarFormPage.cancel();
    await openCalendar(page, cal);
    await calendarDetailPage.expectValue('Name', nameOf(cal));
    await calendarDetailPage.expectValue('Applies to', 'Department');
  });

  test('TC-EC-06 Only a user with write permission can save edits', async ({
    page,
    personas,
    calendarDetailPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf79'), 'TC-EC-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await openCalendar(page, cal);
    await calendarDetailPage.startEditing();
    await calendarFormPage.expectOnEditPage();
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new CalendarDetailPage(roPage);
      await detail.open(cal);
      await detail.expectEditBlocked();
    });
  });

  // ── List calendars ────────────────────────────────────────────────────

  test('TC-LC-01 "New calendar" opens the create form as its own page', async ({
    calendarsListPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf7c'), 'TC-LC-01 (ClickUp)');
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.openNewCalendar();
    await calendarFormPage.expectOnCreatePage();
    await calendarFormPage.expectCreateFields();
  });

  test('TC-LC-02 Search filters by code, name and scope', async ({ page, calendarsListPage }) => {
    await allure.tms(cu('z941abvf7e'), 'TC-LC-02 (ClickUp)');
    await allure.tms(cu('z941abyqd8'), 'TC-LC-02 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abyqd8 (2026-10-14): the search covered code
    // and name only. On dev 2026-10-16 "shift" finds Shift-scope calendars whose
    // code and name lack the word; the ClickUp status is left to the user.
    const shiftCal = await createCalendar(page, { appliesTo: 'Shift' });
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await test.step('By code', async () => {
      await calendarsListPage.search(cal);
      await calendarsListPage.expectRowVisible(cal);
      await calendarsListPage.expectEveryRowMatches(cal);
    });
    await test.step('By name', async () => {
      await calendarsListPage.search('Planning regression test data');
      await calendarsListPage.expectRowVisible(cal);
    });
    await test.step('By scope', async () => {
      await calendarsListPage.search('shift');
      await calendarsListPage.expectRowVisible(shiftCal);
    });
  });

  test('TC-LC-03 Filters panel applies and clears a rule', async ({ calendarsListPage }) => {
    await allure.tms(cu('z941abvf7g'), 'TC-LC-03 (ClickUp)');
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.openFilters();
    await calendarsListPage.addFilterRule('Code', cal);
    await calendarsListPage.expectFiltersBadge(1);
    // Until the rule applies, cal's child calendars are listed too (they show
    // cal's code under "Inherits from"): wait for the one row, then check it's cal.
    await expect.poll(() => calendarsListPage.visibleRowCount()).toBe(1);
    await calendarsListPage.expectRowVisible(cal);
    await calendarsListPage.clearAllFilters();
    await calendarsListPage.expectNoFiltersBadge();
    await expect.poll(() => calendarsListPage.visibleRowCount()).toBeGreaterThan(1);
  });

  test('TC-LC-04 Columns icon hides a column', async ({ calendarsListPage }) => {
    await allure.tms(cu('z941abvf7j'), 'TC-LC-04 (ClickUp)');
    // The case hides "Version"; the list no longer has a Version column
    // (2026-10-13), so it hides Time zone.
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.hideColumn('Time zone');
    await calendarsListPage.expectColumnHidden('Time zone');
    await calendarsListPage.resetColumns();
    await calendarsListPage.expectColumnVisible('Time zone');
  });

  test('TC-LC-05 View switch re-renders without data loss', async ({ calendarsListPage }) => {
    await allure.tms(cu('z941abvf7k'), 'TC-LC-05 (ClickUp)');
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    const { total } = await calendarsListPage.showing();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await calendarsListPage.switchView(view);
      await calendarsListPage.expectViewActive(view);
    }
    await calendarsListPage.expectGridVisible();
    expect((await calendarsListPage.showing()).total).toBe(total);
  });

  test('TC-LC-06 Row click opens calendar detail; Edit is a separate action', async ({
    calendarsListPage,
    calendarDetailPage,
    calendarFormPage,
  }) => {
    await allure.tms(cu('z941abvf7n'), 'TC-LC-06 (ClickUp)');
    await calendarsListPage.findRow(cal);
    await calendarsListPage.openRow(cal);
    await calendarDetailPage.expectLoaded(cal);
    await calendarDetailPage.expectReadOnlyView();
    await calendarDetailPage.startEditing();
    await calendarFormPage.expectOnEditPage();
  });

  test('TC-LC-07 Empty state and no-match state', async ({ calendarsListPage }) => {
    await allure.tms(cu('z941abvf7q'), 'TC-LC-07 (ClickUp)');
    await allure.tms(cu('z941abvf9c'), 'TC-LC-07 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abvf9c (2026-09-17): a search that matched
    // nothing showed the empty-table copy "No calendars yet — …". On dev
    // 2026-10-13 it shows "No calendar matches — Nothing here matches the
    // search or filters.", so this passes there; the ClickUp status is left
    // to the user. The zero-records half can't run on a shared environment.
    await calendarsListPage.open();
    await calendarsListPage.expectLoaded();
    await calendarsListPage.search(`no-such-calendar-${Date.now()}`);
    await calendarsListPage.expectNoMatchState();
  });

  test('TC-LC-08 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abvf7r'), 'TC-LC-08 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new CalendarsListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });

  // ── Create calendar entry ─────────────────────────────────────────────

  test('TC-CCE-01 "New calendar entry" opens from a calendar\'s detail page', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf7w'), 'TC-CCE-01 (ClickUp)');
    await openCalendar(page, cal);
    await calendarDetailPage.openNewEntry();
    await calendarDetailPage.expectFormOpen('New', 'calendar entry', cal);
  });

  test('TC-CCE-02 Date is required; Why is optional', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvf7x'), 'TC-CCE-02 (ClickUp)');
    // Day type ships with a value (Holiday) and has no empty choice.
    const code = await createCalendar(page);
    await calendarDetailPage.openNewEntry();
    await test.step('No date blocks Create', async () => {
      expect(await calendarDetailPage.createEntry()).not.toBe('submitted');
      await calendarDetailPage.expectEntryDateFlagged();
    });
    await test.step('Day type has no empty choice', async () => {
      await calendarDetailPage.expectNoEmptyDayType();
    });
    await test.step('A date alone (no Why) saves', async () => {
      await calendarDetailPage.fillEntry({ day: 21 });
      expect(await calendarDetailPage.createEntry()).toBe('submitted');
      await calendarDetailPage.expectEntryCount(1);
    });
    expect(code).toBeTruthy();
  });

  test('TC-CCE-03 Only one entry per date in a calendar', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvf7z'), 'TC-CCE-03 (ClickUp)');
    await openCalendar(page, cal);
    await calendarDetailPage.openNewEntry();
    await calendarDetailPage.fillEntry({ day: 20, why: 'QA-AUTO duplicate date' });
    await calendarDetailPage.submitExpectingToast(
      'entry',
      new RegExp(`Calendar "${cal}" already has an entry for`),
    );
  });

  test('TC-CCE-04 Day type accepts all four values, each a coloured pill', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf81'), 'TC-CCE-04 (ClickUp)');
    test.setTimeout(300_000);
    await createCalendar(page);
    const types = ['Working', 'Half day', 'Holiday', 'Shutdown'] as const;
    for (const [i, dayType] of types.entries()) {
      await test.step(`${dayType} saves`, async () => {
        await calendarDetailPage.openNewEntry();
        await calendarDetailPage.fillEntry({ day: 10 + i, dayType, why: `QA-AUTO ${dayType}` });
        expect(await calendarDetailPage.createEntry()).toBe('submitted');
      });
    }
    const colours = new Set<string>();
    for (const dayType of types)
      colours.add(await calendarDetailPage.dayTypeColours(`QA-AUTO ${dayType}`, dayType));
    expect(colours.size, [...colours].join(' | ')).toBeGreaterThan(1);
    expect([...colours].filter((c) => c.startsWith('transparent'))).toEqual([]);
  });

  test('TC-CCE-05 Only exceptions are stored', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvf82'), 'TC-CCE-05 (ClickUp)');
    await createCalendar(page);
    await calendarDetailPage.expectEntryCount(0);
    await calendarDetailPage.openNewEntry();
    await calendarDetailPage.fillEntry({ day: 15, why: 'QA-AUTO only exception' });
    expect(await calendarDetailPage.createEntry()).toBe('submitted');
    await calendarDetailPage.expectEntryCount(1);
    await calendarDetailPage.expectEntryRow('QA-AUTO only exception');
  });

  test('TC-CCE-06 Cancel discards the entry', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvf84'), 'TC-CCE-06 (ClickUp)');
    await openCalendar(page, cal);
    await calendarDetailPage.expectEntryRow(ENTRY);
    await calendarDetailPage.openNewEntry();
    await calendarDetailPage.fillEntry({ day: 22, dayType: 'Shutdown', why: 'QA-AUTO cancelled' });
    await calendarDetailPage.cancelForm();
    await page.reload();
    await calendarDetailPage.expectLoaded(cal);
    await calendarDetailPage.expectEntryRow(ENTRY);
    await calendarDetailPage.expectNoEntryRow('QA-AUTO cancelled');
  });

  test('TC-CCE-07 Only a user with write permission can add an entry', async ({
    page,
    personas,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf87'), 'TC-CCE-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    const attempted = 'QA-AUTO read-only entry attempt';
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new CalendarDetailPage(roPage);
      await detail.open(cal);
      // If "New calendar entry" is usable for a read-only user, the create must be refused.
      if (await detail.isNewEntryAvailable()) {
        await detail.openNewEntry();
        await detail.fillEntry({ day: 23, why: attempted });
        await detail.createEntry();
      }
    });
    await openCalendar(page, cal);
    await calendarDetailPage.expectEntryRow(ENTRY);
    await calendarDetailPage.expectNoEntryRow(attempted);
  });

  // ── Edit calendar entry ───────────────────────────────────────────────

  test('TC-ECE-01 An entry opens for editing', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvf8a'), 'TC-ECE-01 (ClickUp)');
    await openCalendar(page, cal);
    await calendarDetailPage.openEntryEdit(ENTRY);
    await calendarDetailPage.expectFormOpen('Edit', 'calendar entry', cal);
  });

  test('TC-ECE-02 Day type and Why persist after Save changes', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf8c'), 'TC-ECE-02 (ClickUp)');
    await createCalendar(page);
    await calendarDetailPage.openNewEntry();
    await calendarDetailPage.fillEntry({ day: 12, dayType: 'Holiday', why: 'QA-AUTO before edit' });
    expect(await calendarDetailPage.createEntry()).toBe('submitted');
    await calendarDetailPage.openEntryEdit('QA-AUTO before edit');
    await calendarDetailPage.fillEntry({ dayType: 'Half day', why: 'QA-AUTO after edit' });
    expect(await calendarDetailPage.saveChanges()).toBe('submitted');
    await page.reload();
    await calendarDetailPage.expectEntryRow('QA-AUTO after edit', { type: 'Half day' });
    await calendarDetailPage.expectNoEntryRow('QA-AUTO before edit');
  });

  test("TC-ECE-03 Moving an entry onto another entry's date is refused", async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf8e'), 'TC-ECE-03 (ClickUp)');
    const code = await createCalendar(page);
    for (const [day, why] of [
      [17, 'QA-AUTO day 17'],
      [18, 'QA-AUTO day 18'],
    ] as const) {
      await calendarDetailPage.openNewEntry();
      await calendarDetailPage.fillEntry({ day, why });
      expect(await calendarDetailPage.createEntry()).toBe('submitted');
    }
    await calendarDetailPage.openEntryEdit('QA-AUTO day 18');
    await calendarDetailPage.fillEntry({ day: 17 });
    await calendarDetailPage.submitExpectingToast(
      'save',
      new RegExp(`Calendar "${code}" already has an entry for`),
    );
  });

  test('TC-ECE-04 Block Save changes when Date is cleared', async ({
    page,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf8f'), 'TC-ECE-04 (ClickUp)');
    // Day type is a select with no empty choice.
    await openCalendar(page, cal);
    await calendarDetailPage.openEntryEdit(ENTRY);
    await calendarDetailPage.clearEntryDate();
    expect(await calendarDetailPage.saveChanges()).not.toBe('submitted');
    await calendarDetailPage.expectEntryDateFlagged();
    await calendarDetailPage.expectNoEmptyDayType();
  });

  test('TC-ECE-05 Cancel discards in-progress edits', async ({ page, calendarDetailPage }) => {
    await allure.tms(cu('z941abvf8h'), 'TC-ECE-05 (ClickUp)');
    await openCalendar(page, cal);
    await calendarDetailPage.openEntryEdit(ENTRY);
    await calendarDetailPage.fillEntry({ dayType: 'Working', why: 'QA-AUTO SHOULD NOT PERSIST' });
    await calendarDetailPage.cancelForm();
    await page.reload();
    await calendarDetailPage.expectLoaded(cal);
    await calendarDetailPage.expectEntryRow(ENTRY, { type: 'Holiday' });
  });

  test('TC-ECE-06 Only a user with write permission can save entry edits', async ({
    page,
    personas,
    calendarDetailPage,
  }) => {
    await allure.tms(cu('z941abvf8j'), 'TC-ECE-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new CalendarDetailPage(roPage);
      await detail.open(cal);
      // If the row's Edit is usable for a read-only user, the save must be refused.
      if (await detail.isEntryEditAvailable(ENTRY)) {
        await detail.openEntryEdit(ENTRY);
        await detail.fillEntry({ why: 'QA-AUTO read-only edit attempt' });
        await detail.saveChanges();
      }
    });
    await openCalendar(page, cal);
    await calendarDetailPage.expectEntryRow(ENTRY);
  });
});
