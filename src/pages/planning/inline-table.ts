import { type Locator, type Page, expect } from '@playwright/test';
import { InlineTableLocators } from '../../locators/planning/inline-table.locators';
import { alertsIn } from '../../locators/planning/form-field.locators';
import { type SubmitResult } from './form-submit';
import { WAIT } from './waits';

/**
 * One inline table on step 2 of a stepped Planning form (or its read-only
 * copy on the detail page) — see InlineTableLocators. The screen's own page
 * object fills the row's inputs; this adds, edits, saves and reads rows.
 */
export class InlineTable {
  readonly locators: InlineTableLocators;

  constructor(
    private readonly page: Page,
    title: string,
    noun: string,
    scope?: Locator,
  ) {
    this.locators = new InlineTableLocators(page, title, noun, scope);
  }

  /**
   * The row inputs go in: the row open for editing if there is one,
   * otherwise the add row (its Add is disabled while another row is edited).
   */
  async inputRow(): Promise<Locator> {
    return (await this.locators.editingRow.count()) > 0
      ? this.locators.editingRow
      : this.locators.addRow;
  }

  async expectAddRow(): Promise<void> {
    await expect(this.locators.addButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** The detail page's copy: rows only, no add row and no row Edit. */
  async expectReadOnly(): Promise<void> {
    await expect(this.locators.table).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.addButton).toHaveCount(0);
  }

  /**
   * Presses the add row's "Add <noun>" — see submitRow(). Once it's saved,
   * waits for the add row to reset (its Clear goes): until then the step's
   * Cancel / Done are refused ("Add or save the … you are typing, or clear
   * it, first.").
   */
  async add(): Promise<SubmitResult> {
    const result = await this.submitRow(this.locators.addButton);
    if (result === 'submitted')
      await expect(this.locators.clearButton).toHaveCount(0, { timeout: WAIT.SERVER });
    return result;
  }

  /**
   * Discards what's typed in the add row with its "Clear" (✕). The step's
   * Cancel / Done refuse to leave while the add row holds input, so this is
   * how a new row is cancelled.
   */
  async clearAddRow(): Promise<void> {
    // Clear only shows once the row has been used; an untouched row has nothing to drop.
    if (!(await this.locators.clearButton.isVisible())) return;
    await this.locators.clearButton.click();
    await expect(this.locators.clearButton).toHaveCount(0);
  }

  async startEdit(key: string): Promise<void> {
    await this.locators.editButton(key).click();
    await expect(this.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /**
   * Presses the editing row's Save — see submitRow(). Once it's saved,
   * waits for the row to close: the step's Done is refused while a row is
   * still open for editing.
   */
  async save(): Promise<SubmitResult> {
    const result = await this.submitRow(this.locators.saveButton);
    if (result === 'submitted')
      await expect(this.locators.editingRow).toHaveCount(0, { timeout: WAIT.SERVER });
    return result;
  }

  async cancelEdit(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.editingRow).toHaveCount(0);
  }

  /**
   * Clicks a row's Add / Save and reports what happened, without hanging.
   * A row saves through a write request (POST / PUT / PATCH — a calendar's
   * entries go through the calendar itself), so the outcome is that
   * request's status. Client-side validation ("Required" in the row) sends
   * nothing, so no request within WAIT.NAVIGATION means it was blocked.
   */
  private async submitRow(button: Locator): Promise<SubmitResult> {
    await expect(button).toBeVisible();
    if (await button.isDisabled()) return 'blocked-disabled';
    const response = this.page
      .waitForResponse(
        (r) =>
          /\/api\/planning\//.test(r.url()) &&
          /^(POST|PUT|PATCH)$/.test(r.request().method()) &&
          r.ok(),
        { timeout: WAIT.NAVIGATION }, // a row save took over 15s under 2 workers on dev
      )
      .catch(() => null);
    await button.click();
    // The first successful write, not just the first write: on 2026-10-29 a
    // calendar line read as blocked while "Calendar saved." showed.
    return (await response) ? 'submitted' : 'blocked-after-submit';
  }

  async expectRow(key: string): Promise<void> {
    await expect(this.locators.row(key)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNoRow(key: string): Promise<void> {
    await expect(this.locators.row(key)).toHaveCount(0);
  }

  /** The N in the heading "<Title> (N)". */
  async count(): Promise<number> {
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    // textContent: the heading is upper-cased by CSS, which innerText applies.
    const text = (await this.locators.heading.textContent()) ?? '';
    return Number(/\((\d+)\)/.exec(text)?.[1] ?? NaN);
  }

  /**
   * The options a row's combobox offers, then closes the list without
   * Escape — Escape also cancels a row being edited. It re-picks the value
   * the combobox shows; with nothing picked yet it's the add row, where
   * Escape is harmless.
   */
  async optionsOf(combo: Locator): Promise<string[]> {
    const current = ((await combo.textContent()) ?? '').trim();
    await combo.click();
    const options = this.locators.options();
    await expect(options.first()).toBeVisible();
    const texts = (await options.allInnerTexts()).map((o) => o.trim());
    const same = texts.findIndex((t) => t === current || t.startsWith(`${current} ·`));
    if (current && same >= 0) await options.nth(same).click();
    else await this.page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
    return texts;
  }

  /** The "Required" messages in the row inputs go in. */
  async requiredMessages(): Promise<Locator> {
    return alertsIn(await this.inputRow()).filter({ hasText: /^Required$/ });
  }
}
