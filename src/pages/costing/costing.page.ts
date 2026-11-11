import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { CostingLocators } from '../../locators/costing/costing.locators';
import { CostingScreensLocators } from '../../locators/costing/costing-screens.locators';

/**
 * A Costing screen reached from the left navigation: its link text, its
 * route under /costing and its <h1>. The Costing list's link and <h1> are
 * both just "Costing".
 */
export const COSTING_SCREENS = {
  companyCostingSetup: {
    nav: 'Company Costing Setup',
    path: '/company-costing-setup',
    heading: 'Company Costing Setup',
  },
  overheadWashConfig: {
    nav: 'Overhead & Wash Config',
    path: '/overhead-wash-config',
    heading: 'Overhead & Wash Config',
  },
  costingRequests: { nav: 'Costing', path: '/costing-requests', heading: 'Costing' },
  fabricYieldRequests: {
    nav: 'Fabric Yield Requests',
    path: '/fabric-yield-requests',
    heading: 'Fabric Yield Requests',
  },
  fabricCostRequests: {
    nav: 'Fabric Cost Requests',
    path: '/fabric-cost-requests',
    heading: 'Fabric Cost Requests',
  },
  approvals: { nav: 'Approvals', path: '/approvals', heading: 'Approvals' },
  costingReport: { nav: 'Costing Report', path: '/costing-report', heading: 'Costing Report' },
} as const;

export type CostingScreen = keyof typeof COSTING_SCREENS;

/**
 * Owned by the Costing QA. Add this module's real locators/actions
 * here — nothing else in the framework needs to change to extend
 * Costing coverage. Element locators live in CostingLocators (landing)
 * and CostingScreensLocators (`this.screens`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CostingPage extends BasePage {
  readonly locators: CostingLocators;
  readonly screens: CostingScreensLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CostingLocators(page);
    this.screens = new CostingScreensLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['costing'].path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['costing'].path}`));
    await expect(this.locators.heading).toBeVisible();
    await expect(this.locators.selectScreenHint).toBeVisible();
  }

  /**
   * Switch to a Costing screen through the left navigation — a client-side
   * route change, so the Costing remote isn't downloaded again. Falls back
   * to a full load of the landing first when the tab isn't inside Costing
   * yet (a fresh tab, or a new worker after a failure).
   */
  async openScreen(screen: CostingScreen): Promise<void> {
    const { nav, path, heading } = COSTING_SCREENS[screen];
    if (!new URL(this.page.url(), 'http://x').pathname.startsWith(MODULES['costing'].path)) {
      await this.open();
      await this.expectLoaded();
    }
    await this.screens.navLink(nav).click();
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['costing'].path}${path}$`));
    await expect(this.screens.screenHeading(heading)).toBeVisible();
  }

  /**
   * Opens a list's first row and waits for its detail page. Retried: on dev
   * the grid re-renders once its data settles, and a click that lands
   * before that doesn't open the row.
   */
  async openFirstRow(detailUrl: RegExp): Promise<void> {
    await this.expectRows();
    await expect(async () => {
      await this.screens.firstRowCell.click();
      await expect(this.page).toHaveURL(detailUrl, { timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
  }

  /** Expects a list screen to show at least one data row. */
  async expectRows(): Promise<void> {
    await expect(this.screens.tableRows.first()).toBeVisible();
  }
}
