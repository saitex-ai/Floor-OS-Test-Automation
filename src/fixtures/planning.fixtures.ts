import { test as base } from '@playwright/test';
import { PlanningPage } from '../pages/planning/planning.page';
import { CalendarsListPage } from '../pages/planning/calendars-list.page';
import { CalendarFormPage } from '../pages/planning/calendar-form.page';
import { WorkCentresListPage } from '../pages/planning/work-centres-list.page';
import { WorkCentreFormPage } from '../pages/planning/work-centre-form.page';
import { QualificationsListPage } from '../pages/planning/qualifications-list.page';
import { QualificationFormPage } from '../pages/planning/qualification-form.page';
import { MachinesListPage } from '../pages/planning/machines-list.page';
import { MachineFormPage } from '../pages/planning/machine-form.page';
import { ActivitiesListPage } from '../pages/planning/activities-list.page';
import { ActivityFormPage } from '../pages/planning/activity-form.page';
import { DifficultyGradeListPage } from '../pages/planning/difficulty-grade-list.page';
import { DifficultyGradeFormPage } from '../pages/planning/difficulty-grade-form.page';
import { RecipesListPage } from '../pages/planning/recipes-list.page';
import { RecipeFormPage } from '../pages/planning/recipe-form.page';
import { RecipeDetailPage } from '../pages/planning/recipe-detail.page';
import { OperationFormPage } from '../pages/planning/operation-form.page';

interface PlanningFixtures {
  planningPage: PlanningPage;
  calendarsListPage: CalendarsListPage;
  calendarFormPage: CalendarFormPage;
  workCentresListPage: WorkCentresListPage;
  workCentreFormPage: WorkCentreFormPage;
  qualificationsListPage: QualificationsListPage;
  qualificationFormPage: QualificationFormPage;
  machinesListPage: MachinesListPage;
  machineFormPage: MachineFormPage;
  activitiesListPage: ActivitiesListPage;
  activityFormPage: ActivityFormPage;
  difficultyGradeListPage: DifficultyGradeListPage;
  difficultyGradeFormPage: DifficultyGradeFormPage;
  recipesListPage: RecipesListPage;
  recipeFormPage: RecipeFormPage;
  recipeDetailPage: RecipeDetailPage;
  operationFormPage: OperationFormPage;
}

/**
 * Fixture set scoped to the Planning module only. Each module gets its own
 * file on purpose — the Planning QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<PlanningFixtures>({
  planningPage: async ({ page }, use) => {
    await use(new PlanningPage(page));
  },

  calendarsListPage: async ({ page }, use) => {
    await use(new CalendarsListPage(page));
  },

  calendarFormPage: async ({ page }, use) => {
    await use(new CalendarFormPage(page));
  },

  workCentresListPage: async ({ page }, use) => {
    await use(new WorkCentresListPage(page));
  },

  workCentreFormPage: async ({ page }, use) => {
    await use(new WorkCentreFormPage(page));
  },

  qualificationsListPage: async ({ page }, use) => {
    await use(new QualificationsListPage(page));
  },

  qualificationFormPage: async ({ page }, use) => {
    await use(new QualificationFormPage(page));
  },

  machinesListPage: async ({ page }, use) => {
    await use(new MachinesListPage(page));
  },

  machineFormPage: async ({ page }, use) => {
    await use(new MachineFormPage(page));
  },

  activitiesListPage: async ({ page }, use) => {
    await use(new ActivitiesListPage(page));
  },

  activityFormPage: async ({ page }, use) => {
    await use(new ActivityFormPage(page));
  },

  difficultyGradeListPage: async ({ page }, use) => {
    await use(new DifficultyGradeListPage(page));
  },

  difficultyGradeFormPage: async ({ page }, use) => {
    await use(new DifficultyGradeFormPage(page));
  },

  recipesListPage: async ({ page }, use) => {
    await use(new RecipesListPage(page));
  },

  recipeFormPage: async ({ page }, use) => {
    await use(new RecipeFormPage(page));
  },

  recipeDetailPage: async ({ page }, use) => {
    await use(new RecipeDetailPage(page));
  },

  operationFormPage: async ({ page }, use) => {
    await use(new OperationFormPage(page));
  },
});

export { expect } from '@playwright/test';
