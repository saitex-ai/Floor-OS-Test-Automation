import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for a BOM's detail page (/bom/<code>/<rev>) — its
 * header, toolbar, lifecycle dialogs, revisions picker and report menus.
 * The items table and its dialogs live in BomItemsLocators. No actions or
 * assertions here, see src/pages/bom/bom-detail.page.ts for those.
 *
 * The page has no <h1>: the breadcrumb ("Bill of Materials › {customer} ›
 * {code} · Rev 00") is what identifies it.
 *
 * Which lifecycle buttons render is driven by status, item count and
 * revision (confirmed live on uat 2026-10-08, and in the UAT build's
 * bom-detail-content.tsx): an Open BOM with at least one item shows
 * "Costing Approve" on rev 0 and "Validate & Lock" on any later rev; an
 * Approved BOM shows Reopen / Mark complete / Create Revision / Create
 * Costing Request instead.
 */
export class BomDetailLocators {
  readonly main: Locator;
  readonly breadcrumb: Locator;
  readonly backButton: Locator;
  readonly refreshButton: Locator;
  readonly openLatestButton: Locator;
  readonly bomCodeButton: Locator;
  readonly revNoButton: Locator;

  // Approved + locked state
  readonly lockedStatus: Locator;
  readonly lockedBanner: Locator;
  readonly completedCheckbox: Locator;
  readonly notCompletedIcon: Locator;

  // Toolbar
  readonly addLineButton: Locator;
  readonly bulkPasteButton: Locator;
  readonly copyBomButton: Locator;
  readonly copySplitDetailButton: Locator;
  readonly copySplitDetailRevNoButton: Locator;
  readonly costingApproveButton: Locator;
  readonly validateAndLockButton: Locator;
  readonly reopenButton: Locator;
  readonly markCompleteButton: Locator;
  readonly markNotCompleteButton: Locator;
  readonly createRevisionButton: Locator;
  readonly createCostingRequestButton: Locator;

  readonly itemsTab: Locator;
  readonly splitDetailsTab: Locator;
  readonly threadItemsTab: Locator;

  // Lifecycle confirm dialogs (all share one confirm-dialog component)
  readonly costingApproveDialog: Locator;
  readonly validateAndLockDialog: Locator;
  readonly completeDialog: Locator;
  readonly createRevisionDialog: Locator;

  // Reopen dialog
  readonly reopenDialog: Locator;
  readonly reopenReasonInput: Locator;
  readonly reopenSubmitButton: Locator;
  readonly reopenCancelButton: Locator;

  // "Create costing request" dialog
  readonly costingRequestDialog: Locator;
  readonly costingRequestWashTypes: Locator;
  readonly costingRequestQuantity: Locator;
  readonly costingRequestSubmitButton: Locator;
  readonly costingRequestCancelButton: Locator;

  // Revisions picker (opened by the "B.O.M Rev No." button)
  readonly revisionsDialog: Locator;
  readonly revisionsSummary: Locator;
  readonly revisionRows: Locator;

  // Reports / Export menus
  readonly reportsButton: Locator;
  readonly reportsMenu: Locator;
  readonly bomReportItem: Locator;
  readonly thdReportItem: Locator;
  readonly trimCardItem: Locator;
  readonly exportButton: Locator;
  readonly exportMenu: Locator;

  // Toasts (sonner, inside the shell's "Notifications" live region)
  readonly toasts: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main').first();
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.refreshButton = page.getByRole('button', { name: 'Refresh', exact: true });
    this.openLatestButton = page.getByRole('button', { name: 'Open latest' });
    this.bomCodeButton = this.main.getByTitle('Search and switch to a different BOM');
    this.revNoButton = this.main.getByTitle('Browse all revisions of this techpack');

    this.lockedStatus = page.getByText('LOCKED', { exact: true });
    this.lockedBanner = page.getByText(/^BOM locked — snapshot v\d+\.$/);
    this.completedCheckbox = page.getByRole('checkbox', { name: /^Mark (not )?completed$/ });
    this.notCompletedIcon = page.getByRole('img', { name: 'Not completed' });

    this.addLineButton = page.getByRole('button', { name: /Add line$/ }).first();
    this.bulkPasteButton = page.getByRole('button', { name: 'Bulk paste' });
    this.copyBomButton = page.getByRole('button', { name: 'Copy B.O.M', exact: true });
    this.copySplitDetailButton = page.getByRole('button', {
      name: 'Copy B.O.M Split Detail',
      exact: true,
    });
    this.copySplitDetailRevNoButton = page.getByRole('button', {
      name: 'Copy B.O.M Split Detail Rev No',
    });
    this.costingApproveButton = page.getByRole('button', { name: 'Costing Approve', exact: true });
    this.validateAndLockButton = page.getByRole('button', { name: 'Validate & Lock', exact: true });
    // "Reopen" shows twice on an Approved BOM — in the lock banner and the toolbar.
    this.reopenButton = page.getByRole('button', { name: 'Reopen', exact: true }).first();
    this.markCompleteButton = page.getByRole('button', { name: 'Mark complete', exact: true });
    this.markNotCompleteButton = page.getByRole('button', {
      name: 'Mark not complete',
      exact: true,
    });
    this.createRevisionButton = page.getByRole('button', { name: 'Create Revision', exact: true });
    this.createCostingRequestButton = page.getByRole('button', { name: 'Create Costing Request' });

    this.itemsTab = page.getByRole('button', { name: /^B\.O\.M Items/ });
    this.splitDetailsTab = page.getByRole('button', { name: /^Split Details/ });
    this.threadItemsTab = page.getByRole('button', { name: /^Thread Items/ });

    this.costingApproveDialog = page.getByRole('dialog', { name: 'Costing Approve' });
    this.validateAndLockDialog = page.getByRole('dialog', { name: 'Validate & Lock BOM' });
    this.completeDialog = page.getByRole('dialog', { name: 'BOM Completed' });
    this.createRevisionDialog = page.getByRole('dialog', { name: 'Create Revision' });

    this.reopenDialog = page.getByRole('dialog', { name: 'Re-Open BOM' });
    this.reopenReasonInput = this.reopenDialog.getByRole('textbox', { name: /Reason/ });
    this.reopenSubmitButton = this.reopenDialog.getByRole('button', { name: 'Re-Open' });
    this.reopenCancelButton = this.reopenDialog.getByRole('button', { name: 'Cancel' });

    this.costingRequestDialog = page.getByRole('dialog', { name: 'Create costing request' });
    this.costingRequestWashTypes = this.costingRequestDialog.getByRole('button', {
      name: 'Wash types',
    });
    this.costingRequestQuantity = this.costingRequestDialog.getByRole('textbox', {
      name: /Estimated quantity/,
    });
    this.costingRequestSubmitButton = this.costingRequestDialog.getByRole('button', {
      name: 'Create request',
    });
    this.costingRequestCancelButton = this.costingRequestDialog.getByRole('button', {
      name: 'Cancel',
    });

    this.revisionsDialog = page.getByRole('dialog', { name: 'Select BOM revision' });
    this.revisionsSummary = this.revisionsDialog.getByText(
      /^\d+ of \d+ revisions? — click to open\.$/,
    );
    this.revisionRows = this.revisionsDialog.getByRole('table').locator('tbody').getByRole('row');

    this.reportsButton = page.getByRole('button', { name: 'Reports' });
    this.reportsMenu = page.getByRole('menu', { name: 'BOM reports' });
    this.bomReportItem = this.reportsMenu.getByRole('menuitem', { name: 'BOM Report' });
    this.thdReportItem = this.reportsMenu.getByRole('menuitem', { name: 'THD Report' });
    this.trimCardItem = this.reportsMenu.getByRole('menuitem', { name: 'Trim Card' });
    this.exportButton = page.getByRole('button', { name: 'Export', exact: true });
    this.exportMenu = page.getByRole('menu').filter({ hasText: 'Trim Card' });

    this.toasts = page.getByRole('region', { name: /^Notifications/ }).getByRole('listitem');
  }

  /** A confirm dialog's own action button, e.g. "Approve" in "Costing Approve". */
  dialogButton(dialog: Locator, name: string): Locator {
    return dialog.getByRole('button', { name, exact: true });
  }

  /** A toast whose text matches. */
  toast(text: string | RegExp): Locator {
    return this.toasts.filter({ hasText: text });
  }

  /** The revisions picker row for a given rev number ("rev 1"). */
  revisionRow(revNo: number): Locator {
    // Cell texts run together in the row's text ("rev 1DRAFT"), so no \b after the number.
    return this.revisionRows.filter({ hasText: new RegExp(`\\brev ${revNo}(?!\\d)`) });
  }
}
