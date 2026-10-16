import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  ShiftDetailPage,
  ShiftFormPage,
  ShiftsListPage,
} from '../../../src/pages/planning/shifts.page';
import {
  addBreak,
  asPersona,
  createShift,
  nameOf,
  personaCredentials,
  personaSkipReason,
  setupPage,
  trackCode,
  uniqueTag,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — Shifts & breaks (List / Create / Edit shifts; List / Create /
 * Edit breaks) at /planning/master-data/shifts.
 *
 * Source of truth for these cases: test-cases/planning/shifts-breaks.md
 * (ClickUp "Planning -Sprint -3 - Shift (kind and break)", TC-LSH / CSH /
 * ESH / LBR / CBR / EBR). Shifts are only ever created by this file
 * (QA-AUTO, code QA_SH…); the seed shifts (A, B, NIGHT, A_OT, SAT_AM, C)
 * are only read. Shifts can't be deleted — afterAll retires this file's own.
 *
 * beforeAll builds:
 * - `day`: Standard 07:30 → 16:30 with "QA-AUTO Lunch" 12:00–12:30 unpaid
 *   and "QA-AUTO Tea" 10:00–10:10 paid (Gross 540, Paid 510).
 * - `night`: Night 22:00 → 06:00 (crosses midnight) with its own
 *   "QA-AUTO Tea" 02:00–02:10, paid, after midnight.
 * - `bare`: Standard 08:00 → 12:00, no breaks.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const LUNCH = 'QA-AUTO Lunch';
const TEA = 'QA-AUTO Tea';
/** A minutes value as dev shows it: "510" / "510 min" or, in places, "8h 30m". */
const minutes = (n: number) =>
  new RegExp(`^(${n}\\b|${Math.floor(n / 60)}h( ${String(n % 60).padStart(2, '0')}m)?$)`);

test.describe('Planning - Shifts & Breaks', () => {
  // Retires this file's QA-AUTO shifts once its cases are done.
  cleanUpAfterAll();

  let day = '';
  let night = '';
  let bare = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (~10–20 s per create on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    day = await createShift(page);
    await addBreak(page, { name: LUNCH });
    await addBreak(page, { name: TEA, starts: '10:00', ends: '10:10', paid: true });
    night = await createShift(page, {
      kind: 'Night',
      starts: '22:00',
      ends: '06:00',
      crossesMidnight: true,
    });
    await addBreak(page, {
      name: TEA,
      starts: '02:00',
      ends: '02:10',
      paid: true,
      fallsAfterMidnight: true,
    });
    bare = await createShift(page, { starts: '08:00', ends: '12:00' });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO shifts through the UI (~10–20 s each on dev).
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Shifts & Breaks');
    await allure.owner('Planning QA');
  });

  // ── List shifts ───────────────────────────────────────────────────────

  test('TC-LSH-01 The list shows the right columns', async ({ page }) => {
    await allure.tms(cu('z941abw5nj'), 'TC-LSH-01 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    await list.expectColumnHeaders([
      'Shift code',
      'Name',
      'Shift kind',
      'Starts',
      'Ends',
      'Crosses midnight',
      'Gross minutes',
      'Paid minutes',
      'Breaks',
      'Order in day',
      'Active',
    ]);
  });

  test('TC-LSH-02 Standard / Overtime / Night tabs partition All', async ({ page }) => {
    await allure.tms(cu('z941abw5nk'), 'TC-LSH-02 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    // Re-read together: other tests in this file create shifts meanwhile.
    await list.expectTabCountsAddUp(['Standard', 'Overtime', 'Night']);
  });

  test('TC-LSH-03 "Breaks" shows each shift\'s own break count', async ({ page }) => {
    await allure.tms(cu('z941abw5nm'), 'TC-LSH-03 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.findRow(day);
    expect(await list.cellValue(day, 'Breaks')).toBe('2');
    await list.search(bare);
    await list.expectRowVisible(bare);
    expect(await list.cellValue(bare, 'Breaks')).toMatch(/^(—|0|)$/);
  });

  test('TC-LSH-04 Gross and Paid minutes are computed', async ({ page }) => {
    await allure.tms(cu('z941abw5nn'), 'TC-LSH-04 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.findRow(day);
    expect(await list.cellValue(day, 'Gross minutes')).toMatch(minutes(540));
    expect(await list.cellValue(day, 'Paid minutes')).toMatch(minutes(510));
  });

  test('TC-LSH-05 A retired shift stays listed, marked Retired', async ({ page }) => {
    await allure.tms(cu('z941abw5np'), 'TC-LSH-05 (ClickUp)');
    const code = await createShift(page, { active: false });
    const list = new ShiftsListPage(page);
    await list.findRow(code);
    expect(await list.cellValue(code, 'Active')).toBe('Retired');
  });

  test('TC-LSH-06 Search by code, name or shift kind', async ({ page }) => {
    await allure.tms(cu('z941abw5nq'), 'TC-LSH-06 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    await test.step('By code', async () => {
      await list.search(night);
      await list.expectRowVisible(night);
    });
    await test.step('By name', async () => {
      await list.search(nameOf(day));
      await list.expectRowVisible(day);
    });
    await test.step('By shift kind', async () => {
      await list.search('night');
      await list.expectEveryRowMatches('night');
    });
  });

  test('TC-LSH-07 Filters panel applies and clears a rule', async ({ page }) => {
    await allure.tms(cu('z941abw5nr'), 'TC-LSH-07 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    const { total } = await list.showing();
    await list.openFilters();
    await list.addFilterRule('Shift code', night);
    await list.expectFiltersBadge(1);
    await list.expectRowVisible(night);
    await expect.poll(() => list.visibleRowCount()).toBe(1);
    await list.clearAllFilters();
    await list.expectNoFiltersBadge();
    await expect.poll(async () => (await list.showing()).total).toBe(total);
  });

  test('TC-LSH-08 Columns icon and view switch behave like every other list', async ({ page }) => {
    await allure.tms(cu('z941abw5nt'), 'TC-LSH-08 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    const { total } = await list.showing();
    await list.hideColumn('Order in day');
    await list.expectColumnHidden('Order in day');
    await list.resetColumns();
    await list.expectColumnVisible('Order in day');
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await list.switchView(view);
      await list.expectViewActive(view);
    }
    expect((await list.showing()).total).toBe(total);
  });

  test('TC-LSH-09 Row click opens a read-only detail; Edit is separate', async ({ page }) => {
    await allure.tms(cu('z941abw5nu'), 'TC-LSH-09 (ClickUp)');
    const list = new ShiftsListPage(page);
    const detail = new ShiftDetailPage(page);
    await list.findRow(day);
    await list.openRow(day);
    await detail.expectLoaded(day);
    await detail.expectReadOnlyView();
    for (const label of [
      'Shift kind',
      'Starts',
      'Ends',
      'Order in day',
      'Gross minutes',
      'Paid minutes',
      'Active',
    ])
      await detail.expectValue(label, /\S/);
    await detail.expectBreakCount(2);
    await detail.startEditing();
    await new ShiftFormPage(page).expectOnEditPage();
  });

  test('TC-LSH-10 "New shift" opens the create form as its own page', async ({ page }) => {
    await allure.tms(cu('z941abw5nv'), 'TC-LSH-10 (ClickUp)');
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    await list.openNew();
    await new ShiftFormPage(page).expectDedicatedCreatePage();
  });

  test('TC-LSH-11 A search that matches nothing has its own message', async ({ page }) => {
    await allure.tms(cu('z941abw5nw'), 'TC-LSH-11 (ClickUp)');
    // The zero-records half can't run on a shared environment.
    const list = new ShiftsListPage(page);
    await list.open();
    await list.expectLoaded();
    await list.search(`no-such-shift-${Date.now()}`);
    await list.expectNoMatchState();
  });

  test('TC-LSH-12 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abw5ny'), 'TC-LSH-12 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new ShiftsListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });

  // ── Create shift ──────────────────────────────────────────────────────

  test('TC-CSH-01 "New shift" has the full field set', async ({ page }) => {
    await allure.tms(cu('z941abw5nz'), 'TC-CSH-01 (ClickUp)');
    const form = new ShiftFormPage(page);
    await form.open();
    await form.expectDedicatedCreatePage();
    await form.expectFields();
  });

  test('TC-CSH-02 Block Create when a required field is empty', async ({ page }) => {
    await allure.tms(cu('z941abw5p0'), 'TC-CSH-02 (ClickUp)');
    const form = new ShiftFormPage(page);
    await form.open();
    expect(await form.create()).not.toBe('submitted');
    for (const field of ['name', 'shiftKind', 'starts', 'ends'] as const)
      await test.step(`${field} is flagged`, async () => {
        await form.expectFieldFlagged(field);
      });
    // Dev 2026-10-16: the code is generated on save, so it isn't required any more.
    await test.step('The code is generated, not required', async () => {
      await form.expectCodeGenerated();
    });
  });

  test('TC-CSH-03 Shift code must be unique', async ({ page }) => {
    await allure.tms(cu('z941abw5p1'), 'TC-CSH-03 (ClickUp)');
    // Dev 2026-10-16: the code is generated on save (SH-0001…) and can't be
    // typed, so a duplicate can't be entered. Checks what replaces the rule:
    // the code field is locked and each new shift gets its own code.
    const form = new ShiftFormPage(page);
    await form.open();
    await form.expectCodeGenerated();
    for (const code of [day, night, bare]) expect(code).toMatch(/^SH-\d+$/);
    expect(new Set([day, night, bare]).size, 'each shift gets its own code').toBe(3);
  });

  test("TC-CSH-04 Gross is derived and Paid isn't on the form", async ({ page }) => {
    await allure.tms(cu('z941abw5p3'), 'TC-CSH-04 (ClickUp)');
    const form = new ShiftFormPage(page);
    await form.open();
    await form.expectDerivedMinutesNotTypeable();
  });

  test('TC-CSH-05 A same-day shift is end minus start', async ({ page }) => {
    await allure.tms(cu('z941abw5p4'), 'TC-CSH-05 (ClickUp)');
    // `bare` is 08:00 → 12:00; `day` is 07:30 → 16:30.
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.expectValue('Gross minutes', minutes(540));
    await detail.open(bare);
    await detail.expectValue('Gross minutes', minutes(240));
  });

  test('TC-CSH-06 An overnight shift needs "Crosses midnight"', async ({ page }) => {
    await allure.tms(cu('z941abw5p5'), 'TC-CSH-06 (ClickUp)');
    // Sept: with the switch off, 22:00 → 06:00 reads -960 and Create is
    // blocked, so no negative shift is ever saved.
    const tag = uniqueTag('QA_SH');
    const form = new ShiftFormPage(page);
    await form.open();
    await form.fill({
      name: `QA-AUTO ${tag}`,
      kind: 'Standard',
      starts: '22:00',
      ends: '06:00',
    });
    await test.step('Switch off: a negative gross and no save', async () => {
      await form.fill({ crossesMidnight: false });
      expect(await form.grossValue()).toMatch(/^-/);
      expect(await form.create()).not.toBe('submitted');
    });
    await test.step('Switch on: 480 minutes and it saves', async () => {
      await form.fill({ crossesMidnight: true });
      expect(await form.grossValue()).toMatch(minutes(480));
      expect(await form.create()).toBe('submitted');
      const code = await new ShiftsListPage(page).codeOf(tag);
      trackCode('QA_SH', code);
      const detail = new ShiftDetailPage(page);
      await detail.open(code);
      await detail.expectValue('Gross minutes', minutes(480));
    });
  });

  test('TC-CSH-07 Paid minutes only subtract unpaid breaks', async ({ page }) => {
    await allure.tms(cu('z941abw5p6'), 'TC-CSH-07 (ClickUp)');
    await createShift(page);
    const detail = new ShiftDetailPage(page);
    await detail.expectValue('Paid minutes', minutes(540));
    await addBreak(page, { name: LUNCH });
    await addBreak(page, { name: TEA, starts: '10:00', ends: '10:10', paid: true });
    await page.reload();
    await detail.expectValue('Paid minutes', minutes(510));
  });

  test('TC-CSH-08 "Order in day" takes a plain number', async ({ page }) => {
    await allure.tms(cu('z941abw5p8'), 'TC-CSH-08 (ClickUp)');
    const code = await createShift(page, { orderInDay: '4' });
    const list = new ShiftsListPage(page);
    await list.findRow(code);
    expect(await list.cellValue(code, 'Order in day')).toBe('4');
  });

  test('TC-CSH-09 Cancel discards the form', async ({ page }) => {
    await allure.tms(cu('z941abw5p9'), 'TC-CSH-09 (ClickUp)');
    const tag = uniqueTag('QA_SH');
    const form = new ShiftFormPage(page);
    const list = new ShiftsListPage(page);
    await form.open();
    await form.fill({ name: `QA-AUTO ${tag}` });
    await form.cancel();
    await list.expectLoaded();
    await list.search(tag);
    await list.expectNoMatchState();
  });

  test('TC-CSH-10 Only a user with write permission can create a shift', async ({ personas }) => {
    await allure.tms(cu('z941abw5pa'), 'TC-CSH-10 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new ShiftsListPage(page);
      await list.open();
      await list.expectNewBlocked();
    });
  });

  // ── Edit shift ────────────────────────────────────────────────────────

  test('TC-ESH-01 Edit opens prefilled from the detail page', async ({ page }) => {
    await allure.tms(cu('z941abw5pb'), 'TC-ESH-01 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    const form = new ShiftFormPage(page);
    await detail.open(day);
    await detail.startEditing();
    await form.expectOnEditPage();
    await form.expectFields();
    expect(await form.grossValue()).toMatch(minutes(540));
  });

  test('TC-ESH-02 Shift code is read-only on Edit', async ({ page }) => {
    await allure.tms(cu('z941abw5pc'), 'TC-ESH-02 (ClickUp)');
    const form = new ShiftFormPage(page);
    await form.openEdit(day);
    await form.expectCodeLocked(day);
  });

  test('TC-ESH-03 Edits persist after Save changes', async ({ page }) => {
    await allure.tms(cu('z941abw5pd'), 'TC-ESH-03 (ClickUp)');
    const code = await createShift(page);
    const form = new ShiftFormPage(page);
    await form.openEdit(code);
    await form.fill({
      name: `QA-AUTO ${code} edited`,
      kind: 'Overtime',
      starts: '16:30',
      ends: '18:30',
      orderInDay: '3',
    });
    expect(await form.saveChanges()).toBe('submitted');
    const list = new ShiftsListPage(page);
    await list.findRow(code);
    expect(await list.valueRowOf(code)).toMatchObject({
      Name: `QA-AUTO ${code} edited`,
      'Shift kind': 'Overtime',
      Starts: '16:30',
      Ends: '18:30',
      'Order in day': '3',
    });
  });

  test('TC-ESH-04 Gross and Paid recompute after changing Ends', async ({ page }) => {
    await allure.tms(cu('z941abw5pe'), 'TC-ESH-04 (ClickUp)');
    const code = await createShift(page);
    await addBreak(page, { name: LUNCH });
    const form = new ShiftFormPage(page);
    await form.openEdit(code);
    await form.fill({ ends: '17:30' });
    expect(await form.saveChanges()).toBe('submitted');
    const detail = new ShiftDetailPage(page);
    await detail.open(code);
    await detail.expectValue('Gross minutes', minutes(600));
    await detail.expectValue('Paid minutes', minutes(570));
  });

  test('TC-ESH-05 Retiring a shift keeps it listed', async ({ page }) => {
    await allure.tms(cu('z941abw5pf'), 'TC-ESH-05 (ClickUp)');
    const code = await createShift(page);
    const form = new ShiftFormPage(page);
    await form.openEdit(code);
    await form.fill({ active: false });
    expect(await form.saveChanges()).toBe('submitted');
    const list = new ShiftsListPage(page);
    await list.findRow(code);
    expect(await list.cellValue(code, 'Active')).toBe('Retired');
  });

  test('TC-ESH-06 Cancel discards in-progress edits', async ({ page }) => {
    await allure.tms(cu('z941abw5pg'), 'TC-ESH-06 (ClickUp)');
    const form = new ShiftFormPage(page);
    const detail = new ShiftDetailPage(page);
    await form.openEdit(day);
    await form.fill({ name: 'QA-AUTO SHOULD NOT PERSIST', orderInDay: '9' });
    await form.cancel();
    await detail.open(day);
    await detail.expectValue('Order in day', '1');
  });

  test('TC-ESH-07 Only a user with write permission can save edits', async ({ personas }) => {
    await allure.tms(cu('z941abw5ph'), 'TC-ESH-07 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (page) => {
      const detail = new ShiftDetailPage(page);
      await detail.open(day);
      await detail.expectEditBlocked();
    });
  });

  // ── List breaks ───────────────────────────────────────────────────────

  test('TC-LBR-01 Breaks are scoped to their own shift', async ({ page }) => {
    await allure.tms(cu('z941abw5pj'), 'TC-LBR-01 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.expectBreakCount(2);
    expect((await detail.breakNames()).sort()).toEqual([LUNCH, TEA]);
    await detail.open(night);
    await detail.expectBreakCount(1);
    expect(await detail.breakNames()).toEqual([TEA]);
  });

  test('TC-LBR-02 Break columns match the spec', async ({ page }) => {
    await allure.tms(cu('z941abw5pk'), 'TC-LBR-02 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.expectBreakRow(LUNCH);
    await detail.expectBreakColumns();
  });

  test('TC-LBR-03 Length is derived from the break window', async ({ page }) => {
    await allure.tms(cu('z941abw5pm'), 'TC-LBR-03 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.expectBreakRow(LUNCH, { length: /\b30\b/ });
  });

  test('TC-LBR-04 A retired break stays listed', async ({ page }) => {
    await allure.tms(cu('z941abw5pn'), 'TC-LBR-04 (ClickUp)');
    await createShift(page);
    await addBreak(page, { name: LUNCH, active: false });
    await new ShiftDetailPage(page).expectBreakRow(LUNCH, { active: 'Retired' });
  });

  test('TC-LBR-05 Break search stays inside one shift', async ({ page }) => {
    await allure.tms(cu('z941abw5pp'), 'TC-LBR-05 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.searchBreaks('tea');
    await expect.poll(() => detail.breakNames()).toEqual([TEA]);
  });

  test('TC-LBR-06 "New break" opens in place on the shift page', async ({ page }) => {
    await allure.tms(cu('z941abw5pq'), 'TC-LBR-06 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    const url = page.url();
    await detail.openNewBreak();
    await detail.expectBreakFormOpen('New', day);
    expect(page.url()).toBe(url);
  });

  test("TC-LBR-07 A shift's breaks need Shifts read access", async ({ personas }) => {
    await allure.tms(cu('z941abw5pr'), 'TC-LBR-07 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      await new ShiftDetailPage(page).openExpectingRestricted(day);
    });
  });

  // ── Create break ──────────────────────────────────────────────────────

  test('TC-CBR-01 "New break" has the expected fields, URL unchanged', async ({ page }) => {
    await allure.tms(cu('z941abw5pt'), 'TC-CBR-01 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    const url = page.url();
    await detail.openNewBreak();
    await detail.expectBreakFields();
    expect(page.url()).toBe(url);
  });

  test('TC-CBR-02 Break, Starts and Ends are required', async ({ page }) => {
    await allure.tms(cu('z941abw5pu'), 'TC-CBR-02 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.openNewBreak();
    expect(await detail.createBreak()).not.toBe('submitted');
    for (const field of ['breakName', 'starts', 'ends'] as const)
      await test.step(`${field} is flagged`, async () => {
        await detail.expectBreakFieldFlagged(field);
      });
  });

  test('TC-CBR-03 A break name is unique within its shift, not across shifts', async ({ page }) => {
    await allure.tms(cu('z941abw5pv'), 'TC-CBR-03 (ClickUp)');
    await allure.tms(cu('z941abw5tt'), 'TC-CBR-03 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abw5tt (2026-09-23): a duplicate name in
    // one shift was accepted. On dev 2026-10-13 it's refused ("This shift
    // already has a break named …"); the ClickUp status is left to the user.
    const detail = new ShiftDetailPage(page);
    await test.step('"QA-AUTO Tea" again in the same shift is refused', async () => {
      await detail.open(day);
      await detail.openNewBreak();
      await detail.fillBreak({ name: TEA, starts: '14:00', ends: '14:10' });
      expect(await detail.createBreak()).not.toBe('submitted');
      await detail.expectBreakNameError(`This shift already has a break named "${TEA}"`);
    });
    await test.step('Both shifts hold a "QA-AUTO Tea" of their own', async () => {
      await detail.open(night);
      await detail.expectBreakRow(TEA);
    });
  });

  test('TC-CBR-04 "Falls after midnight" places a break inside a night shift', async ({ page }) => {
    await allure.tms(cu('z941abw5pw'), 'TC-CBR-04 (ClickUp)');
    await createShift(page, {
      kind: 'Night',
      starts: '22:00',
      ends: '06:00',
      crossesMidnight: true,
    });
    await addBreak(page, {
      name: 'QA-AUTO Night meal',
      starts: '01:30',
      ends: '02:00',
      fallsAfterMidnight: true,
    });
    await new ShiftDetailPage(page).expectBreakRow('QA-AUTO Night meal', { length: /\b30\b/ });
  });

  test('TC-CBR-05 Length is derived on the form, never typed', async ({ page }) => {
    await allure.tms(cu('z941abw5px'), 'TC-CBR-05 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.openNewBreak();
    await detail.fillBreak({ starts: '15:00', ends: '15:30' });
    await detail.expectBreakFields();
    expect(await detail.lengthValue()).toMatch(minutes(30));
  });

  test("TC-CBR-06 Unpaid breaks reduce Paid minutes; paid ones don't", async ({ page }) => {
    await allure.tms(cu('z941abw5py'), 'TC-CBR-06 (ClickUp)');
    await createShift(page);
    const detail = new ShiftDetailPage(page);
    await addBreak(page, { name: LUNCH });
    await page.reload();
    await detail.expectValue('Paid minutes', minutes(510));
    await addBreak(page, { name: TEA, starts: '10:00', ends: '10:10', paid: true });
    await page.reload();
    await detail.expectValue('Paid minutes', minutes(510));
  });

  test('TC-CBR-07 Cancel adds no break', async ({ page }) => {
    await allure.tms(cu('z941abw5pz'), 'TC-CBR-07 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.openNewBreak();
    await detail.fillBreak({ name: 'QA-AUTO cancelled', starts: '14:00', ends: '14:10' });
    await detail.cancelBreak();
    await page.reload();
    await detail.expectLoaded(day);
    await detail.expectBreakCount(2);
    await detail.expectNoBreakRow('QA-AUTO cancelled');
  });

  test('TC-CBR-08 Only a user with write permission can add a break', async ({
    page,
    personas,
  }) => {
    await allure.tms(cu('z941abw5q0'), 'TC-CBR-08 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    const attempted = 'QA-AUTO read-only break';
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new ShiftDetailPage(roPage);
      await detail.open(day);
      // If "New break" is usable for a read-only user, the create must be refused.
      if (await detail.isNewBreakAvailable()) {
        await detail.openNewBreak();
        await detail.fillBreak({ name: attempted, starts: '14:00', ends: '14:10' });
        await detail.createBreak();
      }
    });
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.expectBreakRow(LUNCH);
    await detail.expectNoBreakRow(attempted);
  });

  // ── Edit break ────────────────────────────────────────────────────────

  test('TC-EBR-01 A break opens for editing', async ({ page }) => {
    await allure.tms(cu('z941abw5q1'), 'TC-EBR-01 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.openBreakEdit(LUNCH);
    await detail.expectBreakFormOpen('Edit', day);
    await detail.expectBreakFields();
  });

  test('TC-EBR-02 Break edits persist', async ({ page }) => {
    await allure.tms(cu('z941abw5q2'), 'TC-EBR-02 (ClickUp)');
    await createShift(page);
    await addBreak(page, { name: LUNCH });
    const detail = new ShiftDetailPage(page);
    await detail.openBreakEdit(LUNCH);
    await detail.fillBreak({ starts: '13:00', ends: '13:45', paid: true, active: false });
    expect(await detail.saveBreak()).toBe('submitted');
    await page.reload();
    await detail.expectBreakRow(LUNCH, {
      starts: '13:00',
      ends: '13:45',
      length: /\b45\b/,
      paid: 'Paid',
      active: 'Retired',
    });
  });

  test('TC-EBR-03 Changing a break window recomputes Paid minutes', async ({ page }) => {
    await allure.tms(cu('z941abw5q3'), 'TC-EBR-03 (ClickUp)');
    await createShift(page);
    await addBreak(page, { name: LUNCH });
    const detail = new ShiftDetailPage(page);
    await detail.openBreakEdit(LUNCH);
    await detail.fillBreak({ ends: '13:00' });
    expect(await detail.saveBreak()).toBe('submitted');
    await page.reload();
    await detail.expectValue('Paid minutes', minutes(480));
  });

  test('TC-EBR-04 Retiring a break restores Paid minutes but keeps it listed', async ({ page }) => {
    await allure.tms(cu('z941abw5q8'), 'TC-EBR-04 (ClickUp)');
    await createShift(page);
    await addBreak(page, { name: LUNCH });
    const detail = new ShiftDetailPage(page);
    await detail.openBreakEdit(LUNCH);
    await detail.fillBreak({ active: false });
    expect(await detail.saveBreak()).toBe('submitted');
    await page.reload();
    await detail.expectValue('Paid minutes', minutes(540));
    await detail.expectBreakRow(LUNCH, { active: 'Retired' });
  });

  test('TC-EBR-05 Cancel discards in-progress break edits', async ({ page }) => {
    await allure.tms(cu('z941abw5q9'), 'TC-EBR-05 (ClickUp)');
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.openBreakEdit(LUNCH);
    await detail.fillBreak({ name: 'QA-AUTO SHOULD NOT PERSIST', paid: true });
    await detail.cancelBreak();
    await page.reload();
    await detail.expectLoaded(day);
    await detail.expectBreakRow(LUNCH, { paid: 'Unpaid' });
  });

  test('TC-EBR-06 Only a user with write permission can save break edits', async ({
    page,
    personas,
  }) => {
    await allure.tms(cu('z941abw5qa'), 'TC-EBR-06 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const detail = new ShiftDetailPage(roPage);
      await detail.open(day);
      // If the row's Edit is usable for a read-only user, the save must be refused.
      if (await detail.isBreakEditAvailable(LUNCH)) {
        await detail.openBreakEdit(LUNCH);
        await detail.fillBreak({ paid: true });
        await detail.saveBreak();
      }
    });
    const detail = new ShiftDetailPage(page);
    await detail.open(day);
    await detail.expectBreakRow(LUNCH, { paid: 'Unpaid' });
  });
});
