import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { CustomerProfileDetails } from '../../../src/pages/crm/create-customer.page';

/**
 * CRM — Company for Customer (Sprint 5).
 *
 * Source of truth: test-cases/crm/company-for-customer.md (ClickUp
 * test-case set https://app.clickup.com/t/z941abx7df). Behavior below was
 * confirmed directly against dev on 2026-10-15:
 *
 * - "Company" (Customer Management section) is a multi-select combobox:
 *   a popup with a "Search companies…" box + listbox "Company". Free text
 *   that matches nothing shows "No companies match" and can't be picked.
 * - The company list is data-driven, not a fixed set — on dev it's
 *   mostly other automation's "Automation QA Company …" records — so the
 *   tests pick whichever options are listed first rather than hard-coding
 *   names.
 * - TC:3: multiple companies can be selected; the Detail read view shows
 *   them as one comma-separated list, which is the intended display
 *   (confirmed with the team 2026-10-15).
 * - TC:4 BUG: a Customer still saves with NO Company selected (ClickUp bug
 *   z941abx9aw is marked done but is not fixed on dev).
 * - TC:6 is fixme: Customer Detail has no Audit History / Activity log.
 */
test.describe('CRM - Company for Customer', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Company for Customer');
    await allure.owner('CRM QA');
  });

  /** A unique, otherwise-valid Customer profile (Company is handled separately per test). */
  function customerProfile(): CustomerProfileDetails {
    const stamp = Date.now();
    return {
      name: `Playwright Company For Customer ${stamp}`,
      email: `pw-company-${stamp}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      crmStage: 'Lead',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
    };
  }

  test('TC:1 Verify Company Field Options (Static Reference Data)', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7dg', 'TC:1 (ClickUp)');
    const unlisted = `Playwright Unlisted Company ${Date.now()}`;
    let options: string[] = [];

    await createCustomerPage.openFromCrmHome();

    await test.step('Click on the Company field dropdown', async () => {
      options = await createCustomerPage.availableCompanies();
    });

    await test.step('The dropdown lists the configured companies', async () => {
      expect(options.length).toBeGreaterThan(0);
      expect(options).not.toContain(unlisted);
    });

    await test.step('Type a custom, unlisted company name into the field', async () => {
      await createCustomerPage.typeFreeTextCompany(unlisted);
    });

    await test.step('Free text is rejected: no match, nothing selectable or selected', async () => {
      await createCustomerPage.expectNoCompanyMatches();
      await createCustomerPage.closeCompanyDropdown();
      await createCustomerPage.expectNoCompanySelected();
    });
  });

  test('TC:2 Create Customer with Single Company Selection', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    test.slow();
    await allure.tms('https://app.clickup.com/t/z941abx7dh', 'TC:2 (ClickUp)');
    const profile = customerProfile();
    let company = '';

    await createCustomerPage.openFromCrmHome();

    await test.step('Fill in mandatory customer details', async () => {
      company = (await createCustomerPage.availableCompanies())[0]!;
      await createCustomerPage.closeCompanyDropdown();
    });

    await test.step('Select one operating company from the Company dropdown', async () => {
      await createCustomerPage.selectCompanies([company]);
      await createCustomerPage.expectSelectedCompanies([company]);
      await createCustomerPage.fillProfile(profile);
    });

    await test.step('Click Save — the record is created', async () => {
      await createCustomerPage.saveAndOpenDetail();
      await expect(customerDetailPage.locators.nameHeading).toHaveText(profile.name!);
    });

    await test.step('The selected company is shown in the Customer Management card', async () => {
      await customerDetailPage.expectCompanyReadValue(company);
    });

    await test.step('The company persists after a reload', async () => {
      await page.reload();
      await customerDetailPage.expectCompanyReadValue(company);
    });
  });

  test('TC:3 Create Customer with Multiple Company Selections', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    test.slow();
    await allure.tms('https://app.clickup.com/t/z941abx7dj', 'TC:3 (ClickUp)');
    const profile = customerProfile();
    let companies: string[] = [];

    await createCustomerPage.openFromCrmHome();

    await test.step('Fill in mandatory customer details', async () => {
      companies = (await createCustomerPage.availableCompanies()).slice(0, 2);
      expect(companies).toHaveLength(2);
      await createCustomerPage.closeCompanyDropdown();
    });

    await test.step('Select two operating companies — each shows as its own chip', async () => {
      await createCustomerPage.selectCompanies(companies);
      await createCustomerPage.expectSelectedCompanies(companies);
      await createCustomerPage.fillProfile(profile);
    });

    await test.step('Click Save — the record saves without errors', async () => {
      await createCustomerPage.saveAndOpenDetail();
      await expect(customerDetailPage.locators.nameHeading).toHaveText(profile.name!);
    });

    // Confirmed with the team (2026-10-15): multiple companies are shown on
    // the Detail page as one comma-separated list — intended, not a bug.
    await test.step('Both companies are saved and shown on the Detail page as a comma-separated list', async () => {
      await customerDetailPage.expectCompanyReadValue(companies.join(', '));
      await customerDetailPage.expectCompanyReadValueIsPlainText();
    });
  });

  test('TC:4 Attempt to Save Customer without Selecting a Company', async ({
    createCustomerPage,
    customerDetailPage,
  }) => {
    test.slow();
    await allure.tms('https://app.clickup.com/t/z941abx7dk', 'TC:4 (ClickUp)');
    const profile = customerProfile();

    await createCustomerPage.openFromCrmHome();

    await test.step('Fill every other mandatory field, leave Company blank', async () => {
      await createCustomerPage.fillProfile({ ...profile, skipCompany: true });
      await createCustomerPage.expectNoCompanySelected();
    });

    // BUG (confirmed on dev 2026-10-15): expected the save to be blocked
    // with an inline "At least one Company must be selected" error on the
    // Company field. Actual: no validation at all — the Customer is
    // created ("was created successfully!" modal) and its Company is
    // empty. ClickUp bug z941abx9aw ("Customer Record Can Be Created
    // Without Selecting a Mandatory Company") is marked done but the fix
    // is not on dev. Flip this to expectFieldError(...) once it lands.
    await test.step('BUG: Save is NOT blocked — the Customer is created with no Company', async () => {
      await createCustomerPage.saveAndOpenDetail();
      await expect(customerDetailPage.locators.nameHeading).toHaveText(profile.name!);
      await customerDetailPage.expectCompanyReadValue('');
    });
  });

  test("TC:5 Edit Existing Customer's Company Associations", async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    test.slow();
    await allure.tms('https://app.clickup.com/t/z941abx7dm', 'TC:5 (ClickUp)');
    const profile = customerProfile();
    let initial = '';
    let replacement = '';

    await test.step('Create a Customer with one company', async () => {
      await createCustomerPage.openFromCrmHome();
      [initial, replacement] = (await createCustomerPage.availableCompanies()).slice(0, 2) as [
        string,
        string,
      ];
      await createCustomerPage.closeCompanyDropdown();
      await createCustomerPage.selectCompanies([initial]);
      await createCustomerPage.fillProfile(profile);
      await createCustomerPage.saveAndOpenDetail();
      await customerDetailPage.expectCompanyReadValue(initial);
    });

    await test.step('Edit Customer Management: add a second company, remove the initial one', async () => {
      await customerDetailPage.editCompanies({ remove: [initial], add: [replacement] });
      await customerDetailPage.expectCompanyEditChips([replacement]);
    });

    await test.step('Click Save — the change is persisted', async () => {
      await customerDetailPage.saveManagementSection();
    });

    await test.step('Read view shows the new company and omits the removed one', async () => {
      await customerDetailPage.expectCompanyReadValue(replacement);
      await page.reload();
      await customerDetailPage.expectCompanyReadValue(replacement);
    });
  });

  test('TC:6 Verify Audit History on Company Field Modification', async () => {
    await allure.tms('https://app.clickup.com/t/z941abx7dp', 'TC:6 (ClickUp)');
    // Confirmed on dev 2026-10-15 (after editing a Customer's Company):
    // Customer Detail has no Audit History / Activity log anywhere — its
    // tabs are Overview, Lead Qualification, Biz Docs, Communication,
    // Contacts, and none lists field changes. The only trace is the
    // System card's "Updated On"/"Updated By", which shows no old/new
    // values. Same gap already noted for Contact Detail (04 TC:6).
    test.fixme(
      true,
      'Customer Detail has no Audit History / Activity log tab or section on dev — there is nowhere to see old/new Company values, timestamp and acting user for a change.',
    );
  });
});
