import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { WorkCentreFormLocators } from '../../locators/planning/work-centre-form.locators';

export interface WorkCentreFieldValues {
  code: string;
  name: string;
  /** Live-sourced from the Departments master — defaults to "Sewing" (a real seeded department). */
  owningDepartment?: string | RegExp;
}

/**
 * The "New work centre" create form on Planning > Master Data > Work
 * Centres. Real route: /planning/master-data/work-centres/new. Owned by
 * the Planning QA. Element locators live in WorkCentreFormLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class WorkCentreFormPage extends BasePage {
  readonly locators: WorkCentreFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new WorkCentreFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  private async pick(combo: Locator, option: string | RegExp): Promise<void> {
    await combo.click();
    await this.locators.option(option).click();
  }

  /**
   * Centre code + Name + the 5 fields confirmed live to actually block
   * save (Owning department, What it is used for, How capacity is
   * measured, Capacity unit, Status) — everything else on this 21-field
   * form is genuinely optional or already has a usable default. "What it
   * is used for" is deliberately fixed to "Bulk" here, not made
   * configurable — picking "Subcontractor" makes "Confirmation time
   * (hrs)" conditionally required too (confirmed in this repo's own
   * history), which a plain happy-path create doesn't need to deal with.
   */
  async fillRequired(values: WorkCentreFieldValues): Promise<void> {
    await this.locators.centreCode.fill(values.code);
    await this.locators.name.fill(values.name);

    await this.pick(this.locators.owningDepartment, values.owningDepartment ?? 'Sewing');
    await this.pick(this.locators.usedFor, 'Bulk');
    await this.pick(this.locators.capacityMeasuredBy, 'Time based');
    await this.pick(this.locators.capacityUnit, 'Minutes');
    await this.pick(this.locators.status, 'Active');
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /**
   * Real toast text confirmed live: "Work centre created." Unlike
   * Calendars (which lands on the new record's own detail page), a
   * successful Work Centre create redirects back to the list.
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Work centre created.')).toBeVisible({ timeout: 15_000 });
  }
}
