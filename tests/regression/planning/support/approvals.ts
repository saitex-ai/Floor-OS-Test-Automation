import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { type Browser, type Page, expect, test } from '@playwright/test';
import { ActivitiesListPage } from '../../../../src/pages/planning/activities-list.page';
import { ActivityFormPage } from '../../../../src/pages/planning/activity-form.page';
import { ApprovalPoliciesPage } from '../../../../src/pages/planning/approval-policies.page';
import {
  ApprovalPolicyFormPage,
  type PolicyChanges,
  type PolicySpec,
} from '../../../../src/pages/planning/approval-policy-form.page';
import { ApprovalPanelPage } from '../../../../src/pages/planning/approval-panel.page';
import { setupPage, uniqueTag } from './test-data';

/**
 * Test data for the Generic Approval suite (22-generic-approval.spec.ts).
 *
 * Approval policies are shared state: an active policy decides how every
 * record of its app / entity type is sent for approval, for everyone. So
 * every policy here is the suite's own, created **inactive** on planning ·
 * activity (dev has no active activity policy of its own; no other suite
 * sends activities for approval), and switched on only for the seconds a
 * case needs to send its own QA-AUTO activity — then off again in the same
 * call. The suite never edits or switches a policy it didn't create.
 * Policies can't be deleted, only deactivated; afterAll checks none of this
 * worker's is left active and withdraws any request still pending.
 */
export const GA_TAG = 'QA-AUTO — generic-approval test data (pw-hybrid-framework). Safe to delete.';

/** "QA-AUTO <tag> — generic-approval test data …": the marker, naming its own record. */
export function gaName(tag: string): string {
  return GA_TAG.replace('QA-AUTO', `QA-AUTO ${tag}`);
}

/** A run-unique policy name. */
export function policyName(label: string): string {
  return gaName(`${uniqueTag('GA-P')} ${label}`);
}

/** The people the suite routes approvals to (display names, as the pickers show them). */
export const ALICE = 'Alice Planner';
export const CAROL = 'Carol Planner';
export const DAVE = 'Dave QCLead';

/**
 * Makes `make()`'s result once per test run (per `key`) and hands the same
 * value to every later caller in that run. A failed case restarts its
 * worker, which runs beforeAll again; without this every failure would
 * create another set of policies, and policies can't be deleted. Keyed by
 * the Playwright runner's pid (each worker's parent), in the OS temp dir.
 */
export async function oncePerRun<T>(key: string, make: () => Promise<T>): Promise<T> {
  const file = path.join(os.tmpdir(), `pw-generic-approval-${process.ppid}-${key}.json`);
  // A pid can come round again in a later run: only a file from today's run counts.
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 6 * 60 * 60 * 1000)
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  const value = await make();
  fs.writeFileSync(file, JSON.stringify(value));
  return value;
}

export interface CreatedActivity {
  code: string;
  name: string;
  /** /planning/master-data/activities/<id> */
  path: string;
}

// Per worker, per spec file (module state is per worker).
const policies: string[] = [];
const activities: CreatedActivity[] = [];

/** Creates a policy (inactive unless `spec.active`) and records it for the afterAll check. */
export async function createPolicy(page: Page, spec: PolicySpec): Promise<string> {
  const list = new ApprovalPoliciesPage(page);
  const form = new ApprovalPolicyFormPage(page);
  await list.open();
  await list.expectLoaded();
  await list.openNew();
  await form.expectOnNew();
  await form.fillNew({ description: GA_TAG, active: false, ...spec });
  policies.push(spec.name);
  const outcome = await form.saveOk();
  expect(outcome.status, `create policy ${spec.name}`).toBe(201);
  return spec.name;
}

/** Puts policies made earlier in the run (oncePerRun) on this worker's afterAll check. */
export function watchPolicies(...names: string[]): void {
  for (const name of names) if (!policies.includes(name)) policies.push(name);
}

/**
 * Opens one of the suite's policies, applies `changes` and saves (a new
 * version). Returns the new version, or undefined when nothing changed
 * (the form then can't be saved and is left with Cancel).
 */
export async function editPolicy(
  page: Page,
  name: string,
  changes: PolicyChanges,
): Promise<number | undefined> {
  const list = new ApprovalPoliciesPage(page);
  const form = new ApprovalPolicyFormPage(page);
  await list.openPolicy(name);
  await form.applyChanges(changes);
  return (await form.saveIfChanged()).version;
}

/**
 * Creates a QA-AUTO activity draft with everything Send for approval needs
 * and returns its generated code and its page's path.
 */
export async function createActivity(page: Page): Promise<CreatedActivity> {
  const tag = uniqueTag('CUT-GA');
  const name = gaName(tag);
  const list = new ActivitiesListPage(page);
  const form = new ActivityFormPage(page);
  await list.open();
  await list.expectLoadedOrEmpty();
  await list.openNew();
  await form.expectOnCreatePage();
  await form.fillAllRequired(name);
  expect(await form.create(), `create activity ${tag}`).toBe('submitted');
  await form.expectCreatedAsDraft();
  const code = await list.codeOf(tag);
  await list.findRow(code);
  await list.openRow(code);
  await expect(page).toHaveURL(/\/planning\/master-data\/activities\/[\w-]+$/);
  const created = { code, name, path: new URL(page.url()).pathname };
  activities.push(created);
  return created;
}

/**
 * Switches `policyNames` on (with `changes`), sends `activity` for approval
 * and switches them off again — even when the send fails — so the policies
 * are in force only for the send. Returns the new request's code.
 */
export async function sendUnder(
  page: Page,
  policyNames: string[],
  activity: CreatedActivity,
  changes: PolicyChanges = {},
): Promise<string> {
  const panel = new ApprovalPanelPage(page);
  try {
    for (const name of policyNames) await editPolicy(page, name, { ...changes, active: true });
    await panel.open(activity.path);
    return await panel.sendForApproval();
  } finally {
    await deactivate(page, policyNames);
  }
}

/**
 * Switches the suite's policies off. Called from `finally`: a failure here
 * is logged, not thrown, so it can't hide the case's own error (afterAll
 * checks again).
 */
async function deactivate(page: Page, names: string[]): Promise<void> {
  for (const name of names) {
    // Retried: a policy left active would route other people's activity sends.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await editPolicy(page, name, { active: false });
        break;
      } catch (error) {
        console.warn(
          `QA-AUTO: deactivating "${name}" failed (attempt ${attempt}/3): ${String(error).split('\n')[0]}`,
        );
      }
    }
  }
}

/** Sends a fresh QA-AUTO activity under `policyNames`; returns it with its request code. */
export async function sendFresh(
  page: Page,
  policyNames: string[],
  changes: PolicyChanges = {},
): Promise<CreatedActivity & { request: string }> {
  const activity = await createActivity(page);
  const request = await sendUnder(page, policyNames, activity, changes);
  return { ...activity, request };
}

/**
 * afterAll: every request this worker's activities still have pending is
 * withdrawn (an Approvals admin may withdraw any), drafts are deleted, and
 * any of this worker's policies still active is switched off. Approved
 * activities can't be deleted and stay Active (they carry the QA-AUTO marker).
 * Best effort: a failure is logged, never a test failure.
 */
export function cleanUpApprovalsAfterAll(): void {
  test.afterAll(async ({ browser }) => {
    test.setTimeout(600_000);
    await cleanUp(browser);
  });
}

async function cleanUp(browser: Browser): Promise<void> {
  const page = await setupPage(browser);
  page.setDefaultTimeout(30_000);
  const done: string[] = [];
  try {
    for (const activity of activities.splice(0)) {
      try {
        const panel = new ApprovalPanelPage(page);
        await panel.open(activity.path);
        if (await panel.locators.withdrawButton.isVisible()) {
          await panel.withdraw('QA-AUTO generic-approval suite cleanup');
          await panel.reload();
        }
        if (await panel.locators.deleteDraftButton.isVisible())
          await new ActivityFormPage(page).deleteDraft();
        done.push(activity.code);
      } catch (error) {
        console.warn(`QA-AUTO cleanup: ${activity.code}: ${String(error).split('\n')[0]}`);
      }
    }
    const list = new ApprovalPoliciesPage(page);
    for (const name of policies.splice(0)) {
      try {
        await list.findRow(name);
        if ((await list.cellValue(name, 'Status')) !== 'Inactive') {
          await deactivate(page, [name]);
          done.push(`policy "${name}" deactivated`);
        }
      } catch (error) {
        console.warn(`QA-AUTO cleanup: policy "${name}": ${String(error).split('\n')[0]}`);
      }
    }
  } finally {
    await page.close();
    if (done.length) console.log(`QA-AUTO cleanup (generic-approval): ${done.join(', ')}`);
  }
}
