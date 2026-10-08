import { type Download, type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { BomDetailLocators } from '../../locators/bom/bom-detail.locators';
import { BOM_PATH } from './bom-list.page';

/** The BOM detail header's labelled fields, as their visible labels read (without the colon). */
export type BomHeaderField =
  | 'B.O.M Code'
  | 'B.O.M Rev No.'
  | 'Customer'
  | 'Season'
  | 'Description'
  | 'B.O.M Status'
  | 'Style'
  | 'Fabric'
  | 'Wash'
  | 'Product Type'
  | 'Lock Status'
  | 'B.O.M Completed'
  | 'Created Date'
  | 'Created by'
  | 'Approved Date'
  | 'Approved By';

const HEADER_FIELDS: readonly BomHeaderField[] = [
  'B.O.M Code',
  'B.O.M Rev No.',
  'Customer',
  'Season',
  'Description',
  'B.O.M Status',
  'Style',
  'Fabric',
  'Wash',
  'Product Type',
  'Lock Status',
  'B.O.M Completed',
  'Created Date',
  'Created by',
  'Approved Date',
  'Approved By',
];

/** Report kinds and formats offered by the toolbar's "Export" menu, in menu order. */
export type BomReportKind = 'BOM Report' | 'THD Report' | 'Trim Card';
export type BomExportFormat = 'PDF' | 'HTML' | 'Excel (.xlsx)' | 'CSV' | 'Word (.doc)';
const REPORT_KINDS: readonly BomReportKind[] = ['BOM Report', 'THD Report', 'Trim Card'];

/**
 * A BOM's detail page (/bom/<code>/<rev>): header, toolbar and lifecycle.
 * Owned by the BOM QA. Element locators live in BomDetailLocators
 * (`this.locators`); the items table is BomItemsPage.
 */
export class BomDetailPage extends BasePage {
  readonly locators: BomDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new BomDetailLocators(page);
  }

  /**
   * Navigates directly to a BOM by code + rev. Pass the rev explicitly —
   * a techpack can have several BOM revisions, and rev 0 is usually an
   * old, Approved and locked one once later revisions exist.
   */
  async open(code: string, revNo: number): Promise<void> {
    await this.gotoAuthenticated(`${BOM_PATH}/${code}/${revNo}`);
    await this.expectOpenFor(code, revNo);
  }

  async expectOpenFor(code: string, revNo?: number): Promise<void> {
    const rev = revNo === undefined ? '\\d+' : String(revNo);
    await expect(this.page).toHaveURL(new RegExp(`${BOM_PATH}/${code}/${rev}$`));
    await expect(this.locators.breadcrumb).toContainText(code);
    if (revNo !== undefined) {
      await expect(this.locators.breadcrumb).toContainText(`Rev ${String(revNo).padStart(2, '0')}`);
    }
    // The header fields render once the detail call resolves.
    await expect(this.locators.main.getByText('Lock Status:')).toBeVisible();
  }

  async back(): Promise<void> {
    await this.locators.backButton.click();
  }

  /** Re-reads the BOM from the server, the way a user would to confirm a change stuck. */
  async refresh(): Promise<void> {
    await this.locators.refreshButton.click();
    await expect(this.locators.main.getByText('Lock Status:')).toBeVisible();
  }

  /**
   * A header field's value, e.g. headerField('Customer') → "NIKE". Each
   * label and its value are separate elements in reading order, so this
   * reads the header's own text and takes the line after the label ("—"
   * or "" when a field is empty).
   */
  async headerField(field: BomHeaderField): Promise<string> {
    const lines = (await this.locators.main.innerText())
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const isLabel = (line: string) =>
      HEADER_FIELDS.some((f) => line.replace(/^\*/, '') === `${f}:`);
    const index = lines.findIndex((l) => l.replace(/^\*/, '') === `${field}:`);
    if (index < 0) throw new Error(`No "${field}" field on the BOM header`);
    const next = lines[index + 1] ?? '';
    return isLabel(next) ? '' : next;
  }

  /** The status pill next to "Last edited" ("Open" / "Approved"). */
  async status(): Promise<string> {
    return this.headerField('B.O.M Status');
  }

  async expectStatus(status: 'Open' | 'Approved'): Promise<void> {
    await expect.poll(() => this.status()).toBe(status);
  }

  async expectLockedApproved(): Promise<void> {
    await expect(this.locators.lockedStatus).toBeVisible();
    await expect(this.locators.reopenButton).toBeVisible();
    await expect(this.locators.addLineButton).toHaveCount(0);
  }

  /** Reads the live count out of the "B.O.M Items" tab's own name, e.g. "B.O.M Items 5" → 5. */
  async itemCount(): Promise<number> {
    const text = await this.locators.itemsTab.innerText();
    const match = text.match(/(\d+)/);
    if (!match) throw new Error(`Could not read an item count out of tab text "${text}"`);
    return Number(match[1]);
  }

  async expectItemCount(count: number): Promise<void> {
    await expect.poll(() => this.itemCount()).toBe(count);
  }

  /** Texts of the toasts currently on screen (newest last). */
  async toastTexts(): Promise<string[]> {
    return (await this.locators.toasts.allInnerTexts()).map((t) => t.trim());
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.locators.toast(text).first()).toBeVisible();
  }

  // ---- Lifecycle ----

  /** Clicks a lifecycle action and waits for its confirm dialog. */
  private async openConfirm(button: Locator, dialog: Locator): Promise<void> {
    await button.click();
    await expect(dialog).toBeVisible();
  }

  /** Confirms an open lifecycle dialog and waits for the header to reach the expected status. */
  private async confirm(
    dialog: Locator,
    confirmLabel: string,
    expected?: 'Open' | 'Approved',
  ): Promise<void> {
    await this.locators.dialogButton(dialog, confirmLabel).click();
    await expect(dialog).toBeHidden();
    if (expected) await this.expectStatus(expected);
  }

  async openCostingApproveDialog(): Promise<void> {
    await this.openConfirm(this.locators.costingApproveButton, this.locators.costingApproveDialog);
  }

  async cancelCostingApproveDialog(): Promise<void> {
    await this.locators.dialogButton(this.locators.costingApproveDialog, 'Cancel').click();
    await expect(this.locators.costingApproveDialog).toBeHidden();
  }

  /** Rev 0's approve action ("Costing Approve" → "Approve"). */
  async costingApprove(): Promise<void> {
    await this.openCostingApproveDialog();
    await this.confirm(this.locators.costingApproveDialog, 'Approve', 'Approved');
  }

  async openValidateAndLockDialog(): Promise<void> {
    await this.openConfirm(
      this.locators.validateAndLockButton,
      this.locators.validateAndLockDialog,
    );
  }

  /** A later revision's approve action ("Validate & Lock" → "Validate & Lock"). */
  async validateAndLock(): Promise<void> {
    await this.openValidateAndLockDialog();
    await this.confirm(this.locators.validateAndLockDialog, 'Validate & Lock', 'Approved');
  }

  async openCompleteDialog(complete: boolean): Promise<void> {
    await this.openConfirm(
      complete ? this.locators.markCompleteButton : this.locators.markNotCompleteButton,
      this.locators.completeDialog,
    );
  }

  /** "Mark complete" → "Complete", or "Mark not complete" → "Un-tick". */
  async setCompleted(complete: boolean): Promise<void> {
    await this.openCompleteDialog(complete);
    await this.confirm(this.locators.completeDialog, complete ? 'Complete' : 'Un-tick');
    await expect(
      complete ? this.locators.markNotCompleteButton : this.locators.markCompleteButton,
    ).toBeVisible();
  }

  /** Opens the Reopen dialog (from the toolbar's own "Reopen" button on an Approved BOM). */
  async openReopenDialog(): Promise<void> {
    await this.openConfirm(this.locators.reopenButton, this.locators.reopenDialog);
  }

  async cancelReopenDialog(): Promise<void> {
    await this.locators.reopenCancelButton.click();
    await expect(this.locators.reopenDialog).toBeHidden();
  }

  /** Submits Reopen with a reason, without waiting on any particular outcome. */
  async submitReopen(reason: string): Promise<void> {
    await this.openReopenDialog();
    await this.locators.reopenReasonInput.fill(reason);
    await this.locators.reopenSubmitButton.click();
    await expect(this.locators.reopenDialog).toBeHidden();
  }

  async reopen(reason: string): Promise<void> {
    await this.submitReopen(reason);
    await this.expectStatus('Open');
  }

  async openCreateRevisionDialog(): Promise<void> {
    await this.openConfirm(this.locators.createRevisionButton, this.locators.createRevisionDialog);
  }

  /** Submits "Create Revision", without waiting on any particular outcome. */
  async submitCreateRevision(): Promise<void> {
    await this.openCreateRevisionDialog();
    await this.locators.dialogButton(this.locators.createRevisionDialog, 'Create Revision').click();
    await expect(this.locators.createRevisionDialog).toBeHidden();
  }

  async openCostingRequestDialog(): Promise<void> {
    await this.openConfirm(
      this.locators.createCostingRequestButton,
      this.locators.costingRequestDialog,
    );
  }

  async cancelCostingRequestDialog(): Promise<void> {
    await this.locators.costingRequestCancelButton.click();
    await expect(this.locators.costingRequestDialog).toBeHidden();
  }

  // ---- Revisions ----

  async openRevisionsPicker(): Promise<void> {
    await this.locators.revNoButton.click();
    await expect(this.locators.revisionsDialog).toBeVisible();
    await expect(this.locators.revisionRows.first()).toBeVisible();
  }

  async closeRevisionsPicker(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.revisionsDialog).toBeHidden();
  }

  /** A revision row's status as the picker shows it (e.g. "DRAFT", "VALIDATED"). */
  async revisionStatus(revNo: number): Promise<string> {
    const text = await this.locators.revisionRow(revNo).innerText();
    const match = text.match(/\b(DRAFT|VALIDATED|COMPLETED|CANCELLED)\b/);
    return match?.[1] ?? text;
  }

  async openRevisionFromPicker(revNo: number, code: string): Promise<void> {
    await this.locators.revisionRow(revNo).click();
    await this.expectOpenFor(code, revNo);
  }

  // ---- Reports / Export ----

  async openReportsMenu(): Promise<void> {
    await this.locators.reportsButton.click();
    await expect(this.locators.reportsMenu).toBeVisible();
  }

  async closeReportsMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.reportsMenu).toBeHidden();
  }

  async openExportMenu(): Promise<void> {
    await this.locators.exportButton.click();
    await expect(this.locators.exportMenu).toBeVisible();
  }

  async closeExportMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.exportMenu).toBeHidden();
  }

  /** The export formats listed under one report kind in the open Export menu. */
  async exportFormatsFor(kind: BomReportKind): Promise<string[]> {
    const items = await this.locators.exportMenu.getByRole('menuitem').allInnerTexts();
    const perKind = items.length / REPORT_KINDS.length;
    const start = REPORT_KINDS.indexOf(kind) * perKind;
    return items.slice(start, start + perKind).map((t) => t.trim());
  }

  /** Exports one report in a downloadable format and returns the download. */
  async exportReport(kind: BomReportKind, format: BomExportFormat): Promise<Download> {
    await this.openExportMenu();
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30_000 });
    await this.locators.exportMenu
      .getByRole('menuitem', { name: format, exact: true })
      .nth(REPORT_KINDS.indexOf(kind))
      .click();
    return downloadPromise;
  }
}
