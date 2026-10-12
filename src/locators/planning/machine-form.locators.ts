import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Machine create / edit form
 * (/planning/master-data/machines/new and /machines/<uuid>/edit). No
 * actions or assertions here, see src/pages/planning/machine-form.page.ts
 * for those.
 */
export class MachineFormLocators {
  readonly newHeading: Locator;
  readonly assetCode: Locator;
  readonly codeFixedHelp: Locator;
  readonly machineClass: Locator;
  readonly workCentre: Locator;
  readonly status: Locator;
  readonly inServiceSinceLabel: Locator;
  readonly addPropertyButton: Locator;
  readonly propertyKeys: Locator;
  readonly propertyValues: Locator;
  readonly addSystemLinkButton: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** "Saving rewrites this machine." / a "saves as a new version" notice on edit. */
  readonly saveNotice: Locator;
  readonly codeTaken: Locator;
  readonly requiredMessages: Locator;

  constructor(private readonly page: Page) {
    this.newHeading = page.getByRole('heading', { name: 'New machine', level: 1 });
    this.assetCode = page.getByRole('textbox', { name: 'Asset code' });
    this.codeFixedHelp = page.getByText(/The code is fixed once the record exists/);
    this.machineClass = page.getByRole('textbox', { name: 'Machine class' });
    this.workCentre = page.getByRole('combobox', { name: 'Work centre', exact: true });
    this.status = page.getByRole('combobox', { name: 'Status', exact: true });
    this.inServiceSinceLabel = page.getByText('In service since', { exact: true });
    this.addPropertyButton = page.getByRole('button', { name: 'Add property' });
    this.propertyKeys = page.getByRole('textbox', { name: 'Property', exact: true });
    this.propertyValues = page.getByRole('textbox', { name: 'Value', exact: true });
    this.addSystemLinkButton = page.getByRole('button', { name: 'Add system link' });
    this.createButton = page.getByRole('button', { name: 'Create machine' });
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

  /** Any raw-JSON editor (a textarea) — properties must never be one. */
  jsonTextarea(): Locator {
    return this.page.getByRole('main').last().locator('textarea');
  }
}
