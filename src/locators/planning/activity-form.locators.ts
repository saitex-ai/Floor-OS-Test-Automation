import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New activity" / edit-activity form (same
 * field set either way) and the read-only activity detail page that sits
 * in front of the edit form. No actions or assertions here, see
 * src/pages/planning/activity-form.page.ts for those.
 *
 * Live labels differ from the ClickUp wording: Unit of work = "Duration
 * scales by", Time basis = "Time applies", Capture method = "Actuals
 * captured by", Completion event = "Closed by".
 */
export class ActivityFormLocators {
  readonly newActivityHeading: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly editActivityButton: Locator;

  readonly code: Locator;
  readonly name: Locator;
  readonly owningDepartment: Locator;
  readonly activityType: Locator;
  readonly durationScalesBy: Locator;
  readonly timeApplies: Locator;
  readonly standardTime: Locator;
  readonly actualsCapturedBy: Locator;
  readonly closedBy: Locator;
  readonly efficiencyAssumed: Locator;

  readonly addPredecessorRuleButton: Locator;
  readonly removePredecessorRuleButton: Locator;
  readonly addRequiredInputButton: Locator;
  readonly addDownstreamConsumerButton: Locator;
  readonly mustFollowActivity: Locator;
  readonly relationship: Locator;
  readonly whatMustHaveHappened: Locator;
  readonly minimumQuantity: Locator;
  readonly roleNotified: Locator;

  readonly approvalPrerequisites: Locator;
  readonly requiredMessage: Locator;
  readonly uniquenessMessage: Locator;
  readonly createdToast: Locator;
  readonly updatedToast: Locator;
  readonly deleteDraftButton: Locator;
  readonly confirmDeleteButton: Locator;

  constructor(private readonly page: Page) {
    this.newActivityHeading = page.getByRole('heading', { name: 'New activity' });
    // "Creates a draft. Send it for approval from its page to publish it."
    this.createButton = page.getByRole('button', { name: 'Create draft' });
    // A draft saves with "Save draft"; a published activity's open revision with "Save changes".
    this.saveChangesButton = page.getByRole('button', { name: /^Save (draft|changes)$/ });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    // "Edit activity" on a draft; "Edit revision" on a published activity.
    this.editActivityButton = page.getByRole('button', { name: /^Edit (activity|revision)$/ });

    this.code = this.textbox('Activity code');
    this.name = this.textbox('Activity name');
    this.owningDepartment = this.combobox('Owning department');
    this.activityType = this.combobox('Activity type');
    this.durationScalesBy = this.combobox('Duration scales by');
    this.timeApplies = this.combobox('Time applies');
    this.standardTime = this.textbox('Standard time (min)');
    this.actualsCapturedBy = this.combobox('Actuals captured by');
    this.closedBy = this.textbox('Closed by');
    this.efficiencyAssumed = this.textbox('Efficiency assumed');

    this.addPredecessorRuleButton = page.getByRole('button', { name: 'Add predecessor rule' });
    this.removePredecessorRuleButton = page.getByRole('button', {
      name: 'Remove predecessor rule',
    });
    this.addRequiredInputButton = page.getByRole('button', { name: 'Add required input' });
    this.addDownstreamConsumerButton = page.getByRole('button', {
      name: 'Add downstream consumer',
    });
    // Sub-rows: plain name lookups, so they only resolve unambiguously
    // while one row of each kind exists.
    this.mustFollowActivity = this.combobox('Must follow activity');
    this.relationship = this.combobox('Relationship');
    this.whatMustHaveHappened = this.textbox('What must have happened');
    this.minimumQuantity = this.textbox('Minimum quantity (%)');
    this.roleNotified = this.textbox('Role notified when this completes');

    this.approvalPrerequisites = page.getByText(/^Before it can be sent for approval, fill in:/);
    this.requiredMessage = page.getByText(/required|highlighted field/i);
    this.uniquenessMessage = page.getByText(/already taken|unique|already exists|duplicate/i);
    this.createdToast = page.getByText('Activity created as a draft.');
    this.updatedToast = page.getByText(/Activity (updated|saved)|Draft saved/i);
    this.deleteDraftButton = page.getByRole('button', { name: 'Delete draft' });
    this.confirmDeleteButton = page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Delete draft' });
  }

  textbox(name: string): Locator {
    return this.page.getByRole('textbox', { name, exact: true });
  }

  combobox(name: string): Locator {
    return this.page.getByRole('combobox', { name, exact: true });
  }

  option(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
