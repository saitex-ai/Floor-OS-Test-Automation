import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Machines list
 * (/planning/master-data/machines, nav tile "Machines & maintenance"). The
 * grid itself is the shared MasterDataListLocators (`MachinesListPage.grid`).
 * No actions or assertions here, see src/pages/planning/machines-list.page.ts
 * for those.
 */
export class MachinesListLocators {
  readonly heading: Locator;
  readonly newMachineButton: Locator;
  readonly noMatchState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Machines' });
    this.newMachineButton = page.getByRole('button', { name: 'New machine' });
    this.noMatchState = page.getByText(/No machines match your filters/i);
  }

  /** The Status cell's badge in one row ("Active", "Down", "In maintenance", "Retired"). */
  statusBadge(row: Locator, status: string): Locator {
    return row.getByText(status, { exact: true });
  }
}
