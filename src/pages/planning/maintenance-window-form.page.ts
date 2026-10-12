import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MaintenanceWindowFormLocators } from '../../locators/planning/maintenance-window-form.locators';
import { dateClearButton, fieldAlert } from '../../locators/planning/form-field.locators';
import { pickTodayAt } from './date-picker';
import { submitForm, type SubmitResult } from './form-submit';
import { WAIT } from './waits';

export interface WindowValues {
  kind?: 'Planned' | 'Unplanned';
  /** Today at "hh:mm". */
  start?: string;
  /** Today at "hh:mm"; omit to leave the window open. */
  end?: string;
  why?: string;
}

/**
 * The New / Edit maintenance window form on a machine's detail page.
 * Owned by the Planning QA. It replaces the windows grid in place (same
 * URL) under a "Machine · <CODE>" breadcrumb; there's no Machine picker.
 * Kind and Window start are required; a blank Window end is a stoppage
 * that is still open.
 */
export class MaintenanceWindowFormPage extends BasePage {
  readonly locators: MaintenanceWindowFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MaintenanceWindowFormLocators(page);
  }

  async expectOpenForCreate(machineCode: string): Promise<void> {
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.breadcrumb).toHaveText(`Machine · ${machineCode}`);
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOpenForEdit(machineCode: string): Promise<void> {
    await expect(this.locators.editHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.breadcrumb).toHaveText(`Machine · ${machineCode}`);
    await expect(this.locators.saveButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectFields(): Promise<void> {
    await expect(this.locators.kind).toBeVisible();
    await expect(this.locators.windowStart).toBeVisible();
    await expect(this.locators.windowEnd).toBeVisible();
    await expect(this.locators.why).toBeVisible();
    await expect(this.locators.anomaly).toBeVisible();
    await expect(this.locators.machinePicker).toHaveCount(0);
  }

  async kindOptions(): Promise<string[]> {
    await this.locators.kind.click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  private async pickAt(which: 'start' | 'end', time: string): Promise<void> {
    const [hh = '00', mm = '00'] = time.split(':');
    const trigger = which === 'start' ? this.locators.windowStart : this.locators.windowEnd;
    await pickTodayAt(this.page, trigger, hh, mm);
  }

  async fill(values: WindowValues): Promise<void> {
    if (values.kind) {
      await this.locators.kind.click();
      await this.locators.option(values.kind).click();
    }
    if (values.start) await this.pickAt('start', values.start);
    if (values.end) await this.pickAt('end', values.end);
    if (values.why !== undefined) await this.locators.why.fill(values.why);
  }

  async clearWindowStart(): Promise<void> {
    await dateClearButton(this.locators.windowStart).click();
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.cancelButton).toBeHidden({ timeout: WAIT.NAVIGATION });
  }

  async expectRequiredCount(count: number): Promise<void> {
    await expect(this.locators.requiredMessages).toHaveCount(count, { timeout: WAIT.VALIDATION });
  }

  async expectFieldFlagged(field: 'kind' | 'windowStart'): Promise<void> {
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  /** Kind is a select with no empty choice — it can't be cleared on edit. */
  async expectKindHasNoEmptyChoice(): Promise<void> {
    expect(await this.kindOptions()).toEqual(['Planned', 'Unplanned']);
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }

  async whyValue(): Promise<string> {
    return this.locators.why.inputValue();
  }
}
