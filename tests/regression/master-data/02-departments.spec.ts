import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Departments (Department Master screen,
 * `/master-data/system-management/departments`).
 *
 * Source of truth: test-cases/master-data/departments/departments-testcases.md
 * — no ClickUp task exists for this module yet, so no allure.tms() links
 * here (same convention as this repo's other no-ClickUp suites, e.g.
 * Techpack's early TCs). Storage state from auth.setup.ts is already
 * applied via the "master-data" project's dependency — no login needed.
 *
 * Two real, confirmed app bugs are deliberately asserted as-is (not
 * worked around) per this repo's established discipline:
 * - TC:9 — duplicate Department codes are NOT blocked, despite the form's
 *   own "Codes must be unique." helper text.
 * - TC:10 — the "Active" switch defaults to OFF/Inactive on a new
 *   department, contradicting older documentation that claimed "Yes".
 */
test.describe('Master Data - Departments', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Departments');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Full ${Date.now()}`;

    await test.step('Open New department and fill every field', async () => {
      await departmentsListPage.open();
      await departmentsListPage.expectLoaded();
      await departmentsListPage.openNewDepartment();
      await departmentFormPage.expectOnCreatePage();
      await departmentFormPage.fillRequired({ code, name, facility: /.+/ });
      await departmentFormPage.toggleActive();
    });

    await test.step('Create: toast confirms success', async () => {
      await departmentFormPage.create();
      await departmentFormPage.expectCreatedSuccessfully();
    });

    await test.step('The new row shows a facility instead of "Not in any facility yet"', async () => {
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).not.toContainText(
        'Not in any facility yet',
      );
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Min ${Date.now()}`;

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();
    await departmentFormPage.expectOnCreatePage();

    await test.step('Fill only code, name and calendar; leave facility/links/active untouched', async () => {
      await departmentFormPage.fillRequired({ code, name });
      await departmentFormPage.create();
    });

    await test.step('Created successfully with facility/links left at their defaults', async () => {
      await departmentFormPage.expectCreatedSuccessfully();
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toContainText(
        'Not in any facility yet',
      );
    });
  });

  test('TC:3 Verify successful edit of an existing department', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Edit ${Date.now()}`;
    const updatedName = `${name} - Updated`;

    await test.step('Create a department to edit', async () => {
      await departmentsListPage.open();
      await departmentsListPage.expectLoaded();
      await departmentsListPage.openNewDepartment();
      await departmentFormPage.fillRequired({ code, name });
      await departmentFormPage.create();
      await departmentFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open it, edit the name, and save', async () => {
      await departmentsListPage.openDepartmentByCode(code);
      await departmentFormPage.expectOnDetailPage();
      await departmentFormPage.clickEdit();
      await departmentFormPage.locators.departmentName.fill(updatedName);
      await departmentFormPage.saveChanges();
    });

    await test.step('Toast confirms the update', async () => {
      await departmentFormPage.expectUpdatedSuccessfully();
    });
  });

  test('TC:4 Verify list search by Department code and by Department name', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Search ${Date.now()}`;

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();
    await departmentFormPage.fillRequired({ code, name });
    await departmentFormPage.create();
    await departmentFormPage.expectCreatedSuccessfully();

    await test.step('Search by code narrows to the matching row', async () => {
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toBeVisible();
    });

    await test.step('Search by name also narrows to the matching row', async () => {
      await departmentsListPage.search(name);
      await expect(departmentsListPage.locators.row(code)).toBeVisible();
    });
  });

  test('TC:5 Verify Active status toggle reflects in Edit and on the list', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Toggle ${Date.now()}`;

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();
    await departmentFormPage.fillRequired({ code, name });
    await departmentFormPage.create();
    await departmentFormPage.expectCreatedSuccessfully();

    await test.step('Toggle Active on and save — expect Active', async () => {
      await departmentsListPage.openDepartmentByCode(code);
      await departmentFormPage.clickEdit();
      expect(await departmentFormPage.isActive()).toBe(false); // confirmed default — see TC:10
      await departmentFormPage.toggleActive();
      await departmentFormPage.saveChanges();
      await departmentFormPage.expectUpdatedSuccessfully();
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toContainText('Active');
    });

    await test.step('Toggle Active off again and save — expect Inactive', async () => {
      await departmentsListPage.openDepartmentByCode(code);
      await departmentFormPage.clickEdit();
      await departmentFormPage.toggleActive();
      await departmentFormPage.saveChanges();
      await departmentFormPage.expectUpdatedSuccessfully();
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toContainText('Inactive');
    });
  });

  test('TC:6 Verify validation when all required fields are left blank', async ({
    departmentsListPage,
    departmentFormPage,
    page,
  }) => {
    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();
    await departmentFormPage.expectOnCreatePage();

    await test.step('Submit with everything blank', async () => {
      await departmentFormPage.create();
    });

    await test.step('Save is blocked; still on the create form', async () => {
      await expect(departmentFormPage.locators.createButton).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(3); // code, name, calendar
    });
  });

  test('TC:7 Verify Default working calendar validation specifically', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept NoCal ${Date.now()}`;

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();

    await test.step('Fill code/name only, leave calendar on "Select…"', async () => {
      await departmentFormPage.locators.departmentCode.fill(code);
      await departmentFormPage.locators.departmentName.fill(name);
      await departmentFormPage.create();
    });

    await test.step('Blocked with an inline "Required" error, no toast/navigation', async () => {
      await expect(departmentFormPage.locators.createButton).toBeVisible();
      await departmentFormPage.expectValidationError('Required');
    });
  });

  test('TC:8 Verify Cancel discards changes', async ({ departmentsListPage, departmentFormPage, page }) => {
    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();

    const code = `PWMDD-CANCEL-${Date.now()}`;
    await test.step('Fill a code, then Cancel', async () => {
      await departmentFormPage.locators.departmentCode.fill(code);
      await departmentFormPage.cancel();
    });

    await test.step('No record created; back on the Departments list', async () => {
      await expect(page).toHaveURL(/\/master-data\/system-management\/departments$/);
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toHaveCount(0);
    });
  });

  test('TC:9 Verify duplicate Department code handling — known bug: NOT blocked', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name1 = `PW MD Dept Dup A ${Date.now()}`;
    const name2 = `PW MD Dept Dup B ${Date.now()}`;

    await test.step('Create the first department with this code', async () => {
      await departmentsListPage.open();
      await departmentsListPage.expectLoaded();
      await departmentsListPage.openNewDepartment();
      await departmentFormPage.fillRequired({ code, name: name1 });
      await departmentFormPage.create();
      await departmentFormPage.expectCreatedSuccessfully();
    });

    await test.step('Create a second department reusing the exact same code', async () => {
      await departmentsListPage.openNewDepartment();
      await departmentFormPage.fillRequired({ code, name: name2 });
      await departmentFormPage.create();
    });

    // Real, confirmed app behavior (2026-10-06): the form shows "Codes
    // must be unique." as static helper text, but that is NOT enforced —
    // both saves succeed. Documenting the bug, not papering over it.
    // toHaveCount() (not a one-shot .count()) because the search box is
    // debounced — a plain count snapshot taken right after fill() can
    // read 0 before the grid has re-filtered.
    await test.step('BUG: the duplicate is also accepted, not blocked', async () => {
      await departmentFormPage.expectCreatedSuccessfully();
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toHaveCount(2);
    });
  });

  test("TC:10 Verify Active switch's real default on create (off/Inactive)", async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Default ${Date.now()}`;

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();

    await test.step('Default Active state before touching the switch is OFF', async () => {
      expect(await departmentFormPage.isActive()).toBe(false);
    });

    await test.step('Save without touching Active — saved as Inactive', async () => {
      await departmentFormPage.fillRequired({ code, name });
      await departmentFormPage.create();
      await departmentFormPage.expectCreatedSuccessfully();
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).toContainText('Inactive');
    });
  });

  test('TC:11 Verify special/unicode characters are accepted within the real length caps', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    // Corrected from the original test-case doc's premise: there IS a real,
    // server-enforced length cap on both fields (confirmed live 2026-10-07
    // by actually exceeding it — the form blocks submission and shows
    // "1–24 characters" / "1–96 characters" inline, no toast, no
    // navigation). No HTML `maxlength` attribute exists, which is as far
    // as the original exploration checked — it just hadn't pushed long
    // enough to hit the real cap. This test now stays within both caps
    // (code ≤24 chars, name ≤96 chars) and asserts what was actually
    // being tested: unicode/symbol characters are accepted, not that
    // there's no length limit at all.
    const code = `PWD-ÄÖÜ日本-${Date.now().toString().slice(-6)}`; // 16 chars, well under 24
    const name = `PW MD Dept Special ÄÖÜ 日本語 #$% ${Date.now()}`; // well under 96

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();

    await test.step('Fill required fields with unicode/symbol values within the length caps', async () => {
      await departmentFormPage.fillRequired({ code, name });
      await departmentFormPage.create();
    });

    await test.step('No charset rejection — saves successfully', async () => {
      await departmentFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:12 Verify adding a Facility row', async ({ departmentsListPage, departmentFormPage }) => {
    const code = `PWMDD${Date.now().toString().slice(-7)}`;
    const name = `PW MD Dept Facility ${Date.now()}`;

    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();

    await test.step('Fill required fields and add a Facility row', async () => {
      await departmentFormPage.fillRequired({ code, name, facility: /.+/ });
      await departmentFormPage.create();
    });

    await test.step('Saves successfully; list shows the facility, not the empty-state text', async () => {
      await departmentFormPage.expectCreatedSuccessfully();
      await departmentsListPage.search(code);
      await expect(departmentsListPage.locators.row(code)).not.toContainText(
        'Not in any facility yet',
      );
    });
  });
});
