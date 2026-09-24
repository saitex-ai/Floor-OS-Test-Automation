import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Fabric Mill landing view ("Mill
 * operations", /mill) — no actions or assertions here, see
 * src/pages/mill/mill.page.ts for those. Labels taken from app-mill's
 * features/home/pages/mill-home.tsx and confirmed against dev.
 */
export class MillLocators {
  readonly heading: Locator;
  readonly onHoldTile: Locator;
  readonly openRequestsTile: Locator;
  readonly ordersRunningTile: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Mill operations' });
    this.onHoldTile = page.getByText('On hold', { exact: true });
    this.openRequestsTile = page.getByText('Open requests', { exact: true });
    this.ordersRunningTile = page.getByText('Orders running', { exact: true });
  }
}
