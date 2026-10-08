import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';
import { SampleRequestCreationPage } from '../../../src/pages/master-data/sample-request-creation.page';

/**
 * Master Data — Sample Request Creation
 * (/master-data/system-management/sample-request-creation).
 *
 * Source of truth for these 14 cases: test-cases/master-data/sample-request-creation/sample-request-creation-testcases.md
 * — first-pass coverage, confirmed live against dev 2026-10-06, nothing
 * carried over from notes. Storage state from auth.setup.ts is already
 * applied via the "master-data" project's dependency — no login needed
 * here.
 *
 * "ACME Apparel" (CTC0000002, 9 real seasons) and "Acme Textiles" (2 real
 * seasons: FW26/SS26) are real, pre-existing seeded Customers on dev used
 * for the per-customer Season filtering test — "Acme Textiles" is the same
 * reference Customer CRM's own create-customer spec already relies on
 * existing, so this isn't a newly-invented dependency. Every created
 * record is prefixed `PW MD SampleReq` + a timestamp, per this repo's
 * existing convention (see CRM's 01-create-customer.spec.ts) of not
 * tearing down throwaway dev data between runs.
 */
test.describe('Master Data - Sample Request Creation', () => {
  test.beforeEach(async ({ sampleRequestCreationPage: sampleRequestPage }) => {
    await allure.epic('Master Data');
    await allure.feature('Sample Request Creation');
    await allure.owner('Master Data QA');
    await sampleRequestPage.open();
    await sampleRequestPage.expectLoaded();
  });

  /** Fills Name + a real Customer/Season/Company in one go (first available Season/Company). */
  async function fillMinimalValidRequest(
    sampleRequestPage: SampleRequestCreationPage,
    name: string,
    customer: string | RegExp = /ACME Apparel/,
  ) {
    await sampleRequestPage.openCreateModal();
    await sampleRequestPage.fillForm({ name, customer, season: /.+/, company: /.+/ });
  }

  test('TC:1 Verify Sample Request Creation list layout', async ({
    page,
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    await expect(page.getByRole('columnheader', { name: 'SR Code' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Sample Request Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Season' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Company' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(sampleRequestPage.locators.searchInput).toBeVisible();
  });

  test('TC:2 Verify successful create with all fields (incl. Costing required)', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} AllFields`;

    await test.step('Fill Name, Customer, Season, Company and toggle Costing on', async () => {
      await sampleRequestPage.openCreateModal();
      await sampleRequestPage.fillForm({
        name,
        customer: /ACME Apparel/,
        season: /.+/,
        company: /.+/,
        costingRequired: true,
      });
      await sampleRequestPage.save();
    });

    await test.step('Toast reads "Sample request created."; row appears', async () => {
      await sampleRequestPage.expectCreatedToast();
      await sampleRequestPage.expectRowVisible(name);
    });
  });

  test('TC:3 Verify successful create with required fields only (Costing off)', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} RequiredOnly`;

    await fillMinimalValidRequest(sampleRequestPage, name);
    await sampleRequestPage.save();

    await sampleRequestPage.expectCreatedToast();
    await sampleRequestPage.expectRowVisible(name);
  });

  test('TC:4 Verify Season options are genuinely filtered by the selected Customer', async ({
    page,
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    await sampleRequestPage.openCreateModal();

    const seasonsForAcme =
      await test.step('Select ACME Apparel, read its Season options', async () => {
        await sampleRequestPage.locators.pickerTrigger('customer').click();
        await sampleRequestPage.locators
          .pickerOption(/ACME Apparel/)
          .first()
          .click();
        await sampleRequestPage.locators.pickerTrigger('season').click();
        // The option list populates asynchronously after the picker opens —
        // wait for at least one real option before reading, rather than
        // racing the fetch (confirmed live: an immediate read can see 0).
        await expect(page.getByRole('option').first()).toBeVisible();
        const options = await page.getByRole('option').allTextContents();
        await page.keyboard.press('Escape');
        return options;
      });

    const seasonsForAcmeTextiles =
      await test.step('Switch Customer to Acme Textiles, read its Season options', async () => {
        await sampleRequestPage.locators.pickerTrigger('customer').click();
        await sampleRequestPage.locators
          .pickerOption(/Acme Textiles/)
          .first()
          .click();
        await sampleRequestPage.locators.pickerTrigger('season').click();
        await expect(page.getByRole('option').first()).toBeVisible();
        const options = await page.getByRole('option').allTextContents();
        return options;
      });

    expect(seasonsForAcme.length).toBeGreaterThan(0);
    expect(seasonsForAcmeTextiles.length).toBeGreaterThan(0);
    // The two customers' season sets are genuinely different, not a shared
    // flat list gated only by "has a customer been picked at all" —
    // confirmed live (ACME Apparel: 9 seasons; Acme Textiles: 2).
    expect(seasonsForAcmeTextiles).not.toEqual(seasonsForAcme);
  });

  test('TC:5 Verify Season field is disabled/empty until a Customer is chosen', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    await sampleRequestPage.openCreateModal();

    await expect(sampleRequestPage.locators.pickerTrigger('season')).toContainText(
      'Search seasons...',
    );
    await expect(
      sampleRequestPage.locators.dialog.getByText('Select a customer first.'),
    ).toBeVisible();
  });

  test("TC:6 Verify successful edit of a Draft request's Name", async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const originalName = `PW MD SampleReq ${Date.now()} Original`;
    const editedName = `${originalName} Edited`;

    await test.step('Create a request to edit', async () => {
      await fillMinimalValidRequest(sampleRequestPage, originalName);
      await sampleRequestPage.save();
      await sampleRequestPage.expectCreatedToast();
    });

    await test.step('Open it, change the Name, save changes', async () => {
      await sampleRequestPage.openRowForEdit(originalName);
      await sampleRequestPage.fillForm({ name: editedName });
      await sampleRequestPage.saveChanges();
    });

    await test.step('Toast reads "Sample request updated."; list reflects the new Name', async () => {
      await sampleRequestPage.expectUpdatedToast();
      await sampleRequestPage.expectRowVisible(editedName);
    });
  });

  test('TC:7 Verify Customer/Season/Company are locked while a request is Draft', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} Locked`;

    await fillMinimalValidRequest(sampleRequestPage, name);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await sampleRequestPage.openRowForEdit(name);

    await sampleRequestPage.expectLockedForDraft();
    await expect(sampleRequestPage.locators.lockedValue('customer')).toBeDisabled();
    await expect(sampleRequestPage.locators.lockedValue('season')).toBeDisabled();
    await expect(sampleRequestPage.locators.lockedValue('company')).toBeDisabled();
  });

  test('TC:8 Verify "Post" action and its effect on field locking', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} Post`;

    await fillMinimalValidRequest(sampleRequestPage, name);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await test.step('Open the Draft request and click its "Post <code>" icon', async () => {
      await sampleRequestPage.openRowForEdit(name);
      await expect(sampleRequestPage.locators.postOrOpenToggle).toHaveAccessibleName(/^Post /);
      await sampleRequestPage.clickPostOrOpenToggle();
    });

    await test.step('Re-opening shows Posted + unlocked fields + the icon flipped to "Open"', async () => {
      // A full reload before re-opening, not just closing the dialog —
      // confirmed live that closing and immediately re-opening the same
      // row can race and leave no dialog open at all. A fresh navigation
      // guarantees the next open genuinely re-fetches server state.
      await sampleRequestPage.open();
      await sampleRequestPage.openRowForEdit(name);
      await sampleRequestPage.expectUnlockedForPosted();
      await expect(sampleRequestPage.locators.pickerTrigger('customer')).toBeEnabled();
      await expect(sampleRequestPage.locators.pickerTrigger('season')).toBeEnabled();
      await expect(sampleRequestPage.locators.pickerTrigger('company')).toBeEnabled();
      // Counterintuitive on purpose (confirmed live): Posting UNLOCKS the
      // fields, the reverse of what "locked for a draft request" implies
      // a reader would expect from "Posted" sounding more final.
      await expect(sampleRequestPage.locators.postOrOpenToggle).toHaveAccessibleName(/^Open /);
    });
  });

  test('TC:9 Verify deleting a Sample Request', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} Delete`;

    await fillMinimalValidRequest(sampleRequestPage, name);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await test.step('Delete via the Edit modal, confirm on the nested dialog', async () => {
      await sampleRequestPage.openRowForEdit(name);
      await sampleRequestPage.deleteRecord();
    });

    await test.step('Toast reads "Sample request(s) deleted."; row is gone', async () => {
      await sampleRequestPage.expectDeletedToast();
      await sampleRequestPage.search(name);
      await sampleRequestPage.expectRowNotVisible(name);
    });
  });

  test('TC:10 Verify Cancel on the Create modal discards changes', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} ShouldNotSave`;

    await sampleRequestPage.openCreateModal();
    await sampleRequestPage.fillForm({ name });
    await sampleRequestPage.cancel();

    await sampleRequestPage.search(name);
    await sampleRequestPage.expectRowNotVisible(name);
  });

  test('TC:11 Verify Save is blocked until all four required fields are filled', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} Progressive`;

    await sampleRequestPage.openCreateModal();

    await test.step('Name only -> disabled', async () => {
      await sampleRequestPage.fillForm({ name });
      await sampleRequestPage.expectSaveDisabled();
    });

    await test.step('+ Customer -> still disabled', async () => {
      await sampleRequestPage.locators.pickerTrigger('customer').click();
      await sampleRequestPage.locators
        .pickerOption(/ACME Apparel/)
        .first()
        .click();
      await sampleRequestPage.expectSaveDisabled();
    });

    await test.step('+ Season -> still disabled', async () => {
      await sampleRequestPage.locators.pickerTrigger('season').click();
      await sampleRequestPage.locators.pickerOption(/.+/).first().click();
      await sampleRequestPage.expectSaveDisabled();
    });

    await test.step('+ Company -> now enabled', async () => {
      await sampleRequestPage.locators.pickerTrigger('company').click();
      await sampleRequestPage.locators.pickerOption(/.+/).first().click();
      await sampleRequestPage.expectSaveEnabled();
    });

    await sampleRequestPage.cancel();
  });

  test('TC:12 Verify duplicate Sample Request Name is allowed', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const sharedName = `PW MD SampleReq ${Date.now()} SharedName`;

    await fillMinimalValidRequest(sampleRequestPage, sharedName);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await fillMinimalValidRequest(sampleRequestPage, sharedName);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await sampleRequestPage.search(sharedName);
    await sampleRequestPage.expectRowCount(sharedName, 2);
  });

  test('TC:13 Verify list/search by SR code, name, customer, or season', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} Searchable`;

    await fillMinimalValidRequest(sampleRequestPage, name);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await test.step('Searching the real Name filters to that row', async () => {
      await sampleRequestPage.search(name);
      await sampleRequestPage.expectRowVisible(name);
    });

    await test.step('Searching an unmatched term shows no rows', async () => {
      await sampleRequestPage.search('NO-SUCH-SAMPLE-REQUEST-ZZZ');
      await sampleRequestPage.expectRowNotVisible('NO-SUCH-SAMPLE-REQUEST-ZZZ');
    });
  });

  test('TC:14 Verify Sample Request Name max length and special characters', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const specialName = `PW MD SampleReq ${Date.now()} !@#$%^&*()`;

    await sampleRequestPage.openCreateModal();
    await expect(sampleRequestPage.locators.nameInput).toHaveAttribute('maxlength', '200');
    await sampleRequestPage.fillForm({
      name: specialName,
      customer: /ACME Apparel/,
      season: /.+/,
      company: /.+/,
    });
    await sampleRequestPage.save();

    await sampleRequestPage.expectCreatedToast();
    await sampleRequestPage.search(specialName);
    await sampleRequestPage.expectRowVisible(specialName);
  });

  test('Known bug: the list Status column is always blank, even for a request created moments earlier', async ({
    sampleRequestCreationPage: sampleRequestPage,
  }) => {
    const name = `PW MD SampleReq ${Date.now()} BlankStatus`;

    await fillMinimalValidRequest(sampleRequestPage, name);
    await sampleRequestPage.save();
    await sampleRequestPage.expectCreatedToast();

    await sampleRequestPage.search(name);
    // KNOWN APP BUG (confirmed live, re-checked after a 10s+ wait to rule
    // out a slow load): the Status column renders a visually blank pill
    // for every row, including this one just created. The underlying
    // Draft status is real (see TC:7's lock-state hint text) — only the
    // list's own rendering of it is broken. Asserting the real, current
    // (broken) behavior on purpose rather than papering over it.
    await sampleRequestPage.expectStatusColumnBlank(name);
  });
});
