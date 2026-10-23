import { type Download, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { TechpackLocators } from '../../locators/techpack/techpack.locators';

type StatusTab = 'All' | 'Draft' | 'Open' | 'Approved';
type ViewLayout = 'List View' | 'Vertical Split' | 'Grid View';

/**
 * Techpack Dashboard (the module landing, with the techpack grid). Owned by
 * the Techpack QA. Element locators live in TechpackLocators
 * (`this.locators`) — this class only holds flows/actions/assertions built
 * on top of them.
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
    // The remote shows a loading placeholder while its bundle mounts; on a
    // cold browser profile that can outlast the default assertion timeout.
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.allTab).toBeVisible({ timeout: 30_000 });
  }

  /** Opens the Dashboard and waits for the grid's first row. */
  async openAndWaitForRows(): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await this.ensureListView();
    await expect(this.locators.codeButtons.first()).toBeVisible({ timeout: 30_000 });
  }

  async search(query: string): Promise<void> {
    await this.locators.searchInput.fill(query);
  }

  /** Clicks a techpack's code button; it opens `/techpacks/view/{id}`. */
  async openCode(techpackCode: string): Promise<void> {
    await this.locators.codeButton(techpackCode).click();
  }

  /**
   * Opens a techpack from its code and returns its id, read from the
   * `/techpacks/view/{id}` URL it lands on. The same id opens the canvas
   * (`/techpacks/canvas/{id}`).
   */
  async openCodeAndReadId(techpackCode: string): Promise<string> {
    await this.openCode(techpackCode);
    await expect(this.page).toHaveURL(/\/techpacks\/view\/[^/?#]+/, { timeout: 30_000 });
    const id = this.page.url().match(/\/techpacks\/view\/([^/?#]+)/)?.[1];
    if (!id) throw new Error(`No techpack id in ${this.page.url()}`);
    return id;
  }

  async firstCode(): Promise<string> {
    return (await this.locators.codeButtons.first().innerText()).trim();
  }

  async clickCreateNew(): Promise<void> {
    await this.locators.createNewButton.click();
  }

  async expectCodeVisible(techpackCode: string): Promise<void> {
    await expect(this.locators.codeButton(techpackCode).first()).toBeVisible();
  }

  async selectTab(tab: StatusTab): Promise<void> {
    await this.locators.statusTab(tab).click();
  }

  async expectTabSelected(tab: StatusTab): Promise<void> {
    await expect(this.locators.statusTab(tab)).toHaveAttribute('aria-pressed', 'true');
  }

  /** Reads the live count badge on a status tab, e.g. "Open 11" -> 11. */
  async tabCount(tab: StatusTab): Promise<number> {
    const text = await this.locators.statusTab(tab).innerText();
    const match = text.match(/(\d+)/);
    if (!match) throw new Error(`Could not read a count out of tab text "${text}"`);
    return Number(match[1]);
  }

  /**
   * The Status cell of every visible row. Read by column (not by matching
   * "Draft"/"Open"/"Approved" anywhere) because the Stage column now holds
   * "Draft" and "Approved" too.
   */
  async visibleStatuses(): Promise<string[]> {
    return (await this.visibleRows(['Status'])).map((r) => r['Status'] ?? '');
  }

  /**
   * All cell texts, in on-screen column order (including the leading,
   * always-blank select-row checkbox cell at index 0), for one row found by
   * its code. Pair with columnHeaderTexts() to look a column up by label.
   */
  async rowCellTexts(techpackCode: string): Promise<string[]> {
    const row = this.locators.codeButton(techpackCode).first().locator('xpath=ancestor::tr[1]');
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
   * "Name and Code" cells hold "<name> <code>"; the code is the last token.
   */
  async visibleRows(columns: string[]): Promise<Record<string, string>[]> {
    await expect.poll(() => this.locators.columnHeaders.count()).toBeGreaterThan(1);
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

  /** Every code button currently in the grid. */
  async visibleCodes(): Promise<string[]> {
    return (await this.locators.codeButtons.allInnerTexts()).map((c) => c.trim());
  }

  // ---- Production Stages ----------------------------------------------------

  async selectStage(step: number): Promise<void> {
    await this.locators.productionStage(step).click();
    await expect(this.locators.productionStage(step)).toHaveAttribute('aria-pressed', 'true');
  }

  /** The count on a Production Stages step, e.g. "STEP 3 Fitting 5" -> 5. */
  async stageCount(step: number): Promise<number> {
    const text = (await this.locators.productionStage(step).innerText()).replace(/\s+/g, ' ');
    const match = text.match(/(\d+)\s*$/);
    if (!match) throw new Error(`Could not read a count out of stage text "${text}"`);
    return Number(match[1]);
  }

  /** The total in the pager's "Showing N packs". */
  async showingCount(): Promise<number> {
    const text = await this.locators.showingCountText.innerText();
    return Number(text.match(/(\d+)/)?.[1] ?? NaN);
  }

  // ---- Filter dialog ---------------------------------------------------------

  async openFilters(): Promise<void> {
    await this.locators.filtersButton.click();
    await expect(this.locators.filterDialog).toBeVisible();
  }

  async expandFilterSection(
    name: 'General Information' | 'Garment Specifications' | 'System Info',
  ): Promise<void> {
    const toggle = this.locators.filterSectionToggle(name);
    if ((await toggle.innerText()).trim() === 'Show') await toggle.click();
    await expect(toggle).toHaveText('Hide');
  }

  /** The option texts a "Filter" dialog field offers (the listbox shows at most 15). */
  async filterFieldOptions(label: string): Promise<string[]> {
    await this.locators.filterField(label).click();
    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox.getByRole('option').first()).toBeVisible();
    const options = (await listbox.getByRole('option').allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    return options;
  }

  /** Picks one value in a (multi-select) "Filter" dialog field and closes its listbox. */
  async pickFilterValue(label: string, value: string): Promise<void> {
    await this.locators.filterField(label).click();
    const listbox = this.page.getByRole('listbox').last();
    await listbox.getByRole('option', { name: value, exact: true }).click();
    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  }

  async applyFilters(): Promise<void> {
    await this.locators.filterApplyButton.click();
    await expect(this.locators.filterDialog).toBeHidden();
  }

  // ---- Columns dialog --------------------------------------------------------

  async openColumns(): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeVisible();
  }

  /** The "Columns" dialog's entries as `{ label, checked }`, in list order (locked column first). */
  async columnsDialogState(): Promise<{ label: string; checked: boolean }[]> {
    await expect(this.locators.columnsDialogCheckboxes().first()).toBeVisible();
    // Read from the accessibility tree: the checkboxes' names are what users
    // (and getByRole) see, e.g. `checkbox "Toggle Rev No" [checked]`.
    const snapshot = await this.locators.columnsDialog.ariaSnapshot();
    return [...snapshot.matchAll(/checkbox "([^"]+)"( \[checked\])?/g)]
      .map((m) => ({
        label: (m[1] ?? '').replace(/^Toggle /, '').replace(/ is always visible$/, ''),
        checked: m[2] !== undefined,
      }))
      .filter((c) => c.label !== 'Select all' && c.label !== '');
  }

  /** Shows or hides columns, then applies. */
  async setColumnsVisible(labels: string[], visible: boolean): Promise<void> {
    await this.openColumns();
    for (const label of labels) {
      const box = this.locators.columnCheckbox(label);
      if ((await box.isChecked()) !== visible) await box.click();
    }
    await this.locators.columnsApplyButton.click();
    await expect(this.locators.columnsDialog).toBeHidden();
  }

  /** Back to the 8 default columns (the column choice survives a reload). */
  async resetColumns(): Promise<void> {
    await this.openColumns();
    await this.locators.columnsResetButton.click();
    await this.locators.columnsApplyButton.click();
    await expect(this.locators.columnsDialog).toBeHidden();
  }

  // ---- View menu -------------------------------------------------------------

  async chooseView(layout: ViewLayout): Promise<void> {
    await this.locators.viewButton.click();
    await expect(this.locators.viewMenu).toBeVisible();
    await this.locators.viewOption(layout).click();
    await expect(this.locators.viewMenu).toBeHidden();
  }

  /** The View choice survives a reload, so put it back to List View before list checks. */
  async ensureListView(): Promise<void> {
    await this.locators.viewButton.click();
    const list = this.locators.viewOption('List View');
    await expect(list).toBeVisible();
    if ((await list.getAttribute('aria-checked')) === 'true') {
      await this.page.keyboard.press('Escape');
    } else {
      await list.click();
    }
    await expect(this.locators.viewMenu).toBeHidden();
    await expect(this.locators.table).toBeVisible();
  }

  // ---- Export ----------------------------------------------------------------

  /** Clicks Export and returns the download (it downloads at once; there is no menu). */
  async export(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.locators.exportButton.click(),
    ]);
    return download;
  }
}
