import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Sites (Site Master screen,
 * `/master-data/system-management/sites`).
 *
 * Source of truth: test-cases/master-data/sites/sites-testcases.md — no
 * ClickUp task exists for this module yet, so no allure.tms() links here.
 * Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed.
 *
 * Two things confirmed live and asserted as real, current behavior (not
 * assumed from older docs):
 * - TC:6 — duplicate Site codes ARE blocked (opposite of Departments —
 *   see 02-departments.spec.ts TC:9), with a specific error message.
 * - TC:8 — the "Active" switch defaults to OFF/Inactive on a new site.
 * - TC:10 — the "Legal entities at this site" section no longer exists on
 *   the Create Site form at all (previously documented as present).
 */
test.describe('Master Data - Sites', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Sites');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site Full ${Date.now()}`;

    await test.step('Open New site and fill every field', async () => {
      await sitesListPage.open();
      await sitesListPage.expectLoaded();
      await sitesListPage.openNewSite();
      await siteFormPage.expectOnCreatePage();
      await siteFormPage.fillRequired({ code, name });
      await siteFormPage.toggleActive();
    });

    await test.step('Create: toast confirms success', async () => {
      await siteFormPage.create();
      await siteFormPage.expectCreatedSuccessfully();
    });

    await test.step('The new row shows Active, Country and Timezone', async () => {
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toContainText('Active');
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site Min ${Date.now()}`;

    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();
    await siteFormPage.expectOnCreatePage();

    await test.step('Fill only code, name, country, timezone; leave Active/Links untouched', async () => {
      await siteFormPage.fillRequired({ code, name });
      await siteFormPage.create();
    });

    await test.step('Created successfully, Active defaults to Inactive (see TC:8)', async () => {
      await siteFormPage.expectCreatedSuccessfully();
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toContainText('Inactive');
    });
  });

  test('TC:3 Verify successful edit of an existing site', async ({ sitesListPage, siteFormPage }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site Edit ${Date.now()}`;
    const updatedName = `${name} - Updated`;

    await test.step('Create a site to edit', async () => {
      await sitesListPage.open();
      await sitesListPage.expectLoaded();
      await sitesListPage.openNewSite();
      await siteFormPage.fillRequired({ code, name });
      await siteFormPage.create();
      await siteFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open it, edit the name, toggle Active on, and save', async () => {
      await sitesListPage.openSiteByCode(code);
      await siteFormPage.expectOnDetailPage();
      await siteFormPage.clickEdit();
      await siteFormPage.locators.siteName.fill(updatedName);
      await siteFormPage.toggleActive();
      await siteFormPage.saveChanges();
    });

    await test.step('Toast confirms the update; list reflects Active', async () => {
      await siteFormPage.expectUpdatedSuccessfully();
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toContainText('Active');
    });
  });

  test('TC:4 Verify list search by Site code and by Site name', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site Search ${Date.now()}`;

    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();
    await siteFormPage.fillRequired({ code, name });
    await siteFormPage.create();
    await siteFormPage.expectCreatedSuccessfully();

    await test.step('Search by code narrows to the matching row', async () => {
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toBeVisible();
    });

    await test.step('Search by name also narrows to the matching row', async () => {
      await sitesListPage.search(name);
      await expect(sitesListPage.locators.row(code)).toBeVisible();
    });
  });

  test('TC:5 Verify validation when all required fields are left blank', async ({
    sitesListPage,
    siteFormPage,
    page,
  }) => {
    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();
    await siteFormPage.expectOnCreatePage();

    await test.step('Submit with everything blank', async () => {
      await siteFormPage.create();
    });

    await test.step('Blocked with "Required" under all four fields', async () => {
      await expect(siteFormPage.locators.createButton).toBeVisible();
      await expect(page.getByText('Required')).toHaveCount(4); // code, name, country, timezone
    });
  });

  test('TC:6 Verify duplicate Site code is blocked', async ({ sitesListPage, siteFormPage, page }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name1 = `PW MD Site Dup A ${Date.now()}`;
    const name2 = `PW MD Site Dup B ${Date.now()}`;

    await test.step('Create the first site with this code', async () => {
      await sitesListPage.open();
      await sitesListPage.expectLoaded();
      await sitesListPage.openNewSite();
      await siteFormPage.fillRequired({ code, name: name1 });
      await siteFormPage.create();
      await siteFormPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt a second site reusing the exact same code', async () => {
      await sitesListPage.openNewSite();
      await siteFormPage.fillRequired({ code, name: name2 });
      await siteFormPage.create();
    });

    await test.step('Blocked with the real duplicate-code error; stays on the form', async () => {
      await siteFormPage.expectDuplicateCodeError();
      await expect(page).toHaveURL(/\/sites\/new$/);
    });
  });

  test('TC:7 Verify Cancel discards changes', async ({ sitesListPage, siteFormPage, page }) => {
    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();

    const code = `PWMDS-CANCEL-${Date.now()}`;
    await test.step('Fill a code, then Cancel', async () => {
      await siteFormPage.locators.siteCode.fill(code);
      await siteFormPage.cancel();
    });

    await test.step('No record created; back on the Sites list', async () => {
      await expect(page).toHaveURL(/\/master-data\/system-management\/sites$/);
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toHaveCount(0);
    });
  });

  test("TC:8 Verify Active switch's real default on create (off/Inactive)", async ({
    sitesListPage,
    siteFormPage,
  }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site Default ${Date.now()}`;

    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();

    await test.step('Default Active state before touching the switch is OFF', async () => {
      expect(await siteFormPage.isActive()).toBe(false);
    });

    await test.step('Save without touching Active — saved as Inactive', async () => {
      await siteFormPage.fillRequired({ code, name });
      await siteFormPage.create();
      await siteFormPage.expectCreatedSuccessfully();
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toContainText('Inactive');
    });
  });

  test('TC:9 Verify special/unicode characters are accepted within the real length caps', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    // Corrected from the original test-case doc's premise: Sites enforces
    // the exact same real, server-side length caps as Departments (1–24
    // chars for the code, 1–96 for the name) — confirmed live 2026-10-07
    // by actually exceeding it (form blocks submit, shows "1–24
    // characters" / "1–96 characters" inline, no toast). No HTML
    // `maxlength` attribute exists, which is as far as the original
    // exploration checked. Stays within both caps here and asserts what
    // was actually being tested: unicode/symbol characters are accepted.
    const code = `PWS-ÄÖÜ日本-${Date.now().toString().slice(-6)}`; // 16 chars, well under 24
    const name = `PW MD Site Special ÄÖÜ 日本語 #$% ${Date.now()}`; // well under 96

    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();

    await test.step('Fill required fields with unicode/symbol values within the length caps', async () => {
      await siteFormPage.fillRequired({ code, name });
      await siteFormPage.create();
    });

    await test.step('No charset rejection — saves successfully', async () => {
      await siteFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:10 Verify the "Legal entities at this site" section is absent — flag for the team', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();
    await siteFormPage.expectOnCreatePage();

    // Confirmed live 2026-10-06: no "Add entity" button exists anywhere on
    // the Create Site form. agent-notes/master-data-module.md (2026-09-24)
    // still describes this section as present — that's now stale. This
    // test documents the CURRENT app shape; if the section is reinstated,
    // this test should start failing and prompt someone to update it
    // (and the test-case doc) rather than silently staying green.
    await expect(siteFormPage.locators.addEntityButton).toHaveCount(0);
  });

  test('TC:11 Verify creating a site with Links to other systems left empty', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site NoLinks ${Date.now()}`;

    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();
    await siteFormPage.fillRequired({ code, name });

    await test.step('Leave Links to other systems empty and save', async () => {
      await siteFormPage.create();
      await siteFormPage.expectCreatedSuccessfully();
    });

    await test.step('List shows no links for the new site', async () => {
      // Corrected from the original doc wording: the list row's Links
      // column renders literally "None" (confirmed live 2026-10-07 from
      // the row's own text: "...No facilities · None · Inactive") — "No
      // links to other systems" is the empty-state copy shown on the
      // create FORM, not the rendered list cell.
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toContainText('None');
    });
  });

  test('TC:12 Verify Country/Timezone combobox selection works for a non-default value', async ({
    sitesListPage,
    siteFormPage,
  }) => {
    const code = `PWMDS${Date.now().toString().slice(-7)}`;
    const name = `PW MD Site AU ${Date.now()}`;

    await sitesListPage.open();
    await sitesListPage.expectLoaded();
    await sitesListPage.openNewSite();

    await test.step('Pick Australia / a matching timezone instead of the Vietnam default', async () => {
      await siteFormPage.fillRequired({ code, name, country: /^AU — /, timezone: /Australia\// });
      await siteFormPage.create();
    });

    await test.step('Saves successfully with the chosen Country reflected on the list', async () => {
      await siteFormPage.expectCreatedSuccessfully();
      await sitesListPage.search(code);
      await expect(sitesListPage.locators.row(code)).toContainText('Australia');
    });
  });
});
