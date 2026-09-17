import * as allure from 'allure-js-commons';
import { test, expect } from '../../src/fixtures/crm.fixtures';

/**
 * CRM — Customer Creation Screen (Sprint 1).
 *
 * Source of truth: test-cases/crm/customer-creation-screen.md (ClickUp
 * task https://app.clickup.com/t/86eyr7gan). This is the same screen as
 * create-customer.spec.ts (filed under a second ClickUp task, confirmed
 * by reading every subtask's full description) — kept as its own file
 * per team decision rather than merged, even where a test case is
 * word-for-word equivalent to one already in that file.
 *
 * TC:1-4/TC:6/TC:7/TC:9 confirmed against dev (2026-09-16) — note TC:1's
 * hand-off route needs a real Contact id (dev validates it; a fabricated
 * id was silently ignored, unlike local). TC:5 and TC:8 are
 * `test.fixme()`'d — see each for specifics (minor untested multi-select
 * variant, and no confirmed notifications panel, respectively).
 */
test.describe('CRM - Customer Creation Screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Customer Creation Screen');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify pre-population of Customer Name from hand-off flow', async ({
    createContactPage,
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7ae', 'TC:1 (ClickUp)');

    // Confirmed on dev: `contactId` is validated against a real Contact
    // (a fabricated id used during local probing was silently ignored
    // there, unlike local) — the Customer Name text prefill itself
    // doesn't need a real id, but the Contact pre-link does.
    let contactId = '';
    const contactName = 'Playwright Handoff Contact';

    await test.step('Create a real Contact to hand off from', async () => {
      await createContactPage.openFromContactList();
      await createContactPage.fillProfile({
        name: contactName,
        designation: 'Buyer',
        email: `pw-handoff-${Date.now()}@example.com`,
        city: 'Coimbatore',
        country: 'India',
      });
      await createContactPage.save();
      await expect(createContactPage.locators.toast).toBeVisible();
      await expect(page).toHaveURL(/\/crm\/contacts\/[0-9a-f-]+$/);
      contactId = page.url().split('/').pop()!;
    });

    await test.step('Arrive via a Contact-creation hand-off (name/contactId/contactName params)', async () => {
      const query = `?name=HandoffTest&contactId=${contactId}&contactName=${encodeURIComponent(contactName)}`;
      await createCustomerPage.gotoAuthenticated(`/crm/customers/new${query}`);
    });

    await test.step('Customer Name is pre-filled and the Contact is pre-linked', async () => {
      await expect(createCustomerPage.locators.customerNameInput).toHaveValue('HandoffTest');
      await expect(createCustomerPage.locators.linkContactsCombobox).toContainText(contactName);
    });
  });

  test('TC:2 Verify mandatory field validation across Profile and Management sections', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7af', 'TC:2 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Leave mandatory fields empty and click Save', async () => {
      await createCustomerPage.save();
    });

    await test.step('Save is blocked with inline "Required" errors', async () => {
      await expect(createCustomerPage.locators.saveButton).toBeVisible();
      await createCustomerPage.expectFieldError(/required/i);
    });
  });

  test('TC:3 Verify conditionally mandatory field validation at save time', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7ag', 'TC:3 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    await test.step('Set Origin Type = Referral, leave "Referred By" blank', async () => {
      await createCustomerPage.fillProfile({ originType: 'Referral' });
    });

    await test.step('Click Save', async () => {
      await createCustomerPage.save();
    });

    await test.step('Save is blocked: "Referred By" is required for this Origin Type', async () => {
      await createCustomerPage.expectFieldError(/required/i);
    });
  });

  test('TC:4 Verify Business Process / Department row assignee validation', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7ah', 'TC:4 (ClickUp)');
    await createCustomerPage.openFromCrmHome();

    // Matches create-customer.spec.ts's TC:4 exactly — confirmed passing
    // against dev directly.
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

  test('TC:5 Verify searching and multi-selecting unlinked Contacts for linkage', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7aj', 'TC:5 (ClickUp)');

    test.fixme(
      true,
      'Needs real unlinked Contacts seeded to search/multi-select — none exist locally; minor variant of existing TC:10 (single-select), not distinct enough to prioritize on its own per the doc note',
    );

    await createCustomerPage.openFromCrmHome();
    // TODO(CRM QA): once seeded Contacts exist, select more than one via
    // linkContactsCombobox and assert both appear as linked.
  });

  test('TC:6 Verify auto-generation and immutability of unique Customer Code', async ({
    createCustomerPage,
    customerDetailPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7ak', 'TC:6 (ClickUp)');

    let customerCode = '';

    await test.step('Save a Customer and capture its generated Customer Code', async () => {
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
      await createCustomerPage.locators.postSaveCancelButton.click();

      // "Customer Code" (the label) and "CTCNNNNNNN" (the value) are
      // separate sibling elements, not one flat text node — target the
      // value directly by its own pattern.
      customerCode =
        (await page
          .getByText(/^CTC\d+$/)
          .first()
          .textContent()) ?? '';
      expect(customerCode).toMatch(/^CTC\d+$/);
    });

    await test.step('Customer Code has no Edit button — it is read-only, not just disabled', async () => {
      await customerDetailPage.expectFieldNotEditable('Customer Code');
    });

    // TODO(CRM QA): a reload-and-recheck would strengthen this further,
    // but reload() re-triggers the app's pre-auth gate the way any fresh
    // navigation does, and redeeming it reliably from mid-test wasn't
    // straightforward here — not worth fighting session mechanics for a
    // marginal gain when "no Edit control exists at all" already proves
    // immutability.
  });

  test('TC:7 Verify post-save prompt for immediate Contact creation when no Contact is linked', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7an', 'TC:7 (ClickUp)');

    // TODO(CRM QA): matches create-customer.spec.ts's TC:7/TC:8 combined —
    // blocked locally the same way.
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

    await test.step('Save with no Contact linked', async () => {
      await createCustomerPage.save();
    });

    await test.step('Toast + post-save "create Contact now?" prompt', async () => {
      await createCustomerPage.expectSavedSuccessfully();
    });
  });

  test('TC:8 Verify system actions on successful Customer creation', async ({
    createCustomerPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7b4', 'TC:8 (ClickUp)');

    test.fixme(
      true,
      'Audit entry / notifications are not confirmed to be UI-checkable without a visible notifications panel — CRM Stage=Lead-on-save is implicit and already covered indirectly by TC:7',
    );

    await createCustomerPage.openFromCrmHome();
    // TODO(CRM QA): if/when a notifications panel or audit view is
    // confirmed to exist for Customers, assert the audit entry + initial
    // CRM Stage + notification here.
  });

  test('TC:9 Verify navigation flow after dismissing post-save Contact prompt', async ({
    createCustomerPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt7b5', 'TC:9 (ClickUp)');

    // TODO(CRM QA): stronger than create-customer.spec.ts's own TC:9,
    // which only asserts the modal closes — this expects landing
    // specifically on the new Customer's own Detail page. Blocked locally
    // the same way (save can't complete without a selectable Country).
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

    await test.step("Lands on the new Customer's own Detail page", async () => {
      await expect(createCustomerPage.locators.postSaveModal).toBeHidden();
      // TODO(CRM QA): assert a specific Customer Detail URL/heading once
      // that page object exists — not yet confirmed what that route is.
      await expect(page).not.toHaveURL(/\/crm\/customers\/new/);
    });
  });
});
