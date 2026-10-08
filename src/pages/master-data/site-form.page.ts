import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { SiteFormLocators } from '../../locators/master-data/site-form.locators';

export interface SiteFieldValues {
  code: string;
  name: string;
  /** Defaults to Vietnam. */
  country?: string | RegExp;
  /** Defaults to Asia/Ho_Chi_Minh. */
  timezone?: string | RegExp;
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
   * Site code, Site name, Country and Timezone. Country/Timezone are now
   * enforced (confirmed live on dev 2026-10-01 — Create shows "Required"
   * under both), fixing the earlier "Country/Timezone not enforced"
   * finding. Legal entities and Links to other systems stay optional.
   */
  async fillRequired(values: SiteFieldValues): Promise<void> {
    await this.locators.siteCode.fill(values.code);
    await this.locators.siteName.fill(values.name);

    await this.locators.country.click();
    await this.locators
      .option(values.country ?? /^VN — /)
      .first()
      .click();
    await this.locators.timezone.click();
    await this.locators
      .option(values.timezone ?? /Ho_Chi_Minh|Saigon/)
      .first()
      .click();
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /** Real toast text confirmed live: "Site created." */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Site created.')).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Real error confirmed live: "A site with this code already exists. Use
   * a different code." Unlike Departments (whose duplicate codes are
   * silently accepted — see DepartmentFormPage), Sites genuinely blocks
   * this: the page stays on /sites/new, no second record is created.
   */
  async expectDuplicateCodeError(): Promise<void> {
    await expect(
      this.page.getByText('A site with this code already exists. Use a different code.'),
    ).toBeVisible({ timeout: 15_000 });
  }

  /** True on the read-only detail view reached by clicking a Sites-list row (before "Edit site" is clicked). */
  async expectOnDetailPage(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible({ timeout: 15_000 });
  }

  async clickEdit(): Promise<void> {
    await this.locators.editButton.click();
  }

  async toggleActive(): Promise<void> {
    await this.locators.activeSwitch.click();
  }

  async isActive(): Promise<boolean> {
    return (await this.locators.activeSwitch.getAttribute('aria-checked')) === 'true';
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Real toast text confirmed live: "Site updated." */
  async expectUpdatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Site updated.')).toBeVisible({ timeout: 15_000 });
  }

  async expectValidationError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }
}
