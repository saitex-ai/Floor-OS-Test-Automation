import { type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './master-data-list.locators';

export const WIZARD_STEPS = [
  'Department',
  'Activities',
  'Recipes & Operations',
  'Centres, Stations & Machines',
  'Capacity',
  'Team & Skills',
  'Review & Complete',
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/**
 * Raw element locators for the "Set up my department" wizard
 * (/planning/master-data/setup-department) and its journey card on the
 * Master Data landing page. The step forms are the standalone screens'
 * own forms rendered inline (see ActivityFormLocators, RecipeFormLocators,
 * WorkCentreFormLocators, MachineFormLocators, EmployeeFormLocators); only
 * the wizard's own chrome lives here. No actions or assertions here, see
 * src/pages/planning/setup-department.page.ts.
 */
export class SetupDepartmentLocators {
  // Landing page journey card (one link to the wizard)
  readonly journeyCard: Locator;
  readonly journeyCount: Locator;
  // Chrome
  readonly stepHeading: Locator;
  readonly progress: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly cancelSetupButton: Locator;
  // Step 1
  readonly departmentPicker: Locator;
  readonly createDepartmentButton: Locator;
  readonly editDepartmentButton: Locator;
  readonly departmentFormHeading: Locator;
  readonly deptCode: Locator;
  readonly deptName: Locator;
  readonly deptType: Locator;
  readonly deptCalendar: Locator;
  readonly deptCapacity: Locator;
  readonly deptActive: Locator;
  readonly createDepartmentSubmit: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  // Steps 2–6
  readonly createActivityButton: Locator;
  readonly createRecipeButton: Locator;
  readonly addWorkCentreButton: Locator;
  readonly addMachineButton: Locator;
  readonly createEmployeeButton: Locator;
  readonly skillsButtons: Locator;
  /** The inline employee form's name field ("Name" here, "Full Name" on Master Data). */
  readonly employeeName: Locator;
  /** The inline employee form's Department (locked to the department being set up) and Maintained by. */
  readonly employeeDepartment: Locator;
  readonly employeeMaintainedBy: Locator;
  /** The inline employee form's submit — exact, as the step's own button reads "+ Create employee". */
  readonly employeeCreateSubmit: Locator;
  readonly qualificationApprovalNote: Locator;
  readonly addQualificationButton: Locator;
  readonly qualificationActivity: Locator;
  /** Step 6's inline "Add a qualification" form (the operator is locked to the row it was opened from). */
  readonly qualificationOperator: Locator;
  readonly qualificationTask: Locator;
  readonly qualificationEfficiency: Locator;
  readonly qualificationAssessedBy: Locator;
  readonly qualificationCreate: Locator;
  readonly departmentPresetHint: Locator;
  // Step 7 + confirmation
  readonly reviewBanner: Locator;
  readonly completeButton: Locator;
  readonly confirmedHeading: Locator;
  readonly confirmedSummary: Locator;
  readonly backToMastersButton: Locator;

  constructor(private readonly page: Page) {
    this.journeyCard = page.getByRole('link', { name: /Set up my department/ });
    this.journeyCount = this.journeyCard;
    this.stepHeading = page.getByRole('main').last().getByRole('heading', { level: 1 });
    this.progress = page.getByText(/^\d+% complete/);
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.cancelSetupButton = page.getByRole('button', { name: 'Cancel setup' });
    this.departmentPicker = page.getByRole('combobox', { name: 'Department being set up' });
    this.createDepartmentButton = page.getByRole('button', { name: /^\+ ?Create department$/ });
    this.editDepartmentButton = page.getByRole('button', { name: 'Edit department' });
    this.departmentFormHeading = page.getByRole('heading', { name: /^(New|Edit) department$/ });
    this.deptCode = page.getByRole('textbox', { name: 'Department code' });
    this.deptName = page.getByRole('textbox', { name: 'Department name' });
    this.deptType = page.getByRole('combobox', { name: 'Department type', exact: true });
    this.deptCalendar = page.getByRole('combobox', { name: 'Working calendar', exact: true });
    this.deptCapacity = page.getByRole('combobox', { name: 'Capacity measured in', exact: true });
    this.deptActive = page.getByRole('switch', { name: 'Active' });
    this.createDepartmentSubmit = page.getByRole('button', {
      name: 'Create department',
      exact: true,
    });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.createActivityButton = page.getByRole('button', { name: /Create a new activity/ });
    this.createRecipeButton = page.getByRole('button', { name: /Create a new recipe/ });
    this.addWorkCentreButton = page.getByRole('button', { name: /Add a work centre/ });
    this.addMachineButton = page.getByRole('button', { name: /Add a machine/ });
    this.createEmployeeButton = page.getByRole('button', { name: /Create employee/ });
    this.skillsButtons = page.getByRole('button', { name: 'Skills', exact: true });
    this.employeeName = page
      .getByRole('main')
      .last()
      .getByRole('textbox', { name: 'Name', exact: true });
    this.employeeDepartment = page.getByRole('combobox', { name: 'Department', exact: true });
    this.employeeMaintainedBy = page.getByRole('combobox', { name: 'Maintained by', exact: true });
    this.employeeCreateSubmit = page.getByRole('button', { name: 'Create employee', exact: true });
    this.qualificationApprovalNote = page.getByText(/needs the department manager's approval/);
    this.addQualificationButton = page.getByRole('button', { name: /Add a qualification/ });
    this.qualificationActivity = page.getByRole('combobox', { name: 'Activity', exact: true });
    this.qualificationOperator = page.getByRole('combobox', { name: 'Operator', exact: true });
    this.qualificationTask = page.getByRole('combobox', { name: 'Task', exact: true });
    this.qualificationEfficiency = page.getByRole('textbox', { name: 'Efficiency vs standard' });
    this.qualificationAssessedBy = page.getByRole('combobox', { name: 'Assessed by', exact: true });
    this.qualificationCreate = page.getByRole('button', { name: 'Create qualification' });
    this.departmentPresetHint = page.getByText(/Set from the department you are setting up/);
    this.reviewBanner = page.getByText(/^Effective from today\./);
    this.completeButton = page.getByRole('button', { name: 'Complete department' });
    this.confirmedHeading = page.getByText('Department confirmed', { exact: true });
    this.confirmedSummary = page.getByText(/departments confirmed\.?$/);
    this.backToMastersButton = page
      .getByRole('button', { name: 'Back to masters' })
      .or(page.getByRole('link', { name: 'Back to masters' }));
  }

  /** A rail button: "2 Activities The work that exists" (the number only while not yet done). */
  railStep(step: WizardStep): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^(\\d\\s*)?${escapeRegExp(step)}\\b`),
    });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  /** A record card on a step (activity / recipe / work centre), found by its code text. */
  card(code: string): Locator {
    return this.page
      .getByRole('main')
      .last()
      .getByText(code, { exact: true })
      .locator('xpath=ancestor::*[.//button][1]');
  }

  /** A Maintained by choice: a plain option, or a button in the picker's dialog (as on Master Data). */
  maintainedByChoice(name: string): Locator {
    return this.page
      .getByRole('option', { name, exact: true })
      .or(this.page.getByRole('dialog').getByRole('button', { name, exact: true }))
      .first();
  }

  /** A work centre's expanded machines section ("Machines in <code> — …" and its "+ Add a machine"). */
  machinesSection(centre: string): Locator {
    return this.page
      .getByRole('main')
      .last()
      .getByText(`Machines in ${centre}`)
      .locator('xpath=ancestor::*[.//button][1]');
  }

  /** On Step 7: an area's chip ("ready" / "incomplete" / "empty") next to its label. */
  areaRow(area: string): Locator {
    // The row's text runs together: "ActivitiesNothing recorded yetincomplete" (the rail also says "Activities").
    return this.page
      .getByRole('main')
      .last()
      .getByText(new RegExp(`^${escapeRegExp(area)}.*(ready|incomplete|empty)$`));
  }
}
