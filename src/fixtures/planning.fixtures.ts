import { test as base } from '@playwright/test';
import { PersonaSessions } from './planning-personas';
import { PlanningPage } from '../pages/planning/planning.page';
import { CalendarsListPage } from '../pages/planning/calendars-list.page';
import { CalendarFormPage } from '../pages/planning/calendar-form.page';
import { WorkCentresListPage } from '../pages/planning/work-centres-list.page';
import { WorkCentreFormPage } from '../pages/planning/work-centre-form.page';
import { OperatorsListPage } from '../pages/planning/operators-list.page';
import { OperatorProfilePage } from '../pages/planning/operator-profile.page';
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
import { OperationsListPage } from '../pages/planning/operations-list.page';
import { OperationMasterFormPage } from '../pages/planning/operation-master-form.page';
import { OperationDetailPage } from '../pages/planning/operation-detail.page';
import { AllowanceFormPage } from '../pages/planning/allowance-form.page';
import { WorkCentreDetailPage } from '../pages/planning/work-centre-detail.page';
import { MachineDetailPage } from '../pages/planning/machine-detail.page';
import { MaintenanceWindowFormPage } from '../pages/planning/maintenance-window-form.page';
import { CalendarDetailPage } from '../pages/planning/calendar-detail.page';

interface PlanningFixtures {
  planningPage: PlanningPage;
  calendarsListPage: CalendarsListPage;
  calendarFormPage: CalendarFormPage;
  workCentresListPage: WorkCentresListPage;
  workCentreFormPage: WorkCentreFormPage;
  operatorsListPage: OperatorsListPage;
  operatorProfilePage: OperatorProfilePage;
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
  operationsListPage: OperationsListPage;
  operationMasterFormPage: OperationMasterFormPage;
  operationDetailPage: OperationDetailPage;
  allowanceFormPage: AllowanceFormPage;
  workCentreDetailPage: WorkCentreDetailPage;
  machineDetailPage: MachineDetailPage;
  maintenanceWindowFormPage: MaintenanceWindowFormPage;
  calendarDetailPage: CalendarDetailPage;
}

interface PlanningWorkerFixtures {
  /** The read-only / no-access logins, each logged in once per worker — see PersonaSessions. */
  personas: PersonaSessions;
}

/**
 * Fixture set scoped to the Planning module only. Each module gets its own
 * file on purpose — the Planning QA never needs to touch another module's
 * fixtures, and vice versa.
 */
export const test = base.extend<PlanningFixtures, PlanningWorkerFixtures>({
  personas: [
    async ({ browser }, use) => {
      const personas = new PersonaSessions(browser);
      await use(personas);
      await personas.close();
    },
    { scope: 'worker' },
  ],

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

  operatorsListPage: async ({ page }, use) => {
    await use(new OperatorsListPage(page));
  },

  operatorProfilePage: async ({ page }, use) => {
    await use(new OperatorProfilePage(page));
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

  operationsListPage: async ({ page }, use) => {
    await use(new OperationsListPage(page));
  },

  operationMasterFormPage: async ({ page }, use) => {
    await use(new OperationMasterFormPage(page));
  },

  operationDetailPage: async ({ page }, use) => {
    await use(new OperationDetailPage(page));
  },

  allowanceFormPage: async ({ page }, use) => {
    await use(new AllowanceFormPage(page));
  },

  workCentreDetailPage: async ({ page }, use) => {
    await use(new WorkCentreDetailPage(page));
  },

  machineDetailPage: async ({ page }, use) => {
    await use(new MachineDetailPage(page));
  },

  maintenanceWindowFormPage: async ({ page }, use) => {
    await use(new MaintenanceWindowFormPage(page));
  },

  calendarDetailPage: async ({ page }, use) => {
    await use(new CalendarDetailPage(page));
  },
});

export { expect } from '@playwright/test';
