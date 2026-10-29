import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  SetupDepartmentLocators,
  type WizardStep,
} from '../../locators/planning/setup-department.locators';
import { ActivityFormLocators } from '../../locators/planning/activity-form.locators';
import { RecipeFormLocators } from '../../locators/planning/recipe-form.locators';
import { WorkCentreFormLocators } from '../../locators/planning/work-centre-form.locators';
import { MachineFormLocators } from '../../locators/planning/machine-form.locators';
import { MachineFormPage } from './machine-form.page';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { becomesUsable } from './master-data-list.page';
import { submitForm } from './form-submit';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

export interface DepartmentValues {
  code: string;
  name: string;
  type?: 'Internal' | 'Subcontractor' | 'External lab' | 'Mill';
  /** A calendar code, e.g. "FACTORY-2627". */
  calendar?: string;
  capacity?: 'Line' | 'Station' | 'Team' | 'Headcount';
}

/**
 * The "Set up my department" wizard (/planning/master-data/setup-department)
 * and its journey card. Owned by the Planning QA. Seven steps; the rail only
 * opens steps up to the furthest one reached, and progress % follows that.
 * Every step's add/edit is the standalone screen's own form inline, scoped to
 * the department being set up — and every save is live master data at once.
 */
/** A generated code as cards show it (e.g. ACT-0012, WC-0004): capitals / digits, ending in -<number>. */
const CODE_TEXT = /^[A-Z][A-Z0-9_]*(-[A-Z0-9]+)*-\d+$/;

export class SetupDepartmentPage extends BasePage {
  readonly locators: SetupDepartmentLocators;
  readonly activity: ActivityFormLocators;
  readonly recipe: RecipeFormLocators;
  readonly workCentre: WorkCentreFormLocators;
  readonly machine: MachineFormLocators;
  /** The standalone machine form's flows (Machine type picker, system links), rendered inline in Step 4. */
  readonly machineForm: MachineFormPage;

  constructor(page: Page) {
    super(page);
    this.locators = new SetupDepartmentLocators(page);
    this.activity = new ActivityFormLocators(page);
    this.recipe = new RecipeFormLocators(page);
    this.workCentre = new WorkCentreFormLocators(page);
    this.machine = new MachineFormLocators(page);
    this.machineForm = new MachineFormPage(page);
  }

  // ── Landing card ──

  async openLanding(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data');
    await ensureRoute(this.page, '/planning/master-data');
    await expect(this.locators.journeyCard).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** "N/M departments confirmed" on the journey card (it reads "Departments confirmed" until the count loads). */
  async confirmedCount(): Promise<{ confirmed: number; total: number }> {
    await expect(this.locators.journeyCard).toContainText(/\d+\/\d+ departments confirmed/, {
      timeout: WAIT.SERVER,
    });
    const text = await this.locators.journeyCard.innerText();
    const m = text.match(/(\d+)\/(\d+) departments confirmed/);
    if (!m) throw new Error(`No "N/M departments confirmed" in "${text}"`);
    return { confirmed: Number(m[1]), total: Number(m[2]) };
  }

  async startFromCard(): Promise<void> {
    await this.locators.journeyCard.click();
    await this.expectOnStep('Select department');
  }

  // ── Chrome ──

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/setup-department');
    await ensureRoute(this.page, '/planning/master-data/setup-department');
    await this.expectOnStep('Select department');
  }

  /**
   * Reloads the wizard on a department and goes on to Step 2 (Activities),
   * once Planning knows the department. Dev 2026-10-14: a department created
   * in Step 1 reaches Planning some seconds later (it read "Select…" and Create
   * was refused at +3 s; it was known at +33 s), and an open page never picks
   * it up — so reload until the inline activity form shows it (up to 2 min).
   */
  async reopen(code: string, name: string): Promise<void> {
    await expect(async () => {
      await this.open();
      await this.selectDepartment(code);
      await this.continue();
      await this.expectOnStep('Confirm the work your department performs');
      await this.openCreateActivity();
      await expect(this.activity.owningDepartment).toContainText(name, { timeout: 5_000 });
      await this.cancelInlineForm();
    }).toPass({ timeout: 120_000, intervals: [10_000] });
  }

  /**
   * Opens the wizard as whoever is signed in: "restricted" if they're kept
   * out ("Access restricted", or sent back off the wizard's URL), else "open".
   */
  async openForPermissionCheck(): Promise<'restricted' | 'open'> {
    const path = '/planning/master-data/setup-department';
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
    const restricted = this.page.getByText(/Access restricted/i).first();
    const onWizard = this.page.getByRole('heading', { name: 'Select department' });
    // Fails unless one of the two states actually shows: the wizard's first
    // step, or being kept out ("Access restricted", or sent off the wizard).
    const state = async (): Promise<'restricted' | 'open' | 'loading'> => {
      if (await onWizard.isVisible()) return 'open';
      if ((await restricted.isVisible()) || !new URL(this.page.url()).pathname.startsWith(path))
        return 'restricted';
      return 'loading';
    };
    await expect
      .poll(state, {
        message: 'the wizard or "Access restricted" should show',
        timeout: WAIT.PAGE_LOAD,
      })
      .not.toBe('loading');
    return (await state()) === 'open' ? 'open' : 'restricted';
  }

  async expectOnStep(heading: string | RegExp): Promise<void> {
    await expect(this.locators.stepHeading).toHaveText(heading, { timeout: WAIT.PAGE_LOAD });
  }

  /** The rail's "N% complete", re-read until it shows `percent`. */
  async expectProgress(percent: number): Promise<void> {
    await expect(this.locators.progress).toHaveText(new RegExp(`^${percent}% complete`), {
      timeout: WAIT.SERVER,
    });
  }

  async continue(): Promise<void> {
    await this.locators.continueButton.click();
  }

  async back(): Promise<void> {
    await this.locators.backButton.click();
  }

  async goToStep(step: WizardStep): Promise<void> {
    await this.locators.railStep(step).click();
  }

  async expectStepOpen(step: WizardStep, open: boolean): Promise<void> {
    if (open) await expect(this.locators.railStep(step)).toBeEnabled();
    else await expect(this.locators.railStep(step)).toBeDisabled();
  }

  async cancelSetup(): Promise<void> {
    await this.locators.cancelSetupButton.click();
    await expect(this.page).toHaveURL(/\/planning\/master-data$/, { timeout: WAIT.NAVIGATION });
  }

  // ── Step 1: department ──

  async departmentOptions(): Promise<string[]> {
    await this.locators.departmentPicker.click();
    await expect(this.locators.option(/.+/).first()).toBeVisible();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async selectDepartment(code: string): Promise<void> {
    await this.locators.departmentPicker.click();
    await this.locators
      .option(new RegExp(`^${escapeRegExp(code)} —`))
      .first()
      .click();
    await expect(this.locators.departmentPicker).toContainText(code);
  }

  async selectedDepartment(): Promise<string> {
    return (await this.locators.departmentPicker.innerText()).trim();
  }

  async openCreateDepartment(): Promise<void> {
    await this.locators.createDepartmentButton.click();
    await expect(this.locators.departmentFormHeading).toHaveText('New department');
  }

  async expectDepartmentFormFields(): Promise<void> {
    const l = this.locators;
    for (const field of [
      l.deptCode,
      l.deptName,
      l.deptType,
      l.deptCalendar,
      l.deptCapacity,
      l.deptActive,
    ])
      await expect(field).toBeVisible();
  }

  /** Fills the inline department form (Active on) and submits it. */
  async createDepartment(values: DepartmentValues): Promise<void> {
    const l = this.locators;
    await l.deptCode.fill(values.code);
    await l.deptName.fill(values.name);
    await this.pick(l.deptType, new RegExp(`^${values.type ?? 'Internal'}$`));
    await this.pick(
      l.deptCalendar,
      new RegExp(`^${escapeRegExp(values.calendar ?? 'FACTORY-2627')}\\b`),
    );
    await this.pick(l.deptCapacity, new RegExp(`^${values.capacity ?? 'Line'}$`));
    // A new department's Active switch starts off — an inactive one can't own activities.
    if (!(await l.deptActive.isChecked())) await l.deptActive.click();
    expect(await submitForm(l.createDepartmentSubmit), `create department ${values.code}`).toBe(
      'submitted',
    );
    await expect(l.departmentPicker).toContainText(values.code, { timeout: WAIT.SERVER });
  }

  /** The department's form opened for editing, in place: no heading, the code locked. */
  private async openEditDepartment(): Promise<void> {
    await this.locators.editDepartmentButton.click();
    await expect(this.locators.deptCode).toBeDisabled({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.deptName).toBeEditable();
  }

  async editDepartmentName(name: string): Promise<void> {
    await this.openEditDepartment();
    await this.locators.deptName.fill(name);
    expect(await submitForm(this.locators.saveButton)).toBe('submitted');
  }

  async setDepartmentActive(on: boolean): Promise<void> {
    await this.openEditDepartment();
    if ((await this.locators.deptActive.isChecked()) !== on) await this.locators.deptActive.click();
    expect(await submitForm(this.locators.saveButton)).toBe('submitted');
  }

  async isDepartmentWriteAvailable(): Promise<boolean> {
    await expect(this.locators.departmentPicker).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return (
      (await becomesUsable(this.locators.createDepartmentButton)) ||
      (await becomesUsable(this.locators.editDepartmentButton))
    );
  }

  // ── Steps 2–6 ──

  private async pick(combo: Locator, option: RegExp): Promise<void> {
    await combo.click();
    await this.locators.option(option).first().click();
  }

  async expectCard(code: string): Promise<void> {
    await expect(this.locators.card(code)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNoCard(code: string): Promise<void> {
    await expect(this.page.getByRole('main').last().getByText(code, { exact: true })).toHaveCount(
      0,
    );
  }

  /**
   * A card's code — since the 2026-10-16 deploy dev generates it on save, so
   * find the card by its (unique) name and read the code shown on it.
   */
  async cardCode(name: string): Promise<string> {
    const code = this.locators.card(name).getByText(CODE_TEXT).first();
    await expect(code).toBeVisible({ timeout: WAIT.SERVER });
    return (await code.innerText()).trim();
  }

  /** The codes shown on the current step's cards that start with `prefix`. */
  async cardCodes(prefix: string): Promise<string[]> {
    const texts = await this.page
      .getByRole('main')
      .last()
      .getByText(new RegExp(`^${escapeRegExp(prefix)}`))
      .allInnerTexts();
    return texts.map((t) => t.trim());
  }

  async openCreateActivity(): Promise<void> {
    await this.locators.createActivityButton.click();
    await expect(this.activity.code).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** The inline form's department is pre-set from the department being set up, and locked. */
  async expectDepartmentPreset(combo: Locator, departmentName: string): Promise<void> {
    await expect(combo).toBeDisabled();
    await expect(combo).toContainText(departmentName);
  }

  /** The step's add/edit opened the form in place: same URL, no dialog over it. */
  async expectInline(url: string): Promise<void> {
    expect(this.page.url()).toBe(url);
    await expect(this.page.getByRole('dialog')).toHaveCount(0);
  }

  async cancelInlineForm(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.cancelButton).toBeHidden({ timeout: WAIT.NAVIGATION });
  }

  /** Which inline form's department picker: Activity, Recipe or Employee. */
  async expectFormDepartmentPreset(
    form: 'activity' | 'recipe' | 'employee',
    departmentName: string,
  ): Promise<void> {
    const combo = {
      activity: this.activity.owningDepartment,
      recipe: this.recipe.owningDepartment,
      employee: this.locators.employeeDepartment,
    }[form];
    await this.expectDepartmentPreset(combo, departmentName);
  }

  /** Fills and submits the already-open inline activity form; returns the code dev generated. */
  async submitActivity(name: string): Promise<string> {
    await this.activity.name.fill(name);
    expect(await submitForm(this.activity.createButton), `create activity ${name}`).toBe(
      'submitted',
    );
    return this.cardCode(name);
  }

  /**
   * Opens "Create a new activity" once Planning knows the department: the form
   * reads the department when it opens, so close and reopen it until its
   * locked department shows `name` (a just-created one takes a few seconds).
   */
  async openCreateActivityOnceKnown(name: string): Promise<void> {
    await expect(async () => {
      if (await this.activity.code.isVisible()) await this.cancelInlineForm();
      await this.openCreateActivity();
      await expect(this.activity.owningDepartment).toContainText(name, { timeout: 5_000 });
    }).toPass({ timeout: 90_000, intervals: [5_000] });
  }

  async openEditActivity(code: string): Promise<void> {
    await this.locators.card(code).getByRole('button', { name: 'Edit activity' }).click();
    await expect(this.activity.code).toHaveValue(code, { timeout: WAIT.NAVIGATION });
  }

  async expectActivityName(name: string): Promise<void> {
    await expect(this.activity.name).toHaveValue(name);
  }

  async openCreateRecipe(): Promise<void> {
    await this.locators.createRecipeButton.click();
    await expect(this.recipe.code).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** The recipe form has no typed duration/SAM: it is derived from the operations. */
  async expectNoTypedDuration(): Promise<void> {
    await expect(
      this.page
        .getByRole('main')
        .last()
        .getByRole('textbox', { name: /duration|SAM/i }),
    ).toHaveCount(0);
    await expect(
      this.page
        .getByRole('main')
        .last()
        .getByRole('spinbutton', { name: /duration|SAM/i }),
    ).toHaveCount(0);
  }

  async expectRecipeOperationsToggle(code: string): Promise<void> {
    await expect(
      this.locators.card(code).getByRole('button', { name: /^Operations/ }),
    ).toBeVisible();
  }

  /** Fills and submits the already-open inline recipe form. */
  async submitRecipe(name: string): Promise<string> {
    await this.recipe.name.fill(name);
    expect(await submitForm(this.locators.submitRecipeButton), `create recipe ${name}`).toBe(
      'submitted',
    );
    return this.cardCode(name);
  }

  async openCreateWorkCentre(): Promise<void> {
    await this.locators.addWorkCentreButton.click();
    await expect(this.workCentre.centreCode).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** Opens "Add a work centre", fills it and creates it; returns the code dev generated. */
  async createWorkCentre(name: string): Promise<string> {
    await this.openCreateWorkCentre();
    const w = this.workCentre;
    await w.name.fill(name);
    await this.pick(w.usedFor, /^Bulk$/);
    await this.pick(w.centreType, /^Sewing lines$/);
    await this.pick(w.capacityMeasuredBy, /^Time based$/);
    await this.pick(w.capacityUnit, /^Minutes$/);
    await this.pick(w.status, /^Active$/);
    expect(await submitForm(w.createButton), `create work centre ${name}`).toBe('submitted');
    return this.cardCode(name);
  }

  async showMachines(centre: string): Promise<void> {
    const card = this.locators.card(centre);
    const hide = card.getByRole('button', { name: 'Hide machines' });
    if (await hide.isVisible()) return;
    await card.getByRole('button', { name: /^Machines \(\d+\)/ }).click();
    await expect(hide).toBeVisible();
  }

  async openEditWorkCentre(code: string): Promise<void> {
    await this.locators.card(code).getByRole('button', { name: 'Edit work centre' }).click();
    await expect(this.workCentre.centreCode).toHaveValue(code, { timeout: WAIT.NAVIGATION });
  }

  /** The standalone Edit work centre form: code locked, "Save changes" to submit. */
  async expectWorkCentreEditForm(): Promise<void> {
    await expect(this.workCentre.centreCode).toBeDisabled();
    await expect(this.workCentre.saveButton).toBeVisible();
  }

  /** The inline machine form's work centre is this centre, and can't be changed. */
  async expectMachineCentreLocked(centre: string): Promise<void> {
    await expect(this.machine.workCentre).toBeDisabled();
    await expect(this.machine.workCentre).toContainText(centre);
  }

  async openCreateMachine(centre: string): Promise<void> {
    await this.showMachines(centre);
    await this.locators
      .machinesSection(centre)
      .getByRole('button', { name: /Add a machine/ })
      .click();
    await expect(this.machine.assetCode).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /**
   * Fills and submits the already-open inline machine form. Dev 2026-10-14
   * replaced the free-text Machine class with a Machine type picker, so the
   * QA-AUTO marker goes in a system link (`tag`), as on the standalone screen.
   */
  async submitMachine(centre: string, machineType: string | RegExp, tag: string): Promise<string> {
    await this.machineForm.setMachineType(machineType);
    await this.pick(this.machine.status, /^Active$/);
    await this.machineForm.addSystemLink('QA-AUTO', tag);
    expect(await submitForm(this.locators.submitMachineButton), `create machine on ${centre}`).toBe(
      'submitted',
    );
    await expect(this.locators.submitMachineButton).toBeHidden({ timeout: WAIT.SERVER });
    // A machine has no name: its code is the only one in its new centre's machines section.
    await this.showMachines(centre);
    const code = this.locators.machinesSection(centre).getByText(CODE_TEXT).first();
    await expect(code).toBeVisible({ timeout: WAIT.SERVER });
    return (await code.innerText()).trim();
  }

  async openCreateEmployee(): Promise<void> {
    await this.locators.createEmployeeButton.click();
    await expect(this.locators.employeeName).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async createEmployee(fullName: string): Promise<void> {
    await this.openCreateEmployee();
    await this.locators.employeeName.fill(fullName);
    await this.locators.employeeMaintainedBy.click();
    await this.locators.maintainedByChoice('By hand').click();
    expect(
      await submitForm(this.locators.employeeCreateSubmit),
      `create employee ${fullName}`,
    ).toBe('submitted');
    await this.expectCard(fullName);
  }

  async openSkills(name: string): Promise<void> {
    await this.locators.card(name).getByRole('button', { name: 'Skills', exact: true }).click();
  }

  async expectQualificationApprovalNote(): Promise<void> {
    await expect(this.locators.qualificationApprovalNote).toBeVisible();
  }

  async expectQualificationOperatorPreset(operator: string): Promise<void> {
    await this.expectDepartmentPreset(this.locators.qualificationOperator, operator);
  }

  /** Fills and submits Step 6's inline qualification form ("Create qualification"). */
  async createQualification(values: {
    task: string;
    efficiency: string;
    assessedBy: string;
  }): Promise<void> {
    const l = this.locators;
    await l.qualificationTask.click();
    await this.page.keyboard.type(values.task);
    await l
      .option(new RegExp(`^${escapeRegExp(values.task)} ·`))
      .first()
      .click();
    await l.qualificationEfficiency.fill(values.efficiency);
    await this.pick(l.qualificationAssessedBy, new RegExp(`^${escapeRegExp(values.assessedBy)}$`));
    expect(await submitForm(l.qualificationCreate), 'create qualification').toBe('submitted');
  }

  /** A row in the operator's open Skills panel. */
  async expectSkillRow(code: string): Promise<void> {
    await expect(
      this.page
        .getByRole('main')
        .last()
        .getByText(new RegExp(`^${escapeRegExp(code)}\\b`))
        .first(),
    ).toBeVisible({ timeout: WAIT.SERVER });
  }

  async openAddQualification(): Promise<void> {
    await this.locators.addQualificationButton.click();
    await expect(this.locators.qualificationActivity).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async isAddAvailable(button: Locator): Promise<boolean> {
    await expect(this.locators.stepHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(button);
  }

  // ── Step 7 ──

  /** On Step 7: an area's chip ("ready" / "incomplete" / "empty"), re-read until it matches. */
  async expectAreaChip(area: string, chip: string | RegExp): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.locators.areaRow(area).innerText()).match(/(ready|incomplete|empty)$/)?.[1] ??
          '',
        { message: `${area} chip`, timeout: WAIT.SERVER },
      )
      .toMatch(chip);
  }

  async expectReviewBanner(text: string | RegExp): Promise<void> {
    await expect(this.locators.reviewBanner).toHaveText(text);
  }

  async complete(): Promise<void> {
    await this.locators.completeButton.click();
    await expect(this.locators.confirmedHeading).toBeVisible({ timeout: WAIT.SERVER });
  }

  async confirmedSummaryText(): Promise<string> {
    return (await this.locators.confirmedSummary.first().innerText()).trim();
  }

  async backToMasters(): Promise<void> {
    await this.locators.backToMastersButton.first().click();
    await expect(this.page).toHaveURL(/\/planning\/master-data$/, { timeout: WAIT.NAVIGATION });
  }
}
