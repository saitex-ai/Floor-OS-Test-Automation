import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { GmtInseamLocators } from '../../locators/master-data/gmt-inseam.locators';

const GMT_INSEAM_LIST_PATH = '/master-data/system-management/gmt-inseam';

export interface InseamFieldValues {
  /** Confirmed live: capped at 5 characters (`maxlength="5"`), plain free text — no numeric validation. */
  code?: string;
  /** Confirmed live: capped at 50 characters (`maxlength="50"`). */
  description?: string;
}

/**
 * GMT Inseam Master — list and its Create/Edit dialog in one page object,
 * since both live on the same screen (the dialog opens on top of the
 * list, there's no separate route). Real route:
 * /master-data/system-management/gmt-inseam. Owned by the Master Data QA
 * (shared module). Element locators live in GmtInseamLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 *
 * Confirmed live (2026-10-06): unlike Vendor Master, there is no
 * reachable status-change/deactivate flow here — selecting a row's
 * checkbox shows no Approve/Deactivate actions, and "Configure columns"
 * confirms there's no hidden Status column (only Code + Description
 * exist), despite the list exposing Draft/Approved/Inactive/Rejected
 * tabs. No status-change methods are provided here for that reason.
 */
export class GmtInseamPage extends BasePage {
  readonly locators: GmtInseamLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new GmtInseamLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(GMT_INSEAM_LIST_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.newInseamButton).toBeVisible();
  }

  async openNew(): Promise<void> {
    await this.locators.newInseamButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Double-click is the confirmed-live way to open a row's Edit Inseam dialog. */
  async openEdit(code: string): Promise<void> {
    await this.locators.row(code).dblclick();
    await expect(this.locators.dialog).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  async fillRequired(values: InseamFieldValues): Promise<void> {
    if (values.code !== undefined) await this.locators.codeInput.fill(values.code);
    if (values.description !== undefined)
      await this.locators.descriptionInput.fill(values.description);
  }

  /**
   * Confirmed live: unlike Vendor Master's drawer, this modal dialog's
   * Create/Save button is NOT obstructed by the floating "Ask FloorOS AI"
   * button (the centered dialog sits above it), so a plain click is
   * sufficient here — no scrollIntoView/focus/Enter workaround needed.
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
    const anchor =
      fieldAnchor === 'code' ? this.locators.codeInput : this.locators.descriptionInput;
    await expect(this.locators.requiredErrorFor(anchor)).toHaveText(/required/i);
  }

  /** Real toast text confirmed live: "Inseam created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Inseam created.')).toBeVisible({ timeout: 15_000 });
  }

  /** Real toast text confirmed live: "Inseam updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Inseam updated.')).toBeVisible({ timeout: 15_000 });
  }

  /** Real toast text confirmed live for a duplicate code: specific and actionable, unlike Vendor Master's. */
  async expectDuplicateCodeError(): Promise<void> {
    await expect(
      this.page.getByText('An inseam with this code already exists. Use a different code.'),
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
