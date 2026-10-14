import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MachineFormLocators } from '../../locators/planning/machine-form.locators';
import { dateTriggers, fieldAlert } from '../../locators/planning/form-field.locators';
import { pickToday } from './date-picker';
import { submitForm, type SubmitResult } from './form-submit';
import { WAIT } from './waits';
import { ensureRoute } from './navigation';

export type MachineStatus = 'Active' | 'Down' | 'In maintenance' | 'Retired';

export interface MachineFieldValues {
  code: string;
  machineClass: string;
  /** Which real work centre to assign — defaults to the first available if omitted. */
  workCentre?: string | RegExp;
  /** Defaults to "Active". */
  status?: MachineStatus;
}

/** The fields an empty create flags as "Required". */
export const MACHINE_REQUIRED = ['code', 'machineClass', 'workCentre', 'status'] as const;
export type MachineRequiredField = (typeof MACHINE_REQUIRED)[number];

/**
 * The Machine create / edit form on Planning > Master Data > Machines.
 * Real routes: /planning/master-data/machines/new and
 * /machines/<uuid>/edit. Owned by the Planning QA. Element locators live
 * in MachineFormLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them. A create returns to the
 * list ("Machine created."); Save changes returns to the detail page
 * ("Machine updated.").
 */
export class MachineFormPage extends BasePage {
  readonly locators: MachineFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MachineFormLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/machines/new');
    await ensureRoute(this.page, '/planning/master-data/machines/new');
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** The create form is its own page (own route + heading), not a dialog. */
  async expectDedicatedCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/machines\/new$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.dialog).toHaveCount(0);
    await this.expectOnCreatePage();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/machines\/[^/]+\/edit$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.saveButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** Every field TC-CM-01 lists. */
  async expectFullFieldSet(): Promise<void> {
    const l = this.locators;
    for (const field of [
      l.assetCode,
      l.machineClass,
      l.workCentre,
      l.status,
      l.inServiceSinceLabel,
      l.addPropertyButton,
      l.addSystemLinkButton,
    ])
      await expect(field).toBeVisible();
  }

  private control(field: MachineRequiredField): Locator {
    const l = this.locators;
    return {
      code: l.assetCode,
      machineClass: l.machineClass,
      workCentre: l.workCentre,
      status: l.status,
    }[field];
  }

  private async pick(combo: Locator, option: string | RegExp): Promise<void> {
    await combo.click();
    await this.locators.option(option).first().click();
  }

  /**
   * Asset code + Machine class + Work centre + Status are the 4 fields
   * confirmed live to actually block save ("In service since" / class
   * properties / system links are all genuinely optional). Status
   * defaults to "Active" — a freshly created machine being immediately
   * usable is the natural happy path.
   */
  async fillRequired(values: MachineFieldValues): Promise<void> {
    await this.locators.assetCode.fill(values.code);
    await this.locators.machineClass.fill(values.machineClass);
    await this.setWorkCentre(values.workCentre ?? /.+/);
    await this.setStatus(values.status ?? 'Active');
  }

  async setMachineClass(value: string): Promise<void> {
    await this.locators.machineClass.fill(value);
  }

  async setWorkCentre(workCentre: string | RegExp): Promise<void> {
    await this.pick(this.locators.workCentre, workCentre);
  }

  async setStatus(status: MachineStatus): Promise<void> {
    await this.pick(this.locators.status, status);
  }

  async statusOptions(): Promise<string[]> {
    await this.locators.status.click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async pickInServiceSinceToday(): Promise<void> {
    await pickToday(this.page, dateTriggers(this.page, false).first());
  }

  async addProperty(key: string, value: string): Promise<void> {
    await this.locators.addPropertyButton.click();
    await this.locators.propertyKeys.last().fill(key);
    await this.locators.propertyValues.last().fill(value);
  }

  /** Overwrites the first property row's value. */
  async setFirstPropertyValue(value: string): Promise<void> {
    await this.locators.propertyValues.first().fill(value);
  }

  /** Properties are Property / Value textboxes, never a JSON textarea. */
  async expectPropertiesAsRows(count: number): Promise<void> {
    await expect(this.locators.propertyKeys).toHaveCount(count);
    await expect(this.locators.jsonTextarea()).toHaveCount(0);
  }

  async clearMachineClass(): Promise<void> {
    await this.locators.machineClass.fill('');
  }

  /** Smoke: just clicks Create — see expectCreatedSuccessfully(). */
  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async submitCreate(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Real toast text confirmed live: "Machine created." A successful create redirects to the list. */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Machine created.')).toBeVisible({ timeout: 15_000 });
  }

  async expectRequiredCount(count: number): Promise<void> {
    await expect(this.locators.requiredMessages).toHaveCount(count, { timeout: WAIT.VALIDATION });
  }

  async expectFieldFlagged(field: MachineRequiredField): Promise<void> {
    await expect(fieldAlert(this.control(field))).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectCodeTaken(): Promise<void> {
    await expect(this.locators.codeTaken.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectCodeLocked(code: string): Promise<void> {
    await expect(this.locators.assetCode).toBeDisabled();
    await expect(this.locators.assetCode).toHaveValue(code);
    await expect(this.locators.codeFixedHelp).toBeVisible();
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }

  async machineClassValue(): Promise<string> {
    return this.locators.machineClass.inputValue();
  }
}
