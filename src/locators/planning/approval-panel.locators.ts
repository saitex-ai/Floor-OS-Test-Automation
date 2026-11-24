import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the approval panel on a Planning record's own page
 * (activity, recipe): Send for approval, the "Waiting for approval in APR-…"
 * banner, the approval chain and the decision buttons (Reject / Approve and
 * add levels / Approve / Withdraw) with their dialogs. Approvers decide here,
 * not on the request page. No actions or assertions here, see
 * src/pages/planning/approval-panel.page.ts.
 */
export class ApprovalPanelLocators {
  readonly heading: Locator;
  readonly sendForApprovalButton: Locator;
  readonly withdrawButton: Locator;
  readonly rejectButton: Locator;
  readonly approveAndAddLevelsButton: Locator;
  readonly approveButton: Locator;
  readonly editButton: Locator;
  readonly deleteDraftButton: Locator;
  readonly retireButton: Locator;
  /** "Waiting for approval in APR-2026-000057. It cannot be changed until the request is decided." */
  readonly pendingBanner: Locator;
  /** "Draft, returned from approval APR-…. Change it before sending it again." */
  readonly returnedBanner: Locator;
  /** "APR-2026-000057 Pending", "APR-… Rejected by Carol Planner", "APR-… Approved by …" */
  readonly requestStatus: Locator;
  /** "Approval chain L1 · QA L1 Reviewing Carol Pending → L2 · …" */
  readonly chain: Locator;
  readonly chainLabel: Locator;
  /** The record's own save button ("Save draft" / "Save changes") on its edit page. */
  readonly saveButton: Locator;
  /** The record page's main area, read whole with spacedText(). */
  readonly main: Locator;
  readonly noPolicyToast: Locator;
  readonly backToApproval: Locator;
  readonly dialog: Locator;
  readonly dialogConfirm: Locator;
  readonly rejectReason: Locator;
  readonly rejectReasonRule: Locator;
  readonly withdrawComment: Locator;
  readonly dialogWithdraw: Locator;
  readonly routeLevelName: Locator;
  readonly routeApprovers: Locator;
  readonly routeSubmit: Locator;
  readonly notificationsButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.sendForApprovalButton = page.getByRole('button', { name: 'Send for approval' });
    this.withdrawButton = page.getByRole('button', { name: 'Withdraw', exact: true });
    this.rejectButton = page.getByRole('button', { name: 'Reject', exact: true });
    this.approveAndAddLevelsButton = page.getByRole('button', {
      name: 'Approve and add levels',
      exact: true,
    });
    this.approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    this.editButton = page.getByRole('button', { name: /^Edit (activity|recipe|revision)$/ });
    this.deleteDraftButton = page.getByRole('button', { name: 'Delete draft' });
    this.retireButton = page.getByRole('button', { name: 'Retire', exact: true });
    this.pendingBanner = page.getByText(/^Waiting for approval in APR-\d{4}-\d{6}\./);
    this.returnedBanner = page.getByText(/^Draft, returned from approval APR-\d{4}-\d{6}\./);
    // The status row and the chain are rows of separate spans (code, status
    // badge, "by …", History) — read them with spacedText().
    this.requestStatus = page
      .locator('div')
      .filter({ has: page.getByRole('button', { name: 'History', exact: true }) })
      .filter({ has: page.getByText(/^APR-\d{4}-\d{6}$/) })
      .last();
    // The "Approval chain" label's parent: the label, then one box per level.
    this.chainLabel = page.getByText('Approval chain', { exact: true });
    this.chain = this.chainLabel.locator('..');
    this.saveButton = page.getByRole('button', { name: /^Save (draft|changes)$/ });
    this.main = page.getByRole('main').last();
    this.noPolicyToast = page.getByText(/^No approval policy is set up for \w+ yet\./);
    this.backToApproval = page.getByRole('link', { name: 'Back to approval' });
    this.dialog = page.getByRole('dialog').first();
    this.dialogConfirm = this.dialog.getByRole('button', { name: 'Confirm', exact: true });
    this.rejectReason = this.dialog.getByRole('textbox', {
      name: 'Why are you rejecting this? The submitter will see it.',
    });
    this.rejectReasonRule = this.dialog.getByText(
      'A reason is required, and needs at least 3 characters.',
    );
    this.withdrawComment = this.dialog.getByRole('textbox', { name: 'Comment' });
    this.dialogWithdraw = this.dialog.getByRole('button', { name: 'Withdraw', exact: true });
    this.routeLevelName = this.dialog.getByRole('textbox', { name: 'Level name *' }).last();
    this.routeApprovers = this.dialog
      .getByRole('combobox', { name: /^Approvers for level \d+$/ })
      .last();
    this.routeSubmit = this.dialog.getByRole('button', {
      name: 'Approve and add levels',
      exact: true,
    });
    this.notificationsButton = page.getByRole('button', { name: /^Notifications/ });
  }

  /** A person offered by an approver picker ("Dave QCLead · dave@flooros.dev"). */
  personOption(name: string): Locator {
    return this.page.getByRole('option', { name: new RegExp(`^${name}\\b`) });
  }

  /** A notification in the open bell panel that mentions `text`. */
  notification(text: string): Locator {
    return this.page.getByRole('link').filter({ hasText: text });
  }
}
