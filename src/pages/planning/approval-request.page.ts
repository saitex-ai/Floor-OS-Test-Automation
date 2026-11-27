import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ApprovalRequestLocators } from '../../locators/planning/approvals-inbox.locators';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { ApprovalsInboxPage } from './approvals-inbox.page';
import { expectSpacedText, spacedText } from './approval-panel.page';
import { WAIT } from './waits';

/**
 * A request's page in the Approvals app (`/approvals/requests/<id>`): status,
 * the policy version frozen onto it, the record's snapshot, the approval
 * chain and History. Read-only for everyone — decisions are made on the
 * record's own page (ApprovalPanelPage).
 */
export class ApprovalRequestPage extends BasePage {
  readonly locators: ApprovalRequestLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ApprovalRequestLocators(page);
  }

  /** Finds the request in the Inbox by its code and opens it from its row. */
  async openFromInbox(code: string): Promise<void> {
    const inbox = new ApprovalsInboxPage(this.page);
    await inbox.findRow(code);
    await inbox.openRow(code);
    await this.expectLoaded(code);
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/approvals\/requests\/[\w-]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.codeHeading(code)).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
    await expect(this.locators.historyHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async reload(code: string): Promise<void> {
    await this.page.reload();
    await this.expectLoaded(code);
  }

  /** "<Status> Policy: <name> (v<n>)". */
  async expectStatus(status: string, policy: string, version?: number): Promise<void> {
    await expectSpacedText(
      this.locators.statusLine,
      new RegExp(`^${status} Policy: ${escapeRegExp(policy)} \\(v${version ?? '\\d+'}\\)$`),
    );
  }

  /** The policy version frozen onto the request ("Policy: … (v3)" → 3). */
  async policyVersion(): Promise<number> {
    const text = await spacedText(this.locators.statusLine);
    const match = text.match(/\(v(\d+)\)$/);
    if (!match) throw new Error(`No policy version in "${text}"`);
    return Number(match[1]);
  }

  async expectSubject(text: string | RegExp): Promise<void> {
    await expect(this.locators.subject).toHaveText(text);
  }

  /** The page's own text (header, snapshot, chain), a space between its parts. */
  async text(): Promise<string> {
    return spacedText(this.locators.main);
  }

  async expectTextContains(text: string | RegExp): Promise<void> {
    await expectSpacedText(this.locators.main, text);
  }

  async expectTextLacks(text: string | RegExp): Promise<void> {
    await expectSpacedText(this.locators.main, text, { not: true });
  }

  /** History's entries, top to bottom: each "<title> [Reason: …] <date-time>[ · L<n>]". */
  async history(): Promise<string[]> {
    await expect(this.locators.historyItems.first()).toBeVisible();
    return (await this.locators.historyItems.allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
  }

  async expectHistoryEntry(text: string | RegExp): Promise<void> {
    await expect(this.locators.historyItems.filter({ hasText: text }).first()).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  /** "Open the record" points at the record's page, with a way back to this request. */
  async expectRecordLink(path: RegExp): Promise<void> {
    await expect(this.locators.openRecord).toHaveAttribute('href', path);
  }

  async openRecord(): Promise<void> {
    await this.locators.openRecord.click();
  }

  async backToInbox(): Promise<void> {
    await this.locators.backToInbox.click();
  }

  /** No decision or withdraw buttons on the request page. */
  async expectNoActions(): Promise<void> {
    for (const name of ['Approve', 'Approve and add levels', 'Reject', 'Withdraw'])
      await expect(this.locators.actionButton(name)).toHaveCount(0);
  }
}
