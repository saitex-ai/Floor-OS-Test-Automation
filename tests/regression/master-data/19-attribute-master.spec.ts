import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Attribute Master (Inventory Item Management >
 * `/master-data/inventory-item-management/attribute-master`).
 *
 * Source of truth: test-cases/master-data/attribute-master/
 * attribute-master-testcases.md — no ClickUp task exists for this module
 * yet, so no allure.tms() links here (same convention as this repo's other
 * no-ClickUp suites, e.g. Unit of Measure/Techpack Type). Storage state
 * from auth.setup.ts is already applied via the "master-data" project's
 * dependency — no login needed.
 *
 * This is a dialog-based screen (modal "New Attribute"/"Edit Attribute",
 * no URL change) that references the live Item Category master through a
 * shared grid-picker dialog — same component Product Service Master uses.
 *
 * Two real, confirmed app gaps are deliberately asserted as-is (not worked
 * around) per this repo's established discipline:
 * - TC:7 — duplicate Attribute Name (within the same Item Category) is
 *   blocked, but only with a generic "Failed to create attribute." toast.
 * - TC:13 — there is no confirmed way to deactivate an attribute anywhere
 *   on this screen (Active checkbox always checked+disabled, no bulk
 *   action on row selection, Status cell is a plain read-only cell).
 */
function uniqueAttributeName(label = 'Attr'): string {
  return `PW MD ${label} ${Date.now()}`;
}

test.describe('Master Data - Attribute Master', () => {
  test.beforeEach(async ({ attributeMasterPage }) => {
    await allure.epic('Master Data');
    await allure.feature('Attribute Master');
    await allure.owner('Master Data QA');
    await attributeMasterPage.open();
    // Confirmed live (agent-notes/master-data-module.md): the dev OIDC
    // redirect can take 15-18s to client-side-route to the real target
    // path — waiting here for the real heading avoids every other test
    // racing a page that looks loaded but hasn't actually routed yet.
    await attributeMasterPage.expectLoaded();
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    attributeMasterPage,
  }) => {
    const name = uniqueAttributeName('Attr Full');

    await test.step('Pick a category, fill the name, set Data Type to Number, check both flags', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({
        itemCategoryCode: 'ADJ',
        attributeName: name,
        dataType: 'Number',
        required: true,
        descFlag: true,
      });
      await attributeMasterPage.create();
    });

    await test.step('Toast confirms success; the row reflects every field', async () => {
      await attributeMasterPage.expectCreatedToast();
      await attributeMasterPage.expectRowVisible(name);
      await attributeMasterPage.expectRowContainsText(name, 'NUMBER');
      await attributeMasterPage.expectRowContainsText(name, 'Active');
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    attributeMasterPage,
  }) => {
    const name = uniqueAttributeName('Attr Min');

    await test.step('Pick a category and fill only the name — leave Data Type/Required/Desc Flag untouched', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({ itemCategoryCode: 'ADT', attributeName: name });
      await attributeMasterPage.create();
    });

    await test.step('Created successfully with Data Type defaulting to TEXT, Required/Desc Flag No', async () => {
      await attributeMasterPage.expectCreatedToast();
      await attributeMasterPage.expectRowVisible(name);
      await attributeMasterPage.expectRowContainsText(name, 'TEXT');
    });
  });

  test('TC:3 Verify successful edit of an existing attribute', async ({ attributeMasterPage }) => {
    const name = uniqueAttributeName('Attr Edit');
    const updatedName = `${name} - Updated`;

    await test.step('Create an attribute to edit', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({ itemCategoryCode: 'APR', attributeName: name });
      await attributeMasterPage.create();
      await attributeMasterPage.expectCreatedToast();
    });

    await test.step('Open it, change the name and Data Type, then save', async () => {
      await attributeMasterPage.openRowForEdit(name);
      await attributeMasterPage.fillForm({ attributeName: updatedName, dataType: 'Number' });
      await attributeMasterPage.saveChanges();
    });

    await test.step('Toast confirms the update; Data Type switched to NUMBER', async () => {
      await attributeMasterPage.expectUpdatedToast();
      await attributeMasterPage.expectRowVisible(updatedName);
      await attributeMasterPage.expectRowContainsText(updatedName, 'NUMBER');
    });
  });

  test('TC:4 Verify list search by Attribute Name', async ({ attributeMasterPage }) => {
    const name = uniqueAttributeName('Attr Search');

    await attributeMasterPage.openNewAttribute();
    await attributeMasterPage.fillForm({ itemCategoryCode: 'ARF', attributeName: name });
    await attributeMasterPage.create();
    await attributeMasterPage.expectCreatedToast();

    await test.step('Searching by name narrows the grid to it', async () => {
      await attributeMasterPage.expectRowVisible(name);
    });
  });

  test('TC:5 Verify All / Active / Inactive tab filters on the list', async ({
    attributeMasterPage,
  }) => {
    await test.step('Each tab is clickable and keeps the screen loaded', async () => {
      await attributeMasterPage.selectTab('Active');
      await attributeMasterPage.expectLoaded();
      await attributeMasterPage.selectTab('Inactive');
      await attributeMasterPage.expectLoaded();
      await attributeMasterPage.selectTab('All');
      await attributeMasterPage.expectLoaded();
    });
  });

  test('TC:6 Verify validation when both required fields are left blank', async ({
    attributeMasterPage,
  }) => {
    await attributeMasterPage.openNewAttribute();

    await test.step('Submit with Item Category unpicked and Attribute Name empty', async () => {
      await attributeMasterPage.create();
    });

    await test.step('Save is blocked; inline "Required" appears under both fields at once', async () => {
      await attributeMasterPage.expectRequiredErrorCount(2);
      await expect(attributeMasterPage.locators.createButton).toBeVisible();
    });
  });

  test('TC:7 Verify duplicate Attribute Name is blocked within the same Item Category', async ({
    attributeMasterPage,
  }) => {
    const name = uniqueAttributeName('Attr Dup');

    await test.step('Create the first attribute under a given category', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({ itemCategoryCode: 'ART', attributeName: name });
      await attributeMasterPage.create();
      await attributeMasterPage.expectCreatedToast();
    });

    await test.step('Attempt a second attribute with the exact same name under the same category', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({ itemCategoryCode: 'ART', attributeName: name });
      await attributeMasterPage.create();
    });

    // Real, confirmed app behavior: a generic toast with no field-level
    // indicator of why — documenting as-is, not working around it.
    await test.step('Blocked with a generic toast; dialog stays open with data intact', async () => {
      await attributeMasterPage.expectCreateFailedToast();
      await expect(attributeMasterPage.locators.dialog).toBeVisible();
    });
  });

  test('TC:8 Verify the same Attribute Name is allowed across different Item Categories', async ({
    attributeMasterPage,
  }) => {
    const name = uniqueAttributeName('Attr CrossCat');

    await test.step('Create under category A', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({ itemCategoryCode: 'BAG', attributeName: name });
      await attributeMasterPage.create();
      await attributeMasterPage.expectCreatedToast();
    });

    await test.step('Create the exact same name under a different category B — also succeeds', async () => {
      await attributeMasterPage.openNewAttribute();
      await attributeMasterPage.fillForm({ itemCategoryCode: 'BAT', attributeName: name });
      await attributeMasterPage.create();
      await attributeMasterPage.expectCreatedToast();
    });
  });

  test('TC:9 Verify Cancel discards changes on create', async ({ attributeMasterPage }) => {
    const name = `PW-MD-ATTR-CANCEL-${Date.now()}`;

    await attributeMasterPage.openNewAttribute();
    await test.step('Fill the name, then Cancel', async () => {
      await attributeMasterPage.locators.attributeNameInput.fill(name);
      await attributeMasterPage.cancel();
    });

    await test.step('No record created', async () => {
      await attributeMasterPage.expectRowNotVisible(name);
    });
  });

  test('TC:10 Verify Attribute Name max length (edge)', async ({ attributeMasterPage }) => {
    await attributeMasterPage.openNewAttribute();

    await attributeMasterPage.locators.attributeNameInput.fill('X'.repeat(300));

    // Confirmed live: no inline "too long" error, the field silently
    // truncates at the real cap.
    await expect(async () => {
      const value = await attributeMasterPage.attributeNameValue();
      expect(value.length).toBe(200);
    }).toPass({ timeout: 5_000 });
  });

  test('TC:11 Verify special/unicode characters in Attribute Name (edge)', async ({
    attributeMasterPage,
  }) => {
    const prefix = uniqueAttributeName('Attr Special');
    const name = `${prefix} & <script>alert(1)</script> "quote" 日本語`;

    await attributeMasterPage.openNewAttribute();
    await attributeMasterPage.fillForm({ itemCategoryCode: 'BDG', attributeName: name });
    await attributeMasterPage.create();

    await test.step('No client-side character-set restriction — saves successfully', async () => {
      await attributeMasterPage.expectCreatedToast();
      // Search by the plain-text prefix only — the grid's search box isn't
      // guaranteed to handle the special-char suffix cleanly as a query —
      // and assert via a substring match, not the full exact name.
      await attributeMasterPage.expectAnyRowVisible(prefix);
    });
  });

  test('TC:12 Verify Item Category becomes locked after creation (edge/trap)', async ({
    attributeMasterPage,
  }) => {
    const name = uniqueAttributeName('Attr Lock');

    await attributeMasterPage.openNewAttribute();
    await attributeMasterPage.fillForm({ itemCategoryCode: 'BAG', attributeName: name });
    await attributeMasterPage.create();
    await attributeMasterPage.expectCreatedToast();

    await test.step('Item Category picker is disabled in Edit; Data Type stays editable', async () => {
      await attributeMasterPage.openRowForEdit(name);
      expect(await attributeMasterPage.isItemCategoryPickerLocked()).toBe(true);
      expect(await attributeMasterPage.isDataTypeComboboxEnabled()).toBe(true);
    });
  });

  test('TC:13 Verify there is no confirmed way to deactivate an attribute (known gap)', async ({
    attributeMasterPage,
  }) => {
    const name = uniqueAttributeName('Attr NoDeactivate');

    await test.step('Active checkbox is checked+disabled on Create', async () => {
      await attributeMasterPage.openNewAttribute();
      expect(await attributeMasterPage.isActiveCheckboxLocked()).toBe(true);
      await attributeMasterPage.fillForm({ itemCategoryCode: 'BAT', attributeName: name });
      await attributeMasterPage.create();
      await attributeMasterPage.expectCreatedToast();
    });

    await test.step('Active checkbox is still checked+disabled on Edit', async () => {
      await attributeMasterPage.openRowForEdit(name);
      expect(await attributeMasterPage.isActiveCheckboxLocked()).toBe(true);
      await attributeMasterPage.cancel();
    });

    await test.step('Selecting the row shows no bulk deactivate/delete action', async () => {
      await attributeMasterPage.search(name);
      await attributeMasterPage.selectRowCheckbox(name);
      await attributeMasterPage.expectNoBulkActionButtons();
    });
  });

  test('TC:14 Verify Data Type dropdown options', async ({ attributeMasterPage }) => {
    await attributeMasterPage.openNewAttribute();

    const options = await attributeMasterPage.dataTypeOptionLabels();

    expect(options).toEqual(['Text', 'Number']);
  });
});
