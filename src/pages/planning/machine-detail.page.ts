import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MachineDetailLocators } from '../../locators/planning/machine-detail.locators';
import { detailValue } from '../../locators/planning/form-field.locators';
import { becomesUsable, expectActionBlocked } from './master-data-list.page';
import { paintedColours } from './badge-colours';
import { InlineTable } from './inline-table';
import { pressDone } from './form-submit';
import { WAIT } from './waits';

/** One maintenance-window row's cells, as the grid shows them. */
export interface WindowRowValues {
  kind?: 'Planned' | 'Unplanned';
  end?: string | RegExp;
}

/**
 * A machine's detail page: read-only summary, "Edit machine", and the
 * read-only "Maintenance windows (N)" grid (windows are added and edited on
 * step 2 of Edit machine since the 2026-10-28 dev deploy). Owned by the
 * Planning QA.
 */
export class MachineDetailPage extends BasePage {
  readonly locators: MachineDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new MachineDetailLocators(page);
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/machines\/[0-9a-f-]{36}$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.windowsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(detailValue(this.page, 'Asset code')).toHaveText(code);
  }

  /** Read-only: no inputs in the summary; editing is the separate "Edit machine". */
  async expectReadOnlyView(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible();
    await expect(this.locators.summary.getByRole('textbox', { name: 'Asset code' })).toHaveCount(0);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
  }

  /** A read-only user gets no working "Edit machine", or is refused on the edit page. */
  async expectEditBlocked(): Promise<void> {
    await expect(this.locators.windowsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectActionBlocked(
      this.page,
      this.locators.editButton,
      /^(Save changes|Save & continue)$/,
    );
  }

  async expectValue(label: string, value: string | RegExp): Promise<void> {
    await expect(detailValue(this.page, label)).toHaveText(value, { timeout: WAIT.SERVER });
  }

  async expectValueContains(label: string, value: string): Promise<void> {
    await expect(detailValue(this.page, label)).toContainText(value, { timeout: WAIT.SERVER });
  }

  /** The labels TC-LM-07 lists, all present as read-only values. */
  async expectFields(labels: string[]): Promise<void> {
    for (const label of labels) await expect(detailValue(this.page, label)).toBeVisible();
  }

  async expectHeaderBadge(text: string): Promise<void> {
    await expect(this.locators.headerBadge(text)).toBeVisible();
  }

  async windowCount(): Promise<number> {
    // textContent: the heading is upper-cased by CSS, which innerText applies.
    const text = (await this.locators.windowsHeading.textContent()) ?? '';
    return Number(text.match(/Maintenance windows \((\d+)\)/)![1]);
  }

  async expectWindowCount(count: number): Promise<void> {
    await expect(this.locators.windowsHeading).toHaveText(
      new RegExp(`^Maintenance windows \\(${count}\\)`),
      { timeout: WAIT.SERVER },
    );
  }

  /**
   * Windows are added on step 2 of Edit machine since the 2026-10-28 dev
   * deploy: opens it there (if not already), with the add row ready.
   */
  async openNewWindow(): Promise<void> {
    const windows = new InlineTable(this.page, 'Maintenance windows', 'maintenance window');
    if (!(await windows.locators.addButton.isVisible())) {
      await this.locators.editButton.click();
      await expect(this.page).toHaveURL(/\/machines\/[0-9a-f-]{36}\/edit$/, {
        timeout: WAIT.NAVIGATION,
      });
      await this.locators.windowsStep.click();
    }
    await windows.expectAddRow();
  }

  /** Done on step 2: leaves Edit machine for the detail page (rows are already saved). */
  async finishEditing(): Promise<void> {
    await pressDone(this.locators.doneButton);
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** Opens step 2 of Edit machine and the row's "Edit maintenance window". */
  async openWindowEdit(why: string): Promise<void> {
    await this.openNewWindow();
    await new InlineTable(this.page, 'Maintenance windows', 'maintenance window').startEdit(why);
  }

  /**
   * Adding a window needs Edit machine. Watched for WAIT.PERMISSION_SETTLE
   * — see becomesUsable().
   */
  async isNewWindowAvailable(): Promise<boolean> {
    await expect(this.locators.windowsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.editButton);
  }

  /** Editing a window also needs Edit machine (the grid here is read-only). */
  async isWindowEditAvailable(why: string): Promise<boolean> {
    await expect(this.locators.windowRow(why)).toBeVisible({ timeout: WAIT.SERVER });
    return becomesUsable(this.locators.editButton);
  }

  async expectWindowRow(why: string, values: WindowRowValues = {}): Promise<void> {
    const row = this.locators.windowRow(why);
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    const cells = row.getByRole('cell');
    // Columns: Kind | Window start | Window end | Why | Anomaly | Active | (Edit)
    if (values.kind) await expect(cells.nth(0)).toHaveText(values.kind);
    if (values.end) await expect(cells.nth(2)).toHaveText(values.end);
  }

  /** The Why of every window still Active (cleanup switches them off). */
  async activeWindowWhys(): Promise<string[]> {
    await expect(this.locators.windowsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    if ((await this.windowCount()) === 0) return [];
    const rows = this.locators.windowDataRows();
    await expect(rows.first()).toBeVisible({ timeout: WAIT.SERVER });
    const whys: string[] = [];
    // Columns: Kind | Window start | Window end | Why | Anomaly | Active | (Edit)
    for (const row of await rows.all()) {
      const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
      if (cells[5] === 'Yes' && cells[3]) whys.push(cells[3]);
    }
    return whys;
  }

  async expectNoWindowRow(why: string): Promise<void> {
    await expect(this.locators.windowRow(why)).toHaveCount(0);
  }

  /** The Kind badge's own colours (background + text) in one row. */
  async kindBadgeColours(why: string, kind: 'Planned' | 'Unplanned'): Promise<string> {
    const badge = this.locators.windowRow(why).getByText(kind, { exact: true });
    await expect(badge).toBeVisible({ timeout: WAIT.SERVER });
    return badge.evaluate(paintedColours);
  }

  /**
   * The "Maintenance windows (N)" section: read-only here (no add row);
   * windows are added through "Edit machine".
   */
  async expectWindowsSection(): Promise<void> {
    await expect(this.locators.windowsHeading).toBeVisible({ timeout: WAIT.SERVER });
    await new InlineTable(this.page, 'Maintenance windows', 'maintenance window').expectReadOnly();
    await expect(this.locators.editButton).toBeVisible();
  }
}
