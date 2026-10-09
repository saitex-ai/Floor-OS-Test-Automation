import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { TechpackTypeLocators } from '../../locators/master-data/techpack-type.locators';

export interface TechpackTypeFieldValues {
  code: string;
  name: string;
  /** "Skip demand/forecast validation" — defaults to unchecked. */
  skipDemandValidation?: boolean;
}

/**
 * The top-level Master Data module's Techpack Type screen
 * (/master-data/system-management/techpack-types). Owned by the Master
 * Data QA (shared module). Element locators live in TechpackTypeLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 *
 * Confirmed live against dev (2026-10-06) — see
 * test-cases/master-data/techpack-type/techpack-type-testcases.md for the
 * full narrative this page object is built from, including two real app
 * quirks baked into the methods/comments below rather than papered over:
 *
 * 1. A brand-new record created through "New Techpack Type" saves
 *    directly as **Approved**, bypassing the Draft/Review workflow this
 *    screen otherwise shows for its seeded data entirely.
 * 2. There is no confirmed way to reactivate an Inactive record — the
 *    Edit modal's icon button is always labeled/behaves as "Deactivate
 *    <code>", even when the record is already Inactive.
 */
export class TechpackTypePage extends BasePage {
  readonly locators: TechpackTypeLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new TechpackTypeLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/techpack-types');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newTechpackTypeButton).toBeVisible();
  }

  async selectTab(name: 'All' | 'Draft' | 'Approved' | 'Inactive' | 'Rejected'): Promise<void> {
    await this.locators.tab(name).click();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning — same fix as SizePage/ColorPage/UomPage: this grid
   * only renders a bounded window of rows, so a just-created row can be
   * completely absent from the DOM on the unfiltered list, and searching
   * for it immediately after creation can race the grid's own re-fetch.
   */
  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
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

  async openCreateModal(): Promise<void> {
    await this.locators.newTechpackTypeButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Fills Code/Name (and optionally the checkbox) in whichever dialog is currently open (New or Edit). */
  async fillForm(values: Partial<TechpackTypeFieldValues>): Promise<void> {
    if (values.code !== undefined) await this.locators.codeInput.fill(values.code);
    if (values.name !== undefined) await this.locators.nameInput.fill(values.name);
    if (values.skipDemandValidation) {
      await this.locators.skipDemandValidationCheckbox.click();
    }
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Discards the open dialog without saving (works for both New and Edit). */
  async closeDialog(): Promise<void> {
    await this.locators.closeButton.click();
  }

  /** Searches by codeOrName first when it's a plain string — see search()'s doc on why. */
  async openRowForEdit(codeOrName: string | RegExp): Promise<void> {
    if (typeof codeOrName === 'string') await this.search(codeOrName);
    await this.locators.row(codeOrName).click();
    await expect(this.locators.dialog).toBeVisible();
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  /**
   * Clicks the Edit modal's "Deactivate <code>" icon button. No
   * confirmation dialog — the status flips immediately (confirmed live).
   * Must be called with the record's own Edit modal already open.
   */
  async deactivate(): Promise<void> {
    await this.locators.deactivateIconButton.click();
  }

  /** Clicks "Delete <code>" then confirms on the nested "Delete <code>? ... cannot be undone." dialog. */
  async deleteRecord(): Promise<void> {
    await this.locators.deleteIconButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmButton.click();
  }

  // ---- Assertions -------------------------------------------------------

  /** Real toast text confirmed live: "Techpack type created" (no trailing period). */
  async expectCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Techpack type created', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Techpack type updated" (no trailing period). */
  async expectUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Techpack type updated', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Techpack type deactivated" (no trailing period). */
  async expectDeactivatedToast(): Promise<void> {
    await expect(this.page.getByText('Techpack type deactivated', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Techpack type deleted" (no trailing period). */
  async expectDeletedToast(): Promise<void> {
    await expect(this.page.getByText('Techpack type deleted', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real error toast text confirmed live (the one toast on this screen that DOES carry a period). */
  async expectDuplicateCodeError(): Promise<void> {
    await expect(
      this.page.getByText('That techpack type code already exists.', { exact: true }),
    ).toBeVisible();
  }

  async expectRequiredError(): Promise<void> {
    await expect(this.locators.requiredError.first()).toBeVisible();
  }

  /**
   * Searches by codeOrName first when it's a plain string (the grid only
   * renders a bounded row window — see search()'s doc) before checking
   * visibility. A RegExp can't be typed into the search box, so those
   * callers must already be on a filtered/narrow enough view.
   */
  async expectRowVisible(codeOrName: string | RegExp): Promise<void> {
    // Retries the search itself, not just the visibility check — a rapid
    // second create right after a first one can outrun the backend's own
    // indexing, so a single settle-then-check (search()'s normal wait)
    // isn't always enough (confirmed live on back-to-back creates).
    await expect(async () => {
      if (typeof codeOrName === 'string') await this.search(codeOrName);
      await expect(this.locators.row(codeOrName)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async expectRowNotVisible(codeOrName: string | RegExp): Promise<void> {
    if (typeof codeOrName === 'string') await this.search(codeOrName);
    await expect(this.locators.row(codeOrName)).toHaveCount(0);
  }

  async expectRowStatus(codeOrName: string | RegExp, status: string): Promise<void> {
    if (typeof codeOrName === 'string') await this.search(codeOrName);
    await expect(this.locators.statusCell(codeOrName)).toHaveText(status);
  }
}
