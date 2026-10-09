import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Attribute Value Master (Inventory Item Management >
 * `/master-data/inventory-item-management/attribute-values`).
 *
 * Source of truth: test-cases/master-data/attribute-value-master/
 * attribute-value-master-testcases.md — no ClickUp task exists for this
 * module yet, so no allure.tms() links here. Storage state from
 * auth.setup.ts is already applied via the "master-data" project's
 * dependency — no login needed.
 *
 * The richest of the three Inventory Item Management screens: a genuine
 * Draft/Approved/Rejected/Inactive approval workflow, a real permanent
 * Delete action, and a working inline "Change record status" deactivate
 * control — unlike its two sibling screens (Attribute Master, Product
 * Service Master), which have neither. Throwaway records created here are
 * cleaned up via the real Delete flow within each test, same discipline
 * used during this module's own live exploration.
 *
 * Real, confirmed app behaviors deliberately asserted as-is (not worked
 * around), per this repo's established discipline:
 * - TC:3 — the edit-save toast ("Attribute value updated") carries no
 *   trailing period, while the create toast dynamically embeds the new
 *   code and DOES carry one ("Attribute value <CODE> created.").
 * - TC:11 — duplicate User Attribute Value Code (same parent Attribute) is
 *   blocked with a generic "Could not create the value" toast.
 * - TC:12 — User Attribute Value Code is silently force-uppercased and
 *   capped at 20 characters.
 */
function uniqueCode(label: string): string {
  return `TCAV${label}${String(Date.now()).slice(-6)}`;
}

// A real, stable parent Attribute confirmed live to exist in every
// environment this suite runs against: "Composition" under the "FAB" item
// category (IAM0000005), seeded data from the app's own demo fixtures.
const PARENT_ATTRIBUTE_ID = 'IAM0000005';

test.describe('Master Data - Attribute Value Master', () => {
  test.beforeEach(async ({ attributeValueMasterPage }) => {
    await allure.epic('Master Data');
    await allure.feature('Attribute Value Master');
    await allure.owner('Master Data QA');
    await attributeValueMasterPage.open();
    await attributeValueMasterPage.expectLoaded();
  });

  test('TC:1 Verify successful creation with all fields filled', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Full');

    await test.step('Pick a parent attribute, fill code + description, create', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
        description: `${code} description`,
      });
      await attributeValueMasterPage.create();
    });

    await test.step('Dynamic toast confirms success; row shows Approved (see Notes)', async () => {
      await attributeValueMasterPage.expectCreatedToast(code);
      await attributeValueMasterPage.expectRowVisible(code);
      await attributeValueMasterPage.expectRowStatus(code, 'Approved');
    });

    await test.step('Clean up the throwaway record', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:2 Verify successful creation with only required fields', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Min');

    await test.step('Pick a parent attribute and fill only the code — leave Description blank', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
      });
      await attributeValueMasterPage.create();
    });

    await test.step('Created successfully — Description is genuinely optional', async () => {
      await attributeValueMasterPage.expectCreatedToast(code);
      await attributeValueMasterPage.expectRowVisible(code);
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:3 Verify successful edit of an existing value', async ({ attributeValueMasterPage }) => {
    const code = uniqueCode('Edit');

    await test.step('Create a value to edit', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
      });
      await attributeValueMasterPage.create();
      await attributeValueMasterPage.expectCreatedToast(code);
    });

    await test.step('Change its Description and save', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.fillForm({ description: `${code} edited description` });
      await attributeValueMasterPage.saveChanges();
    });

    // Real, confirmed behavior: no trailing period here, unlike the create
    // toast above — documenting as-is.
    await test.step('Toast reads "Attribute value updated" (no trailing period)', async () => {
      await attributeValueMasterPage.expectUpdatedToast();
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:4 Verify list search by code, description and attribute name', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Search');

    await attributeValueMasterPage.openAddValue();
    await attributeValueMasterPage.fillForm({
      parentAttributeId: PARENT_ATTRIBUTE_ID,
      userAttributeValueCode: code,
      description: `${code} description`,
    });
    await attributeValueMasterPage.create();
    await attributeValueMasterPage.expectCreatedToast(code);

    await test.step('Search by code', async () => {
      await attributeValueMasterPage.expectRowVisible(code);
    });

    await test.step('Search by description', async () => {
      await attributeValueMasterPage.expectRowVisible(`${code} description`);
    });

    await test.step('Search by parent attribute name', async () => {
      // "Composition" matches 50+ pre-existing seeded rows, not just ours —
      // confirm our specific record is among the results, not that
      // "Composition" uniquely resolves to one row (it doesn't).
      await attributeValueMasterPage.expectRowVisibleAfterSearch('Composition', code);
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.search(code);
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:5 Verify All / Draft / Approved / Inactive / Rejected tab filters', async ({
    attributeValueMasterPage,
  }) => {
    await test.step('Each tab is clickable and keeps the screen loaded', async () => {
      for (const tabName of ['Draft', 'Approved', 'Inactive', 'Rejected', 'All'] as const) {
        await attributeValueMasterPage.selectTab(tabName);
        await attributeValueMasterPage.expectLoaded();
      }
    });
  });

  test('TC:6 Verify the "Masters needing review" panel surfaces Draft items', async ({
    attributeValueMasterPage,
  }) => {
    await test.step('The review region is visible with at least one Draft item', async () => {
      await attributeValueMasterPage.expectReviewRegionVisible();
    });

    // Asserted against whichever Draft item happens to be seeded/present —
    // not a specific hardcoded record, since Draft content can legitimately
    // change between runs. If this ever fails with zero Draft items
    // present, that's a real change in seed data worth re-confirming live,
    // not a locator bug.
    await test.step('The first listed item shows all three inline quick actions', async () => {
      const firstItem = attributeValueMasterPage.locators.reviewRegion
        .getByRole('listitem')
        .first();
      await expect(firstItem).toBeVisible();
      await expect(firstItem.getByRole('button', { name: 'Review' })).toBeVisible();
      await expect(firstItem.getByRole('button', { name: 'Reject' })).toBeVisible();
      await expect(firstItem.getByRole('button', { name: 'Make active' })).toBeVisible();
    });
  });

  test('TC:7 Verify "Review" on a Draft item opens Edit with extra approval actions', async ({
    attributeValueMasterPage,
  }) => {
    const firstItem = attributeValueMasterPage.locators.reviewRegion.getByRole('listitem').first();

    await test.step('Open Review on the first Draft item in the panel', async () => {
      await expect(firstItem).toBeVisible();
      await firstItem.getByRole('button', { name: 'Review' }).click();
      await expect(attributeValueMasterPage.locators.dialog).toBeVisible();
    });

    await test.step('The Edit dialog shows Reject and Approve & make active, plus the normal actions', async () => {
      await expect(attributeValueMasterPage.locators.rejectButton).toBeVisible();
      await expect(attributeValueMasterPage.locators.approveAndMakeActiveButton).toBeVisible();
      await expect(attributeValueMasterPage.locators.saveChangesButton).toBeVisible();
      await expect(attributeValueMasterPage.locators.deleteButton).toBeVisible();
    });

    await test.step('Cancel closes without changing anything', async () => {
      await attributeValueMasterPage.cancel();
      await expect(attributeValueMasterPage.locators.dialog).toBeHidden();
    });
  });

  test('TC:8 Verify the inline "Change record status" control can deactivate a value', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Status');

    await test.step('Create an Approved value', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
      });
      await attributeValueMasterPage.create();
      await attributeValueMasterPage.expectCreatedToast(code);
      await attributeValueMasterPage.expectRowStatus(code, 'Approved');
    });

    await test.step('Change its status to Inactive via the Status button + confirm dialog', async () => {
      await attributeValueMasterPage.search(code);
      await attributeValueMasterPage.changeRowStatusToInactive(code);
      await attributeValueMasterPage.expectStatusUpdatedToast();
      await attributeValueMasterPage.expectRowStatus(code, 'Inactive');
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:9 Verify permanent Delete and its confirmation', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Delete');

    await test.step('Create a throwaway value', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
      });
      await attributeValueMasterPage.create();
      await attributeValueMasterPage.expectCreatedToast(code);
    });

    await test.step('Delete it, confirming the "cannot be undone" dialog', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.locators.deleteButton.click();
      await expect(attributeValueMasterPage.locators.deleteConfirmDialog).toBeVisible();
      await expect(attributeValueMasterPage.locators.deleteConfirmDialog).toContainText(
        /cannot be undone/i,
      );
      await attributeValueMasterPage.locators.deleteConfirmButton.click();
    });

    await test.step('Toast confirms deletion; the record is fully gone, not merely Inactive', async () => {
      await attributeValueMasterPage.expectDeletedToast();
      await attributeValueMasterPage.expectRowNotVisible(code);
    });
  });

  test('TC:10 Verify validation when both required fields are left blank', async ({
    attributeValueMasterPage,
  }) => {
    await attributeValueMasterPage.openAddValue();

    await test.step('Submit with Attribute Code unpicked and User Attribute Value Code empty', async () => {
      await attributeValueMasterPage.create();
    });

    await test.step('Save is blocked; inline "Required" appears under both fields at once', async () => {
      await attributeValueMasterPage.expectRequiredErrorCount(2);
      await expect(attributeValueMasterPage.locators.createButton).toBeVisible();
    });
  });

  test('TC:11 Verify duplicate User Attribute Value Code under the same parent Attribute is blocked', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Dup');

    await test.step('Create the first value under a given parent attribute', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
      });
      await attributeValueMasterPage.create();
      await attributeValueMasterPage.expectCreatedToast(code);
    });

    await test.step('Attempt a second value with the exact same code under the same parent attribute', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.fillForm({
        parentAttributeId: PARENT_ATTRIBUTE_ID,
        userAttributeValueCode: code,
      });
      await attributeValueMasterPage.create();
    });

    await test.step('Blocked with a generic toast; dialog stays open with data intact', async () => {
      await attributeValueMasterPage.expectCreateFailedToast();
      await expect(attributeValueMasterPage.locators.dialog).toBeVisible();
      await attributeValueMasterPage.cancel();
    });

    await test.step('Clean up the first value', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:12 Verify User Attribute Value Code is capped at 20 characters client-side and force-uppercased on save (edge)', async ({
    attributeValueMasterPage,
  }) => {
    await test.step('Typing 200 lowercase characters is capped at 20 — confirmed instantly, before any save', async () => {
      await attributeValueMasterPage.openAddValue();
      await attributeValueMasterPage.pickParentAttribute(PARENT_ATTRIBUTE_ID);
      await attributeValueMasterPage.locators.userAttributeValueCodeInput.fill('y'.repeat(200));

      await expect(async () => {
        const value = await attributeValueMasterPage.userAttributeValueCodeValue();
        expect(value.length).toBe(20);
      }).toPass({ timeout: 5_000 });

      // The raw field itself does NOT uppercase on type — confirmed live
      // this transform only happens server-side at save time (see the
      // next step). Asserting that distinction explicitly rather than
      // conflating the two: the original exploration's "uppercased" finding
      // came from reading the post-save toast, not the live input value.
      const typedValue = await attributeValueMasterPage.userAttributeValueCodeValue();
      expect(typedValue).toBe(typedValue.toLowerCase());
    });

    const lowercaseCode = `tcavcase${String(Date.now()).slice(-6)}`;
    await test.step('Save with a real lowercase code, then confirm the persisted value is upper-cased', async () => {
      await attributeValueMasterPage.locators.userAttributeValueCodeInput.fill(lowercaseCode);
      await attributeValueMasterPage.create();
      await attributeValueMasterPage.expectCreatedToast(lowercaseCode); // case-insensitive match
      await attributeValueMasterPage.expectRowVisible(lowercaseCode.toUpperCase());
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.openRowForEdit(lowercaseCode.toUpperCase());
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:13 Verify special/unicode characters in Description (edge)', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Special');
    const description = `${code} & <script>alert(1)</script> "quote" 日本語`;

    await attributeValueMasterPage.openAddValue();
    await attributeValueMasterPage.fillForm({
      parentAttributeId: PARENT_ATTRIBUTE_ID,
      userAttributeValueCode: code,
      description,
    });
    await attributeValueMasterPage.create();

    await test.step('No client-side restriction — saves successfully', async () => {
      await attributeValueMasterPage.expectCreatedToast(code);
      await attributeValueMasterPage.expectRowVisible(code);
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });

  test('TC:14 Verify Attribute Code (parent attribute) becomes locked after creation (edge/trap)', async ({
    attributeValueMasterPage,
  }) => {
    const code = uniqueCode('Lock');

    await attributeValueMasterPage.openAddValue();
    await attributeValueMasterPage.fillForm({
      parentAttributeId: PARENT_ATTRIBUTE_ID,
      userAttributeValueCode: code,
    });
    await attributeValueMasterPage.create();
    await attributeValueMasterPage.expectCreatedToast(code);

    await test.step('Pick parent attribute is disabled in Edit', async () => {
      await attributeValueMasterPage.openRowForEdit(code);
      expect(await attributeValueMasterPage.isParentAttributePickerLocked()).toBe(true);
    });

    await test.step('Clean up', async () => {
      await attributeValueMasterPage.deleteRecord();
      await attributeValueMasterPage.expectDeletedToast();
    });
  });
});
