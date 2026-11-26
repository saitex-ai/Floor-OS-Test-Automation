import { type Page, expect, test } from '@playwright/test';
import {
  OperatorProfilePage,
  type OperatorFieldValues,
  type QualificationValues,
} from '../../../../src/pages/planning/operator-profile.page';
import {
  createEmployee,
  deactivateEmployee,
  moveEmployeeToAnotherDepartment,
} from '../../../../src/fixtures/cross-module.helpers';
import { setupPage } from './test-data';

/**
 * Test data for 19-operators-qualifications.spec.ts. An operator profile
 * hangs off an employee (at most one profile per employee, and profiles are
 * retired, never deleted), so each operator the suite needs gets its own
 * QA-AUTO employee, created in Master Data > Employees — real employees and
 * seed profiles are only ever read. The employee's name carries the marker,
 * and the operator's heading is that name.
 */
export const OPERATORS_TAG =
  'QA-AUTO — operator-profiles test data (pw-hybrid-framework). Safe to delete.';

/** Every QA employee goes in Sewing: the one department both dev and uat have (2026-11-17). */
export const QA_DEPARTMENT = /^Sewing\s+SEW$/;
/** A time-based home work centre on dev and uat: Overall efficiency only saves on one. */
export const TIME_BASED_CENTRE = 'LINE-30';
/** A cycle-based (machine-paced) home work centre on dev and uat. */
export const CYCLE_BASED_CENTRE = 'DYE-A';

const RUN = `${Date.now().toString(36).toUpperCase().slice(-4)}${process.env.TEST_WORKER_INDEX ?? '0'}`;
let counter = 0;

export interface QaEmployee {
  name: string;
  employeeNo: string;
  department: string;
}

export interface QaOperator extends QaEmployee {
  /** The profile's id (its view is /planning/master-data/operators/<id>). */
  id: string;
}

const employees: QaEmployee[] = [];
const operators: QaOperator[] = [];

/** "QA-AUTO OQ<run><n> — operator-profiles test data …": the employee's (and operator's) name. */
function nextName(): string {
  counter += 1;
  return OPERATORS_TAG.replace('QA-AUTO', `QA-AUTO OQ${RUN}${counter.toString(36).toUpperCase()}`);
}

/** Creates a QA-AUTO employee (no profile yet) in Master Data and records it for cleanup. */
export async function createQaEmployee(page: Page): Promise<QaEmployee> {
  const name = nextName();
  const { employeeNo, department } = await createEmployee(page, name, 'Sewing', QA_DEPARTMENT);
  const employee = { name, employeeNo, department };
  employees.push(employee);
  return employee;
}

/**
 * Picks `employee` on an open New operator form. A just-created employee
 * reaches the picker's lookups a few seconds late (dev 2026-11-17: missing
 * from a form opened right after the create), so the form is reloaded until
 * it's offered.
 */
export async function pickEmployee(form: OperatorProfilePage, employee: QaEmployee): Promise<void> {
  await expect(async () => {
    // A search with no match shows no options at all: that is "not offered yet" too.
    const options = await form
      .optionsOf('Employee', employee.employeeNo)
      .catch(() => [] as string[]);
    if (!options.some((o) => o.startsWith(`${employee.employeeNo} · `))) {
      await form.reloadNew();
      throw new Error(`${employee.employeeNo} isn't offered yet`);
    }
  }).toPass({ timeout: 120_000, intervals: [5_000] });
  await form.fill({
    employeeSearch: employee.employeeNo,
    employee: new RegExp(`^${employee.employeeNo} · `),
  });
}

/**
 * Creates a QA employee and an operator profile for it with `values`
 * (Deployment defaults to Fixed to one centre), adds `qualifications` on
 * step 2, then presses Done. Ends on the operator's view.
 */
export async function createQaOperator(
  page: Page,
  values: OperatorFieldValues = {},
  qualifications: QualificationValues[] = [],
): Promise<QaOperator> {
  const employee = await createQaEmployee(page);
  const form = new OperatorProfilePage(page);
  await form.openNew();
  await pickEmployee(form, employee);
  await form.fill({ deployment: 'Fixed to one centre', ...values });
  const { status, body } = await form.saveAndContinue();
  expect(status, `create the operator for ${employee.employeeNo}`).toBe(201);
  const operator = { ...employee, id: String(body!.id) };
  operators.push(operator);
  for (const q of qualifications) {
    await form.fillQualification(q);
    expect(await form.addQualification(), `add qualification ${String(q.task ?? q.activity)}`).toBe(
      201,
    );
  }
  await form.done();
  return operator;
}

/** The task codes the add row offers (the codes in "SEW-HEMBOT Hem bottom"), in order. */
export async function offeredTasks(form: OperatorProfilePage): Promise<string[]> {
  return (await form.rowOptions('Task')).filter((o) => o !== '—').map((o) => o.split(' ')[0]!);
}

/** The activity codes the add row offers, in order (none on uat, 2026-11-17). */
export async function offeredActivities(form: OperatorProfilePage): Promise<string[]> {
  return (await form.rowOptions('Activity')).filter((o) => o !== '—').map((o) => o.split(' ')[0]!);
}

/** An option pattern for a task or activity code ("SEW-HEMBOT Hem bottom"). */
export function codeOption(code: string): RegExp {
  return new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `);
}

/** yyyy-mm-dd of day `day`, `monthOffset` months from this month (what a picked date displays as). */
export function isoDay(day: number, monthOffset = 0): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * After this file's cases: retires every operator profile this worker
 * created (Active off) and switches its employee off in Master Data.
 * Every record is attempted, then the hook throws if any of them could not
 * be cleaned (its QA-AUTO name still marks it for the backend).
 */
export function cleanUpOperatorsAfterAll(): void {
  test.afterAll(async ({ browser }) => {
    test.setTimeout(900_000);
    if (employees.length === 0) return;
    const page = await setupPage(browser);
    page.setDefaultTimeout(30_000);
    page.setDefaultNavigationTimeout(120_000);
    const form = new OperatorProfilePage(page);
    const failures: string[] = [];
    for (const operator of operators.splice(0)) {
      try {
        await form.openEdit(operator.id);
        if (await form.isActiveOn()) {
          await form.fill({ active: false });
          const { status } = await form.saveAndContinue();
          if (status !== 200) throw new Error(`PUT answered ${status}`);
        }
      } catch (error) {
        failures.push(`couldn't retire operator ${operator.employeeNo}: ${String(error)}`);
      }
    }
    for (const employee of employees.splice(0)) {
      try {
        await deactivateEmployee(page, employee.name);
      } catch (error) {
        failures.push(`couldn't deactivate employee ${employee.employeeNo}: ${String(error)}`);
      }
    }
    await page.close();
    if (failures.length > 0)
      throw new Error(`cleanup left QA-AUTO records:\n${failures.join('\n')}`);
  });
}

/** One qualification the rich operator holds, and how the screens should show it. */
export interface QaQualification {
  code: string;
  kind: 'task' | 'activity';
  /** The Qualified badge: "Qualified", "Lapsed" or "Not qualified" (a retired row reads "Not qualified"). */
  state: 'Qualified' | 'Lapsed' | 'Not qualified';
  active: boolean;
  efficiency: string;
  source: 'HR system' | 'IE assessment';
  /** yyyy-mm-dd, or "Does not expire". */
  validUntil: string;
}

export interface RichOperator extends QaOperator {
  homeWorkCentre: string;
  usualShift: string;
  skillGrade: string;
  onFloorSince: string;
  qualifications: QaQualification[];
}

/** Tasks to use, seed (SEW-) tasks first: the other offered tasks are often other suites' QA records. */
function preferSeed(codes: string[]): string[] {
  return [
    ...codes.filter((c) => c.startsWith('SEW-')),
    ...codes.filter((c) => !c.startsWith('SEW-')),
  ];
}

/**
 * The operator most read-only cases look at: Fixed to one centre on
 * LINE-30, S2, efficiency 95, on the floor since the 10th of last month,
 * the first real usual shift offered (or "Single shift"), and 11 task
 * qualifications — one IE-assessed, one lapsed (Valid until the 1st of last
 * month), one not qualified, one retired, one valid until the 28th of next
 * month, six plain — plus one activity where the environment has
 * activities (dev; uat has none, 2026-11-17). Ends on its view.
 */
export async function createRichOperator(page: Page): Promise<RichOperator> {
  const employee = await createQaEmployee(page);
  const form = new OperatorProfilePage(page);
  await form.openNew();
  const shifts = (await form.optionsOf('Usual shift')).filter((s) => s !== 'Single shift');
  const usualShift = shifts[0] ?? 'Single shift';
  await pickEmployee(form, employee);
  await form.fill({
    homeWorkCentreSearch: TIME_BASED_CENTRE,
    homeWorkCentre: new RegExp(`^${TIME_BASED_CENTRE} · `),
    usualShift,
    skillGrade: /^S2 — /,
    deployment: 'Fixed to one centre',
    efficiency: '95',
    onFloorSince: { day: 10, monthOffset: -1 },
  });
  const { status, body } = await form.saveAndContinue();
  expect(status, `create the rich operator for ${employee.employeeNo}`).toBe(201);
  const operator: QaOperator = { ...employee, id: String(body!.id) };
  operators.push(operator);

  const tasks = preferSeed(await offeredTasks(form));
  const activities = await offeredActivities(form);
  expect(tasks.length, 'tasks offered for qualifications').toBeGreaterThanOrEqual(11);
  const plan: { values: QualificationValues; q: QaQualification }[] = [];
  const base = (code: string, kind: 'task' | 'activity'): QaQualification => ({
    code,
    kind,
    state: 'Qualified',
    active: true,
    efficiency: '100%',
    source: 'HR system',
    validUntil: 'Does not expire',
  });
  tasks.slice(0, 11).forEach((code, i) => {
    const q = base(code, 'task');
    const values: QualificationValues = {
      task: codeOption(code),
      efficiency: '100',
      assessedBy: 'HR system',
    };
    if (i === 0) Object.assign(q, { efficiency: '90%', source: 'IE assessment' });
    if (i === 0) Object.assign(values, { efficiency: '90', assessedBy: 'IE assessment' });
    if (i === 1) {
      q.state = 'Lapsed';
      q.validUntil = isoDay(1, -1);
      values.validUntil = { day: 1, monthOffset: -1 };
    }
    if (i === 2) {
      q.state = 'Not qualified';
      values.qualified = false;
    }
    if (i === 3) {
      q.state = 'Not qualified';
      q.active = false;
      values.active = false;
    }
    if (i === 4) {
      q.validUntil = isoDay(28, 1);
      values.validUntil = { day: 28, monthOffset: 1 };
    }
    plan.push({ values, q });
  });
  const activity = activities.find((a) => a.startsWith('WASH-')) ?? activities[0];
  if (activity)
    plan.push({
      values: { activity: codeOption(activity), efficiency: '100', assessedBy: 'HR system' },
      q: base(activity, 'activity'),
    });
  for (const { values, q } of plan) {
    await form.fillQualification(values);
    expect(await form.addQualification(), `add ${q.code} to the rich operator`).toBe(201);
  }
  await form.done();
  return {
    ...operator,
    homeWorkCentre: TIME_BASED_CENTRE,
    usualShift,
    skillGrade: 'S2 — developing',
    onFloorSince: isoDay(10, -1),
    qualifications: plan.map((p) => p.q),
  };
}

/** The list's roll-ups for `quals`: Certifications (a count) and Qualified ("8 of 10 · 1 lapsed"). */
export function rollUps(quals: QaQualification[]): { certifications: string; qualified: string } {
  const held = quals.filter((q) => q.active);
  const lapsed = held.filter((q) => q.state === 'Lapsed').length;
  const qualified = held.filter((q) => q.state === 'Qualified').length;
  return {
    certifications: String(held.length),
    qualified: held.length
      ? `${qualified} of ${held.length}${lapsed ? ` · ${lapsed} lapsed` : ''}`
      : '—',
  };
}

/**
 * Master Data > Employees: moves this suite's own employee to another
 * department; null when only one department is offered (uat, 2026-11-17).
 */
export async function moveQaEmployee(page: Page, employee: QaEmployee): Promise<string | null> {
  return moveEmployeeToAnotherDepartment(page, employee.name, employee.department);
}
