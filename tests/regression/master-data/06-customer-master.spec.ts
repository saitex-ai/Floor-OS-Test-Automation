import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import * as allure from 'allure-js-commons';
import { CustomerListPage } from '../../../src/pages/master-data/customer-list.page';
import { CustomerFormPage, type CustomerFieldValues } from '../../../src/pages/master-data/customer-form.page';

/**
 * Master Data — Customer Master.
 *
 * Source of truth for these 14 cases, one test() per TC row:
 * test-cases/master-data/customer-master/customer-master-testcases.md. No
 * ClickUp test-case tasks exist for this story (first-ever coverage for
 * this screen). Storage state from auth.setup.ts is already applied via
 * the "master-data" project's dependency — no login needed here.
 *
 * `customerListPage`/`customerFormPage` are not registered on the shared
 * master-data fixtures yet (another agent owns that file) — constructed
 * directly from the `page` fixture here instead. See this session's
 * report for the exact fixture entries to add once that merge lands.
 */
const REQUIRED_COUNTRY = /^AF —/;
const REQUIRED_CURRENCY = /USD/;

function uniqueSuffix(): string {
  return String(Date.now());
}

/** All 4 confirmed-required fields, each with a fresh unique Prefix ID/Customer Name per call. */
function requiredCustomerValues(
  suffix: string,
): Required<Pick<CustomerFieldValues, 'prefixId' | 'customerName' | 'country' | 'currency'>> {
  return {
    prefixId: `PW${suffix}`,
    customerName: `PW MD Customer ${suffix}`,
    country: REQUIRED_COUNTRY,
    currency: REQUIRED_CURRENCY,
  };
}

test.describe('Master Data - Customer Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Customer Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all fields filled', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer All ${suffix}`;

    await test.step('Open New Customer and fill every field', async () => {
      await customerListPage.open();
      await customerListPage.openNewCustomer();
      await customerFormPage.fillRequired({
        ...requiredCustomerValues(suffix),
        customerName: name,
        contactPerson: 'Jordan Smith',
        email: `pw-md-customer-${suffix}@example.com`,
        website: 'https://example.com',
        phone1: '+1 555 0100',
        buyerCode: 'BUY01',
        fax: '+1 555 0101',
        addressLine1: '123 Test Street',
        addressLine2: 'Suite 2',
        city: 'Chennai',
        stateProvince: 'TN',
        postalCode: '600001',
        paymentMethod: /.+/,
        creditTerms: /.+/,
      });
      await customerFormPage.create();
    });

    await test.step('Toast reads "Customer {CODE} created." and the row shows Approved', async () => {
      await customerFormPage.expectCreatedSuccessfully();
      await customerListPage.search(name);
      await customerListPage.expectRowVisible(name);
      await customerListPage.expectRowStatus(name, 'Approved');
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer RequiredOnly ${suffix}`;

    await customerListPage.open();
    await customerListPage.openNewCustomer();

    await test.step('Fill only Prefix ID, Customer Name, Country, Currency', async () => {
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name });
      await customerFormPage.create();
    });

    await test.step('Customer saves directly into Approved status (not Draft) — confirmed live', async () => {
      await customerFormPage.expectCreatedSuccessfully();
      await customerListPage.search(name);
      await customerListPage.expectRowStatus(name, 'Approved');
    });
  });

  test('TC:3 Verify Customer Code is system-generated and immutable', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer CodeLocked ${suffix}`;

    await test.step('Customer Code reads "Auto-generated" and is disabled before save', async () => {
      await customerListPage.open();
      await customerListPage.openNewCustomer();
      await expect(customerFormPage.locators.customerCodeInput).toBeDisabled();
    });

    let generatedCode = '';
    await test.step('Create the customer and capture its generated code from the toast', async () => {
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name });
      await customerFormPage.create();
      generatedCode = await customerFormPage.getCreatedCustomerCode();
      expect(generatedCode.length).toBeGreaterThan(0);
    });

    await test.step('Reopening shows the real code, still disabled, and Prefix ID now locked too', async () => {
      await customerListPage.search(name);
      await customerListPage.openEdit(name);
      await expect(customerFormPage.locators.customerCodeInput).toHaveValue(generatedCode);
      await expect(customerFormPage.locators.customerCodeInput).toBeDisabled();
      await expect(customerFormPage.locators.prefixIdInput).toBeDisabled();
    });
  });

  test('TC:4 Verify successful edit of an existing customer', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const originalName = `PW MD Customer Edit ${suffix}`;
    const editedName = `PW MD Customer Edited ${suffix}`;

    await test.step('Create a throwaway customer to edit', async () => {
      await customerListPage.open();
      await customerListPage.openNewCustomer();
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: originalName });
      await customerFormPage.create();
      await customerFormPage.expectCreatedSuccessfully();
    });

    await test.step('Click straight into Edit Customer (no detail view in between) and change the name', async () => {
      await customerListPage.search(originalName);
      await customerListPage.openEdit(originalName);
      await customerFormPage.locators.customerNameInput.fill(editedName);
      await customerFormPage.save();
    });

    await test.step('Toast reads "Customer updated." and the list reflects the new name', async () => {
      await customerFormPage.expectUpdatedSuccessfully();
      await customerListPage.search(editedName);
      await customerListPage.expectRowVisible(editedName);
    });
  });

  test('TC:5 Verify the "Brands" tab is gated until the customer is first saved', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer Brands ${suffix}`;

    await customerListPage.open();
    await customerListPage.openNewCustomer();

    await test.step('Before saving, Brands only shows the gating message', async () => {
      await customerFormPage.openBrandsTab();
      await customerFormPage.expectBrandsGatedMessage();
    });

    await test.step('Save the customer', async () => {
      await customerFormPage.openGeneralTab();
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name });
      await customerFormPage.create();
      await customerFormPage.expectCreatedSuccessfully();
    });

    await test.step('After saving, Brands exposes Add Brand', async () => {
      await customerListPage.search(name);
      await customerListPage.openEdit(name);
      await customerFormPage.openBrandsTab();
      await customerFormPage.expectBrandsTabUsable();
    });
  });

  test('TC:6 Verify list search by Customer Code, Name, and Email', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer Search ${suffix}`;
    const email = `pw-md-search-${suffix}@example.com`;

    await customerListPage.open();
    await customerListPage.openNewCustomer();
    await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name, email });
    await customerFormPage.create();
    const code = await customerFormPage.getCreatedCustomerCode();

    await test.step('Search by Customer Code', async () => {
      await customerListPage.search(code);
      await customerListPage.expectRowVisible(code);
    });

    await test.step('Search by Customer Name', async () => {
      await customerListPage.search(name);
      await customerListPage.expectRowVisible(name);
    });

    await test.step('Search by Email', async () => {
      await customerListPage.search(email);
      await customerListPage.expectRowVisible(code);
    });
  });

  test('TC:7 Verify status tab filters, and that counts scope to an active search', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer TabScope ${suffix}`;

    await customerListPage.open();

    await test.step('Status tabs are all present', async () => {
      await expect(customerListPage.locators.allTab).toBeVisible();
      await expect(customerListPage.locators.draftTab).toBeVisible();
      await expect(customerListPage.locators.approvedTab).toBeVisible();
      await expect(customerListPage.locators.inactiveTab).toBeVisible();
      await expect(customerListPage.locators.rejectedTab).toBeVisible();
    });

    await test.step('Create a uniquely-named customer, then search for it', async () => {
      await customerListPage.openNewCustomer();
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name });
      await customerFormPage.create();
      await customerFormPage.expectCreatedSuccessfully();
      await customerListPage.search(name);
    });

    await test.step('Confirmed live: with that search active, "All" re-scopes to just the 1 matching row', async () => {
      await expect(customerListPage.locators.allTab).toHaveText(/^All\s*1$/);
    });
  });

  test('TC:8 Verify validation when all required fields are left blank', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const l = customerFormPage.locators;

    await customerListPage.open();
    await customerListPage.openNewCustomer();

    await test.step('Click Create with everything blank', async () => {
      await customerFormPage.create();
    });

    await test.step('All four required fields show an inline "Required" error at once', async () => {
      await customerFormPage.expectRequiredError(l.prefixIdInput);
      await customerFormPage.expectRequiredError(l.customerNameInput);
      await customerFormPage.expectRequiredError(l.countryCombobox);
      await customerFormPage.expectRequiredError(l.currencyCombobox);
      await customerFormPage.expectStillOnCreatePage();
    });
  });

  test('TC:9 Verify every other field is genuinely optional', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer OptionalSkip ${suffix}`;

    await customerListPage.open();
    await customerListPage.openNewCustomer();

    await test.step('Fill only the 4 required fields; Contact/Email/Phone/Address/etc. stay blank', async () => {
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name });
      await customerFormPage.create();
    });

    await test.step('Save succeeds — confirms every other field is genuinely optional', async () => {
      await customerFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:10 Verify Email field format validation', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();

    await customerListPage.open();
    await customerListPage.openNewCustomer();
    await customerFormPage.fillRequired({
      ...requiredCustomerValues(suffix),
      customerName: `PW MD Customer BadEmail ${suffix}`,
    });

    await test.step('Enter an invalid email and attempt to Create', async () => {
      await customerFormPage.locators.emailInput.fill('not-an-email');
      await customerFormPage.create();
    });

    await test.step('Native HTML5 validation blocks the submit — no app-level toast, still on the form', async () => {
      expect(await customerFormPage.isEmailValid()).toBe(false);
      expect(await customerFormPage.getEmailValidationMessage()).toContain('@');
      await customerFormPage.expectStillOnCreatePage();
      await expect(page.getByText(/created\.$/)).not.toBeVisible();
    });
  });

  test('TC:11 Verify duplicate Prefix ID is allowed — surprising, confirmed live', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const sharedPrefix = `PWDUP${suffix}`;

    await test.step('Create a customer with a given Prefix ID', async () => {
      await customerListPage.open();
      await customerListPage.openNewCustomer();
      await customerFormPage.fillRequired({
        ...requiredCustomerValues(suffix),
        prefixId: sharedPrefix,
        customerName: `PW MD Customer DupPrefixA ${suffix}`,
      });
      await customerFormPage.create();
      await customerFormPage.expectCreatedSuccessfully();
    });

    await test.step('Create a second, different customer reusing the exact same Prefix ID', async () => {
      await customerListPage.openNewCustomer();
      await customerFormPage.fillRequired({
        ...requiredCustomerValues(`${suffix}b`),
        prefixId: sharedPrefix,
        customerName: `PW MD Customer DupPrefixB ${suffix}`,
      });
      await customerFormPage.create();
    });

    await test.step('Confirmed app behavior: BOTH saves succeed — Prefix ID has no uniqueness constraint', async () => {
      await customerFormPage.expectCreatedSuccessfully();
    });
  });

  test('TC:12 Verify Cancel discards changes on create', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);

    await customerListPage.open();
    const countBefore = await customerListPage.getAllCount();

    await test.step('Open New Customer, fill some fields, then Cancel', async () => {
      await customerListPage.openNewCustomer();
      await customerFormPage.locators.customerNameInput.fill(
        `PW MD Customer ShouldNotPersist ${uniqueSuffix()}`,
      );
      await customerFormPage.cancel();
    });

    await test.step('No customer was created', async () => {
      await expect(customerListPage.locators.newCustomerButton).toBeVisible();
      const countAfter = await customerListPage.getAllCount();
      expect(countAfter).toBe(countBefore);
    });
  });

  test('TC:13 Verify Deactivate action and the same reactivation trap as Company Master', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const suffix = uniqueSuffix();
    const name = `PW MD Customer Deactivate ${suffix}`;

    await test.step('Create and deactivate a throwaway customer', async () => {
      await customerListPage.open();
      await customerListPage.openNewCustomer();
      await customerFormPage.fillRequired({ ...requiredCustomerValues(suffix), customerName: name });
      await customerFormPage.create();
      await customerFormPage.expectCreatedSuccessfully();

      await customerListPage.search(name);
      await customerListPage.openEdit(name);
      await customerFormPage.deactivate();
      await customerFormPage.expectDeactivatedSuccessfully();
      await customerListPage.search(name);
      await customerListPage.expectRowStatus(name, 'Inactive');
    });

    await test.step('Confirmed app bug (same as Company Master): reopening still shows "Deactivate", never "Activate"', async () => {
      await customerListPage.openEdit(name);
      await customerFormPage.expectDeactivateButtonStillShows();
      await expect(customerFormPage.locators.activeCheckbox).not.toBeChecked();
    });

    await test.step('The only confirmed way to reactivate: check the in-form "Active" checkbox and Save changes', async () => {
      await customerFormPage.toggleActive();
      await customerFormPage.save();
      await customerFormPage.expectUpdatedSuccessfully();
      await customerListPage.search(name);
      await customerListPage.expectRowStatus(name, 'Approved');
    });
  });

  test('TC:14 Edge: Prefix ID has no max-length cap', async ({ page }) => {
    const customerListPage = new CustomerListPage(page);
    const customerFormPage = new CustomerFormPage(page);
    const longPrefix = 'ABCDEFGHIJKLMNOP';

    await customerListPage.open();
    await customerListPage.openNewCustomer();

    await test.step('Typing 16 characters into Prefix ID is accepted in full, unlike Company Code', async () => {
      await customerFormPage.locators.prefixIdInput.fill(longPrefix);
      await expect(customerFormPage.locators.prefixIdInput).toHaveValue(longPrefix);
    });
  });
});
