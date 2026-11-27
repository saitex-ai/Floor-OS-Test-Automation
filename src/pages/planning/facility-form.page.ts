import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { FacilityFormLocators } from '../../locators/planning/facility-form.locators';
import { submitStepped, type SubmitResult } from './form-submit';
import { WAIT } from './waits';
import { ensureRoute } from './navigation';

export interface FacilityFieldValues {
  name: string;
  /** "What it is for" — carries the QA-AUTO marker. */
  purpose: string;
}

/**
 * The Facility create form on Planning > Master Data > Facility & areas
 * (/planning/master-data/facilities/new). Site, Operated by and Working
 * day are required and are references to existing master data: each takes
 * the first option that looks like QA test data, else the first one offered
 * (the facility is the record this creates; the picks are only read).
 */
export class FacilityFormPage extends BasePage {
  readonly locators: FacilityFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new FacilityFormLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/facilities/new');
    await ensureRoute(this.page, '/planning/master-data/facilities/new');
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** Opens `combo` (retrying a click made while the form still loads) and picks an option. */
  private async pickReference(combo: Locator, preferred: RegExp): Promise<void> {
    const options = this.locators.options();
    await expect(async () => {
      if (!(await options.first().isVisible())) await combo.click();
      await expect(options.first()).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.SERVER });
    const qa = options.filter({ hasText: preferred });
    await ((await qa.count()) > 0 ? qa.first() : options.first()).click();
    await expect(options).toHaveCount(0);
  }

  async fillRequired(values: FacilityFieldValues): Promise<void> {
    await this.locators.name.fill(values.name);
    await this.locators.purpose.fill(values.purpose);
    await this.pickReference(this.locators.site, /QA|Playwright|PW /);
    await this.pickReference(this.locators.operator, /QA/);
    await this.pickReference(this.locators.workingDay, /.+/);
  }

  /** Step 1's "Save & continue", then Done on the Areas step. */
  async submitCreate(): Promise<SubmitResult> {
    return submitStepped(this.locators.createButton, this.locators.doneButton);
  }
}
