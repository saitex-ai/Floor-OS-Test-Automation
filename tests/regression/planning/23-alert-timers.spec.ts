import { randomUUID } from 'node:crypto';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { env } from '../../../src/config/env';
import {
  AlertTimersListPage,
  SORT_PARAM,
  sortKey,
  type SortColumn,
} from '../../../src/pages/planning/alert-timers-list.page';
import { AlertTimerDetailPage } from '../../../src/pages/planning/alert-timer-detail.page';
import {
  AlertTimerFormPage,
  cadenceLabel,
  sectionLabelsOf,
  WEEKDAY_NAMES,
  type FoundCandidate,
} from '../../../src/pages/planning/alert-timer-form.page';
import {
  AlertTimersNetwork,
  type AlertTimerRow,
  type CandidateStatus,
} from '../../../src/pages/planning/alert-timers-network';
import { asPersona, personaCredentials, personaSkipReason, setupPage } from './support/test-data';

/**
 * Planning — Alert timers (List / Details / New / Edit) at
 * /planning/master-data/alert-timers.
 *
 * Source of truth for these cases: test-cases/planning/alert-timers.md
 * (ClickUp "Planning -Sprint -4 - Alert Timer", TC-LAT / VAT / CAT / EAT).
 *
 * Test data: none is created. A timer belongs to a seeded user, has no
 * free-text field a QA-AUTO marker could go in, and can't be deleted, so a
 * real save would permanently change a seeded user's timer. Every case
 * starts with `net.guardWrites()`: each POST / PUT is aborted unless the
 * case answers it itself (a simulated server answer, or — TC-EAT-07 — sent
 * on to an id with no timer so the real server's 404 runs). The forms,
 * lists and details are the real screens on real data; where a case needs a
 * state the environment can't produce on demand (directory outage, a
 * warning, a race), one response is rewritten, and the case says so.
 *
 * Records are picked from what the environment has (beforeAll): saved
 * timers by cadence / state, and one Employee-picker candidate per status.
 * A case that needs a record the environment lacks skips with the reason
 * (uat, 2026-11-17: no saved timers; the picker offers only the write-permission login, as
 * "No Planning access", and one employee without an account).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const ENV = env.testEnv;

const noTimer = (what: string) =>
  `${ENV} has no saved alert timer ${what} (GET /api/planning/digest-templates) — the case needs one.`;
const noCandidate = (status: CandidateStatus) =>
  `${ENV}'s Employee picker offers no "${status}" person — the case needs one.`;

test.describe('Planning - Alert Timers', () => {
  let timers: AlertTimerRow[] = [];
  let candidates = new Map<CandidateStatus, FoundCandidate>();

  /** Timers that are On, with a username and no account warning (a plain record to work on). */
  const enabled = () => timers.filter((t) => t.isEnabled && t.username && t.warnings.length === 0);
  const firstWhere = (fn: (t: AlertTimerRow) => boolean) => timers.find((t) => t.username && fn(t));

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const page = await setupPage(browser);
    const net = new AlertTimersNetwork(page);
    await net.guardWrites();
    const list = new AlertTimersListPage(page);
    await list.open();
    await list.expectLoaded();
    timers = await net.timers();
    const form = new AlertTimerFormPage(page);
    await form.openNew();
    candidates = await form.scanCandidates(net);
    await page.close();
  });

  let net: AlertTimersNetwork;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await allure.epic('Planning');
    await allure.feature('Alert Timers');
    await allure.owner('Planning QA');
    net = new AlertTimersNetwork(page);
    await net.guardWrites();
  });

  /** Opens New and picks the `status` candidate found in beforeAll (skips when there is none). */
  async function newFormWith(
    form: AlertTimerFormPage,
    status: CandidateStatus,
  ): Promise<FoundCandidate> {
    const found = candidates.get(status);
    test.skip(!found, noCandidate(status));
    await form.openNew();
    await form.pickFound(net, found!);
    return found!;
  }

  // ── List ──────────────────────────────────────────────────────────────

  test(`TC-LAT-01 "Alert timers" tile appears under Planning Master Data's Organisation category`, async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5e'), 'TC-LAT-01 (ClickUp)');
    await list.openHub();
    await list.expectHubTile();
    await list.openFromHubTile();
  });

  test('TC-LAT-02 Tile/route hidden without planning:digest:read', async ({ personas }) => {
    await allure.tms(cu('z941abxy5h'), 'TC-LAT-02 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new AlertTimersListPage(page);
      await list.gotoAsOutsider('hub');
      await list.expectNoHubTile();
      await list.gotoAsOutsider('list');
      await list.expectAccessRestricted();
    });
  });

  test('TC-LAT-03 List shows saved timers only', async ({ alertTimersListPage: list }) => {
    await allure.tms(cu('z941abxy5j'), 'TC-LAT-03 (ClickUp)');
    const ready = candidates.get('ready')?.candidate;
    test.skip(!ready, noCandidate('ready'));
    // A "ready" person has Planning access and no timer: no row at all, in any tab.
    await list.open();
    await list.expectLoaded();
    expect((await net.timers()).map((t) => t.userId)).not.toContain(ready!.userId);
    await list.search(ready!.username!);
    await net.listResponseWith('search', ready!.username!);
    await list.expectTabCountsAddUp(['Real time', 'Daily', 'Weekly', 'Off']);
    expect(await list.tabCount('All'), `${ready!.username} in no tab`).toBe(0);
  });

  test('TC-LAT-04 Count cards/tabs are All, Real time, Daily, Weekly, Off — no "Not set"', async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5k'), 'TC-LAT-04 (ClickUp)');
    await list.open();
    await list.expectLoaded();
    await list.expectTabsExactly(['All', 'Real time', 'Daily', 'Weekly', 'Off']);
    await list.expectCountCards(['Real time', 'Daily', 'Weekly', 'Off']);
  });

  test('TC-LAT-05 Tab counts sum to All, and an Off row counts once', async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5m'), 'TC-LAT-05 (ClickUp)');
    await list.open();
    await list.expectLoaded();
    await list.expectTabCountsAddUp(['Real time', 'Daily', 'Weekly', 'Off']);
    const off = firstWhere((t) => !t.isEnabled);
    // The sum is checked above; only the "counts once" half needs an Off timer.
    test.skip(!off, `Sum checked; "counts once" half skipped — ${noTimer('that is Off')}`);
    // The Off row keeps its stored cadence, but is counted (and listed) only under Off.
    await list.search(off!.username!);
    await net.listResponseWith('search', off!.username!);
    await list.expectTabCountsAddUp(['Real time', 'Daily', 'Weekly', 'Off']);
    await list.selectTab('Off');
    await list.expectRowShown(off!.username!);
    await list.selectTab(cadenceLabel(off!.cadence));
    await list.expectRowNotShown(off!.username!);
  });

  test('TC-LAT-06 Columns and their content', async ({ alertTimersListPage: list }) => {
    await allure.tms(cu('z941abxy5n'), 'TC-LAT-06 (ClickUp)');
    test.skip(timers.length === 0, noTimer('to show'));
    await list.open();
    await list.expectLoaded();
    await list.expectColumnHeaders([
      'User',
      'Group',
      'Alert timer',
      'Sections',
      'Channels',
      'Email',
      'Last saved',
    ]);
    await list.expectRowsMatch(await net.timers());
    await list.expectUsernameMonospace(timers[0]!.username!);
  });

  test('TC-LAT-07 Warning icon/indicator for a disabled account', async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5p'), 'TC-LAT-07 (ClickUp)');
    const disabled = firstWhere((t) => t.warnings.includes('account_disabled'));
    test.skip(!disabled, noTimer('for a disabled account'));
    await list.open();
    await list.expectRowsLoaded();
    await list.expectDisabledBadge(disabled!.username!);
  });

  test('TC-LAT-08 Row click opens Details; no per-row Edit', async ({
    alertTimersListPage: list,
    alertTimerDetailPage: detail,
  }) => {
    await allure.tms(cu('z941abxy5q'), 'TC-LAT-08 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to open'));
    await list.open();
    await list.expectRowsLoaded();
    await list.expectNoRowEdit(row!.username!);
    await list.openTimer(row!);
    await detail.expectOnDetails(row!.userId);
  });

  test('TC-LAT-09 "New alert timer" only shown with write permission', async ({
    personas,
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5r'), 'TC-LAT-09 (ClickUp)');
    await list.open();
    await list.expectNewAvailable();
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const roList = new AlertTimersListPage(roPage);
      await roList.open();
      await roList.expectLoaded();
      await roList.expectNoNewButton();
    });
  });

  test('TC-LAT-10 Directory-degraded banner and fallback display', async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5t'), 'TC-LAT-10 (ClickUp)');
    test.skip(timers.length === 0, noTimer('to show'));
    // Simulated: the list response is rewritten to the directory-down shape.
    net.degradeDirectory();
    await list.open();
    await list.expectDegraded(timers);
  });

  test('TC-LAT-11 Search matches username, display name, email, or group', async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5u'), 'TC-LAT-11 (ClickUp)');
    const row = firstWhere((t) => !!(t.displayName && t.email && t.groups.length));
    test.skip(!row, noTimer('with a name, email and group'));
    await list.open();
    await list.expectRowsLoaded();
    await list.expectSearchPlaceholder('Search by user, name, email or group');
    for (const term of [row!.username!, row!.displayName!, row!.email!]) {
      await test.step(`Search "${term}"`, async () => {
        await list.search(term);
        await net.listResponseWith('search', term);
        await list.expectRowShown(row!.username!);
      });
    }
    const group = row!.groups[0]!.label;
    await test.step(`Search group "${group}"`, async () => {
      await list.search(group);
      const found = await net.listResponseWith('search', group);
      const members = timers.filter((t) => t.username && t.groups.some((g) => g.label === group));
      expect(found.map((t) => t.userId)).toEqual(
        expect.arrayContaining(members.map((t) => t.userId)),
      );
      for (const m of members.slice(0, 5)) await list.expectRowShown(m.username!);
    });
  });

  test('TC-LAT-12 Column sort (User/Group/Alert timer/Last saved)', async ({
    alertTimersListPage: list,
  }) => {
    await allure.tms(cu('z941abxy5v'), 'TC-LAT-12 (ClickUp)');
    test.skip(timers.length < 2, noTimer('pair to sort'));
    await list.open();
    await list.expectRowsLoaded();
    const groupOrder = await net.groupOrder();
    for (const column of ['User', 'Group', 'Alert timer', 'Last saved'] as SortColumn[]) {
      await test.step(`Sort by ${column}`, async () => {
        for (const dir of ['asc', 'desc'] as const) {
          await list.sortBy(column);
          const rows = await net.listResponseWithParams({
            sortBy: SORT_PARAM[column],
            sortDir: dir,
          });
          const keys = rows.map((r) => sortKey(column, r, groupOrder));
          const ordered = [...keys].sort((a, b) =>
            typeof a === 'number' && typeof b === 'number'
              ? a - b
              : String(a).localeCompare(String(b)),
          );
          expect(keys, `${column} ${dir}`).toEqual(dir === 'asc' ? ordered : ordered.reverse());
          await list.expectRenderedOrder(rows);
        }
      });
    }
  });

  // ── Details ───────────────────────────────────────────────────────────

  test('TC-VAT-01 Read-only detail content, Daily cadence', async ({
    alertTimerDetailPage: detail,
  }) => {
    await allure.tms(cu('z941abxy5w'), 'TC-VAT-01 (ClickUp)');
    const daily = firstWhere((t) => t.isEnabled && t.cadence === 'daily');
    test.skip(!daily, noTimer('on Daily'));
    await detail.open(daily!.userId);
    await detail.expectShows(daily!);
    await detail.expectNextSendScheduled(daily!);
    await detail.expectDeliveryNote('Alerts are bundled into one digest at the time you choose.');
  });

  test('TC-VAT-02 "Next send" for Real time', async ({ alertTimerDetailPage: detail }) => {
    await allure.tms(cu('z941abxy5x'), 'TC-VAT-02 (ClickUp)');
    const realTime = firstWhere((t) => t.isEnabled && t.cadence === 'real_time');
    test.skip(!realTime, noTimer('on Real time'));
    await detail.open(realTime!.userId);
    await detail.expectShows(realTime!);
    await detail.expectNextSend('Sent as alerts are raised');
    await detail.expectSectionsNote('Real time sends alerts from these sections only');
  });

  test('TC-VAT-03 Read-only detail content, Off', async ({ alertTimerDetailPage: detail }) => {
    await allure.tms(cu('z941abxy5y'), 'TC-VAT-03 (ClickUp)');
    const off = firstWhere((t) => !t.isEnabled);
    test.skip(!off, noTimer('that is Off'));
    await detail.open(off!.userId);
    // expectShows also checks the retained sections and channels are still listed.
    await detail.expectShows(off!);
    await detail.expectNextSend('Off');
    await detail.expectDeliveryNote('This timer is off. Alerts stay in the in-app inbox.');
    await detail.expectSectionsNote('The timer is off, so nothing is sent from these sections.');
  });

  test('TC-VAT-04 Edit action only with write permission', async ({
    personas,
    alertTimerDetailPage: detail,
  }) => {
    await allure.tms(cu('z941abxy5z'), 'TC-VAT-04 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to open'));
    await detail.open(row!.userId);
    await detail.expectLoaded();
    await detail.openEdit(row!.userId);
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const roDetail = new AlertTimerDetailPage(roPage);
      await roDetail.open(row!.userId);
      await roDetail.expectNoEditAction();
    });
  });

  test('TC-VAT-05 email_missing warning banner', async ({ alertTimerDetailPage: detail }) => {
    await allure.tms(cu('z941abxy61'), 'TC-VAT-05 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to open'));
    // Simulated: no seeded timer carries this warning; it's added to the real response.
    net.addWarnings(row!.userId, ['email_missing']);
    await detail.open(row!.userId);
    await detail.expectWarning(
      'This person has no email address any more. Alerts go to their in-app inbox instead.',
    );
  });

  test('TC-VAT-06 no_planning_access warning banner', async ({ alertTimerDetailPage: detail }) => {
    await allure.tms(cu('z941abxy62'), 'TC-VAT-06 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to open'));
    // Simulated: no seeded timer carries this warning; it's added to the real response.
    net.addWarnings(row!.userId, ['no_planning_access']);
    await detail.open(row!.userId);
    await detail.expectWarning(
      'This person no longer has Planning access. Nothing is sent until IT support restores it.',
    );
    await detail.expectAccountStatus('No Planning access');
  });

  test('TC-VAT-07 account_disabled warning banner', async ({ alertTimerDetailPage: detail }) => {
    await allure.tms(cu('z941abxy63'), 'TC-VAT-07 (ClickUp)');
    // Agreed on review (2026-10-05): the build, like the prototype, has no banner for a
    // disabled account — a "Disabled" badge and "Account status: Disabled" instead.
    const disabled = firstWhere((t) => t.warnings.includes('account_disabled'));
    test.skip(!disabled, noTimer('for a disabled account'));
    await detail.open(disabled!.userId);
    await detail.expectLoaded();
    await detail.expectHeaderBadge('Disabled');
    await detail.expectAccountStatus('Disabled');
    await detail.expectNoWarning();
  });

  test('TC-VAT-08 404 for a person with no timer', async ({ alertTimerDetailPage: detail }) => {
    await allure.tms(cu('z941abxy64'), 'TC-VAT-08 (ClickUp)');
    await detail.open(randomUUID());
    await detail.expectNoTimerMessage();
  });

  test('TC-VAT-09 Details is fail-soft when the directory is down', async ({
    alertTimerDetailPage: detail,
  }) => {
    await allure.tms(cu('z941abxy65'), 'TC-VAT-09 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to open'));
    // Simulated: the details response is rewritten to the directory-down shape.
    net.degradeDirectory();
    await detail.open(row!.userId);
    await detail.expectDegraded(row!);
  });

  // ── New ───────────────────────────────────────────────────────────────

  test('TC-CAT-01 Employee dropdown: minimum length', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy66'), 'TC-CAT-01 (ClickUp)');
    await form.openNew();
    await form.openPicker();
    const opening = await net.candidates('');
    test.skip(opening.length === 0, `${ENV}'s Employee picker offers nobody at all.`);
    const term = opening[0]!.name.slice(0, 2).toLowerCase();
    await test.step(`One character ("${term[0]}") doesn't search`, async () => {
      await form.searchPicker(term[0]!);
      await net.expectNoCandidateSearch(term[0]!);
      await form.expectOptionsDescribe(opening);
    });
    await test.step(`Two characters ("${term}") search`, async () => {
      await form.searchPicker(term);
      const rows = await net.candidates(term);
      expect(rows.length, `"${term}" finds ${opening[0]!.name}`).toBeGreaterThan(0);
      await form.expectOptionsDescribe(rows);
    });
  });

  test('TC-CAT-02 Candidate option content', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy67'), 'TC-CAT-02 (ClickUp)');
    await form.openNew();
    await form.openPicker();
    const opening = await net.candidates('');
    test.skip(opening.length === 0, `${ENV}'s Employee picker offers nobody at all.`);
    await form.expectOptionsDescribe(opening);
    const term = opening[0]!.name.slice(0, 2).toLowerCase();
    await form.searchPicker(term);
    await form.expectOptionsDescribe(await net.candidates(term));
  });

  test('TC-CAT-03 Picking a ready candidate enables the form', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy68'), 'TC-CAT-03 (ClickUp)');
    const found = await newFormWith(form, 'ready');
    await form.expectReadyPerson(found.candidate);
  });

  test('TC-CAT-04 Picking an already_set candidate', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy69'), 'TC-CAT-04 (ClickUp)');
    const found = await newFormWith(form, 'already_set');
    await form.expectAlreadySetPerson(found.candidate);
  });

  test('TC-CAT-05 Picking an account_disabled candidate', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6a'), 'TC-CAT-05 (ClickUp)');
    await newFormWith(form, 'account_disabled');
    await form.expectBlockedPerson(
      'Account disabled',
      "This person's sign-in account is disabled. Ask IT support to enable it before adding an alert timer.",
    );
  });

  test('TC-CAT-06 Picking a no_planning_access candidate', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6b'), 'TC-CAT-06 (ClickUp)');
    await newFormWith(form, 'no_planning_access');
    await form.expectBlockedPerson(
      'No Planning access',
      'This person can sign in but has no Planning role. Ask IT support to add them to a Planning group.',
    );
    await form.expectNoPersonFacts();
  });

  test('TC-CAT-07 Picking a no_account candidate', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6c'), 'TC-CAT-07 (ClickUp)');
    await newFormWith(form, 'no_account');
    await form.expectBlockedPerson(
      'No sign-in account',
      'This person has no sign-in account. Ask IT support to create one and link it to their employee record.',
    );
  });

  test('TC-CAT-08 Candidate search failure is not fail-soft', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6d'), 'TC-CAT-08 (ClickUp)');
    // Simulated: candidate searches answer 503 DIRECTORY_UNAVAILABLE.
    net.failCandidateSearches();
    await form.openNew();
    await form.openPicker();
    await form.searchPicker('te');
    await form.expectAlert("Could not check this person's access right now. Try again.");
    await form.expectOptionCount(0);
  });

  test('TC-CAT-09 Search below minimum length', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6e'), 'TC-CAT-09 (ClickUp)');
    await form.openNew();
    await form.openPicker();
    const opening = await net.candidates('');
    await form.searchPicker('a');
    await net.expectNoCandidateSearch('a');
    // The list isn't narrowed to one-letter matches: it's still the opening list.
    await form.expectOptionsDescribe(opening);
  });

  test('TC-CAT-10 Delivery segmented control', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6f'), 'TC-CAT-10 (ClickUp)');
    await newFormWith(form, 'ready');
    await form.expectCadence('Real time');
    for (const cadence of ['Daily', 'Weekly', 'Real time'] as const)
      await form.chooseCadence(cadence);
  });

  test('TC-CAT-11 "Turn off" link and its label flip, values retained', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6g'), 'TC-CAT-11 (ClickUp)');
    await newFormWith(form, 'ready');
    await form.fill({
      cadence: 'Weekly',
      weekday: 'Wednesday',
      time: '09:15',
      sections: ['Capacity', 'Prep completion'],
      channels: ['In-app'],
    });
    const before = await form.state();
    await form.turnOff();
    await form.turnBackOn();
    expect(await form.state()).toEqual(before);
  });

  test('TC-CAT-12 When fields shown per cadence', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6h'), 'TC-CAT-12 (ClickUp)');
    await newFormWith(form, 'ready');
    for (const cadence of ['Real time', 'Daily', 'Weekly'] as const) {
      await form.chooseCadence(cadence);
      await form.expectWhenFieldsFor(cadence);
    }
  });

  test('TC-CAT-13 Time select only offers the 15-minute grid', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6j'), 'TC-CAT-13 (ClickUp)');
    await newFormWith(form, 'ready');
    await form.chooseCadence('Daily');
    const grid = Array.from({ length: 96 }, (_, i) => {
      const h = String(Math.floor(i / 4)).padStart(2, '0');
      return `${h}:${String((i % 4) * 15).padStart(2, '0')}`;
    });
    expect(await form.timeOptions()).toEqual(grid);
  });

  test('TC-CAT-14 Unticking the last channel is refused', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6k'), 'TC-CAT-14 (ClickUp)');
    await newFormWith(form, 'ready');
    await form.tryToUntickLastChannel();
  });

  test('TC-CAT-15 Email channel disabled when the principal has no email', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6m'), 'TC-CAT-15 (ClickUp)');
    const ready = candidates.get('ready')?.candidate;
    test.skip(!ready, noCandidate('ready'));
    // Simulated: the ready person comes back from the directory with no email.
    net.dropCandidateEmail(ready!.userId!);
    await newFormWith(form, 'ready');
    await form.expectEmailChannelUnavailable();
  });

  test('TC-CAT-16 Sections required for every cadence, including Real time', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6n'), 'TC-CAT-16 (ClickUp)');
    await newFormWith(form, 'ready');
    await form.expectCadence('Real time');
    await form.untickEverySection();
  });

  test('TC-CAT-17 Sections reordering', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6p'), 'TC-CAT-17 (ClickUp)');
    // Agreed on review (2026-10-05): like the prototype, sections keep one fixed order and
    // can't be reordered — the LLD's drag / arrow reordering was never built.
    await newFormWith(form, 'ready');
    await form.setSection('Prep completion', true);
    await form.setSection('Delivery risks', true);
    await form.expectSectionsInFixedOrder();
  });

  test('TC-CAT-18 Save label on New', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6q'), 'TC-CAT-18 (ClickUp)');
    await newFormWith(form, 'ready');
    await form.expectSubmitLabel('Add alert timer');
  });

  test('TC-CAT-19 Happy path: create a Real time timer', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6r'), 'TC-CAT-19 (ClickUp)');
    const { candidate } = await newFormWith(form, 'ready');
    await form.fill({ cadence: 'Real time', sections: ['Capacity'], channels: ['In-app'] });
    // The server's answer is simulated (no real timer is created — see the file comment).
    net.answerSaveAsSaved({
      userId: candidate.userId!,
      username: candidate.username,
      displayName: candidate.name,
      email: candidate.email,
      groups: [],
    });
    const sent = await form.submit(net);
    expect(sent.method).toBe('POST');
    expect(sent.body).toEqual({
      userId: candidate.userId,
      cadence: 'real_time',
      sendAt: null,
      sendWeekday: null,
      timezone: expect.any(String),
      sections: ['capacity'],
      channels: ['in_app'],
      isEnabled: true,
    });
    await form.expectToast('Alert timer added.');
    await form.expectOnList();
  });

  test('TC-CAT-20 Happy path: create a Weekly timer', async ({
    alertTimerFormPage: form,
    alertTimerDetailPage: detail,
  }) => {
    await allure.tms(cu('z941abxy6t'), 'TC-CAT-20 (ClickUp)');
    const { candidate } = await newFormWith(form, 'ready');
    await form.fill({
      cadence: 'Weekly',
      weekday: 'Wednesday',
      time: '09:15',
      sections: ['Delivery risks', 'Date slips'],
      channels: ['In-app', 'Email'],
    });
    // The server's answer is simulated, and the saved timer is served back to Details.
    net.answerSaveAsSaved({
      userId: candidate.userId!,
      username: candidate.username,
      displayName: candidate.name,
      email: candidate.email,
      groups: [],
    });
    const sent = await form.submit(net);
    expect(sent.body).toMatchObject({
      userId: candidate.userId,
      cadence: 'weekly',
      sendWeekday: WEEKDAY_NAMES.indexOf('Wednesday') + 1,
      sendAt: '09:15',
      sections: ['risks', 'slips'],
      channels: ['in_app', 'email'],
      isEnabled: true,
    });
    await form.expectToast('Alert timer added.');
    await form.expectOnList();
    await detail.open(candidate.userId!);
    await detail.expectShows(net.lastSaved!);
    // "Next send" comes from the server (nextSendAt), so a simulated save can't show it:
    // check the next occurrence on a real Weekly timer instead.
    const weekly = firstWhere((t) => t.isEnabled && t.cadence === 'weekly');
    test.skip(!weekly, `Create path checked; "Next send" half skipped — ${noTimer('on Weekly')}`);
    await test.step(`Next send of ${weekly!.username}'s real Weekly timer`, async () => {
      await detail.open(weekly!.userId);
      await detail.expectNextSendScheduled(weekly!);
    });
  });

  test('TC-CAT-21 409 ALREADY_EXISTS race', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6u'), 'TC-CAT-21 (ClickUp)');
    const other = enabled()[0];
    test.skip(!other, noTimer('to land on'));
    await newFormWith(form, 'ready');
    // Simulated: another admin's timer for this person won the race (the server's 409 names it).
    net.answerSaveWithError(409, {
      code: 'ALREADY_EXISTS',
      message: 'This person already has an alert timer.',
      existing: { userId: other!.userId },
    });
    await form.submit(net);
    await form.expectAddedElsewhereNotice(other!.userId);
  });

  test('TC-CAT-23 503 on save shows a retry-worthy message', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6v'), 'TC-CAT-23 (ClickUp)');
    await newFormWith(form, 'ready');
    // Simulated: the directory is down when the save checks access.
    net.answerSaveWithError(503, {
      code: 'DIRECTORY_UNAVAILABLE',
      message: 'The directory is unavailable.',
    });
    await form.submit(net);
    await form.expectAlert("Could not check this person's access right now. Try again.");
    await form.expectStillOnNew();
  });

  test('TC-CAT-24 Loading states', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6w'), 'TC-CAT-24 (ClickUp)');
    // The lookups response is held back 3 s to see the loading state.
    net.delayLookups(3_000);
    await form.gotoNew();
    await form.expectLoadingSkeleton();
    await form.expectNewReady();
  });

  test('TC-CAT-25 NO_PLANNING_ACCESS re-checked at save, not just at pick time', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy6x'), 'TC-CAT-25 (ClickUp)');
    await newFormWith(form, 'ready');
    // Simulated: the person lost their Planning role after being picked; the save is refused.
    net.answerSaveWithError(403, {
      code: 'NO_PLANNING_ACCESS',
      message: 'This person has no Planning access.',
    });
    await form.submit(net);
    await form.expectToast('This person has no Planning access.');
    await form.expectStillOnNew();
    await form.expectNoToast('Alert timer added.');
  });

  // ── Edit ──────────────────────────────────────────────────────────────

  test('TC-EAT-01 No Employee dropdown on Edit', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6y'), 'TC-EAT-01 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to edit'));
    await form.openEdit(row!.userId);
    await form.expectFixedPerson(row!);
  });

  test('TC-EAT-02 Save label on Edit', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy6z'), 'TC-EAT-02 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to edit'));
    await form.openEdit(row!.userId);
    await form.expectSubmitLabel('Save');
  });

  test('TC-EAT-03 Editing every field persists', async ({
    alertTimerFormPage: form,
    alertTimerDetailPage: detail,
  }) => {
    await allure.tms(cu('z941abxy70'), 'TC-EAT-03 (ClickUp)');
    const row = firstWhere((t) => t.isEnabled && !!t.email);
    test.skip(!row, noTimer('with an email to edit'));
    await form.openEdit(row!.userId);
    // A value different from the stored one in every field.
    const cadence = row!.cadence === 'weekly' ? 'Daily' : 'Weekly';
    const flip = row!.sections.includes('prep_completion') ? 'risks' : 'prep_completion';
    const sections = row!.sections.includes(flip)
      ? row!.sections.filter((s) => s !== flip)
      : [...row!.sections, flip];
    const bothChannels = row!.channels.length === 2;
    await form.fill({
      cadence,
      weekday: cadence === 'Weekly' ? (row!.sendWeekday === 5 ? 'Tuesday' : 'Friday') : undefined,
      time: row!.sendAt === '18:45' ? '05:30' : '18:45',
      sections: sectionLabelsOf(sections),
      channels: bothChannels ? ['In-app'] : ['In-app', 'Email'],
    });
    const edited = await form.state();
    // The server's answer is simulated, and the saved timer is served back to Details.
    net.answerSaveAsSaved(row!);
    const sent = await form.submit(net);
    expect(sent.method).toBe('PUT');
    expect(sent.url).toContain(row!.userId);
    expect(sent.body).toMatchObject({
      cadence: edited.cadence,
      sendAt: edited.time,
      sections: edited.sections,
      channels: edited.channels,
      isEnabled: true,
      expectedVersion: row!.version,
    });
    expect(sent.body.cadence).not.toBe(row!.cadence);
    expect(sent.body.sendAt).not.toBe(row!.sendAt);
    expect([...sent.body.sections].sort()).not.toEqual([...row!.sections].sort());
    expect([...sent.body.channels].sort()).not.toEqual([...row!.channels].sort());
    await form.expectToast('Alert timer saved.');
    await detail.expectOnDetails(row!.userId);
    await detail.expectShows(net.lastSaved!);
    expect(net.lastSaved!.version).toBe(row!.version + 1);
  });

  test('TC-EAT-04 Turning Off, then back on, restores prior values with no re-entry', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy71'), 'TC-EAT-04 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to turn off'));
    const stored = {
      cadence: row!.cadence,
      sendAt: row!.sendAt,
      sendWeekday: row!.sendWeekday,
      sections: row!.sections,
      channels: row!.channels,
    };
    await form.openEdit(row!.userId);
    const before = await form.state();
    // The server's answers are simulated; the saved Off timer is served back to the next Edit.
    net.answerSaveAsSaved(row!);
    await test.step('Turn off and save: every other value is kept', async () => {
      await form.turnOff();
      const off = await form.submit(net);
      expect(off.body).toMatchObject({ ...stored, isEnabled: false });
      await form.expectToast('Alert timer saved.');
      await form.expectOnDetails(row!.userId);
    });
    await test.step('Reopen, turn back on and save: nothing to re-enter', async () => {
      await form.openEdit(row!.userId);
      await form.expectOff();
      await form.turnBackOn();
      expect(await form.state()).toEqual(before);
      const on = await form.submit(net);
      expect(on.body).toMatchObject({ ...stored, isEnabled: true });
    });
  });

  test('TC-EAT-05 No "reset to not set" control anywhere', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy72'), 'TC-EAT-05 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to edit'));
    await form.openEdit(row!.userId);
    await form.expectNoResetControl();
  });

  test('TC-EAT-06 409 VERSION_CONFLICT', async ({ alertTimerFormPage: form }) => {
    await allure.tms(cu('z941abxy73'), 'TC-EAT-06 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to edit'));
    await form.openEdit(row!.userId);
    await form.setSection('Prep completion', !row!.sections.includes('prep_completion'));
    // Simulated: someone else saved this timer first (the server's 409 carries the new version).
    net.answerSaveWithError(409, {
      code: 'VERSION_CONFLICT',
      message: 'This alert timer was changed by someone else.',
      currentVersion: row!.version + 1,
    });
    const sent = await form.submit(net);
    expect(sent.body.expectedVersion).toBe(row!.version);
    await form.expectConflictBanner();
    await form.reloadAfterConflict();
  });

  test('TC-EAT-07 404 on PUT when the row no longer exists', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy74'), 'TC-EAT-07 (ClickUp)');
    const row = enabled()[0];
    test.skip(!row, noTimer('to edit'));
    await form.openEdit(row!.userId);
    await form.setSection('Prep completion', !row!.sections.includes('prep_completion'));
    // Real server: the save goes to an id with no timer (as if the row had gone), so its own
    // 404 answers and nothing can change.
    net.sendSaveToMissingTimer(randomUUID());
    const answered = net.writeResponses.length;
    await form.submit(net);
    // Fail-safe: if the redirect could not be built, the save was blocked, not sent.
    await expect.poll(() => net.misdirectedSave || net.writeResponses.length > answered).toBe(true);
    expect(net.misdirectedSave, 'the save could not be redirected to a missing id').toBe(false);
    const response = await net.writeResponseAfter(answered);
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
    await form.expectToast('This person has no alert timer');
    await form.expectOnEdit(row!.userId);
  });

  test('TC-EAT-08 Rules re-enforced on every update, not just create', async ({
    alertTimerFormPage: form,
  }) => {
    await allure.tms(cu('z941abxy75'), 'TC-EAT-08 (ClickUp)');
    const row = firstWhere((t) => !t.isEnabled) ?? enabled()[0];
    test.skip(!row, noTimer('to edit'));
    await form.openEdit(row!.userId);
    if (row!.isEnabled) await form.turnOff();
    // While Off, Sections / Channels are hidden: an Off timer can't be edited into an invalid state.
    await form.expectOff();
    await form.turnBackOn();
    await form.untickEverySection();
    await form.setSection('Capacity', true);
    await form.tryToUntickLastChannel();
  });

  test('TC-EAT-09 Edit hidden/blocked without write permission', async ({ personas }) => {
    await allure.tms(cu('z941abxy76'), 'TC-EAT-09 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    // The write-permission gate comes before the timer loads, so any id shows it.
    const userId = enabled()[0]?.userId ?? randomUUID();
    await asPersona(personas, 'READONLY', async (roPage) => {
      const form = new AlertTimerFormPage(roPage);
      await form.gotoEdit(userId);
      await form.expectAccessRestricted();
    });
  });
});
