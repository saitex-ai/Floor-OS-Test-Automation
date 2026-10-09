import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Item Master screen,
 * /master-data/inventory-item-management/item-master. Under the
 * "Inventory Item Management" nav group (collapsed by default, distinct
 * from "System Management" — see agent-notes/master-data-module.md). The
 * richest of the three Inventory Item Management screens covered this
 * session. Storage state from auth.setup.ts is already applied via the
 * "master-data" project's dependency — no login needed.
 *
 * Source of truth: test-cases/master-data/item-master/
 * item-master-testcases.md — no ClickUp task exists for this module yet,
 * so no allure.tms() links here.
 *
 * Real, confirmed app bugs/behaviors deliberately asserted as-is (not
 * worked around), per this repo's established discipline:
 * - TC:5 — Stock Group/Stock Type/Custom Code/HS Code all carry a red `*`
 *   but only Stock Group is genuinely unenforced (the other three either
 *   auto-derive or already hold a non-empty default).
 * - TC:10 — a duplicate Alternate Code is blocked, but with the wrong/
 *   misleading "This record was updated by someone else. Reload and try
 *   again." message instead of a duplicate-key message.
 * - TC:13 — the "Active flag" checkbox is always checked and genuinely
 *   disabled; there is no way to deactivate an item through this UI, even
 *   though the delete-confirmation dialog's own text recommends it.
 *
 * Every test that creates a real throwaway item cleans it up via the real
 * "Delete permanently" flow in a `finally` block, so a failed assertion
 * doesn't leave the shared dev dataset polluted (lesson learned the hard
 * way while building the underlying test-case doc — see that file's
 * Notes on editing a pre-existing record by mistake).
 */
test.describe('Master Data - Item Master', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Item Master');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify successful creation with all required + several optional fields filled', async ({
    itemMasterPage,
  }) => {
    const alternateCode = `TC-Item-Full-${Date.now()}`;
    const description = `TC-Item test description full ${Date.now()}`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    try {
      await test.step('Fill all required fields plus Alternate Code/Description', async () => {
        await itemMasterPage.openNewItem();
        await itemMasterPage.fillRequired({
          alternateCode,
          description,
          itemClassMatch: /CHEM-WASH/,
        });
      });

      await test.step('Create: toast confirms success with the auto-generated Item ID', async () => {
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();
        expect(itemId).toMatch(/^CHEM\d+$/);
      });

      await test.step('New row visible on the list with Status Approved', async () => {
        await itemMasterPage.search(alternateCode);
        await itemMasterPage.expectRowVisible(alternateCode);
        await itemMasterPage.expectRowStatus(alternateCode, 'Approved');
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:2 Verify successful creation with only the 7 genuinely-required fields', async ({
    itemMasterPage,
  }) => {
    const alternateCode = `TC-Item-Min-${Date.now()}`;
    const description = `TC-Item test description min ${Date.now()}`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    try {
      await test.step('Fill only Alternate Code, Description, Item Class, Item Category, Base/Sale/Purchase Unit', async () => {
        await itemMasterPage.openNewItem();
        await itemMasterPage.fillRequired({
          alternateCode,
          description,
          itemClassMatch: /CHEM-WASH/,
        });
      });

      await test.step('Create succeeds — Stock Item/Capitalization/Lot Tracking/Last Purchase Cost/LCA Code are genuinely optional', async () => {
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();
      });

      await test.step('New row visible on the list', async () => {
        await itemMasterPage.search(alternateCode);
        await itemMasterPage.expectRowVisible(alternateCode);
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:3 Verify successful edit of an existing item', async ({ itemMasterPage }) => {
    const alternateCode = `TC-Item-Edit-${Date.now()}`;
    const description = `TC-Item edit original ${Date.now()}`;
    const updatedDescription = `${description}-Updated`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    try {
      await test.step('Create an item to edit', async () => {
        await itemMasterPage.openNewItem();
        await itemMasterPage.fillRequired({
          alternateCode,
          description,
          itemClassMatch: /CHEM-WASH/,
        });
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();
      });

      await test.step('Open it, change Description, and Update (the button is disabled until a real change is made)', async () => {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.expectOnEditPage(itemId);
        await itemMasterPage.fillDescription(updatedDescription);
        await itemMasterPage.update();
      });

      await test.step('Toast confirms the update; list reflects the new Description', async () => {
        await itemMasterPage.expectUpdatedSuccessfully();
        await itemMasterPage.search(updatedDescription);
        await itemMasterPage.expectRowVisible(updatedDescription);
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:4 Verify validation when all 7 required fields are left blank', async ({
    itemMasterPage,
  }) => {
    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('Submit with everything blank', async () => {
      await itemMasterPage.create();
    });

    await test.step('Blocked with all 7 inline errors plus a summarizing toast; no navigation', async () => {
      await itemMasterPage.expectAllRequiredFieldErrorsVisible();
      await itemMasterPage.expectRequiredFieldsToastVisible();
      await itemMasterPage.expectStillOnCreatePage();
    });
  });

  test('TC:5 Verify Stock Group asterisk is not actually enforced — surprising', async ({
    itemMasterPage,
  }) => {
    const alternateCode = `TC-Item-StockGroup-${Date.now()}`;
    const description = `TC-Item stock group blank ${Date.now()}`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    try {
      await test.step('Pick Item Class "CHEM-WASH" (its own record has no Stock Group value) and fill the rest', async () => {
        await itemMasterPage.openNewItem();
        await itemMasterPage.fillRequired({
          alternateCode,
          description,
          itemClassMatch: /CHEM-WASH/,
        });
      });

      await test.step('Create still succeeds despite Stock Group being blank', async () => {
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();
        expect(itemId).toBeTruthy();
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:6 Verify the Item Category picker is scoped to the picked Item Class', async ({
    itemMasterPage,
  }) => {
    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('Pick Item Class "CHEM-WASH"', async () => {
      await itemMasterPage.pickItemClass(/CHEM-WASH/);
    });

    await test.step('Item Category picker shows exactly its 1 matching category', async () => {
      await itemMasterPage.openItemCategoryPicker();
      await itemMasterPage.expectItemCategoryPickerDataRowCount(1);
      await itemMasterPage.closeItemCategoryPicker();
    });
  });

  test('TC:7 Verify Attributes and Product Services tabs are gated behind Item Category', async ({
    itemMasterPage,
  }) => {
    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('Attributes tab is gated before an Item Category is picked', async () => {
      await itemMasterPage.selectTab('Attributes');
      await itemMasterPage.expectAttributesGatedMessageVisible();
    });

    await test.step('Product Services tab is gated the same way', async () => {
      await itemMasterPage.selectTab('Product Services');
      await itemMasterPage.expectProductServicesGatedMessageVisible();
    });
  });

  test('TC:8 Verify the Supplier tab is gated until the item is first saved', async ({
    itemMasterPage,
  }) => {
    const alternateCode = `TC-Item-Supplier-${Date.now()}`;
    const description = `TC-Item supplier gating ${Date.now()}`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    try {
      await test.step('Before saving, Supplier shows only the gating message', async () => {
        await itemMasterPage.selectTab('Supplier');
        await itemMasterPage.expectSupplierGatedMessageVisible();
      });

      await test.step('Save the item, then re-open it and check Supplier again', async () => {
        await itemMasterPage.selectTab('General');
        await itemMasterPage.fillRequired({
          alternateCode,
          description,
          itemClassMatch: /CHEM-WASH/,
        });
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();

        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.selectTab('Supplier');
        await itemMasterPage.expectSupplierGatedMessageNotVisible();
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:9 Verify the Subitem tab works independently on Create (not gated)', async ({
    itemMasterPage,
  }) => {
    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('Subitem tab is usable immediately, unlike Supplier', async () => {
      await itemMasterPage.selectTab('Subitem');
      await itemMasterPage.expectSubitemEmptyStateVisible();
    });
  });

  test('TC:10 Verify duplicate Alternate Code is blocked — with a confusing/wrong error message (bug)', async ({
    itemMasterPage,
  }) => {
    const alternateCode = `TC-Item-Dup-${Date.now()}`;
    let firstItemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    try {
      await test.step('Create the first item with this Alternate Code', async () => {
        await itemMasterPage.openNewItem();
        await itemMasterPage.fillRequired({
          alternateCode,
          description: `TC-Item dup first ${Date.now()}`,
          itemClassMatch: /CHEM-WASH/,
        });
        await itemMasterPage.create();
        firstItemId = await itemMasterPage.getCreatedItemId();
      });

      await test.step('Attempt a second item reusing the exact same Alternate Code', async () => {
        await itemMasterPage.openNewItem();
        await itemMasterPage.fillRequired({
          alternateCode,
          description: `TC-Item dup second ${Date.now()}`,
          itemClassMatch: /CHEM-WASH/,
        });
        await itemMasterPage.create();
      });

      await test.step('BUG: blocked with a misleading optimistic-concurrency message, not a duplicate-key message', async () => {
        await itemMasterPage.expectDuplicateAlternateCodeError();
        await itemMasterPage.expectStillOnCreatePage();
      });
    } finally {
      if (firstItemId) {
        await itemMasterPage.openEditById(firstItemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:11 Verify Cancel discards changes on create', async ({ itemMasterPage }) => {
    const alternateCode = `TC-Item-Cancel-${Date.now()}`;

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    const countBefore = await itemMasterPage.getAllCount();
    await itemMasterPage.openNewItem();

    await test.step('Fill several fields, then Cancel', async () => {
      await itemMasterPage.fillAlternateCode(alternateCode);
      await itemMasterPage.fillDescription('TC-Item cancel test');
      await itemMasterPage.cancel();
    });

    await test.step('No record created; back on the Item Master list; total count unchanged', async () => {
      await itemMasterPage.search(alternateCode);
      await itemMasterPage.expectRowNotVisible(alternateCode);
      await itemMasterPage.search('');
      expect(await itemMasterPage.getAllCount()).toBe(countBefore);
    });
  });

  test('TC:12 Verify "Delete permanently" — real hard-delete with its own confirmation dialog', async ({
    itemMasterPage,
    page,
  }) => {
    const alternateCode = `TC-Item-Delete-${Date.now()}`;

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();
    await itemMasterPage.fillRequired({
      alternateCode,
      description: `TC-Item delete test ${Date.now()}`,
      itemClassMatch: /CHEM-WASH/,
    });
    await itemMasterPage.create();
    const itemId = await itemMasterPage.getCreatedItemId();

    await test.step('Open it and read the confirmation dialog before confirming', async () => {
      await itemMasterPage.openEditById(itemId);
      await itemMasterPage.locators.deletePermanentlyButton.click();
      await expect(itemMasterPage.locators.deleteConfirmDialog).toContainText(
        'Permanently delete this inventory item?',
      );
      await expect(itemMasterPage.locators.deleteConfirmDialog).toContainText(
        'prefer Deactivate when in doubt',
      );
      await itemMasterPage.locators.deleteConfirmDialog
        .getByRole('button', { name: 'Delete permanently', exact: true })
        .click();
    });

    await test.step('Toast confirms permanent deletion; item is fully gone from the list', async () => {
      await itemMasterPage.expectDeletedSuccessfully();
      await itemMasterPage.search(itemId);
      await itemMasterPage.expectRowNotVisible(itemId);
    });

    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('TC:13 Verify the Active flag cannot actually be changed — confirmed bug', async ({
    itemMasterPage,
  }) => {
    const alternateCode = `TC-Item-ActiveBug-${Date.now()}`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    await test.step('Active flag is always checked and genuinely disabled on Create', async () => {
      await itemMasterPage.openNewItem();
      expect(await itemMasterPage.isActiveFlagCheckboxChecked()).toBe(true);
      expect(await itemMasterPage.isActiveFlagCheckboxDisabled()).toBe(true);
    });

    try {
      await test.step('Same on Edit of a real, freshly-created item', async () => {
        await itemMasterPage.fillRequired({
          alternateCode,
          description: `TC-Item active bug ${Date.now()}`,
          itemClassMatch: /CHEM-WASH/,
        });
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();

        await itemMasterPage.openEditById(itemId);
        expect(await itemMasterPage.isActiveFlagCheckboxChecked()).toBe(true);
        expect(await itemMasterPage.isActiveFlagCheckboxDisabled()).toBe(true);
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });

  test('TC:14 Verify the approval dashboard surfaces real Draft items (read-only observation)', async ({
    itemMasterPage,
  }) => {
    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();

    await test.step('The "Masters needing review" panel is visible with at least one real Draft row', async () => {
      // Deliberately read-only — these are real, shared seeded dev records
      // (e.g. "THMNT-6712" raised by seed-netyy), not this suite's own
      // data. Review/Reject/Make active are never clicked here.
      await itemMasterPage.expectMastersNeedingReviewPanelVisible();
    });
  });

  test('TC:15 Verify Alternate Code and Description have no client-side max-length cap (edge)', async ({
    itemMasterPage,
  }) => {
    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('Both fields accept 100+/300+ characters with no truncation', async () => {
      await itemMasterPage.fillAlternateCode('A'.repeat(100));
      expect(await itemMasterPage.getAlternateCodeValue()).toHaveLength(100);

      await itemMasterPage.fillDescription('B'.repeat(300));
      expect(await itemMasterPage.getDescriptionValue()).toHaveLength(300);
    });
  });

  test('TC:16 Verify special/unicode characters in Alternate Code (edge)', async ({
    itemMasterPage,
  }) => {
    const specialValue = 'AC&<script>"日本語';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('The full string is accepted into the field with no character-set restriction', async () => {
      await itemMasterPage.fillAlternateCode(specialValue);
      expect(await itemMasterPage.getAlternateCodeValue()).toBe(specialValue);
    });
  });

  test('TC:17 Verify the floating AI launcher overlaps Create/Update, and the keyboard workaround submits the real form', async ({
    itemMasterPage,
    page,
  }) => {
    const alternateCode = `TC-Item-AiTrap-${Date.now()}`;
    let itemId = '';

    await itemMasterPage.open();
    await itemMasterPage.expectLoaded();
    await itemMasterPage.openNewItem();

    await test.step('The Create button is physically obstructed by the "Ask FloorOS AI" launcher', async () => {
      const obstructed = await itemMasterPage.isButtonObstructedByAiLauncher(
        itemMasterPage.locators.createButton,
      );
      expect(obstructed).toBe(true);
    });

    try {
      await test.step('focus() + Enter reaches the real form, not the AI launcher', async () => {
        await itemMasterPage.fillRequired({
          alternateCode,
          description: `TC-Item ai trap ${Date.now()}`,
          itemClassMatch: /CHEM-WASH/,
        });
        await itemMasterPage.create();
        itemId = await itemMasterPage.getCreatedItemId();
        expect(itemId).toBeTruthy();
        await expect(page.getByRole('dialog', { name: /Ask FloorOS/i })).toHaveCount(0);
      });
    } finally {
      if (itemId) {
        await itemMasterPage.openEditById(itemId);
        await itemMasterPage.deletePermanently();
        await itemMasterPage.expectDeletedSuccessfully();
      }
    }
  });
});
