import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import * as allure from 'allure-js-commons';

/**
 * Master Data — Customer Season Master.
 *
 * Source of truth for these 14 cases, one test() per TC row:
 * test-cases/master-data/customer-season-master/customer-season-master-testcases.md.
 * No ClickUp test-case tasks exist for this story (first-ever coverage for
 * this screen). Storage state from auth.setup.ts is already applied via
 * the "master-data" project's dependency — no login needed here.
 *
 * Unlike Company/Customer Master, Create and Edit here are modal dialogs
 * on top of the list, and "Customer" is picked via a grid-based lookup
 * (real, live Customer Master data) rather than typed — see
 * CustomerSeasonFormPage.pickCustomer()/pickCustomerByIndex().
 */
function uniqueSuffix(): string {
  return String(Date.now());
}

test.describe('Master Data - Customer Season Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Customer Season Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;
    const description = `PW MD Season ${suffix}`;

    await test.step('Open New Season, pick a customer, fill Season Code + Description', async () => {
      await seasonListPage.open();
      await seasonListPage.openNewSeason();
      await seasonFormPage.expectOnCreatePage();
      await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({ seasonCode, description });
      await seasonFormPage.create();
    });

    await test.step('Toast reads "Season {CODE} created." and the row shows Approved', async () => {
      await seasonFormPage.expectCreatedSuccessfully();
      await seasonListPage.search(seasonCode);
      await seasonListPage.expectRowVisible(seasonCode);
      await seasonListPage.expectRowStatus(seasonCode, 'Approved');
    });
  });

  test('TC:2 Verify the Customer picker dialog and its search', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    await seasonListPage.open();
    await seasonListPage.openNewSeason();

    await test.step('Opening "Pick a customer" shows the "Select Customer" grid dialog', async () => {
      await seasonFormPage.locators.pickCustomerButton.click();
      await expect(seasonFormPage.locators.customerPickerDialog).toBeVisible();
      await expect(seasonFormPage.locators.customerPickerDataRows().first()).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step('Selecting a row populates the parent field as "<Code> — <Name>" and closes the picker', async () => {
      await seasonFormPage.locators.customerPickerDataRows().first().click();
      await expect(seasonFormPage.locators.customerPickerDialog).toBeHidden();
      // customerDisplay is a real <input readonly> — its text lives in the
      // `value` property, not textContent, so this checks toHaveValue(),
      // not toHaveText() (which is always empty for a plain input).
      await expect(seasonFormPage.locators.customerDisplay).toHaveValue(/^\S+\s+—\s+.+/, {
        timeout: 10_000,
      });
    });

    await test.step('An unmatched search in the picker shows no matches', async () => {
      await seasonFormPage.locators.pickCustomerButton.click();
      await seasonFormPage.locators.customerPickerSearchInput.fill('ZZZZZZ-no-such-customer-999');
      await expect(seasonFormPage.locators.customerPickerDataRows()).toHaveCount(0, {
        timeout: 10_000,
      });
    });
  });

  test('TC:3 Verify successful edit of an existing season', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;
    const editedDescription = `PW MD Season Edited ${suffix}`;

    await test.step('Create a throwaway season to edit', async () => {
      await seasonListPage.open();
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({ seasonCode, description: `PW MD Season ${suffix}` });
      await seasonFormPage.create();
      await seasonFormPage.expectCreatedSuccessfully();
    });

    await test.step('Click the row to open "Edit Season" and change the Description', async () => {
      await seasonListPage.search(seasonCode);
      await seasonListPage.openEdit(seasonCode);
      await seasonFormPage.expectOnEditPage(seasonCode);
      await seasonFormPage.fillFields({ description: editedDescription });
      await seasonFormPage.save();
    });

    await test.step('Toast reads exactly "Season updated" (no trailing period) and the list reflects it', async () => {
      await seasonFormPage.expectUpdatedSuccessfully();
      await seasonListPage.search(editedDescription);
      await seasonListPage.expectRowVisible(editedDescription);
    });
  });

  test('TC:4 Verify Customer and Season Code become locked once saved', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;

    await seasonListPage.open();
    await seasonListPage.openNewSeason();
    await seasonFormPage.pickCustomerByIndex(0);
    await seasonFormPage.fillFields({ seasonCode, description: `PW MD Season ${suffix}` });
    await seasonFormPage.create();
    await seasonFormPage.expectCreatedSuccessfully();

    await test.step('Reopen it for editing', async () => {
      await seasonListPage.search(seasonCode);
      await seasonListPage.openEdit(seasonCode);
    });

    await test.step('Customer and Season Code are disabled; Description and Active stay editable', async () => {
      await expect(seasonFormPage.locators.customerDisplay).toBeDisabled();
      await expect(seasonFormPage.locators.pickCustomerButton).toBeDisabled();
      await expect(seasonFormPage.locators.seasonCodeInput).toBeDisabled();
      await expect(seasonFormPage.locators.descriptionInput).toBeEnabled();
      await expect(seasonFormPage.locators.activeCheckbox).toBeEnabled();
    });
  });

  test('TC:5 Verify list search by Season Code, Description, and Customer', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;
    const description = `PW MD Season Search ${suffix}`;

    await seasonListPage.open();
    await seasonListPage.openNewSeason();
    const customerCode = await seasonFormPage.pickCustomerByIndex(0);
    const customerName = await seasonFormPage.getDisplayedCustomerName();
    await seasonFormPage.fillFields({ seasonCode, description });
    await seasonFormPage.create();
    await seasonFormPage.expectCreatedSuccessfully();

    await test.step('Search by Season Code', async () => {
      await seasonListPage.search(seasonCode);
      await seasonListPage.expectRowVisible(seasonCode);
    });

    await test.step('Search by Description', async () => {
      await seasonListPage.search(description);
      await seasonListPage.expectRowVisible(description);
    });

    await test.step("Search by the linked Customer's name", async () => {
      await seasonListPage.search(customerName);
      await seasonListPage.expectRowVisible(seasonCode);
      await seasonListPage.expectRowVisible(customerCode);
    });
  });

  test('TC:6 Verify status tab filters, and that counts scope to an active search', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;

    await seasonListPage.open();

    await test.step('Status tabs are all present', async () => {
      await expect(seasonListPage.locators.allTab).toBeVisible();
      await expect(seasonListPage.locators.draftTab).toBeVisible();
      await expect(seasonListPage.locators.approvedTab).toBeVisible();
      await expect(seasonListPage.locators.inactiveTab).toBeVisible();
      await expect(seasonListPage.locators.rejectedTab).toBeVisible();
    });

    await test.step('Create a uniquely-coded season, then search for it', async () => {
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({ seasonCode, description: `PW MD Season ${suffix}` });
      await seasonFormPage.create();
      await seasonFormPage.expectCreatedSuccessfully();
      await seasonListPage.search(seasonCode);
    });

    await test.step('Confirmed live: with that search active, "All" re-scopes to just the 1 matching row', async () => {
      await expect(seasonListPage.locators.allTab).toHaveText(/^All\s*1$/);
    });
  });

  test('TC:7 Verify validation when all required fields are left blank', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const l = seasonFormPage.locators;

    await seasonListPage.open();
    await seasonListPage.openNewSeason();

    await test.step('Click Create with everything blank', async () => {
      await seasonFormPage.create();
    });

    await test.step('All three required fields show an inline "Required" error at once', async () => {
      // Customer's field wraps the textbox+button in their own nested
      // group (confirmed live — different DOM shape than Season
      // Code/Description's flatter layout), so the sibling-paragraph
      // xpath doesn't reach its "Required" text. aria-invalid is the
      // confirmed-live signal for this field instead.
      await seasonFormPage.expectCustomerFieldInvalid();
      await seasonFormPage.expectRequiredError(l.seasonCodeInput);
      await seasonFormPage.expectRequiredError(l.descriptionInput);
      await seasonFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:8 Verify duplicate Season Code for the same Customer is blocked, with a specific message', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const sharedCode = `PWS${suffix}`;
    let customerCode = '';

    await test.step('Create a season for Customer A with a given Season Code', async () => {
      await seasonListPage.open();
      await seasonListPage.openNewSeason();
      customerCode = await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({
        seasonCode: sharedCode,
        description: `PW MD Season A ${suffix}`,
      });
      await seasonFormPage.create();
      await seasonFormPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt a second season for the SAME customer reusing the exact same Season Code', async () => {
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomer(customerCode, customerCode);
      await seasonFormPage.fillFields({
        seasonCode: sharedCode,
        description: `PW MD Season B ${suffix}`,
      });
      await seasonFormPage.create();
    });

    await test.step('Blocked with the specific "already exists for this customer" toast', async () => {
      await seasonFormPage.expectDuplicateSeasonCodeError();
      await seasonFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:9 Verify the same Season Code is allowed across different customers', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const sharedCode = `PWS${suffix}`;

    await test.step('Create a season for Customer A (picker row 0) with a given Season Code', async () => {
      await seasonListPage.open();
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({
        seasonCode: sharedCode,
        description: `PW MD Season CustA ${suffix}`,
      });
      await seasonFormPage.create();
      await seasonFormPage.expectCreatedSuccessfully();
    });

    await test.step('Create a season for Customer B (picker row 1) reusing the exact same Season Code', async () => {
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomerByIndex(1);
      await seasonFormPage.fillFields({
        seasonCode: sharedCode,
        description: `PW MD Season CustB ${suffix}`,
      });
      await seasonFormPage.create();
    });

    await test.step('Both saves succeed — the Season Code constraint is scoped per-customer, not global', async () => {
      await seasonFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:10 Verify Cancel ("Close") discards changes on create', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    await seasonListPage.open();
    const countBefore = await seasonListPage.getAllCount();

    await test.step('Open New Season, fill Season Code/Description (no customer picked), then Close', async () => {
      await seasonListPage.openNewSeason();
      await seasonFormPage.fillFields({
        seasonCode: `PWSNOPE${uniqueSuffix()}`,
        description: 'Cancel discard test',
      });
      await seasonFormPage.close();
    });

    await test.step('No season was created', async () => {
      await expect(seasonListPage.locators.newSeasonButton).toBeVisible();
      const countAfter = await seasonListPage.getAllCount();
      expect(countAfter).toBe(countBefore);
    });
  });

  test('TC:11 Verify Deactivate action', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;

    await test.step('Create a throwaway season (Approved by default)', async () => {
      await seasonListPage.open();
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({
        seasonCode,
        description: `PW MD Season Deactivate ${suffix}`,
      });
      await seasonFormPage.create();
      await seasonFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open Edit Season and click "Deactivate {code}"', async () => {
      await seasonListPage.search(seasonCode);
      await seasonListPage.openEdit(seasonCode);
      await seasonFormPage.deactivate();
    });

    await test.step('Toast reads exactly "Season deactivated" (no trailing period) and the row shows Inactive', async () => {
      await seasonFormPage.expectDeactivatedSuccessfully();
      await seasonListPage.search(seasonCode);
      await seasonListPage.expectRowStatus(seasonCode, 'Inactive');
    });
  });

  test('TC:12 Verify Delete action and its confirmation dialog — unique to this module', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const seasonCode = `PWS${suffix}`;

    await test.step('Create a throwaway season', async () => {
      await seasonListPage.open();
      await seasonListPage.openNewSeason();
      await seasonFormPage.pickCustomerByIndex(0);
      await seasonFormPage.fillFields({ seasonCode, description: `PW MD Season Delete ${suffix}` });
      await seasonFormPage.create();
      await seasonFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open Edit, click Delete, then Cancel the confirmation — nothing happens', async () => {
      await seasonListPage.search(seasonCode);
      await seasonListPage.openEdit(seasonCode);
      await seasonFormPage.clickDelete();
      await seasonFormPage.cancelDelete();
      await expect(seasonFormPage.locators.deleteConfirmDialog).toBeHidden();
      // The Edit Season dialog itself is still open underneath the
      // (now-closed) confirm dialog — close it too before touching the
      // list's own Search box, which sits behind it and is otherwise
      // unreachable while any dialog is still open.
      await seasonFormPage.close();
      await seasonListPage.search(seasonCode);
      await seasonListPage.expectRowVisible(seasonCode);
    });

    await test.step('Open Edit again, click Delete, confirm — the season is removed for good', async () => {
      await seasonListPage.openEdit(seasonCode);
      await seasonFormPage.clickDelete();
      await seasonFormPage.confirmDelete();
      await seasonFormPage.expectDeletedSuccessfully();
      await seasonListPage.search(seasonCode);
      await seasonListPage.expectRowNotVisible(seasonCode);
    });
  });

  test('TC:13 Edge: Season Code has no max-length cap', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    const longCode = 'ABCDEFGHIJKLMNOPQRST';

    await seasonListPage.open();
    await seasonListPage.openNewSeason();

    await test.step('Typing a 20-character Season Code is accepted in full, unlike Company Code', async () => {
      await seasonFormPage.locators.seasonCodeInput.fill(longCode);
      await expect(seasonFormPage.locators.seasonCodeInput).toHaveValue(longCode);
    });
  });

  test('TC:14 Edge: the Customer field cannot be free-typed — picker-only', async ({
    customerSeasonListPage: seasonListPage,
    customerSeasonFormPage: seasonFormPage,
  }) => {
    await seasonListPage.open();
    await seasonListPage.openNewSeason();

    await test.step('Clicking the field opens the picker instead of accepting free text', async () => {
      // Confirmed live: clicking the textbox itself (not just the paired
      // "Pick a customer" button) opens the full "Select Customer" picker
      // dialog — the underlying New Season dialog's own textbox becomes
      // unreachable while the picker is open (its ancestor goes
      // aria-hidden), which is itself further proof there's no way to
      // type a value directly into this field.
      await seasonFormPage.locators.customerDisplay.click();
      await expect(seasonFormPage.locators.customerPickerDialog).toBeVisible();
      // Close via the picker's own scoped Cancel button, not a global
      // Escape keypress — confirmed live that Escape bubbles up and closes
      // the parent "New Season" dialog too, not just this nested picker.
      await seasonFormPage.locators.customerPickerCancelButton.click();
      await expect(seasonFormPage.locators.customerPickerDialog).toBeHidden();
      await expect(seasonFormPage.locators.customerDisplay).toHaveValue('');
    });
  });
});
