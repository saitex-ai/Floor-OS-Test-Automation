import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MachinesListLocators } from '../../locators/planning/machines-list.locators';

/**
 * Planning > Master Data > Machines list. Owned by the Planning QA. Real
 * route: /planning/master-data/machines. Element locators live in
 * MachinesListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class MachinesListPage extends BasePage {
  readonly locators: MachinesListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MachinesListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/machines');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newMachineButton).toBeVisible();
  }

  async openNewMachine(): Promise<void> {
    await this.locators.newMachineButton.click();
  }
}
