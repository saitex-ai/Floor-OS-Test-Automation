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
 * Since the 2026-10-22 redesign, Create lands on `/techpacks/view/{id}` and
 * Approve lives on the canvas (`/techpacks/canvas/{id}`, same id). A fresh
 * record's Functions menu doesn't always offer Approve straight away (see
 * CanvasPage.approveTechpack()), so this tries up to 3 fresh techpacks.
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
    const id = page.url().match(/\/techpacks\/view\/([^/?#]+)/)?.[1];
    if (!id) throw new Error(`Create did not land on a techpack view page: ${page.url()}`);
    await canvas.gotoCanvasById(id);
    await canvas.expectLoaded();
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
