import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { TransitionRuleViewLocators } from '../../locators/planning/transition-rules.locators';
import { TRANSITION_RULES_ROUTE } from './transition-rule-editor.page';
import { ensureRoute } from './navigation';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { WAIT } from './waits';

/**
 * A transition rule's read-only view page (/transition-rules/<id>): head
 * (code, class, derived subtitle, Note), facts, Applies when, Changeover,
 * Learning curve, usage line, and the Ramp chart / day table / narrative.
 * Only "Edit" leads to the editor.
 */
export class TransitionRuleViewPage extends BasePage {
  readonly l: TransitionRuleViewLocators;

  constructor(page: Page) {
    super(page);
    this.l = new TransitionRuleViewLocators(page);
  }

  async open(id: string): Promise<void> {
    const route = `${TRANSITION_RULES_ROUTE}/${id}`;
    await this.gotoAuthenticated(route);
    await ensureRoute(this.page, route);
    await expect(this.l.usage).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** On the view page of the rule called `name` (a create or save lands here). */
  async expectLoaded(name: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/transition-rules\/[0-9a-f-]{36}$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.l.heading).toHaveText(name, { timeout: WAIT.SERVER });
    await expect(this.l.usage).toBeVisible();
  }

  /** The rule id from the page URL. */
  idFromUrl(): string {
    return new URL(this.page.url()).pathname.split('/').pop()!;
  }

  async edit(): Promise<void> {
    await this.l.editButton.click();
    await expect(this.page).toHaveURL(/\/edit$/, { timeout: WAIT.NAVIGATION });
  }

  async expectReadOnly(): Promise<void> {
    await expect(this.l.editable).toHaveCount(0);
  }

  async expectEditAvailable(available: boolean): Promise<void> {
    if (available) await expect(this.l.editButton).toBeVisible();
    else {
      await expect(this.l.usage).toBeVisible({ timeout: WAIT.PAGE_LOAD });
      await expectAbsentOrDisabled(this.l.editButton);
    }
  }

  async expectNote(text: string | null): Promise<void> {
    if (text === null) await expect(this.l.note).toHaveCount(0);
    else await expect(this.l.note).toHaveText(`Note · ${text}`);
  }

  /** The page holds `text` (a fact such as "Entered as Day by day · fitted", a header line, …). */
  async expectText(text: string | RegExp): Promise<void> {
    await expect(this.l.main).toContainText(text);
  }

  async expectNoText(text: string | RegExp): Promise<void> {
    await expect(this.l.main).not.toContainText(text);
  }

  async expectConditions(items: string[]): Promise<void> {
    await expect(this.l.conditionsHeading).toBeVisible();
    // Each item's side and attribute are adjacent spans ("ToStyle class = …"): compare without spaces.
    const squash = (t: string) => t.replace(/\s+/g, '');
    await expect
      .poll(async () =>
        (
          await this.l.conditionsHeading
            .locator('xpath=following::ul[1]')
            .getByRole('listitem')
            .allInnerTexts()
        ).map(squash),
      )
      .toEqual(items.map(squash));
  }

  async expectNoConditions(scope: string): Promise<void> {
    await expect(this.l.noConditions).toHaveText(
      `No conditions — matches every change on ${scope}.`,
    );
  }

  async expectUsage(pattern: RegExp): Promise<void> {
    await expect(this.l.usage).toHaveText(pattern);
  }

  async expectNoActuals(): Promise<void> {
    await expect(this.l.noActuals).toBeVisible();
  }

  async expectLastRefitted(pattern: RegExp): Promise<void> {
    await expect(this.l.lastRefitted.first()).toContainText(pattern);
  }

  async expectChart(name: string | RegExp): Promise<void> {
    await expect(this.l.rampChart).toHaveAccessibleName(name);
  }

  async expectNarrative(pattern: RegExp): Promise<void> {
    await expect(this.l.narrative).toHaveText(pattern);
  }
}
