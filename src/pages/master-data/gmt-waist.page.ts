import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { GmtWaistLocators } from '../../locators/master-data/gmt-waist.locators';

const GMT_WAIST_LIST_PATH = '/master-data/system-management/gmt-waist';

export interface WaistFieldValues {
  /**
   * Confirmed live: capped at 5 characters (`maxlength="5"`), plain free
   * text with no numeric validation at all — negative numbers, zero,
   * decimals and letters are all accepted and saved verbatim.
   */
  code?: string;
  /** Confirmed live: capped at 50 characters (`maxlength="50"`). */
  description?: string;
}

/**
 * GMT Waist Master — list and its Create/Edit dialog in one page object,
 * since both live on the same screen (the dialog opens on top of the
 * list, there's no separate route). Real route:
 * /master-data/system-management/gmt-waist. Owned by the Master Data QA
 * (shared module). Element locators live in GmtWaistLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 *
 * Confirmed live (2026-10-06): same as GMT Inseam Master, there is no
 * reachable status-change/deactivate flow here — row-selection shows no
 * Approve/Deactivate actions, right-click produces no context menu, and
 * "Configure columns" confirms there's no hidden Status column, despite
 * the list exposing Draft/Approved/Inactive/Rejected tabs. No
 * status-change methods are provided here for that reason.
 */
export class GmtWaistPage extends BasePage {
  readonly locators: GmtWaistLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new GmtWaistLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(GMT_WAIST_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newWaistButton).toBeVisible();
  }

  async openNew(): Promise<void> {
    await this.locators.newWaistButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Double-click is the confirmed-live way to open a row's Edit Waist dialog. */
  async openEdit(code: string): Promise<void> {
    await this.locators.row(code).dblclick();
    await expect(this.locators.dialog).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  async fillRequired(values: WaistFieldValues): Promise<void> {
    if (values.code !== undefined) await this.locators.codeInput.fill(values.code);
    if (values.description !== undefined) await this.locators.descriptionInput.fill(values.description);
  }

  /**
   * Confirmed live: same as GMT Inseam Master, this modal dialog's
   * Create/Save button is NOT obstructed by the floating "Ask FloorOS AI"
   * button, so a plain click is sufficient — no Vendor-style workaround
   * needed.
   */
  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async save(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectRequiredError(fieldAnchor: 'code' | 'description'): Promise<void> {
    const anchor = fieldAnchor === 'code' ? this.locators.codeInput : this.locators.descriptionInput;
    await expect(this.locators.requiredErrorFor(anchor)).toHaveText(/required/i);
  }

  /** Real toast text confirmed live: "Waist created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Waist created.')).toBeVisible({ timeout: 15_000 });
  }

  /** Real toast text confirmed live: "Waist updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Waist updated.')).toBeVisible({ timeout: 15_000 });
  }

  /** Real toast text confirmed live for a duplicate code: specific and actionable, unlike Vendor Master's. */
  async expectDuplicateCodeError(): Promise<void> {
    await expect(
      this.page.getByText('A waist with this code already exists. Use a different code.'),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectRowVisible(code: string): Promise<void> {
    await expect(this.locators.row(code)).toBeVisible({ timeout: 15_000 });
  }

  async expectDialogClosed(): Promise<void> {
    await expect(this.locators.dialog).toBeHidden();
  }

  async expectCodeFieldDisabled(): Promise<void> {
    await expect(this.locators.codeInput).toBeDisabled();
  }
}
