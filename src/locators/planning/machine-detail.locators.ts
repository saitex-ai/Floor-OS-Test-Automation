import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for a machine's read-only detail page
 * (/planning/master-data/machines/<uuid>): header, summary, and the nested
 * "Maintenance windows (N)" grid, read-only since the 2026-10-28 dev deploy
 * ("Add windows on Edit machine"): windows are added and edited on step 2
 * of Edit machine — see MaintenanceWindowFormLocators. No actions or
 * assertions here, see src/pages/planning/machine-detail.page.ts.
 */
export class MachineDetailLocators {
  readonly allMachinesLink: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly summary: Locator;
  readonly windowsHeading: Locator;
  /** Edit machine's step 2 in its "Steps" list. */
  readonly windowsStep: Locator;
  readonly doneButton: Locator;
  readonly windowsTable: Locator;

  constructor(private readonly page: Page) {
    this.allMachinesLink = page.getByRole('link', { name: 'All machines' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit machine' });
    this.summary = page.getByRole('main').last();
    this.windowsHeading = page.getByRole('heading', { name: /^Maintenance windows \(\d+\)/ });
    this.windowsStep = page
      .getByRole('list', { name: 'Steps' })
      .getByRole('button', { name: /^Maintenance windows/ });
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
    this.windowsTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Window start' }),
    });
  }

  /** A header badge next to the machine's name, e.g. its status "Active". */
  headerBadge(text: string): Locator {
    return this.heading.locator('xpath=..').getByText(text, { exact: true });
  }

  /** A window row, matched on its Why cell. */
  windowRow(why: string): Locator {
    return this.windowsTable.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: why, exact: true }),
    });
  }

  /** The windows grid's data rows (not the header, the loading skeleton or the empty message). */
  windowDataRows(): Locator {
    return this.windowsTable
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .filter({ hasText: /\S/ })
      .filter({ hasNotText: /^No downtime recorded/ });
  }
}
