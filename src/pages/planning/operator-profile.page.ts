import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperatorProfileLocators } from '../../locators/planning/operator-profile.locators';
import { WAIT } from './waits';

/**
 * An operator profile on Planning > Master Data > Operators &
 * Qualifications: the read-only view and its edit form. Owned by the
 * Planning QA. Qualifications aren't records of their own any more (dev
 * deploy 2026-10-14): they're rows of the profile, added in the edit form.
 */
export class OperatorProfilePage extends BasePage {
  readonly locators: OperatorProfileLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new OperatorProfileLocators(page);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/operators\/[0-9a-f-]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.qualificationsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.editProfileButton).toBeVisible();
  }

  async startEditing(): Promise<void> {
    await this.locators.editProfileButton.click();
    await expect(this.page).toHaveURL(/\/edit$/, { timeout: WAIT.NAVIGATION });
  }

  /** The edit form's qualifications table ends in an "Add a qualification" row. */
  async expectAddQualificationRow(): Promise<void> {
    await expect(this.locators.addQualificationButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.newRowActivity).toBeVisible();
    await expect(this.locators.newRowTask).toBeVisible();
    await expect(this.locators.saveChangesButton).toBeVisible();
  }

  /** Leaves the edit form without saving and lands back on the read-only profile. */
  async cancelEditing(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.page).not.toHaveURL(/\/edit$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.editProfileButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }
}
