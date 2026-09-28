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
}
