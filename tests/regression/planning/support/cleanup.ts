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
import { currentSpecFile, takeCodes } from './created';
import {
  openActivity,
  openGrade,
  openMachine,
  openOperation,
  openRecipe,
  openWorkCentre,
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
interface Cleaner {
  prefix: string;
  /** A list page whose search finds the records by code. */
  list: (page: Page) => MasterDataListPage;
  /** Already clean (e.g. the row reads "Retired"), so nothing to do. */
  done?: (rowText: string) => boolean;
  clean: (page: Page, code: string) => Promise<void>;
}

const retired = (row: string) => /\bRetired\b/.test(row);

/**
 * In order: records that use others are cleaned first (machines before
 * their work centres, recipes before the grades they're rated with).
 */
export const CLEANERS: Cleaner[] = [
  {
    prefix: 'QA-M',
    list: (page) => new MachinesListPage(page),
    done: retired,
    clean: async (page, code) => {
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
    },
  },
  {
    prefix: 'QA-WC',
    list: (page) => new WorkCentresListPage(page),
    done: retired,
    clean: async (page, code) => {
      await openWorkCentre(page, code);
      await new WorkCentreDetailPage(page).startEditing();
      const form = new WorkCentreFormPage(page);
      await form.expectOnEditPage();
      await form.setStatus('Retired');
      await form.saveChanges();
    },
  },
  {
    prefix: 'QA-OP',
    list: (page) => new OperationsListPage(page),
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
    list: (page) => new ActivitiesListPage(page),
    clean: async (page, code) => {
      await openActivity(page, code);
      await new ActivityFormPage(page).deleteDraft();
    },
  },
  {
    prefix: 'QAR-',
    list: (page) => new RecipesListPage(page),
    clean: async (page, code) => {
      await openRecipe(page, code);
      await new RecipeDetailPage(page).deleteDraft();
    },
  },
  {
    prefix: 'QG',
    list: (page) => new DifficultyGradeListPage(page),
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
  const cleaned: string[] = [];
  try {
    for (const cleaner of cleaners) {
      const codes = takeCodes(file, cleaner.prefix);
      if (!codes.length) continue;
      const list = cleaner.list(page);
      await list.open();
      await list.expectLoaded();
      // Codes that were generated but never saved (blocked/cancel cases) have no row.
      const rows = await list.rowTexts(runPrefix(cleaner.prefix), codes);
      for (const [code, rowText] of rows) {
        if (cleaner.done?.(rowText)) continue;
        try {
          await cleaner.clean(page, code);
          cleaned.push(code);
        } catch (error) {
          console.warn(`QA-AUTO cleanup: could not clean ${code}: ${String(error).split('\n')[0]}`);
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
