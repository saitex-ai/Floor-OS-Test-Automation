import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Machines list
 * (/planning/master-data/machines, nav tile "Machines & maintenance"). No
 * actions or assertions here, see src/pages/planning/machines-list.page.ts
 * for those.
 */
export class MachinesListLocators {
  readonly heading: Locator;
  readonly newMachineButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Machines' });
    this.newMachineButton = page.getByRole('button', { name: 'New machine' });
  }
}
