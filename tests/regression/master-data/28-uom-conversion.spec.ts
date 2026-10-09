import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/master-data.fixtures';

/**
 * Master Data — UoM Conversion ("UoM Conversion Master" screen,
 * `/master-data/inventory-item-management/uom-conversions`, under the
 * "Inventory Item Management" nav group — collapsed by default, but a
 * direct goto() to the route works fine once authenticated, confirmed
 * live, so no nav-expansion step is needed here).
 *
 * Source of truth: test-cases/master-data/uom-conversion/
 * uom-conversion-testcases.md — no ClickUp task exists for this module
 * yet, so no allure.tms() links here (same convention as this repo's
 * other no-ClickUp suites). Storage state from auth.setup.ts is already
 * applied via the "master-data" project's dependency — no login needed.
 *
 * From/To UoM are picked from a fixed master list (no "New Unit" path from
 * this screen) and this screen has no hard delete at all — only
 * deactivate — so most positive-path tests call
 * uomConversionPage.pickUnusedPair() instead of a timestamp-suffixed code,
 * to stay idempotent across repeated runs. See that method's own doc.
 *
 * Two real, confirmed-live quirks are deliberately asserted as-is:
 * - TC:5's From==To validation disables the Create button itself, while
 *   TC:6/7's Conversion Factor validation leaves Create clickable and
 *   blocks only on click — two different validation UX patterns on one
 *   form, not a typo in this suite.
 * - TC:7's non-numeric Conversion Factor input shows the same "Must be
 *   greater than 0" message used for negative/zero values, which is a
 *   misleading message for that specific case — asserted as-is, not
 *   "fixed" to a more accurate expectation.
 */
test.describe('Master Data - UoM Conversion', () => {
  test.beforeEach(async () => {
    await allure.epic('Master Data');
    await allure.feature('UoM Conversion');
    await allure.owner('Master Data QA');
  });

  test('TC:1 Verify UoM Conversion list screen layout', async ({ uomConversionPage }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();

    await test.step('Tabs and toolbar are present', async () => {
      await expect(uomConversionPage.locators.allTab).toBeVisible();
      await expect(uomConversionPage.locators.activeTab).toBeVisible();
      await expect(uomConversionPage.locators.inactiveTab).toBeVisible();
      await expect(uomConversionPage.locators.searchInput).toBeVisible();
    });

    await test.step('Grid columns match the confirmed-live set (no "To Unit Description" column)', async () => {
      await uomConversionPage.expectColumnHeadersVisible([
        // "From Unit" is a text-prefix of "From Unit Description" — see
        // expectColumnHeadersVisible()'s own doc for why this needs a
        // negative-lookahead regex rather than a plain string.
        /^From Unit(?!\s*Description)/,
        'From Unit Description',
        'To Unit',
        'Conversion Factor',
        'CH Item',
        'Round Up',
        'Status',
      ]);
      await uomConversionPage.expectNoColumnHeader('To Unit Description');
    });
  });

  test('TC:2 Verify successful creation with all fields filled', async ({ uomConversionPage }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    const [fromUnit, toUnit] = await uomConversionPage.pickUnusedPair();

    await test.step('Create with From/To/Factor and both checkboxes on', async () => {
      await uomConversionPage.openNewUomConversion();
      await uomConversionPage.pickFromUnit(fromUnit);
      await uomConversionPage.pickToUnit(toUnit);
      await uomConversionPage.fillDetails({
        conversionFactor: '24',
        chemicalItem: true,
        roundUp: true,
      });
      await uomConversionPage.create();
    });

    await test.step('Toast confirms success; row shows CH Item/Round Up Yes, Active', async () => {
      await uomConversionPage.expectCreatedSuccessfully();
      await uomConversionPage.search(toUnit);
      await uomConversionPage.expectRowContainsText(fromUnit, toUnit, '24.000000');
      await uomConversionPage.expectRowContainsText(fromUnit, toUnit, 'Active');
    });
  });

  test('TC:3 Verify successful creation with only required fields', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    const [fromUnit, toUnit] = await uomConversionPage.pickUnusedPair();

    await uomConversionPage.openNewUomConversion();
    await uomConversionPage.pickFromUnit(fromUnit);
    await uomConversionPage.pickToUnit(toUnit);
    await uomConversionPage.fillConversionFactor('12');

    await test.step('Create without touching Chemical Item/Round Up/Active', async () => {
      await uomConversionPage.create();
      await uomConversionPage.expectCreatedSuccessfully();
    });

    await test.step('Chemical Item and Round Up default unchecked (No); Active defaults checked', async () => {
      await uomConversionPage.search(toUnit);
      const row = uomConversionPage.locators.row(fromUnit, toUnit);
      await expect(row).toContainText('NoNoActive');
    });
  });

  test('TC:4 Verify validation when all required fields are left blank', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    await uomConversionPage.openNewUomConversion();

    await test.step('Submit with everything blank', async () => {
      await uomConversionPage.create();
    });

    await test.step('Blocked with 3 simultaneous "Required" errors, dialog stays open', async () => {
      await uomConversionPage.expectStillOnFormDialog();
      await uomConversionPage.expectRequiredErrorCount(3);
    });
  });

  test('TC:5 Verify From UoM and To UoM must be different', async ({ uomConversionPage }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    await uomConversionPage.openNewUomConversion();

    await test.step('Pick the same unit for both From and To', async () => {
      await uomConversionPage.pickFromUnit('BOX');
      await uomConversionPage.pickToUnit('BOX');
      await uomConversionPage.fillConversionFactor('1');
    });

    await test.step('Create is disabled and an inline error names the conflict', async () => {
      await uomConversionPage.expectCreateButtonDisabled();
      await uomConversionPage.expectSameUnitError();
    });
  });

  test('TC:6 Verify negative and zero Conversion Factor are rejected', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    await uomConversionPage.openNewUomConversion();
    await uomConversionPage.pickFromUnit('INCH');
    await uomConversionPage.pickToUnit('GAL');

    await test.step('Negative value is blocked on Create — Create itself stays enabled', async () => {
      await uomConversionPage.fillConversionFactor('-5');
      await expect(uomConversionPage.locators.createButton).toBeEnabled();
      await uomConversionPage.create();
      await uomConversionPage.expectConversionFactorMustBeGreaterThanZero();
      await uomConversionPage.expectStillOnFormDialog();
    });

    await test.step('Zero is blocked the same way', async () => {
      await uomConversionPage.fillConversionFactor('0');
      await uomConversionPage.create();
      await uomConversionPage.expectConversionFactorMustBeGreaterThanZero();
      await uomConversionPage.expectStillOnFormDialog();
    });
  });

  test('TC:7 Verify non-numeric text in Conversion Factor — edge case, surprising error text', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    await uomConversionPage.openNewUomConversion();
    await uomConversionPage.pickFromUnit('GAL');
    await uomConversionPage.pickToUnit('DZN');

    await test.step('Typing "abc" is accepted into the field with no charset restriction', async () => {
      await uomConversionPage.fillConversionFactor('abc');
      await expect(uomConversionPage.locators.conversionFactorInput).toHaveValue('abc');
    });

    await test.step('Create is blocked with the SAME message used for negative/zero — "Must be greater than 0", not a "must be a number" message', async () => {
      await uomConversionPage.create();
      await uomConversionPage.expectConversionFactorMustBeGreaterThanZero();
      await uomConversionPage.expectStillOnFormDialog();
    });
  });

  test('TC:8 Verify duplicate From/To UoM pair is rejected with a specific message', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    const [fromUnit, toUnit] = await uomConversionPage.pickUnusedPair();

    await test.step('Create the pair once — succeeds', async () => {
      await uomConversionPage.openNewUomConversion();
      await uomConversionPage.pickFromUnit(fromUnit);
      await uomConversionPage.pickToUnit(toUnit);
      await uomConversionPage.fillConversionFactor('5');
      await uomConversionPage.create();
      await uomConversionPage.expectCreatedSuccessfully();
    });

    await test.step('Repeat the exact same pair — blocked with a specific, non-generic toast', async () => {
      await uomConversionPage.openNewUomConversion();
      await uomConversionPage.pickFromUnit(fromUnit);
      await uomConversionPage.pickToUnit(toUnit);
      await uomConversionPage.fillConversionFactor('9');
      await uomConversionPage.create();
      await uomConversionPage.expectDuplicatePairError();
      await uomConversionPage.expectStillOnFormDialog();
    });
  });

  test('TC:9 Verify editing an existing conversion — From/To UoM are locked', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    const [fromUnit, toUnit] = await uomConversionPage.pickUnusedPair();

    await test.step('Create a conversion to edit', async () => {
      await uomConversionPage.openNewUomConversion();
      await uomConversionPage.pickFromUnit(fromUnit);
      await uomConversionPage.pickToUnit(toUnit);
      await uomConversionPage.fillConversionFactor('10');
      await uomConversionPage.create();
      await uomConversionPage.expectCreatedSuccessfully();
    });

    await test.step('Open it — From/To pickers are disabled', async () => {
      await uomConversionPage.openRow(fromUnit, toUnit);
      await uomConversionPage.expectFromToUnitLocked();
    });

    await test.step('Change the Conversion Factor and save', async () => {
      await uomConversionPage.fillConversionFactor('99');
      await uomConversionPage.saveChanges();
      await uomConversionPage.expectUpdatedSuccessfully();
    });

    await test.step('List reflects the new factor', async () => {
      await uomConversionPage.search(toUnit);
      await uomConversionPage.expectRowContainsText(fromUnit, toUnit, '99.000000');
    });
  });

  test('TC:10 Verify Cancel on create discards changes', async ({ uomConversionPage }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    await uomConversionPage.openNewUomConversion();

    await test.step('Fill the form, then Cancel instead of Create', async () => {
      await uomConversionPage.pickFromUnit('MTS');
      await uomConversionPage.pickToUnit('INCH');
      await uomConversionPage.fillConversionFactor('39.37');
      await uomConversionPage.cancel();
    });

    await test.step('No record created for this pair', async () => {
      await uomConversionPage.expectRowNotVisible('MTS', 'INCH');
    });
  });

  test('TC:11 Verify deactivating and reactivating a conversion — no dedicated button', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    const [fromUnit, toUnit] = await uomConversionPage.pickUnusedPair();

    await test.step('Create a conversion to deactivate', async () => {
      await uomConversionPage.openNewUomConversion();
      await uomConversionPage.pickFromUnit(fromUnit);
      await uomConversionPage.pickToUnit(toUnit);
      await uomConversionPage.fillConversionFactor('7');
      await uomConversionPage.create();
      await uomConversionPage.expectCreatedSuccessfully();
    });

    await test.step('Uncheck Active and save — row flips to Inactive', async () => {
      await uomConversionPage.openRow(fromUnit, toUnit);
      await uomConversionPage.uncheckActive();
      await uomConversionPage.saveChanges();
      await uomConversionPage.expectUpdatedSuccessfully();
      await uomConversionPage.search(toUnit);
      await uomConversionPage.expectRowContainsText(fromUnit, toUnit, 'Inactive');
    });

    await test.step('Re-check Active and save — row flips back to Active (no reactivation bug here)', async () => {
      await uomConversionPage.openRow(fromUnit, toUnit);
      await uomConversionPage.checkActive();
      await uomConversionPage.saveChanges();
      await uomConversionPage.expectUpdatedSuccessfully();
      await uomConversionPage.search(toUnit);
      await uomConversionPage.expectRowContainsText(fromUnit, toUnit, 'Active');
    });
  });

  test('TC:12 Verify list search by From/To UoM code', async ({ uomConversionPage }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();

    await test.step('Searching a known seeded To-UoM code narrows to the matching row', async () => {
      await uomConversionPage.search('LBS');
      await uomConversionPage.expectRowVisible('KG', 'LBS');
    });
  });

  test('TC:13 Verify "Pick unit" lookup is a searchable, paginated grid', async ({
    uomConversionPage,
  }) => {
    await uomConversionPage.open();
    await uomConversionPage.expectLoaded();
    await uomConversionPage.openNewUomConversion();

    await test.step('Opening "Pick from unit" shows a live-counted, searchable lookup', async () => {
      await uomConversionPage.locators.pickFromUnitButton.click();
      await uomConversionPage.expectSelectUnitLookupVisible();
    });

    await test.step('Picking a row closes the lookup and populates the field — no explicit "Select" button', async () => {
      await uomConversionPage.locators.selectUnitSearchInput.fill('BOX');
      await uomConversionPage.locators.selectUnitRow('BOX').first().click();
      await expect(uomConversionPage.locators.selectUnitDialog).toHaveCount(0);
      // fromUnitDisplay is a readonly <input>, not a text element — its
      // picked value lives in the `value` attribute, not textContent (an
      // input's textContent is always empty regardless of its value).
      await expect(uomConversionPage.locators.fromUnitDisplay).toHaveValue(/BOX/);
    });

    await uomConversionPage.cancel();
  });
});
