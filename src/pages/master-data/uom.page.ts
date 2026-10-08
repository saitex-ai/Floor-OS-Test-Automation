import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { UomLocators } from '../../locators/master-data/uom.locators';

const UOM_LIST_PATH = '/master-data/system-management/uom';

export interface UomFieldValues {
  /** UoM Code — max 5 characters (confirmed live via `maxlength`), and the real primary key. */
  code: string;
  /** Description — max 20 characters (confirmed live via `maxlength`). */
  description: string;
}

/**
 * Unit of Measure list + "New UoM"/"Edit UoM" dialog
 * (/master-data/system-management/uom). Owned by the Master Data QA
 * (shared module). Element locators live in UomLocators (`this.locators`)
 * — this class only holds flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/unit-of-measure/
 * unit-of-measure-testcases.md.
 */
export class UomPage extends BasePage {
  readonly locators: UomLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new UomLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(UOM_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newUomButton).toBeVisible();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning — see SizePage.search()'s identical doc for why: on a
   * loaded dev environment, searching for a UoM immediately after creating
   * it can otherwise race either the search's own debounce or the grid not
   * yet re-fetching.
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

  async openNewUom(): Promise<void> {
    await this.locators.newUomButton.click();
  }

  /**
   * Searches by uomCode first. Confirmed live: this grid only renders a
   * bounded window of rows — a just-created row can be completely absent
   * from the DOM on the unfiltered list once enough other rows exist (seen
   * directly: a real create succeeded, toast and all, but the row was
   * nowhere in the DOM dump until searched for), so opening a specific row
   * without first narrowing via Search is unreliable.
   */
  async openRow(uomCode: string): Promise<void> {
    await this.search(uomCode);
    await this.locators.row(uomCode).click();
  }

  /** Fills UoM Code and Description — both genuinely required (TC:8-9). */
  async fillRequired(values: UomFieldValues): Promise<void> {
    await this.locators.uomCodeInput.fill(values.code);
    await this.locators.descriptionInput.fill(values.description);
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

  /**
   * Clicks "Delete <code>" and confirms on the follow-up alertdialog — a
   * genuine, permanent hard delete (see UomLocators' class doc and TC:6).
   */
  async delete(): Promise<void> {
    await this.locators.deleteButton.click();
    await this.locators.confirmDeleteButton.click();
  }

  /** Opens the delete confirmation and backs out of it without deleting (TC:7). */
  async openDeleteThenCancel(): Promise<void> {
    await this.locators.deleteButton.click();
    await this.locators.cancelDeleteButton.click();
  }

  /** Real toast text confirmed live: "UoM created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('UoM created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "UoM updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('UoM updated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "UoM deleted." */
  async expectDeletedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('UoM deleted.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Real toast text confirmed live on a duplicate UoM Code submit: a
   * generic "Failed to create UoM." — the backend's actual `409
   * uom_conflict` reason is never surfaced to the user. Asserting this
   * exact generic text on purpose (see TC:10's bug note).
   */
  async expectCreateFailed(): Promise<void> {
    await expect(this.page.getByText('Failed to create UoM.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.locators.formDialog.getByText(message).first()).toBeVisible();
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError()).toHaveCount(count);
  }

  /** Searches by uomCode first — see openRow()'s doc for why. */
  async expectRowVisible(uomCode: string): Promise<void> {
    await this.search(uomCode);
    await expect(this.locators.row(uomCode)).toBeVisible();
  }

  async expectRowNotVisible(uomCode: string): Promise<void> {
    await this.search(uomCode);
    await expect(this.locators.row(uomCode)).toHaveCount(0);
  }

  /** Asserts a main-grid row containing `text` is visible — e.g. an updated Description. Caller is expected to have already narrowed via search(). */
  async expectRowWithTextVisible(text: string): Promise<void> {
    await expect(this.locators.rowContainingText(text)).toBeVisible();
  }

  /** Confirmed live: unlike Size/Color Master, this screen has no bulk "Upload" button (TC:1). */
  async expectNoUploadButton(): Promise<void> {
    await expect(this.locators.uploadButton()).toHaveCount(0);
  }
}
