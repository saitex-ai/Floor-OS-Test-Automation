import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Employees
 * list (/master-data/system-management/employees, nav label "Employees &
 * Skills" — heading on the screen itself is just "Employees"). No actions
 * or assertions here, see src/pages/master-data/employees-list.page.ts
 * for those.
 */
export class EmployeesListLocators {
  readonly heading: Locator;
  readonly newEmployeeButton: Locator;
  /** Placeholder confirmed live: "Search by employee number, name, department…". */
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Employees' });
    this.newEmployeeButton = page.getByRole('button', { name: 'New Employee' });
    this.searchInput = page.getByPlaceholder(/search by employee number, name, department/i);
  }

  /**
   * Employees has no single unique textual "code" column rendered before a
   * record is created (Employee Number is only known after saving), so
   * this filters by substring anywhere in the row rather than Departments'/
   * Sites' exact Code-cell match — fine in practice since a search()
   * narrows the table to 1-2 rows first.
   */
  row(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }
}
