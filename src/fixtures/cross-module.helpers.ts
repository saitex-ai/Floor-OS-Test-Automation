import { type Page } from '@playwright/test';
import { DepartmentsListPage } from '../pages/master-data/departments-list.page';
import { DepartmentFormPage } from '../pages/master-data/department-form.page';
import { EmployeesListPage } from '../pages/master-data/employees-list.page';
import { EmployeeFormPage } from '../pages/master-data/employee-form.page';

/**
 * Master Data steps that other modules' afterAll cleanup needs (it runs
 * outside a test, so it can't take the merged fixtures in
 * cross-module.fixtures.ts). Kept here, next to that fixture, so a module's
 * own support code doesn't reach into Master Data's pages directly.
 */

/** Master Data > Employees: switch an employee's Active off (employees can't be deleted). */
export async function deactivateEmployee(page: Page, name: string): Promise<void> {
  const employees = new EmployeesListPage(page);
  const employee = new EmployeeFormPage(page);
  await employees.open();
  await employees.expectLoaded();
  await employees.expectRowsLoaded();
  await employees.openEmployeeByName(name);
  await employee.expectOnDetailPage();
  await employee.clickEdit();
  if (await employee.isActive()) await employee.toggleActive();
  await employee.saveChanges();
  await employee.expectUpdatedSuccessfully();
}

/** Master Data > Departments: switch a department's Active off (departments can't be deleted). */
export async function deactivateDepartment(page: Page, code: string): Promise<void> {
  const list = new DepartmentsListPage(page);
  const form = new DepartmentFormPage(page);
  await list.open();
  await list.expectLoaded();
  await list.openDepartmentByCode(code);
  await form.expectOnDetailPage();
  await form.clickEdit();
  if (await form.isActive()) await form.toggleActive();
  await form.saveChanges();
  await form.expectUpdatedSuccessfully();
}
