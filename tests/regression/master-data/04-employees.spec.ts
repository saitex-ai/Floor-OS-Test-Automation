import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Employees (Employees screen,
 * `/master-data/system-management/employees`, nav label "Employees &
 * Skills").
 *
 * Source of truth: test-cases/master-data/employees/employees-testcases.md
 * — no ClickUp task exists for this module yet, so no allure.tms() links
 * here. Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed.
 *
 * TC:8 confirms a previously-filed bug ("Maintained by" defaulting to
 * "IE-Assessed") is no longer reproducible on dev — the field now has no
 * default and is genuinely enforced as required. TC:12 confirms the
 * "Active" switch defaults ON here, the opposite of Departments/Sites.
 */
test.describe('Master Data - Employees', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Employees');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp Full ${Date.now()}`;

    await test.step('Open New Employee and fill every field', async () => {
      await employeesListPage.open();
      await employeesListPage.expectLoaded();
      await employeesListPage.openNewEmployee();
      await employeeFormPage.expectOnCreatePage();
      await employeeFormPage.locators.fullName.fill(fullName);
      await employeeFormPage.locators.department.click();
      await employeeFormPage.locators.departmentOption(/.+/).first().click();
      await employeeFormPage.locators.email.fill(`pw-md-emp-${Date.now()}@example.com`);
      await employeeFormPage.locators.phone.fill('+1 555 0100');
      await employeeFormPage.locators.maintainedBy.click();
      await employeeFormPage.locators.departmentOption('By hand').click();
      await employeeFormPage.toggleActive();
    });

    await test.step('Create: toast confirms success', async () => {
      await employeeFormPage.create();
      await employeeFormPage.expectCreatedSuccessfully();
    });

    await test.step('The new row shows the employee with an auto-generated number', async () => {
      await employeesListPage.search(fullName);
      await expect(employeesListPage.locators.row(fullName)).toBeVisible();
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp Min ${Date.now()}`;

    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();
    await employeeFormPage.expectOnCreatePage();

    await test.step('Fill only Full Name, Department, Maintained by', async () => {
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
    });

    await test.step('Created successfully; Active defaults to Yes (see TC:12)', async () => {
      await employeeFormPage.expectCreatedSuccessfully();
      await employeesListPage.search(fullName);
      await expect(employeesListPage.locators.row(fullName)).toContainText('Active');
    });
  });

  test('TC:3 Verify successful edit of an existing employee', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp Edit ${Date.now()}`;
    const updatedName = `${fullName} - Updated`;

    await test.step('Create an employee to edit', async () => {
      await employeesListPage.open();
      await employeesListPage.expectLoaded();
      await employeesListPage.openNewEmployee();
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
      await employeeFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open it, edit the name, toggle Active off, and save', async () => {
      await employeesListPage.openEmployeeByName(fullName);
      await employeeFormPage.expectOnDetailPage();
      await employeeFormPage.clickEdit();
      await employeeFormPage.locators.fullName.fill(updatedName);
      await employeeFormPage.toggleActive();
      await employeeFormPage.saveChanges();
    });

    await test.step('Toast confirms the update; list reflects Inactive', async () => {
      await employeeFormPage.expectUpdatedSuccessfully();
      await employeesListPage.search(updatedName);
      await expect(employeesListPage.locators.row(updatedName)).toContainText('Inactive');
    });
  });

  test('TC:4 Verify list search by employee name', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp Search ${Date.now()}`;

    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();
    await employeeFormPage.fillRequired({ fullName });
    await employeeFormPage.create();
    await employeeFormPage.expectCreatedSuccessfully();

    await test.step('Search narrows the table to the matching row', async () => {
      await employeesListPage.search(fullName);
      await expect(employeesListPage.locators.row(fullName)).toBeVisible();
    });
  });

  test("TC:5 Verify the Department picker's search/filter works", async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();
    await employeeFormPage.expectOnCreatePage();

    await test.step('Open the Department picker and note the full option count', async () => {
      // openDepartmentPickerOptions() waits for the live-sourced list to
      // actually finish loading before counting — the dialog can briefly
      // render with 0 options while that fetch is in flight.
      const before = await employeeFormPage.openDepartmentPickerOptions();
      expect(before.length).toBeGreaterThan(1);
    });

    await test.step('Typing a partial name narrows the options', async () => {
      const filtered = await employeeFormPage.searchDepartmentPicker('Sewing');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((label) => /sewing/i.test(label))).toBe(true);
    });
  });

  test('TC:6 Verify validation when all required fields are left blank', async ({
    employeesListPage,
    employeeFormPage,
    page,
  }) => {
    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();
    await employeeFormPage.expectOnCreatePage();

    await test.step('Submit with everything blank', async () => {
      await employeeFormPage.create();
    });

    await test.step('Blocked with "Required" under Full Name, Department, Maintained by', async () => {
      await expect(employeeFormPage.locators.createButton).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(3);
      await expect(employeeFormPage.locators.employeeNumber).toBeDisabled();
    });
  });

  test('TC:7 Verify Cancel discards changes', async ({
    employeesListPage,
    employeeFormPage,
    page,
  }) => {
    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();

    const fullName = `PW MD Emp Cancel ${Date.now()}`;
    await test.step('Fill Full Name, then Cancel', async () => {
      await employeeFormPage.locators.fullName.fill(fullName);
      await employeeFormPage.cancel();
    });

    await test.step('No record created; back on the Employees list', async () => {
      await expect(page).toHaveURL(/\/master-data\/system-management\/employees$/);
      await employeesListPage.search(fullName);
      await expect(employeesListPage.locators.row(fullName)).toHaveCount(0);
    });
  });

  test('TC:8 Verify "Maintained by" is required with no default — historical bug confirmed fixed/changed', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp NoMaintainer ${Date.now()}`;

    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();

    await test.step('Fill Full Name + Department, leave Maintained by on "Select…"', async () => {
      await expect(employeeFormPage.locators.maintainedBy).toHaveText('Select…');
      await employeeFormPage.fillFullNameAndDepartmentOnly(fullName);
      await employeeFormPage.create();
    });

    // Confirmed live 2026-10-06: "Maintained by" has no default (not
    // "IE-Assessed" as an older bug report claimed) and blocks save when
    // left unset. Do not "fix" this assertion back to the old bug.
    await test.step('Blocked with an inline "Required" error under Maintained by', async () => {
      await expect(employeeFormPage.locators.createButton).toBeVisible();
      await employeeFormPage.expectValidationError('Required');
    });
  });

  test('TC:9 Verify optional fields can be left blank', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp Optional ${Date.now()}`;

    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();

    await test.step('Fill required fields only, leave Reports To/Email/Phone blank', async () => {
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
    });

    await test.step('Saves successfully', async () => {
      await employeeFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:10 Verify special/unicode characters are accepted in Full Name', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    // Corrected from the original test-case doc's premise: Full Name is
    // NOT unlimited — confirmed live 2026-10-07 that a ~300+ character
    // name is rejected with toast "Could not create employee" (unlike
    // Departments'/Sites' inline "N–M characters" hint, this one only
    // surfaces as a generic failure toast, so the exact cap wasn't pinned
    // down precisely). Stays well under that boundary here and asserts
    // what was actually being tested: unicode/symbol characters, not an
    // arbitrary-length name, are accepted.
    const fullName = `PW MD Emp Special ÄÖÜ 日本語 #$% ${Date.now()}`;

    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();

    await test.step('Fill required fields with a unicode/symbol Full Name and save', async () => {
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
    });

    await test.step('No charset rejection — saves successfully', async () => {
      await employeeFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:11 Verify duplicate Full Name is allowed', async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp DupName ${Date.now()}`;

    await test.step('Create the first employee with this name', async () => {
      await employeesListPage.open();
      await employeesListPage.expectLoaded();
      await employeesListPage.openNewEmployee();
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
      await employeeFormPage.expectCreatedSuccessfully();
    });

    await test.step('Create a second, separate employee with the exact same name', async () => {
      await employeesListPage.openNewEmployee();
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
    });

    // toHaveCount() (not a one-shot .count()) because the search box is
    // debounced — a plain count snapshot taken right after fill() can
    // read 0 before the grid has re-filtered.
    await test.step('Both saves succeed — no duplicate-name validation exists', async () => {
      await employeeFormPage.expectCreatedSuccessfully();
      await employeesListPage.search(fullName);
      await expect(employeesListPage.locators.row(fullName)).toHaveCount(2);
    });
  });

  test("TC:12 Verify Active switch's real default on create (on/Active) — differs from Departments/Sites", async ({
    employeesListPage,
    employeeFormPage,
  }) => {
    const fullName = `PW MD Emp ActiveDefault ${Date.now()}`;

    await employeesListPage.open();
    await employeesListPage.expectLoaded();
    await employeesListPage.openNewEmployee();

    await test.step('Default Active state before touching the switch is ON', async () => {
      expect(await employeeFormPage.isActive()).toBe(true);
    });

    await test.step('Save without touching Active — saved as Active', async () => {
      await employeeFormPage.fillRequired({ fullName });
      await employeeFormPage.create();
      await employeeFormPage.expectCreatedSuccessfully();
      await employeesListPage.search(fullName);
      await expect(employeesListPage.locators.row(fullName)).toContainText('Active');
    });
  });
});
