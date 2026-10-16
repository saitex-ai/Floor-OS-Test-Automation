import * as path from 'path';
import { type Browser, type Page, expect, test } from '@playwright/test';
import { type MasterDataListPage } from '../../../../src/pages/planning/master-data-list.page';
import { ActivitiesListPage } from '../../../../src/pages/planning/activities-list.page';
import { ActivityFormPage } from '../../../../src/pages/planning/activity-form.page';
import { DifficultyGradeListPage } from '../../../../src/pages/planning/difficulty-grade-list.page';
import { DifficultyGradeFormPage } from '../../../../src/pages/planning/difficulty-grade-form.page';
import { RecipesListPage } from '../../../../src/pages/planning/recipes-list.page';
import { RecipeDetailPage } from '../../../../src/pages/planning/recipe-detail.page';
import { MachinesListPage } from '../../../../src/pages/planning/machines-list.page';
import { MachineDetailPage } from '../../../../src/pages/planning/machine-detail.page';
import { MachineFormPage } from '../../../../src/pages/planning/machine-form.page';
import { MaintenanceWindowFormPage } from '../../../../src/pages/planning/maintenance-window-form.page';
import { WorkCentresListPage } from '../../../../src/pages/planning/work-centres-list.page';
import { WorkCentreDetailPage } from '../../../../src/pages/planning/work-centre-detail.page';
import { WorkCentreFormPage } from '../../../../src/pages/planning/work-centre-form.page';
import { OperationsListPage } from '../../../../src/pages/planning/operations-list.page';
import { OperationDetailPage } from '../../../../src/pages/planning/operation-detail.page';
import { OperationMasterFormPage } from '../../../../src/pages/planning/operation-master-form.page';
import { WAIT } from '../../../../src/pages/planning/waits';
import { CodeListValuesPage } from '../../../../src/pages/planning/code-lists.page';
import { CodeListValueDialogPage } from '../../../../src/pages/planning/code-list-value-dialog.page';
import { CalendarsListPage } from '../../../../src/pages/planning/calendars-list.page';
import { CalendarFormPage } from '../../../../src/pages/planning/calendar-form.page';
import { ShiftKindsPage } from '../../../../src/pages/planning/shift-kinds.page';
import { ShiftFormPage, ShiftsListPage } from '../../../../src/pages/planning/shifts.page';
import {
  deactivateDepartment,
  deactivateEmployee,
} from '../../../../src/fixtures/cross-module.helpers';
import { currentSpecFile, takeCodes } from './created';
import {
  openActivity,
  openGrade,
  openMachine,
  openOperation,
  openRecipe,
  openWorkCentre,
  CODE_LIST_A,
  CODE_LIST_B,
  runPrefix,
  setupPage,
} from './test-data';

/**
 * End-of-file cleanup for the QA-AUTO records a spec created. Planning
 * masters mostly can't be deleted: drafts (activities, recipes) are
 * deleted; everything else is retired, which takes it out of the pickers
 * real users see (operations, work centres, machines, difficulty grades).
 * Best effort — a record that can't be cleaned is logged,
 * never a test failure (the QA-AUTO tag still marks it for the backend).
 */
interface Cleaner<L extends MasterDataListPage = MasterDataListPage> {
  prefix: string;
  /** The list page(s) whose search finds the records by code. */
  lists(page: Page): L[];
  /** How the app stores a generated code (e.g. code-list values are lower case). */
  normalize?: (code: string) => string;
  /** Already clean (e.g. the row reads "Retired"), so nothing to do. */
  done?: (rowText: string) => boolean;
  // Method signatures (bivariant), so a Cleaner<CodeListValuesPage> fits in Cleaner[].
  clean(page: Page, code: string, list: L): Promise<void>;
}

const retired = (row: string) => /\bRetired\b/.test(row);

async function retireMachine(page: Page, code: string): Promise<void> {
  await openMachine(page, code);
  const detail = new MachineDetailPage(page);
  // Windows have no code of their own: switch off (soft-delete) the
  // machine's still-active ones before the machine is retired.
  for (const why of await detail.activeWindowWhys()) {
    await detail.openWindowEdit(why);
    const windowForm = new MaintenanceWindowFormPage(page);
    await windowForm.expectOpenForEdit(code);
    await windowForm.fill({ active: false });
    expect(await windowForm.saveChanges(), `deactivate window "${why}"`).toBe('submitted');
    await expect(windowForm.locators.saveButton).toBeHidden({ timeout: WAIT.NAVIGATION });
  }
  await detail.startEditing();
  const form = new MachineFormPage(page);
  await form.expectOnEditPage();
  await form.setStatus('Retired');
  await form.saveChanges();
}

async function retireWorkCentre(page: Page, code: string): Promise<void> {
  await openWorkCentre(page, code);
  await new WorkCentreDetailPage(page).startEditing();
  const form = new WorkCentreFormPage(page);
  await form.expectOnEditPage();
  await form.setStatus('Retired');
  await form.saveChanges();
}

async function deleteActivityDraft(page: Page, code: string): Promise<void> {
  await openActivity(page, code);
  await new ActivityFormPage(page).deleteDraft();
}

async function deleteRecipeDraft(page: Page, code: string): Promise<void> {
  await openRecipe(page, code);
  await new RecipeDetailPage(page).deleteDraft();
}

/**
 * In order: records that use others are cleaned first (machines before
 * their work centres, recipes before the grades they're rated with).
 */
export const CLEANERS: Cleaner[] = [
  {
    // A shift can't be deleted; Active off retires it (its breaks go with it).
    prefix: 'QA_SH',
    lists: (page) => [new ShiftsListPage(page)],
    done: retired,
    clean: async (page, code) => {
      const form = new ShiftFormPage(page);
      await form.openEdit(code);
      await form.fill({ active: false });
      await form.saveChanges();
    },
  },
  {
    // Shift kinds: Active off in the edit dialog retires them.
    prefix: 'qa_auto_k',
    lists: (page) => [new ShiftKindsPage(page)],
    normalize: (code) => code.toLowerCase(),
    done: retired,
    clean: async (page, code, kinds: ShiftKindsPage) => {
      await kinds.openRow(code);
      await kinds.startEditing();
      await kinds.fill({ active: false });
      await kinds.saveChanges();
      await kinds.closeDialog();
    },
  } satisfies Cleaner<ShiftKindsPage>,
  {
    // A calendar can't be deleted; Active off retires it (its lines and entries go with it).
    prefix: 'QA-CAL',
    lists: (page) => [new CalendarsListPage(page)],
    done: retired,
    clean: async (page, code) => {
      const form = new CalendarFormPage(page);
      await form.openEdit(code);
      await form.fill({ active: false });
      await form.saveChanges();
    },
  },
  {
    // Code-list values can't be deleted: "In use" off retires them.
    prefix: 'qa_auto_',
    lists: (page) => [CODE_LIST_A, CODE_LIST_B].map((t) => new CodeListValuesPage(page, t)),
    normalize: (code) => code.toLowerCase(),
    done: (row) => /\bNo\s*$/.test(row),
    clean: async (page, code, list: CodeListValuesPage) => {
      const dialog = new CodeListValueDialogPage(page);
      await list.openRow(code);
      await dialog.startEditing();
      await dialog.setInUse(false);
      await dialog.saveChanges();
      await dialog.close();
    },
  } satisfies Cleaner<CodeListValuesPage>,
  {
    prefix: 'QA-M',
    lists: (page) => [new MachinesListPage(page)],
    done: retired,
    clean: retireMachine,
  },
  {
    prefix: 'QA-WC',
    lists: (page) => [new WorkCentresListPage(page)],
    done: retired,
    clean: retireWorkCentre,
  },
  {
    prefix: 'QA-OP',
    lists: (page) => [new OperationsListPage(page)],
    done: retired,
    clean: async (page, code) => {
      await openOperation(page, code);
      await new OperationDetailPage(page).startEditing();
      const form = new OperationMasterFormPage(page);
      await form.expectOnEditPage();
      await form.setStatus('Retired');
      await form.saveChanges();
    },
  },
  {
    prefix: 'CUT-QA',
    lists: (page) => [new ActivitiesListPage(page)],
    clean: deleteActivityDraft,
  },
  {
    prefix: 'QAR-',
    lists: (page) => [new RecipesListPage(page)],
    clean: deleteRecipeDraft,
  },
  {
    prefix: 'QG',
    lists: (page) => [new DifficultyGradeListPage(page)],
    done: (row) => /Retired/.test(row),
    clean: async (page, code) => {
      await openGrade(page, code);
      const form = new DifficultyGradeFormPage(page);
      await form.startEditing();
      await form.fill({ active: false });
      await form.saveChanges();
    },
  },
];

/** Call from a spec's afterAll: cleans up every record that spec file created in this worker. */
export async function cleanUpCreated(
  browser: Browser,
  cleaners: Cleaner[] = CLEANERS,
): Promise<void> {
  const file = currentSpecFile();
  const page = await setupPage(browser);
  // No action timeout is configured, so a click on a row that never appears
  // would wait out the whole hook; fail that record instead and move on.
  page.setDefaultTimeout(30_000);
  const cleaned: string[] = [];
  try {
    for (const cleaner of cleaners) {
      const norm = cleaner.normalize ?? ((c: string) => c);
      const codes = takeCodes(file, cleaner.prefix).map(norm);
      if (!codes.length) continue;
      for (const list of cleaner.lists(page)) {
        await list.open();
        await list.expectLoaded();
        // Codes that were generated but never saved (blocked/cancel cases) have no row.
        const rows = await list.rowTexts(norm(runPrefix(cleaner.prefix)), codes);
        for (const [code, rowText] of rows) {
          if (cleaner.done?.(rowText)) continue;
          try {
            await cleaner.clean(page, code, list);
            cleaned.push(code);
          } catch (error) {
            console.warn(
              `QA-AUTO cleanup: could not clean ${code}: ${String(error).split('\n')[0]}`,
            );
          }
        }
      }
    }
  } finally {
    await page.close();
    if (cleaned.length)
      console.log(`QA-AUTO cleanup (${path.basename(file)}): ${cleaned.join(', ')}`);
  }
}

/** The afterAll every Planning regression spec registers. */
export function cleanUpAfterAll(cleaners?: Cleaner[]): void {
  test.afterAll(async ({ browser }) => {
    // One search per record type, then ~10–20 s per record cleaned on dev.
    test.setTimeout(900_000);
    await cleanUpCreated(browser, cleaners);
  });
}

/**
 * afterAll for the Set up my department wizard. `created` lists what the
 * spec submitted, in order: department codes (`QAD…`), and "<kind>:<code>" for
 * the records added under them — activity / recipe drafts (deleted), centre /
 * machine (retired) and "operator:<name>" (deactivated). Their codes are the
 * ones dev generated (since the 2026-10-16 deploy). Cleaned newest first, so
 * machines go before their centre and each department goes last. A record that
 * can't be cleaned is logged, not failed.
 */
export async function cleanUpWizardDepartments(browser: Browser, created: string[]): Promise<void> {
  if (!created.length) return;
  const page = await setupPage(browser);
  // No action timeout is configured, so a click on a row that never appears
  // would wait out the whole hook; fail that record instead and move on.
  page.setDefaultTimeout(30_000);
  const cleaned: string[] = [];
  const cleaners: Record<string, (page: Page, code: string) => Promise<void>> = {
    machine: retireMachine,
    centre: retireWorkCentre,
    recipe: deleteRecipeDraft,
    activity: deleteActivityDraft,
    // Its Step 6 qualification (TC-DW-TEAM-04) has no profile on Operators &
    // Qualifications to retire it from; it stays on the deactivated employee.
    operator: deactivateEmployee,
  };
  try {
    for (const label of [...created].reverse()) {
      const [kind, value] = label.includes(':') ? label.split(/:(.*)/) : ['department', label];
      try {
        await (cleaners[kind!] ?? deactivateDepartment)(page, value!);
        cleaned.push(label);
      } catch (error) {
        console.warn(`QA-AUTO cleanup: could not clean ${label}: ${String(error).split('\n')[0]}`);
      }
    }
  } finally {
    await page.close();
    if (cleaned.length) console.log(`QA-AUTO cleanup (setup-department): ${cleaned.join(', ')}`);
  }
}
