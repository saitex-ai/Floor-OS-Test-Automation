import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { DifficultyGradeFormLocators } from '../../locators/planning/difficulty-grade-form.locators';
import { submitForm, type SubmitResult } from './form-submit';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { WAIT } from './waits';

export interface DifficultyGradeFieldValues {
  code?: string;
  label?: string;
  description?: string;
  factor?: string;
  sort?: string;
  offMachine?: boolean;
  active?: boolean;
}

/**
 * "New difficulty grade" / edit-grade form, plus the read-only grade
 * detail page in front of the edit form. Owned by the Planning QA.
 * Only Lookup code, Display label and Factor are required; Factor has no
 * range check and Lookup code no length limit (both confirmed intended).
 * A new grade starts Active (Status switch on), Factor 1, Sort 99.
 */
export class DifficultyGradeFormPage extends BasePage {
  readonly locators: DifficultyGradeFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new DifficultyGradeFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.newGradeHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.page).toHaveURL(/\/planning\/master-data\/difficulty-grades\/new$/);
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.locators.saveChangesButton).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.code).toBeDisabled();
  }

  async expectCodeLocked(): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
  }

  async expectOnDetailPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/difficulty-grades\/[^/]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.saveChangesButton).toHaveCount(0);
    await expect(this.locators.code).toHaveCount(0);
  }

  async expectEditAvailable(): Promise<void> {
    await expect(this.locators.editButton.first()).toBeVisible();
  }

  /** A read-only user's detail page has no working Edit action (Sept: none at all). */
  async expectNoEditAction(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: WAIT.NAVIGATION,
    });
    await expectAbsentOrDisabled(this.locators.editButton);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.first().click();
    await this.expectOnEditPage();
  }

  async expectBackOnList(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/difficulty-grades$/, {
      timeout: WAIT.SERVER,
    });
  }

  private async setSwitch(on: boolean, which: 'offMachine' | 'status'): Promise<void> {
    const toggle = this.locators[which];
    const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
    if (isOn !== on) await toggle.click();
  }

  async fill(values: DifficultyGradeFieldValues): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.code.fill(values.code);
    if (values.label !== undefined) await l.label.fill(values.label);
    if (values.description !== undefined) await l.description.fill(values.description);
    if (values.factor !== undefined) await l.factor.fill(values.factor);
    if (values.sort !== undefined) await l.sort.fill(values.sort);
    if (values.offMachine !== undefined) await this.setSwitch(values.offMachine, 'offMachine');
    if (values.active !== undefined) await this.setSwitch(values.active, 'status');
  }

  async fieldValue(field: 'label' | 'factor' | 'sort' | 'description'): Promise<string> {
    return this.locators[field].inputValue();
  }

  async typeInto(field: 'factor' | 'sort', text: string): Promise<void> {
    await this.locators[field].fill('');
    await this.locators[field].pressSequentially(text);
  }

  async expectFieldValue(
    field: 'label' | 'factor' | 'sort' | 'description',
    value: string,
  ): Promise<void> {
    await expect(this.locators[field]).toHaveValue(value);
  }

  async expectOffMachineDefaultNo(): Promise<void> {
    await expect(this.locators.offMachine).toHaveAttribute('aria-checked', 'false');
  }

  /** Turning Off-machine on explains itself ("On means no rated speed stands behind it"). */
  async turnOffMachineOnAndExpectExplanation(): Promise<void> {
    await this.setSwitch(true, 'offMachine');
    await expect(this.locators.offMachine).toHaveAttribute('aria-checked', 'true');
    await expect(this.locators.offMachineHelp).toBeVisible();
  }

  async expectStatusDefaultActive(): Promise<void> {
    await expect(this.locators.status).toHaveAttribute('aria-checked', 'true');
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveChangesButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectRequiredFlagged(): Promise<void> {
    await expect(this.locators.requiredMessage.first()).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectCodeTaken(): Promise<void> {
    await expect(this.locators.codeTakenMessage.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** Edit form has no "N operations affected" preview before saving (TC-EG-05). */
  async expectNoAffectedOperationsPreview(): Promise<void> {
    await expect(this.page.getByText(/operations? (will be )?affected|affects \d+/i)).toHaveCount(
      0,
    );
  }
}
