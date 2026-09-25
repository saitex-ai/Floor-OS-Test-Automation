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

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Employees' });
    this.newEmployeeButton = page.getByRole('button', { name: 'New Employee' });
  }
}
