import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for an operation's read-only detail page
 * (/planning/master-data/operations/<CODE>): header, summary, Domain
 * parameters, and the Allowances grid (with Tooling required, behind two
 * tabs), read-only since the 2026-10-28 dev deploy ("Add them on Edit
 * operation"): allowances are added and edited on step 2 of Edit operation
 * — see AllowanceFormLocators. No actions or assertions here, see
 * src/pages/planning/operation-detail.page.ts.
 */
export class OperationDetailLocators {
  readonly allOperationsLink: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly summary: Locator;
  readonly domainParameters: Locator;
  readonly allowancesHeading: Locator;
  /** Edit operation's step 2 in its "Steps" list. */
  readonly allowancesStep: Locator;
  readonly allowancesTab: Locator;
  readonly stepTitle: Locator;
  readonly doneButton: Locator;
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
      // Since the 2026-10-28 dev deploy the h2 shares a span with its info
      // button, inside a div: the section's content is that div's next sibling.
      .locator('xpath=ancestor::div[1]/following-sibling::*[1]');
    this.allowancesHeading = page.getByRole('heading', { name: /^Allowances \(\d+\)/ });
    this.allowancesStep = page.getByRole('list', { name: 'Steps' }).getByRole('button', {
      name: /^Allowances and tooling/,
    });
    this.allowancesTab = page.getByRole('tab', { name: 'Allowances' });
    this.stepTitle = page.getByText('STEP 2 OF 2 · ALLOWANCES AND TOOLING');
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
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

  allowanceEditButtons(): Locator {
    return this.allowancesTable.getByRole('button', { name: 'Edit allowance', exact: true });
  }
}
