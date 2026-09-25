import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New site" / edit-site form (same field
 * set either way). No actions or assertions here, see
 * src/pages/master-data/site-form.page.ts for those.
 */
export class SiteFormLocators {
  readonly siteCode: Locator;
  readonly siteName: Locator;
  readonly country: Locator;
  readonly timezone: Locator;
  readonly activeSwitch: Locator;
  readonly addEntityButton: Locator;
  readonly addLinkButton: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.siteCode = page.getByRole('textbox', { name: 'Site code' });
    this.siteName = page.getByRole('textbox', { name: 'Site name' });
    this.country = page.getByRole('combobox', { name: 'Country', exact: true });
    this.timezone = page.getByRole('combobox', { name: 'Timezone', exact: true });
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    this.addEntityButton = page.getByRole('button', { name: 'Add entity' });
    this.addLinkButton = page.getByRole('button', { name: 'Add link' });
    this.createButton = page.getByRole('button', { name: 'Create site' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }
}
