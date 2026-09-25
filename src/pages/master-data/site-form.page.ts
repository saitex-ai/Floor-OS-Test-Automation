import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { SiteFormLocators } from '../../locators/master-data/site-form.locators';

export interface SiteFieldValues {
  code: string;
  name: string;
}

/**
 * The "New site" / edit-site page (same field set either way) on the
 * top-level Master Data module. Real route for create:
 * /master-data/system-management/sites/new. Owned by the Master Data QA
 * (shared module). Element locators live in SiteFormLocators
 * (`this.locators`) — this class only holds flows/actions/assertions
 * built on top of them.
 */
export class SiteFormPage extends BasePage {
  readonly locators: SiteFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SiteFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /**
   * Site code + Site name are the only two fields actually needed to
   * save — confirmed live: Country, Timezone, Legal entities, and Links
   * to other systems are all genuinely optional despite Country/Timezone
   * visually looking required (matches this repo's own historical
   * TC-CS-07 finding, filed as a bug: "Country/Timezone not enforced
   * despite being required fields"). A save with none of those set
   * succeeds and the new row shows "Not set" / "No entities" on the list.
   */
  async fillRequired(values: SiteFieldValues): Promise<void> {
    await this.locators.siteCode.fill(values.code);
    await this.locators.siteName.fill(values.name);
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Real toast text confirmed live: "Site created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Site created.')).toBeVisible({ timeout: 15_000 });
  }
}
