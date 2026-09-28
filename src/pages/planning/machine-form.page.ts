import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MachineFormLocators } from '../../locators/planning/machine-form.locators';

export interface MachineFieldValues {
  code: string;
  machineClass: string;
  /** Which real work centre to assign — defaults to the first available if omitted. */
  workCentre?: string | RegExp;
}

/**
 * The "New machine" create form on Planning > Master Data > Machines.
 * Real route: /planning/master-data/machines/new. Owned by the Planning
 * QA. Element locators live in MachineFormLocators (`this.locators`) —
 * this class only holds flows/actions/assertions built on top of them.
 */
export class MachineFormPage extends BasePage {
  readonly locators: MachineFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MachineFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /**
   * Asset code + Machine class + Work centre + Status are the 4 fields
   * confirmed live to actually block save ("In service since" / class
   * properties / system links are all genuinely optional). Status is
   * fixed to "Active" here, not made configurable — a freshly created
   * machine being immediately usable is the natural happy path.
   */
  async fillRequired(values: MachineFieldValues): Promise<void> {
    await this.locators.assetCode.fill(values.code);
    await this.locators.machineClass.fill(values.machineClass);

    await this.locators.workCentre.click();
    await this.locators.option(values.workCentre ?? /.+/).first().click();

    await this.locators.status.click();
    await this.locators.option('Active').click();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Real toast text confirmed live: "Machine created." A successful create redirects to the list. */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Machine created.')).toBeVisible({ timeout: 15_000 });
  }
}
