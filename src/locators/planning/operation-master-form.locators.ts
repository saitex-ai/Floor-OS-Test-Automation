import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Operation Master create / edit form
 * (/planning/master-data/operations/new and /operations/<CODE>/edit).
 * Not the recipe-step form a recipe's own operations use — that is
 * OperationFormLocators. No actions or assertions here, see
 * src/pages/planning/operation-master-form.page.ts.
 */
export class OperationMasterFormLocators {
  readonly newHeading: Locator;
  readonly code: Locator;
  readonly codeFixedHelp: Locator;
  readonly name: Locator;
  readonly owningDepartment: Locator;
  readonly difficultyGrade: Locator;
  readonly machineType: Locator;
  readonly machineTypeHint: Locator;
  readonly minimumSkillGrade: Locator;
  readonly standardTimeBasis: Locator;
  readonly defaultBasicMinutes: Locator;
  readonly defaultSamMinutes: Locator;
  readonly defaultCycleTime: Locator;
  readonly minimumTime: Locator;
  readonly motionStudy: Locator;
  readonly lastStudiedOnLabel: Locator;
  readonly motionElements: Locator;
  readonly addParameterButton: Locator;
  readonly parameterKeys: Locator;
  readonly parameterValues: Locator;
  readonly addSystemLinkButton: Locator;
  readonly status: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** "Saving rewrites this operation." / a "saves as a new version" notice on edit. */
  readonly saveNotice: Locator;
  /** "Fill the N highlighted field(s) before saving." */
  readonly blockedToast: Locator;
  readonly codeTaken: Locator;

  constructor(private readonly page: Page) {
    this.newHeading = page.getByRole('heading', { name: 'New operation', level: 1 });
    this.code = page.getByRole('textbox', { name: 'Operation code' });
    this.codeFixedHelp = page.getByText(/The code is fixed once the record exists/);
    this.name = page.getByRole('textbox', { name: 'Operation', exact: true });
    this.owningDepartment = page.getByRole('combobox', { name: 'Owning department', exact: true });
    this.difficultyGrade = page.getByRole('combobox', { name: 'Difficulty grade', exact: true });
    this.machineType = page.getByRole('combobox', { name: 'Machine type', exact: true });
    this.machineTypeHint = page.getByText(/^(Not required|Required) — the chosen grade is/);
    this.minimumSkillGrade = page.getByRole('combobox', {
      name: 'Minimum skill grade',
      exact: true,
    });
    this.standardTimeBasis = page.getByRole('combobox', {
      name: 'Standard time basis',
      exact: true,
    });
    this.defaultBasicMinutes = page.getByRole('textbox', { name: 'Default basic minutes' });
    this.defaultSamMinutes = page.getByRole('textbox', { name: 'Default SAM minutes' });
    this.defaultCycleTime = page.getByRole('textbox', { name: 'Default cycle time (min)' });
    this.minimumTime = page.getByRole('textbox', { name: 'Minimum time (min)' });
    this.motionStudy = page.getByRole('switch', { name: 'Backed by a motion study' });
    // "Last studied on", or "Last studied on *" while the motion-study switch is on.
    this.lastStudiedOnLabel = page.getByText(/^Last studied on( \*)?$/);
    this.motionElements = page.getByRole('textbox', { name: 'Motion elements' });
    this.addParameterButton = page.getByRole('button', { name: 'Add parameter' });
    this.parameterKeys = page.getByRole('textbox', { name: 'Parameter', exact: true });
    this.parameterValues = page.getByRole('textbox', { name: 'Value', exact: true });
    this.addSystemLinkButton = page.getByRole('button', { name: 'Add system link' });
    this.status = page.getByRole('combobox', { name: 'Status', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create operation' });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
    this.blockedToast = page.getByText(/^Fill the \d+ highlighted field\(s\) before saving/);
    this.codeTaken = page.getByText(/already taken|already used by/i);
  }

  /** An option inside whichever combobox popover is currently open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }

  /** Any raw-JSON editor (a textarea) — domain parameters must never be one. */
  jsonTextarea(): Locator {
    return this.page.getByRole('main').last().locator('textarea');
  }
}
