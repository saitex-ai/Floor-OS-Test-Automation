import { test } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Smoke suite. Module-loads check plus one happy-path test
 * per capability as they're built out, same shape as CRM's smoke suite
 * (tests/smoke/crm/smoke-recent.spec.ts) — minimal, no exhaustive field
 * coverage (that's what regression is for).
 */
test.describe('Master Data module', () => {
  test('loads after shell login', async ({ masterDataPage }) => {
    await masterDataPage.open();
    await masterDataPage.expectLoaded();
  });

  test('Create Department: successful creation with one primary site', async ({
    departmentsListPage,
    departmentFormPage,
  }) => {
    await departmentsListPage.open();
    await departmentsListPage.expectLoaded();
    await departmentsListPage.openNewDepartment();
    await departmentFormPage.expectOnCreatePage();

    await departmentFormPage.fillRequired({
      code: `PW${Date.now().toString().slice(-8)}`,
      name: `Playwright Smoke Dept ${Date.now()}`,
    });
    await departmentFormPage.create();
    await departmentFormPage.expectCreatedSuccessfully();
  });
});
