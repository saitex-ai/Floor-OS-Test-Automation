import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Facility create form
 * (/planning/master-data/facilities/new). No actions or assertions here,
 * see src/pages/planning/facility-form.page.ts for those.
 */
export class FacilityFormLocators {
  readonly newHeading: Locator;
  readonly name: Locator;
  readonly purpose: Locator;
  readonly site: Locator;
  readonly operator: Locator;
  readonly workingDay: Locator;
  readonly createButton: Locator;
  readonly doneButton: Locator;

  constructor(private readonly page: Page) {
    this.newHeading = page.getByRole('heading', { name: 'New facility', level: 1 });
    this.name = page.getByRole('textbox', { name: 'Facility name' });
    this.purpose = page.getByRole('textbox', { name: 'What it is for' });
    this.site = page.getByRole('combobox', { name: 'Site it stands on', exact: true });
    this.operator = page.getByRole('combobox', { name: 'Operated by', exact: true });
    this.workingDay = page.getByRole('combobox', { name: 'Working day', exact: true });
    // Two steps like the other Planning forms: "Save & continue" creates, then Areas, then "Done".
    this.createButton = page.getByRole('button', { name: 'Save & continue' });
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
  }

  /** An option inside whichever combobox popover is currently open. */
  options(): Locator {
    return this.page.getByRole('option');
  }
}
