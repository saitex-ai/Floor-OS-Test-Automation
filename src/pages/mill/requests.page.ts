import { type Locator, type Page, expect } from '@playwright/test';
import { MillScreenPage } from './mill-screen.page';
import { RequestsLocators } from '../../locators/mill/requests.locators';
import { MILL_REQUEST_SOURCES_TIMEOUT } from './mill-timeouts';

/**
 * Goods request & approval screen (/mill/requests). Owned by the Fabric
 * Mill QA. Element locators live in RequestsLocators (`this.locators`).
 */
export class RequestsPage extends MillScreenPage {
  protected readonly subPath = '/requests';
  protected readonly navLabel = 'Goods Requests';
  readonly locators: RequestsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new RequestsLocators(page);
  }

  get heading(): Locator {
    return this.locators.heading;
  }

  /** Opens the "New request" page (/mill/requests/new) from the request list. */
  async openNewRequestForm(): Promise<void> {
    await this.locators.newRequestButton.click();
    await expect(this.page).toHaveURL(/\/mill\/requests\/new$/);
    await expect(this.locators.newRequestHeading).toBeVisible();
  }

  /**
   * Only a raise-any user (e.g. a stores admin) sees "Requesting
   * department", and on dev it starts with nothing applied ("Request
   * materials for -") even though the picker shows Finishing — so pick
   * one explicitly. Preparation pulls yarn from Spinning. The picker is
   * a searchable combobox (cmdk popover), not a native <select>.
   */
  async chooseRequestingDepartment(department: string): Promise<void> {
    if (await this.locators.requestingDepartmentCombobox.isVisible()) {
      await this.locators.requestingDepartmentCombobox.click();
      await this.locators.comboboxOptions.filter({ hasText: department }).first().click();
    }
    await expect(this.locators.requestMaterialsCard).toHaveText(
      `Request materials for ${department}`,
    );
  }

  /**
   * The "From {source}" region for the chosen department's upstream
   * source — there is just the one per department since the redesign
   * (e.g. Preparation only pulls from Spinning). Returns null if nothing
   * is pullable right now ("Nothing to pull right now").
   */
  async firstPullableSource(): Promise<Locator | null> {
    await expect(this.locators.requestMaterialsCard).toBeVisible();
    await expect(this.locators.sourceRegions.first().or(this.locators.nothingToPull)).toBeVisible({
      timeout: MILL_REQUEST_SOURCES_TIMEOUT,
    });
    if (await this.locators.nothingToPull.isVisible()) return null;
    return this.locators.sourceRegions.first();
  }

  /**
   * Picks the first unit in `source`'s searchable-combobox material
   * picker (a popup list of "{code} · {batch} · {qty} available" rows,
   * not a native <select>), then overwrites the quantity it auto-fills
   * with the full available amount.
   */
  async enterFirstUnit(source: Locator, quantity: string): Promise<void> {
    await source.getByRole('combobox').first().click();
    await this.locators.comboboxOptions.first().click();
    await source.getByRole('textbox').first().fill(quantity);
  }

  /**
   * The region's "Submit request to {source}" button. Since the New request
   * page (2026-10-26) a picked unit goes straight onto the request, so this
   * replaces the old per-unit "Add" button.
   */
  submitRequestButton(source: Locator): Locator {
    return source.getByRole('button', { name: /^Submit request to / });
  }
}
