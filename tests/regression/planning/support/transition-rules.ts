import * as path from 'path';
import { type Browser, type Page, test } from '@playwright/test';
import { currentSpecFile, takeCodes, track } from './created';
import { setupPage } from './test-data';
import {
  type ConditionValues,
  type CurveValues,
  type PointValues,
  type RuleDetails,
  type SavedRule,
  TransitionRuleEditorPage,
} from '../../../../src/pages/planning/transition-rule-editor.page';
import { TransitionRuleViewPage } from '../../../../src/pages/planning/transition-rule-view.page';
import { TransitionRulesListPage } from '../../../../src/pages/planning/transition-rules-list.page';

/**
 * Test data for the Transition rules spec (21-transition-rules.spec.ts).
 * Every rule it creates carries this marker (its name holds a run-unique tag
 * plus the marker; its Description holds the marker), so anyone looking at
 * dev or uat can tell it's automated test data, safe to delete from the
 * backend. Rules can't be deleted in the app: the spec's afterAll deactivates
 * every rule it created (cleanUpRulesAfterAll).
 */
export const TR_TEST_DATA_TAG =
  'QA-AUTO — transition-rules test data (pw-hybrid-framework). Safe to delete.';

// Run id = time + Playwright worker index (each worker loads this module separately).
const RUN = `${Date.now().toString(36).toUpperCase().slice(-4)}${process.env.TEST_WORKER_INDEX ?? '0'}`;
let counter = 0;

/** A tag unique to this run and worker: "QATR<run><n>". */
export function ruleTag(): string {
  counter += 1;
  return `QATR${RUN}${counter.toString(36).toUpperCase()}`;
}

/** "QA-AUTO <tag> — transition-rules test data …": a rule name carrying its tag and the marker. */
export function ruleName(tag: string = ruleTag()): string {
  return TR_TEST_DATA_TAG.replace('QA-AUTO', `QA-AUTO ${tag}`);
}

/** A priority no other test data is likely to share (ambiguity is "same conditions, same priority"). */
export function rarePriority(): number {
  return 200 + Math.floor(Math.random() * 700);
}

const ID_PREFIX = 'TR-ID';

/** The part of every rule name this worker hands out: one search finds them all. */
export function runTag(): string {
  return `QATR${RUN}`;
}

/** Records a saved rule against the calling spec file for its afterAll. */
export function trackRule(rule: { id: string; code: string }): void {
  track(ID_PREFIX, `${rule.id} ${rule.code}`);
}

export interface RuleValues extends RuleDetails {
  conditions?: ConditionValues[];
  /** [hours, minutes] of changeover. Left out: 1 h when there's no curve; null: none. */
  changeover?: [number, number] | null;
  /** Parameters curve (defaults 60 % / 5 / 85 % when `{}`); leave out for none. */
  curve?: CurveValues;
  /** A Day by day table instead of parameters. */
  table?: number[];
  carryOver?: boolean;
  points?: PointValues[];
}
/**
 * The editor filled up to (not including) Create: a new rule with a tagged
 * name, the marker as Description, Sewing lines, class Similar and a 1 h
 * changeover unless `values` says otherwise. Leaves the editor on step 2.
 */
export async function fillNewRule(
  page: Page,
  values: RuleValues = {},
): Promise<TransitionRuleEditorPage> {
  const editor = new TransitionRuleEditorPage(page);
  const { conditions, changeover, curve, table, carryOver, points, ...details } = values;
  await editor.openNew();
  await editor.fillDetails({
    name: ruleName(),
    description: TR_TEST_DATA_TAG,
    ...(details.centre === undefined && { centreType: 'Sewing lines' }),
    changeClass: 'Similar',
    ...details,
  });
  await editor.continue();
  for (const condition of conditions ?? []) await editor.addCondition(condition);
  const wantsChangeover =
    changeover === null ? undefined : (changeover ?? (curve || table ? undefined : [1, 0]));
  if (wantsChangeover) await editor.setChangeover(...wantsChangeover);
  if (curve || table) await editor.setCurve(curve ?? {});
  if (table) {
    await editor.useDayByDay();
    await editor.setTable(table);
  }
  if (carryOver !== undefined) await editor.setCarryOver(carryOver);
  for (const point of points ?? []) await editor.addPoint(point);
  return editor;
}

/**
 * Creates a QA-AUTO rule through the editor (see fillNewRule for the
 * defaults) and returns what the server saved. Lands on its view page.
 */
export async function createRule(page: Page, values: RuleValues = {}): Promise<SavedRule> {
  const editor = await fillNewRule(page, values);
  const rule = await editor.create();
  trackRule(rule);
  await new TransitionRuleViewPage(page).expectLoaded(rule.name);
  return rule;
}

/** Deactivates one rule from its editor's footer. */
async function deactivateRule(page: Page, id: string): Promise<void> {
  const editor = new TransitionRuleEditorPage(page);
  await editor.openEdit(id);
  await editor.goToConditions();
  await editor.openDeactivate();
  await editor.confirmDeactivate();
}

/**
 * afterAll for the Transition rules spec: deactivates every rule this file
 * created in this worker that is still active (rules are retired, never
 * deleted). The Active tab, searched by this worker's run tag, says which
 * ones are. Best effort — a rule that can't be deactivated is logged, never
 * a test failure.
 */
export function cleanUpRulesAfterAll(): void {
  test.afterAll(async ({ browser }: { browser: Browser }) => {
    test.setTimeout(900_000);
    const file = currentSpecFile();
    const tracked = takeCodes(file, ID_PREFIX).map((entry) => entry.split(' ') as [string, string]);
    if (!tracked.length) return;
    const page = await setupPage(browser);
    page.setDefaultTimeout(30_000);
    const done: string[] = [];
    try {
      const list = new TransitionRulesListPage(page);
      await list.open();
      await list.expectOpen();
      await list.selectTab('Active');
      await list.search(runTag());
      await list.showAllRows();
      const active = new Set(await list.activeCodes(runTag()));
      for (const [id, code] of tracked.filter(([, c]) => active.has(c))) {
        try {
          await deactivateRule(page, id);
          done.push(code);
        } catch (error) {
          console.warn(
            `QA-AUTO cleanup: could not deactivate ${code}: ${String(error).split('\n')[0]}`,
          );
        }
      }
    } catch (error) {
      console.warn(`QA-AUTO cleanup: rules not cleaned: ${String(error).split('\n')[0]}`);
    } finally {
      await page.close();
      if (done.length)
        console.log(`QA-AUTO cleanup (${path.basename(file)}): deactivated ${done.join(', ')}`);
    }
  });
}
