import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { ValidationRulesLocators } from '../../locators/techpack/validation-rules.locators';

export const VALIDATION_RULES_PATH = '/techpacks/admin/validation-rules';

export type RuleStatus = 'Draft' | 'Suggested' | 'Active' | 'Disabled' | 'Archived';

export interface NewRuleInput {
  name: string;
  description?: string;
  severity?: 'Error' | 'Warning' | 'Info';
  scopeJson?: string;
  assertionJson?: string;
}

/**
 * Techpack — Validation rules list + New/Edit rule dialog. Owned by the
 * Techpack QA. Locators live in ValidationRulesLocators (`this.locators`);
 * this class only holds flows/actions/assertions built on top of them.
 *
 * Real lifecycle (confirmed live on uat 2026-09-30/10-01): New rule ->
 * Draft (v1) -> Activate -> Active -> Disable / Archive (Archive has its own
 * "Archive this rule?" confirmation and is terminal). Every action closes
 * the dialog and shows a toast ("Validation rule created" / "...
 * activated" / "... updated").
 *
 * The grid can briefly render rows with blank cells while still loading
 * (same shape of gotcha already documented for the Techpacks list and
 * BOM in the Techpack QA's working notes) — every row read here waits on
 * real cell text first, not just row count.
 */
export class ValidationRulesPage extends BasePage {
  readonly locators: ValidationRulesLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ValidationRulesLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(VALIDATION_RULES_PATH);
    await this.expectLoaded();
  }

  /** TC:1/TC:28's real user path: Techpacks list -> Open navigation -> "Validation rules". */
  async openViaTechpackNav(): Promise<void> {
    await this.gotoAuthenticated(MODULES['techpack'].path);
    await expect(this.locators.techpacksListHeading).toBeVisible({ timeout: 60_000 });
    await this.locators.openNavigationButton.click();
    await expect(this.locators.validationRulesNavLink).toBeVisible({ timeout: 10_000 });
    await this.locators.validationRulesNavLink.click();
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${VALIDATION_RULES_PATH}/?$`));
    // Same remote-bundle cold-start budget as TechpackPage.expectLoaded().
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await this.waitForGridSettled();
  }

  /** Waits until the grid shows either a real (non-blank) first row or its empty state. */
  async waitForGridSettled(timeout = 30_000): Promise<void> {
    await expect
      .poll(
        async () => {
          if (await this.locators.emptyStateTitle.isVisible()) return 'empty';
          const first = this.locators.dataRows.first().getByRole('cell').first();
          if (!(await first.count())) return 'loading';
          return (await first.innerText()).trim() ? 'rows' : 'loading';
        },
        { timeout, message: 'Validation rules grid never finished loading' },
      )
      .not.toBe('loading');
  }

  /** Reads the live count off a primary status tab, e.g. "Active 32" -> 32. */
  async tabCount(tab: 'All' | 'Draft' | 'Suggested' | 'Active'): Promise<number> {
    return countFrom(await this.locators.statusTab(tab).innerText());
  }

  async openMoreTabs(): Promise<void> {
    await this.locators.moreTabsButton.click();
    await expect(this.locators.overflowTab('Disabled')).toBeVisible({ timeout: 10_000 });
  }

  /** Reads "Disabled"/"Archived" counts from the "+2 more" overflow (opens and closes it). */
  async overflowTabCount(tab: 'Disabled' | 'Archived'): Promise<number> {
    await this.openMoreTabs();
    const text = await this.locators.overflowTab(tab).innerText();
    await this.page.keyboard.press('Escape');
    return countFrom(text);
  }

  async selectTab(tab: 'All' | 'Draft' | 'Suggested' | 'Active'): Promise<void> {
    await this.locators.statusTab(tab).click();
    await expect(this.locators.statusTab(tab)).toHaveAttribute('aria-pressed', 'true');
    await this.waitForGridSettled();
  }

  /** Types into the filter box and waits until every visible row matches (or the empty state shows). */
  async filter(query: string): Promise<void> {
    await this.locators.filterInput.fill(query);
    const needle = query.toLowerCase();
    await expect
      .poll(
        async () => {
          if (await this.locators.emptyStateTitle.isVisible()) return true;
          const rows = await this.locators.dataRows.allInnerTexts();
          return rows.length > 0 && rows.every((r) => r.toLowerCase().includes(needle));
        },
        { timeout: 30_000, message: `grid never narrowed to "${query}"` },
      )
      .toBe(true);
  }

  /** Column header labels, in on-screen order ("Id", "Name", ...). */
  async headerLabels(): Promise<string[]> {
    return (await this.locators.columnHeaders.allInnerTexts()).map((t) => t.trim());
  }

  /** Every visible data row as a header-label -> cell-text map. */
  async visibleRows(): Promise<Record<string, string>[]> {
    await this.waitForGridSettled();
    if (await this.locators.emptyStateTitle.isVisible()) return [];
    const headers = await this.headerLabels();
    const rows: Record<string, string>[] = [];
    const count = await this.locators.dataRows.count();
    for (let i = 0; i < count; i++) {
      const cells = (await this.locators.dataRows.nth(i).getByRole('cell').allInnerTexts()).map(
        (t) => t.trim(),
      );
      rows.push(Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ''])));
    }
    return rows;
  }

  async columnValues(column: string): Promise<string[]> {
    return (await this.visibleRows()).map((r) => r[column] ?? '');
  }

  /**
   * The one row whose Id or Name equals `idOrName` — filters the grid to it
   * first. Returns null if no such row shows up (after filtering).
   */
  async findRule(idOrName: string): Promise<Record<string, string> | null> {
    await this.filter(idOrName);
    const rows = await this.visibleRows();
    return rows.find((r) => r['Id'] === idOrName || r['Name'] === idOrName) ?? null;
  }

  /** Polls a rule's list row until `column` reads `expected`, re-filtering (fresh data) each time. */
  async expectRuleColumn(idOrName: string, column: string, expected: string): Promise<void> {
    await expect
      .poll(
        async () => {
          await this.page.reload();
          await this.expectLoaded();
          return (await this.findRule(idOrName))?.[column];
        },
        { timeout: 60_000, intervals: [1_000, 3_000, 5_000] },
      )
      .toBe(expected);
  }

  /** Filters to a rule and clicks its row, opening the Edit validation rule dialog. */
  async openRule(idOrName: string): Promise<void> {
    await this.filter(idOrName);
    const row = this.locators.row(idOrName).first();
    await row.getByRole('cell').nth(1).click();
    await expect(this.locators.editRuleDialog).toBeVisible({ timeout: 15_000 });
  }

  async openNewRule(): Promise<void> {
    await this.locators.newRuleButton.click();
    await expect(this.locators.newRuleDialog).toBeVisible({ timeout: 15_000 });
  }

  /** Expands "Advanced — rule JSON" (no-op if already expanded). */
  async expandAdvanced(): Promise<void> {
    if (await this.locators.assertionInput.isVisible()) return;
    await this.locators.advancedToggle.click();
    await expect(this.locators.assertionInput).toBeVisible({ timeout: 5_000 });
  }

  async severityOptions(): Promise<string[]> {
    await this.locators.severityCombobox.click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 5_000 });
    const texts = (await options.allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    return texts;
  }

  async selectSeverity(severity: 'Error' | 'Warning' | 'Info'): Promise<void> {
    await this.locators.severityCombobox.click();
    await this.page.getByRole('option', { name: severity, exact: true }).click();
    await expect(this.locators.severityCombobox).toContainText(severity);
  }

  /** Fills the New rule dialog (already open). Does not submit. */
  async fillNewRule(input: NewRuleInput): Promise<void> {
    await this.locators.nameInput.fill(input.name);
    if (input.description) await this.locators.descriptionInput.fill(input.description);
    if (input.severity) await this.selectSeverity(input.severity);
    if (input.scopeJson || input.assertionJson) await this.expandAdvanced();
    if (input.scopeJson) await this.locators.scopeInput.fill(input.scopeJson);
    if (input.assertionJson) await this.locators.assertionInput.fill(input.assertionJson);
  }

  /** Full create flow: open, fill, Create rule, wait for the success toast and the dialog closing. */
  async createRule(input: NewRuleInput): Promise<void> {
    await this.openNewRule();
    await this.fillNewRule(input);
    await expect(this.locators.createRuleButton).toBeEnabled({ timeout: 5_000 });
    await this.locators.createRuleButton.click();
    await expect(this.locators.toast('Validation rule created')).toBeVisible({ timeout: 20_000 });
    await expect(this.locators.newRuleDialog).toBeHidden({ timeout: 15_000 });
  }

  /** Reads the open Edit dialog's own status badge + "Version N" header. */
  async dialogStatusAndVersion(): Promise<{ status: string; version: number }> {
    const text = await this.locators.editRuleDialog.innerText();
    const match = text.match(/\b(Draft|Suggested|Active|Disabled|Archived)\b\s*Version\s*(\d+)/);
    if (!match)
      throw new Error(
        `Could not read status/version out of the Edit dialog:\n${text.slice(0, 400)}`,
      );
    return { status: match[1] ?? '', version: Number(match[2]) };
  }

  /**
   * The dialog's action buttons (lifecycle + Cancel/Save/Close), in DOM
   * order — excludes field-level buttons ("Generate", the "Search ..."
   * pickers) so tests can compare against an exact expected set.
   */
  async dialogActionButtons(): Promise<string[]> {
    const names: string[] = [];
    const buttons = this.locators.ruleDialog.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i);
      const name = ((await b.getAttribute('aria-label')) ?? (await b.innerText())).trim();
      if (!name || name === 'Generate' || name.startsWith('Search ')) continue;
      names.push(name);
    }
    return names;
  }

  async closeDialog(): Promise<void> {
    if (await this.locators.ruleDialog.isVisible()) {
      await this.locators.closeButton.click();
      await expect(this.locators.ruleDialog).toBeHidden({ timeout: 10_000 });
    }
  }

  async activate(): Promise<void> {
    await this.locators.activateButton.click();
    await expect(this.locators.toast('Validation rule activated')).toBeVisible({ timeout: 20_000 });
  }

  /** Clicks Archive in the Edit dialog and returns once the confirmation is showing. */
  async startArchive(): Promise<void> {
    await this.locators.archiveButton.click();
    await expect(this.locators.archiveConfirmDialog).toBeVisible({ timeout: 10_000 });
  }

  async confirmArchive(): Promise<void> {
    await this.locators.archiveConfirmButton.click();
    await expect(this.locators.archiveConfirmDialog).toBeHidden({ timeout: 15_000 });
  }

  /**
   * Best-effort cleanup for a disposable rule: archives it if it isn't
   * already Archived. Never throws — used from afterAll safety nets.
   */
  async archiveIfNotArchived(idOrName: string): Promise<string> {
    try {
      await this.open();
      const row = await this.findRule(idOrName);
      if (!row) return 'not-found';
      if (row['Status'] === 'Archived') return 'already-archived';
      await this.openRule(idOrName);
      if (!(await this.locators.archiveButton.count())) {
        await this.closeDialog();
        return `no-archive-button (status ${row['Status']})`;
      }
      await this.startArchive();
      await this.confirmArchive();
      await this.closeDialog();
      return 'archived';
    } catch (e) {
      return `cleanup-error: ${(e as Error).message.split('\n')[0]}`;
    }
  }
}

function countFrom(text: string): number {
  const match = text.match(/(\d+)\s*$/m) ?? text.match(/(\d+)/);
  if (!match) throw new Error(`Could not read a count out of tab text "${text}"`);
  return Number(match[1]);
}
