import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ApprovalPanelLocators } from '../../locators/planning/approval-panel.locators';
import { becomesUsable, expectAbsentOrDisabled } from './master-data-list.page';
import { WAIT } from './waits';

/**
 * An element's text with a space between its text nodes. The approval
 * screens build rows from adjacent spans with no whitespace between them
 * ("APR-2026-000059" "Approved" "by Alice Planner"), so innerText /
 * toContainText read them run together.
 */
export async function spacedText(locator: Locator): Promise<string> {
  // tsconfig has no "dom" lib, so the node shape is spelled out here.
  interface TextNode {
    nodeType: number;
    textContent: string | null;
    childNodes: ArrayLike<TextNode>;
  }
  return locator.evaluate((root) => {
    const parts: string[] = [];
    const walk = (node: TextNode) => {
      if (node.nodeType === 3) {
        const t = (node.textContent ?? '').trim();
        if (t) parts.push(t);
      }
      Array.from(node.childNodes).forEach(walk);
    };
    walk(root as unknown as TextNode);
    // The level badge is two spans ("L" "1"); read it as "L1".
    return parts.join(' ').replace(/\s+/g, ' ').replace(/\bL (\d)/g, 'L$1');
  });
}

/** Retries until `locator`'s spaced text matches (substring or RegExp). */
export async function expectSpacedText(
  locator: Locator,
  text: string | RegExp,
  { not = false, timeout = WAIT.SERVER }: { not?: boolean; timeout?: number } = {},
): Promise<void> {
  const read = async () => ((await locator.count()) ? spacedText(locator.first()) : '');
  const poll = expect.poll(read, { timeout });
  // String: a substring; RegExp: a match. The failure shows the text read.
  if (typeof text === 'string') await (not ? poll.not.toContain(text) : poll.toContain(text));
  else await (not ? poll.not.toMatch(text) : poll.toMatch(text));
}

export type DecisionButton = 'Approve' | 'Approve and add levels' | 'Reject' | 'Withdraw';
const BUTTONS: DecisionButton[] = ['Approve', 'Approve and add levels', 'Reject', 'Withdraw'];

/**
 * The approval panel on a Planning record's own page (an activity or a
 * recipe): Send for approval, the pending / returned banners, the approval
 * chain and the decision buttons with their dialogs. Approvers (and an
 * Approvals admin, "as administrator") decide here; the request page in the
 * Approvals app is read-only.
 */
export class ApprovalPanelPage extends BasePage {
  readonly locators: ApprovalPanelLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ApprovalPanelLocators(page);
  }

  /** Opens a record's page by its path (e.g. /planning/master-data/activities/<id>). */
  async open(path: string): Promise<void> {
    await this.gotoAuthenticated(path);
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(
      this.locators.pendingBanner
        .or(this.locators.sendForApprovalButton)
        .or(this.page.getByText('Approval chain', { exact: true }))
        .first(),
    ).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** "Send for approval": returns the request code from "Waiting for approval in APR-…". */
  async sendForApproval(): Promise<string> {
    await this.locators.sendForApprovalButton.click();
    await expect(this.locators.pendingBanner).toBeVisible({ timeout: WAIT.NAVIGATION });
    return this.bannerCode();
  }

  /** The request code in "Waiting for approval in APR-…". */
  private async bannerCode(): Promise<string> {
    const text = await this.locators.pendingBanner.innerText();
    const code = text.match(/APR-\d{4}-\d{6}/)?.[0];
    if (!code) throw new Error(`No request code in "${text}"`);
    return code;
  }

  /**
   * "Send for approval", tolerating that no policy is in force: the request
   * code, or null when the app answers "No approval policy is set up for … yet".
   */
  async trySendForApproval(): Promise<string | null> {
    await this.locators.sendForApprovalButton.click();
    await expect(this.locators.pendingBanner.or(this.locators.noPolicyToast).first()).toBeVisible({
      timeout: WAIT.NAVIGATION,
    });
    if (await this.locators.noPolicyToast.first().isVisible()) return null;
    return this.bannerCode();
  }

  /** The record's edit route, opened directly while it's pending, offers no working save. */
  async expectEditRouteRefused(path: string): Promise<void> {
    await this.page.goto(`${path}/edit`);
    await expect(this.locators.heading.or(this.locators.pendingBanner).first()).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
    await expectAbsentOrDisabled(this.page.getByRole('button', { name: /^Save (draft|changes)$/ }));
  }

  /** "Send for approval" with no policy in force: refused with the readable message. */
  async sendExpectingNoPolicy(): Promise<void> {
    await this.locators.sendForApprovalButton.click();
    await expect(this.locators.noPolicyToast.first()).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.pendingBanner).toHaveCount(0);
  }

  /** The code of the request the panel shows (APR-YYYY-NNNNNN). */
  async requestCode(): Promise<string> {
    await expect(this.locators.requestStatus).toBeVisible({ timeout: WAIT.SERVER });
    const text = await spacedText(this.locators.requestStatus);
    const code = text.match(/APR-\d{4}-\d{6}/)?.[0];
    if (!code) throw new Error(`No request code in "${text}"`);
    return code;
  }

  /** "APR-… Pending" / "APR-… Rejected by Carol Planner History" … */
  async requestStatus(): Promise<string> {
    return spacedText(this.locators.requestStatus);
  }

  /** The status row starts with `text` (string) or matches it (RegExp). */
  async expectRequestStatus(text: string | RegExp): Promise<void> {
    const pattern =
      typeof text === 'string'
        ? new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
        : text;
    await expectSpacedText(this.locators.requestStatus, pattern);
  }

  /** "Approval chain L1 · … Reviewing Carol Pending → L2 · …" */
  async chain(): Promise<string> {
    await expect(this.locators.chain).toBeVisible({ timeout: WAIT.SERVER });
    return spacedText(this.locators.chain);
  }

  async expectChain(text: string | RegExp): Promise<void> {
    await expectSpacedText(this.locators.chain, text);
  }

  async expectPendingBanner(code: string): Promise<void> {
    await expect(this.locators.pendingBanner).toHaveText(
      `Waiting for approval in ${code}. It cannot be changed until the request is decided.`,
      { timeout: WAIT.SERVER },
    );
  }

  async expectReturnedBanner(code: string): Promise<void> {
    await expect(this.locators.returnedBanner).toHaveText(
      `Draft, returned from approval ${code}. Change it before sending it again.`,
      { timeout: WAIT.SERVER },
    );
  }

  /** The record's status word in its header ("Pending approval", "Draft", "Active"). */
  async expectRecordStatus(status: string): Promise<void> {
    await expectSpacedText(this.page.getByRole('main').last(), new RegExp(`\\b${status}\\b`));
  }

  async expectPanelText(text: string | RegExp): Promise<void> {
    await expectSpacedText(this.page.getByRole('main').last(), text);
  }

  async expectPanelTextLacks(text: string | RegExp): Promise<void> {
    await expectSpacedText(this.page.getByRole('main').last(), text, { not: true });
  }

  /**
   * Exactly `buttons` of Approve / Approve and add levels / Reject / Withdraw
   * are offered. The buttons render once the viewer's part has loaded, so the
   * expected ones are waited for and the others watched for a while.
   */
  async expectDecisionButtons(buttons: DecisionButton[]): Promise<void> {
    for (const name of buttons)
      await expect(this.button(name), `"${name}" offered`).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    for (const name of BUTTONS.filter((b) => !buttons.includes(b)))
      expect(await becomesUsable(this.button(name)), `"${name}" not offered`).toBe(false);
  }

  /** The record can't be changed or sent while pending. */
  async expectLocked(): Promise<void> {
    for (const button of [
      this.locators.editButton,
      this.locators.sendForApprovalButton,
      this.locators.deleteDraftButton,
    ])
      await expectAbsentOrDisabled(button);
  }

  /** A draft again: Edit and Send for approval are back. */
  async expectEditableAgain(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.sendForApprovalButton).toBeVisible();
  }

  private button(name: DecisionButton) {
    return {
      Approve: this.locators.approveButton,
      'Approve and add levels': this.locators.approveAndAddLevelsButton,
      Reject: this.locators.rejectButton,
      Withdraw: this.locators.withdrawButton,
    }[name];
  }

  async approve(comment?: string): Promise<void> {
    await this.locators.approveButton.click();
    await expect(this.locators.dialog).toBeVisible();
    if (comment) await this.locators.dialog.getByRole('textbox').first().fill(comment);
    await this.locators.dialogConfirm.click();
    await expect(this.locators.dialog).toBeHidden({ timeout: WAIT.SERVER });
  }

  /** Opens Reject: Confirm stays disabled while the reason is empty. */
  async openRejectExpectingReasonRequired(): Promise<void> {
    await this.locators.rejectButton.click();
    await expect(this.locators.rejectReason).toBeVisible();
    await expect(this.locators.rejectReasonRule).toBeVisible();
    await expect(this.locators.dialogConfirm).toBeDisabled();
    await this.page.keyboard.press('Escape');
    await expect(this.locators.dialog).toBeHidden();
  }

  async reject(reason: string): Promise<void> {
    await this.locators.rejectButton.click();
    await this.locators.rejectReason.fill(reason);
    await expect(this.locators.dialogConfirm).toBeEnabled();
    await this.locators.dialogConfirm.click();
    await expect(this.locators.dialog).toBeHidden({ timeout: WAIT.SERVER });
  }

  async withdraw(comment?: string): Promise<void> {
    await this.locators.withdrawButton.click();
    await expect(this.locators.dialogWithdraw).toBeVisible();
    if (comment) await this.locators.withdrawComment.fill(comment);
    await this.locators.dialogWithdraw.click();
    await expect(this.locators.dialog).toBeHidden({ timeout: WAIT.SERVER });
  }

  /** "Approve and add levels": one added level of named users ("Dave QCLead", …). */
  async approveAndAddLevel(levelName: string, people: string[]): Promise<void> {
    await this.locators.approveAndAddLevelsButton.click();
    await this.locators.routeLevelName.fill(levelName);
    for (const person of people) {
      await this.locators.routeApprovers.click();
      await this.page.keyboard.type(person.split(' ')[0]!);
      await this.locators.personOption(person).click();
    }
    await this.locators.routeSubmit.click();
    await expect(this.locators.dialog).toBeHidden({ timeout: WAIT.SERVER });
  }

  /** Opens the bell and finds a notification mentioning every one of `texts`. */
  async expectNotification(...texts: string[]): Promise<void> {
    await expect(async () => {
      if (!(await this.locators.notification(texts[0]!).first().isVisible()))
        await this.locators.notificationsButton.click();
      let item = this.locators.notification(texts[0]!);
      for (const t of texts.slice(1)) item = item.filter({ hasText: t });
      await expect(item.first()).toBeVisible({ timeout: WAIT.RETRY_STEP * 2 });
    }).toPass({ timeout: WAIT.NAVIGATION });
    await this.page.keyboard.press('Escape');
  }
}
