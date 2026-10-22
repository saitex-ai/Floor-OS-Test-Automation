import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperationMasterFormLocators } from '../../locators/planning/operation-master-form.locators';
import { dateTriggers, fieldAlert } from '../../locators/planning/form-field.locators';
import { pickToday } from './date-picker';
import { submitForm, type SubmitResult } from './form-submit';
import { WAIT } from './waits';
import { ensureRoute } from './navigation';

/**
 * Values for the Operation Master form. Every combobox takes a string or
 * RegExp matched against the option's name; omitted fields are left alone.
 */
export interface OperationMasterValues {
  code?: string;
  name?: string;
  /** Live-sourced from the Departments master, e.g. /^Sewing$/. */
  department?: string | RegExp;
  /** e.g. /^M — manual/ (off-machine) or /^D — simple/ (on-machine). */
  grade?: string | RegExp;
  machineType?: string | RegExp;
  skillGrade?: string | RegExp;
  defaultSam?: string;
  defaultBasic?: string;
  minimumTime?: string;
}

/**
 * The fields marked * that block Create (Standard time basis is pre-set, so
 * it can't be empty). Minimum skill grade has no asterisk and is optional.
 * The code is generated on save since the 2026-10-16 dev deploy.
 */
export const OPERATION_REQUIRED = ['name', 'department', 'grade'] as const;
export type OperationRequiredField = (typeof OPERATION_REQUIRED)[number] | 'skillGrade';

/**
 * The Operation Master create / edit form. Owned by the Planning QA.
 * Create lands back on the list with "Operation created."; Save changes
 * returns to the detail page with "Operation updated.". New operations
 * start as Draft; the form still needs department, difficulty grade and
 * minimum skill grade (plus Machine type for an on-machine grade).
 */
export class OperationMasterFormPage extends BasePage {
  readonly locators: OperationMasterFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new OperationMasterFormLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/operations/new');
    await ensureRoute(this.page, '/planning/master-data/operations/new');
    await this.expectOnCreatePage();
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/operations\/new$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/operations\/[^/]+\/edit$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.saveButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** Every field TC-CO-01 lists is on the page. */
  async expectFullFieldSet(): Promise<void> {
    const l = this.locators;
    for (const field of [
      l.code,
      l.name,
      l.owningDepartment,
      l.difficultyGrade,
      l.machineType,
      l.minimumSkillGrade,
      l.standardTimeBasis,
      l.defaultBasicMinutes,
      l.defaultSamMinutes,
      l.defaultCycleTime,
      l.minimumTime,
      l.motionStudy,
      l.motionElements,
      l.addParameterButton,
      l.addSystemLinkButton,
    ])
      await expect(field).toBeVisible();
  }

  private control(field: OperationRequiredField | 'machineType'): Locator {
    const l = this.locators;
    return {
      code: l.code,
      name: l.name,
      department: l.owningDepartment,
      grade: l.difficultyGrade,
      skillGrade: l.minimumSkillGrade,
      machineType: l.machineType,
    }[field];
  }

  private async pick(combo: Locator, option: string | RegExp): Promise<void> {
    await combo.click();
    await this.locators.option(option).first().click();
  }

  async fill(values: OperationMasterValues): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.code.fill(values.code);
    if (values.name !== undefined) await l.name.fill(values.name);
    if (values.department) await this.pick(l.owningDepartment, values.department);
    if (values.grade) await this.pick(l.difficultyGrade, values.grade);
    if (values.machineType) await this.pick(l.machineType, values.machineType);
    if (values.skillGrade) await this.pick(l.minimumSkillGrade, values.skillGrade);
    if (values.defaultSam !== undefined) await l.defaultSamMinutes.fill(values.defaultSam);
    if (values.defaultBasic !== undefined) await l.defaultBasicMinutes.fill(values.defaultBasic);
    if (values.minimumTime !== undefined) await l.minimumTime.fill(values.minimumTime);
  }

  /** The options a combobox offers (closes it again). */
  async optionsOf(
    field: 'department' | 'grade' | 'machineType' | 'skillGrade' | 'status',
  ): Promise<string[]> {
    const combo = field === 'status' ? this.locators.status : this.control(field);
    await combo.click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async setStatus(status: 'Draft' | 'Active' | 'Retired'): Promise<void> {
    await this.pick(this.locators.status, status);
  }

  async setMotionStudy(on: boolean): Promise<void> {
    if ((await this.locators.motionStudy.isChecked()) !== on)
      await this.locators.motionStudy.click();
    await expect(this.locators.motionStudy).toBeChecked({ checked: on });
  }

  async expectLastStudiedOnShown(shown: boolean): Promise<void> {
    await expect(this.locators.lastStudiedOnLabel).toHaveCount(shown ? 1 : 0);
  }

  /** The motion-study date field's own validation message. */
  async expectLastStudiedOnRequired(): Promise<void> {
    await expect(fieldAlert(dateTriggers(this.page, false).first())).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  async pickLastStudiedOnToday(): Promise<void> {
    await pickToday(this.page, dateTriggers(this.page, false).first());
  }

  async addParameter(key: string, value: string): Promise<void> {
    await this.locators.addParameterButton.click();
    await this.locators.parameterKeys.last().fill(key);
    await this.locators.parameterValues.last().fill(value);
  }

  /** Domain parameters are Parameter / Value textboxes, never a JSON textarea. */
  async expectParametersAsRows(count: number): Promise<void> {
    await expect(this.locators.parameterKeys).toHaveCount(count);
    await expect(this.locators.parameterValues).toHaveCount(count);
    await expect(this.locators.jsonTextarea()).toHaveCount(0);
  }

  async expectMachineTypeRequired(required: boolean): Promise<void> {
    await expect(this.locators.machineTypeHint).toHaveText(
      required ? /^Required —/ : /^Not required —/,
    );
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectCreated(): Promise<void> {
    await expect(this.page.getByText('Operation created.')).toBeVisible({ timeout: WAIT.SERVER });
  }

  /**
   * Clicks Create / Save changes expecting it to be refused with "Fill the
   * N highlighted field(s) before saving." The toast fades after a few
   * seconds, so it's checked straight after the click rather than after
   * submitForm()'s wait for a navigation that never comes.
   */
  async submitExpectingBlocked(action: 'create' | 'save', count?: number): Promise<void> {
    const button = action === 'create' ? this.locators.createButton : this.locators.saveButton;
    await button.click();
    await expect(this.locators.blockedToast.first()).toBeVisible({ timeout: WAIT.VALIDATION });
    if (count !== undefined)
      await expect(this.locators.blockedToast.first()).toContainText(
        `Fill the ${count} highlighted`,
      );
    await expect(button).toBeVisible();
  }

  async expectFieldFlagged(field: OperationRequiredField | 'machineType'): Promise<void> {
    await expect(fieldAlert(this.control(field))).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectFieldNotFlagged(field: OperationRequiredField | 'machineType'): Promise<void> {
    await expect(fieldAlert(this.control(field))).toHaveCount(0);
  }

  async expectCodeTaken(): Promise<void> {
    await expect(this.locators.codeTaken.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** TC-CO-03: the prototype names the colliding operation ("Already used by <name> — …"). */
  async expectCodeTakenNaming(existingName: string): Promise<void> {
    await expect(this.locators.codeTaken.first()).toContainText(existingName, {
      timeout: WAIT.SERVER,
    });
  }

  /** New form since the 2026-10-16 deploy: the code can't be typed, dev assigns it on save. */
  async expectCodeGenerated(): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.code).toHaveAttribute('placeholder', 'Auto-generated');
    await expect(this.locators.codeGeneratedHelp).toBeVisible();
  }

  async expectCodeLocked(code: string): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.code).toHaveValue(code);
    await expect(this.locators.codeFixedHelp).toBeVisible();
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }

  async clearName(): Promise<void> {
    await this.locators.name.fill('');
  }

  async nameValue(): Promise<string> {
    return this.locators.name.inputValue();
  }
}
