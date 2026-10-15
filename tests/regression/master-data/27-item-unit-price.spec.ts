import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — Item Unit Price ("Item Unit Price (THD Master)" screen,
 * /master-data/inventory-item-management/item-unit-price, reached via the
 * collapsed-by-default "Inventory Item Management" nav group). This is a
 * **revision ledger**, not a flat master: each revision is a point-in-time
 * snapshot of many Detail Prices rows, with an enforced Open -> Posted
 * lifecycle and a hard system-wide constraint of at most one Open revision
 * at a time.
 *
 * Source of truth: test-cases/master-data/item-unit-price/item-unit-price-testcases.md
 * — no ClickUp task exists for this module yet, so no allure.tms() links
 * here (same convention as this repo's other no-ClickUp suites).
 *
 * Tests resolve "the" Open/Posted revision dynamically via
 * getOpenRevisionNumber()/getPostedRevisionNumber() rather than hardcoding a
 * Rev No — see that page object method's own doc for why a fixed number
 * would go stale or collide with concurrent runs against this shared dev
 * environment.
 *
 * Real, confirmed app behaviors are asserted as-is (not worked around), per
 * this repo's established discipline:
 * - TC:2 — **superseded finding**: clicking "New Revision" while a revision
 *   is already Open was first confirmed live (2026-10-08) to be a silent
 *   no-op with no dialog at all. Re-confirmed live again on 2026-10-09 while
 *   building this very automation, it instead opened a real "Open a new
 *   revision" confirmation dialog — the dev app's behavior genuinely changed
 *   between those two sessions. This test asserts the **current** behavior
 *   (dialog appears, then Cancel) rather than the stale 2026-10-08 finding;
 *   see ItemUnitPricePage.expectNewRevisionOpensConfirmationDialog()'s own
 *   doc for the full account.
 * - TC:7/TC:8 — Unit Price accepts negative values and unlimited decimal
 *   precision with no client-side guard, unlike Price Library's own Price
 *   field in the same nav group (see that module's TC:9/TC:10).
 *
 * TC:7/TC:8/TC:9 probe the Open revision's **existing, pre-seeded** row —
 * deliberately restoring the original value afterward and never clicking
 * "Save details", so no bad value is ever persisted into that shared
 * fixture.
 *
 * TC:11 and TC:13 are deliberately `test.fixme()`d:
 * - TC:11 — the test-case doc itself flags that whether "Close" silently
 *   discards unsaved edits or prompts was never confirmed live (to avoid
 *   leaving the shared Open revision in an inconsistent state mid-exploration).
 * - TC:13 — Post Revision was deliberately never executed live: Rev data is
 *   pre-existing shared fixture state this session didn't create, posting
 *   is a one-way Open -> Posted transition, and only one Open revision can
 *   exist system-wide, so posting it would remove the only Open revision
 *   from the whole module until someone creates a new one. Automating an
 *   irreversible action against shared dev state that was explicitly
 *   avoided during manual exploration would undo that same caution.
 */
test.describe('Master Data - Item Unit Price', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('Item Unit Price');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify list layout and seeded revision data', async ({ itemUnitPricePage }) => {
    await itemUnitPricePage.open();
    await itemUnitPricePage.expectLoaded();

    await test.step('At least one Open and one Posted revision exist', async () => {
      const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
      const postedRevNo = await itemUnitPricePage.getPostedRevisionNumber();
      expect(openRevNo).toBeGreaterThan(0);
      expect(postedRevNo).toBeGreaterThan(0);
      await itemUnitPricePage.expectRowStatus(openRevNo, 'Open');
      await itemUnitPricePage.expectRowStatus(postedRevNo, 'Posted');
    });
  });

  test('TC:2 Verify "New Revision" behavior while a revision is already Open — real behavior changed since the original exploration', async ({
    itemUnitPricePage,
  }) => {
    await itemUnitPricePage.open();
    await itemUnitPricePage.expectLoaded();

    await test.step('Precondition: a revision is already Open', async () => {
      const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
      expect(openRevNo).toBeGreaterThan(0);
    });

    await test.step('Clicking "New Revision" opens a real confirmation dialog (not a silent no-op — see file header)', async () => {
      await itemUnitPricePage.expectNewRevisionOpensConfirmationDialog();
    });
  });

  test("TC:3 Verify opening the Open revision's detail/edit view", async ({
    itemUnitPricePage,
  }) => {
    await itemUnitPricePage.open();
    await itemUnitPricePage.expectLoaded();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();

    await itemUnitPricePage.openRevision(openRevNo);

    await test.step('Edit toolbar and Detail Prices table render for an Open revision', async () => {
      await expect(itemUnitPricePage.locators.detailPricesHeading).toBeVisible();
      await expect(itemUnitPricePage.locators.addItemsButton).toBeVisible();
      await expect(itemUnitPricePage.locators.uploadButton).toBeVisible();
      await expect(itemUnitPricePage.locators.addRowButton).toBeVisible();
      await expect(itemUnitPricePage.locators.saveDetailsButton).toBeVisible();
      await expect(itemUnitPricePage.locators.postRevisionButton).toBeVisible();
    });
  });

  test('TC:4 Verify the "Add Items" bulk picker', async ({ itemUnitPricePage }) => {
    await itemUnitPricePage.open();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
    await itemUnitPricePage.openRevision(openRevNo);

    await test.step('Opens a searchable, checkbox-driven bulk picker sourced from the THD item list', async () => {
      await itemUnitPricePage.openAddItemsDialog();
      await expect(itemUnitPricePage.locators.addItemsSearchInput).toBeVisible();
      await expect(itemUnitPricePage.locators.addItemsDialog.getByRole('table')).toBeVisible();
    });

    await test.step('Close without selecting anything', async () => {
      await itemUnitPricePage.closeAddItemsDialog();
    });
  });

  test('TC:5 Verify required-field validation on a manually added blank row', async ({
    itemUnitPricePage,
  }) => {
    await itemUnitPricePage.open();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
    await itemUnitPricePage.openRevision(openRevNo);

    await test.step('Add a blank row and attempt to save', async () => {
      await itemUnitPricePage.addRow();
      await itemUnitPricePage.saveDetails();
    });

    await test.step('Blocked with the real toast naming Item/Currency/UOM/Vendor as required', async () => {
      await itemUnitPricePage.expectRequiredRowFieldsToast();
    });

    await test.step('Clean up: remove the never-saved blank row before leaving', async () => {
      await itemUnitPricePage.removeRow(itemUnitPricePage.locators.lastDetailRow());
    });
  });

  test('TC:6 Verify a Posted revision is genuinely read-only', async ({ itemUnitPricePage }) => {
    await itemUnitPricePage.open();
    await itemUnitPricePage.expectLoaded();
    const postedRevNo = await itemUnitPricePage.getPostedRevisionNumber();

    await itemUnitPricePage.openRevision(postedRevNo);
    await itemUnitPricePage.expectPostedReadOnly();
  });

  test('TC:7 Verify Unit Price accepts negative values — real bug, cross-module inconsistency', async ({
    itemUnitPricePage,
  }) => {
    await itemUnitPricePage.open();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
    await itemUnitPricePage.openRevision(openRevNo);

    const row = itemUnitPricePage.locators.firstDetailRow();
    const original = await itemUnitPricePage.getUnitPriceValue(row);

    await test.step('Typing "-20" is accepted verbatim, unlike Price Library\'s Price field', async () => {
      await itemUnitPricePage.setUnitPrice(row, '-20');
      expect(await itemUnitPricePage.getUnitPriceValue(row)).toBe('-20');
    });

    await test.step('Restore the original value — never saved, to avoid mutating the shared fixture', async () => {
      await itemUnitPricePage.setUnitPrice(row, original);
      expect(await itemUnitPricePage.getUnitPriceValue(row)).toBe(original);
    });
  });

  test('TC:8 Verify Unit Price accepts arbitrary decimal precision with no truncation (edge)', async ({
    itemUnitPricePage,
  }) => {
    await itemUnitPricePage.open();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
    await itemUnitPricePage.openRevision(openRevNo);

    const row = itemUnitPricePage.locators.firstDetailRow();
    const original = await itemUnitPricePage.getUnitPriceValue(row);

    await test.step("Typing 6 decimal places is retained as-is, unlike Price Library's 4-decimal cap", async () => {
      await itemUnitPricePage.setUnitPrice(row, '5.123456');
      expect(await itemUnitPricePage.getUnitPriceValue(row)).toBe('5.123456');
    });

    await test.step('Restore the original value — never saved', async () => {
      await itemUnitPricePage.setUnitPrice(row, original);
      expect(await itemUnitPricePage.getUnitPriceValue(row)).toBe(original);
    });
  });

  test('TC:9 Verify Unit Price accepts 0 (edge)', async ({ itemUnitPricePage }) => {
    await itemUnitPricePage.open();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
    await itemUnitPricePage.openRevision(openRevNo);

    const row = itemUnitPricePage.locators.firstDetailRow();
    const original = await itemUnitPricePage.getUnitPriceValue(row);

    await test.step('0 is accepted without issue', async () => {
      await itemUnitPricePage.setUnitPrice(row, '0');
      expect(await itemUnitPricePage.getUnitPriceValue(row)).toBe('0');
    });

    await test.step('Restore the original value — never saved', async () => {
      await itemUnitPricePage.setUnitPrice(row, original);
      expect(await itemUnitPricePage.getUnitPriceValue(row)).toBe(original);
    });
  });

  test('TC:10 Verify removing a Detail Prices row', async ({ itemUnitPricePage }) => {
    await itemUnitPricePage.open();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();
    await itemUnitPricePage.openRevision(openRevNo);

    const before = await itemUnitPricePage.locators.detailRows().count();
    await itemUnitPricePage.addRow();
    await expect(itemUnitPricePage.locators.detailRows()).toHaveCount(before + 1);

    await itemUnitPricePage.removeRow(itemUnitPricePage.locators.lastDetailRow());
    await expect(itemUnitPricePage.locators.detailRows()).toHaveCount(before);
  });

  test.fixme('TC:11 Verify "Close" navigates back — unsaved-change prompt not confirmed (edge/trap)', async ({
    itemUnitPricePage,
  }) => {
    // Not implemented: the test-case doc explicitly flags that whether
    // Close silently discards an unsaved edit or prompts first was never
    // confirmed live (avoided during exploration to keep the shared Open
    // revision fixture in a known-good state). Asserting either behavior
    // here would be guessing, not automating a confirmed fact.
    await itemUnitPricePage.open();
  });

  test('TC:12 Verify "Search revisions…" on the list', async ({ itemUnitPricePage }) => {
    await itemUnitPricePage.open();
    await itemUnitPricePage.expectLoaded();
    const openRevNo = await itemUnitPricePage.getOpenRevisionNumber();

    await itemUnitPricePage.search(String(openRevNo));
    await itemUnitPricePage.expectRowVisible(openRevNo);
  });

  test.fixme("TC:13 Verify Post Revision's documented behavior — not executed live, see Notes", async ({
    itemUnitPricePage,
  }) => {
    // Not implemented: deliberately never executed against the
    // pre-existing, shared Open revision. Posting is a one-way Open ->
    // Posted transition, and only one Open revision can exist system-wide
    // (TC:2) — running this for real would leave the whole module with
    // zero Open revisions for every other engineer/QA/parallel session
    // relying on dev state, until someone creates a new one. See the
    // test-case file's Notes for the full reasoning; this fixme keeps that
    // same caution in the automated suite rather than quietly reversing it.
    await itemUnitPricePage.open();
  });
});
