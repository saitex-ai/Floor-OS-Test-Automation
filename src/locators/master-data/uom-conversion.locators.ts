import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "UoM Conversion Master" list
 * (/master-data/inventory-item-management/uom-conversions) and its
 * "New UoM Conversion"/"Edit UoM Conversion" dialog, plus the "Select Unit"
 * lookup dialog used to pick From/To units. No actions or assertions here,
 * see src/pages/master-data/uom-conversion.page.ts for those.
 *
 * Confirmed live against dev.flooros.app (2026-10-08) via real
 * `ariaSnapshot()` dumps and real create/edit/deactivate round-trips
 * (`BOX`→`CARTON`, `KG`→`OZ`) — not guessed. This is a genuine full CRUD
 * screen, unlike its sibling Inventory Item History in the same
 * "Inventory Item Management" nav group.
 *
 * Locator trap, confirmed live: the From/To pickers each render **two**
 * elements sharing the identical accessible name "Pick from unit" /
 * "Pick to unit" — a display `textbox` (read-only once a unit is picked)
 * and the actual trigger `button`. Role, not name, is what disambiguates
 * them here.
 */
export class UomConversionLocators {
  readonly heading: Locator;
  readonly newUomConversionButton: Locator;
  readonly searchInput: Locator;

  readonly allTab: Locator;
  readonly activeTab: Locator;
  readonly inactiveTab: Locator;

  // "New UoM Conversion" / "Edit UoM Conversion" dialog — same field set either way.
  readonly formDialog: Locator;
  readonly pickFromUnitButton: Locator;
  readonly pickToUnitButton: Locator;
  readonly fromUnitDisplay: Locator;
  readonly toUnitDisplay: Locator;
  readonly conversionFactorInput: Locator;
  readonly activeCheckbox: Locator;
  readonly chemicalItemCheckbox: Locator;
  readonly roundUpCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  // "Select Unit" lookup dialog, opened by either Pick-unit button.
  readonly selectUnitDialog: Locator;
  readonly selectUnitSearchInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'UoM Conversion Master' });
    this.newUomConversionButton = page.getByRole('button', { name: 'New UoM Conversion' });
    this.searchInput = page.getByPlaceholder(/search by from\/to uom code/i);

    this.allTab = page.getByRole('button', { name: /^All \d+/ });
    this.activeTab = page.getByRole('button', { name: /^Active \d+/ });
    this.inactiveTab = page.getByRole('button', { name: /^Inactive \d+/ });

    this.formDialog = page.getByRole('dialog', {
      name: /^(New UoM Conversion|Edit UoM Conversion)$/,
    });
    this.pickFromUnitButton = this.formDialog.getByRole('button', { name: 'Pick from unit' });
    this.pickToUnitButton = this.formDialog.getByRole('button', { name: 'Pick to unit' });
    this.fromUnitDisplay = this.formDialog.getByRole('textbox', { name: 'Pick from unit' });
    this.toUnitDisplay = this.formDialog.getByRole('textbox', { name: 'Pick to unit' });
    this.conversionFactorInput = this.formDialog.getByRole('textbox', {
      name: /Conversion Factor/,
    });
    this.activeCheckbox = this.formDialog.getByRole('checkbox', { name: 'Active', exact: true });
    this.chemicalItemCheckbox = this.formDialog.getByRole('checkbox', { name: 'Chemical Item' });
    this.roundUpCheckbox = this.formDialog.getByRole('checkbox', { name: 'Round Up' });
    this.createButton = this.formDialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.formDialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.formDialog.getByRole('button', { name: 'Cancel', exact: true });

    this.selectUnitDialog = page.getByRole('dialog', { name: /^Select Unit/ });
    this.selectUnitSearchInput = this.selectUnitDialog.getByRole('textbox', { name: 'Search' });
  }

  /**
   * A data row on the main list grid whose From Unit cell (column index 1 —
   * index 0 is the row-selection checkbox cell, confirmed live via a real
   * cell-by-cell dump) exactly matches `fromUnit` AND whose To Unit cell
   * (column index 3) exactly matches `toUnit`.
   *
   * Confirmed-live bug this fixes: an earlier version anchored only the
   * From Unit cell and did a substring `hasText` check across the whole
   * row for `toUnit` — that silently matched the *reverse* pair too (e.g.
   * row(KG, LBS) also matched the real LBS→KG row, since LBS→KG's own From
   * Unit cell literally reads "LBS"). Anchoring both cells by exact text
   * AND position is what actually disambiguates KG→LBS from LBS→KG.
   */
  row(fromUnit: string, toUnit: string): Locator {
    return this.page
      .getByRole('row')
      .filter({
        has: this.page
          .getByRole('cell')
          .nth(1)
          .filter({ hasText: new RegExp(`^${fromUnit}$`) }),
      })
      .filter({
        has: this.page
          .getByRole('cell')
          .nth(3)
          .filter({ hasText: new RegExp(`^${toUnit}$`) }),
      });
  }

  /** A row inside the open "Select Unit" lookup dialog, matched by its exact UoM Code gridcell. */
  selectUnitRow(code: string): Locator {
    return this.selectUnitDialog.getByRole('row').filter({
      has: this.page.getByRole('gridcell').filter({ hasText: new RegExp(`^${code}$`) }),
    });
  }

  /** Matches one of the form's inline validation paragraphs, e.g. "Required", "Must be greater than 0", "From UoM and To UoM must be different." */
  fieldError(message: string | RegExp): Locator {
    return this.formDialog.getByText(message);
  }
}
