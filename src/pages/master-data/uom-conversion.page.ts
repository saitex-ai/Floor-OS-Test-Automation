import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { UomConversionLocators } from '../../locators/master-data/uom-conversion.locators';

const UOM_CONVERSION_LIST_PATH = '/master-data/inventory-item-management/uom-conversions';

export interface UomConversionFieldValues {
  conversionFactor: string;
  chemicalItem?: boolean;
  roundUp?: boolean;
}

/**
 * The "UoM Conversion Master" list + "New UoM Conversion"/"Edit UoM
 * Conversion" dialog
 * (/master-data/inventory-item-management/uom-conversions), under Master
 * Data > Inventory Item Management. Owned by the Master Data QA (shared
 * module). Element locators live in UomConversionLocators (`this.locators`)
 * — this class only holds flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/uom-conversion/
 * uom-conversion-testcases.md.
 *
 * From/To UoM are picked from a fixed, non-extendable master list (no
 * "New Unit" path from this screen) and this screen itself has no hard
 * delete (see TC:11's doc below) — so, unlike every other Master Data
 * screen in this repo where a timestamp-suffixed code guarantees a fresh
 * record each run, a From/To *pair* can't be made unique that way.
 * pickUnusedPair() instead checks the live list and rotates through a
 * fixed candidate pool so repeated suite runs don't keep colliding with
 * earlier runs' own (non-deletable) leftover conversions.
 */
export class UomConversionPage extends BasePage {
  readonly locators: UomConversionLocators;

  /** Confirmed-live UoM codes this screen's "Select Unit" lookup actually offers (a subset of the real master list). */
  private static readonly UNIT_POOL = [
    'C2K',
    'C3K',
    'C5K',
    'DZN',
    'GAL',
    'INCH',
    'ML',
    'MM',
    'OZ',
    'PCS',
    'PR',
    'SQM',
    'TON',
    'YDS',
    'KGG',
    'CARTON',
    'LITER',
    'CM',
    'BOX',
    'KG',
  ] as const;

  constructor(page: Page) {
    super(page);
    this.locators = new UomConversionLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(UOM_CONVERSION_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newUomConversionButton).toBeVisible();
  }

  /**
   * TC:1 — confirmed-live grid column set. Accepts a RegExp for any name
   * that is itself a text-prefix of another column (e.g. "From Unit" is a
   * prefix of "From Unit Description") — confirmed live that a plain
   * string match (with or without `exact: true`) is a strict-mode
   * violation there: each `columnheader`'s accessible name is the visible
   * label concatenated with its own "Resize ... column" button's
   * aria-label (e.g. "From Unit Resize From Unit column"), so neither a
   * substring nor an exact match disambiguates "From Unit" from "From Unit
   * Description" on its own — only a negative-lookahead regex does. Same
   * general shape of accessible-name collision documented elsewhere in
   * this app's forms, now confirmed on grid column headers too.
   */
  async expectColumnHeadersVisible(names: readonly (string | RegExp)[]): Promise<void> {
    for (const name of names) {
      await expect(this.page.getByRole('columnheader', { name })).toBeVisible();
    }
  }

  /** TC:1 — confirmed-live asymmetry: there is a "From Unit Description" column but no "To Unit Description" one. */
  async expectNoColumnHeader(name: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('columnheader', { name })).toHaveCount(0);
  }

  /** Same settle-wait as UomPage.search() — the grid is debounced/re-fetched, a snapshot taken immediately after fill() can race it. */
  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
    await this.waitForRowsToSettle();
  }

  private async waitForRowsToSettle(): Promise<void> {
    const rows = this.page.getByRole('row');
    let previous = -1;
    for (let i = 0; i < 20; i++) {
      const current = await rows.count();
      if (current === previous) return;
      previous = current;
      await this.page.waitForTimeout(250);
    }
  }

  async openNewUomConversion(): Promise<void> {
    await this.locators.newUomConversionButton.click();
  }

  /** Opens the Edit dialog for the row matching this exact From/To pair. */
  async openRow(fromUnit: string, toUnit: string): Promise<void> {
    await this.search(toUnit);
    await this.locators.row(fromUnit, toUnit).first().click();
  }

  /** Picks `code` in the "Pick from unit" lookup — confirmed live: selecting a row auto-closes the lookup, no explicit "OK"/"Select" button exists. */
  async pickFromUnit(code: string): Promise<void> {
    await this.locators.pickFromUnitButton.click();
    await this.selectUnitByCode(code);
  }

  /** Picks `code` in the "Pick to unit" lookup — same auto-close behavior as pickFromUnit(). */
  async pickToUnit(code: string): Promise<void> {
    await this.locators.pickToUnitButton.click();
    await this.selectUnitByCode(code);
  }

  private async selectUnitByCode(code: string): Promise<void> {
    await expect(this.locators.selectUnitDialog).toBeVisible({ timeout: 15_000 });
    await this.locators.selectUnitSearchInput.fill(code);
    await this.locators.selectUnitRow(code).first().click();
  }

  async fillConversionFactor(value: string): Promise<void> {
    await this.locators.conversionFactorInput.fill(value);
  }

  /** Fills Conversion Factor and optionally checks Chemical Item/Round Up — From/To must already be picked via pickFromUnit()/pickToUnit(). */
  async fillDetails(values: UomConversionFieldValues): Promise<void> {
    await this.fillConversionFactor(values.conversionFactor);
    if (values.chemicalItem) await this.checkChemicalItem();
    if (values.roundUp) await this.checkRoundUp();
  }

  async checkChemicalItem(): Promise<void> {
    await this.locators.chemicalItemCheckbox.check();
  }

  async checkRoundUp(): Promise<void> {
    await this.locators.roundUpCheckbox.check();
  }

  async uncheckActive(): Promise<void> {
    await this.locators.activeCheckbox.uncheck();
  }

  async checkActive(): Promise<void> {
    await this.locators.activeCheckbox.check();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Real toast text confirmed live: "UoM conversion created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('UoM conversion created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "UoM conversion updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('UoM conversion updated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Real toast text confirmed live on a duplicate From/To pair submit — a
   * specific, well-worded message (contrast with Company Master's/UoM
   * Master's own generic "Failed to create ..." duplicate-key toasts).
   */
  async expectDuplicatePairError(): Promise<void> {
    await expect(
      this.page.getByText('A conversion already exists for this From/To UoM pair.', {
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 });
  }

  /** TC:5 — confirmed live this is the one validation on this form that disables Create itself, not just a click-then-error. */
  async expectCreateButtonDisabled(): Promise<void> {
    await expect(this.locators.createButton).toBeDisabled();
  }

  async expectSameUnitError(): Promise<void> {
    await expect(this.locators.fieldError('From UoM and To UoM must be different.')).toBeVisible();
  }

  /** Shared inline message for negative/zero/non-numeric Conversion Factor (TC:6-7) — confirmed live, same text for all three invalid shapes. */
  async expectConversionFactorMustBeGreaterThanZero(): Promise<void> {
    await expect(this.locators.fieldError('Must be greater than 0')).toBeVisible();
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.fieldError('Required')).toHaveCount(count);
  }

  /** Still on the form dialog (Create was blocked) — no navigation, no toast. */
  async expectStillOnFormDialog(): Promise<void> {
    await expect(this.locators.formDialog).toBeVisible();
  }

  /** Edit locks the From/To pair — confirmed live via [disabled] on both the trigger buttons and their display textboxes. */
  async expectFromToUnitLocked(): Promise<void> {
    await expect(this.locators.pickFromUnitButton).toBeDisabled();
    await expect(this.locators.pickToUnitButton).toBeDisabled();
    await expect(this.locators.fromUnitDisplay).toBeDisabled();
    await expect(this.locators.toUnitDisplay).toBeDisabled();
  }

  async expectRowVisible(fromUnit: string, toUnit: string): Promise<void> {
    await expect(this.locators.row(fromUnit, toUnit)).toBeVisible();
  }

  async expectRowNotVisible(fromUnit: string, toUnit: string): Promise<void> {
    await expect(this.locators.row(fromUnit, toUnit)).toHaveCount(0);
  }

  async expectRowContainsText(fromUnit: string, toUnit: string, text: string): Promise<void> {
    await expect(this.locators.row(fromUnit, toUnit)).toContainText(text);
  }

  /** True/false read of whether this From/To pair already has a conversion on the list — used by pickUnusedPair(). */
  async pairExists(fromUnit: string, toUnit: string): Promise<boolean> {
    await this.search(toUnit);
    return (await this.locators.row(fromUnit, toUnit).count()) > 0;
  }

  /**
   * Walks a deterministic-but-rotating pair of indices into UNIT_POOL
   * (seeded off Date.now(), so different runs tend to land on different
   * candidates) and returns the first From/To pair confirmed NOT to
   * already exist on the live list. Throws if the entire pool is
   * exhausted (every candidate pair already used) — at that point the
   * pool genuinely needs extending, not a retry.
   */
  async pickUnusedPair(): Promise<[string, string]> {
    const pool = UomConversionPage.UNIT_POOL;
    const seed = Date.now();
    for (let offset = 0; offset < pool.length; offset++) {
      const fromIdx = (seed + offset) % pool.length;
      const toIdx = (seed + offset + 7) % pool.length;
      if (fromIdx === toIdx) continue;
      const fromUnit = pool[fromIdx] as string;
      const toUnit = pool[toIdx] as string;
      if (!(await this.pairExists(fromUnit, toUnit))) {
        return [fromUnit, toUnit];
      }
    }
    throw new Error(
      'No unused From/To UoM pair found in UomConversionPage.UNIT_POOL — extend the pool.',
    );
  }

  async isActiveChecked(): Promise<boolean> {
    return this.locators.activeCheckbox.isChecked();
  }

  /** The "Select Unit" lookup dialog's own header carries a live total count, e.g. "Select Unit(83)". */
  async expectSelectUnitLookupVisible(): Promise<void> {
    await expect(this.locators.selectUnitDialog).toBeVisible({ timeout: 15_000 });
    await expect(this.locators.selectUnitDialog.getByText(/^Select Unit\(\d+\)$/)).toBeVisible();
    await expect(this.locators.selectUnitSearchInput).toBeVisible();
  }
}
