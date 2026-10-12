import * as allure from 'allure-js-commons';
import { ActivitiesListPage } from '../../../src/pages/planning/activities-list.page';
import { ActivityFormPage } from '../../../src/pages/planning/activity-form.page';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  asPersona,
  createActivityDraft,
  knownBug,
  personaCredentials,
  personaSkipReason,
  setupPage,
  taggedName,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';

/**
 * Planning — List Activity (Planning > Master Data > Activities).
 *
 * Source of truth for these cases: test-cases/planning/list-activity.md
 * (ClickUp "Planning -Sprint -1 - Activities", one subtask per TC). The
 * Sprint 1 cases are kept by ID but assert today's dev behaviour where the
 * screen has deliberately changed — see the doc's "Adjusted" column.
 *
 * One activity draft is created up front (tagged QA-AUTO) for the cases
 * that need a known row.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

test.describe('Planning - List Activity', () => {
  // Deletes / retires this file's QA-AUTO records once its cases are done.
  cleanUpAfterAll();

  let code = '';

  test.beforeAll(async ({ browser }) => {
    // Builds this file's QA-AUTO fixtures through the UI (each create ~10–20 s on dev).
    test.setTimeout(180_000);
    const page = await setupPage(browser);
    code = await createActivityDraft(page);
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO records through the UI (~10–20 s per create on dev).
    test.setTimeout(120_000);
    await allure.epic('Planning');
    await allure.feature('Activities');
    await allure.owner('Planning QA');
  });

  test('TC-LA-01 "New activity" opens the create form as its own page', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdv2'), 'TC-LA-01 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openNew();
    await activityFormPage.expectOnCreatePage();
  });

  test('TC-LA-02 Filter toggle shows an active-rule count badge', async ({
    activitiesListPage,
  }) => {
    await allure.tms(cu('z941abtdv3'), 'TC-LA-02 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();

    await test.step('Applying one rule narrows the grid and badges Filters with 1', async () => {
      await activitiesListPage.openFilters();
      await activitiesListPage.addFilterRule('Code', code);
      await activitiesListPage.expectFiltersBadge(1);
      await activitiesListPage.expectRowVisible(code);
      await expect.poll(() => activitiesListPage.visibleRowCount()).toBe(1);
    });

    await test.step('Removing the rule clears the badge and restores the grid', async () => {
      await activitiesListPage.removeFilterRule();
      await activitiesListPage.expectNoFiltersBadge();
      await expect.poll(() => activitiesListPage.visibleRowCount()).toBeGreaterThan(1);
    });
  });

  test('TC-LA-03 Columns icon opens the column-configuration picker', async ({
    activitiesListPage,
  }) => {
    await allure.tms(cu('z941abtdv4'), 'TC-LA-03 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.expectColumnVisible('Efficiency assumed');
    try {
      await activitiesListPage.hideColumn('Efficiency assumed');
      await activitiesListPage.expectColumnHidden('Efficiency assumed');
    } finally {
      // Column layout is saved per user — put it back for everyone else.
      await activitiesListPage.resetColumns();
    }
    await activitiesListPage.expectColumnVisible('Efficiency assumed');
  });

  test('TC-LA-04 Inline filter toggles a per-column filter row', async ({ activitiesListPage }) => {
    await allure.tms(cu('z941abtdv5'), 'TC-LA-04 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.toggleCellFilters();
    await activitiesListPage.expectCellFilterRow('Code');
    await activitiesListPage.filterColumn('Code', code);
    await activitiesListPage.expectRowVisible(code);
    await expect.poll(() => activitiesListPage.visibleRowCount()).toBe(1);
  });

  test('TC-LA-05 Search filters by code, name, department, and activity type', async ({
    activitiesListPage,
  }) => {
    await allure.tms(cu('z941abtdv8'), 'TC-LA-05 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();

    await test.step('By code', async () => {
      await activitiesListPage.search(code);
      await activitiesListPage.expectRowVisible(code);
    });
    await test.step('By name', async () => {
      await activitiesListPage.search(taggedName(code).slice(0, 30));
      await activitiesListPage.expectRowVisible(code);
    });
    // Department / type terms also match rows whose visible cells don't
    // contain them (e.g. "Cutting" returns FIN-ACCESSORY, 2026-10-09) — the
    // search covers more than the shown columns, so this checks our own
    // Cutting / Production row is found rather than that every row matches.
    // Every run adds Cutting / Production drafts, so a Code filter narrows the
    // grid to this run's row first; the search then has to keep it.
    await activitiesListPage.openFilters();
    await activitiesListPage.addFilterRule('Code', code);
    await test.step('By department', async () => {
      await activitiesListPage.search('Cutting');
      await activitiesListPage.expectRowVisible(code);
    });
    await test.step('By activity type', async () => {
      await activitiesListPage.search('Production');
      await activitiesListPage.expectRowVisible(code);
    });
    await test.step('A term the row lacks hides it', async () => {
      await activitiesListPage.search('Embroidery');
      await activitiesListPage.expectNoRow(code);
    });
  });

  test('TC-LA-06 View switch toggles List / Split / Stacked view', async ({
    activitiesListPage,
  }) => {
    await allure.tms(cu('z941abtdv9'), 'TC-LA-06 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    for (const view of ['Vertical split', 'Horizontal split', 'No split'] as const) {
      await activitiesListPage.switchView(view);
      await activitiesListPage.expectViewActive(view);
    }
    await activitiesListPage.expectGridVisible();
  });

  test('TC-LA-07 Tabs filter the grid with accurate counts', async ({ activitiesListPage }) => {
    await allure.tms(cu('z941abtdva'), 'TC-LA-07 (ClickUp)');
    await allure.tms(cu('z941abyb0t'), 'TC-LA-07 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abyb0t (2026-10-09): the "All" badge is the
    // sum of the activity-type tabs, so activities with no Activity type
    // (e.g. WASH-TINT, code-and-name drafts) are listed but not counted —
    // All 141 vs 145 rows. Marked with knownBug() until fixed.
    knownBug('z941abyb0t');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    for (const tab of ['All', 'Production']) {
      await test.step(`"${tab}" tab count matches the grid's own total`, async () => {
        await activitiesListPage.selectTab(tab);
        const badge = await activitiesListPage.tabCount(tab);
        await expect
          .poll(async () => (await activitiesListPage.showing()).total, {
            message: `"${tab}" tab says ${badge}`,
          })
          .toBe(badge);
      });
    }
    await test.step('Production rows are all Production activities', async () => {
      await activitiesListPage.expectEveryRowMatches('Production');
    });
  });

  test('TC-LA-08 Filters panel — chips, remove one, Clear all', async ({ activitiesListPage }) => {
    await allure.tms(cu('z941abtdvc'), 'TC-LA-08 (ClickUp)');
    const chip = `Code contains "${code}"`;
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.openFilters();
    await activitiesListPage.addFilterRule('Code', code);
    await activitiesListPage.expectFiltersBadge(1);
    await activitiesListPage.expectFilterChip(chip);
    expect(await activitiesListPage.filterMatchCount()).toBe(1);

    await test.step('Clear all removes every rule and chip', async () => {
      await activitiesListPage.clearAllFilters();
      await activitiesListPage.expectNoFilterChip(chip);
      await activitiesListPage.expectNoFiltersBadge();
      await expect.poll(() => activitiesListPage.visibleRowCount()).toBeGreaterThan(1);
    });
  });

  test('TC-LA-09 Row click opens detail; Edit activity opens the edit form', async ({
    activitiesListPage,
    activityFormPage,
  }) => {
    await allure.tms(cu('z941abtdvd'), 'TC-LA-09 (ClickUp)');
    await activitiesListPage.findRow(code);
    await activitiesListPage.openRow(code);
    await activityFormPage.expectOnDetailPage();
    await activityFormPage.startEditing();
  });

  test('TC-LA-10 Empty state and no-match state', async ({ activitiesListPage }) => {
    await allure.tms(cu('z941abtdve'), 'TC-LA-10 (ClickUp)');
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    await activitiesListPage.search(`no-such-activity-${Date.now()}`);
    await activitiesListPage.expectNoMatchState();
  });

  test('TC-LA-11 List access requires read permission', async ({ personas }) => {
    await allure.tms(cu('z941abtdvf'), 'TC-LA-11 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (page) => {
      const list = new ActivitiesListPage(page);
      await list.open();
      await list.expectAccessRestricted();
    });
  });

  test('TC-LA-12 Search input with special characters does not break the grid', async ({
    page,
    activitiesListPage,
  }) => {
    await allure.tms(cu('z941abtdvh'), 'TC-LA-12 (ClickUp)');
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await activitiesListPage.open();
    await activitiesListPage.expectLoaded();
    for (const term of ['%%%', '///', `'"<>`, 'x'.repeat(200)]) {
      await activitiesListPage.search(term);
      await activitiesListPage.expectNoMatchState();
    }
    await activitiesListPage.search(code);
    await activitiesListPage.expectRowVisible(code);
    expect(pageErrors).toEqual([]);
  });

  test('TC-LA-13 Read-only users cannot use the inline Edit action from the list', async ({
    personas,
  }) => {
    await allure.tms(cu('z941abtdvj'), 'TC-LA-13 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    // Read-only: the seeded published activity CUT-BUFFER is only viewed.
    await asPersona(personas, 'READONLY', async (page) => {
      const list = new ActivitiesListPage(page);
      await list.findRow('CUT-BUFFER');
      await list.expectNoRowAction('CUT-BUFFER', 'Edit');
      await list.openRow('CUT-BUFFER');
      await new ActivityFormPage(page).expectNoEditAction();
    });
  });
});
