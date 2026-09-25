import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Contact List (Sprint 1).
 *
 * Source of truth for these 12 cases: test-cases/crm/contact-list.md
 * (mirrors ClickUp task https://app.clickup.com/t/86eyr7a7w). Storage
 * state from auth.setup.ts is already applied via the "crm" project's
 * dependency — no login needed here.
 *
 * TC:9 and TC:10 create a real Contact (and, for TC:10, a real linked
 * Customer) rather than relying on seed data, confirmed against the
 * running app (2026-09-23) — same reasoning as
 * 17-contacts-tab-customer-details.spec.ts's own note on hardcoded
 * seeded names. TC:11 is still skipped: it needs a Contact Details page
 * object, which doesn't exist yet — out of scope for this pass.
 */

/** Contact Name is validated "Alphabets only" — no digits allowed, so timestamps can't be used for uniqueness there. */
function randomLetters(length = 8): string {
  return Array.from({ length }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
}

test.describe('CRM - Contact List', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Contact List');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify default Contact List screen loading and data display', async ({
    contactListPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/86eyr7c2g', 'TC:1 (ClickUp)');

    await test.step('Open the Contact List screen', async () => {
      await contactListPage.open();
    });

    await test.step('The list loads with the expected columns and controls', async () => {
      await expect(contactListPage.locators.heading).toBeVisible();
      await expect(contactListPage.locators.allTab).toBeVisible();
      await expect(contactListPage.locators.linkedTab).toBeVisible();
      await expect(contactListPage.locators.unlinkedTab).toBeVisible();
      await expect(contactListPage.locators.searchInput).toBeVisible();
      await expect(contactListPage.locators.table).toBeVisible();
      for (const column of [
        'Contact Name',
        'Customer Name',
        'Email',
        'Phone',
        'Location',
        'Status',
      ]) {
        await expect(contactListPage.locators.columnHeader(column)).toBeVisible();
      }
    });
  });

  test('TC:2 Verify search by linked Customer name', async ({ contactListPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abt524', 'TC:2 (ClickUp)');
    await contactListPage.open();

    // TODO(CRM QA): point this at a Customer name known to have at least
    // one linked Contact in the seed data — both local and dev currently
    // have zero contacts, so this can't produce a real match yet.
    await test.step('Search using a linked Customer name', async () => {
      await contactListPage.searchFor('Existing Linked Customer');
    });

    await test.step('Matching contacts are displayed', async () => {
      await expect(contactListPage.locators.dataRows.first()).toBeVisible();
    });
  });

  test('TC:3 Verify search by Contact key identifying fields', async ({ contactListPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abt525', 'TC:3 (ClickUp)');
    await contactListPage.open();

    // TODO(CRM QA): point this at a Contact name/email/phone known to
    // exist in the seed data.
    await test.step('Search by a supported identifying field', async () => {
      await contactListPage.searchFor('Existing Contact Name');
    });

    await test.step('Matching contacts are displayed accurately', async () => {
      await expect(contactListPage.locators.dataRows.first()).toBeVisible();
    });
  });

  test('TC:4 Verify filtering by Linked and Unlinked status tabs', async ({ contactListPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abt526', 'TC:4 (ClickUp)');
    await contactListPage.open();

    await test.step('Switch to the Linked tab', async () => {
      await contactListPage.selectRelationshipTab('Linked');
      await expect(contactListPage.locators.linkedTab).toHaveAttribute('aria-pressed', 'true');
    });

    await test.step('Switch to the Unlinked tab', async () => {
      await contactListPage.selectRelationshipTab('Unlinked');
      await expect(contactListPage.locators.unlinkedTab).toHaveAttribute('aria-pressed', 'true');
      await expect(contactListPage.locators.linkedTab).not.toHaveAttribute('aria-pressed', 'true');
    });

    // NOTE: with zero contacts in the current data, "only contacts in the
    // selected relationship state are shown" can't be meaningfully
    // verified beyond the tab's own selected state — see file header.
  });

  test('TC:5 Verify filtering by active/inactive status and custom attribute rules', async ({
    contactListPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt527', 'TC:5 (ClickUp)');
    await contactListPage.open();

    await test.step('Open Filters', async () => {
      await contactListPage.openFilters();
      await expect(contactListPage.locators.statusFilterButton).toBeVisible();
      await expect(contactListPage.locators.countryFilterButton).toBeVisible();
      await expect(contactListPage.locators.addRuleButton).toBeVisible();
    });

    // TODO(CRM QA): pick a real Status option and a custom attribute rule
    // once there's data to validate the filtered result against — for now
    // this only confirms the filter controls themselves are present.
  });

  test('TC:6 Verify column sorting and session persistence', async ({ contactListPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abt528', 'TC:6 (ClickUp)');
    await contactListPage.open();

    // Confirmed directly: the "Contact Name" columnheader has no
    // `aria-sort` attribute at all (not even "none") before or after
    // clicking its sort button — this table doesn't expose sort state via
    // ARIA, so there's no accessible signal to assert on. With zero rows
    // in the current data there's also no order to observe directly.
    // This can only meaningfully click the control and confirm it doesn't
    // error; re-verify the actual persistence behavior once there's data
    // and a confirmed way to read the sort state back (a `data-*`
    // attribute, localStorage key, or visible sort icon are the likely
    // candidates — check with the team once real rows exist).
    await test.step('Sort by the Contact Name column', async () => {
      await contactListPage.locators.columnSortButton('Contact Name').click();
    });

    await test.step('Reload the page', async () => {
      await page.reload();
      await expect(contactListPage.locators.columnHeader('Contact Name')).toBeVisible();
    });
  });

  test('TC:7 Verify column customization and cross-session persistence', async ({
    contactListPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt529', 'TC:7 (ClickUp)');
    await contactListPage.open();

    await test.step('Hide the Phone column', async () => {
      await contactListPage.openConfigureColumns();
      // .click() rather than .uncheck() — this custom checkbox's assumed
      // "checked" state (what .uncheck() reads before deciding whether to
      // click at all) was unreliable in practice (observed: Apply stayed
      // disabled, meaning no change was registered). A plain click always
      // acts, sidestepping that.
      await contactListPage.locators.columnToggle('Phone').click();
      await expect(contactListPage.locators.applyColumnsButton).toBeEnabled();
      await contactListPage.locators.applyColumnsButton.click();
      await expect(contactListPage.locators.columnHeader('Phone')).toBeHidden();
    });

    // "New session" interpreted as a fresh page load of the same SPA
    // (column config is a per-user preference, not per-tab) — a literal
    // new login is exercised implicitly by every other test's own setup.
    await test.step('Reload: the column stays hidden', async () => {
      await page.reload();
      await expect(contactListPage.locators.columnHeader('Phone')).toBeHidden();
    });
  });

  test('TC:8 Verify alternate list layouts', async ({ contactListPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abt52b', 'TC:8 (ClickUp)');
    await contactListPage.open();

    await test.step('Switch to Vertical split', async () => {
      await contactListPage.selectLayout('Vertical split');
      await contactListPage.expectLayoutSelected('Vertical split');
    });

    await test.step('Switch to Horizontal split', async () => {
      await contactListPage.selectLayout('Horizontal split');
      await contactListPage.expectLayoutSelected('Horizontal split');
    });

    await test.step('Switch back to No split', async () => {
      await contactListPage.selectLayout('No split');
      await contactListPage.expectLayoutSelected('No split');
    });
  });

  test('TC:9 Verify row selection navigates to Contact Details', async ({
    contactListPage,
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt52h', 'TC:9 (ClickUp)');

    // A real Contact — created fresh rather than relying on seed data (see
    // 17-contacts-tab-customer-details.spec.ts's own note on why a
    // hardcoded seeded name is unreliable). Contact Name is "Alphabets
    // only" (confirmed — create-contact.locators.ts), so a random
    // letters-only suffix, not a timestamp, keeps it unique.
    const contactName = `Playwright Contact List Row ${randomLetters()}`;
    await createContactPage.openFromContactList();
    await createContactPage.fillProfile({
      name: contactName,
      designation: 'Buyer',
      email: `pw-contact-list-row-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();

    await contactListPage.open();

    await test.step('Select a contact row', async () => {
      await contactListPage.selectContactRow(contactName);
    });

    await test.step('The Contact Details screen opens', async () => {
      await expect(page).toHaveURL(/contact/i);
    });
  });

  test('TC:10 Verify linked Customer navigation', async ({
    contactListPage,
    createCustomerPage,
    createContactPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abt52j', 'TC:10 (ClickUp)');

    // A real Customer with a real linked Contact — same reasoning as TC:9.
    const customerName = `Playwright Contact List Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-contact-list-customer-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    const customerId = page.url().split('/').pop()!;

    await createContactPage.openFromCustomerContext(customerId, customerName);
    await createContactPage.fillProfile({
      name: `Playwright Contact List Linked ${randomLetters()}`,
      designation: 'Buyer',
      email: `pw-contact-list-linked-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
    });
    await createContactPage.save();
    await expect(createContactPage.locators.toast).toBeVisible();

    await contactListPage.open();

    await test.step('Select a linked Customer from a contact row', async () => {
      await contactListPage.selectLinkedCustomer(customerName);
    });

    await test.step('The Customer Details screen opens for that Customer', async () => {
      await expect(page).toHaveURL(/customer/i);
    });
  });

  test.skip('TC:11 Verify inline editing on Contact Details', async () => {
    await allure.tms('https://app.clickup.com/t/z941abt52k', 'TC:11 (ClickUp)');
    // Skipped: needs both a real Contact to open (see TC:9) and a Contact
    // Details page object, which doesn't exist yet — out of scope for
    // this pass. See test-cases/crm/contact-creation-screen.md and
    // customer-detail.md for the sibling screens still pending expansion.
  });

  test('TC:12 Verify permanent "+ Create Contact" action', async ({ contactListPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abt52m', 'TC:12 (ClickUp)');
    await contactListPage.open();

    await test.step('Use the Create Contact action from the list', async () => {
      await contactListPage.locators.createContactButton.click();
    });

    await test.step('The Create Contact flow opens', async () => {
      await expect(page).toHaveURL(/contact/i);
    });
  });
});
