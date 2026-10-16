import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { WorkCentreFormLocators } from '../../locators/planning/work-centre-form.locators';
import { fieldAlert } from '../../locators/planning/form-field.locators';
import { submitForm, type SubmitResult } from './form-submit';
import { WAIT } from './waits';
import { ensureRoute } from './navigation';
import { expectAbsentOrDisabled } from './master-data-list.page';

export interface WorkCentreFieldValues {
  code: string;
  name: string;
  /** Live-sourced from the Departments master — defaults to "Sewing" (a real seeded department). */
  owningDepartment?: string | RegExp;
  /** "Centre type" — required since 2026-10-01; defaults to "Sewing lines". */
  centreType?: string | RegExp;
  /** "What it is used for" (the capacity pool / list tab) — defaults to "Bulk". */
  usedFor?: string;
}

/** The fields an empty create flags as "Required" (2026-10-12). */
export const WORK_CENTRE_REQUIRED = [
  'code',
  'name',
  'owningDepartment',
  'usedFor',
  'centreType',
  'capacityMeasuredBy',
  'capacityUnit',
  'status',
] as const;
export type WorkCentreRequiredField = (typeof WORK_CENTRE_REQUIRED)[number];

/** One "Activities it can run" row. */
export interface CapabilityValues {
  matchesOn: 'Activity' | 'Activity type';
  code: string;
  preferred: 'Yes' | 'No';
}

/**
 * The Work Centre create / edit form on Planning > Master Data > Work
 * Centres. Real routes: /planning/master-data/work-centres/new and
 * /work-centres/<uuid>/edit. Owned by the Planning QA. Element locators
 * live in WorkCentreFormLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them. A create returns to the
 * list ("Work centre created."); Save changes returns to the detail page
 * ("Work centre updated.").
 */
export class WorkCentreFormPage extends BasePage {
  readonly locators: WorkCentreFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new WorkCentreFormLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/work-centres/new');
    await ensureRoute(this.page, '/planning/master-data/work-centres/new');
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** The create form is its own page (own route + heading), not a dialog. */
  async expectDedicatedCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/work-centres\/new$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.page.getByRole('dialog')).toHaveCount(0);
    await this.expectOnCreatePage();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/work-centres\/[^/]+\/edit$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.saveButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** The fields TC-CWC-01 lists (Capacity per day is detail/list-only by BA decision). */
  async expectFullFieldSet(): Promise<void> {
    const l = this.locators;
    for (const field of [
      l.centreCode,
      l.name,
      l.owningDepartment,
      l.area,
      l.usedFor,
      l.capacityMeasuredBy,
      l.capacityUnit,
      l.addCapabilityButton,
      l.baselineOperators,
      l.targetEfficiency,
      l.workingCalendar,
      l.confirmationTime,
      l.status,
    ])
      await expect(field).toBeVisible();
  }

  /** Effective from / to were removed on request (Demo Feedback z941abwdad). */
  async expectNoEffectiveDateFields(): Promise<void> {
    await expect(this.locators.status).toBeVisible();
    await expect(this.locators.effectiveDateLabels).toHaveCount(0);
  }

  private control(field: WorkCentreRequiredField): Locator {
    const l = this.locators;
    return {
      code: l.centreCode,
      name: l.name,
      owningDepartment: l.owningDepartment,
      usedFor: l.usedFor,
      centreType: l.centreType,
      capacityMeasuredBy: l.capacityMeasuredBy,
      capacityUnit: l.capacityUnit,
      status: l.status,
    }[field];
  }

  private async pick(combo: Locator, option: string | RegExp): Promise<void> {
    await combo.click();
    await this.locators.option(option).click();
  }

  /**
   * Every required field: Centre code + Name + Owning department, What it
   * is used for (default "Bulk"), Centre type, How capacity is measured
   * ("Time based"), Capacity unit ("Minutes") and Status ("Active").
   * `except` leaves one of them empty (TC-CWC-02).
   */
  async fillRequired(
    values: WorkCentreFieldValues,
    options: { except?: WorkCentreRequiredField } = {},
  ): Promise<void> {
    const skip = (field: WorkCentreRequiredField) => options.except === field;
    if (!skip('code')) await this.locators.centreCode.fill(values.code);
    if (!skip('name')) await this.locators.name.fill(values.name);
    if (!skip('owningDepartment'))
      await this.pick(this.locators.owningDepartment, values.owningDepartment ?? 'Sewing');
    if (!skip('usedFor')) await this.pick(this.locators.usedFor, values.usedFor ?? 'Bulk');
    if (!skip('centreType'))
      await this.pick(this.locators.centreType, values.centreType ?? 'Sewing lines');
    if (!skip('capacityMeasuredBy'))
      await this.pick(this.locators.capacityMeasuredBy, 'Time based');
    if (!skip('capacityUnit')) await this.pick(this.locators.capacityUnit, 'Minutes');
    if (!skip('status')) await this.pick(this.locators.status, 'Active');
  }

  async usedForOptions(): Promise<string[]> {
    await this.locators.usedFor.click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async addCapability(values: CapabilityValues): Promise<void> {
    await this.locators.addCapabilityButton.click();
    await this.pick(this.locators.capabilityMatchesOn.last(), values.matchesOn);
    await this.locators.capabilityCode.last().fill(values.code);
    await this.pick(this.locators.capabilityPreferred.last(), values.preferred);
  }

  async expectNoCapabilities(): Promise<void> {
    await expect(this.locators.noCapabilities).toBeVisible();
  }

  async expectCapability(values: CapabilityValues): Promise<void> {
    await expect(this.locators.capabilityMatchesOn.first()).toHaveText(values.matchesOn);
    await expect(this.locators.capabilityCode.first()).toHaveValue(values.code);
    await expect(this.locators.capabilityPreferred.first()).toHaveText(values.preferred);
  }

  async setName(name: string): Promise<void> {
    await this.locators.name.fill(name);
  }

  async setOwningDepartment(department: string | RegExp): Promise<void> {
    await this.pick(this.locators.owningDepartment, department);
  }

  async setBaselineOperators(value: string): Promise<void> {
    await this.locators.baselineOperators.fill(value);
  }

  async setTargetEfficiency(value: string): Promise<void> {
    await this.locators.targetEfficiency.fill(value);
  }

  async setStatus(status: 'Draft' | 'Active' | 'Retired'): Promise<void> {
    await this.pick(this.locators.status, status);
  }

  async setWorkingCalendar(calendar: string): Promise<void> {
    await this.pick(this.locators.workingCalendar, calendar);
  }

  /**
   * Picks the first working calendar that isn't the current one and returns
   * its name, so a case doesn't depend on one year-bound seed calendar.
   */
  async pickAnotherWorkingCalendar(): Promise<string> {
    const current = (await this.locators.workingCalendar.innerText()).trim();
    await this.locators.workingCalendar.click();
    await expect(this.locators.options().first()).toBeVisible({ timeout: WAIT.SERVER });
    const names = (await this.locators.options().allInnerTexts())
      .map((t) => (t.split('\n')[0] ?? '').trim())
      .filter((t) => t && t !== current && !/^(none|select)/i.test(t));
    const [picked] = names;
    if (!picked) throw new Error(`No working calendar other than "${current}" to pick`);
    await this.locators.option(picked).click();
    return picked;
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

  /**
   * Real toast text confirmed live: "Work centre created." Unlike
   * Calendars (which lands on the new record's own detail page), a
   * successful Work Centre create redirects back to the list.
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Work centre created.')).toBeVisible({ timeout: 15_000 });
  }

  async expectRequiredCount(count: number): Promise<void> {
    await expect(this.locators.requiredMessages).toHaveCount(count, { timeout: WAIT.VALIDATION });
  }

  async expectFieldFlagged(field: WorkCentreRequiredField): Promise<void> {
    await expect(fieldAlert(this.control(field))).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectCodeTaken(): Promise<void> {
    await expect(this.locators.codeTaken.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectCodeLocked(code: string): Promise<void> {
    await expect(this.locators.centreCode).toBeDisabled();
    await expect(this.locators.centreCode).toHaveValue(code);
    await expect(this.locators.codeFixedHelp).toBeVisible();
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }

  /** Machines is a derived count: rendered disabled, never typed. */
  async expectMachinesDerived(count?: number): Promise<void> {
    await expect(this.locators.machines).toBeDisabled();
    if (count !== undefined) await expect(this.locators.machines).toHaveValue(String(count));
  }

  /** Capacity per day is never typed on the form (BA decision) — no editable input for it. */
  async expectNoCapacityPerDayInput(): Promise<void> {
    await expectAbsentOrDisabled(this.locators.capacityPerDay);
  }
}
