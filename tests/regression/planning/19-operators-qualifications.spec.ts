import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { OperatorsListPage } from '../../../src/pages/planning/operators-list.page';
import { OperatorProfilePage } from '../../../src/pages/planning/operator-profile.page';
import { ShellHeaderPage } from '../../../src/pages/shell/shell-header.page';
import { asPersona, personaCredentials, personaSkipReason, setupPage } from './support/test-data';
import {
  CYCLE_BASED_CENTRE,
  TIME_BASED_CENTRE,
  type QaOperator,
  type RichOperator,
  cleanUpOperatorsAfterAll,
  codeOption,
  createQaEmployee,
  createQaOperator,
  createRichOperator,
  isoDay,
  moveQaEmployee,
  offeredActivities,
  offeredTasks,
  pickEmployee,
  rollUps,
} from './support/operators';

/**
 * Planning — Operators & Qualifications (story z941aby6j3, "Operator Profile
 * and Qualification - Additional changes"): list, create, view, edit
 * profile, edit qualifications inline, cross-screen / access / language.
 *
 * Source of truth for these cases: test-cases/planning/operators-qualifications.md
 * (ClickUp "Planning - Operators & Qualifications", z941abzdqq). The catalogue
 * was written on 2026-10-15 for a one-page form; since the 2026-10-28 deploy
 * the form is stepped (step 1 the profile, "Save & continue" creates it; step 2
 * the qualifications, each saved on its own), so the create-with-qualifications
 * cases run on step 2 of a new operator.
 *
 * Every operator here is the suite's own: a QA-AUTO employee created in Master
 * Data, then its profile. Seed profiles are only read. The read-only cases
 * look at two operators each worker builds first: a "rich" one (11 task
 * qualifications in every state, plus an activity where the environment has
 * activities) and a "blank" one (Floating, every optional field empty).
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

const LIST_DESCRIPTION =
  'What planning knows about an employee who performs scheduled work — home centre, usual shift, grade, how they are deployed — and what they are qualified to do. Zero or one profile per employee; only those who are, or have been, capacity have one.';
const OWNERSHIP_NOTE =
  'Owned and written by planning — a supervisor regrades an operator here, and the HR synchronisation that maintains the employee record never touches it. An employee without a profile is a person, not capacity.';
const LIST_COLUMNS = [
  'Operator',
  'Department',
  'Home work centre',
  'Usual shift',
  'Skill grade',
  'Deployment',
  'Efficiency',
  'On the floor since',
  'Certifications',
  'Qualified',
  'Next lapse',
  'Active',
];
const VIEW_COLUMNS = [
  'Task',
  'Qualified',
  'Efficiency',
  'Measured minutes',
  'Assessed by',
  'Last assessed',
  'Valid until',
  'Active',
];
const EXPANDED_COLUMNS = [
  'Certified on',
  'Qualified',
  'Efficiency',
  'Measured min',
  'Assessed by',
  'Last assessed',
  'Valid until',
  'Active',
];
const PENDING_ROW = 'Save or cancel the open qualification row first.';
const NO_ACTIVITIES =
  'No activities are offered for qualifications here (uat has none, 2026-11-17)';

const percent = (v: string) => Number(v.replace('%', ''));

test.describe('Planning - Operators & Qualifications', () => {
  cleanUpOperatorsAfterAll();

  let rich: RichOperator;
  let blank: QaOperator;

  test.beforeAll(async ({ browser }) => {
    // Two QA employees + operators and 11–12 qualifications through the UI (~3 min on dev).
    test.setTimeout(900_000);
    const page = await setupPage(browser);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(120_000);
    rich = await createRichOperator(page);
    blank = await createQaOperator(page, { deployment: 'Floating across the department' });
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Cases create their own QA-AUTO employee + operator through the UI (~30–60 s on dev).
    test.setTimeout(300_000);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(120_000);
    await allure.epic('Planning');
    await allure.feature('Operators & Qualifications');
    await allure.owner('Planning QA');
  });

  const heldTasks = () => rich.qualifications.filter((q) => q.kind === 'task');
  const activityQual = () => rich.qualifications.find((q) => q.kind === 'activity');

  // ── List ──────────────────────────────────────────────────────────────

  test('TC-LOQ-01 One Operators & Qualifications tile replaces the two old tiles', async ({
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdtc'), 'TC-LOQ-01 (ClickUp)');
    await operatorsListPage.openFromMasterDataLanding();
    const tiles = await operatorsListPage.landingTileNames();
    expect(tiles, 'one operator / qualification tile').toHaveLength(1);
    expect(tiles[0]).toContain('Operators & Qualifications');
    expect(tiles[0]).toContain(
      'Organisation · who is capacity · home centre, shift, grade, qualifications',
    );
    await operatorsListPage.openLandingTile();
  });

  test('TC-LOQ-02 Page header and description', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdqr'), 'TC-LOQ-02 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectHeader(LIST_DESCRIPTION);
  });

  test('TC-LOQ-03 Grid columns', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdqu'), 'TC-LOQ-03 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.expectColumnHeaders(LIST_COLUMNS);
    for (const column of LIST_COLUMNS) {
      const rollUp = ['Certifications', 'Qualified', 'Next lapse'].includes(column);
      expect(await operatorsListPage.isSortable(column), `"${column}" sorts`).toBe(!rollUp);
    }
  });

  test('TC-LOQ-04 Deployment tabs filter and count', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdqx'), 'TC-LOQ-04 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    const tabs = { Fixed: 'Fixed to one centre', Floating: 'Floating across the department' };
    await operatorsListPage.expectTabs(['All', 'Fixed', 'Floating', 'Rotating crew']);
    await operatorsListPage.expectTabCountsAddUp(['Fixed', 'Floating', 'Rotating crew']);
    for (const [tab, label] of Object.entries(tabs)) {
      await test.step(`"${tab}" shows only ${label}, as many as its count`, async () => {
        await operatorsListPage.selectTab(tab);
        await operatorsListPage.expectTabCountMatchesRows(tab);
        const deployments = await operatorsListPage.columnValues('Deployment');
        expect(new Set(deployments)).toEqual(new Set([label]));
      });
    }
    await test.step('the rich (Fixed) operator is under Fixed, not Floating', async () => {
      await operatorsListPage.search(rich.employeeNo);
      await operatorsListPage.expectNoOperatorRow(rich.employeeNo);
      await operatorsListPage.selectTab('Fixed');
      await operatorsListPage.expectOperatorRow(rich.employeeNo);
    });
  });

  test('TC-LOQ-05 Expand an operator to see their qualifications', async ({
    page,
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdtd'), 'TC-LOQ-05 (ClickUp)');
    await operatorsListPage.findOperator(rich.employeeNo);
    const url = await operatorsListPage.toggleQualifications(rich.employeeNo);
    await operatorsListPage.expectExpanded();
    expect(page.url(), 'expanding stays on the list').toBe(url);
    expect(await operatorsListPage.expandedHeaders()).toEqual(EXPANDED_COLUMNS);
    const rows = (await operatorsListPage.expandedRows()).map((cells) => cells.join(' '));
    for (const q of rich.qualifications)
      expect(
        rows.some((r) => r.startsWith(q.code)),
        `${q.code} row`,
      ).toBe(true);
    expect(await operatorsListPage.expanderLabel(rich.employeeNo)).toBe('Hide qualifications');
    await operatorsListPage.toggleQualifications(rich.employeeNo);
    await operatorsListPage.expectCollapsed();
  });

  test('TC-LOQ-06 Operators without qualifications have no expand control', async ({
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdte'), 'TC-LOQ-06 (ClickUp)');
    await operatorsListPage.findOperator(blank.employeeNo);
    await operatorsListPage.expectExpander(blank.employeeNo, false);
    expect(await operatorsListPage.operatorCell(blank.employeeNo, 'Certifications')).toBe('0');
    expect(await operatorsListPage.operatorCell(blank.employeeNo, 'Qualified')).toBe('—');
    expect(await operatorsListPage.operatorCell(blank.employeeNo, 'Next lapse')).toBe('—');
  });

  test('TC-LOQ-07 Certifications roll-up matches the expanded rows', async ({
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdtf'), 'TC-LOQ-07 (ClickUp)');
    const expected = rollUps(rich.qualifications).certifications;
    await operatorsListPage.findOperator(rich.employeeNo);
    expect(await operatorsListPage.operatorCell(rich.employeeNo, 'Certifications')).toBe(expected);
    await test.step('the profile counts the same qualifications', async () => {
      await operatorProfilePage.openView(rich.id);
      expect(await operatorProfilePage.qualificationCount()).toBe(Number(expected.split('·')[0]));
    });
  });

  test('TC-LOQ-08 Qualified roll-up counts lapsed qualifications separately', async ({
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdth'), 'TC-LOQ-08 (ClickUp)');
    await operatorsListPage.findOperator(rich.employeeNo);
    expect(await operatorsListPage.operatorCell(rich.employeeNo, 'Qualified')).toBe(
      rollUps(rich.qualifications).qualified,
    );
  });

  test('TC-LOQ-09 Next lapse shows the earliest upcoming Valid until', async ({
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdtj'), 'TC-LOQ-09 (ClickUp)');
    // The rich operator holds one past Valid until (lapsed) and one next month.
    const future = rich.qualifications.filter(
      (q) => q.active && q.validUntil !== 'Does not expire' && q.state !== 'Lapsed',
    );
    await operatorsListPage.findOperator(rich.employeeNo);
    expect(await operatorsListPage.operatorCell(rich.employeeNo, 'Next lapse')).toBe(
      future.map((q) => q.validUntil).sort()[0],
    );
    await operatorsListPage.search(blank.employeeNo);
    expect(await operatorsListPage.operatorCell(blank.employeeNo, 'Next lapse')).toBe('—');
  });

  test('TC-LOQ-10 Clicking an operator opens the profile', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdtk'), 'TC-LOQ-10 (ClickUp)');
    await operatorsListPage.findOperator(rich.employeeNo);
    const url = await operatorsListPage.toggleQualifications(rich.employeeNo);
    expect(page.url(), 'the chevron only expands').toBe(url);
    await operatorsListPage.openOperator(rich.employeeNo);
    await operatorProfilePage.expectLoaded();
    expect(page.url()).toContain(rich.id);
    expect(await operatorProfilePage.headingText()).toBe(rich.name);
  });

  test('TC-LOQ-11 Search by operator name or code', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdtm'), 'TC-LOQ-11 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    expect(await operatorsListPage.searchPlaceholder()).toBe(
      'Search by operator, home centre, shift, grade or qualification',
    );
    for (const term of [rich.employeeNo, rich.name.split(' — ')[0]!]) {
      await test.step(`"${term}" leaves only the rich operator`, async () => {
        await operatorsListPage.search(term);
        await operatorsListPage.expectOperatorRow(rich.employeeNo);
        await expect.poll(() => operatorsListPage.visibleRowCount()).toBe(1);
        expect(await operatorsListPage.showing()).toEqual({ from: 1, to: 1, total: 1 });
      });
    }
  });

  test("TC-LOQ-12 Search matches a qualification's task", async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdtq'), 'TC-LOQ-12 (ClickUp)');
    const task = heldTasks()[0]!.code;
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.expectSearchFindsOperator(task, rich.employeeNo);
    await operatorsListPage.expectSearchMisses(task, blank.employeeNo);
  });

  test("TC-LOQ-13 Search matches a qualification's activity", async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdtr'), 'TC-LOQ-13 (ClickUp)');
    const activity = activityQual();
    test.skip(!activity, NO_ACTIVITIES);
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.expectSearchFindsOperator(activity!.code, rich.employeeNo);
    await operatorsListPage.expectSearchMisses(activity!.code, blank.employeeNo);
  });

  test("TC-LOQ-14 Search matches a qualification's source (Assessed by)", async ({
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdtt'), 'TC-LOQ-14 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    for (const source of ['IE assessment', 'HR system']) {
      await test.step(`"${source}" finds the rich operator, not the blank one`, async () => {
        await operatorsListPage.expectSearchFindsOperator(source, rich.employeeNo);
        await operatorsListPage.expectSearchMisses(source, blank.employeeNo);
      });
    }
  });

  test('TC-LOQ-15 Search by home centre, shift, grade, department and deployment', async ({
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdtv'), 'TC-LOQ-15 (ClickUp)');
    // z941abzdaq (Closed 2026-10-23): the Deployment label shown in the grid
    // ("Floating across…") found nothing; only the stored code matched.
    await allure.tms(cu('z941abzdaq'), 'TC-LOQ-15 bug (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await test.step('home centre', async () => {
      await operatorsListPage.expectSearchFindsOperator(TIME_BASED_CENTRE, rich.employeeNo);
      await operatorsListPage.expectSearchMisses(TIME_BASED_CENTRE, blank.employeeNo);
    });
    if (rich.usualShift !== 'Single shift')
      await test.step('usual shift', async () => {
        await operatorsListPage.expectSearchFindsOperator(rich.usualShift, rich.employeeNo);
      });
    await test.step('skill grade', async () => {
      await operatorsListPage.expectSearchFindsOperator(rich.skillGrade, rich.employeeNo);
      await operatorsListPage.expectSearchMisses(rich.skillGrade, blank.employeeNo);
    });
    await test.step('department', async () => {
      await operatorsListPage.expectSearchFindsOperator(rich.department, rich.employeeNo);
    });
    for (const term of ['floating', 'Floating across the department'])
      await test.step(`deployment "${term}"`, async () => {
        await operatorsListPage.expectSearchFindsOperator(term, blank.employeeNo);
        await operatorsListPage.expectSearchMisses(term, rich.employeeNo);
      });
  });

  test('TC-LOQ-16 Expanded row after a qualification search', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdtw'), 'TC-LOQ-16 (ClickUp)');
    const task = heldTasks()[1]!.code;
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.expectSearchFindsOperator(task, rich.employeeNo);
    await operatorsListPage.toggleQualifications(rich.employeeNo);
    await operatorsListPage.expectExpanded();
    const rows = (await operatorsListPage.expandedRows()).map((cells) => cells[0]);
    // All of the operator's qualifications, not only the one searched for.
    expect(rows.length).toBe(rich.qualifications.length);
    expect(rows.some((r) => r!.startsWith(task))).toBe(true);
  });

  test('TC-LOQ-18 Filters panel', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdtx'), 'TC-LOQ-18 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    const all = (await operatorsListPage.showing()).total;
    await operatorsListPage.openFilters();
    expect(await operatorsListPage.filterAttributes()).toEqual(
      expect.arrayContaining([
        'Operator',
        'Department',
        'Home work centre',
        'Usual shift',
        'Skill grade',
        'Deployment',
        'Efficiency',
        'On the floor since',
        'Active',
      ]),
    );
    const deployments = await operatorsListPage.filterValues('Deployment');
    expect(deployments, 'labels, not stored codes').not.toContain('floating');
    expect(deployments.some((d) => /^Floating/.test(d))).toBe(true);
    await operatorsListPage.addFilterRule(
      'Deployment',
      deployments.find((d) => /^Floating/.test(d))!,
    );
    await operatorsListPage.expectFiltersBadge(1);
    // The grid reloads with the filter: poll until only the filtered deployment is listed.
    await expect
      .poll(async () => [...new Set(await operatorsListPage.columnValues('Deployment'))])
      .toEqual(['Floating across the department']);
    await operatorsListPage.removeFilterRule();
    await operatorsListPage.expectNoFiltersBadge();
    await expect.poll(async () => (await operatorsListPage.showing()).total).toBe(all);
  });

  test('TC-LOQ-19 Sort by profile columns', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdty'), 'TC-LOQ-19 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    const checks: { column: string; blank: string; value: (v: string) => number | string }[] = [
      { column: 'Efficiency', blank: 'Machine-paced', value: percent },
      { column: 'On the floor since', blank: '—', value: (v) => v },
    ];
    for (const { column, blank: empty, value } of checks) {
      for (const direction of ['ascending', 'descending'] as const) {
        await test.step(`${column} ${direction}: in order, blanks last`, async () => {
          await operatorsListPage.sortBy(column);
          await expect(async () => {
            const cells = await operatorsListPage.columnValues(column);
            const firstBlank = cells.indexOf(empty);
            const filled = firstBlank < 0 ? cells : cells.slice(0, firstBlank);
            if (firstBlank >= 0)
              expect(
                cells.slice(firstBlank).every((c) => c === empty),
                'blanks last',
              ).toBe(true);
            const values = filled.map(value);
            const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
            expect(values).toEqual(direction === 'ascending' ? sorted : sorted.reverse());
          }).toPass({ timeout: 15_000 });
        });
      }
    }
  });

  test('TC-LOQ-20 Configure columns', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdtz'), 'TC-LOQ-20 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.hideColumns(['Usual shift', 'Next lapse']);
    await operatorsListPage.expectColumnHidden('Usual shift');
    await operatorsListPage.expectColumnHidden('Next lapse');
    await operatorsListPage.reload();
    await operatorsListPage.expectColumnHidden('Usual shift');
    await operatorsListPage.expectColumnHidden('Next lapse');
    await operatorsListPage.resetColumns();
    await operatorsListPage.expectColumnVisible('Usual shift');
    await operatorsListPage.expectColumnVisible('Next lapse');
  });

  test('TC-LOQ-21 Retired profile stays listed', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdu3'), 'TC-LOQ-21 (ClickUp)');
    const retired = await createQaOperator(page, { active: false });
    await operatorsListPage.findOperator(retired.employeeNo);
    expect(await operatorsListPage.operatorCell(retired.employeeNo, 'Active')).toBe('Retired');
    await operatorsListPage.selectTab('Fixed');
    await operatorsListPage.expectOperatorRow(retired.employeeNo);
    await operatorsListPage.openOperator(retired.employeeNo);
    await operatorProfilePage.expectLoaded();
  });

  test('TC-LOQ-22 Blank efficiency reads Machine-paced', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdu4'), 'TC-LOQ-22 (ClickUp)');
    await operatorsListPage.findOperator(blank.employeeNo);
    expect(await operatorsListPage.operatorCell(blank.employeeNo, 'Efficiency')).toBe(
      'Machine-paced',
    );
  });

  test('TC-LOQ-23 New opens the create form', async ({
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdu5'), 'TC-LOQ-23 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.openNew();
    await operatorProfilePage.expectOnNewForm();
  });

  test('TC-LOQ-24 Paging', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdqv'), 'TC-LOQ-24 (ClickUp)');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    const { total } = await operatorsListPage.showing();
    test.skip(total <= 10, `Paging needs more than 10 operators; this environment has ${total}`);
    await operatorsListPage.setRowsPerPage(10);
    await expect.poll(() => operatorsListPage.showing()).toEqual({ from: 1, to: 10, total });
    await expect(operatorsListPage.grid.previousPageButton).toBeDisabled();
    await operatorsListPage.nextPage();
    await expect
      .poll(() => operatorsListPage.showing())
      .toEqual({ from: 11, to: Math.min(20, total), total });
    await operatorsListPage.previousPage();
    await expect.poll(() => operatorsListPage.showing()).toEqual({ from: 1, to: 10, total });
  });

  // ── Create ────────────────────────────────────────────────────────────

  test('TC-COQ-01 Create form layout', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdru'), 'TC-COQ-01 (ClickUp)');
    await operatorProfilePage.openNew();
    await expect(
      operatorProfilePage.locators.text('An employee has at most one profile.'),
    ).toBeVisible();
    for (const hint of [
      'The person, in the employee master. An employee has at most one profile',
      'The roster baseline the capacity ledger starts from',
      /^Which window this person belongs to\. Blank means the department's single shift/,
      /^For departments that certify by grade\./,
      /^What reallocation needs to know\./,
      /^Where no per-task factor exists in the qualifications\./,
      "When the person first became capacity. Planning's own date, unrelated to the hire date HR holds",
      /^Retired, never deleted/,
    ])
      await operatorProfilePage.expectFieldHint(hint);
    // Since the stepped form (2026-10-28): the qualifications are step 2.
    await expect(operatorProfilePage.locators.qualificationsStep).toBeVisible();
    await operatorProfilePage.expectChangesStatus('No changes');
    await expect(operatorProfilePage.locators.cancelButton).toBeVisible();
    await expect(operatorProfilePage.locators.saveAndContinueButton).toBeVisible();
  });

  test('TC-COQ-02 Fresh form has no pre-selected choices', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdqy'), 'TC-COQ-02 (ClickUp)');
    // Re-checks z941abxvxa (Closed): Deployment / Usual shift / Skill grade came pre-selected.
    await operatorProfilePage.openNew();
    for (const field of [
      'Employee',
      'Home work centre',
      'Usual shift',
      'Skill grade',
      'Deployment',
    ] as const)
      expect(await operatorProfilePage.fieldValue(field), field).toBe('Select…');
    expect(await operatorProfilePage.efficiencyValue()).toBe('');
    expect(await operatorProfilePage.onFloorSinceLabel()).toBe('Pick date');
    expect(await operatorProfilePage.isActiveOn()).toBe(true);
  });

  test('TC-COQ-03 Employee and Deployment are required', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdr0'), 'TC-COQ-03 (ClickUp)');
    await operatorProfilePage.openNew();
    await test.step('blank form: both flagged, nothing sent', async () => {
      expect((await operatorProfilePage.saveAndContinue()).status).toBeNull();
      expect(await operatorProfilePage.fieldMessage('Employee')).toBe('Required');
      expect(await operatorProfilePage.fieldMessage('Deployment')).toBe('Required');
      await operatorProfilePage.toastVisible('Fill the 2 highlighted field(s) before saving.');
    });
    await test.step('employee only: Deployment still flagged, nothing sent', async () => {
      await pickEmployee(operatorProfilePage, rich);
      expect((await operatorProfilePage.saveAndContinue()).status).toBeNull();
      expect(await operatorProfilePage.fieldMessage('Employee')).toBe('');
      expect(await operatorProfilePage.fieldMessage('Deployment')).toBe('Required');
    });
    await operatorProfilePage.expectOnNewForm();
  });

  test('TC-COQ-04 Create an operator without qualifications', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdr3'), 'TC-COQ-04 (ClickUp)');
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({
      homeWorkCentreSearch: TIME_BASED_CENTRE,
      homeWorkCentre: new RegExp(`^${TIME_BASED_CENTRE} · `),
      skillGrade: /^S2 — /,
      deployment: 'Fixed to one centre',
      efficiency: '95',
      onFloorSince: { day: new Date().getDate() },
    });
    const { status, body } = await operatorProfilePage.saveAndContinue();
    expect(status).toBe(201);
    await operatorProfilePage.toastVisible('Operator created.');
    await operatorProfilePage.expectQualificationCount(0);
    await operatorProfilePage.done();
    expect(await operatorProfilePage.detail('Home work centre')).toBe(TIME_BASED_CENTRE);
    expect(await operatorProfilePage.detail('Skill grade')).toBe('S2 — developing');
    expect(await operatorProfilePage.detail('Deployment')).toBe('Fixed to one centre');
    expect(await operatorProfilePage.detail('Efficiency')).toBe('95%');
    expect(await operatorProfilePage.detail('On the floor since')).toBe(
      isoDay(new Date().getDate()),
    );
    await test.step('listed under All and Fixed', async () => {
      await operatorsListPage.findOperator(employee.employeeNo);
      await operatorsListPage.selectTab('Fixed');
      await operatorsListPage.expectOperatorRow(employee.employeeNo);
    });
    expect(String(body!.id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('TC-COQ-05 One profile per employee', async ({ operatorsListPage, operatorProfilePage }) => {
    await allure.tms(cu('z941abzdr4'), 'TC-COQ-05 (ClickUp)');
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, rich);
    await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(409);
    expect(await operatorProfilePage.fieldMessage('Employee')).toBe(
      `Already has a profile — ${rich.name}`,
    );
    await operatorProfilePage.expectOnNewForm();
    await operatorsListPage.findOperator(rich.employeeNo);
    await expect.poll(() => operatorsListPage.visibleRowCount()).toBe(1);
  });

  test('TC-COQ-06 Create with one inline task qualification', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdr8'), 'TC-COQ-06 (ClickUp)');
    const task = heldTasks()[0]!.code;
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(201);
    await operatorProfilePage.fillQualification({
      task: codeOption(task),
      efficiency: '90',
      assessedBy: 'IE assessment',
    });
    expect(await operatorProfilePage.addQualification()).toBe(201);
    await operatorProfilePage.expectQualificationCount(1);
    await operatorProfilePage.done();
    await operatorProfilePage.expectQualificationRow(task);
    await operatorsListPage.findOperator(employee.employeeNo);
    expect(await operatorsListPage.operatorCell(employee.employeeNo, 'Certifications')).toBe('1');
  });

  test('TC-COQ-07 Create with several qualifications of both kinds', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdr9'), 'TC-COQ-07 (ClickUp)');
    test.skip(!activityQual(), NO_ACTIVITIES);
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(201);
    for (const q of [
      { task: codeOption(heldTasks()[0]!.code) },
      { activity: codeOption(activityQual()!.code) },
    ]) {
      await operatorProfilePage.fillQualification({
        ...q,
        efficiency: '100',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
    }
    await operatorProfilePage.done();
    await operatorProfilePage.expectQualificationCount(2);
    await operatorsListPage.findOperator(employee.employeeNo);
    expect(await operatorsListPage.operatorCell(employee.employeeNo, 'Certifications')).toBe(
      '2· 1 task, 1 activity',
    );
  });

  test('TC-COQ-08 A filled but not-added row on Create', async ({ page, operatorProfilePage }) => {
    await allure.tms(cu('z941abzdra'), 'TC-COQ-08 (ClickUp)');
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(201);
    await operatorProfilePage.fillQualification({
      task: codeOption(heldTasks()[0]!.code),
      efficiency: '90',
      assessedBy: 'HR system',
    });
    const writes = operatorProfilePage.watchWrites();
    await operatorProfilePage.doneRefused(PENDING_ROW);
    expect(writes.count(), 'the pending row is neither saved nor dropped').toBe(0);
    writes.stop();
    expect(await operatorProfilePage.rowEfficiency()).toBe('90');
    await operatorProfilePage.clearAddRow();
    await operatorProfilePage.done();
    await operatorProfilePage.expectQualificationCount(0);
  });

  test('TC-COQ-09 Remove a staged qualification before creating', async ({
    page,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdrv'), 'TC-COQ-09 (ClickUp)');
    // Stepped form: nothing is staged any more. A typed row is taken off with its
    // Clear before it's added; only the row that's added is saved.
    const [kept, dropped] = heldTasks().map((q) => q.code);
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(201);
    const writes = operatorProfilePage.watchWrites();
    await operatorProfilePage.fillQualification({
      task: codeOption(dropped!),
      efficiency: '90',
      assessedBy: 'HR system',
    });
    await operatorProfilePage.clearAddRow();
    expect(await operatorProfilePage.rowValue('Task')).toBe('—');
    expect(writes.count()).toBe(0);
    writes.stop();
    await operatorProfilePage.fillQualification({
      task: codeOption(kept!),
      efficiency: '90',
      assessedBy: 'HR system',
    });
    expect(await operatorProfilePage.addQualification()).toBe(201);
    await operatorProfilePage.done();
    await operatorProfilePage.expectQualificationCount(1);
    await operatorProfilePage.expectQualificationRow(kept!);
    await operatorProfilePage.expectNoQualificationRow(dropped!);
  });

  test('TC-COQ-10 Create is all-or-nothing', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrb'), 'TC-COQ-10 (ClickUp)');
    await test.step('a refused profile never reaches its qualifications', async () => {
      await operatorProfilePage.openNew();
      await pickEmployee(operatorProfilePage, rich);
      await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
      const writes = operatorProfilePage.watchWrites();
      expect((await operatorProfilePage.saveAndContinue()).status).toBe(409);
      await expect(operatorProfilePage.locators.doneButton).toHaveCount(0);
      expect(writes.count(), 'only the refused profile POST').toBe(1);
      writes.stop();
    });
    await test.step('a refused qualification leaves the saved ones as they were', async () => {
      const task = heldTasks()[0]!.code;
      await operatorProfilePage.openEdit(rich.id);
      await operatorProfilePage.openQualificationsStep();
      const before = await operatorProfilePage.qualificationCount();
      await operatorProfilePage.fillQualification({
        task: codeOption(task),
        efficiency: '90',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(409);
      expect(await operatorProfilePage.rowMessages()).toContain(
        `${rich.employeeNo} already has a qualification for ${task}`,
      );
      await operatorProfilePage.expectQualificationCount(before);
      await operatorProfilePage.clearAddRow();
    });
  });

  test('TC-COQ-11 Cancel discards the operator and staged qualifications', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdrd'), 'TC-COQ-11 (ClickUp)');
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    const writes = operatorProfilePage.watchWrites();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({ deployment: 'Fixed to one centre' });
    await operatorProfilePage.locators.cancelButton.click({ position: { x: 10, y: 10 } });
    expect(await operatorProfilePage.leaveDialogText()).toContain(
      'This operator has changes that are not saved. Leaving now discards them.',
    );
    await operatorProfilePage.locators.discardAndLeaveButton.click();
    await operatorsListPage.expectLoaded();
    expect(writes.count(), 'nothing saved').toBe(0);
    writes.stop();
    await operatorsListPage.search(employee.employeeNo);
    await operatorsListPage.expectNoOperatorRow(employee.employeeNo);
  });

  test('TC-COQ-12 Pickers leave out retired shifts and grades', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrf'), 'TC-COQ-12 (ClickUp)');
    const lookups = await operatorProfilePage.openNewWithLookups();
    const checks = [
      { field: 'Usual shift' as const, items: lookups.shifts, none: 'Single shift' },
      { field: 'Skill grade' as const, items: lookups.skillGrades, none: 'Per activity' },
    ];
    for (const { field, items, none } of checks) {
      await test.step(`${field}: active ones only`, async () => {
        const active = new Set(items.filter((i) => i.active !== false).map((i) => i.label));
        const retiredOnly = items
          .filter((i) => i.active === false && !active.has(i.label))
          .map((i) => i.label);
        const offered = await operatorProfilePage.optionsOf(field);
        expect(offered[0]).toBe(none);
        expect(offered.filter((o) => o !== none).every((o) => active.has(o))).toBe(true);
        expect(offered.filter((o) => retiredOnly.includes(o))).toEqual([]);
      });
    }
  });

  test('TC-COQ-13 Overall efficiency accepts sensible values only', async ({
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdrg'), 'TC-COQ-13 (ClickUp)');
    await operatorProfilePage.openNew();
    for (const value of ['77', '102', '0', '1.5'])
      expect(await operatorProfilePage.typeEfficiency(value), `"${value}" kept`).toBe(value);
    expect(await operatorProfilePage.typeEfficiency('-5'), 'no minus').not.toContain('-');
    expect(await operatorProfilePage.typeEfficiency('abc'), 'no letters').toBe('');
  });

  test('TC-COQ-14 Employee picker shows code, name and department', async ({
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdrh'), 'TC-COQ-14 (ClickUp)');
    await operatorProfilePage.openNew();
    const options = await operatorProfilePage.optionsOf('Employee', rich.employeeNo);
    // Offered although it already has a profile; Create refuses it (TC-COQ-05).
    expect(options).toContain(`${rich.employeeNo} · ${rich.name} — ${rich.department}`);
  });

  test('TC-COQ-15 Efficiency on a machine-paced (cycle-based) home centre', async ({
    page,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdrj'), 'TC-COQ-15 (ClickUp)');
    // Pass on review (2026-10-21): the toast says why the save failed.
    const employee = await createQaEmployee(page);
    await operatorProfilePage.openNew();
    await pickEmployee(operatorProfilePage, employee);
    await operatorProfilePage.fill({
      homeWorkCentreSearch: CYCLE_BASED_CENTRE,
      homeWorkCentre: new RegExp(`^${CYCLE_BASED_CENTRE} · `),
      deployment: 'Fixed to one centre',
      efficiency: '95',
    });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(400);
    await operatorProfilePage.toastVisible(
      /Overall efficiency can only be set where the home work centre is time_based/,
    );
    await operatorProfilePage.expectOnNewForm();
  });

  // ── View ──────────────────────────────────────────────────────────────

  test('TC-VOQ-01 Profile header', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrm'), 'TC-VOQ-01 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    await expect(operatorProfilePage.locators.backLink.first()).toBeVisible();
    await operatorProfilePage.expectHeaderBadge(rich.employeeNo);
    expect(await operatorProfilePage.headingText()).toBe(rich.name);
    await operatorProfilePage.expectHeaderBadge('Fixed to one centre');
    await expect(operatorProfilePage.locators.editProfileButton).toBeVisible();
    await operatorProfilePage.expectMetaLine(
      `${rich.department} · home work centre ${TIME_BASED_CENTRE}`,
    );
  });

  test('TC-VOQ-02 Profile details are read-only', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrn'), 'TC-VOQ-02 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    const expected: Record<string, string> = {
      Operator: `${rich.employeeNo} · ${rich.name}`,
      Department: rich.department,
      'Home work centre': TIME_BASED_CENTRE,
      'Usual shift': rich.usualShift,
      'Skill grade': rich.skillGrade,
      Deployment: 'Fixed to one centre',
      Efficiency: '95%',
      'On the floor since': rich.onFloorSince,
      Active: 'Active',
    };
    for (const [label, value] of Object.entries(expected))
      expect(await operatorProfilePage.detail(label), label).toBe(value);
    await operatorProfilePage.expectFieldHint(
      'Fixed once the profile exists — this record IS the employee',
    );
    await operatorProfilePage.expectDetailsReadOnly();
  });

  test('TC-VOQ-03 Qualifications count matches the rows', async ({
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdrp'), 'TC-VOQ-03 (ClickUp)');
    // Since z941abzdat (Closed 2026-10-23) a retired qualification is listed
    // but not counted: "Qualifications (N)" = the active rows.
    const active = rich.qualifications.filter((q) => q.active).length;
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    expect(await operatorProfilePage.qualificationCount()).toBe(active);
    expect(await operatorProfilePage.qualificationRows()).toHaveLength(rich.qualifications.length);
    await operatorsListPage.findOperator(rich.employeeNo);
    expect(await operatorsListPage.operatorCell(rich.employeeNo, 'Certifications')).toMatch(
      new RegExp(`^${active}$`),
    );
  });

  test('TC-VOQ-04 Read-only qualifications table', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrq'), 'TC-VOQ-04 (ClickUp)');
    // Re-checks z941abxvxb (Closed): the old table had no Valid until column.
    await operatorProfilePage.openView(rich.id);
    expect(await operatorProfilePage.qualificationHeaders()).toEqual(VIEW_COLUMNS);
    await operatorProfilePage.expectQualificationsReadOnly();
  });

  test('TC-VOQ-05 Each row is held on a task', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrr'), 'TC-VOQ-05 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    for (const q of rich.qualifications) {
      const row = await operatorProfilePage.qualification(q.code);
      // Activity qualifications are gone from the screen (2026-11-20): every row is held on a task.
      expect(row.Activity, `${q.code}: no Activity column`).toBeUndefined();
      expect(row.Task, `${q.code}: code with its name`).toMatch(new RegExp(`^${q.code}\\s+\\S`));
    }
  });

  test('TC-VOQ-06 Qualified, Lapsed and Not qualified states', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdrt'), 'TC-VOQ-06 (ClickUp)');
    // Re-checks z941abwdzc (Closed): a past Valid until didn't read "Lapsed".
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    for (const q of rich.qualifications.filter((x) => x.active))
      expect((await operatorProfilePage.qualification(q.code)).Qualified, q.code).toBe(q.state);
  });

  test('TC-VOQ-07 Blank Valid until reads Does not expire', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdu6'), 'TC-VOQ-07 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    for (const q of rich.qualifications)
      expect((await operatorProfilePage.qualification(q.code))['Valid until'], q.code).toBe(
        q.validUntil,
      );
  });

  test('TC-VOQ-08 Search qualifications', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdu7'), 'TC-VOQ-08 (ClickUp)');
    const count = rich.qualifications.filter((q) => q.active).length;
    const lapsed = rich.qualifications.find((q) => q.state === 'Lapsed')!.code;
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.searchQualifications(lapsed);
    await expect.poll(async () => (await operatorProfilePage.qualificationRows()).length).toBe(1);
    await operatorProfilePage.expectQualificationRow(lapsed);
    await operatorProfilePage.searchQualifications('IE assessment');
    await expect
      .poll(async () => (await operatorProfilePage.qualificationColumn('Assessed by')).join())
      .toBe('IE assessment');
    await operatorProfilePage.searchQualifications(`zz-no-such-${Date.now()}`);
    await operatorProfilePage.expectQualificationsEmptyMessage(
      'No qualifications match the search.',
    );
    expect(await operatorProfilePage.qualificationCount(), 'the heading keeps its count').toBe(
      count,
    );
  });

  test('TC-VOQ-09 Sort qualifications', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdqt'), 'TC-VOQ-09 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    await test.step('Valid until: dates in order, "Does not expire" at one end', async () => {
      for (const direction of ['ascending', 'descending'] as const) {
        await operatorProfilePage.sortQualificationsBy('Valid until');
        await expect(async () => {
          const cells = await operatorProfilePage.qualificationColumn('Valid until');
          const dates = cells.filter((c) => c !== 'Does not expire');
          const sorted = [...dates].sort();
          expect(dates).toEqual(direction === 'ascending' ? sorted : sorted.reverse());
          const firstNever = cells.indexOf('Does not expire');
          const lastNever = cells.lastIndexOf('Does not expire');
          expect(
            firstNever === 0 || lastNever === cells.length - 1,
            '"Does not expire" grouped at one end',
          ).toBe(true);
          expect(lastNever - firstNever + 1).toBe(cells.length - dates.length);
        }).toPass({ timeout: 15_000 });
      }
    });
    await test.step('Efficiency: ascending, then descending', async () => {
      for (const direction of ['ascending', 'descending'] as const) {
        await operatorProfilePage.sortQualificationsBy('Efficiency');
        await expect(async () => {
          const values = (await operatorProfilePage.qualificationColumn('Efficiency')).map(percent);
          const sorted = [...values].sort((a, b) => a - b);
          expect(values).toEqual(direction === 'ascending' ? sorted : sorted.reverse());
        }).toPass({ timeout: 15_000 });
      }
    });
  });

  test('TC-VOQ-10 Page through many qualifications', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdu8'), 'TC-VOQ-10 (ClickUp)');
    const rows = rich.qualifications.length;
    await operatorProfilePage.openView(rich.id);
    expect(await operatorProfilePage.qualificationsRowsPerPage()).toBe('10');
    await operatorProfilePage.expectQualificationsShowing(
      new RegExp(`^Showing 1 to 10 of ${rows}`),
    );
    await operatorProfilePage.nextQualificationsPage();
    await operatorProfilePage.expectQualificationsShowing(
      new RegExp(`^Showing 11 to ${rows} of ${rows}`),
    );
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    await operatorProfilePage.expectQualificationsShowing(
      new RegExp(`^Showing 1 to ${rows} of ${rows}`),
    );
  });

  test('TC-VOQ-11 Retired qualifications stay visible', async ({
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdqw'), 'TC-VOQ-11 (ClickUp)');
    // z941abzdat (Closed 2026-10-23): a retired row still read "Qualified" and
    // counted as held. It's listed with Active "No", left out of the counts.
    await allure.tms(cu('z941abzdat'), 'TC-VOQ-11 bug (ClickUp)');
    const retired = rich.qualifications.find((q) => !q.active)!;
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    const row = await operatorProfilePage.qualification(retired.code);
    expect(row.Active).toBe('No');
    expect(row.Qualified).not.toBe('Qualified');
    await operatorsListPage.findOperator(rich.employeeNo);
    expect(await operatorsListPage.operatorCell(rich.employeeNo, 'Qualified')).toBe(
      rollUps(rich.qualifications).qualified,
    );
  });

  test('TC-VOQ-12 Ownership note', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdu9'), 'TC-VOQ-12 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    expect(await operatorProfilePage.ownershipNote()).toBe(OWNERSHIP_NOTE);
  });

  // ── Edit profile ──────────────────────────────────────────────────────

  test('TC-EOQ-01 Edit opens with the profile filled in', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdqz'), 'TC-EOQ-01 (ClickUp)');
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.startEditing();
    await expect(
      operatorProfilePage.locators.text(
        'Saves in place. Retired profiles still resolve for anything that already references them.',
      ),
    ).toBeVisible();
    await operatorProfilePage.expectEmployeeLocked(
      'Fixed once the profile exists — this record IS the employee',
    );
    // The locked picker shows the employee number (dev, 2026-11-20).
    expect(await operatorProfilePage.fieldValue('Employee')).toMatch(
      new RegExp(`^${rich.employeeNo}\\b`),
    );
    expect(await operatorProfilePage.fieldValue('Home work centre')).toMatch(
      new RegExp(`^${TIME_BASED_CENTRE} · `),
    );
    expect(await operatorProfilePage.fieldValue('Usual shift')).toBe(rich.usualShift);
    expect(await operatorProfilePage.fieldValue('Skill grade')).toBe(rich.skillGrade);
    expect(await operatorProfilePage.fieldValue('Deployment')).toBe('Fixed to one centre');
    expect(await operatorProfilePage.efficiencyValue()).toBe('95');
    await operatorProfilePage.expectChangesStatus('No changes');
  });

  test('TC-EOQ-02 Change profile fields and save', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdr1'), 'TC-EOQ-02 (ClickUp)');
    const operator = await createQaOperator(page);
    await operatorProfilePage.startEditing();
    const centre = (await operatorProfilePage.optionsOf('Home work centre')).find(
      (o) => o !== '—' && !o.startsWith(`${CYCLE_BASED_CENTRE} `),
    )!;
    const shift = (await operatorProfilePage.optionsOf('Usual shift')).find(
      (o) => o !== 'Single shift',
    );
    await operatorProfilePage.fill({
      homeWorkCentre: centre,
      ...(shift ? { usualShift: shift } : {}),
      skillGrade: /^S3 — /,
    });
    await operatorProfilePage.expectChangesStatus('Unsaved changes');
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(200);
    await operatorProfilePage.toastVisible('Operator updated.');
    await operatorProfilePage.done();
    const code = centre.split(' · ')[0]!;
    expect(await operatorProfilePage.detail('Home work centre')).toBe(code);
    expect(await operatorProfilePage.detail('Skill grade')).toBe('S3 — proficient');
    if (shift) expect(await operatorProfilePage.detail('Usual shift')).toBe(shift);
    await operatorsListPage.findOperator(operator.employeeNo);
    expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Home work centre')).toBe(
      code,
    );
    expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Skill grade')).toBe(
      'S3 — proficient',
    );
  });

  test('TC-EOQ-03 Changing deployment moves the operator between tabs', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdua'), 'TC-EOQ-03 (ClickUp)');
    const operator = await createQaOperator(page);
    await operatorProfilePage.startEditing();
    await operatorProfilePage.fill({ deployment: 'Floating across the department' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(200);
    await operatorProfilePage.done();
    await operatorProfilePage.expectHeaderBadge('Floating across the department');
    await operatorsListPage.findOperator(operator.employeeNo);
    await operatorsListPage.selectTab('Fixed');
    await operatorsListPage.expectNoOperatorRow(operator.employeeNo);
    await operatorsListPage.selectTab('Floating');
    await operatorsListPage.expectOperatorRow(operator.employeeNo);
  });

  test('TC-EOQ-04 Retire a profile with the Active switch', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdub'), 'TC-EOQ-04 (ClickUp)');
    const operator = await createQaOperator(page);
    await operatorProfilePage.startEditing();
    await operatorProfilePage.fill({ active: false });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(200);
    await operatorProfilePage.done();
    await operatorProfilePage.expectHeaderBadge('Retired');
    expect(await operatorProfilePage.deleteControls()).toBe(0);
    await operatorsListPage.findOperator(operator.employeeNo);
    expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Active')).toBe('Retired');
    await operatorsListPage.openOperator(operator.employeeNo);
    await operatorProfilePage.expectLoaded();
  });

  test('TC-EOQ-05 What a retired profile does to its qualifications', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzduc'), 'TC-EOQ-05 (ClickUp)');
    // Pass on review (2026-10-21): the qualifications stay attached and active.
    const task = heldTasks()[0]!.code;
    const operator = await createQaOperator(page, {}, [
      { task: codeOption(task), efficiency: '90', assessedBy: 'HR system' },
    ]);
    await operatorProfilePage.startEditing();
    await operatorProfilePage.fill({ active: false });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(200);
    await operatorProfilePage.done();
    expect((await operatorProfilePage.qualification(task)).Active).toBe('Yes');
    await operatorsListPage.open();
    await operatorsListPage.expectLoaded();
    await operatorsListPage.expectSearchFindsOperator(task, operator.employeeNo);
    expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Certifications')).toBe('1');
  });

  test('TC-EOQ-06 Cancel discards profile changes', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzduf'), 'TC-EOQ-06 (ClickUp)');
    await operatorProfilePage.openEdit(rich.id);
    const writes = operatorProfilePage.watchWrites();
    await operatorProfilePage.fill({ skillGrade: /^S4 — / });
    await operatorProfilePage.expectChangesStatus('Unsaved changes');
    expect(await operatorProfilePage.cancel('discard'), '"Leave without saving?" asked').toBe(true);
    await operatorProfilePage.expectLoaded();
    expect(await operatorProfilePage.detail('Skill grade')).toBe(rich.skillGrade);
    expect(writes.count(), 'nothing saved').toBe(0);
    writes.stop();
  });

  test('TC-EOQ-07 Leaving with unsaved changes', async ({ operatorProfilePage }) => {
    await allure.tms(cu('z941abzdug'), 'TC-EOQ-07 (ClickUp)');
    await operatorProfilePage.openEdit(rich.id);
    const writes = operatorProfilePage.watchWrites();
    await operatorProfilePage.fill({ skillGrade: /^S1 — / });
    await operatorProfilePage.locators.backLink.first().click();
    expect(await operatorProfilePage.leaveDialogText()).toContain(
      'This operator has changes that are not saved. Leaving now discards them.',
    );
    await operatorProfilePage.locators.keepEditingButton.click();
    expect(await operatorProfilePage.fieldValue('Skill grade')).toBe('S1 — entry level');
    expect(await operatorProfilePage.cancel('discard')).toBe(true);
    expect(writes.count(), 'nothing saved').toBe(0);
    writes.stop();
  });

  test('TC-EOQ-08 Clear Overall efficiency', async ({
    page,
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzduh'), 'TC-EOQ-08 (ClickUp)');
    const operator = await createQaOperator(page, {
      homeWorkCentreSearch: TIME_BASED_CENTRE,
      homeWorkCentre: new RegExp(`^${TIME_BASED_CENTRE} · `),
      efficiency: '95',
    });
    await operatorProfilePage.startEditing();
    await operatorProfilePage.fill({ efficiency: '' });
    expect((await operatorProfilePage.saveAndContinue()).status).toBe(200);
    await operatorProfilePage.done();
    expect(await operatorProfilePage.detail('Efficiency')).toBe('Machine-paced');
    await operatorsListPage.findOperator(operator.employeeNo);
    expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Efficiency')).toBe(
      'Machine-paced',
    );
  });

  // ── Edit qualifications inline (one operator, in order) ───────────────

  test.describe('Edit qualifications', () => {
    test.describe.configure({ mode: 'serial' });

    let operator: QaOperator;
    let tasks: string[] = [];
    let activities: string[] = [];
    const ta = () => tasks[0]!;
    const tb = () => tasks[1]!;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(300_000);
      const page = await setupPage(browser);
      page.setDefaultTimeout(30_000);
      page.setDefaultNavigationTimeout(120_000);
      operator = await createQaOperator(page);
      const form = new OperatorProfilePage(page);
      await form.openEdit(operator.id);
      await form.openQualificationsStep();
      tasks = (await offeredTasks(form)).sort((a, b) =>
        a.startsWith('SEW-') === b.startsWith('SEW-') ? 0 : a.startsWith('SEW-') ? -1 : 1,
      );
      activities = await offeredActivities(form);
      await page.close();
    });

    test.beforeEach(async ({ operatorProfilePage }) => {
      await operatorProfilePage.openEdit(operator.id);
      await operatorProfilePage.openQualificationsStep();
    });

    test('TC-EQQ-02 Add a task qualification; it saves on its own', async ({
      operatorsListPage,
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzduk'), 'TC-EQQ-02 (ClickUp)');
      const before = await operatorProfilePage.qualificationCount();
      await operatorProfilePage.fillQualification({
        task: codeOption(ta()),
        efficiency: '88',
        assessedBy: 'IE assessment',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
      await operatorProfilePage.toastVisible('Qualification added');
      await operatorProfilePage.expectQualificationCount(before + 1);
      await operatorsListPage.findOperator(operator.employeeNo);
      await operatorsListPage.toggleQualifications(operator.employeeNo);
      await operatorsListPage.expectExpanded();
      const rows = (await operatorsListPage.expandedRows()).map((c) => c[0]);
      expect(rows).toContain(ta());
    });

    test('TC-EQQ-01 The edit table has an add row and row actions', async ({
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzduj'), 'TC-EQQ-01 (ClickUp)');
      expect(await operatorProfilePage.qualificationHeaders()).toEqual([
        ...VIEW_COLUMNS,
        'Actions',
      ]);
      expect(await operatorProfilePage.rowValue('Activity')).toBe('—');
      expect(await operatorProfilePage.rowValue('Task')).toBe('—');
      expect(await operatorProfilePage.rowValue('Assessed by')).toBe('Select…');
      expect(await operatorProfilePage.rowEfficiency()).toBe('');
      expect(await operatorProfilePage.rowValidUntil()).toBe('Does not expire');
      const today = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      await expect(
        operatorProfilePage.locators.rowDate(operatorProfilePage.locators.addRow, 'Last assessed'),
      ).toContainText(today);
      for (const name of ['Qualified', 'Active'] as const)
        await expect(
          operatorProfilePage.locators.rowSwitch(operatorProfilePage.locators.addRow, name),
        ).toHaveAttribute('aria-checked', 'true');
      await expect(
        operatorProfilePage.locators
          .qualificationRow(ta())
          .getByRole('button', { name: 'Edit qualification' }),
      ).toBeVisible();
    });

    test('TC-EQQ-03 Add an activity qualification', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdum'), 'TC-EQQ-03 (ClickUp)');
      test.skip(activities.length === 0, NO_ACTIVITIES);
      const activity = activities.find((a) => a.startsWith('WASH-')) ?? activities[0]!;
      await operatorProfilePage.fillQualification({
        activity: codeOption(activity),
        efficiency: '100',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
      const row = await operatorProfilePage.qualification(activity);
      expect(row.Activity).toMatch(new RegExp(`^${activity}\\s+\\S`));
      expect(row.Task).toBe('—');
    });

    test("TC-EQQ-04 Activity and task can't both be set", async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdun'), 'TC-EQQ-04 (ClickUp)');
      test.skip(activities.length === 0, NO_ACTIVITIES);
      await operatorProfilePage.fillQualification({ task: codeOption(tb()) });
      await operatorProfilePage.fillQualification({ activity: codeOption(activities[0]!) });
      expect(await operatorProfilePage.rowValue('Task')).toBe('—');
      await operatorProfilePage.fillQualification({ task: codeOption(tb()) });
      expect(await operatorProfilePage.rowValue('Activity')).toBe('—');
      await operatorProfilePage.clearAddRow();
    });

    test('TC-EQQ-05 Adding with no task is refused', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdup'), 'TC-EQQ-05 (ClickUp)');
      const before = await operatorProfilePage.qualificationCount();
      await operatorProfilePage.fillQualification({ efficiency: '80', assessedBy: 'HR system' });
      if (await operatorProfilePage.isAddEnabled()) {
        expect(await operatorProfilePage.addQualification(), 'nothing sent').toBeNull();
        expect(await operatorProfilePage.rowMessages()).toContain('Required'); // was "Pick either a task or an activity" before 2026-11-20
      }
      await operatorProfilePage.expectQualificationCount(before);
      await operatorProfilePage.clearAddRow();
    });

    test('TC-EQQ-06 Efficiency, Assessed by and Last assessed are required', async ({
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzduq'), 'TC-EQQ-06 (ClickUp)');
      await operatorProfilePage.fillQualification({ task: codeOption(tb()) });
      expect(await operatorProfilePage.addQualification(), 'task only: nothing sent').toBeNull();
      expect(await operatorProfilePage.rowMessages()).toEqual(['Required', 'Required']);
      await operatorProfilePage.fillQualification({
        efficiency: '90',
        assessedBy: 'HR system',
        clearLastAssessed: true,
      });
      expect(
        await operatorProfilePage.addQualification(),
        'no Last assessed: nothing sent',
      ).toBeNull();
      expect(await operatorProfilePage.rowMessages()).toEqual(['Required']);
      await operatorProfilePage.clearAddRow();
    });

    test('TC-EQQ-07 The same task twice is refused', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdur'), 'TC-EQQ-07 (ClickUp)');
      const before = await operatorProfilePage.qualificationCount();
      await operatorProfilePage.fillQualification({
        task: codeOption(ta()),
        efficiency: '90',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(409);
      expect(await operatorProfilePage.rowMessages()).toContain(
        `${operator.employeeNo} already has a qualification for ${ta()}`,
      );
      await operatorProfilePage.expectQualificationCount(before);
      await operatorProfilePage.clearAddRow();
    });

    test('TC-EQQ-08 Edit an existing qualification inline', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzduu'), 'TC-EQQ-08 (ClickUp)');
      await operatorProfilePage.startQualificationEdit(ta());
      await operatorProfilePage.fillQualification({ efficiency: '72' });
      expect(await operatorProfilePage.saveQualificationRow()).toBe(200);
      await operatorProfilePage.toastVisible('Qualification saved');
      expect((await operatorProfilePage.qualification(ta())).Efficiency).toBe('72%');
      // Saved by the row's own Save: step 2 has no profile "Save changes" to press.
      await expect(operatorProfilePage.locators.editingRow).toHaveCount(0);
    });

    test('TC-EQQ-09 Cancel an inline edit', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdr5'), 'TC-EQQ-09 (ClickUp)');
      const writes = operatorProfilePage.watchWrites();
      await operatorProfilePage.startQualificationEdit(ta());
      await operatorProfilePage.fillQualification({ efficiency: '66' });
      await operatorProfilePage.cancelQualificationRow();
      expect((await operatorProfilePage.qualification(ta())).Efficiency).toBe('72%');
      expect(writes.count()).toBe(0);
      writes.stop();
    });

    test('TC-EQQ-10 Inline edit keeps the rules', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzduv'), 'TC-EQQ-10 (ClickUp)');
      await operatorProfilePage.fillQualification({
        task: codeOption(tb()),
        efficiency: '80',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
      await operatorProfilePage.startQualificationEdit(tb());
      await operatorProfilePage.fillQualification({ task: codeOption(ta()) });
      expect(await operatorProfilePage.saveQualificationRow()).toBe(409);
      expect(await operatorProfilePage.rowMessages()).toContain(
        `${operator.employeeNo} already has a qualification for ${ta()}`,
      );
      if (activities.length > 0) {
        await operatorProfilePage.fillQualification({ activity: codeOption(activities[0]!) });
        expect(await operatorProfilePage.rowValue('Task')).toBe('—');
      }
      await operatorProfilePage.cancelQualificationRow();
      await operatorProfilePage.expectQualificationRow(tb());
    });

    test('TC-EQQ-11 Retire a qualification with its Active switch', async ({
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzduw'), 'TC-EQQ-11 (ClickUp)');
      await operatorProfilePage.startQualificationEdit(tb());
      await operatorProfilePage.fillQualification({ active: false });
      expect(await operatorProfilePage.saveQualificationRow()).toBe(200);
      expect((await operatorProfilePage.qualification(tb())).Active).toBe('No');
      expect(await operatorProfilePage.deleteControls()).toBe(0);
    });

    test('TC-EQQ-12 Re-activate a retired qualification', async ({
      operatorsListPage,
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzdr6'), 'TC-EQQ-12 (ClickUp)');
      const before = await operatorProfilePage.qualificationCount();
      await operatorProfilePage.startQualificationEdit(tb());
      await operatorProfilePage.fillQualification({ active: true });
      expect(await operatorProfilePage.saveQualificationRow()).toBe(200);
      expect((await operatorProfilePage.qualification(tb())).Active).toBe('Yes');
      await operatorProfilePage.expectQualificationCount(before + 1);
      await operatorsListPage.findOperator(operator.employeeNo);
      expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Certifications')).toMatch(
        new RegExp(`^${before + 1}$`),
      );
    });

    test('TC-EQQ-13 Qualified switch and Valid until drive the state', async ({
      operatorsListPage,
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzdux'), 'TC-EQQ-13 (ClickUp)');
      const steps: {
        values: Parameters<typeof operatorProfilePage.fillQualification>[0];
        state: string;
      }[] = [
        { values: { qualified: false }, state: 'Not qualified' },
        { values: { qualified: true, validUntil: { day: 1, monthOffset: -1 } }, state: 'Lapsed' },
        { values: { validUntil: 'clear' }, state: 'Qualified' },
      ];
      for (const { values, state } of steps) {
        await test.step(state, async () => {
          await operatorProfilePage.startQualificationEdit(ta());
          await operatorProfilePage.fillQualification(values);
          expect(await operatorProfilePage.saveQualificationRow()).toBe(200);
          expect((await operatorProfilePage.qualification(ta())).Qualified).toBe(state);
          if (state === 'Lapsed') {
            await operatorsListPage.findOperator(operator.employeeNo);
            expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Qualified')).toMatch(
              / · 1 lapsed$/,
            );
            await operatorProfilePage.openEdit(operator.id);
            await operatorProfilePage.openQualificationsStep();
          }
        });
      }
      expect((await operatorProfilePage.qualification(ta()))['Valid until']).toBe(
        'Does not expire',
      );
    });

    test('TC-EQQ-14 Valid until picker', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzduy'), 'TC-EQQ-14 (ClickUp)');
      expect(await operatorProfilePage.rowValidUntil()).toBe('Does not expire');
      await operatorProfilePage.fillQualification({ validUntil: { day: 28, monthOffset: 1 } });
      const label = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        28,
      ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(await operatorProfilePage.rowValidUntil()).toContain(label);
      await operatorProfilePage.fillQualification({ validUntil: 'clear' });
      expect(await operatorProfilePage.rowValidUntil()).toBe('Does not expire');
      await operatorProfilePage.clearAddRow();
    });

    test('TC-EQQ-15 Efficiency and Measured minutes values', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzduz'), 'TC-EQQ-15 (ClickUp)');
      const tc = tasks[2]!;
      await operatorProfilePage.fillQualification({
        task: codeOption(tc),
        efficiency: '102',
        measuredMinutes: '12.5',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
      const row = await operatorProfilePage.qualification(tc);
      expect(row.Efficiency).toBe('102%');
      expect(row['Measured minutes']).toBe('12.5');
      await test.step('out-of-range and non-numeric input is refused', async () => {
        await operatorProfilePage.fillQualification({
          task: codeOption(tasks[3]!),
          assessedBy: 'HR system',
        });
        expect(await operatorProfilePage.typeInRow('Efficiency', 'abc'), 'no letters').toBe('');
        expect(await operatorProfilePage.typeInRow('Efficiency', '5'), 'typed').toBe('5');
        expect(await operatorProfilePage.addQualification(), '5%: nothing sent').toBeNull();
        expect(await operatorProfilePage.rowMessages()).toContain('Between 10% and 150%');
        await operatorProfilePage.typeInRow('Efficiency', '90');
        await operatorProfilePage.typeInRow('Measured minutes', '0');
        expect(await operatorProfilePage.addQualification(), '0 min: nothing sent').toBeNull();
        expect(await operatorProfilePage.rowMessages()).toContain('Must be greater than 0');
        await operatorProfilePage.clearAddRow();
      });
    });

    test("TC-EQQ-16 A pending add row and the profile's Save changes", async ({
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzdv0'), 'TC-EQQ-16 (ClickUp)');
      // Stepped form: step 2's Done stands in for the old "Save changes".
      await operatorProfilePage.fillQualification({
        task: codeOption(tasks[3]!),
        efficiency: '90',
        assessedBy: 'HR system',
      });
      const writes = operatorProfilePage.watchWrites();
      await operatorProfilePage.doneRefused(PENDING_ROW);
      expect(writes.count()).toBe(0);
      writes.stop();
      await operatorProfilePage.clearAddRow();
    });

    test('TC-EQQ-17 Cancel after adding qualifications', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdv1'), 'TC-EQQ-17 (ClickUp)');
      const [added, pending] = [tasks[3]!, tasks[4]!];
      await operatorProfilePage.fillQualification({
        task: codeOption(added),
        efficiency: '90',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
      await operatorProfilePage.fillQualification({
        task: codeOption(pending),
        efficiency: '90',
        assessedBy: 'HR system',
      });
      await operatorProfilePage.cancel('discard');
      await operatorProfilePage.openView(operator.id);
      await operatorProfilePage.setQualificationsRowsPerPage(25);
      await operatorProfilePage.expectQualificationRow(added);
      await operatorProfilePage.expectNoQualificationRow(pending);
    });

    test("TC-EQQ-18 Activity and task pickers aren't limited to the operator's department", async ({
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzdv2'), 'TC-EQQ-18 (ClickUp)');
      // Pass on review (2026-10-21): unscoped pickers are fine. Checks every
      // active task and activity is offered to this Sewing operator.
      const lookups = await operatorProfilePage.openQualificationsWithLookups(operator.id);
      const offered = await operatorProfilePage.rowOptions('Task');
      for (const t of lookups.tasks.filter((x) => x.active !== false))
        expect(offered, t.code).toContain(`${t.code} ${t.label}`);
      // No Activity picker on the screen any more (2026-11-20): nothing to check there.
      const acts = await operatorProfilePage.rowOptions('Activity');
      if (acts.length > 0) {
        for (const a of lookups.activities.filter((x) => x.active !== false))
          expect(acts, a.code).toContain(`${a.code} ${a.label}`);
      }
    });

    test("TC-EQQ-19 Retired activities and tasks aren't offered", async ({
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzdv3'), 'TC-EQQ-19 (ClickUp)');
      const lookups = await operatorProfilePage.openQualificationsWithLookups(operator.id);
      const retired = (items: { code: string; active?: boolean }[]) =>
        new Set(items.filter((i) => i.active === false).map((i) => i.code));
      const codes = (options: string[]) => options.map((o) => o.split(' ')[0]!);
      const tasksOffered = codes(await operatorProfilePage.rowOptions('Task'));
      expect(tasksOffered.filter((c) => retired(lookups.tasks).has(c))).toEqual([]);
      const activitiesOffered = codes(await operatorProfilePage.rowOptions('Activity'));
      expect(activitiesOffered.filter((c) => retired(lookups.activities).has(c))).toEqual([]);
    });

    test('TC-EQQ-20 Counts update without a reload', async ({
      operatorsListPage,
      operatorProfilePage,
    }) => {
      await allure.tms(cu('z941abzdva'), 'TC-EQQ-20 (ClickUp)');
      const before = await operatorProfilePage.qualificationCount();
      await operatorProfilePage.fillQualification({
        task: codeOption(tasks[5]!),
        efficiency: '90',
        assessedBy: 'HR system',
      });
      expect(await operatorProfilePage.addQualification()).toBe(201);
      await operatorProfilePage.expectQualificationCount(before + 1);
      await operatorsListPage.findOperator(operator.employeeNo);
      expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Certifications')).toMatch(
        new RegExp(`^${before + 1}$`),
      );
    });

    test('TC-EQQ-21 Search, sort and paging in Edit', async ({ operatorProfilePage }) => {
      await allure.tms(cu('z941abzdvb'), 'TC-EQQ-21 (ClickUp)');
      await operatorProfilePage.searchQualifications(ta());
      await expect.poll(async () => (await operatorProfilePage.qualificationRows()).length).toBe(1);
      await operatorProfilePage.expectQualificationRow(ta());
      await expect(operatorProfilePage.locators.addRow).toBeVisible();
      await operatorProfilePage.searchQualifications('');
      await operatorProfilePage.sortQualificationsBy('Efficiency');
      await expect(async () => {
        const values = (await operatorProfilePage.qualificationColumn('Efficiency')).map(percent);
        expect(values).toEqual([...values].sort((a, b) => a - b));
      }).toPass({ timeout: 15_000 });
      await expect(
        operatorProfilePage.locators.qualificationsTable.getByRole('row').nth(1),
      ).toHaveAttribute('data-row-key', '__add');
    });
  });

  // ── Cross-screen, access & language ───────────────────────────────────

  test('TC-XOQ-01 The old Qualifications route is gone', async ({ operatorsListPage }) => {
    await allure.tms(cu('z941abzdvc'), 'TC-XOQ-01 (ClickUp)');
    for (const path of [
      '/planning/master-data/qualifications',
      '/planning/master-data/qualifications/new',
      `/planning/master-data/qualifications/${rich.id}`,
    ]) {
      await test.step(path, async () => {
        await operatorsListPage.gotoAuthenticated(path);
        await operatorsListPage.expectNotFoundPage();
      });
    }
    await operatorsListPage.openFromMasterDataLanding();
    await operatorsListPage.expectNoOldQualificationsLink();
  });

  test('TC-XOQ-02 Every existing qualification can still be reached', async ({
    operatorsListPage,
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdvd'), 'TC-XOQ-02 (ClickUp)');
    // Pass on review (2026-10-16): qualifications held by employees without a
    // profile (the old screen's data) aren't carried over; they're created
    // fresh here. So this checks every qualification created here is reachable
    // from the list (search + expansion) and the profile.
    await operatorsListPage.findOperator(rich.employeeNo);
    await operatorsListPage.toggleQualifications(rich.employeeNo);
    await operatorsListPage.expectExpanded();
    const expanded = (await operatorsListPage.expandedRows()).map((c) => c[0]!.split(' ')[0]);
    await operatorProfilePage.openView(rich.id);
    await operatorProfilePage.setQualificationsRowsPerPage(25);
    for (const q of rich.qualifications) {
      expect(expanded, `${q.code} in the list`).toContain(q.code);
      await operatorProfilePage.expectQualificationRow(q.code);
    }
  });

  test('TC-XOQ-03 Qualification-only user can edit qualifications but not the profile', async ({
    page,
    personas,
  }) => {
    await allure.tms(cu('z941abzdve'), 'TC-XOQ-03 (ClickUp)');
    test.skip(!personaCredentials('QUALIFICATION'), personaSkipReason('QUALIFICATION'));
    const task = heldTasks()[0]!.code;
    const operator = await createQaOperator(page);
    await asPersona(personas, 'QUALIFICATION', async (p) => {
      const form = new OperatorProfilePage(p);
      await form.openEdit(operator.id);
      await expect(form.locators.qualificationOnlyNotice).toBeVisible();
      for (const field of ['Home work centre', 'Usual shift', 'Skill grade', 'Deployment'])
        await expect(p.getByRole('combobox', { name: field, exact: true })).toHaveCount(0);
      await form.openQualificationsStep();
      await form.fillQualification({
        task: codeOption(task),
        efficiency: '85',
        assessedBy: 'HR system',
      });
      expect(await form.addQualification()).toBe(201);
      await form.startQualificationEdit(task);
      await form.fillQualification({ efficiency: '74' });
      expect(await form.saveQualificationRow()).toBe(200);
      expect((await form.qualification(task)).Efficiency).toBe('74%');
    });
  });

  test('TC-XOQ-05 Read-only user', async ({ personas }) => {
    await allure.tms(cu('z941abzdvg'), 'TC-XOQ-05 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (p) => {
      const list = new OperatorsListPage(p);
      const profile = new OperatorProfilePage(p);
      await list.open();
      await list.expectLoaded();
      await list.expectNewUnavailable();
      await profile.gotoAuthenticated(`/planning/master-data/operators/${rich.id}`);
      await profile.expectNoEditProfile();
      await profile.expectQualificationsReadOnly();
      for (const path of [
        '/planning/master-data/operators/new',
        `/planning/master-data/operators/${rich.id}/edit`,
      ]) {
        await test.step(path, async () => {
          await profile.gotoAuthenticated(path);
          await expect(list.grid.accessRestricted.first()).toBeVisible({ timeout: 60_000 });
        });
      }
    });
  });

  test('TC-XOQ-06 No-access user', async ({ personas }) => {
    await allure.tms(cu('z941abzdvh'), 'TC-XOQ-06 (ClickUp)');
    test.skip(!personaCredentials('NOACCESS'), personaSkipReason('NOACCESS'));
    await asPersona(personas, 'NOACCESS', async (p) => {
      const list = new OperatorsListPage(p);
      await list.open();
      await list.expectAccessRestricted();
    });
  });

  test('TC-XOQ-07 Vietnamese', async ({ browser }) => {
    await allure.tms(cu('z941abzdvj'), 'TC-XOQ-07 (ClickUp)');
    // z941abzdau (Closed 2026-10-23): "Pick date" stayed English on the form.
    await allure.tms(cu('z941abzdau'), 'TC-XOQ-07 bug (ClickUp)');
    // The language is kept per browser: a page of its own, closed afterwards.
    const page = await setupPage(browser);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(120_000);
    try {
      const list = new OperatorsListPage(page);
      const form = new OperatorProfilePage(page);
      await list.open();
      await list.expectLoaded();
      await new ShellHeaderPage(page).changeLanguage('Vietnamese');
      await list.gotoDirect();
      await list.expectTitle('Người vận hành & Chứng nhận năng lực');
      await list.search(rich.employeeNo);
      await list.expectOperatorRow(rich.employeeNo);
      await expect(list.locators.operatorRow(rich.employeeNo)).toContainText(rich.name);
      await form.gotoNew();
      await form.expectHeading('Người vận hành mới');
      await form.expectNoEnglishPickDate();
    } finally {
      await page.close();
    }
  });

  test('TC-XOQ-09 Language choice sticks', async ({ browser }) => {
    await allure.tms(cu('z941abzdvk'), 'TC-XOQ-09 (ClickUp)');
    const page = await setupPage(browser);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(120_000);
    try {
      const list = new OperatorsListPage(page);
      const form = new OperatorProfilePage(page);
      const shell = new ShellHeaderPage(page);
      await list.open();
      await list.expectLoaded();
      await shell.changeLanguage('Vietnamese');
      await form.gotoNew();
      await form.expectHeading('Người vận hành mới');
      await page.reload();
      await form.expectHeading('Người vận hành mới');
      await list.gotoDirect();
      await list.expectTitle('Người vận hành & Chứng nhận năng lực');
      await shell.changeLanguage('English');
      await form.gotoNew();
      await form.expectHeading('New operator');
    } finally {
      await page.close();
    }
  });

  test('TC-XOQ-10 Department change in Employees shows up live', async ({
    page,
    operatorsListPage,
  }) => {
    await allure.tms(cu('z941abzdvm'), 'TC-XOQ-10 (ClickUp)');
    const operator = await createQaOperator(page);
    await operatorsListPage.findOperator(operator.employeeNo);
    expect(await operatorsListPage.operatorCell(operator.employeeNo, 'Department')).toBe(
      operator.department,
    );
    const moved = await moveQaEmployee(page, operator);
    test.skip(moved === null, 'The Employees department picker offers only one department here');
    // The list is a fresh load of the operators: poll in case the department follows a moment later.
    await expect
      .poll(
        async () => {
          await operatorsListPage.findOperator(operator.employeeNo);
          return operatorsListPage.operatorCell(operator.employeeNo, 'Department');
        },
        { timeout: 90_000, intervals: [5_000, 10_000] },
      )
      .toBe(moved);
  });

  test("TC-XOQ-12 Footer actions aren't covered by the Ask FloorOS AI button", async ({
    operatorProfilePage,
  }) => {
    await allure.tms(cu('z941abzdvp'), 'TC-XOQ-12 (ClickUp)');
    // Pass on review (2026-10-21): the floating AI button covers the right of
    // the footer's primary button, but its left part works. This checks the
    // button takes a click (the form validates) and records the overlap.
    await operatorProfilePage.openNew();
    const clear = await operatorProfilePage.isUnobstructedAtCentre('Save & continue');
    test.info().annotations.push({
      type: 'observation',
      description: `"Save & continue" ${clear ? 'is' : 'is not'} clear of the AI button at its centre`,
    });
    expect((await operatorProfilePage.saveAndContinue()).status).toBeNull();
    expect(await operatorProfilePage.fieldMessage('Deployment')).toBe('Required');
  });
});
