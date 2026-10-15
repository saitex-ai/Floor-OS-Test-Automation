import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ActivityFormLocators } from '../../locators/planning/activity-form.locators';
import { submitForm, type SubmitResult } from './form-submit';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { WAIT } from './waits';

export interface ActivityFieldValues {
  code?: string;
  name?: string;
  department?: string;
  activityType?: string;
  durationScalesBy?: string;
  timeApplies?: string;
  standardTime?: string;
  actualsCapturedBy?: string;
  closedBy?: string;
  efficiencyAssumed?: string;
}

/**
 * "New activity" / edit-activity form, plus the read-only detail page in
 * front of the edit form. Owned by the Planning QA. Element locators live
 * in ActivityFormLocators (`this.locators`).
 *
 * The edit form's H1 is the activity's own name, not "Edit activity" —
 * so the edit page is recognised by Save changes + a disabled code field.
 */
export class ActivityFormPage extends BasePage {
  readonly locators: ActivityFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ActivityFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.newActivityHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOnEditPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/activities\/[\w-]+\/edit$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.saveChangesButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
    await expect(this.locators.code).toBeDisabled();
  }

  async expectCodeLocked(): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
  }

  /** The read-only detail page a list-row click lands on. */
  async expectOnDetailPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/activities\/[\w-]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.editActivityButton).toBeVisible();
    await expect(this.locators.saveChangesButton).toHaveCount(0);
  }

  /**
   * A draft only needs code + name to save; the detail page lists what's
   * still missing: "Before it can be sent for approval, fill in: …".
   */
  async expectApprovalPrerequisites(fields: string[]): Promise<void> {
    for (const field of fields) {
      await expect(this.locators.approvalPrerequisites).toContainText(field);
    }
  }

  async expectNoApprovalPrerequisites(): Promise<void> {
    await expect(this.locators.approvalPrerequisites).toHaveCount(0);
  }

  /** A read-only user's detail page offers no working Edit / Delete draft. */
  async expectNoEditAction(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: WAIT.NAVIGATION,
    });
    await expectAbsentOrDisabled(this.locators.editActivityButton);
    await expectAbsentOrDisabled(this.locators.deleteDraftButton);
  }

  async startEditing(): Promise<void> {
    await this.locators.editActivityButton.click();
    await this.expectOnEditPage();
  }

  /** "Create draft" returns to the list with "Activity created as a draft." */
  async expectCreatedAsDraft(): Promise<void> {
    await expect(this.locators.createdToast).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** Detail page of a draft: its own Delete draft action; confirmed in an alert dialog. */
  async deleteDraft(): Promise<void> {
    await this.locators.deleteDraftButton.click();
    await this.locators.confirmDeleteButton.click();
    await this.expectBackOnList();
  }

  async expectBackOnList(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/activities$/, {
      timeout: WAIT.SERVER,
    });
  }

  /** Every select on this form is a combobox: click it, then the option. */
  private async select(field: Locator, option: string): Promise<void> {
    await field.click();
    await this.locators.option(option).click();
  }

  /** Owning department is a searchable combobox — type to narrow, then pick. */
  async selectDepartment(name: string): Promise<void> {
    await this.locators.owningDepartment.click();
    const option = this.page.getByRole('option', { name: new RegExp(`^${name}\\b`) }).first();
    // The dropdown opens with options already listed; allow 2 s for the
    // option to show in that first page before falling back to typing.
    const listed = await option
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (!listed) {
      await this.page.keyboard.type(name);
    }
    await option.click();
  }

  async fill(values: ActivityFieldValues): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.code.fill(values.code);
    if (values.name !== undefined) await l.name.fill(values.name);
    if (values.department !== undefined) await this.selectDepartment(values.department);
    if (values.activityType !== undefined) await this.select(l.activityType, values.activityType);
    if (values.durationScalesBy !== undefined)
      await this.select(l.durationScalesBy, values.durationScalesBy);
    if (values.timeApplies !== undefined) await this.select(l.timeApplies, values.timeApplies);
    if (values.standardTime !== undefined) await l.standardTime.fill(values.standardTime);
    if (values.actualsCapturedBy !== undefined)
      await this.select(l.actualsCapturedBy, values.actualsCapturedBy);
    if (values.closedBy !== undefined) await l.closedBy.fill(values.closedBy);
    if (values.efficiencyAssumed !== undefined)
      await l.efficiencyAssumed.fill(values.efficiencyAssumed);
  }

  /** Every required field with a valid default; `overrides` win. */
  async fillAllRequired(
    code: string,
    name: string,
    overrides: ActivityFieldValues = {},
  ): Promise<void> {
    await this.fill({
      code,
      name,
      department: 'Cutting',
      activityType: 'Production',
      durationScalesBy: 'Per lot',
      timeApplies: 'Fixed duration',
      standardTime: '60',
      actualsCapturedBy: 'Manual form',
      closedBy: 'QA completion signal',
      ...overrides,
    });
  }

  async inputValue(field: 'name' | 'standardTime' | 'efficiencyAssumed'): Promise<string> {
    return this.locators[field].inputValue();
  }

  /** Types into a field the way a user would (keystrokes, not fill()). */
  async typeInto(field: 'standardTime' | 'efficiencyAssumed', text: string): Promise<void> {
    await this.locators[field].fill('');
    await this.locators[field].pressSequentially(text);
  }

  /** "Must follow activity" is a searchable combobox over existing activities. */
  async addPredecessorRule(mustFollowActivity: string): Promise<void> {
    await this.locators.addPredecessorRuleButton.click();
    await this.locators.mustFollowActivity.click();
    await this.page.keyboard.type(mustFollowActivity);
    await this.page
      .getByRole('option', { name: new RegExp(mustFollowActivity) })
      .first()
      .click();
    await this.locators.relationship.click();
    await this.page.getByRole('option').first().click();
  }

  /** The options "Must follow activity" offers for `term` (self-predecessor check). */
  async predecessorOptions(term: string): Promise<string[]> {
    await this.locators.addPredecessorRuleButton.click();
    await this.locators.mustFollowActivity.click();
    await this.page.keyboard.type(term);
    // The options re-filter as the term is typed: wait until two reads in a
    // row agree instead of sleeping.
    const options = this.page.getByRole('option');
    let previous: string | undefined;
    await expect
      .poll(
        async () => {
          const current = (await options.allInnerTexts()).join('|');
          const settled = current === previous;
          previous = current;
          return settled;
        },
        { intervals: [300], timeout: WAIT.SERVER },
      )
      .toBe(true);
    const offered = await options.allInnerTexts();
    await this.page.keyboard.press('Escape');
    await this.locators.removePredecessorRuleButton.last().click();
    return offered;
  }

  async addRequiredInput(whatMustHaveHappened: string): Promise<void> {
    await this.locators.addRequiredInputButton.click();
    await this.locators.whatMustHaveHappened.fill(whatMustHaveHappened);
  }

  async addDownstreamConsumer(role: string): Promise<void> {
    await this.locators.addDownstreamConsumerButton.click();
    await this.locators.roleNotified.fill(role);
  }

  async expectSubRowsAdded(): Promise<void> {
    await expect(this.locators.mustFollowActivity).toBeVisible();
    await expect(this.locators.whatMustHaveHappened).toBeVisible();
    await expect(this.locators.minimumQuantity).toHaveValue('100');
    await expect(this.locators.roleNotified).toBeVisible();
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveChangesButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectRequiredFlagged(): Promise<void> {
    await expect(this.locators.requiredMessage.first()).toBeVisible({ timeout: WAIT.VALIDATION });
  }

  async expectFieldError(message: string): Promise<void> {
    await expect(this.page.getByRole('alert').filter({ hasText: message })).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  async expectUniquenessError(): Promise<void> {
    await expect(this.locators.uniquenessMessage).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNameValue(name: string): Promise<void> {
    await expect(this.locators.name).toHaveValue(name);
  }
}
