import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for an operation's read-only detail page
 * (/planning/master-data/operations/<CODE>): header, summary, Domain
 * parameters, and the nested Allowances grid. "New allowance" / a row's
 * "Edit" swap the grid for the allowance form in place — see
 * AllowanceFormLocators. No actions or assertions here, see
 * src/pages/planning/operation-detail.page.ts.
 */
export class OperationDetailLocators {
  readonly allOperationsLink: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly summary: Locator;
  readonly domainParameters: Locator;
  readonly allowancesHeading: Locator;
  readonly newAllowanceButton: Locator;
  readonly allowancesTable: Locator;
  /** Dedicated status actions (Activate / Approve / Retire) in the header. */
  readonly statusActions: Locator;

  constructor(private readonly page: Page) {
    this.allOperationsLink = page.getByRole('link', { name: 'All operations' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit operation' });
    this.summary = page.getByRole('main').last();
    this.domainParameters = page
      .getByRole('heading', { name: 'Domain parameters', level: 2 })
      .locator('xpath=following-sibling::*[1]');
    this.allowancesHeading = page.getByRole('heading', { name: /^Allowances \(\d+\)/, level: 2 });
    this.newAllowanceButton = page.getByRole('button', { name: 'New allowance' });
    this.allowancesTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Allowance type' }),
    });
    this.statusActions = page.getByRole('button', { name: /^(Activate|Approve|Retire)\b/ });
  }

  /** A header badge, e.g. "Draft", "Active", "Studied", "Estimate". */
  badge(text: string): Locator {
    return this.page.getByRole('main').last().getByText(text, { exact: true }).first();
  }

  /** An allowance row, matched on its Allowance type cell. */
  allowanceRow(type: string): Locator {
    return this.allowancesTable.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: type, exact: true }),
    });
  }

  allowanceEditButton(type: string): Locator {
    return this.allowanceRow(type).getByRole('button', { name: 'Edit', exact: true });
  }

  allowanceEditButtons(): Locator {
    return this.allowancesTable.getByRole('button', { name: 'Edit', exact: true });
  }
}
