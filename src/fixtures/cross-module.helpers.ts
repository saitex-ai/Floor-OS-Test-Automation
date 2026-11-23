import { type Page, expect } from '@playwright/test';
import { CreateTechpackPage } from '../pages/techpack/create-techpack.page';
import { CanvasPage } from '../pages/techpack/canvas.page';
import { DepartmentsListPage } from '../pages/master-data/departments-list.page';
import { DepartmentFormPage } from '../pages/master-data/department-form.page';
import { EmployeesListPage } from '../pages/master-data/employees-list.page';
import { EmployeeFormPage } from '../pages/master-data/employee-form.page';

/**
 * Steps that one module's suite needs from another module's screens, kept
 * here (next to cross-module.fixtures.ts) so a module's own pages, fixtures
 * and support code never import another module's page objects.
 *
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

/**
 * Techpack > New Techpack (Classic), then Approve on its canvas: the
 * Approved techpack a BOM needs (a BOM can only be created for an Approved
 * techpack with no BOM yet). Returns the new techpack's code.
 *
 * Create lands on the techpack's own page (`/techpacks/view/{id}` on dev,
 * `/techpacks/canvas/{id}` on uat since 2026-11-05); Approve lives on the
 * canvas, which this opens by id. A fresh record's Functions menu doesn't
 * always offer Approve straight away (see CanvasPage.approveTechpack()), so
 * this tries up to 3 fresh techpacks.
 */
export async function createApprovedTechpack(
  page: Page,
  options: { description: string; document: { name: string; mimeType: string; buffer: Buffer } },
): Promise<string> {
  const create = new CreateTechpackPage(page);
  const canvas = new CanvasPage(page);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await create.openFromTechpacksList();
    await create.fillAllRequiredWithRandomAvailable();
    await create.fillDetails({ description: options.description });
    await create.uploadTechpackFile(options.document);
    expect(await create.createExpectingResult()).toBe('created');
    await create.expectCreatedSuccessfully();
    const code = await create.currentTechpackCode();
    await canvas.openForCreatedTechpack(create.currentTechpackId());
    if ((await canvas.approveTechpack()) === 'approved') {
      await expect
        .poll(async () => (await canvas.fieldRowText('Status')).split('\n').pop()!.trim(), {
          timeout: 30_000,
        })
        .toBe('Approved');
      return code;
    }
  }
  throw new Error('Could not approve a fresh techpack in 3 attempts');
}

/**
 * Master Data > Employees: creates an employee (Maintained by "By hand") in
 * the department the picker offers as `department` after searching
 * `departmentSearch` (the picker pages its options: 15 of 58 on dev,
 * 2026-11-17), and returns the number and
 * department name Master Data gave it (from the create response). Used by
 * suites whose records hang off an employee (Planning's operator profiles):
 * each creates its own QA-AUTO employee rather than touching real ones.
 */
export async function createEmployee(
  page: Page,
  fullName: string,
  departmentSearch: string,
  department: RegExp,
): Promise<{ employeeNo: string; department: string }> {
  const employees = new EmployeesListPage(page);
  const employee = new EmployeeFormPage(page);
  await employees.open();
  await employees.expectLoaded();
  await employees.expectRowsLoaded();
  await employees.openNewEmployee();
  await employee.expectOnCreatePage();
  await employee.locators.fullName.fill(fullName);
  // The picker's departments can take over 15 s to arrive on a slow dev (2026-11-18).
  await expect(async () => {
    if (await employee.locators.departmentDialog.isVisible()) await page.keyboard.press('Escape');
    await employee.openDepartmentPickerOptions();
  }).toPass({ timeout: 90_000 });
  await employee.searchDepartmentPicker(departmentSearch);
  await employee.locators.departmentOption(department).first().click();
  await employee.locators.maintainedBy.click();
  await employee.locators.departmentOption('By hand').click();
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/employees' && r.request().method() === 'POST',
      { timeout: 30_000 },
    ),
    employee.create(),
  ]);
  expect(response.status(), `create employee "${fullName}"`).toBe(201);
  const body = (await response.json()) as { employeeNo: string; departmentName: string };
  await employee.expectCreatedSuccessfully();
  return { employeeNo: body.employeeNo, department: body.departmentName };
}

/**
 * Master Data > Employees: moves one of the caller's own employees to the
 * first other department the picker offers, and returns that department's
 * name — or null, leaving the employee untouched, when the picker offers no
 * other department.
 */
export async function moveEmployeeToAnotherDepartment(
  page: Page,
  fullName: string,
  currentDepartment: string,
): Promise<string | null> {
  const employees = new EmployeesListPage(page);
  const employee = new EmployeeFormPage(page);
  await employees.open();
  await employees.expectLoaded();
  await employees.expectRowsLoaded();
  await employees.openEmployeeByName(fullName);
  await employee.expectOnDetailPage();
  await employee.clickEdit();
  const options = await employee.openDepartmentPickerOptions();
  const other = options.find((o) => !o.trim().startsWith(`${currentDepartment} `));
  if (!other) {
    await page.keyboard.press('Escape');
    await employee.cancel();
    return null;
  }
  await employee.locators.departmentOption(other.trim()).first().click();
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /^\/api\/employees\/[^/]+$/.test(new URL(r.url()).pathname) &&
        /^(PUT|PATCH)$/.test(r.request().method()),
      { timeout: 30_000 },
    ),
    employee.saveChanges(),
  ]);
  expect(response.ok(), `move "${fullName}" to ${other}`).toBe(true);
  await employee.expectUpdatedSuccessfully();
  return ((await response.json()) as { departmentName: string }).departmentName;
}
