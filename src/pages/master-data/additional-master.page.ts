import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AdditionalMasterLocators } from '../../locators/master-data/additional-master.locators';

export interface AdditionalMasterFieldValues {
  code?: string;
  description?: string;
}

/**
 * The "Additional Master" screen under Master Data > Inventory Item
 * Management (/master-data/inventory-item-management/additional-master).
 * Reached via a nav group ("Inventory Item Management") that is collapsed
 * by default — this page object navigates straight to the URL rather than
 * expanding the nav, same as the live exploration behind this module's
 * test-case doc did. Owned by the Master Data QA (shared module). Element
 * locators live in AdditionalMasterLocators (`this.locators`) — this class
 * only holds flows/actions/assertions built on top of them.
 *
 * Confirmed live against dev (2026-10-08) — see
 * test-cases/master-data/additional-master/additional-master-testcases.md
 * for the full narrative, including the real, confirmed quirk baked into
 * deleteRecord() below rather than papered over: this module has no
 * deactivate/soft-delete state at all, only a genuine permanent Delete.
 */
export class AdditionalMasterPage extends BasePage {
  readonly locators: AdditionalMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AdditionalMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/inventory-item-management/additional-master');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newAdditionalButton).toBeVisible();
  }

  async selectTab(name: 'All' | 'Active' | 'Inactive'): Promise<void> {
    await this.locators.tab(name).click();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning — same fix as this repo's other Master Data grids
   * (e.g. TechpackTypePage.search()): a just-created row can race the
   * grid's own re-fetch if checked immediately after fill().
   */
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

  async openCreateDialog(): Promise<void> {
    await this.locators.newAdditionalButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Fills Code/Description in whichever dialog is currently open (New or Edit). */
  async fillForm(values: AdditionalMasterFieldValues): Promise<void> {
    if (values.code !== undefined) await this.locators.codeInput.fill(values.code);
    if (values.description !== undefined)
      await this.locators.descriptionInput.fill(values.description);
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Discards the open dialog without saving (works for both New and Edit). */
  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Searches by codeOrDescription first when it's a plain string, then opens that row's Edit dialog. */
  async openRowForEdit(codeOrDescription: string | RegExp): Promise<void> {
    if (typeof codeOrDescription === 'string') await this.search(codeOrDescription);
    await this.locators.row(codeOrDescription).click();
    await expect(this.locators.dialog).toBeVisible();
    await expect(this.locators.saveChangesButton).toBeVisible();
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  /**
   * Clicks the Edit dialog's "Delete <ID>" button then confirms on the
   * nested "Delete <ID>? ... This permanently deletes <ID>. This action
   * cannot be undone." alertdialog. Must be called with the record's own
   * Edit dialog already open. Confirmed live: this is a genuine hard
   * delete — the record disappears entirely, there is no Inactive landing
   * state (see the test-case file's Notes for the full confirmation).
   */
  async deleteRecord(): Promise<void> {
    await this.locators.deleteButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmButton.click();
  }

  // ---- Assertions -------------------------------------------------------

  /** Real toast text confirmed live: "Additional master created." */
  async expectCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Additional master created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Additional master updated." */
  async expectUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Additional master updated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Additional master deleted." */
  async expectDeletedToast(): Promise<void> {
    await expect(this.page.getByText('Additional master deleted.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live — a toast, not an inline field error. */
  async expectDuplicateError(): Promise<void> {
    await expect(
      this.page.getByText('A record with this code or name already exists.', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectRequiredError(): Promise<void> {
    await expect(this.locators.requiredError.first()).toBeVisible();
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError).toHaveCount(count);
  }

  /**
   * Searches by codeOrDescription first when it's a plain string (see
   * search()'s doc on why) before checking visibility, retrying the whole
   * search+check since a rapid create can outrun the backend's own
   * indexing (same pattern as TechpackTypePage.expectRowVisible()).
   */
  async expectRowVisible(codeOrDescription: string | RegExp): Promise<void> {
    await expect(async () => {
      if (typeof codeOrDescription === 'string') await this.search(codeOrDescription);
      await expect(this.locators.row(codeOrDescription)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  }

  async expectRowNotVisible(codeOrDescription: string | RegExp): Promise<void> {
    if (typeof codeOrDescription === 'string') await this.search(codeOrDescription);
    await expect(this.locators.row(codeOrDescription)).toHaveCount(0);
  }

  /** True once a record exists — Code/ID are both `disabled` on the Edit dialog, only Description can change. */
  async expectCodeAndIdDisabledOnEdit(): Promise<void> {
    await expect(this.locators.idInput).toBeDisabled();
    await expect(this.locators.codeInput).toBeDisabled();
  }
}
