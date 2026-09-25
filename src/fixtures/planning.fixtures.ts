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
});

export { expect } from '@playwright/test';
