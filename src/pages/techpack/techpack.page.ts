import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { TechpackLocators } from '../../locators/techpack/techpack.locators';

/**
 * Techpacks list (the module landing view). Owned by the Techpack QA.
 * Element locators live in TechpackLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them.
 */
export class TechpackPage extends BasePage {
  readonly locators: TechpackLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new TechpackLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['techpack'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(MODULES['techpack'].path));
    // Below the shell's own login gate (see gotoAuthenticated()), the
    // Techpack remote itself shows a "Loading Techpacks…" placeholder
    // while its bundle fetches/mounts — confirmed on dev.flooros.app,
    // where this can outlast the default assertion timeout on a cold
    // browser profile. Give this specific, always-first check more room.
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
  }

  async search(query: string): Promise<void> {
    await this.locators.searchInput.fill(query);
  }

  async openRow(techpackCode: string): Promise<void> {
    await this.locators.rowLink(techpackCode).click();
  }

  /** Opens the New Techpack menu and picks "Classic" (the manual form). */
  async startClassicCreate(): Promise<void> {
    await this.locators.newTechpackDropdown.click();
    await this.locators.classicMenuItem.click();
  }

  /** Opens the New Techpack menu and picks "AI Mode" explicitly. */
  async startAiModeCreateFromMenu(): Promise<void> {
    await this.locators.newTechpackDropdown.click();
    await this.locators.aiModeMenuItem.click();
  }

  /** The default action of the split button — always AI Mode. */
  async clickNewTechpackDefault(): Promise<void> {
    await this.locators.newTechpackButton.click();
  }

  async expectRowVisible(techpackCode: string): Promise<void> {
    await expect(this.locators.rowLink(techpackCode)).toBeVisible();
  }

  async expectRowNotVisible(techpackCode: string): Promise<void> {
    await expect(this.locators.rowLink(techpackCode)).toHaveCount(0);
  }

  async selectTab(tab: 'All' | 'Draft' | 'Open' | 'Approved'): Promise<void> {
    await this.locators.statusTab(tab).click();
  }

  async expectTabSelected(tab: 'All' | 'Draft' | 'Open' | 'Approved'): Promise<void> {
    await expect(this.locators.statusTab(tab)).toHaveAttribute('aria-pressed', 'true');
  }

  /** Reads the live count badge on a status tab, e.g. "Open 11" -> 11. */
  async tabCount(tab: 'All' | 'Draft' | 'Open' | 'Approved'): Promise<number> {
    const text = await this.locators.statusTab(tab).innerText();
    const match = text.match(/(\d+)/);
    if (!match) throw new Error(`Could not read a count out of tab text "${text}"`);
    return Number(match[1]);
  }

  /** All Status Name cells currently rendered in the grid (visible rows only). */
  async visibleStatuses(): Promise<string[]> {
    return this.page
      .getByRole('cell')
      .filter({ hasText: /^(Draft|Open|Approved)$/ })
      .allInnerTexts();
  }

  /**
   * All cell texts, in on-screen column order (including the leading,
   * always-blank select-row checkbox cell at index 0), for one specific
   * row found by its Techpack Code link. Pair with a
   * `page.getByRole('columnheader').allInnerTexts()` read (same column
   * order/count) to look up a specific column by its header label rather
   * than a hardcoded index — the header set changes over time (see
   * techpack-list.md's TC:18) and a hardcoded position would silently
   * drift.
   */
  async rowCellTexts(techpackCode: string): Promise<string[]> {
    const row = this.locators.rowLink(techpackCode).locator('xpath=ancestor::tr[1]');
    return row.getByRole('cell').allInnerTexts();
  }

  /** The grid's column header labels, in display order. */
  async columnHeaderTexts(): Promise<string[]> {
    return (await this.locators.columnHeaders.allInnerTexts()).map((h) => h.trim());
  }

  /**
   * Every visible row as `{ <column label>: <cell text> }`, for the given
   * columns. The grid can briefly render a full page of blank skeleton cells
   * with the right row count (seen on uat right after a CSV export), so this
   * first waits for the first row's cell under `columns[0]` to have real text.
   */
  async visibleRows(columns: string[]): Promise<Record<string, string>[]> {
    const headers = await this.columnHeaderTexts();
    const index = columns.map((c) => headers.findIndex((h) => h === c || h.startsWith(c)));
    const missing = columns.filter((_, i) => index[i] === -1);
    if (missing.length) throw new Error(`Grid has no column(s): ${missing.join(', ')}`);
    const first = index[0] ?? 0;
    const rows = this.locators.bodyRows;
    await expect
      .poll(
        async () => ((await rows.first().getByRole('cell').allInnerTexts())[first] ?? '').trim(),
        {
          timeout: 30_000,
          message: 'grid still showing blank/skeleton row content',
        },
      )
      .not.toBe('');
    const out: Record<string, string>[] = [];
    const count = await rows.count();
    for (let r = 0; r < count; r++) {
      const cells = await rows.nth(r).getByRole('cell').allInnerTexts();
      out.push(
        Object.fromEntries(columns.map((c, i) => [c, (cells[index[i] ?? -1] ?? '').trim()])),
      );
    }
    return out;
  }
}
