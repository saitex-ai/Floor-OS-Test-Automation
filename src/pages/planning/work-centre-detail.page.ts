import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { WorkCentreDetailLocators } from '../../locators/planning/work-centre-detail.locators';
import { detailValue } from '../../locators/planning/form-field.locators';
import { expectActionBlocked } from './master-data-list.page';
import { WAIT } from './waits';

/**
 * A work centre's read-only detail page. Owned by the Planning QA. Every
 * field is shown as text; "Edit work centre" opens the form at
 * /work-centres/<uuid>/edit — see WorkCentreFormPage.
 */
export class WorkCentreDetailPage extends BasePage {
  readonly locators: WorkCentreDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new WorkCentreDetailLocators(page);
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/work-centres\/[0-9a-f-]{36}$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.allWorkCentresLink).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(detailValue(this.page, 'Centre')).toHaveText(code);
  }

  /** Read-only: no inputs on the page; editing is the separate "Edit work centre". */
  async expectReadOnlyView(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible();
    await expect(this.locators.summary.getByRole('textbox')).toHaveCount(0);
    await expect(this.locators.summary.getByRole('combobox')).toHaveCount(0);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
  }

  /** A read-only user gets no working "Edit work centre", or is refused on the edit page. */
  async expectEditBlocked(): Promise<void> {
    await expect(this.locators.allWorkCentresLink).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectActionBlocked(this.page, this.locators.editButton, 'Save changes');
  }

  async value(label: string): Promise<string> {
    return (await detailValue(this.page, label).innerText()).trim();
  }

  async expectValue(label: string, value: string | RegExp): Promise<void> {
    await expect(detailValue(this.page, label)).toHaveText(value, { timeout: WAIT.SERVER });
  }

  async expectNoField(label: string | RegExp): Promise<void> {
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.summary.getByText(label)).toHaveCount(0);
  }

  async expectHeading(name: string | RegExp): Promise<void> {
    await expect(this.locators.heading).toHaveText(name);
  }
}
