import { type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './master-data-list.locators';

/**
 * Raw element locators for Planning > Master Data > Operators &
 * Qualifications (/planning/master-data/operators). Since the 2026-10-14 dev
 * deploy this replaces the separate Qualifications screen: one profile per
 * employee, with its qualifications as rows inside the profile. The grid
 * itself is the shared MasterDataListLocators (`OperatorsListPage.grid`).
 * No actions or assertions here, see src/pages/planning/operators-list.page.ts.
 *
 * A row's Operator cell reads "<employee no> <name>" and, when the operator
 * holds qualifications, starts with a "Show qualifications" / "Hide
 * qualifications" toggle. Expanded, the grid gets one more body row holding
 * a nested table (Certified on / Qualified / Efficiency / Measured min /
 * Assessed by / Last assessed / Valid until / Active).
 */
export class OperatorsListLocators {
  readonly heading: Locator;
  readonly newButton: Locator;
  readonly allMastersButton: Locator;
  readonly description: Locator;
  readonly noMatchHeading: Locator;
  readonly noMatchHint: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Operators & Qualifications', level: 1 });
    this.newButton = page.getByRole('button', { name: 'New', exact: true });
    this.allMastersButton = page
      .getByRole('button', { name: 'All masters' })
      .or(page.getByRole('link', { name: 'All masters' }));
    this.description = page.getByText(/^What planning knows about an employee/);
    this.noMatchHeading = page.getByText('No operators match your filters', { exact: true });
    this.noMatchHint = page.getByText(
      'Try a different search, or clear the filters to see every operator.',
      { exact: true },
    );
  }

  /**
   * Of `rows`, the profiles whose employee record resolves. A profile whose
   * employee can't be found reads "Operator unavailable" in place of the name.
   */
  resolvedRows(rows: Locator): Locator {
    return rows.filter({ hasNotText: 'Operator unavailable' });
  }

  /**
   * The grid row of the operator whose employee number is `employeeNo`
   * ("EMP-000268"): its Operator cell holds the number as a badge above the
   * name, so the shared grid's whole-cell `row(code)` doesn't match it (and
   * the row's text runs "EMP-000268QA-AUTO…", with no space).
   */
  operatorRow(employeeNo: string): Locator {
    return this.page
      .getByRole('table')
      .first()
      .getByRole('rowgroup')
      .nth(1)
      .getByRole('row')
      .filter({ hasText: new RegExp(`(^|\\D)${escapeRegExp(employeeNo)}(?!\\d)`) });
  }

  /** The row's "Show qualifications" / "Hide qualifications" toggle. */
  expander(row: Locator): Locator {
    return row.getByRole('button', { name: /^(Show|Hide) qualifications$/ });
  }

  /** The nested qualifications table an expanded operator shows (the first one on the page). */
  expandedTable(): Locator {
    return this.page.getByRole('table').first().getByRole('table').first();
  }

  /** The Master Data landing tile ("Operators & Qualifications Organisation · …"). */
  landingTile(): Locator {
    return this.page.getByRole('link', { name: /^Operators & Qualifications\b/ });
  }

  /** Any Master Data landing tile whose name mentions a qualification or an operator. */
  landingTiles(): Locator {
    return this.page.getByRole('link', { name: /qualification|operator/i });
  }
}
