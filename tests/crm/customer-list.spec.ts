import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';

/**
 * CRM — Customer List (Sprint 1).
 *
 * Source of truth: test-cases/crm/customer-list.md (ClickUp task
 * https://app.clickup.com/t/86eyqwcrp, "Customer list Screen"). Despite
 * the name, this task has no genuine Customer List (browse/search/filter)
 * content at all — every one of its 9 subtasks (TC:3-11 here, fetched
 * directly from ClickUp) is word-for-word identical to
 * create-customer.spec.ts's TC:3 through TC:11. Confirmed by reading
 * every subtask's full description, not just titles.
 *
 * Built as its own file per team decision (don't skip/merge duplicates),
 * reusing the same CreateCustomerPage and test bodies as
 * create-customer.spec.ts, each pointed at this task's own ClickUp
 * subtask via allure.tms() rather than reusing that file's links. Same
 * environment caveats apply (TC:4 onward need Country to be selectable
 * or a real seed Contact/Customer — see create-customer.page.ts).
 *
 * Recommendation, unchanged from the doc: flag to whoever maintains the
 * ClickUp test-case tree — these 9 subtasks look attached to the wrong
 * parent task.
 */
test.describe('CRM - Customer List', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Customer List');
    await allure.owner('CRM QA');
  });

  test('TC:3 Verify field-level format validation for URL fields', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt50p', 'TC:3 (ClickUp)');
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
    await allure.tms('https://app.clickup.com/t/z941abt50w', 'TC:4 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    // TODO(CRM QA): blocked locally — Country has no options ("No
    // countries available"); confirmed passing on dev via
    // create-customer.spec.ts's identical TC:4.
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
    await allure.tms('https://app.clickup.com/t/z941abt50x', 'TC:5 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Enter details matching an existing Customer', async () => {
      // TODO(CRM QA): point this at a customer known to exist in the seed
      // data for TEST_ENV=local, so the duplicate check actually triggers.
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
    await allure.tms('https://app.clickup.com/t/z941abt50y', 'TC:6 (ClickUp)');
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

    await test.step('Trigger the duplicate warning, then cancel to review', async () => {
      await createCustomerPage.save();
      await createCustomerPage.expectDuplicateWarningVisible();
      await createCustomerPage.cancelToReviewButton.click();
    });

    await test.step('Modal closes, form remains editable, nothing saved', async () => {
      await expect(createCustomerPage.duplicateWarningModal).toBeHidden();
      await expect(createCustomerPage.saveButton).toBeVisible();
    });
  });

  test('TC:7 Verify successful customer creation without existing contacts linked', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt510', 'TC:7 (ClickUp)');
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
      if (await createCustomerPage.duplicateWarningModal.isVisible()) {
        await createCustomerPage.saveAnywayButton.click();
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
    await allure.tms('https://app.clickup.com/t/z941abt512', 'TC:8 (ClickUp)');
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
      await createCustomerPage.createContactButton.click();
    });

    await test.step('Routed to Create Contact, pre-linked to the new Customer', async () => {
      await expect(page).toHaveURL(/contact/i);
    });
  });

  test('TC:9 Verify post-save Contact creation prompt - "Cancel" path', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt513', 'TC:9 (ClickUp)');
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
      await createCustomerPage.postSaveCancelButton.click();
    });

    await test.step('Redirected to the Customer Detail view or Customer List', async () => {
      await expect(createCustomerPage.postSaveModal).toBeHidden();
    });
  });

  test('TC:10 Verify linking existing contacts during Customer creation', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt516', 'TC:10 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Fill valid details and link an existing Contact', async () => {
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
      // TODO(CRM QA): point this at a Contact known to exist, unlinked, in
      // the seed data for TEST_ENV=local.
      await createCustomerPage.linkExistingContact('Existing Unlinked Contact');
      await createCustomerPage.save();
    });

    await test.step('Customer saved and the Contact now references it', async () => {
      await createCustomerPage.expectSavedSuccessfully();
    });
  });

  test('TC:11 Verify Cancel button functionality', async ({ createCustomerPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abt51q', 'TC:11 (ClickUp)');
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
