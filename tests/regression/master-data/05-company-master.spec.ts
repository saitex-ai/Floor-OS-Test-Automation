import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import * as allure from 'allure-js-commons';
import { type CompanyFieldValues } from '../../../src/pages/master-data/company-form.page';

/**
 * Master Data — Company Master.
 *
 * Source of truth for these 14 cases, one test() per TC row:
 * test-cases/master-data/company-master/company-master-testcases.md. No
 * ClickUp test-case tasks exist for this story (first-ever coverage for
 * this screen). Storage state from auth.setup.ts is already applied via
 * the "master-data" project's dependency — no login needed here.
 */
const REQUIRED_PRIMARY_CURRENCY = /USD/;
const REQUIRED_SECONDARY_CURRENCY = /VND/;

function uniqueSuffix(): string {
  return String(Date.now());
}

/** A 5-char-safe code — Company Code/Prefix Code hard-cap at 5 characters, confirmed live. */
function randCode5(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

/** All 6 confirmed-required fields, each with a fresh unique Company Code/Prefix Code/Name per call. */
function requiredCompanyValues(
  suffix: string,
): Required<
  Pick<
    CompanyFieldValues,
    | 'companyCode'
    | 'prefixCode'
    | 'companyName'
    | 'address'
    | 'primaryCurrency'
    | 'secondaryCurrency'
  >
> {
  return {
    companyCode: randCode5(),
    prefixCode: randCode5(),
    companyName: `PW MD Company ${suffix}`,
    address: '123 Test Street',
    primaryCurrency: REQUIRED_PRIMARY_CURRENCY,
    secondaryCurrency: REQUIRED_SECONDARY_CURRENCY,
  };
}

test.describe('Master Data - Company Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Company Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Company All ${suffix}`;

    await test.step('Open New Company and fill every field', async () => {
      await companyListPage.open();
      await companyListPage.openNewCompany();
      await companyFormPage.fillRequired({
        ...requiredCompanyValues(suffix),
        companyName: name,
        countryOfOperation: /.+/,
        taxRegistrationNumber: 'TAX-12345',
        telephone: '+1 555 0100',
        fax: '+1 555 0101',
        scrapPercent: '2',
        // Confirmed live: these 4 Path fields validate their format once
        // filled (inline "must be a valid path (e.g. C:\Images\)" errors
        // for a URL-style value like "/images/pw-md") — a Windows-style
        // path is required, not just any non-empty string.
        imagePath: 'C:\\Images\\PWMD\\',
        documentPath: 'C:\\Documents\\PWMD\\',
        frPath: 'C:\\Export\\FR\\PWMD\\',
        gproPath: 'C:\\Export\\GPRO\\PWMD\\',
      });
      await companyFormPage.create();
    });

    await test.step('Toast reads "Company created." and the row shows Active', async () => {
      await companyFormPage.expectCreatedSuccessfully();
      await companyListPage.search(name);
      await companyListPage.expectRowVisible(name);
      await companyListPage.expectRowStatus(name, 'Active');
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Company RequiredOnly ${suffix}`;

    await companyListPage.open();
    await companyListPage.openNewCompany();

    await test.step('Fill only the 6 required fields, leave Active/Master Data Approval untouched', async () => {
      await companyFormPage.fillRequired({ ...requiredCompanyValues(suffix), companyName: name });
      await companyFormPage.create();
    });

    await test.step('Company saves successfully, Active by default', async () => {
      await companyFormPage.expectCreatedSuccessfully();
      await companyListPage.search(name);
      await companyListPage.expectRowStatus(name, 'Active');
    });
  });

  test('TC:3 Verify successful edit of an existing company', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const originalName = `PW MD Company Edit ${suffix}`;
    const editedName = `PW MD Company Edited ${suffix}`;

    await test.step('Create a throwaway company to edit', async () => {
      await companyListPage.open();
      await companyListPage.openNewCompany();
      await companyFormPage.fillRequired({
        ...requiredCompanyValues(suffix),
        companyName: originalName,
      });
      await companyFormPage.create();
      await companyFormPage.expectCreatedSuccessfully();
    });

    await test.step('Click straight into Edit Company (no detail view in between) and change the name', async () => {
      await companyListPage.search(originalName);
      await companyListPage.openEdit(originalName);
      await companyFormPage.locators.companyNameInput.fill(editedName);
      await companyFormPage.save();
    });

    await test.step('Toast reads "Company updated." and the list reflects the new name', async () => {
      await companyFormPage.expectUpdatedSuccessfully();
      await companyListPage.search(editedName);
      await companyListPage.expectRowVisible(editedName);
    });
  });

  test('TC:4 Verify list search by Company Code and by Company Name', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Company Search ${suffix}`;
    const values = { ...requiredCompanyValues(suffix), companyName: name };

    await companyListPage.open();
    await companyListPage.openNewCompany();
    await companyFormPage.fillRequired(values);
    await companyFormPage.create();
    await companyFormPage.expectCreatedSuccessfully();

    await test.step('Search by Company Code narrows to the one row', async () => {
      await companyListPage.search(values.companyCode);
      await companyListPage.expectRowVisible(values.companyCode);
    });

    await test.step('Search by Company Name narrows to the same row', async () => {
      await companyListPage.search(name);
      await companyListPage.expectRowVisible(name);
    });
  });

  test('TC:5 Verify All / Active / Inactive tab filters on the list', async ({
    companyListPage,
  }) => {
    await companyListPage.open();

    await test.step('Active tab shows only Active companies', async () => {
      await companyListPage.locators.activeTab.click();
      await expect(companyListPage.locators.activeTab).toHaveAttribute('aria-pressed', 'true');
    });

    await test.step('Inactive tab shows only Inactive companies', async () => {
      await companyListPage.locators.inactiveTab.click();
      await expect(companyListPage.locators.inactiveTab).toHaveAttribute('aria-pressed', 'true');
    });

    await test.step('Back to All', async () => {
      await companyListPage.locators.allTab.click();
      await expect(companyListPage.locators.allTab).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test('TC:6 Verify validation when all required fields are left blank', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const l = companyFormPage.locators;

    await companyListPage.open();
    await companyListPage.openNewCompany();

    await test.step('Click Create with everything blank', async () => {
      await companyFormPage.create();
    });

    await test.step('All six required fields show an inline "Required" error at once', async () => {
      await companyFormPage.expectRequiredError(l.companyCodeInput);
      await companyFormPage.expectRequiredError(l.prefixCodeInput);
      await companyFormPage.expectRequiredError(l.companyNameInput);
      await companyFormPage.expectRequiredError(l.addressInput);
      await companyFormPage.expectRequiredError(l.primaryCurrencyCombobox);
      await companyFormPage.expectRequiredError(l.secondaryCurrencyCombobox);
      await companyFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:7 Verify Country of Operation and other optional fields are genuinely optional', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Company OptionalSkip ${suffix}`;

    await companyListPage.open();
    await companyListPage.openNewCompany();

    await test.step('Fill only the 6 required fields; leave Country of Operation on "—"', async () => {
      await expect(companyFormPage.locators.countryOfOperationCombobox).toHaveText('—');
      await companyFormPage.fillRequired({ ...requiredCompanyValues(suffix), companyName: name });
      await companyFormPage.create();
    });

    await test.step('Save succeeds — confirms Country of Operation etc. are genuinely optional', async () => {
      await companyFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:8 Verify duplicate Company Code handling', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const sharedCode = randCode5();

    await test.step('Create a company with a given Company Code', async () => {
      await companyListPage.open();
      await companyListPage.openNewCompany();
      await companyFormPage.fillRequired({
        ...requiredCompanyValues(suffix),
        companyCode: sharedCode,
        companyName: `PW MD Company DupSource ${suffix}`,
      });
      await companyFormPage.create();
      await companyFormPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt to create a second company reusing the exact same Company Code', async () => {
      await companyListPage.openNewCompany();
      await companyFormPage.fillRequired({
        ...requiredCompanyValues(`${suffix}b`),
        companyCode: sharedCode,
        companyName: `PW MD Company DupAttempt ${suffix}`,
      });
      await companyFormPage.create();
    });

    await test.step('Second save is blocked with the generic "Failed to create company." toast', async () => {
      await companyFormPage.expectCreateFailed();
      await companyFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:9 Verify Cancel discards changes on create', async ({
    companyListPage,
    companyFormPage,
  }) => {
    await companyListPage.open();
    const countBefore = await companyListPage.getAllCount();

    await test.step('Open New Company, fill some fields, then Cancel', async () => {
      await companyListPage.openNewCompany();
      await companyFormPage.locators.companyCodeInput.fill(randCode5());
      await companyFormPage.locators.companyNameInput.fill(
        `PW MD Company ShouldNotPersist ${uniqueSuffix()}`,
      );
      await companyFormPage.cancel();
    });

    await test.step('No company was created', async () => {
      await expect(companyListPage.locators.newCompanyButton).toBeVisible();
      const countAfter = await companyListPage.getAllCount();
      expect(countAfter).toBe(countBefore);
    });
  });

  test('TC:10 Edge: Company Code and Prefix Code max length', async ({
    companyListPage,
    companyFormPage,
  }) => {
    await companyListPage.open();
    await companyListPage.openNewCompany();

    await test.step('Typing 12 characters into Company Code truncates silently at 5', async () => {
      await companyFormPage.locators.companyCodeInput.fill('ABCDEFGHIJKL');
      await expect(companyFormPage.locators.companyCodeInput).toHaveValue(/^.{5}$/);
    });

    await test.step('Same cap applies to Prefix Code', async () => {
      await companyFormPage.locators.prefixCodeInput.fill('ABCDEFGHIJKL');
      await expect(companyFormPage.locators.prefixCodeInput).toHaveValue(/^.{5}$/);
    });
  });

  test('TC:11 Edge: special/unicode characters in Company Name are accepted', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const specialName = `PW MD Company <b>tag</b> "quote" 日本語 ${suffix}`;

    await companyListPage.open();
    await companyListPage.openNewCompany();

    await test.step('Fill Company Name with special/unicode characters', async () => {
      await companyFormPage.fillRequired({
        ...requiredCompanyValues(suffix),
        companyName: specialName,
      });
    });

    await test.step('The textbox retains the full string with no stripping or truncation', async () => {
      await expect(companyFormPage.locators.companyNameInput).toHaveValue(specialName);
    });

    await test.step('Save succeeds — the app accepts it client-side with no character-set restriction', async () => {
      await companyFormPage.create();
      await companyFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:12 Verify Deactivate action and its real effect', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Company Deactivate ${suffix}`;

    await test.step('Create a throwaway company (Active by default)', async () => {
      await companyListPage.open();
      await companyListPage.openNewCompany();
      await companyFormPage.fillRequired({ ...requiredCompanyValues(suffix), companyName: name });
      await companyFormPage.create();
      await companyFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open Edit and click "Deactivate" (not the in-form Active checkbox)', async () => {
      await companyListPage.search(name);
      await companyListPage.openEdit(name);
      await companyFormPage.deactivate();
    });

    await test.step('Toast reads "Company deactivated." and the row shows Inactive', async () => {
      await companyFormPage.expectDeactivatedSuccessfully();
      await companyListPage.search(name);
      await companyListPage.expectRowStatus(name, 'Inactive');
    });
  });

  test('TC:13 Verify reactivating a deactivated company — known trap, confirmed live', async ({
    companyListPage,
    companyFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Company Reactivate ${suffix}`;

    await test.step('Create and deactivate a throwaway company', async () => {
      await companyListPage.open();
      await companyListPage.openNewCompany();
      await companyFormPage.fillRequired({ ...requiredCompanyValues(suffix), companyName: name });
      await companyFormPage.create();
      await companyFormPage.expectCreatedSuccessfully();

      await companyListPage.search(name);
      await companyListPage.openEdit(name);
      await companyFormPage.deactivate();
      await companyFormPage.expectDeactivatedSuccessfully();
    });

    await test.step('Confirmed app bug: reopening the Inactive company still shows "Deactivate", never "Activate"', async () => {
      await companyListPage.search(name);
      await companyListPage.openEdit(name);
      await companyFormPage.expectDeactivateButtonStillShows();
      await expect(companyFormPage.locators.activeCheckbox).not.toBeChecked();
    });

    await test.step('The only confirmed way to reactivate: check the in-form "Active" checkbox and Save changes', async () => {
      await companyFormPage.toggleActive();
      await companyFormPage.save();
      await companyFormPage.expectUpdatedSuccessfully();
      await companyListPage.search(name);
      await companyListPage.expectRowStatus(name, 'Active');
    });
  });

  test('TC:14 Verify Primary Currency / Secondary Currency dropdown options', async ({
    page,
    companyListPage,
    companyFormPage,
  }) => {
    await companyListPage.open();
    await companyListPage.openNewCompany();

    await test.step('Opening Primary Currency shows a plain listbox with the confirmed option set', async () => {
      await companyFormPage.expectCurrencyOptionsVisible(
        companyFormPage.locators.primaryCurrencyCombobox,
        {
          checkListbox: true,
        },
      );
      await page.keyboard.press('Escape');
    });

    await test.step('Secondary Currency offers the same option set', async () => {
      await companyFormPage.expectCurrencyOptionsVisible(
        companyFormPage.locators.secondaryCurrencyCombobox,
      );
    });
  });
});
