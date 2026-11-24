import { type Locator, type Page, type Request, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ApprovalPolicyFormLocators } from '../../locators/planning/approval-policies.locators';
import { escapeRegExp } from '../../locators/planning/master-data-list.locators';
import { WAIT } from './waits';

export type Quorum = 'Any one approves' | 'Everyone must approve';
export type ApproverSource = 'A permission' | 'A group' | 'Users';

export interface LevelSpec {
  name: string;
  quorum?: Quorum;
  from?: ApproverSource;
  /**
   * What to type into Who, one entry per approver; the option that starts
   * with it is picked ("<display name>", "approval.user", "/companies/…").
   */
  who?: string[];
  /** "Approvers may add levels" (on by default). */
  addLevels?: boolean;
  /** Timing: Days to complete, e.g. { value: '2', unit: 'hours' }. */
  daysToComplete?: { value: string; unit: 'days' | 'hours' };
}

export interface PolicySpec {
  sourceApp?: string;
  entityType?: string;
  name: string;
  priority?: string;
  description?: string;
  active?: boolean;
  selfApproval?: boolean;
  submitterCanWithdraw?: boolean;
  levels: LevelSpec[];
}

/** What can change on an existing policy (Source app and Entity type are fixed). */
export interface PolicyChanges {
  name?: string;
  priority?: string;
  description?: string;
  active?: boolean;
  selfApproval?: boolean;
  submitterCanWithdraw?: boolean;
  /** Level 1's name and "Approvers may add levels". */
  level1Name?: string;
  level1AddLevels?: boolean;
}

export interface SaveOutcome {
  saved: boolean;
  status?: number;
  version?: number;
  priority?: number;
}

/** The app's policy save: POST /api/approval/policies (new) or PUT …/<id> (edit). */
const isPolicySave = (r: Request) =>
  ['POST', 'PUT'].includes(r.method()) &&
  /\/api\/approval\/policies(\/[\w-]+)?$/.test(new URL(r.url()).pathname);

/**
 * Approvals › Policies › New policy / Edit policy (opens in place over the
 * grid). Levels are an accordion: only the expanded level's fields are on
 * screen, so every level field is read or set after expandLevel(n).
 */
export class ApprovalPolicyFormPage extends BasePage {
  readonly locators: ApprovalPolicyFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ApprovalPolicyFormLocators(page);
  }

  async expectOnNew(): Promise<void> {
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.versionHelp).toBeVisible();
  }

  async expectOnEdit(): Promise<void> {
    await expect(this.locators.editHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.versionHelp).toBeVisible();
    await expect(this.locators.backToPolicies).toBeVisible();
  }

  async expectClosed(): Promise<void> {
    await expect(this.locators.saveButton).toBeHidden({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.policiesHeading).toBeVisible();
  }

  // ── Fields ────────────────────────────────────────────────────────────

  private async select(field: Locator, option: string): Promise<void> {
    const choice = this.locators.option(option);
    // The popover sometimes doesn't open on dev under parallel workers (CAP-13,
    // 2026-11-25): open it again until the option shows, never click blind.
    await expect(async () => {
      if (!(await choice.isVisible()) && (await field.getAttribute('aria-expanded')) !== 'true')
        await field.click();
      await expect(choice).toBeVisible({ timeout: WAIT.SERVER });
    }).toPass({ timeout: WAIT.NAVIGATION });
    await choice.click();
    await expect(field).toContainText(option);
  }

  /** The options a dropdown offers (opens it and closes it again). */
  async optionsOf(field: Locator): Promise<string[]> {
    await field.click();
    await expect(this.locators.options().first()).toBeVisible();
    const texts = (await this.locators.options().allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    return texts;
  }

  async sourceAppOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.sourceApp);
  }

  async entityTypeOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.entityType);
  }

  async quorumOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.quorum);
  }

  async approverSourceOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.approversFrom);
  }

  async onExpiryOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.onExpiry);
  }

  async escalateToOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.escalateTo);
  }

  async escalationModeOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.escalationMode);
  }

  async calendarOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.calendar);
  }

  async daysUnitOptions(): Promise<string[]> {
    return this.optionsOf(this.locators.daysToCompleteUnit);
  }

  /** The suggestions Who offers for `term` (typed, read, then closed). */
  async whoSuggestions(term = ''): Promise<string[]> {
    await this.locators.who.click();
    if (term) await this.page.keyboard.type(term);
    const options = this.locators.suggestions.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: WAIT.SERVER });
    const texts = (await options.allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    return texts;
  }

  async pickApp(sourceApp: string, entityType: string): Promise<void> {
    await this.select(this.locators.sourceApp, sourceApp);
    await expect(this.locators.entityType).toBeEnabled();
    await this.select(this.locators.entityType, entityType);
  }

  /** Sets a switch on or off by its aria-checked state. */
  async setSwitch(name: string, on: boolean): Promise<void> {
    const sw = this.locators.switch(name);
    if ((await sw.getAttribute('aria-checked')) !== String(on)) await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', String(on));
  }

  async toggleSwitch(name: string): Promise<void> {
    await this.locators.switch(name).click();
  }

  /** The switch is on/off and reads `label` next to it ("Yes", "No", "Blocked", "Allowed"). */
  async expectSwitch(name: string, on: boolean, label: string): Promise<void> {
    await expect(this.locators.switch(name)).toHaveAttribute('aria-checked', String(on));
    await expect(this.locators.switchWithLabel(name)).toContainText(label);
  }

  async levelCount(): Promise<number> {
    return this.locators.levelToggles.count();
  }

  /** Collapses every other level and expands level `n`, so only its fields are on screen. */
  async expandLevel(n: number): Promise<void> {
    const count = await this.levelCount();
    for (let k = 1; k <= count; k += 1) {
      const toggle = this.locators.levelToggle(k);
      const expanded = (await toggle.getAttribute('aria-expanded')) === 'true';
      if ((k === n) !== expanded) await toggle.click();
    }
    await expect(this.locators.levelToggle(n)).toHaveAttribute('aria-expanded', 'true');
    await expect(this.locators.levelName).toHaveCount(1);
  }

  /** A level's collapsed summary, e.g. "L1 QA review · 1 user". */
  async levelSummary(n: number): Promise<string> {
    return (await this.locators.levelToggle(n).innerText()).replace(/\s+/g, ' ').trim();
  }

  async addLevel(): Promise<void> {
    const before = await this.levelCount();
    await this.locators.addLevelButton.click();
    await expect(this.locators.levelToggles).toHaveCount(before + 1);
  }

  async removeLevel(n: number): Promise<void> {
    const before = await this.levelCount();
    await this.locators.removeLevelButtons.nth(n - 1).click();
    await expect(this.locators.levelToggles).toHaveCount(before - 1);
  }

  async expectRemoveLevelButtons(count: number): Promise<void> {
    await expect(this.locators.removeLevelButtons).toHaveCount(count);
  }

  /** Types into Who and picks the option that starts with `term`. */
  async addApprover(term: string): Promise<void> {
    const users = (await this.locators.approversFrom.innerText()).includes('Users');
    const picked = users
      ? this.locators.approverChip(term)
      : this.locators.who.filter({ hasText: term });
    const option = this.locators.suggestions
      .getByRole('option', { name: new RegExp(`^${escapeRegExp(term)}`) })
      .first();
    // Who opens a popover with its own search box, which has the focus.
    await this.locators.who.click();
    await this.page.keyboard.type(term);
    // The people search can sit on "Searching…" for 15 s+ when dev is slow.
    await expect(option).toBeVisible({ timeout: WAIT.NAVIGATION });
    // Once one person is picked the suggestions keep re-rendering (dev
    // 2026-11-17/18: a normal click waited for a stable option until the test
    // timed out, and keyboard focus kept resetting), so the option gets a
    // dispatched click, repeated until the pick shows.
    await expect(async () => {
      if ((await picked.count()) === 0) {
        // The list can close or re-render under load: reopen Who and retype.
        if ((await option.count()) === 0) {
          await this.locators.who.click();
          await this.page.keyboard.type(term);
          await expect(option).toBeVisible({ timeout: WAIT.RETRY_STEP });
        }
        await option.dispatchEvent('click', undefined, { timeout: WAIT.RETRY_STEP });
      }
      await expect(picked.first()).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.NAVIGATION });
    await this.page.keyboard.press('Escape');
  }

  async setApproverSource(from: ApproverSource): Promise<void> {
    await this.select(this.locators.approversFrom, from);
  }

  async setQuorum(quorum: Quorum): Promise<void> {
    await this.select(this.locators.quorum, quorum);
  }

  async setDaysToComplete(value: string, unit: 'days' | 'hours'): Promise<void> {
    await this.locators.daysToComplete.fill(value);
    await this.select(this.locators.daysToCompleteUnit, unit);
  }

  /** Fills the expanded level. */
  async fillLevel(level: LevelSpec): Promise<void> {
    await this.locators.levelName.fill(level.name);
    if (level.quorum) await this.setQuorum(level.quorum);
    if (level.from) await this.setApproverSource(level.from);
    for (const who of level.who ?? []) await this.addApprover(who);
    if (level.daysToComplete)
      await this.setDaysToComplete(level.daysToComplete.value, level.daysToComplete.unit);
    if (level.addLevels !== undefined)
      await this.setSwitch('Approvers may add levels', level.addLevels);
  }

  /** Fills the New policy form. */
  async fillNew(spec: PolicySpec): Promise<void> {
    await this.pickApp(spec.sourceApp ?? 'Planning', spec.entityType ?? 'Activity');
    await this.fillCommon(spec);
    for (let i = 0; i < spec.levels.length; i += 1) {
      if (i > 0) await this.addLevel();
      await this.expandLevel(i + 1);
      await this.fillLevel(spec.levels[i]!);
    }
  }

  /** Changes an open Edit policy form. */
  async applyChanges(changes: PolicyChanges): Promise<void> {
    await this.fillCommon(changes);
    if (changes.level1Name !== undefined || changes.level1AddLevels !== undefined) {
      await this.expandLevel(1);
      if (changes.level1Name !== undefined) await this.locators.levelName.fill(changes.level1Name);
      if (changes.level1AddLevels !== undefined)
        await this.setSwitch('Approvers may add levels', changes.level1AddLevels);
    }
  }

  private async fillCommon(values: PolicyChanges): Promise<void> {
    if (values.name !== undefined) await this.locators.policyName.fill(values.name);
    if (values.priority !== undefined) await this.locators.priority.fill(values.priority);
    if (values.description !== undefined) await this.locators.description.fill(values.description);
    if (values.active !== undefined) await this.setSwitch('Active', values.active);
    if (values.selfApproval !== undefined)
      await this.setSwitch('Self-approval', values.selfApproval);
    if (values.submitterCanWithdraw !== undefined)
      await this.setSwitch('Submitter can withdraw', values.submitterCanWithdraw);
  }

  async setPriority(value: string): Promise<void> {
    await this.locators.priority.fill(value);
  }

  /** What Priority holds after typing `text` into it (the field drops what it won't take). */
  async typePriority(text: string): Promise<string> {
    await this.locators.priority.fill('');
    await this.locators.priority.pressSequentially(text);
    return this.locators.priority.inputValue();
  }

  // ── Save / leave ──────────────────────────────────────────────────────

  /**
   * Clicks Save and reports whether the app saved the policy, from its own
   * POST / PUT. A save the form refuses sends nothing, so the wait gives up
   * after WAIT.PAGE_LOAD (caught right at the trigger) — a save on a slow dev
   * took over 15 s on 2026-11-18.
   */
  async save(): Promise<SaveOutcome> {
    const [response] = await Promise.all([
      this.page
        .waitForResponse((r) => isPolicySave(r.request()), { timeout: WAIT.PAGE_LOAD })
        .catch(() => null),
      this.locators.saveButton.click(),
    ]);
    if (!response) return { saved: false };
    const body = (await response.json().catch(() => ({}))) as {
      version?: number;
      priority?: number;
    };
    const saved = response.ok();
    if (saved) await this.expectClosed();
    return { saved, status: response.status(), version: body.version, priority: body.priority };
  }

  /** Save, expecting the app to store the policy. */
  async saveOk(): Promise<SaveOutcome> {
    const outcome = await this.save();
    expect(outcome, 'policy saved').toMatchObject({ saved: true });
    return outcome;
  }

  /**
   * Saves when the form has a change (Save stays disabled until something
   * changes — z941abyqjq); otherwise leaves with Cancel and reports not saved.
   */
  async saveIfChanged(): Promise<SaveOutcome> {
    if (await this.locators.saveButton.isDisabled()) {
      await this.cancel();
      return { saved: false };
    }
    return this.saveOk();
  }

  /**
   * Save, expecting the form to refuse it: no POST / PUT goes out and the
   * form stays open.
   */
  async saveExpectingBlocked(): Promise<void> {
    const sent: string[] = [];
    const onRequest = (r: Request) => {
      if (isPolicySave(r)) sent.push(r.url());
    };
    this.page.on('request', onRequest);
    try {
      await this.locators.saveButton.click();
      await expect(this.locators.saveButton).toBeVisible();
      // Watched for the whole window (long enough for a save the form didn't
      // stop to go out), not read once; a request going out ends it early.
      const deadline = Date.now() + WAIT.PERMISSION_SETTLE;
      await expect
        .poll(() => sent.length > 0 || Date.now() >= deadline, {
          intervals: [250],
          timeout: WAIT.PERMISSION_SETTLE + WAIT.SERVER,
        })
        .toBe(true);
    } finally {
      this.page.off('request', onRequest);
    }
    expect(sent, 'no policy save request').toEqual([]);
    await expect(this.locators.saveButton).toBeVisible();
  }

  async expectSaveDisabled(): Promise<void> {
    await expect(this.locators.saveButton).toBeDisabled();
  }

  async expectSaveEnabled(): Promise<void> {
    await expect(this.locators.saveButton).toBeEnabled();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
    await this.expectClosed();
  }

  async backToPolicies(): Promise<void> {
    await this.locators.backToPolicies.click();
    await this.expectClosed();
  }

  // ── Reads / assertions ────────────────────────────────────────────────

  async expectRequiredCount(min: number): Promise<void> {
    await expect
      .poll(() => this.locators.requiredAlerts.count(), { timeout: WAIT.VALIDATION })
      .toBeGreaterThanOrEqual(min);
  }

  async expectInvalid(field: 'policyName' | 'levelName'): Promise<void> {
    await expect(this.locators[field]).toHaveAttribute('aria-invalid', 'true');
  }

  async expectPriorityRangeMessage(): Promise<void> {
    await expect(this.locators.priorityRangeMessage.first()).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  /** An incomplete escalation step is named under the steps ("Step 1: give it a name."). */
  async expectEscalationStepMessage(): Promise<void> {
    await expect(this.locators.escalationStepMessage.first()).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  async expectPickSomeoneMessage(): Promise<void> {
    await expect(this.locators.pickSomeoneMessage.first()).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  /** New policy's documented defaults (TC-CAP-01). */
  async expectDefaults(): Promise<void> {
    const l = this.locators;
    await expect(l.sourceApp).toContainText('Select an app');
    await expect(l.entityType).toBeDisabled();
    await expect(l.entityType).toContainText('Pick an app first');
    await expect(l.policyName).toHaveValue('');
    await expect(l.priority).toHaveValue('100');
    await expect(l.description).toHaveValue('');
    await this.expectSwitch('Active', true, 'Yes');
    await this.expectSwitch('Self-approval', false, 'Blocked');
    await this.expectSwitch('Submitter can withdraw', true, 'Yes');
    await expect(this.locators.levelToggles).toHaveCount(1);
    await expect(this.locators.levelToggle(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(l.levelName).toHaveAttribute('placeholder', 'Department head');
    await expect(l.quorum).toContainText('Any one approves');
    await expect(l.approversFrom).toContainText('A permission');
    await expect(l.who).toContainText('Select a permission…');
    for (const name of ['Remind', 'Escalate', 'Expire']) await this.expectSwitch(name, false, 'No');
    await expect(l.calendar).toBeDisabled();
    await expect(l.daysToComplete).toBeDisabled();
    await expect(l.timingDisabledNote).toBeVisible();
    await this.expectSwitch('Approvers may add levels', true, 'Yes');
    await expect(l.addLevelButton).toBeVisible();
    await expect(l.cancelButton).toBeVisible();
    await expect(l.saveButton).toBeVisible();
  }

  async expectTimingLocked(): Promise<void> {
    await expect(this.locators.calendar).toBeDisabled();
    await expect(this.locators.daysToComplete).toBeDisabled();
    await expect(this.locators.daysToCompleteUnit).toBeDisabled();
    await expect(this.locators.timingDisabledNote).toBeVisible();
  }

  async expectTimingUnlocked(): Promise<void> {
    await expect(this.locators.calendar).toBeEnabled();
    await expect(this.locators.daysToComplete).toBeEnabled();
    await expect(this.locators.daysToCompleteUnit).toBeEnabled();
    await expect(this.locators.timingDisabledNote).toHaveCount(0);
    await expect(this.locators.calendarHint).toBeVisible();
    await expect(this.locators.timingSharedNote).toBeVisible();
  }

  /** The timing note says level `n` uses the timing shared by every `app / entity` policy. */
  async expectSharedTiming(n: number, appEntity: string): Promise<void> {
    await expect(this.locators.timingSharedNote).toHaveText(
      `Level ${n} uses the timing every ${appEntity} policy shares. A change here gives this policy its own, also used by any level its approvers add.`,
    );
  }

  /** Level `n` has this policy's own timing (not the shared one). */
  async expectOwnTiming(n: number): Promise<void> {
    await expect(this.locators.timingOwnNote).toContainText(
      `This policy's own timing for level ${n}, also used by any level its approvers add.`,
      { timeout: WAIT.SERVER },
    );
  }

  /** Days to complete of the expanded level, e.g. { value: '2', unit: 'hours' }. */
  async daysToComplete(): Promise<{ value: string; unit: string }> {
    return {
      value: await this.locators.daysToComplete.inputValue(),
      unit: (await this.locators.daysToCompleteUnit.innerText()).trim(),
    };
  }

  async expectFieldVisible(
    field:
      'maxReminders' | 'remindEvery' | 'expireAfter' | 'onExpiry' | 'escalateTo' | 'escalationMode',
  ): Promise<void> {
    await expect(this.locators[field]).toBeVisible();
  }

  async expectMaxRemindersDefault(): Promise<void> {
    await expect(this.locators.maxReminders).toHaveValue('0');
  }

  async expectOnExpiry(value: string): Promise<void> {
    await expect(this.locators.onExpiry).toContainText(value);
  }

  async expectEscalationMode(value: string): Promise<void> {
    await expect(this.locators.escalationMode).toContainText(value);
  }

  async expectWhoPlaceholder(text: string): Promise<void> {
    await expect(this.locators.who).toContainText(text);
  }

  async expectGroupHint(): Promise<void> {
    await expect(this.locators.groupHint).toBeVisible();
  }

  async expectApproverChip(name: string): Promise<void> {
    await expect(this.locators.approverChip(name)).toBeVisible();
  }

  async expectApproverWarning(text: string | RegExp): Promise<void> {
    await expect(this.locators.approverWarning(text).first()).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  async expectIdentityLocked(sourceApp: string, entityType: string): Promise<void> {
    await expect(this.locators.sourceApp).toBeDisabled();
    await expect(this.locators.sourceApp).toContainText(sourceApp);
    await expect(this.locators.entityType).toBeDisabled();
    await expect(this.locators.entityType).toContainText(entityType);
    await expect(this.locators.fixedOnceExists).toHaveCount(2);
  }

  async expectValue(
    field: 'policyName' | 'priority' | 'description',
    value: string,
  ): Promise<void> {
    await expect(this.locators[field]).toHaveValue(value);
  }

  async expectQuorum(value: Quorum): Promise<void> {
    await expect(this.locators.quorum).toContainText(value);
  }
}
