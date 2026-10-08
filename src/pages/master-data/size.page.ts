import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { SizeLocators } from '../../locators/master-data/size.locators';

const SIZES_LIST_PATH = '/master-data/system-management/sizes';

/** Which lookup-picker-backed field to resolve on SizePage's helper methods. */
type SizeLookupField = 'itemCategory' | 'inseam' | 'waist';

export interface SizeFieldValues {
  /** Item Category to pick (e.g. "GMT") — required, and locked once the Size exists. */
  itemCategory: string | RegExp;
  /** Inseam to pick (e.g. "IS111") — required. */
  inseam: string | RegExp;
  /** Waist to pick (e.g. "12") — required. Must not already be paired with the same Inseam + Item Category (see TC:9). */
  waist: string | RegExp;
}

/**
 * Size Master list + "New Size"/"Edit Size" dialog
 * (/master-data/system-management/sizes). Owned by the Master Data QA
 * (shared module). Element locators live in SizeLocators (`this.locators`)
 * — this class only holds flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/size-master/
 * size-master-testcases.md.
 */
export class SizePage extends BasePage {
  readonly locators: SizeLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SizeLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(SIZES_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newSizeButton).toBeVisible();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning. Confirmed live necessary (not just defensive): on a
   * loaded dev environment, searching for a Size immediately after
   * creating it can otherwise race either the search's own debounce or the
   * grid not yet re-fetching, leaving a caller's very next assertion
   * reading a stale (pre-search) row set.
   */
  async search(query: string): Promise<void> {
    await this.locators.searchInput.fill(query);
    await this.waitForRowsToSettle();
  }

  /** Polls the main grid's row count until two consecutive reads agree, up to ~5s. */
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

  async openNewSize(): Promise<void> {
    await this.locators.newSizeButton.click();
  }

  /** Searches by sizeId first — see expectRowVisible()'s doc for why. */
  async openRow(sizeId: string): Promise<void> {
    await this.search(sizeId);
    await this.locators.row(sizeId).click();
  }

  private pickerFor(field: SizeLookupField) {
    const l = this.locators;
    return {
      itemCategory: {
        button: l.itemCategoryPickerButton,
        dialog: l.itemCategoryPickerDialog,
        valueInput: l.itemCategoryValueInput,
      },
      inseam: { button: l.inseamPickerButton, dialog: l.inseamPickerDialog, valueInput: l.inseamValueInput },
      waist: { button: l.waistPickerButton, dialog: l.waistPickerDialog, valueInput: l.waistValueInput },
    }[field];
  }

  /**
   * Opens the given field's lookup picker, narrows it via the dialog's own
   * search box, then clicks the row whose own code cell EXACTLY matches
   * (case-insensitive) — see findExactPickerRow()'s doc for why an exact
   * per-cell comparison is the only reliable way to do this on this grid.
   * Confirmed live: clicking anywhere on the row (not a specific
   * cell/button) both selects it and closes the picker dialog.
   *
   * Still verifies the pick landed and retries (re-opening the picker
   * fresh) up to 2 more times if not, as a last line of defense against
   * any remaining timing race.
   */
  async pickLookupValue(field: SizeLookupField, text: string | RegExp): Promise<void> {
    const { button, dialog, valueInput } = this.pickerFor(field);

    for (let attempt = 1; attempt <= 3; attempt++) {
      await button.click();
      if (typeof text === 'string') {
        await this.locators.pickerSearchInput(dialog).fill(text);
      }
      const row = await this.findExactPickerRow(dialog, text);
      await row.click();

      if (typeof text !== 'string') return; // a RegExp target can't be cheaply re-verified; trust it.

      const picked = await valueInput.inputValue().catch(() => '');
      if (picked.toUpperCase().startsWith(text.toUpperCase())) return;

      if (attempt === 3) {
        throw new Error(
          `pickLookupValue("${field}", "${text}"): picked "${picked}" instead after ${attempt} attempts`,
        );
      }
      // Loop back around: re-opens the picker fresh (the dialog already
      // closed with the wrong value picked) and tries again.
    }
  }

  /**
   * Finds the data row whose own "code" column (always the 2nd gridcell,
   * confirmed live across the Item Category/Inseam/Waist pickers alike —
   * the 1st is a plain row-number "#" column) EXACTLY equals `target`,
   * after waiting for the filtered row count to settle.
   *
   * Confirmed live, the two cheaper approaches both fail on this specific
   * virtualized grid:
   *  - A plain `hasText` substring filter on the whole row is NOT safe
   *    even for a specific-looking code like "W36": on a shared dev
   *    environment it can false-positive-match an unrelated row like
   *    "PW369 — PW MD Waist Alpha ..." (since "PW369" contains "W36").
   *  - A word-boundary-anchored regex doesn't fix that either: this grid's
   *    rows concatenate their cells' raw text with NO separating
   *    whitespace (confirmed: "1GMTGarmentGI42...", not "1 GMT Garment..."
   *    — `ariaSnapshot()`'s own pretty-printing inserts those spaces, the
   *    real `textContent` `hasText` matches against does not), so there is
   *    no real word boundary around a code there either.
   *  - `.filter({ has: dialog.getByRole('gridcell') })` resolves to zero
   *    rows outright (confirmed live) — this grid is virtualized and
   *    appears to wire up its accessibility tree with `aria-owns` rather
   *    than literal DOM nesting, which `has`'s containment check doesn't
   *    follow.
   *
   * What does work, confirmed live: scoping `getByRole('gridcell')`
   * directly off each row's own Locator (`row.getByRole(...)`, not a
   * `.filter({ has })` built from two independently-resolved locators)
   * correctly resolves that row's own cells — Playwright's role engine
   * evidently does follow `aria-owns` when a query is chained this way,
   * even though the `has` containment check does not.
   */
  private async findExactPickerRow(dialog: Locator, target: string | RegExp): Promise<Locator> {
    const dataRows = this.locators.pickerDataRows(dialog);

    // Wait for the filtered set to stop changing size before reading it —
    // the search has a real debounce before the grid re-filters.
    let previousCount = -1;
    for (let i = 0; i < 20; i++) {
      const current = await dataRows.count();
      if (current > 0 && current === previousCount) break;
      previousCount = current;
      await this.page.waitForTimeout(250);
    }

    // Confirmed live: on a search that (today) returns several matches —
    // e.g. other agents' concurrently-created throwaway records also
    // containing "GMT" — the reported count can still shift while this
    // loop is mid-scan, leaving a later `.nth(i)` pointing at a row that
    // never actually resolves. A bounded per-row read (rather than the
    // default ~30s+ auto-retry) means one such row just gets skipped
    // instead of hanging the whole pick for a full minute.
    const count = await dataRows.count();
    for (let i = 0; i < count; i++) {
      const row = dataRows.nth(i);
      const codeText = await row
        .getByRole('gridcell')
        .nth(1)
        .innerText({ timeout: 3_000 })
        .then((t) => t.trim())
        .catch(() => null);
      if (codeText === null) continue;
      const isMatch =
        typeof target === 'string'
          ? codeText.toUpperCase() === target.toUpperCase()
          : target.test(codeText);
      if (isMatch) return row;
    }
    // No exact match found (e.g. a RegExp target, or the app's own search
    // already narrowed to the single intended row) — fall back to the
    // first row rather than hard-failing here; pickLookupValue()'s own
    // verify-and-retry still catches a genuine miss.
    return dataRows.first();
  }

  /** Fills all three required lookup fields (TC:2). Leaves Active on its default (checked). */
  async fillRequired(values: SizeFieldValues): Promise<void> {
    await this.pickLookupValue('itemCategory', values.itemCategory);
    await this.pickLookupValue('inseam', values.inseam);
    await this.pickLookupValue('waist', values.waist);
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

  /**
   * Clicks "Deactivate <SizeID>" in the Edit dialog header. Confirmed live:
   * fires immediately, no confirmation step (unlike Unit of Measure's
   * "Delete") — see SizeLocators' class doc and TC:11's bug note.
   */
  async deactivate(): Promise<void> {
    await this.locators.deactivateButton.click();
  }

  /** Real toast text confirmed live: "Size created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Size created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Real toast text confirmed live on a duplicate Inseam+Waist-in-category
   * submit: a generic "Failed to create size." — the backend's actual
   * `409 size_conflict` reason (naming the conflicting category) is never
   * surfaced to the user. Asserting this exact generic text on purpose
   * (see TC:9's bug note) rather than a more specific message that the app
   * doesn't actually show.
   */
  async expectCreateFailed(): Promise<void> {
    await expect(this.page.getByText('Failed to create size.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.locators.formDialog.getByText(message).first()).toBeVisible();
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError()).toHaveCount(count);
  }

  async descriptionValue(): Promise<string> {
    return this.locators.descriptionInput.inputValue();
  }

  /**
   * Searches by sizeId first, then asserts the row — this grid only
   * renders a bounded window of rows (confirmed live: a just-created row
   * can be completely absent from the DOM on an unfiltered list once
   * enough other rows exist, not just scrolled out of view), so checking
   * for a specific row without first narrowing via Search is unreliable.
   */
  async expectRowVisible(sizeId: string): Promise<void> {
    await this.search(sizeId);
    await expect(this.locators.row(sizeId)).toBeVisible();
  }

  async expectRowNotVisible(sizeId: string): Promise<void> {
    await this.search(sizeId);
    await expect(this.locators.row(sizeId)).toHaveCount(0);
  }

  /** Reads the Status cell text for a given Size ID row, e.g. "Approved". */
  async rowStatus(sizeId: string): Promise<string> {
    return (await this.locators.row(sizeId).getByRole('cell').last().innerText()).trim();
  }
}
