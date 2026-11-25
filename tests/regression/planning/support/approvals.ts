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
import { RecipesListPage } from '../../../../src/pages/planning/recipes-list.page';
import { RecipeFormPage } from '../../../../src/pages/planning/recipe-form.page';
import { ApprovalPanelPage } from '../../../../src/pages/planning/approval-panel.page';
import { ShellHeaderPage } from '../../../../src/pages/shell/shell-header.page';
import type { PersonaSessions } from '../../../../src/fixtures/planning-personas';
import {
  asPersona,
  personaCredentials,
  personaSkipReason,
  setupPage,
  uniqueTag,
} from './test-data';

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
 * worker's is left active (and throws if one is), withdraws any request
 * still pending. A run killed mid-send
 * (Ctrl-C, a CI cancel, a sleeping Mac) skips all of that, so the first
 * worker of every run also sweeps the suite's leftover active policies
 * (sweepStrayPolicies).
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

/** The policies' scope: the one consumer the suite switches on (planning · activity). */
export const APPLIES_TO = 'planning · activity';

/** What every QA-AUTO policy's name carries (see gaName): a policy with this is the suite's own. */
const GA_NAME_MARK = 'generic-approval test data';

/** Splits active policy names into the suite's own (a leak) and everyone else's (real policies). */
export function splitActivePolicies(names: string[]): { ours: string[]; others: string[] } {
  return {
    ours: names.filter((n) => n.includes(GA_NAME_MARK)),
    others: names.filter((n) => !n.includes(GA_NAME_MARK)),
  };
}

/**
 * For the cases that need "no policy in force": fails when one of the suite's
 * own policies is still active (a leak: cleanup did not stick), skips when a
 * real policy is — a send would then go through and sending isn't ours to block.
 */
export async function skipWhenRealPolicyActive(list: ApprovalPoliciesPage): Promise<void> {
  const { ours, others } = splitActivePolicies(await list.activePoliciesFor(APPLIES_TO));
  expect(ours, 'a QA-AUTO policy is still ACTIVE (a leaked one): switch it off by hand').toEqual(
    [],
  );
  test.skip(
    others.length > 0,
    `A real active ${APPLIES_TO} policy is in force (${others.join(', ')}), so a send would go through.`,
  );
}

/** The main Planning login (an Approvals admin), as the pickers show it. */
export const ALICE = 'Alice Planner';

/**
 * The second approver — the READONLY persona (approval.user), whose display
 * name is read from her user menu by resolveApprover() so no name is
 * written into the suite. Without that login it falls back to alice, which
 * is enough for the Policies cases that only need *an* approver; every case
 * that needs a second person or acts as her skips with needsApprover().
 */
export const people = { approver: ALICE, hasApprover: false };

/** beforeAll (before any case reads `people`): reads the READONLY persona's display name. */
export async function resolveApprover(personas: PersonaSessions): Promise<void> {
  if (!personaCredentials('READONLY')) return;
  await asPersona(personas, 'READONLY', async (page) => {
    const header = new ShellHeaderPage(page);
    await header.gotoAuthenticated('/approvals');
    // The menu reads e.g. "<initials> <name> <role> <email>", one item per line.
    const lines = (await header.signedInUserText())
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const name = lines.find((l) => !/^[A-Z]{1,3}$/.test(l) && !l.includes('@'));
    expect(
      name,
      `the READONLY login's display name in the user menu: ${lines.join(' | ')}`,
    ).toBeTruthy();
    people.approver = name!;
    people.hasApprover = true;
  });
}

/** How a seat in the approval chain names a person: the first name ("Alice Pending"). */
export const seat = (displayName: string): string => displayName.split(' ')[0]!;

/** Skips the running case when it needs the second approver (the READONLY persona). */
export function needsApprover(): void {
  test.skip(!people.hasApprover, personaSkipReason('READONLY'));
}

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

/** "Cutting" where the environment has it (dev), else its first department (uat has only Sewing). */
async function usableDepartment(form: ActivityFormPage): Promise<string> {
  const names = await form.owningDepartmentNames();
  return names.includes('Cutting') ? 'Cutting' : names[0]!;
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
  await form.fillAllRequired(name, { department: await usableDepartment(form) });
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
  let request: string;
  try {
    for (const name of policyNames) await editPolicy(page, name, { ...changes, active: true });
    await panel.open(activity.path);
    request = await panel.sendForApproval();
  } catch (error) {
    // Off again even when the send failed. If that fails too the leak is the
    // bigger problem: both reasons are thrown, never just warned.
    try {
      await deactivate(page, policyNames);
    } catch (leak) {
      throw new Error(
        `${String(leak)} (the send itself failed first: ${String(error).split('\n')[0]})`,
      );
    }
    throw error;
  }
  await deactivate(page, policyNames);
  return request;
}

/**
 * Switches the suite's policies off, retrying each three times (a policy left
 * active would route other people's activity sends). Throws when one
 * still is active afterwards.
 */
export async function deactivate(page: Page, names: string[]): Promise<void> {
  const stuck: string[] = [];
  for (const name of names) {
    let reason = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await editPolicy(page, name, { active: false });
        reason = '';
        break;
      } catch (error) {
        reason = String(error).split('\n')[0]!;
      }
    }
    if (reason) stuck.push(`"${name}" (${reason})`);
  }
  if (stuck.length)
    throw new Error(`QA-AUTO policy left ACTIVE, switch it off by hand: ${stuck.join('; ')}`);
}

/**
 * Start of the run: switches off any active planning · activity policy the
 * suite itself made (its name carries the QA-AUTO marker) that a killed run
 * left on. Only the first worker of a run sweeps (an exclusive marker file,
 * like oncePerRun's), so a later worker can't switch off a policy the
 * running worker has on for a send. Never touches anyone else's policy.
 */
export async function sweepStrayPolicies(page: Page): Promise<void> {
  const claim = path.join(os.tmpdir(), `pw-generic-approval-${process.ppid}-sweep`);
  try {
    if (fs.existsSync(claim) && Date.now() - fs.statSync(claim).mtimeMs > 6 * 60 * 60 * 1000)
      fs.unlinkSync(claim);
    fs.writeFileSync(claim, '', { flag: 'wx' });
  } catch {
    return; // another worker of this run already sweeps
  }
  const stray = splitActivePolicies(
    await new ApprovalPoliciesPage(page).activePoliciesFor(APPLIES_TO),
  ).ours;
  if (stray.length) {
    await deactivate(page, stray);
    console.log(`QA-AUTO sweep (generic-approval): switched off leftover ${stray.join(', ')}`);
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
 * Every failure is collected and thrown once everything has been tried: a
 * policy that stays on affects other people, so it must fail the run.
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
  const problems: string[] = [];
  try {
    for (const activity of activities.splice(0)) {
      try {
        const panel = new ApprovalPanelPage(page);
        await panel.open(activity.path);
        if (await panel.canWithdraw()) {
          await panel.withdraw('QA-AUTO generic-approval suite cleanup');
          await panel.reload();
        }
        if (await panel.canDeleteDraft()) await new ActivityFormPage(page).deleteDraft();
        done.push(activity.code);
      } catch (error) {
        problems.push(`${activity.code}: ${String(error).split('\n')[0]}`);
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
        problems.push(`policy "${name}": ${String(error).split('\n')[0]}`);
      }
    }
  } finally {
    await page.close();
    if (done.length) console.log(`QA-AUTO cleanup (generic-approval): ${done.join(', ')}`);
  }
  if (problems.length)
    throw new Error(`QA-AUTO cleanup (generic-approval) did not stick: ${problems.join(' | ')}`);
}

/**
 * Whether the environment can build the recipe the shared helper creates: it
 * needs the "Cutting" department (uat has only Sewing) and its CUT-BULK
 * activity to be offered by "Fills activity" (dev 2026-11-25: not offered
 * while CUT-BULK has a revision open, "No activity matches that.").
 */
export async function cuttingRecipeSeedAvailable(page: Page): Promise<boolean> {
  const list = new RecipesListPage(page);
  const form = new RecipeFormPage(page);
  await list.open();
  await list.expectLoadedOrEmpty();
  await list.openNew();
  if (!(await form.owningDepartmentNames()).includes('Cutting')) return false;
  return form.fillsActivityOffered('Cutting', 'CUT-BULK');
}
