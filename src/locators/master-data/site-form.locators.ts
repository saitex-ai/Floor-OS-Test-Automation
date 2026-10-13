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
  /** Only present on the read-only detail view (`/sites/<uuid>` before Edit is clicked). */
  readonly editButton: Locator;

  constructor(private readonly page: Page) {
    this.siteCode = page.getByRole('textbox', { name: 'Site code' });
    this.siteName = page.getByRole('textbox', { name: 'Site name' });
    this.country = page.getByRole('combobox', { name: 'Country', exact: true });
    this.timezone = page.getByRole('combobox', { name: 'Timezone', exact: true });
    this.activeSwitch = page.getByRole('switch', { name: 'Active' });
    // "Legal entities at this site" ("Add entity") no longer renders on the
    // Create/Edit Site form at all — confirmed live 2026-10-06 (0 matches).
    // Kept here (not removed) specifically so a regression test can assert
    // that absence rather than silently losing the ability to check it —
    // see sites-testcases.md TC:10.
    this.addEntityButton = page.getByRole('button', { name: 'Add entity' });
    this.addLinkButton = page.getByRole('button', { name: 'Add link' });
    this.createButton = page.getByRole('button', { name: 'Create site' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.editButton = page.getByRole('button', { name: 'Edit site' });
  }

  /** An option in the open Country/Timezone dropdown. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }
}
