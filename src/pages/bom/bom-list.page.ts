import { type Download, type Locator, type Page, type Request, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { BomListLocators } from '../../locators/bom/bom-list.locators';

export const BOM_PATH = MODULES['bom'].path;

/**
 * The first view of the BOM remote on dev can take a minute (yesterday's
 * sanity run measured 63s to the list, sign-in gate included) — far
 * over the 15s default expect timeout. Only the wait for the list
 * heading gets this; every other assertion keeps the default.
 */
const BOM_REMOTE_LOAD_TIMEOUT = 75_000;

/** The techpack picker's list call can take a while on a cold remote. */
const PICKER_LOAD_TIMEOUT = 30_000;

/** Layout modes offered by the list toolbar. */
export type BomListLayout = 'No split' | 'Vertical split' | 'Horizontal split';

/**
 * BOM list (/bom, "Bill of Materials") and its "New BOM" dialog. Owned by
 * the BOM QA. Element locators live in BomListLocators (`this.locators`).
 */
export class BomListPage extends BasePage {
  readonly locators: BomListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new BomListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(BOM_PATH);
    await this.expectLoaded();
  }

  /**
   * Reuse the tab if it's already on the list (a shared-tab smoke run);
   * only fall back to open()'s full page load — about a minute on dev —
   * for a fresh tab.
   */
  async openInPlace(): Promise<void> {
    if (new URL(this.page.url(), 'http://x').pathname === BOM_PATH) {
      await this.expectLoaded();
      return;
    }
    await this.open();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${BOM_PATH}$`));
    await expect(this.locators.heading).toBeVisible({ timeout: BOM_REMOTE_LOAD_TIMEOUT });
    await expect(this.locators.rows.first()).toBeVisible();
  }

  /** Reads the number out of a status tab's name, e.g. "Open 42" → 42. */
  async countOf(tab: Locator): Promise<number> {
    const name = (await tab.textContent()) ?? '';
    return Number(name.replace(/[^\d]/g, ''));
  }

  /** The total out of the grid footer's "Showing 1 to 24 of 24", or 0 when it isn't shown. */
  async footerTotal(): Promise<number> {
    if (!(await this.locators.footerSummary.isVisible())) return 0;
    // (Callers that need a settled total wait for it via waitForTabCounts().)
    const text = await this.locators.footerSummary.innerText();
    return Number(text.replace(/.* of /, '').replace(/[^\d]/g, ''));
  }

  /**
   * The tab badges load separately from the grid rows (and from each
   * other), so right after open() any of them can still read a
   * placeholder "0". With "All" selected (the default), the badges have
   * caught up once All matches the grid footer's own total and the
   * Open/Approved badges have populated too.
   */
  async waitForTabCounts(): Promise<void> {
    await expect
      .poll(
        async () => {
          const all = await this.countOf(this.locators.allTab);
          const open = await this.countOf(this.locators.openTab);
          const approved = await this.countOf(this.locators.approvedTab);
          return all > 0 && all === (await this.footerTotal()) && open + approved > 0;
        },
        { message: 'the status tab counts never finished loading' },
      )
      .toBe(true);
  }

  /**
   * Clicks a status tab and checks the grid follows it: the tab reads as
   * pressed, and the footer total matches the tab's count. A zero-result
   * tab renders no footer at all, so that case checks the row count instead.
   */
  async selectStatusTab(tab: Locator): Promise<void> {
    if ((await this.locators.allTab.getAttribute('aria-pressed')) === 'true') {
      await this.waitForTabCounts();
    }
    const expected = await this.countOf(tab);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
    if (expected === 0) {
      await expect(this.locators.rows).toHaveCount(0);
      return;
    }
    await expect(this.locators.footerSummary).toHaveText(
      new RegExp(`of ${expected.toLocaleString('en-US')}$`),
    );
  }

  /** Visible header labels of the grid, without the select-all column. */
  async columnLabels(): Promise<string[]> {
    await expect(this.locators.columnHeaders.first()).toBeVisible();
    const labels = await this.locators.columnHeaders.evaluateAll((ths) =>
      ths.map((th) => th.querySelector('button')?.textContent?.trim() ?? ''),
    );
    return labels.filter(Boolean);
  }

  /** Every visible row's value in one column, read by that column's header label. */
  async columnValues(label: string): Promise<string[]> {
    const labels = await this.locators.columnHeaders.evaluateAll((ths) =>
      ths.map((th) => th.querySelector('button')?.textContent?.trim() ?? ''),
    );
    const index = labels.indexOf(label);
    if (index < 0) throw new Error(`No "${label}" column; columns are: ${labels.join(', ')}`);
    return this.locators.rows.evaluateAll(
      (trs, i) => trs.map((tr) => tr.querySelectorAll('td')[i]?.textContent?.trim() ?? ''),
      index,
    );
  }

  /** The first row's techpack code, as shown on its link chip. */
  async firstRowCode(): Promise<string> {
    return (await this.locators.rows.first().getByRole('link').first().innerText()).trim();
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.locators.searchInput.clear();
  }

  /** Searches for a code and waits until the grid only shows that code's rows. */
  async searchFor(code: string): Promise<void> {
    await this.search(code);
    await expect(this.locators.techpackLink(code).first()).toBeVisible();
    await expect
      .poll(async () => (await this.columnValues('Techpack Code')).every((c) => c === code))
      .toBe(true);
  }

  async openBom(code: string): Promise<void> {
    await this.locators.techpackLink(code).first().click();
  }

  // ---- Toolbar ----

  async openFilters(): Promise<void> {
    await this.locators.filtersButton.click();
    await expect(this.locators.filterRulesLabel).toBeVisible();
  }

  async addFilterRule(): Promise<void> {
    await this.locators.addRuleButton.click();
    await expect(this.locators.filterAttributeLabel).toBeVisible();
  }

  async toggleCellFilters(): Promise<void> {
    await this.locators.toggleCellFiltersButton.click();
    await expect(this.locators.cellFilterInput('Techpack Code')).toBeVisible();
  }

  async filterColumn(label: string, text: string): Promise<void> {
    await this.locators.cellFilterInput(label).fill(text);
  }

  /** Ticks or unticks one column in "Configure columns" and applies it. */
  async setColumnVisible(label: string, visible: boolean): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await this.locators.columnCheckbox(label).setChecked(visible);
    await this.locators.applyButton.click();
  }

  /** Opens "Configure columns", returning whether a column can be toggled there at all. */
  async isColumnConfigurable(label: string): Promise<boolean> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.showAllColumnsButton).toBeVisible();
    const configurable = (await this.locators.columnCheckbox(label).count()) > 0;
    await this.page.keyboard.press('Escape');
    return configurable;
  }

  async setLayout(layout: BomListLayout): Promise<void> {
    const button = {
      'No split': this.locators.noSplitButton,
      'Vertical split': this.locators.verticalSplitButton,
      'Horizontal split': this.locators.horizontalSplitButton,
    }[layout];
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  /** Clicks a toolbar/selection-bar control and returns the download it triggers. */
  private async downloadFrom(control: Locator): Promise<Download> {
    // The CSV is streamed from the server, so the download can take a few
    // seconds longer than the default action timeout to start.
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30_000 });
    await control.click();
    return downloadPromise;
  }

  async exportCsv(): Promise<Download> {
    return this.downloadFrom(this.locators.exportCsvButton);
  }

  async selectRow(index: number): Promise<void> {
    await this.locators.rowCheckbox(index).check();
  }

  async exportSelected(): Promise<Download> {
    return this.downloadFrom(this.locators.exportSelectedButton);
  }

  async clearSelection(): Promise<void> {
    await this.locators.clearSelectionButton.click();
    await expect(this.locators.selectionLabel).toBeHidden();
  }

  // ---- "New BOM" → "Create BOM techpack" ----

  async openNewBomDialog(): Promise<void> {
    await this.locators.newBomButton.click();
    await expect(this.locators.newBomDialog).toBeVisible();
  }

  async cancelNewBomDialog(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.newBomDialog).toBeHidden();
  }

  /** Opens the techpack picker from the dialog's code field and waits for its list to load. */
  async openTechpackPicker(): Promise<void> {
    await this.locators.selectTechpackButton.click();
    await this.expectTechpackPickerLoaded();
  }

  /**
   * The footer renders straight away, before the table itself does — so
   * "loaded" is the table's own header row being there too.
   */
  async expectTechpackPickerLoaded(): Promise<void> {
    await expect(this.locators.techpackPickerHeaderCells.first()).toBeVisible({
      timeout: PICKER_LOAD_TIMEOUT,
    });
    await expect(this.locators.techpackPickerFooter).toBeVisible();
  }

  /** Closes just the picker (Escape would close the New BOM dialog behind it too). */
  async closeTechpackPicker(): Promise<void> {
    await this.locators.techpackPickerCloseButton.click();
    await expect(this.locators.techpackPickerDialog).toBeHidden();
  }

  /** The picker's total, from its "(N)" title count. */
  async techpackPickerTotal(): Promise<number> {
    const title = await this.locators.techpackPickerDialog.getByRole('heading').first().innerText();
    return Number(title.replace(/[^\d]/g, ''));
  }

  /** Types into the picker's search box and waits for its footer to settle on the result. */
  async searchTechpackPicker(term: string): Promise<void> {
    await this.locators.techpackPickerSearch.fill(term);
    await expect(this.locators.techpackPickerFooter).toBeVisible();
  }

  /** Every visible picker row's value in one column, by that column's header label. */
  async techpackPickerColumnValues(label: string): Promise<string[]> {
    // textContent, not innerText: the headers are upper-cased by CSS.
    const labels = await this.locators.techpackPickerHeaderCells.allTextContents();
    const index = labels.map((l) => l.trim()).indexOf(label);
    if (index < 0)
      throw new Error(`No "${label}" picker column; columns are: ${labels.join(', ')}`);
    return this.locators.techpackPickerRows.evaluateAll(
      (trs, i) =>
        trs.map((tr) => tr.querySelectorAll('td, [role="cell"]')[i]?.textContent?.trim() ?? ''),
      index,
    );
  }

  /** Reads one picker row's values by column label, e.g. { Customer: 'NIKE', ... }. */
  async techpackPickerRowValues(code: string, labels: string[]): Promise<Record<string, string>> {
    await this.searchTechpackPicker(code);
    await expect(this.locators.techpackPickerRow(code)).toBeVisible();
    const values: Record<string, string> = {};
    for (const label of labels) {
      const all = await this.techpackPickerColumnValues(label);
      const codes = await this.techpackPickerColumnValues('Techpack Code');
      values[label] = all[codes.indexOf(code)] ?? '';
    }
    return values;
  }

  /** Picks a specific techpack in the picker (a single row click picks it and closes the picker). */
  async pickTechpack(code: string): Promise<void> {
    await this.searchTechpackPicker(code);
    await this.locators.techpackPickerRow(code).click();
    await expect(this.locators.techpackPickerDialog).toBeHidden();
    await expect(this.locators.newBomDialog.getByText(`Techpack ${code} ready.`)).toBeVisible();
  }

  /**
   * Clicks "Create BOM" and returns the create request it sent, once the
   * app has navigated to the new BOM's detail page.
   */
  async createBom(code: string): Promise<Request> {
    const requestPromise = this.page.waitForRequest(
      (req) => req.method() === 'POST' && /\/bom-techpack$/.test(new URL(req.url()).pathname),
    );
    await this.locators.createBomButton.click();
    const request = await requestPromise;
    await this.page.waitForURL(new RegExp(`${BOM_PATH}/${code}/0$`), { timeout: 30_000 });
    return request;
  }
}
