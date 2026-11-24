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
// The time is the whole base-36 millisecond stamp (8 characters), so the start-of-run sweep can tell a
// rule left by an old, killed run from one a parallel worker is still using.
const STAMP_LENGTH = 8;
const RUN = `${Date.now().toString(36).toUpperCase()}${process.env.TEST_WORKER_INDEX ?? '0'}`;
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

/** Rules older than this are leftovers of a killed run (a suite run takes minutes). */
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/**
 * beforeAll for the Transition rules spec: deactivates QA-AUTO rules still
 * active from an earlier run that was killed before its afterAll. Only rules
 * whose tag is older than STALE_AFTER_MS are touched, never a parallel
 * worker's live ones. Fails when a leftover can't be retired.
 */
export function sweepStaleRulesBeforeAll(): void {
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    test.setTimeout(600_000);
    const page = await setupPage(browser);
    page.setDefaultTimeout(30_000);
    const failed: string[] = [];
    try {
      const list = new TransitionRulesListPage(page);
      await list.open();
      await list.expectOpen();
      await list.selectTab('Active');
      await list.showAllRows();
      const stale = (await list.ruleLabels('QATR')).filter(({ label }) => {
        const stamp = label.match(new RegExp(`QATR([0-9A-Z]{${STAMP_LENGTH}})`))?.[1];
        return stamp !== undefined && Date.now() - parseInt(stamp, 36) > STALE_AFTER_MS;
      });
      for (const { code } of stale) {
        try {
          await list.findRule(code);
          await list.openRule(code);
          const editor = new TransitionRuleEditorPage(page);
          await new TransitionRuleViewPage(page).edit();
          await editor.goToConditions();
          await editor.openDeactivate();
          await editor.confirmDeactivate();
        } catch (error) {
          failed.push(`${code}: ${String(error).split('\n')[0]}`);
        }
      }
    } finally {
      await page.close();
    }
    if (failed.length)
      throw new Error(
        `QA-AUTO sweep: leftover rules could not be deactivated: ${failed.join('; ')}`,
      );
  });
}

/**
 * afterAll for the Transition rules spec: deactivates every rule this file
 * created in this worker that is still active (rules are retired, never
 * deleted). The Active tab, searched by this worker's run tag, says which
 * ones are. Throws when a rule is still active afterwards, so a leak is a
 * failure, never a warning.
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
    const failed: string[] = [];
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
          failed.push(`${code}: ${String(error).split('\n')[0]}`);
        }
      }
      // Verify it stuck: none of this worker's rules may still be Active.
      await list.open();
      await list.expectOpen();
      await list.selectTab('Active');
      await list.showAllRows();
      const mine = new Set(tracked.map(([, c]) => c));
      const left = (await list.activeCodes(runTag())).filter((c) => mine.has(c));
      for (const code of left) if (!failed.some((f) => f.startsWith(code))) failed.push(code);
    } finally {
      await page.close();
      if (done.length)
        console.log(`QA-AUTO cleanup (${path.basename(file)}): deactivated ${done.join(', ')}`);
    }
    if (failed.length) throw new Error(`QA-AUTO cleanup: rules still active: ${failed.join('; ')}`);
  });
}
