import * as path from 'path';
import { type Browser, type Page, test } from '@playwright/test';
import { type MasterDataListPage } from '../../../../src/pages/planning/master-data-list.page';
import { ActivitiesListPage } from '../../../../src/pages/planning/activities-list.page';
import { ActivityFormPage } from '../../../../src/pages/planning/activity-form.page';
import { DifficultyGradeListPage } from '../../../../src/pages/planning/difficulty-grade-list.page';
import { DifficultyGradeFormPage } from '../../../../src/pages/planning/difficulty-grade-form.page';
import { RecipesListPage } from '../../../../src/pages/planning/recipes-list.page';
import { RecipeDetailPage } from '../../../../src/pages/planning/recipe-detail.page';
import { currentSpecFile, takeCodes } from './created';
import { openActivity, openGrade, openRecipe, runPrefix, setupPage } from './test-data';

/**
 * End-of-file cleanup for the QA-AUTO records a spec created. Planning
 * masters mostly can't be deleted: drafts (activities, recipes) are
 * deleted; everything else is retired, which takes it out of the pickers
 * real users see. Best effort — a record that can't be cleaned is logged,
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

/** In order: records that use others are cleaned first (recipes before the grades they're rated with). */
export const CLEANERS: Cleaner[] = [
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
