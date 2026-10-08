import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ColorLocators } from '../../locators/master-data/color.locators';

const COLORS_LIST_PATH = '/master-data/system-management/colors';

export interface ColorFieldValues {
  /** Color Code (max 50 chars, confirmed live) — stored uppercased server-side. */
  code: string;
  /** Description (max 200 chars, confirmed live). */
  description: string;
  /** Item Category to pick (e.g. "GMT") — required. */
  itemCategory: string | RegExp;
}

/**
 * Color Master list + "New Color"/"Edit Color" dialog
 * (/master-data/system-management/colors). Owned by the Master Data QA
 * (shared module). Element locators live in ColorLocators (`this.locators`)
 * — this class only holds flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/color-master/
 * color-master-testcases.md.
 */
export class ColorPage extends BasePage {
  readonly locators: ColorLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ColorLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(COLORS_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newColorButton).toBeVisible();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning — see SizePage.search()'s identical doc for why: on a
   * loaded dev environment, searching for a Color immediately after
   * creating it can otherwise race either the search's own debounce or the
   * grid not yet re-fetching.
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

  async openNewColor(): Promise<void> {
    await this.locators.newColorButton.click();
  }

  /**
   * Searches by colorId first — this grid only renders a bounded window of
   * rows (confirmed live on the sibling Size Master/UoM screens: a
   * just-created row can be completely absent from the DOM on an
   * unfiltered list once enough other rows exist), so opening a specific
   * row without first narrowing via Search is unreliable.
   */
  async openRow(colorId: string): Promise<void> {
    await this.search(colorId);
    await this.locators.row(colorId).click();
  }

  /** Fills Color Code, Description and Item Category (all three genuinely required — TC:8-10). */
  async fillRequired(values: ColorFieldValues): Promise<void> {
    await this.locators.colorCodeInput.fill(values.code);
    await this.locators.descriptionInput.fill(values.description);
    await this.pickItemCategory(values.itemCategory);
  }

  /**
   * Picks the row whose own code cell EXACTLY matches `text` — see
   * SizePage.findExactPickerRow()'s doc (same picker dialog) for the full
   * confirmed-live reasoning on why an exact per-cell comparison, done in
   * page code, is the only reliable way to do this on this grid (a plain
   * substring filter, a word-boundary regex, and a `has`-based gridcell
   * containment filter were all tried live and each fails a different way).
   * Still verifies the pick landed and retries (re-opening the picker
   * fresh) up to 2 more times if not, as a last line of defense.
   */
  async pickItemCategory(text: string | RegExp): Promise<void> {
    const dialog = this.locators.itemCategoryPickerDialog;

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.locators.itemCategoryPickerButton.click();
      if (typeof text === 'string') {
        await this.locators.pickerSearchInput(dialog).fill(text);
      }
      const row = await this.findExactPickerRow(dialog, text);
      await row.click();

      if (typeof text !== 'string') return; // a RegExp target can't be cheaply re-verified; trust it.

      const picked = await this.locators.itemCategoryValueInput.inputValue().catch(() => '');
      if (picked.toUpperCase().startsWith(text.toUpperCase())) return;

      if (attempt === 3) {
        throw new Error(
          `pickItemCategory("${text}"): picked "${picked}" instead after ${attempt} attempts`,
        );
      }
    }
  }

  /**
   * Finds the data row whose own "code" column (always the 2nd gridcell)
   * EXACTLY equals `target`, after waiting for the filtered row count to
   * settle — see SizePage.findExactPickerRow()'s doc (same picker dialog,
   * identical implementation) for the full confirmed-live reasoning.
   */
  private async findExactPickerRow(dialog: Locator, target: string | RegExp): Promise<Locator> {
    const dataRows = this.locators.pickerDataRows(dialog);

    let previousCount = -1;
    for (let i = 0; i < 20; i++) {
      const current = await dataRows.count();
      if (current > 0 && current === previousCount) break;
      previousCount = current;
      await this.page.waitForTimeout(250);
    }

    // See SizePage.findExactPickerRow()'s doc: a bounded per-row read means
    // one row that never resolves (count can shift mid-scan on a search
    // that returns several matches) just gets skipped, not a full-minute hang.
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
    return dataRows.first();
  }

  async fillDescription(description: string): Promise<void> {
    await this.locators.descriptionInput.fill(description);
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

  /** Clicks "Deactivate <ColorID>" in the Edit dialog header. */
  async deactivate(): Promise<void> {
    await this.locators.deactivateButton.click();
  }

  /** Re-checks the "Status" checkbox and saves — the only reactivation path (TC:7, reuses the generic edit-save toast). */
  async reactivate(): Promise<void> {
    await this.locators.statusCheckbox.check();
    // Confirmed-live flake on a loaded dev environment: saving immediately
    // after .check() can occasionally race the component's own state
    // update, saving before the checkbox's new value has actually taken
    // effect. Asserting the checked state first is a stronger guarantee
    // than trusting .check() alone to have fully settled.
    await expect(this.locators.statusCheckbox).toBeChecked();
    await this.saveChanges();
  }

  /** Real toast text confirmed live: "Color created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Color created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Color updated." (also shown after a reactivate — see reactivate()). */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Color updated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Color deactivated." */
  async expectDeactivatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Color deactivated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Real toast text confirmed live on a duplicate Color Code submit: a
   * generic "Failed to create color." — the backend's actual
   * `409 color_conflict` reason (naming the exact code + category) is
   * never surfaced to the user. Asserting this exact generic text on
   * purpose (see TC:11's bug note).
   */
  async expectCreateFailed(): Promise<void> {
    await expect(this.page.getByText('Failed to create color.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.locators.formDialog.getByText(message).first()).toBeVisible();
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError()).toHaveCount(count);
  }

  /** Searches by colorId first — see openRow()'s doc for why. */
  async expectRowVisible(colorId: string): Promise<void> {
    await this.search(colorId);
    await expect(this.locators.row(colorId)).toBeVisible();
  }

  async expectRowNotVisible(colorId: string): Promise<void> {
    await this.search(colorId);
    await expect(this.locators.row(colorId)).toHaveCount(0);
  }

  /** Reads the Status cell text for a given Color ID row, e.g. "Active"/"Inactive". */
  async rowStatus(colorId: string): Promise<string> {
    return (await this.locators.row(colorId).getByRole('cell').last().innerText()).trim();
  }

  /**
   * Asserts a main-grid row containing `text` is visible — e.g. the
   * uppercased Color Code right after creation, or an updated Description.
   * Caller is expected to have already narrowed via search().
   */
  async expectRowWithTextVisible(text: string): Promise<void> {
    await expect(this.locators.rowContainingText(text)).toBeVisible();
  }

  /** Opens the (first) main-grid row whose text contains `text` — e.g. a just-searched, uppercased Color Code. */
  async openRowByText(text: string): Promise<void> {
    await this.locators.rowContainingText(text).first().click();
  }

  /** Reads the Color ID (2nd gridcell) from the main-grid row matching `text` — call after search() has narrowed to exactly one match. */
  async colorIdFromRowText(text: string): Promise<string> {
    return (
      await this.locators.rowContainingText(text).getByRole('cell').nth(1).innerText()
    ).trim();
  }
}
