import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for a machine's read-only detail page
 * (/planning/master-data/machines/<uuid>): header, summary, and the nested
 * "Maintenance windows (N)" grid. "New maintenance window" / a row's
 * "Edit" swap the grid for the window form in place — see
 * MaintenanceWindowFormLocators. No actions or assertions here, see
 * src/pages/planning/machine-detail.page.ts.
 */
export class MachineDetailLocators {
  readonly allMachinesLink: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly summary: Locator;
  readonly windowsHeading: Locator;
  readonly newWindowButton: Locator;
  readonly windowsTable: Locator;

  constructor(private readonly page: Page) {
    this.allMachinesLink = page.getByRole('link', { name: 'All machines' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit machine' });
    this.summary = page.getByRole('main').last();
    this.windowsHeading = page.getByRole('heading', {
      name: /^Maintenance windows \(\d+\)/,
      level: 2,
    });
    this.newWindowButton = page.getByRole('button', { name: 'New maintenance window' });
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

  /** The windows grid's data rows (not the header, not the loading skeleton). */
  windowDataRows(): Locator {
    return this.windowsTable
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .filter({ hasText: /\S/ });
  }

  windowEditButton(why: string): Locator {
    return this.windowRow(why).getByRole('button', { name: 'Edit', exact: true });
  }
}
