import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { QualificationFormLocators } from '../../locators/planning/qualification-form.locators';

export interface QualificationFieldValues {
  /** Live-sourced from Employees & Skills — defaults to a random operator if omitted. */
  operator?: string | RegExp;
  /** Live-sourced task list (the finer grain) — defaults to a random task if omitted. Activity is left blank either way. */
  task?: string | RegExp;
}

/**
 * The "New qualification" create form on Planning > Master Data >
 * Qualifications. Real route: /planning/master-data/qualifications/new.
 * Owned by the Planning QA. Element locators live in
 * QualificationFormLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class QualificationFormPage extends BasePage {
  readonly locators: QualificationFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new QualificationFormLocators(page);
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  private async pick(combo: Locator, option: string | RegExp): Promise<void> {
    await combo.click();
    await this.page.waitForTimeout(500);
    await this.locators.option(option).click();
  }

  /**
   * Picks a random real option from whichever combobox popover is
   * currently open — used for Operator/Task since their combination is a
   * real uniqueness key (a repeat pair is blocked with "already exists"),
   * so a fixed pair would only work on the first run against shared dev
   * data. Excludes the "—" placeholder option Task/Activity start on.
   *
   * The wait after opening is deliberate, not decorative: without it, the
   * popover's own list is still settling when `.click()` fires, and the
   * specific option node gets detached/replaced mid-click — confirmed
   * live 2026-09-25 as a real "element was detached from the DOM,
   * retrying" failure that eventually times out. Every exploration script
   * this session used the same settle-wait before touching combobox
   * options; this one had it missing.
   */
  private async pickRandom(combo: Locator): Promise<void> {
    await combo.click();
    await this.page.waitForTimeout(500);
    const options = this.locators.option(/.+/).filter({ hasNotText: /^—$/ });
    const count = await options.count();
    await options.nth(Math.floor(Math.random() * count)).click();
  }

  /**
   * Operator + Task (the finer of the two either/or grains — Activity is
   * left blank, confirmed live that leaving both blank is what's actually
   * blocked, not requiring both) + Efficiency vs standard + Assessed by —
   * the 4 fields confirmed live to actually block save. Qualified /
   * Measured minutes / Last assessed (already pre-filled to today) /
   * Valid until / Active all already carry a usable default that a
   * single-qualification happy path doesn't need to touch.
   */
  async fillRequired(values: QualificationFieldValues = {}): Promise<void> {
    if (values.operator) await this.pick(this.locators.operator, values.operator);
    else await this.pickRandom(this.locators.operator);

    if (values.task) await this.pick(this.locators.task, values.task);
    else await this.pickRandom(this.locators.task);

    await this.locators.efficiencyVsStandard.fill('100');
    await this.pick(this.locators.assessedBy, 'IE assessment');
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /**
   * Real toast text confirmed live: "Qualification created." A successful
   * create navigates to the new qualification's own detail page at
   * /planning/master-data/qualifications/<uuid> (a UUID, not a code —
   * differs from Calendars' own code-in-URL pattern).
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page.getByText('Qualification created.')).toBeVisible({ timeout: 15_000 });
    await expect(this.page).toHaveURL(/\/planning\/master-data\/qualifications\/[0-9a-f-]+$/);
  }

  /**
   * Fills a random Operator/Task pair and submits, retrying with a fresh
   * random pair whenever the app rejects it as a genuine duplicate —
   * confirmed live (2026-09-25) this is a real, expected `409 CONFLICT`
   * from `POST /api/planning/qualifications` ("<operator> already has a
   * qualification for <task>"), not a bug: a handful of long-lived
   * fixture operators (e.g. `E-0001`) already hold qualifications for
   * most of the ~12 available tasks from years of prior QA sessions
   * against this shared dev environment, so a genuinely random pair has a
   * real, non-negligible chance of colliding on any given run.
   *
   * Reads the real POST response status directly rather than racing toast
   * visibility — an earlier version raced `getByText()` on the success vs.
   * duplicate toast, which was itself flaky (a toast can already have
   * auto-dismissed by the time a follow-up `isVisible()` check runs,
   * confirmed live as a real false-negative). The response is unambiguous
   * and has no such timing window. Any status other than 201/409 is
   * treated as a real, unexpected failure, not swallowed.
   */
  async createRandomQualification(maxAttempts = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.fillRequired();

      const responsePromise = this.page.waitForResponse(
        (res) => res.request().method() === 'POST' && res.url().includes('/api/planning/qualifications'),
      );
      await this.create();
      const response = await responsePromise;

      if (response.status() === 201) {
        await expect(this.page).toHaveURL(/\/planning\/master-data\/qualifications\/[0-9a-f-]+$/);
        return;
      }
      if (response.status() === 409) {
        continue; // known, expected collision — retry with a fresh random pair
      }
      throw new Error(
        `Unexpected POST /api/planning/qualifications status ${response.status()}: ${await response.text()}`,
      );
    }
    throw new Error(`Could not create a qualification after ${maxAttempts} random Operator/Task attempts`);
  }
}
