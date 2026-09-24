import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Weaving production screen
 * (/mill/weaving) — no actions or assertions here, see
 * src/pages/mill/weaving.page.ts for those.
 */
export class WeavingLocators {
  readonly heading: Locator;

  // Tabs
  readonly consumeInputsTab: Locator;
  readonly recordOutputTab: Locator;
  readonly ordersTab: Locator;

  // Consume inputs tab
  readonly noOpenOrders: Locator;
  readonly warpBeamCard: Locator;
  readonly weftYarnCard: Locator;
  readonly conesToConsumeInput: Locator;
  readonly scanWeftYarnInput: Locator;

  // Record output tab
  readonly noOrdersWithInputs: Locator;
  readonly greigeLengthInput: Locator;
  readonly doffAndPutAwayButton: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Weaving' });

    this.consumeInputsTab = page.getByRole('tab', { name: /^Consume inputs/ });
    this.recordOutputTab = page.getByRole('tab', { name: /^Record output/ });
    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });

    this.noOpenOrders = page.getByText('No open orders');
    this.warpBeamCard = page.getByRole('heading', { name: 'Warp beam' });
    this.weftYarnCard = page.getByRole('heading', { name: 'Weft yarn' });
    this.conesToConsumeInput = page.getByLabel('Cones to consume');
    this.scanWeftYarnInput = page.getByLabel('Scan weft yarn');

    this.noOrdersWithInputs = page.getByText('No orders with inputs on the machine');
    this.greigeLengthInput = page.getByLabel('Greige length');
    this.doffAndPutAwayButton = page.getByRole('button', { name: 'Doff & put away' });
  }
}
