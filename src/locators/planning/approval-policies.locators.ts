import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Approvals app's Policies screen
 * (`/approvals/policies`, moved out of Control Center on 2026-11-12) and its
 * New / Edit policy form, which opens in place (the URL stays
 * `/approvals/policies`). The grid itself is the shared Master Data grid —
 * see MasterDataListLocators. No actions or assertions here, see
 * src/pages/planning/approval-policies.page.ts and approval-policy-form.page.ts.
 */
export class ApprovalPoliciesLocators {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly newPolicyButton: Locator;
  readonly bestFitButton: Locator;
  readonly noMatchState: Locator;
  /** The footer reads "Refreshing…" while the grid refetches (sorting is done by the server). */
  readonly refreshing: Locator;
  /** The Approvals app's side navigation. */
  readonly inboxNavLink: Locator;
  readonly policiesNavLink: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Policies', exact: true });
    this.subtitle = page.getByText(
      'Which chain a record goes through, per app and entity type. A policy is chosen at submit time and frozen onto the request, so editing one never changes a review already under way.',
    );
    this.newPolicyButton = page.getByRole('button', { name: 'New policy' });
    this.bestFitButton = page.getByRole('button', { name: 'Best-fit columns' });
    this.noMatchState = page.getByText('No records match your filters');
    this.refreshing = page.getByText('Refreshing…');
    const nav = page.getByRole('complementary', { name: 'Approvals' }).getByRole('navigation');
    this.inboxNavLink = nav.getByRole('link', { name: 'Inbox', exact: true });
    this.policiesNavLink = nav.getByRole('link', { name: 'Policies', exact: true });
  }
}

/** The New / Edit policy form. */
export class ApprovalPolicyFormLocators {
  readonly newHeading: Locator;
  readonly editHeading: Locator;
  readonly versionHelp: Locator;
  readonly backToPolicies: Locator;
  readonly sourceApp: Locator;
  readonly entityType: Locator;
  /** "Fixed once the policy exists." under Source app and Entity type on Edit. */
  readonly fixedOnceExists: Locator;
  readonly policyName: Locator;
  readonly priority: Locator;
  readonly description: Locator;
  readonly addLevelButton: Locator;
  readonly removeLevelButtons: Locator;
  /** "Expand level n" / "Collapse level n" — one per level, in order. */
  readonly levelToggles: Locator;
  readonly levelName: Locator;
  readonly quorum: Locator;
  readonly approversFrom: Locator;
  /** The level's approver picker (an escalation step has a second "Who": the level's is first). */
  readonly who: Locator;
  readonly maxReminders: Locator;
  readonly onExpiry: Locator;
  readonly escalateTo: Locator;
  readonly escalationMode: Locator;
  readonly escalationStepName: Locator;
  readonly calendar: Locator;
  readonly calendarHint: Locator;
  readonly daysToComplete: Locator;
  readonly daysToCompleteUnit: Locator;
  readonly remindEvery: Locator;
  readonly expireAfter: Locator;
  readonly timingDisabledNote: Locator;
  readonly timingSharedNote: Locator;
  /** "This policy's own timing for level 1, also used by any level its approvers add. …" */
  readonly timingOwnNote: Locator;
  readonly groupHint: Locator;
  readonly requiredAlerts: Locator;
  readonly priorityRangeMessage: Locator;
  readonly pickSomeoneMessage: Locator;
  /** Under the escalation steps when one is incomplete, e.g. "Step 1: give it a name." */
  readonly escalationStepMessage: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;
  readonly suggestions: Locator;

  constructor(private readonly page: Page) {
    this.newHeading = page.getByRole('heading', { name: 'New policy', level: 1 });
    this.editHeading = page.getByRole('heading', { name: 'Edit policy', level: 1 });
    this.versionHelp = page.getByText(
      'Editing bumps the version. Reviews already under way keep the rules they started with, so a change here only affects records submitted from now on.',
    );
    this.backToPolicies = page.getByRole('button', { name: 'Back to policies' });
    this.sourceApp = this.combobox('Source app');
    this.entityType = this.combobox('Entity type');
    this.fixedOnceExists = page.getByText('Fixed once the policy exists.');
    this.policyName = this.textbox('Policy name');
    this.priority = this.textbox('Priority (lower wins)');
    this.description = this.textbox('Description');
    this.addLevelButton = page.getByRole('button', { name: 'Add a level' });
    this.removeLevelButtons = page.getByRole('button', { name: 'Remove level', exact: true });
    this.levelToggles = page.getByRole('button', { name: /^(Expand|Collapse) level \d+$/ });
    // Only the expanded level's fields are on screen (see ApprovalPolicyFormPage.expandLevel).
    this.levelName = this.textbox('Level name');
    this.quorum = this.combobox('Quorum');
    this.approversFrom = this.combobox('Approvers come from');
    this.who = this.combobox('Who').first();
    this.maxReminders = this.textbox('Max reminders (0 = unlimited)');
    this.onExpiry = this.combobox('On expiry');
    this.escalateTo = this.combobox('Escalate to');
    this.escalationMode = this.combobox('Mode');
    this.escalationStepName = this.textbox('Name');
    this.calendar = this.combobox('Calendar');
    this.calendarHint = page.getByText('Every hour counts, weekends and holidays included.');
    this.daysToComplete = this.textbox('Days to complete');
    this.daysToCompleteUnit = this.combobox('Days to complete unit');
    this.remindEvery = this.textbox('Remind every');
    this.expireAfter = this.textbox('Expire after');
    this.timingDisabledNote = page.getByText(
      'Enter the source app and entity type to set the timing.',
    );
    // "Level 1 uses the timing every planning / activity policy shares. A change here gives
    // this policy its own, also used by any level its approvers add." (per policy since 2026-11-12)
    this.timingSharedNote = page.getByText(/^Level \d+ uses the timing every .+ policy shares\./);
    this.timingOwnNote = page.getByText(/^This policy's own timing for level \d+/);
    this.groupHint = page.getByText(
      'Only people placed directly in this group approve, not people in the groups under it.',
    );
    this.requiredAlerts = page.getByRole('alert').filter({ hasText: /^Required$/ });
    // "A whole number from 0 to 10000" in October, "… 0 to 100" on dev 2026-11-18.
    this.priorityRangeMessage = page.getByText(/^A whole number from 0 to \d+$/);
    this.pickSomeoneMessage = page.getByText('Pick at least one person');
    this.escalationStepMessage = page.getByText(/^Step \d+: /);
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
    this.suggestions = page.getByRole('listbox', { name: 'Suggestions' });
  }

  textbox(name: string): Locator {
    return this.page.getByRole('textbox', { name, exact: true });
  }

  combobox(name: string): Locator {
    return this.page.getByRole('combobox', { name, exact: true });
  }

  switch(name: string): Locator {
    return this.page.getByRole('switch', { name, exact: true });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole(
      'option',
      typeof name === 'string' ? { name, exact: true } : { name },
    );
  }

  /** The open dropdown's options. */
  options(): Locator {
    return this.page.getByRole('listbox').last().getByRole('option');
  }

  /** "Expand level n" / "Collapse level n"; its text is the level's summary ("L1 QA review · 1 user"). */
  levelToggle(n: number): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^(Expand|Collapse) level ${n}$`) });
  }

  /** A picked approver (Users): a list item with the person's name and a "Remove" button. */
  approverChip(name: string): Locator {
    return this.page
      .getByRole('group', { name: 'Who' })
      .getByRole('listitem')
      .filter({ hasText: name })
      .filter({ has: this.page.getByRole('button', { name: 'Remove', exact: true }) });
  }

  /** The switch with the state text next to it ("Yes" / "No" / "Blocked" / "Allowed"). */
  switchWithLabel(name: string): Locator {
    return this.switch(name).locator('..');
  }

  /** A warning shown under Who, e.g. 'The permission "app.bom" doesn't include approval.user…'. */
  approverWarning(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }
}
