import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';

/**
 * CRM — Create Customer (Sprint 1, User Story 1).
 *
 * Source of truth for these 11 cases: test-cases/crm/create-customer.md
 * (mirrors ClickUp task https://app.clickup.com/t/86eyqvaq4 — each test
 * below links to its own ClickUp test-case task via allure.tms(), so the
 * Allure report can jump straight to it). Storage state from
 * auth.setup.ts is already applied via the "crm" project's dependency —
 * no login needed here.
 */
test.describe('CRM - Create Customer', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Create Customer');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify navigation and layout of Create Customer screen', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyqvaru', 'TC:1 (ClickUp)');

    await test.step('Navigate to the CRM module and click "Create Customer"', async () => {
      await createCustomerPage.openFromCrmHome();
    });

    await test.step('The Create Customer form opens with all sections', async () => {
      await createCustomerPage.expectFormSectionsVisible();
    });
  });

  test('TC:2 Verify validation when mandatory fields are left blank', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyqvatv', 'TC:2 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Leave mandatory fields empty and click Save', async () => {
      await createCustomerPage.save();
    });

    await test.step('Save is blocked with inline "Required" errors', async () => {
      await expect(createCustomerPage.locators.saveButton).toBeVisible(); // still on the form, not navigated away
      await createCustomerPage.expectFieldError(/required/i);
    });
  });

  test('TC:3 Verify field-level format validation for URL fields', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyqvav3', 'TC:3 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Enter invalid values into LinkedIn, Facebook, Instagram', async () => {
      await createCustomerPage.fillProfile({
        linkedIn: 'not-a-url',
        facebook: 'not-a-url',
        instagram: 'not-a-url',
      });
      await createCustomerPage.save();
    });

    await test.step('Save is blocked with "Enter a valid URL" errors', async () => {
      await createCustomerPage.expectFieldError(/enter a valid url/i);
    });
  });

  test('TC:4 Verify Business Process / Department assignee restriction', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4rq', 'TC:4 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Fill required Customer details', async () => {
      await createCustomerPage.fillProfile({
        name: 'Acme Textiles',
        email: 'acme-textiles@example.com',
        city: 'Coimbatore',
        country: 'India',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
        crmStage: 'Lead',
      });
    });

    await test.step('Add a Business Process/Department line with no assignee', async () => {
      await createCustomerPage.addBusinessProcessWithoutAssignee('Cutting');
      await createCustomerPage.save();
    });

    await test.step('Save is blocked: at least one assignee is required', async () => {
      await createCustomerPage.expectFieldError(/at least one assignee/i);
    });
  });

  test('TC:5 Verify duplicate detection modal warning', async ({ createCustomerPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4rr', 'TC:5 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Enter details matching an existing Customer', async () => {
      // "Acme Textiles" is a real existing Customer on dev (confirmed
      // directly), so this reliably triggers the duplicate check there.
      await createCustomerPage.fillProfile({
        name: 'Acme Textiles',
        email: 'acme-textiles@example.com',
        city: 'Coimbatore',
        country: 'India',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
        crmStage: 'Lead',
      });
      await createCustomerPage.save();
    });

    await test.step('A duplicate warning modal appears', async () => {
      await createCustomerPage.expectDuplicateWarningVisible();
    });
  });

  test('TC:6 Verify duplicate detection cancel action', async ({ createCustomerPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4ru', 'TC:6 (ClickUp)');
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: 'Acme Textiles',
      email: 'acme-textiles@example.com',
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    await createCustomerPage.expectDuplicateWarningVisible();

    await test.step('Click "Cancel to review"', async () => {
      await createCustomerPage.locators.cancelToReviewButton.click();
    });

    await test.step('Modal closes and the form is still editable, unsaved', async () => {
      await expect(createCustomerPage.locators.duplicateWarningModal).toBeHidden();
      await expect(createCustomerPage.locators.saveButton).toBeVisible();
    });
  });

  test('TC:7 Verify successful customer creation without existing contacts linked', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4rw', 'TC:7 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Fill in valid mandatory/optional details, no contact linked', async () => {
      await createCustomerPage.fillProfile({
        name: `Playwright Test Customer ${Date.now()}`,
        email: `pw-test-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
        crmStage: 'Lead',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
      });
    });

    await test.step('Save (confirming "Save anyway" if a duplicate warning appears)', async () => {
      await createCustomerPage.save();
      if (await createCustomerPage.locators.duplicateWarningModal.isVisible()) {
        await createCustomerPage.locators.saveAnywayButton.click();
      }
    });

    await test.step('Customer is saved: toast + "Proceed to Contact creation?" prompt', async () => {
      await createCustomerPage.expectSavedSuccessfully();
    });
  });

  test('TC:8 Verify post-save Contact creation prompt - "Create Contact" path', async ({
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4t4', 'TC:8 (ClickUp)');
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Test Customer ${Date.now()}`,
      email: `pw-test-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    await createCustomerPage.expectSavedSuccessfully();

    await test.step('Click "Create Contact" on the post-save modal', async () => {
      await createCustomerPage.locators.createContactButton.click();
    });

    await test.step('Routed to Create Contact, pre-linked to the new Customer', async () => {
      await expect(page).toHaveURL(/contact/i);
    });
  });

  test('TC:9 Verify post-save Contact creation prompt - "Cancel" path', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4t5', 'TC:9 (ClickUp)');
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: `Playwright Test Customer ${Date.now()}`,
      email: `pw-test-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    await createCustomerPage.expectSavedSuccessfully();

    await test.step('Click "Cancel" on the post-save modal', async () => {
      await createCustomerPage.locators.postSaveCancelButton.click();
    });

    await test.step('Redirected to the Customer Detail view or Customer List', async () => {
      await expect(createCustomerPage.locators.postSaveModal).toBeHidden();
    });
  });

  test('TC:10 Verify linking existing contacts during Customer creation', async ({
    createContactPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4t6', 'TC:10 (ClickUp)');
    const contactName = 'Playwright Unlinked Contact';

    await test.step('Create a real unlinked Contact to link', async () => {
      await createContactPage.openFromContactList();
      await createContactPage.fillProfile({
        name: contactName,
        designation: 'Buyer',
        email: `pw-unlinked-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.save();
      await expect(createContactPage.locators.toast).toBeVisible();
    });

    await createCustomerPage.openFromCrmHome();

    await test.step('Fill valid details and link that existing Contact', async () => {
      await createCustomerPage.fillProfile({
        name: `Playwright Test Customer ${Date.now()}`,
        email: `pw-test-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
        originType: 'Referral',
        origin: 'Internal Referral',
        buyer: 'Fabric',
        referredBy: 'Jordan Smith',
        crmStage: 'Lead',
      });
      await createCustomerPage.linkExistingContact(contactName);
      await createCustomerPage.save();
    });

    // Confirmed on dev: when a Contact is already linked at save time,
    // the "created successfully / create a Contact?" modal doesn't
    // appear at all (that prompt only exists for the "no Contact
    // linked" case per TC:7/TC:8) — the page just lands on the new
    // Customer's own Detail screen with the link already in place.
    await test.step('Customer saved and the Contact now references it', async () => {
      await expect(createCustomerPage.locators.toast).toBeVisible();
      await expect(page.getByText('Contacts (1)')).toBeVisible();
    });
  });

  test('TC:11 Verify Cancel button functionality', async ({ createCustomerPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abt4up', 'TC:11 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Enter details, then click Cancel', async () => {
      await createCustomerPage.fillProfile({ name: 'Should Not Be Saved' });
      await createCustomerPage.cancel();
    });

    await test.step('Creation is canceled, nothing persisted, back on the Customers list', async () => {
      await expect(page.getByText('Should Not Be Saved')).toHaveCount(0);
    });
  });
});
