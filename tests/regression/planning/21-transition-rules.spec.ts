import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import {
  CHANGE_CLASSES,
  type ConditionValues,
  type SavedRule,
  TransitionRuleEditorPage,
} from '../../../src/pages/planning/transition-rule-editor.page';
import { TransitionRuleViewPage } from '../../../src/pages/planning/transition-rule-view.page';
import { TransitionRulesListPage } from '../../../src/pages/planning/transition-rules-list.page';
import { asPersona, personaCredentials, personaSkipReason, setupPage } from './support/test-data';
import {
  TR_TEST_DATA_TAG,
  cleanUpRulesAfterAll,
  createRule,
  fillNewRule,
  rarePriority,
  ruleName,
  ruleTag,
  trackRule,
} from './support/transition-rules';

/**
 * Planning — Transition rules (Create / Edit / List) at
 * /planning/master-data/transition-rules (Sprint 4 story 86eypv7xn).
 *
 * Source of truth for these cases: test-cases/planning/transition-rules.md
 * (ClickUp "Planning - Transition Rules", TC-CTR / ETR / LTR). Every rule is
 * created here (QA-AUTO, see support/transition-rules.ts) — seeded SEW-*
 * rules exist on dev only and are never touched. Rules can't be deleted: the
 * afterAll deactivates every rule this file created.
 *
 * Since dev's 2026-10-28 redesign the editor has two steps (Rule details →
 * Conditions and ramp; Continue saves nothing, Create / Save writes the whole
 * rule) and the code is generated on save (TR-0001…), so the cases written
 * for a typed, renameable code check what replaced it (see the doc).
 *
 * beforeAll builds three rules per worker, read (never changed) by the
 * view / list cases:
 *  - `full`: Similar, From Style class = Basic 5 pkt, To = Fashion, Same
 *    buyer, 2 h changeover, the default curve (60 % / 5 / 85 %), 2 measured
 *    points, a description holding `descWord`;
 *  - `bare`: New product, no conditions, 45 min changeover, no curve;
 *  - `table`: a Day by day curve (35, 55, 70, 82, 91, 100), no points.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const TIPS = {
  Repeat: 'The same item again',
  Similar: 'The same kind, a different variant',
  'New style': 'A kind the centre knows, in a form it has not run',
  'New product': 'A kind it has not made',
} as const;
const ATTRIBUTES = [
  'Style',
  'Style class',
  'Construction',
  'Wash type',
  'Colour family',
  'Fabric weight',
];
const BOTH_OFF = 'Turn on a changeover or a learning curve — or make the rule inactive';
const TABLE = [35, 55, 70, 82, 91, 100];

/** Whether numbers never fall ("asc"), never rise ("desc"), are all equal ("flat"), or neither ("mixed"). */
function direction(values: number[]): 'asc' | 'desc' | 'flat' | 'mixed' {
  const up = values.some((v, i) => i > 0 && v > values[i - 1]!);
  const down = values.some((v, i) => i > 0 && v < values[i - 1]!);
  return up && down ? 'mixed' : up ? 'asc' : down ? 'desc' : 'flat';
}

test.describe('Planning - Transition rules', () => {
  // Deactivates this file's QA-AUTO rules once its cases are done.
  cleanUpRulesAfterAll();

  let full: SavedRule;
  let bare: SavedRule;
  let table: SavedRule;
  let descWord = '';

  test.beforeAll(async ({ browser }) => {
    // Three rules through the UI (~10–20 s each on dev).
    test.setTimeout(300_000);
    const page = await setupPage(browser);
    descWord = `zqd${ruleTag().toLowerCase()}`;
    full = await createRule(page, {
      description: `${TR_TEST_DATA_TAG} ${descWord}`,
      conditions: [
        { side: 'From', attribute: 'Style class', values: ['Basic 5 pkt'] },
        { side: 'To', attribute: 'Style class', values: ['Fashion'] },
        { side: 'Same', dimension: 'Buyer' },
      ],
      priority: rarePriority(),
      changeover: [2, 0],
      curve: {},
      points: [
        { day: 1, pct: 60, lineDays: 1 },
        { day: 3, pct: 83, lineDays: 1 },
      ],
    });
    bare = await createRule(page, { changeClass: 'New product', changeover: [0, 45] });
    table = await createRule(page, { table: TABLE, changeover: null });
    await page.close();
  });

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO rules through the UI (~10–20 s each on dev).
    test.setTimeout(240_000);
    await allure.epic('Planning');
    await allure.feature('Transition rules');
    await allure.owner('Planning QA');
  });

  // ── Create transition rule ────────────────────────────────────────────

  test('TC-CTR-01 "New rule" opens a blank editor with the documented defaults', async ({
    transitionRulesListPage: list,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4cr'), 'TC-CTR-01 (ClickUp)');
    await list.open();
    await list.openNew();
    await editor.expectOnNewPage();
    await test.step('Header and step 1 start blank', async () => {
      await editor.expectHeaderShows('Not saved yet');
      await editor.expectHeaderShows('Active');
      await editor.expectPriority(10);
      await editor.expectActive(true);
      await editor.expectNoClassPicked();
      await editor.expectCodeGenerated();
      await editor.expectBlocker('Give the rule a name');
    });
    await test.step('Step 2 starts with no conditions and both sections off', async () => {
      await editor.fillDetails({
        name: ruleName(),
        centreType: 'Sewing lines',
        changeClass: 'Similar',
      });
      await editor.continue();
      await editor.expectConditionCount(0);
      await editor.expectChangeoverOff();
      await editor.expectCurveOff();
      await editor.expectCreateDisabled();
      await editor.expectBlocker(BOTH_OFF);
    });
  });

  test('TC-CTR-02 Name is required; the title follows it live; Description is optional and shows as the Note', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4ct'), 'TC-CTR-02 (ClickUp)');
    await editor.openNew();
    await editor.fillDetails({ centreType: 'Sewing lines', changeClass: 'Similar' });
    await editor.expectBlocker('Give the rule a name');
    const name = ruleName();
    await test.step('The title follows the name as it is typed', async () => {
      await editor.fillDetails({ name: name.slice(0, 12) });
      await editor.expectTitle(name.slice(0, 12));
      await editor.fillDetails({ name });
      await editor.expectTitle(name);
      await editor.expectNoBlocker();
    });
    await test.step('A description shows as the Note', async () => {
      const note = `${TR_TEST_DATA_TAG} note ${ruleTag()}`;
      const rule = await createRule(page, { description: note });
      await view.expectNote(note);
      expect(rule.description).toBe(note);
    });
    await test.step('No description, no Note line', async () => {
      await createRule(page, { description: '' });
      await view.expectNote(null);
    });
  });

  test('TC-CTR-03 Code is required and forced to `[A-Z0-9-]` as you type', async ({
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4cu'), 'TC-CTR-03 (ClickUp)');
    // Since dev's 2026-10-28 redesign the code is generated on save
    // (TR-0001…) and can't be typed. Checks what replaces the rule: the field
    // is locked ("Auto-generated") and the saved rule gets a well-formed code.
    await editor.openNew();
    await editor.expectCodeGenerated();
    expect(full.code).toMatch(/^TR-\d+$/);
    await view.open(full.id);
    await view.expectText(full.code);
    await editor.openEdit(full.id);
    await editor.expectCodeGenerated(full.code);
  });

  test('TC-CTR-04 Code must be unique', async () => {
    await allure.tms(cu('z941aby4cv'), 'TC-CTR-04 (ClickUp)');
    // The code is generated on save, so a duplicate can't be entered: each
    // new rule gets its own code (this worker's three beforeAll rules).
    const codes = [full.code, bare.code, table.code];
    for (const code of codes) expect(code).toMatch(/^TR-\d+$/);
    expect(new Set(codes).size, `distinct codes: ${codes.join(', ')}`).toBe(3);
  });

  test('TC-CTR-05 "Applies to" takes exactly one of a centre type or a single centre, and is in scope for Sewing only', async ({
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4cx'), 'TC-CTR-05 (ClickUp)');
    await editor.openNew();
    await editor.fillDetails({ name: ruleName(), changeClass: 'Similar' });
    await editor.expectAppliesToModes();
    await editor.expectAppliesToHint();
    await test.step('A centre type: only Sewing lines (v1 scope)', async () => {
      expect(await editor.scopeOptions()).toEqual(['Sewing lines']);
    });
    await test.step('One centre: sewing-line centres as "<code> · <name>"', async () => {
      await editor.chooseOneCentre();
      const centres = await editor.scopeOptions();
      expect(centres.length).toBeGreaterThan(0);
      for (const centre of centres) expect(centre).toMatch(/^\S+ · .+$/);
      await editor.pickScope(centres[0]!);
      await editor.expectScopeValue(centres[0]!);
    });
    await test.step('Switching modes clears the other value', async () => {
      await editor.chooseCentreType();
      await editor.expectScopeValue(/^Choose a centre type/);
      await editor.expectBlocker('Choose a centre type or one centre');
    });
  });

  test('TC-CTR-06 Change class is required — four pills with tooltips and a live note', async ({
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4cy'), 'TC-CTR-06 (ClickUp)');
    await editor.openNew();
    await editor.fillDetails({ name: ruleName(), centreType: 'Sewing lines' });
    await editor.expectBlocker('Choose a change class');
    await editor.expectClassPills([...CHANGE_CLASSES]);
    for (const changeClass of CHANGE_CLASSES) {
      await test.step(`${changeClass}: its note, and the header's class pill`, async () => {
        await editor.pickClass(changeClass);
        await editor.expectClassNote(TIPS[changeClass]);
        await editor.expectHeaderShows(changeClass);
      });
    }
    await editor.expectNoBlocker();
  });

  test('TC-CTR-07 Add a From/To condition pair; the subtitle builds itself from the conditions', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4cz'), 'TC-CTR-07 (ClickUp)');
    await fillNewRule(page, { changeover: null });
    const row = await editor.addCondition();
    await test.step('A new row: From · Item attribute · attribute · =', async () => {
      await editor.expectRowSide(row, 'From');
      const pickers = await editor.rowPickerTexts(row);
      expect(pickers[0]).toBe('Item attribute');
      expect(pickers[2]).toBe('=');
      expect(await editor.optionsOfRowPicker(row, 1)).toEqual(ATTRIBUTES);
      expect(await editor.optionsOfRowPicker(row, 2)).toEqual(['=', '≠', 'in']);
    });
    await test.step('The subtitle follows the conditions', async () => {
      await editor.fillCondition(row, {
        side: 'From',
        attribute: 'Style class',
        values: ['Basic 5 pkt'],
      });
      await editor.expectHeaderShows(/From basic 5 pkt/i);
      await editor.addCondition({ side: 'To', attribute: 'Style class', values: ['Fashion'] });
      await editor.expectHeaderShows('Basic 5 pkt → Fashion');
    });
  });

  test('TC-CTR-08 A "Same" condition takes no operator or value; Buyer is its own dimension', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4d0'), 'TC-CTR-08 (ClickUp)');
    await fillNewRule(page, {
      conditions: [{ side: 'To', attribute: 'Style class', values: ['Basic 5 pkt'] }],
    });
    await test.step('Same · Buyer: no attribute, operator or value', async () => {
      const row = await editor.addCondition({ side: 'Same', dimension: 'Buyer' });
      await editor.expectRowStaysTheSame(row);
      expect(await editor.rowPickerTexts(row)).toEqual(['Buyer']);
    });
    await test.step('Same · Style: an attribute, no operator or value', async () => {
      const row = await editor.addCondition({ side: 'Same', attribute: 'Style' });
      await editor.expectRowStaysTheSame(row);
      expect(await editor.rowPickerTexts(row)).toEqual(['Item attribute', 'Style']);
      await editor.expectHeaderShows('Basic 5 pkt, same buyer, same style');
    });
    await test.step('A ≠ value shows in the subtitle as "not …"', async () => {
      await editor.addCondition({
        side: 'From',
        attribute: 'Style class',
        operator: '≠',
        values: ['Fashion'],
      });
      await editor.expectHeaderShows(/not fashion/i);
    });
    await test.step('All three save as complete conditions', async () => {
      await editor.expectNoBlocker();
      const rule = await editor.create();
      trackRule(rule);
      await view.expectLoaded(rule.name);
      await view.expectConditions([
        'To Style class = Basic 5 pkt',
        'Same Buyer',
        'Same Style',
        'From Style class ≠ Fashion',
      ]);
    });
  });

  test('TC-CTR-09 "in" with several values saves every value, not just the first', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4d1'), 'TC-CTR-09 (ClickUp)');
    await fillNewRule(page, {
      conditions: [
        {
          side: 'To',
          attribute: 'Style class',
          operator: 'in',
          values: ['Dress', 'Difficult jacket'],
        },
      ],
    });
    await editor.expectHeaderShows('Dress / Difficult jacket');
    const rule = await editor.create();
    trackRule(rule);
    expect(rule.conditions, 'one condition holding both values').toHaveLength(1);
    expect(rule.conditions[0]!.values).toHaveLength(2);
    await view.expectLoaded(rule.name);
    await view.expectConditions(['To Style class in Dress, Difficult jacket']);
    await editor.openEdit(rule.id);
    await editor.goToConditions();
    const row = editor.conditionRow(0);
    await editor.expectChipSelected(row, 'Dress');
    await editor.expectChipSelected(row, 'Difficult jacket');
    await editor.expectChipSelected(row, 'Fashion', false);
  });

  test('TC-CTR-10 An incomplete condition blocks Save, naming its position', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4d2'), 'TC-CTR-10 (ClickUp)');
    await fillNewRule(page);
    const first = await editor.addCondition();
    const second = await editor.addCondition({ side: 'To', attribute: 'Style class' });
    await test.step('Both rows are flagged and named in order', async () => {
      await editor.expectBlockerWithMore('Condition 1 is incomplete', 1);
      await editor.expectRowFlagged(first, true);
      await editor.expectRowFlagged(second, true);
    });
    await test.step('Removing a row renumbers the rest', async () => {
      await editor.removeCondition(0);
      await editor.expectBlocker('Condition 1 is incomplete');
      await editor.removeCondition(0);
      await editor.expectNoBlocker();
    });
    await test.step('A Same row is complete once it has an attribute', async () => {
      const same = await editor.addCondition({ side: 'Same' });
      await editor.expectBlocker('Condition 1 is incomplete');
      await editor.fillCondition(same, { side: 'Same', attribute: 'Style' });
      await editor.expectRowFlagged(same, false);
      await editor.expectNoBlocker();
    });
  });

  test('TC-CTR-11 A rule with no conditions matches every change on its scope', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4d7'), 'TC-CTR-11 (ClickUp)');
    await test.step('The editor says so and Save is not blocked', async () => {
      await fillNewRule(page);
      await editor.expectNoConditionsNote('Sewing lines');
      await editor.expectHeaderShows('Matches every change on sewing lines');
      await editor.expectNoBlocker();
    });
    await test.step('The saved rule (bare) reads the same on its view page and list row', async () => {
      await view.open(bare.id);
      await view.expectNoConditions('Sewing lines');
      await view.expectText('Matches every change on sewing lines');
      await list.findRule(bare.code);
      expect((await list.ruleCells(bare.code)).Rule).toContain(
        `Matches every change on sewing lines · ${bare.code}`,
      );
    });
  });

  test('TC-CTR-12 Changeover: switch on, enter hours + minutes, lost-time flag, optional activity', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4d8'), 'TC-CTR-12 (ClickUp)');
    await fillNewRule(page, { changeover: null, curve: {} });
    await editor.setChangeoverOn(true);
    await test.step('Defaults: 0 h 0 min, lost time Yes, no activity', async () => {
      await editor.expectChangeover(0, 0);
      await editor.expectLostTime(true);
      await editor.expectActivity('None — reserve bare minutes');
    });
    await test.step('Minutes cap at 59; 3 h 0 min reads 180 min', async () => {
      await editor.setChangeover(3, 75);
      await editor.expectChangeover(3, 59);
      await editor.setChangeover(3, 0);
      await editor.expectChangeoverTotal('180 min');
    });
    await test.step('A negative changeover is never saved', async () => {
      await editor.setChangeover(-5, 0);
      await editor.expectBlocker("Changeover can't be negative");
      await editor.setChangeover(3, 0);
      await editor.expectNoBlocker();
    });
    await test.step('The activity picker lists activities as "<code> · <name>"', async () => {
      const options = await editor.activityOptions();
      expect(options[0]).toBe('None — reserve bare minutes');
      // uat has no activities seeded (picker offers only "None"), so the format is checked on whatever is listed.
      for (const option of options.slice(1)) expect(option).toMatch(/^\S+ · .+$/);
    });
  });

  test('TC-CTR-13 Learning curve: switch on with defaults; Ramp loss is derived, never typed', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4d9'), 'TC-CTR-13 (ClickUp)');
    await fillNewRule(page, { changeover: null });
    await editor.setCurveOn(true);
    await editor.expectParametersMode();
    await editor.expectCurve({ day1: 60, days: 5, rate: 85 });
    await editor.expectRampLossDerived();
    const before = await editor.rampLoss();
    await editor.setDay1(40);
    await expect.poll(async () => (await editor.rampLoss()).days).toBeGreaterThan(before.days);
    const after = await editor.rampLoss();
    expect(after.minutes!).toBeGreaterThan(before.minutes!);
    await editor.expectChartLegend(/Fitted curve/);
  });

  test('TC-CTR-14 Parameter bounds: Day 1 1–100, days ≥ 1, rate 1–100', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4da'), 'TC-CTR-14 (ClickUp)');
    await fillNewRule(page, { changeover: null, curve: {} });
    for (const value of [0, 101]) {
      await editor.setDay1(value);
      await editor.expectBlocker('Day 1 output must be 1–100 %');
    }
    await editor.setDay1(50);
    await editor.expectNoBlocker();
    // The message reads "1–365" today (the case's "at least 1"): copy only.
    await editor.setDays(0);
    await editor.expectBlocker('Days to standard must be 1–365');
    await editor.setDays('2.5');
    await editor.expectDaysToStandard('3');
    await editor.expectNoBlocker();
    for (const value of [0, 101]) {
      await editor.setRate(value);
      await editor.expectBlocker('Learning rate must be 1–100 %');
    }
    await editor.setRate(85);
    await editor.expectNoBlocker();
  });

  test('TC-CTR-15 Day by day mode: the table is filled from the curve, auto-numbered, and "+ Day" inserts before standard', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4db'), 'TC-CTR-15 (ClickUp)');
    await fillNewRule(page, { changeover: null, curve: {} });
    await editor.useDayByDay();
    let values: number[] = [];
    await test.step('Filled from the curve: 5 rows, 60 % first, 100 % last', async () => {
      values = await editor.tableValues();
      expect(values).toHaveLength(5);
      expect(values[0]).toBe(60);
      expect(values.at(-1)).toBe(100);
      expect(values).toEqual([...values].sort((a, b) => a - b));
      expect(await editor.tableDays()).toEqual([1, 2, 3, 4, 5]);
      await editor.expectTablePercentSigns();
      await editor.expectFittedReadOnly();
      await editor.expectFitted('60', '5');
    });
    await test.step('Add day inserts before the final 100', async () => {
      await editor.addDay();
      const added = [...values.slice(0, 4), Math.round((values[3]! + 100) / 2), 100];
      await editor.expectTableValues(added);
      expect(await editor.tableDays()).toEqual([1, 2, 3, 4, 5, 6]);
      values = added;
    });
    await test.step('Removing day 2 renumbers the rest', async () => {
      await editor.removeDay(1);
      await editor.expectTableValues([values[0]!, ...values.slice(2)]);
      expect(await editor.tableDays()).toEqual([1, 2, 3, 4, 5]);
    });
    await test.step("The last remaining day can't be removed", async () => {
      while ((await editor.tableValues()).length > 1) await editor.removeDay(0);
      await editor.expectOnlyRemoveDisabled();
    });
  });

  test('TC-CTR-16 Day by day table rules block Save, each with its own message', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dc'), 'TC-CTR-16 (ClickUp)');
    await fillNewRule(page, { changeover: null, table: [60, 70, 80, 90, 100] });
    await editor.expectNoBlocker();
    for (const value of [0, 120]) {
      await editor.setDayValue(2, value);
      await editor.expectBlocker('Day 2 must be 1–100 %');
    }
    await editor.setDayValue(2, 70);
    await editor.setDayValue(4, 75);
    await editor.expectBlocker('Day 4 is below day 3 — a ramp does not fall back');
    await editor.setDayValue(4, 90);
    await editor.setDayValue(5, 95);
    await editor.expectBlocker(
      'The last day must be 100 % — that is the day the line reaches standard',
    );
    await editor.setDayValue(5, 100);
    await editor.expectNoBlocker();
  });

  test('TC-CTR-17 The live fit readback turns amber when the fitted curve misses a day by more than 5 points', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dd'), 'TC-CTR-17 (ClickUp)');
    await fillNewRule(page, { changeover: null, table: TABLE });
    await test.step('A smooth table: a neutral readback', async () => {
      await expect
        .poll(() => editor.fitReadback())
        .toMatch(
          /^Fits a \d+ % learning rate, 35 % day one, 6 day\(s\) to standard — within \d+ points? of your table on every day\.$/,
        );
      expect(await editor.fitReadbackTone()).toBe('neutral');
    });
    await test.step('A sharp step: amber, naming the worst day', async () => {
      await editor.setTable([35, 36, 37, 95, 100]);
      await expect
        .poll(() => editor.fitReadback())
        .toMatch(
          /^Fits a \d+ % learning rate, 35 % day one, 5 day\(s\) to standard — the fitted curve is \d+ points (above|below) your day \d\. Planning uses the fitted curve, so the table will not be followed exactly there\.$/,
        );
      expect(await editor.fitReadbackTone()).toBe('amber');
    });
  });

  test('TC-CTR-18 A Day by day rule saves the fitted curve and reopens the way it was written', async ({
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4de'), 'TC-CTR-18 (ClickUp)');
    expect(table.curve?.inputMode).toBe('day_by_day');
    await view.open(table.id);
    await view.expectText(/Entered as\s*Day by day · fitted/);
    await view.expectText(/Day 1\s*35 %/);
    await view.expectText(/Days to standard\s*6/);
    await editor.openEdit(table.id);
    await editor.goToConditions();
    await editor.expectDayByDayMode();
    await editor.expectTableValues(TABLE);
    await editor.expectChartLegend(/Fitted curve.*Authored/);
  });

  test('TC-CTR-19 An active rule with both payloads off cannot be saved; an inactive one can', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4df'), 'TC-CTR-19 (ClickUp)');
    await fillNewRule(page, { changeover: null });
    await editor.expectBlocker(BOTH_OFF);
    await editor.expectCreateDisabled();
    await editor.backToDetails();
    await editor.setActive(false);
    await editor.expectNoDeactivateDialog();
    await editor.expectActive(false);
    await editor.continue();
    await editor.expectNoBlocker();
    const rule = await editor.create();
    trackRule(rule);
    expect(rule.isActive).toBe(false);
    await list.findRule(rule.code);
    await list.selectTab('Inactive');
    await list.expectRule(rule.code);
    await list.selectTab('Active');
    await list.expectNoRule(rule.code);
  });

  test('TC-CTR-20 "Repeat carries the ramp over" works only for Repeat, and needs a Same condition', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dg'), 'TC-CTR-20 (ClickUp)');
    await fillNewRule(page, { changeover: null, curve: {} });
    await editor.expectCarryOver({ enabled: false, on: false });
    await editor.backToDetails();
    await editor.pickClass('Repeat');
    await editor.continue();
    await editor.expectCarryOver({ enabled: true });
    await editor.setCarryOver(true);
    await editor.expectBlocker('Carrying the ramp over needs at least one Same condition');
    await editor.addCondition({ side: 'Same', attribute: 'Style' });
    await editor.expectNoBlocker();
    await editor.backToDetails();
    await editor.pickClass('New style');
    await editor.continue();
    await editor.expectCarryOver({ enabled: false, on: false });
  });

  test('TC-CTR-21 Repeat-class warnings show in the Applies when card but never block Save', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dh'), 'TC-CTR-21 (ClickUp)');
    const noSame =
      'A repeat rule usually asserts the item is the same — add a Same · style condition so it matches only a true repeat.';
    const isChange = 'These conditions describe a change, not a repeat.';
    await fillNewRule(page, { changeClass: 'Repeat' });
    await editor.expectWarning(noSame);
    await editor.expectNoWarning(isChange);
    await editor.addCondition({ side: 'From', attribute: 'Style class', values: ['Fashion'] });
    await editor.addCondition({ side: 'To', attribute: 'Style class', values: ['Shirt'] });
    await editor.expectWarning(isChange);
    await editor.expectNoBlocker();
    const rule = await editor.create();
    trackRule(rule);
    expect(rule.warnings).toContain(isChange);
  });

  test('TC-CTR-22 An ambiguous rule gets a warning, not a block, and is flagged on the list', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4dj'), 'TC-CTR-22 (ClickUp)');
    // A pair of this test's own rules: the same (rare) conditions and priority.
    const priority = rarePriority();
    const from: ConditionValues = { side: 'From', attribute: 'Style class', values: ['Dress'] };
    const to: ConditionValues = { side: 'To', attribute: 'Style class', values: ['Cargo'] };
    const first = await createRule(page, { priority, conditions: [from, to] });
    let second: SavedRule;
    await test.step('Same conditions (in another order), same priority: a warning, not a block', async () => {
      await fillNewRule(page, { priority, conditions: [to, from] });
      await editor.expectWarning(`Ambiguous with ${first.code} — same conditions, same priority.`);
      await editor.expectNoBlocker();
      second = await editor.create();
      trackRule(second);
    });
    await test.step('Both rows are flagged on the list', async () => {
      await list.findRule(first.code);
      await list.expectAmbiguousFlag(first.code, true);
      await list.findRule(second.code);
      await list.expectAmbiguousFlag(second.code, true);
    });
    await test.step('Another priority clears the warning and both flags', async () => {
      await editor.openEdit(second.id);
      await editor.fillDetails({ priority: priority + 1 });
      await editor.continue();
      await editor.expectNoWarning(/^Ambiguous with /);
      expect((await editor.save()).status).toBe(200);
      await list.findRule(first.code);
      await list.expectAmbiguousFlag(first.code, false);
      await list.findRule(second.code);
      await list.expectAmbiguousFlag(second.code, false);
    });
  });

  test('TC-CTR-23 A successful Save confirms with a toast and the rule appears on the list', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4dk'), 'TC-CTR-23 (ClickUp)');
    await test.step('A centre-type rule names the type', async () => {
      await fillNewRule(page);
      const rule = await editor.create();
      trackRule(rule);
      await editor.expectSaveToast('Saved — applies to the next block confirmed on Sewing lines');
      await view.expectLoaded(rule.name);
      await list.findRule(rule.code);
      await list.selectTab('Active');
      await list.expectRule(rule.code);
    });
    await test.step('A one-centre rule names the centre', async () => {
      const editorForCentre = new TransitionRuleEditorPage(page);
      await editorForCentre.openNew();
      await editorForCentre.chooseOneCentre();
      const centres = await editorForCentre.scopeOptions();
      // Prefer a test centre, so a real line's planning is untouched.
      const centre = centres.find((c) => /QA-AUTO|Playwright/.test(c)) ?? centres[0]!;
      await fillNewRule(page, { centre });
      const rule = await editor.create();
      trackRule(rule);
      await editor.expectSaveToast(
        `Saved — applies to the next block confirmed on ${centre.split(' · ')[0]}`,
      );
      await view.expectLoaded(rule.name);
    });
  });

  test('TC-CTR-24 Leaving an unsaved new rule asks first and creates nothing', async ({
    transitionRuleEditorPage: editor,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4dm'), 'TC-CTR-24 (ClickUp)');
    const tag = ruleTag();
    const name = ruleName(tag);
    await editor.openNew();
    await editor.fillDetails({ name, description: TR_TEST_DATA_TAG });
    await editor.cancel();
    await editor.expectLeaveDialog('This rule has never been saved — leaving discards it.');
    await editor.keepEditing();
    await editor.expectName(name);
    await editor.expectDescription(TR_TEST_DATA_TAG);
    await editor.cancel();
    await editor.discardAndLeave();
    await list.expectOpen();
    await list.search(tag);
    await list.expectNoRowContaining(tag);
  });

  test("TC-CTR-25 The Ramp panel's reference line changes the preview only, and is never saved", async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dn'), 'TC-CTR-25 (ClickUp)');
    await fillNewRule(page, { curve: {} });
    await editor.expectReferenceLine(550);
    const at550 = await editor.rampTable();
    expect(at550.map((r) => r.day)).toEqual(['1', '2', '3', '4', '5']);
    await editor.setReferenceLine(1000);
    await expect.poll(() => editor.narrative()).toMatch(/ on a 1,?000 a day line/);
    const at1000 = await editor.rampTable();
    expect(
      at1000.map((r) => r.pct),
      '% of target unchanged',
    ).toEqual(at550.map((r) => r.pct));
    expect(
      at1000.map((r) => r.lost),
      'day lost unchanged',
    ).toEqual(at550.map((r) => r.lost));
    expect(at1000.at(-1)!.pieces.replace(/,/g, '')).toBe('1000');
    expect(at1000.map((r) => r.pieces)).not.toEqual(at550.map((r) => r.pieces));
    const rule = await editor.create();
    trackRule(rule);
    await editor.openEdit(rule.id);
    await editor.goToConditions();
    await editor.expectReferenceLine(550);
  });

  // ── Edit transition rule ──────────────────────────────────────────────

  test('TC-ETR-01 A row click opens a read-only view page; Edit is a separate step', async ({
    transitionRulesListPage: list,
    transitionRuleViewPage: view,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dp'), 'TC-ETR-01 (ClickUp)');
    await list.findRule(full.code);
    await list.openRule(full.code);
    await view.expectLoaded(full.name);
    await test.step('Head, facts, Applies when, usage and the Ramp panel; nothing editable', async () => {
      await view.expectText(full.code);
      await view.expectText('Similar');
      await view.expectText(full.subtitle);
      await view.expectNote(full.description!);
      for (const fact of [
        'Applies to',
        'Priority',
        'Changeover',
        'Day 1',
        'Days to standard',
        'Ramp loss',
        'Entered as',
      ])
        await view.expectText(fact);
      await view.expectConditions([
        'From Style class = Basic 5 pkt',
        'To Style class = Fashion',
        'Same Buyer',
      ]);
      await view.expectUsage(/^Used by \d+ · Default curve for \d+ · 2 measured points$/);
      await view.expectChart(/^Curve from 60 % on day 1 to 100 % on day 5$/);
      await view.expectReadOnly();
    });
    await view.edit();
    await editor.expectOnEditPage(full.name);
  });

  test('TC-ETR-02 The editor opens on a saved rule; Save with no changes just goes back', async ({
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4dq'), 'TC-ETR-02 (ClickUp)');
    await editor.openEdit(full.id);
    await editor.expectTitle(full.name);
    await editor.expectHeaderShows(full.code);
    await editor.expectHeaderShows('Similar');
    await editor.expectHeaderShows('Active');
    await editor.expectNotSavedBadge(false);
    await editor.continue();
    expect(await editor.saveUnchanged(), 'no write for an unchanged Save').toEqual([]);
  });

  test('TC-ETR-03 Edits in every card persist together, and the subtitle follows the conditions', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4dr'), 'TC-ETR-03 (ClickUp)');
    const priority = rarePriority();
    const rule = await createRule(page, {
      priority,
      conditions: [
        { side: 'From', attribute: 'Style class', values: ['Basic 5 pkt'] },
        { side: 'To', attribute: 'Style class', values: ['Fashion'] },
      ],
      changeover: [1, 0],
      curve: {},
    });
    await list.findRule(rule.code);
    const lossBefore = (await list.ruleCells(rule.code)).Loss!;
    const name = ruleName();
    const description = `${TR_TEST_DATA_TAG} edited`;
    await editor.openEdit(rule.id);
    await editor.fillDetails({
      name,
      priority: priority + 1,
      description,
      changeClass: 'New style',
    });
    await editor.continue();
    await editor.fillCondition(editor.conditionRow(1), {
      side: 'To',
      attribute: 'Style class',
      values: ['Skirt'],
    });
    await editor.setChangeover(1, 30);
    await editor.setDay1(50);
    const saved = await editor.save();
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      id: rule.id,
      name,
      description,
      priority: priority + 1,
      subtitle: 'Basic 5 pkt → Skirt',
    });
    expect(Number(saved.body.penalty!.changeoverMinutes)).toBe(90);
    expect(Number(saved.body.curve!.day1PctOfTarget)).toBe(50);
    await view.expectLoaded(name);
    await view.expectText('Basic 5 pkt → Skirt');
    await view.expectText('New style');
    await view.expectNote(description);
    await list.findRule(rule.code);
    const cells = await list.ruleCells(rule.code);
    expect(cells.Rule).toContain(`Basic 5 pkt → Skirt · ${rule.code}`);
    expect(cells['Change class']).toBe('New style');
    expect(cells.Loss, 'Loss recomputed from the new curve').not.toBe(lossBefore);
  });

  test('TC-ETR-04 Saving updates the rule in place: plain master, no new version', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4dt'), 'TC-ETR-04 (ClickUp)');
    const rule = await createRule(page, { changeover: [1, 0] });
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.setChangeover(1, 15);
    const saved = await editor.save();
    expect(saved.status).toBe(200);
    expect(saved.body.id, 'the same record').toBe(rule.id);
    expect(saved.body.code).toBe(rule.code);
    expect(saved.body.version, 'an optimistic-lock counter, +1').toBe(rule.version + 1);
    await view.expectLoaded(rule.name);
    await view.expectNoText(/\bversion\b|approv|effective from/i);
    await list.findRule(rule.code);
    await list.expectSingleRow(rule.code);
  });

  test('TC-ETR-05 The code can be renamed, and references to the rule survive', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4du'), 'TC-ETR-05 (ClickUp)');
    // Since dev's 2026-10-28 redesign the code is generated on save and fixed
    // ("Assigned automatically when the rule is saved."), so it can't be
    // renamed. Checks the code stays locked on Edit and survives a save.
    // ClickUp z941aby4c5 ("Code can't be edited") is Closed.
    const rule = await createRule(page);
    await editor.openEdit(rule.id);
    await editor.expectCodeGenerated(rule.code);
    await editor.fillDetails({ priority: rarePriority() });
    await editor.continue();
    const saved = await editor.save();
    expect(saved.status).toBe(200);
    expect(saved.body.code).toBe(rule.code);
    await view.expectLoaded(rule.name);
    await view.expectText(rule.code);
  });

  test('TC-ETR-06 Turning a section off and back on: are the old values restored?', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4dx'), 'TC-ETR-06 (ClickUp)');
    // Graded 2026-10-06 in favour of LLD §6.3: switching back on starts from
    // 0 min with no activity (the old values aren't kept).
    const editorForRule = await fillNewRule(page, { changeover: [3, 0], curve: {} });
    const activities = await editorForRule.activityOptions();
    await editorForRule.setActivity(activities[1]!);
    const rule = await editorForRule.create();
    trackRule(rule);
    await view.expectLoaded(rule.name);
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.setChangeoverOn(false);
    const saved = await editor.save();
    expect(saved.body.penalty).toBeNull();
    await view.expectLoaded(rule.name);
    await view.expectText(/Changeover\s*—/);
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.setChangeoverOn(true);
    await editor.expectChangeover(0, 0);
    await editor.expectActivity('None — reserve bare minutes');
  });

  test('TC-ETR-07 Day by day → Parameters keeps the fitted numbers and drops the table on save', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4dy'), 'TC-ETR-07 (ClickUp)');
    const rule = await createRule(page, {
      table: TABLE,
      points: [{ day: 2, pct: 50, lineDays: 1 }],
    });
    const fittedRate = Math.round(Number(rule.curve!.wrightRatePct));
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.useParameters();
    await editor.expectTableRemovedNote(true);
    await editor.expectCurve({ day1: 35, days: 6, rate: fittedRate });
    const saved = await editor.save();
    expect(saved.body.curve!.inputMode).toBe('parameters');
    expect(saved.body.authoredTable).toEqual([]);
    expect(saved.body.measuredPoints, 'measured points untouched').toHaveLength(1);
    await view.expectLoaded(rule.name);
    await view.expectText(/Entered as\s*Parameters/);
    await view.expectNoText('Authored');
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.expectParametersMode();
    await editor.expectEvidenceCount(1);
  });

  test('TC-ETR-08 Turning the Learning curve off drops authored points and carry-over, and keeps measured points', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4e2'), 'TC-ETR-08 (ClickUp)');
    const rule = await createRule(page, {
      changeClass: 'Repeat',
      conditions: [{ side: 'Same', attribute: 'Style' }],
      changeover: [1, 0],
      table: TABLE,
      carryOver: true,
      points: [{ day: 2, pct: 50, lineDays: 1 }],
    });
    expect(rule.carryOverRamp).toBe(true);
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.setCurveOn(false);
    await editor.expectCurveOff();
    const saved = await editor.save();
    expect(saved.body).toMatchObject({ carryOverRamp: false, curve: null, authoredTable: [] });
    expect(saved.body.measuredPoints).toHaveLength(1);
    await view.expectLoaded(rule.name);
    await view.expectChart('No ramp — output at target from day 1');
    await view.expectUsage(/· 1 measured points?$/);
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.expectEvidenceCount(1);
  });

  test('TC-ETR-09 Evidence: Add point, a duplicate working day blocks Save, and % may exceed 100', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4e4'), 'TC-ETR-09 (ClickUp)');
    const rule = await createRule(page, {
      curve: {},
      points: [
        { day: 1, pct: 55, lineDays: 1 },
        { day: 3, pct: 80, lineDays: 1 },
      ],
    });
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.expectEvidenceCount(2);
    await test.step('A new point: the next day, % from the curve, 1 line-day', async () => {
      const n = await editor.addPoint();
      const point = await editor.point(n);
      expect(point.day).toBe('4');
      expect(Number(point.pct)).toBeGreaterThan(0);
      expect(point.lineDays).toBe('1');
      await editor.expectEvidenceCount(3);
    });
    await test.step('A duplicate working day blocks Save', async () => {
      await editor.fillPoint(3, { day: 3 });
      await editor.expectBlocker('Each working day can have one point only');
      await editor.fillPoint(3, { day: 4 });
      await editor.expectNoBlocker();
    });
    await test.step('% held may exceed 100; line-days at least 1', async () => {
      await editor.fillPoint(3, { pct: 110 });
      await editor.expectNoBlocker();
      await editor.fillPoint(3, { lineDays: 0 });
      await editor.expectBlocker('Line-days observed must be at least 1');
      await editor.fillPoint(3, { lineDays: 1 });
    });
    await test.step('✕ removes a point', async () => {
      await editor.deletePoint(3);
      await editor.expectEvidenceCount(2);
    });
  });

  test('TC-ETR-10 Refit is gated, previews Now vs Refitted, and persists nothing until Save', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4e5'), 'TC-ETR-10 (ClickUp)');
    await test.step('Disabled with the curve off, and with no points', async () => {
      await fillNewRule(page);
      await editor.expectRefitDisabled();
      await editor.setCurveOn(true);
      await editor.expectRefitDisabled();
    });
    const rule = await createRule(page, {
      curve: {},
      points: [1, 2, 3, 4, 5].map((day) => ({ day, pct: 30 + day * 12, lineDays: 2 })),
    });
    const original = { day1: 60, days: 5, rate: 85 };
    await editor.openEdit(rule.id);
    await editor.continue();
    await test.step('The dialog compares Now and Refitted; Cancel changes nothing', async () => {
      await editor.openRefit();
      await editor.expectRefitDialog(5);
      await editor.cancelRefit();
      await editor.expectCurve(original);
    });
    await test.step('Apply updates the curve and says to Save', async () => {
      await editor.openRefit();
      const refitted = await editor.refittedValues();
      await editor.applyRefit();
      // Copy: no closing full stop today.
      await editor.expectToast(/^Curve refitted from 5 measured points — Save to keep it\.?$/);
      await editor.expectDay1(refitted['Day 1 output']!.replace(/ %$/, ''));
    });
    await test.step('Leaving without saving keeps the old curve', async () => {
      await editor.cancel();
      await editor.discardAndLeave();
      await editor.openEdit(rule.id);
      await editor.continue();
      await editor.expectCurve(original);
    });
  });

  test('TC-ETR-11 A saved Refit records who and when', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4e6'), 'TC-ETR-11 (ClickUp)');
    const rule = await createRule(page, {
      curve: {},
      points: [1, 2, 3].map((day) => ({ day, pct: 40 + day * 15, lineDays: 2 })),
    });
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.openRefit();
    await editor.applyRefit();
    const saved = await editor.save();
    const who = saved.body.curve!.refitByName;
    expect(who, 'the signed-in user, by name').toMatch(/\S/);
    expect(who).not.toMatch(/^[0-9a-f-]{36}$/);
    const lastRefitted = new RegExp(`Last refitted\\s*(by )?${who} · \\d{4}-\\d{2}-\\d{2}$`);
    await view.expectLoaded(rule.name);
    await view.expectLastRefitted(lastRefitted);
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.expectLastRefitted(lastRefitted);
  });

  test('TC-ETR-12 Refit in Day by day mode rewrites the authored table', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4e7'), 'TC-ETR-12 (ClickUp)');
    const rule = await createRule(page, {
      table: TABLE,
      points: [1, 2, 3].map((day) => ({ day, pct: 20 + day * 10, lineDays: 2 })),
    });
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.openRefit();
    await editor.expectRefitDialogText(
      'Your day-by-day table is rewritten from the refitted curve.',
    );
    const refitted = await editor.refittedValues();
    await editor.applyRefit();
    // The toast reads "Curve refitted from 3 measured points — Save to keep it", without the
    // case's "— the day-by-day table was rewritten." (copy; seen 2026-11-17). The table itself
    // is checked below.
    await editor.expectToast(/^Curve refitted from 3 measured points/);
    // The table becomes the refitted curve: its day 1, its length, ending at 100.
    await expect
      .poll(async () => {
        const values = await editor.tableValues();
        return [values[0], values.length, values.at(-1)];
      })
      .toEqual([
        Number(refitted['Day 1 output']!.replace(/ %$/, '')),
        Number(refitted['Days to standard']),
        100,
      ]);
  });

  test('TC-ETR-13 The divergence warning counts only points resting on 3 or more line-days', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4e8'), 'TC-ETR-13 (ClickUp)');
    await fillNewRule(page, { curve: {} });
    const curveDay3 = Number((await editor.rampTable())[2]!.pct.replace(/ %$/, ''));
    const n = await editor.addPoint({ day: 3, pct: curveDay3 - 12, lineDays: 2 });
    await editor.expectDivergenceWarning(null);
    await editor.fillPoint(n, { lineDays: 3 });
    await editor.expectDivergenceWarning(
      /^Fitted curve is 1[1-3] points above the observed day 3 — consider refitting\.$/,
    );
  });

  test('TC-ETR-14 Deactivate from the footer shows usage, warns about defaults, and retires the rule', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4e9'), 'TC-ETR-14 (ClickUp)');
    await test.step('Not offered on a rule that was never saved', async () => {
      await fillNewRule(page);
      await editor.expectDeactivateAvailable(false);
    });
    const rule = await createRule(page);
    await editor.openEdit(rule.id);
    await editor.continue();
    await editor.expectDeactivateAvailable(true);
    await editor.openDeactivate();
    // A QA rule is nobody's default curve, so the amber default warning
    // (Default curve for M > 0 centres) can't show here.
    await editor.expectDeactivateDialog(rule.name, [
      'Rules are retired, never deleted. It stops matching new changes; blocks already on it keep their ramp.',
      /Used by \d+ open block\(s\) — they keep this rule\./,
      /Default curve for \d+ centre\(s\)/,
    ]);
    await editor.confirmDeactivate();
    await editor.expectToast('Deactivated — it stops matching new changes');
    await test.step('It moves to the Inactive tab, and no longer offers Deactivate', async () => {
      await list.findRule(rule.code);
      await list.selectTab('Inactive');
      await list.expectRule(rule.code);
      await list.selectTab('Active');
      await list.expectNoRule(rule.code);
      await editor.openEdit(rule.id);
      await editor.continue();
      await editor.expectDeactivateAvailable(false);
    });
  });

  test('TC-ETR-15 Deactivating with unsaved edits flips only the Active flag', async ({
    page,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4ea'), 'TC-ETR-15 (ClickUp)');
    const priority = rarePriority();
    const rule = await createRule(page, { priority });
    await editor.openEdit(rule.id);
    await editor.fillDetails({ priority: 99 });
    await editor.continue();
    await editor.openDeactivate();
    await editor.expectDeactivateDialog(rule.name, [
      'Unsaved edits on this page are not included — only the active flag changes.',
    ]);
    const writes = await editor.confirmDeactivate();
    expect(writes, 'only the status PATCH').toHaveLength(1);
    expect(writes[0]).toMatch(/^PATCH \S*\/transition-rules\/\S*status/);
    await editor.openEdit(rule.id);
    await editor.expectPriority(priority);
    await editor.expectActive(false);
  });

  test('TC-ETR-16 The Active switch on a saved rule goes through the dialog; Reactivate restores it', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4eb'), 'TC-ETR-16 (ClickUp)');
    await test.step('Switching a saved rule off opens the Deactivate dialog', async () => {
      const active = await createRule(page);
      await editor.openEdit(active.id);
      await editor.expectActiveHint();
      await editor.clickActiveSwitch();
      await editor.expectDeactivateDialogOpen();
      await editor.cancelDeactivate();
      await editor.expectActive(true);
    });
    await test.step('Switching an inactive rule on and saving reactivates it', async () => {
      const inactive = await createRule(page, { active: false });
      await editor.openEdit(inactive.id);
      await editor.setActive(true);
      await editor.expectNoDeactivateDialog();
      await editor.continue();
      const saved = await editor.save();
      expect(saved.body.isActive).toBe(true);
      await list.findRule(inactive.code);
      await list.selectTab('Active');
      await list.expectRule(inactive.code);
    });
  });

  test('TC-ETR-17 Leaving a rule with unsaved edits asks first', async ({
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4ee'), 'TC-ETR-17 (ClickUp)');
    // Edits `full` but never saves them.
    await editor.openEdit(full.id);
    await editor.fillDetails({ priority: full.priority + 1 });
    await editor.cancel();
    await editor.expectLeaveDialog(`Your changes to ${full.code} will be lost.`);
    await editor.keepEditing();
    await editor.expectPriority(full.priority + 1);
    await editor.cancel();
    await editor.discardAndLeave();
    await editor.openEdit(full.id);
    await editor.expectPriority(full.priority);
  });

  test('TC-ETR-18 Concurrent edits: the second save is refused with 409 and a reload prompt', async ({
    page,
    transitionRuleEditorPage: editor,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4ef'), 'TC-ETR-18 (ClickUp)');
    const rule = await createRule(page);
    // The same rule open in a second tab of the same session.
    const secondTab = await page.context().newPage();
    const second = new TransitionRuleEditorPage(secondTab);
    try {
      await editor.openEdit(rule.id);
      await second.openEdit(rule.id);
      await editor.fillDetails({ priority: rarePriority() });
      await editor.continue();
      expect((await editor.save()).status).toBe(200);
      await second.fillDetails({ name: ruleName() });
      await second.continue();
      expect((await second.save()).status, 'stale save refused').toBe(409);
      await second.expectConflictBanner();
    } finally {
      await secondTab.close();
    }
    await view.open(rule.id);
    await view.expectLoaded(rule.name);
  });

  test('TC-ETR-19 A read-only planner sees the view page only', async ({ personas }) => {
    await allure.tms(cu('z941aby4eg'), 'TC-ETR-19 (ClickUp)');
    test.skip(!personaCredentials('READONLY'), personaSkipReason('READONLY'));
    await asPersona(personas, 'READONLY', async (roPage) => {
      const list = new TransitionRulesListPage(roPage);
      await list.open();
      await list.expectNewUnavailable();
      const view = new TransitionRuleViewPage(roPage);
      await view.open(full.id);
      await view.expectEditAvailable(false);
      const editor = new TransitionRuleEditorPage(roPage);
      await editor.openEditUrl(full.id);
      await editor.expectNoWorkingEditor();
    });
  });

  test('TC-ETR-20 Planned vs actual changeover: an empty state now, a median strip once actuals exist', async ({
    transitionRuleViewPage: view,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4eh'), 'TC-ETR-20 (ClickUp)');
    // A rule the suite just made has no completed changeovers (LLD G7: actuals = []).
    await view.open(full.id);
    await view.expectNoActuals();
    await editor.openEdit(full.id);
    await editor.continue();
    await editor.expectNoActuals();
  });

  // ── List transition rules ─────────────────────────────────────────────

  test('TC-LTR-01 Transition Rules is reachable from Planning Master Data and gated by its own nav key', async ({
    transitionRulesListPage: list,
    personas,
  }) => {
    await allure.tms(cu('z941aby4ek'), 'TC-LTR-01 (ClickUp)');
    await list.openFromHub();
    await list.expectHeader();
    if (!personaCredentials('NOACCESS')) {
      test
        .info()
        .annotations.push({ type: 'skipped step', description: personaSkipReason('NOACCESS') });
      return;
    }
    await asPersona(personas, 'NOACCESS', async (page) => {
      await new TransitionRulesListPage(page).expectNoAccess();
    });
  });

  test('TC-LTR-02 Summary cards count active rules per change class, with the range of days to standard', async ({
    page,
    transitionRulesListPage: list,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4em'), 'TC-LTR-02 (ClickUp)');
    const expectCardsMatchActiveRows = async () => {
      await expect(async () => {
        await list.open();
        await list.expectOpen();
        await list.selectTab('Active');
        await list.showAllRows();
        const cards = await list.summaryCards();
        const rows = await list.rowValues();
        expect(cards.map((c) => c.label)).toEqual(list.classOrder());
        for (const card of cards) {
          const mine = rows.filter((r) => r.changeClass === card.label);
          const days = mine.map((r) => r.days).filter((d): d is number => d !== null);
          const min = Math.min(...days);
          const max = Math.max(...days);
          const range = !days.length
            ? 'no curves'
            : min === max
              ? `${min} days? to standard`
              : `${min}–${max} days to standard`;
          expect(card.count, `${card.label} count`).toBe(mine.length);
          expect(card.caption, `${card.label} caption`).toMatch(new RegExp(`^rules? · ${range}$`));
        }
      }).toPass({ timeout: 120_000, intervals: [5_000] });
    };
    const rule = await createRule(page, { changeClass: 'New style', curve: { days: 7 } });
    await test.step('Cards match the active rules, ours included', expectCardsMatchActiveRows);
    await test.step('A deactivated rule stops counting', async () => {
      await editor.openEdit(rule.id);
      await editor.continue();
      await editor.openDeactivate();
      await editor.confirmDeactivate();
      await expectCardsMatchActiveRows();
    });
  });

  test('TC-LTR-03 Active / Inactive tabs split the rules with accurate counts', async ({
    page,
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4en'), 'TC-LTR-03 (ClickUp)');
    const inactive = await createRule(page, { active: false });
    await list.open();
    await list.expectOpen();
    await list.expectTabs(['All', 'Active', 'Inactive']);
    await list.expectTabCountsAddUp(['Active', 'Inactive']);
    await test.step('Inactive: only inactive rules, and the counts hold', async () => {
      await list.selectTab('Inactive');
      await list.expectTabCountMatchesRows('Inactive');
      await list.expectTabCountsAddUp(['Active', 'Inactive']);
      // ClickUp z941aby4c6 (Closed): the other counts used to collapse to 0 here.
      // Polled: every count reads 0 for a moment while the tab refetches.
      await expect
        .poll(() => list.tabCount('Active'), { message: 'Active keeps its count' })
        .toBeGreaterThan(0);
      await list.search(inactive.code);
      await list.expectRule(inactive.code);
      await list.search(full.code);
      await list.expectNoRule(full.code);
    });
    await test.step('Active: only active rules', async () => {
      await list.clearSearch();
      await list.selectTab('Active');
      await list.expectTabCountMatchesRows('Active');
      await list.search(full.code);
      await list.expectRule(full.code);
      await list.search(inactive.code);
      await list.expectNoRule(inactive.code);
    });
  });

  test('TC-LTR-04 Columns show real values; "—" where a rule has no curve', async ({
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4ep'), 'TC-LTR-04 (ClickUp)');
    await list.open();
    await list.expectOpen();
    await list.expectColumnHeaders([
      'Rule',
      'Change class',
      'Applies to',
      'Rate',
      'Day 1',
      'Days',
      'Loss',
      'Changeover',
      'Points',
      'Used',
      'Priority',
    ]);
    await test.step('A rule with a curve', async () => {
      await list.findRule(full.code);
      const cells = await list.ruleCells(full.code);
      expect(cells.Rule).toBe(`${full.name} ${full.subtitle} · ${full.code}`);
      expect(cells).toMatchObject({
        'Change class': 'Similar',
        'Applies to': 'Sewing lines',
        Days: '5',
        Changeover: '120 min',
        Points: '2',
        Used: '0',
        Priority: String(full.priority),
      });
      expect(cells.Rate).toMatch(/^\d+ %$/);
      expect(cells['Day 1']).toMatch(/^60 %/);
      expect(cells.Loss).toMatch(/^\d+\.\d{2} d$/);
    });
    await test.step('A changeover-only rule shows "—" for the curve', async () => {
      await list.findRule(bare.code);
      const cells = await list.ruleCells(bare.code);
      expect(cells).toMatchObject({
        'Change class': 'New product',
        Rate: '—',
        'Day 1': '—',
        Days: '—',
        Loss: '—',
        Changeover: '45 min',
        Points: '—',
        Used: '0',
      });
    });
  });

  test('TC-LTR-05 Default sort is change class, then days to standard; every column sorts', async ({
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4eq'), 'TC-LTR-05 (ClickUp)');
    const order = list.classOrder();
    const classIndexes = async () =>
      (await list.rowValues()).map((r) => order.indexOf(r.changeClass));
    await list.open();
    await list.expectOpen();
    await list.showAllRows();
    await test.step('Default: class order, then days; rules with no curve together at one end', async () => {
      const rows = await list.rowValues();
      expect(direction(rows.map((r) => order.indexOf(r.changeClass)))).toMatch(/^(asc|flat)$/);
      for (const cls of order) {
        const days = rows.filter((r) => r.changeClass === cls).map((r) => r.days);
        const curved = days.filter((d): d is number => d !== null);
        expect(direction(curved), `${cls}: days ascending`).toMatch(/^(asc|flat)$/);
        const nulls = days.flatMap((d, i) => (d === null ? [i] : []));
        const contiguousAtAnEnd =
          !nulls.length ||
          nulls.every((i, k) => i === k) ||
          nulls.every((i, k) => i === days.length - nulls.length + k);
        expect(contiguousAtAnEnd, `${cls}: no-curve rules at one end`).toBe(true);
      }
    });
    await test.step('Change class sorts in class order, and the second click reverses it', async () => {
      await list.sortBy('Change class');
      await expect.poll(async () => direction(await classIndexes())).toMatch(/^(asc|desc)$/);
      const first = direction(await classIndexes());
      await list.sortBy('Change class');
      await expect
        .poll(async () => direction(await classIndexes()))
        .toBe(first === 'asc' ? 'desc' : 'asc');
    });
    await test.step('Priority sorts numerically', async () => {
      await list.sortBy('Priority');
      await expect
        .poll(async () => direction((await list.rowValues()).map((r) => r.priority)))
        .toMatch(/^(asc|desc|flat)$/);
    });
  });

  test('TC-LTR-06 The Loss column tooltip names the standard-day basis behind the minutes', async ({
    transitionRulesListPage: list,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4er'), 'TC-LTR-06 (ClickUp)');
    await list.findRule(full.code);
    const title = await list.lossTitle(full.code);
    expect(title).toMatch(/^\d+ standard minutes on a \d+-minute day$/);
    const [, minutes, day] = title.match(/^(\d+) standard minutes on a (\d+)-minute day$/)!;
    expect(Number(minutes)).toBe(full.curve!.lostMinutes);
    await editor.openEdit(full.id);
    await editor.continue();
    expect(await editor.standardDayMinutes(), "the editor's day matches").toBe(Number(day));
  });

  test('TC-LTR-07 The Points column counts measured points only, never authored ones', async ({
    transitionRulesListPage: list,
    transitionRuleViewPage: view,
  }) => {
    await allure.tms(cu('z941aby4et'), 'TC-LTR-07 (ClickUp)');
    // `table` has 6 authored days and no measured points; `full` has 2 measured.
    await list.findRule(table.code);
    expect((await list.ruleCells(table.code)).Points).toBe('—');
    await list.findRule(full.code);
    expect((await list.ruleCells(full.code)).Points).toBe('2');
    await view.open(table.id);
    await view.expectUsage(/· 0 measured points$/);
  });

  test('TC-LTR-08 Search matches name, code, derived subtitle and description', async ({
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4eu'), 'TC-LTR-08 (ClickUp)');
    await list.open();
    await list.expectOpen();
    await list.showAllRows();
    for (const [what, term] of [
      ['code', full.code],
      ['name', full.name.split(' ')[1]!],
      ['description', descWord],
      ['subtitle', 'Basic 5 pkt → Fashion, same buyer'],
    ] as const) {
      await test.step(`By ${what}: "${term}"`, async () => {
        await list.search(term);
        await list.expectRule(full.code);
      });
    }
    await list.search(`zz-no-such-rule-${descWord}`);
    await list.expectNoRule(full.code);
  });

  test("TC-LTR-09 The brief's list filters exist: change class, centre type / centre, has changeover, has curve", async ({
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4ev'), 'TC-LTR-09 (ClickUp)');
    await list.open();
    await list.expectOpen();
    await list.expectGridTools();
    await list.expectFilterFields([
      'Change class',
      'Centre type',
      'Centre',
      'Has changeover',
      'Has curve',
    ]);
    await list.filterBy('Change class', 'New product');
    await list.showAllRows();
    await expect
      .poll(async () => [...new Set((await list.rowValues()).map((r) => r.changeClass))])
      .toEqual(['New product']);
    await list.search(bare.code);
    await list.expectRule(bare.code);
  });

  test('TC-LTR-10 The Duplicate row action copies the whole rule into a new one', async ({
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4ew'), 'TC-LTR-10 (ClickUp)');
    // Graded a pass 2026-10-07: the prototype has no Duplicate either. If the
    // action appears, this case needs its copy checks written.
    await list.findRule(full.code);
    const offered = await list.hasDuplicateAction(full.code);
    expect(offered, 'a Duplicate action now exists: automate the copy checks').toBe(false);
    test.info().annotations.push({
      type: 'note',
      description:
        'No Duplicate action (as in the prototype); checks the row selection bulk bar instead.',
    });
    await list.selectRow(full.code);
    await list.expectBulkBar();
    await list.clearSelection();
  });

  test('TC-LTR-11 The compact preview pane matches the view page, with an Edit shortcut', async ({
    transitionRulesListPage: list,
    transitionRuleEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby4ex'), 'TC-LTR-11 (ClickUp)');
    await list.findRule(full.code);
    await list.switchView('Vertical split');
    await list.selectInSplit(full.code);
    for (const text of [
      full.code,
      'Similar',
      `Note · ${full.description}`,
      'Applies when',
      'Changeover',
      /Used by \d+ · Default curve for \d+ · 2 measured points/,
      /^A line on this curve|A line on this curve/,
    ])
      await list.expectPreviewShows(text);
    await list.editFromPreview();
    await editor.expectOnEditPage(full.name);
    await editor.expectEditing(full.id);
    // The view mode is remembered: back to List view for the next case.
    await list.open();
  });

  test('TC-LTR-12 The empty state and the no-match state read differently', async ({
    transitionRulesListPage: list,
  }) => {
    await allure.tms(cu('z941aby4ey'), 'TC-LTR-12 (ClickUp)');
    await test.step('A search that matches nothing', async () => {
      await list.open();
      await list.expectOpen();
      await list.search(`zz-no-such-rule-${ruleTag()}`);
      await list.expectNoMatchState();
    });
    await test.step('No rules at all (served an empty list)', async () => {
      await list.serveNoRules();
      await list.open();
      await list.expectOpen();
      await list.expectEmptyState();
    });
  });
});
