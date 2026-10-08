import * as allure from 'allure-js-commons';
import { type Locator } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import { type VendorFieldValues } from '../../../src/pages/master-data/vendor-form.page';
import { VendorFormLocators } from '../../../src/locators/master-data/vendor-form.locators';

/**
 * Master Data — Vendor Master.
 *
 * Source of truth for these 15 cases: test-cases/master-data/vendor-master/vendor-master-testcases.md.
 * No ClickUp test-case tasks exist for this story (first-ever coverage for
 * this screen). Storage state from auth.setup.ts is already applied via
 * the "master-data" project's dependency — no login needed here.
 */
const REQUIRED_CURRENCY = /USD/;
const REQUIRED_CREDIT_TERMS = /NET30/;
const REQUIRED_PAYMENT_METHOD = /Telegraphic Transfer/;
const REQUIRED_COUNTRY = /India/;

function uniqueSuffix(): string {
  return String(Date.now());
}

/** All 8 confirmed-required fields, each with a fresh unique Prefix ID/Vendor Name per call. */
function requiredVendorValues(
  suffix: string,
): Required<
  Pick<
    VendorFieldValues,
    | 'prefixId'
    | 'vendorName'
    | 'currency'
    | 'creditTerms'
    | 'paymentMethod'
    | 'addressLine1'
    | 'city'
    | 'country'
  >
> {
  return {
    prefixId: `PW${suffix.slice(-4)}`,
    vendorName: `PW MD Vendor ${suffix}`,
    currency: REQUIRED_CURRENCY,
    creditTerms: REQUIRED_CREDIT_TERMS,
    paymentMethod: REQUIRED_PAYMENT_METHOD,
    addressLine1: '123 Test Street',
    city: 'Chennai',
    country: REQUIRED_COUNTRY,
  };
}

test.describe('Master Data - Vendor Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Vendor Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify Vendor Master list layout', async ({ page, vendorListPage }) => {
    await test.step('Navigate to Vendor Master', async () => {
      await vendorListPage.open();
    });

    await test.step('Heading, status tabs, search, and "New Vendor" are visible', async () => {
      await vendorListPage.expectLoaded();
      await expect(page.getByRole('button', { name: /^All \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Draft \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Approved \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Inactive \d+$/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Rejected \d+$/ })).toBeVisible();
      await expect(vendorListPage.locators.searchInput).toBeVisible();
    });
  });

  test('TC:2 Verify successful vendor creation with all required fields (plus some optional)', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Vendor All ${suffix}`;

    await test.step('Open New Vendor and fill required + optional fields', async () => {
      await vendorListPage.open();
      await vendorListPage.openNewVendor();
      await vendorFormPage.fillRequired({
        ...requiredVendorValues(suffix),
        vendorName: name,
        registeredName: `PW MD Vendor Registered ${suffix}`,
        email: `pw-md-vendor-${suffix}@example.com`,
        website: 'https://example.com',
      });
      await vendorFormPage.create();
    });

    await test.step('Toast reads "Vendor {CODE} created." and the row appears on the list', async () => {
      await vendorFormPage.expectCreatedSuccessfully();
      await vendorListPage.search(name);
      await vendorListPage.expectRowVisible(name);
    });
  });

  test('TC:3 Verify validation when all required fields are left blank', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const l = vendorFormPage.locators;

    await vendorListPage.open();
    await vendorListPage.openNewVendor();

    await test.step('Click Create with everything blank', async () => {
      await vendorFormPage.create();
    });

    await test.step('Every required field shows an inline "Required" error', async () => {
      await vendorFormPage.expectRequiredError(l.prefixIdInput);
      await vendorFormPage.expectRequiredError(l.vendorNameInput);
      await vendorFormPage.expectRequiredError(l.pickCurrencyButton);
      await vendorFormPage.expectRequiredError(l.creditTermsCombobox);
      await vendorFormPage.expectRequiredError(l.paymentMethodCombobox);
      await vendorFormPage.expectRequiredError(l.addressLine1Input);
      await vendorFormPage.expectRequiredError(l.cityInput);
      await vendorFormPage.expectRequiredError(l.pickCountryButton);
      await vendorFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:4 Verify required-field validation — one row per field', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    await vendorListPage.open();

    const suffix = uniqueSuffix();
    const full = requiredVendorValues(suffix);

    const fieldChecks: Array<{
      key: keyof typeof full;
      anchor: (l: VendorFormLocators) => Locator;
    }> = [
      { key: 'prefixId', anchor: (l) => l.prefixIdInput },
      { key: 'vendorName', anchor: (l) => l.vendorNameInput },
      { key: 'currency', anchor: (l) => l.pickCurrencyButton },
      { key: 'creditTerms', anchor: (l) => l.creditTermsCombobox },
      { key: 'paymentMethod', anchor: (l) => l.paymentMethodCombobox },
      { key: 'addressLine1', anchor: (l) => l.addressLine1Input },
      { key: 'city', anchor: (l) => l.cityInput },
      { key: 'country', anchor: (l) => l.pickCountryButton },
    ];

    for (const { key, anchor } of fieldChecks) {
      await test.step(`Leave "${key}" blank, fill everything else, Create is blocked`, async () => {
        await vendorListPage.openNewVendor();

        const values: VendorFieldValues = { ...full };
        delete values[key];
        await vendorFormPage.fillRequired(values);
        await vendorFormPage.create();

        await vendorFormPage.expectRequiredError(anchor(vendorFormPage.locators));
        await vendorFormPage.expectStillOnCreatePage();
        await vendorFormPage.cancel();
      });
    }
  });

  test('TC:5 Verify optional fields can be skipped on create', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Vendor Required Only ${suffix}`;

    await vendorListPage.open();
    await vendorListPage.openNewVendor();

    await test.step('Fill only the 8 required fields, leave every optional field blank', async () => {
      await vendorFormPage.fillRequired({ ...requiredVendorValues(suffix), vendorName: name });
      await vendorFormPage.create();
    });

    await test.step('Vendor saves successfully', async () => {
      await vendorFormPage.expectCreatedSuccessfully();
      await vendorListPage.search(name);
      await vendorListPage.expectRowVisible(name);
    });
  });

  test('TC:6 Verify successful vendor edit', async ({ vendorListPage, vendorFormPage }) => {
    const suffix = uniqueSuffix();
    const originalName = `PW MD Vendor Edit ${suffix}`;
    const editedName = `PW MD Vendor Edited ${suffix}`;

    await test.step('Create a throwaway vendor to edit', async () => {
      await vendorListPage.open();
      await vendorListPage.openNewVendor();
      await vendorFormPage.fillRequired({
        ...requiredVendorValues(suffix),
        vendorName: originalName,
      });
      await vendorFormPage.create();
      await vendorFormPage.expectCreatedSuccessfully();
    });

    await test.step('Open its Edit Vendor drawer and change the name', async () => {
      await vendorListPage.search(originalName);
      await vendorListPage.openEdit(originalName);
      await vendorFormPage.locators.vendorNameInput.fill(editedName);
      await vendorFormPage.save();
    });

    await test.step('Toast reads "Vendor updated." and the list reflects the new name', async () => {
      await vendorFormPage.expectUpdatedSuccessfully();
      await vendorListPage.search(editedName);
      await vendorListPage.expectRowVisible(editedName);
    });
  });

  test('TC:7 Verify Prefix ID is locked on edit', async ({ vendorListPage, vendorFormPage }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Vendor Locked ${suffix}`;

    await vendorListPage.open();
    await vendorListPage.openNewVendor();
    await vendorFormPage.fillRequired({ ...requiredVendorValues(suffix), vendorName: name });
    await vendorFormPage.create();
    await vendorFormPage.expectCreatedSuccessfully();

    await test.step('Reopen the vendor for editing', async () => {
      await vendorListPage.search(name);
      await vendorListPage.openEdit(name);
    });

    await test.step('Prefix ID is disabled', async () => {
      await expect(vendorFormPage.locators.prefixIdInput).toBeDisabled();
    });
  });

  test('TC:8 Verify Cancel discards changes on Create', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    // Asserting on the specific attempted name rather than the global "All
    // {n}" count — confirmed live (2026-10-07) that comparing a before/after
    // total is flaky on this shared dev environment: several *other*
    // agents run their own Playwright suites against the same dev instance
    // concurrently, so the global Vendor count can genuinely drift between
    // two reads for reasons that have nothing to do with this test.
    const attemptedName = `PW MD Vendor ShouldNotPersist ${uniqueSuffix()}`;

    await vendorListPage.open();

    await test.step('Open New Vendor, type a name, then Cancel', async () => {
      await vendorListPage.openNewVendor();
      await vendorFormPage.locators.vendorNameInput.fill(attemptedName);
      await vendorFormPage.cancel();
    });

    await test.step('No vendor was created with that name', async () => {
      await expect(vendorListPage.locators.newVendorButton).toBeVisible();
      await vendorListPage.search(attemptedName);
      await expect(vendorListPage.locators.row(attemptedName)).toHaveCount(0);
    });
  });

  test('TC:9 Verify Cancel discards changes on Edit', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const originalName = `PW MD Vendor CancelEdit ${suffix}`;
    const attemptedName = `PW MD Vendor ShouldRevert ${suffix}`;

    await vendorListPage.open();
    await vendorListPage.openNewVendor();
    await vendorFormPage.fillRequired({
      ...requiredVendorValues(suffix),
      vendorName: originalName,
    });
    await vendorFormPage.create();
    await vendorFormPage.expectCreatedSuccessfully();

    await test.step('Open Edit, change the name, then Cancel', async () => {
      await vendorListPage.search(originalName);
      await vendorListPage.openEdit(originalName);
      await vendorFormPage.locators.vendorNameInput.fill(attemptedName);
      await vendorFormPage.cancel();
    });

    await test.step('Reopening the record shows the original, unsaved name reverted', async () => {
      await vendorListPage.search(originalName);
      await vendorListPage.expectRowVisible(originalName);
    });
  });

  test('TC:10 Verify duplicate Vendor Name handling', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();

    await test.step('Create a vendor to collide with', async () => {
      await vendorListPage.open();
      await vendorListPage.openNewVendor();
      await vendorFormPage.fillRequired({
        ...requiredVendorValues(suffix),
        vendorName: `PW MD Vendor Dup Source ${suffix}`,
      });
      await vendorFormPage.create();
      await vendorFormPage.expectCreatedSuccessfully();
    });

    await test.step('Attempt to create a second vendor with the exact same name', async () => {
      await vendorListPage.openNewVendor();
      await vendorFormPage.fillRequired({
        ...requiredVendorValues(`${suffix}b`),
        vendorName: `PW MD Vendor Dup Source ${suffix}`,
      });
      await vendorFormPage.create();
    });

    await test.step('Save is blocked with the generic "Failed to create vendor." toast', async () => {
      await vendorFormPage.expectCreateFailed();
      await vendorFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:11 Verify Status change flow — Approved to Inactive', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Vendor Status ${suffix}`;

    await test.step('Create a throwaway vendor (lands directly in Approved)', async () => {
      await vendorListPage.open();
      await vendorListPage.openNewVendor();
      await vendorFormPage.fillRequired({ ...requiredVendorValues(suffix), vendorName: name });
      await vendorFormPage.create();
      await vendorFormPage.expectCreatedSuccessfully();
    });

    await vendorListPage.search(name);
    const code = (
      await vendorListPage.locators.row(name).getByRole('cell').nth(1).innerText()
    ).trim();

    await test.step("Change status to Inactive via the row's status chip", async () => {
      await vendorListPage.changeStatus(code, 'Change to Inactive', 'Set to Inactive');
    });

    await test.step('Toast reads "Vendor status updated." and the row shows Inactive', async () => {
      await vendorListPage.expectStatusUpdatedToast();
      await vendorListPage.search(name);
      await vendorListPage.expectRowStatus(code, 'Inactive');
    });
  });

  test('TC:12 Verify Status change flow — Inactive back to Approved', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const name = `PW MD Vendor StatusRoundTrip ${suffix}`;

    await vendorListPage.open();
    await vendorListPage.openNewVendor();
    await vendorFormPage.fillRequired({ ...requiredVendorValues(suffix), vendorName: name });
    await vendorFormPage.create();
    await vendorFormPage.expectCreatedSuccessfully();

    await vendorListPage.search(name);
    const code = (
      await vendorListPage.locators.row(name).getByRole('cell').nth(1).innerText()
    ).trim();

    await test.step('Deactivate it first', async () => {
      await vendorListPage.changeStatus(code, 'Change to Inactive', 'Set to Inactive');
      await vendorListPage.expectStatusUpdatedToast();
    });

    await test.step('Then reactivate it — only "Change to Approved" is offered from Inactive', async () => {
      await vendorListPage.search(name);
      await vendorListPage.changeStatus(code, 'Change to Approved', 'Set to Approved');
    });

    await test.step('Toast reads "Vendor status updated." and the row shows Approved again', async () => {
      await vendorListPage.expectStatusUpdatedToast();
      await vendorListPage.search(name);
      await vendorListPage.expectRowStatus(code, 'Approved');
    });
  });

  test('TC:13 Verify Email field format validation (native HTML5)', async ({
    page,
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();

    await vendorListPage.open();
    await vendorListPage.openNewVendor();
    await vendorFormPage.fillRequired({
      ...requiredVendorValues(suffix),
      vendorName: `PW MD Vendor BadEmail ${suffix}`,
    });

    await test.step('Enter an invalid email and attempt to Create', async () => {
      await vendorFormPage.locators.emailInput.fill('not-an-email');
      await vendorFormPage.create();
    });

    await test.step('Browser-native validation blocks the submit — no app-level toast, still on the form', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no "DOM" lib in tsconfig (ES2022 only), so HTMLInputElement isn't a known type here even though this callback runs in the browser.
      const validity = await vendorFormPage.locators.emailInput.evaluate((el: any) => ({
        valid: el.validity.valid as boolean,
        typeMismatch: el.validity.typeMismatch as boolean,
      }));
      expect(validity.valid).toBe(false);
      expect(validity.typeMismatch).toBe(true);
      await vendorFormPage.expectStillOnCreatePage();
      await expect(page.getByText(/created\.$/)).not.toBeVisible();
    });
  });

  test('TC:14 Edge: very long Vendor Name produces a silent, unexplained block', async ({
    page,
    vendorListPage,
    vendorFormPage,
  }) => {
    const suffix = uniqueSuffix();
    const longName = `PW MD Vendor Long ${suffix} ` + 'X'.repeat(250);

    await vendorListPage.open();
    await vendorListPage.openNewVendor();

    await test.step('Fill every required field, with a ~270-character Vendor Name', async () => {
      await vendorFormPage.fillRequired({ ...requiredVendorValues(suffix), vendorName: longName });
      await vendorFormPage.create();
    });

    await test.step('Confirmed live app bug: no toast, no navigation, no inline error', async () => {
      // Bounded wait matching the live exploration — the block is silent,
      // not slow, so a short window is enough to tell the difference
      // between "nothing happens" and "a delayed success/failure toast".
      await page.waitForTimeout(5_000);
      await expect(page.getByText(/created\.$/)).not.toBeVisible();
      await expect(page.getByText('Failed to create vendor.')).not.toBeVisible();
      await vendorFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:15 Edge: special characters in Vendor Name are accepted client-side', async ({
    vendorListPage,
    vendorFormPage,
  }) => {
    const specialName = `PW MD Vendor !@#$%^&*()_+<>?"'; DROP TABLE-- ${uniqueSuffix()}`;

    await vendorListPage.open();
    await vendorListPage.openNewVendor();

    await test.step('Fill Vendor Name with special characters', async () => {
      await vendorFormPage.locators.vendorNameInput.fill(specialName);
    });

    await test.step('The textbox retains the full string with no stripping or truncation', async () => {
      await expect(vendorFormPage.locators.vendorNameInput).toHaveValue(specialName);
    });
  });
});
