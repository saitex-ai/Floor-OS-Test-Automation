import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Work Centre create / edit form
 * (/planning/master-data/work-centres/new and /work-centres/<uuid>/edit) —
 * a much larger form than this app's other Master Data screens (21
 * fields), most of them optional. No actions or assertions here, see
 * src/pages/planning/work-centre-form.page.ts for those.
 *
 * Required (an empty submit flags exactly these, 2026-10-12): Centre code,
 * Name, Owning department, What it is used for, Centre type, How capacity
 * is measured, Capacity unit, Status. Every combobox opens a real
 * `role=option` listbox (Owning department's is live-sourced from the
 * Departments master).
 */
export class WorkCentreFormLocators {
  readonly newHeading: Locator;
  readonly centreCode: Locator;
  /** New form, since the 2026-10-16 deploy: the code is generated on save. */
  readonly codeGeneratedHelp: Locator;
  readonly codeFixedHelp: Locator;
  readonly name: Locator;
  readonly owningDepartment: Locator;
  readonly area: Locator;
  readonly usedFor: Locator;
  readonly centreType: Locator;
  readonly capacityMeasuredBy: Locator;
  readonly capacityUnit: Locator;
  readonly addCapabilityButton: Locator;
  readonly noCapabilities: Locator;
  readonly capabilityMatchesOn: Locator;
  readonly capabilityCode: Locator;
  readonly capabilityPreferred: Locator;
  readonly baselineOperators: Locator;
  readonly targetEfficiency: Locator;
  readonly machines: Locator;
  readonly workingCalendar: Locator;
  readonly confirmationTime: Locator;
  readonly capacityPerDay: Locator;
  readonly status: Locator;
  /** Removed on request (Demo Feedback z941abwdad) — expected absent. */
  readonly effectiveDateLabels: Locator;
  readonly centreTypeHelp: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** "Saving rewrites this work centre." / a "saves as a new version" notice on edit. */
  readonly saveNotice: Locator;
  readonly codeTaken: Locator;
  readonly requiredMessages: Locator;

  constructor(private readonly page: Page) {
    this.newHeading = page.getByRole('heading', { name: 'New work centre', level: 1 });
    this.centreCode = page.getByRole('textbox', { name: 'Centre code' });
    this.codeGeneratedHelp = page.getByText(/Assigned automatically when the record is saved/);
    this.codeFixedHelp = page.getByText(/The code is fixed once the record exists/);
    this.name = page.getByRole('textbox', { name: 'Name', exact: true });
    this.owningDepartment = page.getByRole('combobox', { name: 'Owning department', exact: true });
    this.area = page.getByRole('combobox', { name: 'Area it sits in', exact: true });
    this.usedFor = page.getByRole('combobox', { name: 'What it is used for', exact: true });
    this.centreType = page.getByRole('combobox', { name: 'Centre type', exact: true });
    this.capacityMeasuredBy = page.getByRole('combobox', {
      name: 'How capacity is measured',
      exact: true,
    });
    this.capacityUnit = page.getByRole('combobox', { name: 'Capacity unit', exact: true });
    this.addCapabilityButton = page.getByRole('button', { name: 'Add capability' });
    this.noCapabilities = page.getByText(
      'No capabilities recorded — nothing can be scheduled here.',
    );
    this.capabilityMatchesOn = page.getByRole('combobox', { name: 'Matches on', exact: true });
    this.capabilityCode = page.getByRole('textbox', { name: 'Activity or type' });
    this.capabilityPreferred = page.getByRole('combobox', { name: 'Preferred', exact: true });
    this.baselineOperators = page.getByRole('textbox', { name: 'Baseline operators' });
    this.targetEfficiency = page.getByRole('textbox', { name: 'Target efficiency' });
    this.machines = page.getByRole('textbox', { name: 'Machines', exact: true });
    this.workingCalendar = page.getByRole('combobox', { name: 'Working calendar', exact: true });
    this.confirmationTime = page.getByRole('textbox', { name: 'Confirmation time (hrs)' });
    this.capacityPerDay = page.getByRole('textbox', { name: /^Capacity per day/ });
    this.status = page.getByRole('combobox', { name: 'Status', exact: true });
    this.effectiveDateLabels = page.getByText(/^Effective (from|to)\b/);
    this.centreTypeHelp = page.getByText(/^The class of centre/);
    // Since the 2026-10-28 dev deploy a centre type with stations (e.g. Sewing
    // lines) adds a second step: step 1's button turns from "Create work
    // centre" into "Save & continue", which creates it and opens Stations.
    this.createButton = page.getByRole('button', {
      name: /^(Create work centre|Save & continue)$/,
    });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
    this.codeTaken = page.getByText(/already taken|already used by/i);
    this.requiredMessages = page.getByRole('alert').filter({ hasText: /^Required$/ });
  }

  /** An option inside whichever combobox popover is currently open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
