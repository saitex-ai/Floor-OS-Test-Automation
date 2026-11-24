import { type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './master-data-list.locators';

/**
 * Raw element locators for the Approvals app's Inbox (`/approvals`, the old
 * Control Center "All requests" since 2026-11-12) and a request's page
 * (`/approvals/requests/<id>`). The Inbox grid is the shared Master Data
 * grid — see MasterDataListLocators. No actions or assertions here, see
 * src/pages/planning/approvals-inbox.page.ts and approval-request.page.ts.
 */
export class ApprovalsInboxLocators {
  readonly heading: Locator;
  /** Admin: "Every approval in the system…"; an approval.user: "Every approval you are, or were, an approver on…". */
  readonly adminSubtitle: Locator;
  /** "+2 more": the status tabs that don't fit (Withdrawn, Expired). */
  readonly moreTabsButton: Locator;
  readonly noMatchState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Inbox', exact: true, level: 1 });
    this.adminSubtitle = page.getByText(
      'Every approval in the system, whatever its status and whoever it belongs to. Your part says which are waiting on you.',
    );
    this.moreTabsButton = page.getByRole('button', { name: /^\+\d+ more$/ });
    this.noMatchState = page.getByText('No records match your filters');
  }

  /** An entry of the open "+2 more" menu, e.g. "Withdrawn 23". */
  moreTabItem(name: string): Locator {
    return this.page.getByRole('menuitem', { name: new RegExp(`^${escapeRegExp(name)}( \\d+)?$`) });
  }

  /** An option of the open rule-builder dropdown; with no name, every option. */
  option(name?: string): Locator {
    return name
      ? this.page.getByRole('option', { name, exact: true })
      : this.page.getByRole('option');
  }

  /** The Filters panel's "Apply filters" button. */
  applyFiltersButton(): Locator {
    return this.page.getByRole('button', { name: 'Apply filters', exact: true });
  }
}

/** A request's page. */
export class ApprovalRequestLocators {
  readonly backToInbox: Locator;
  readonly openRecord: Locator;
  readonly historyHeading: Locator;
  readonly historyItems: Locator;
  readonly decisionNeeded: Locator;
  /** "Pending Policy: <name> (v3)" — the status and the policy version frozen onto the request. */
  readonly statusLine: Locator;
  /** The record's snapshot title, e.g. "Activity CUT-0182 revision 1 - …". */
  readonly subject: Locator;
  readonly main: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main').last();
    this.backToInbox = page.getByRole('link', { name: 'Back to inbox' });
    this.openRecord = page.getByRole('link', { name: 'Open the record' });
    this.historyHeading = page.getByRole('heading', { name: 'History', exact: true });
    this.historyItems = this.main.getByRole('list').last().getByRole('listitem');
    this.decisionNeeded = page.getByText('Your decision is needed on this record.');
    // The status badge and "Policy: … (vN)" are separate spans: read with spacedText().
    this.statusLine = page
      .locator('div')
      .filter({ has: page.getByText(/^Policy: .+ \(v\d+\)$/) })
      .last();
    this.subject = page.getByRole('heading', { level: 3 }).first();
  }

  /** The request's own heading, its code ("APR-2026-000057"). */
  codeHeading(code: string): Locator {
    return this.page.getByRole('heading', { name: code, level: 1 });
  }

  /** A decision or withdraw button, by its exact name. */
  actionButton(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }
}
