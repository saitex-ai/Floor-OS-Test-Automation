import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Weaving production screen
 * (/mill/weaving) — no actions or assertions here, see
 * src/pages/mill/weaving.page.ts for those.
 */
export class WeavingLocators {
  readonly heading: Locator;

  // Tabs (mill CR round, 2026-10: Consume inputs / Orders / Production —
  // the old "Record output" tab became a "Record Output" button on Orders)
  readonly consumeInputsTab: Locator;
  readonly ordersTab: Locator;
  readonly productionTab: Locator;

  // Consume inputs tab
  readonly noOpenOrders: Locator;
  readonly weavingOrderCard: Locator;
  readonly warpBeamCard: Locator;
  readonly weftYarnCard: Locator;
  readonly scanLoomInput: Locator;
  readonly conesToConsumeInput: Locator;
  readonly scanWeftYarnInput: Locator;

  // Orders tab → "Record Output" popup: the loom is scanned first, and only
  // then does the output length field open (WV-01-01).
  readonly recordOutputButton: Locator;
  readonly recordOutputDialog: Locator;
  readonly outputLengthInput: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Weaving' });

    this.consumeInputsTab = page.getByRole('tab', { name: /^Consume inputs/ });
    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });
    this.productionTab = page.getByRole('tab', { name: /^Production/ });

    this.noOpenOrders = page.getByText('No open orders');
    this.weavingOrderCard = page.getByRole('heading', { name: 'Weaving order' });
    this.warpBeamCard = page.getByRole('heading', { name: 'Warp beam' });
    this.weftYarnCard = page.getByRole('heading', { name: 'Weft yarn' });
    this.scanLoomInput = page.getByLabel('Scan the loom');
    this.conesToConsumeInput = page.getByLabel('Cones to consume');
    this.scanWeftYarnInput = page.getByLabel('Scan weft yarn');

    this.recordOutputButton = page.getByRole('button', { name: 'Record Output' });
    this.recordOutputDialog = page.getByRole('dialog', { name: 'Record Output' });
    this.outputLengthInput = this.recordOutputDialog.getByLabel(/Output length/i);
  }
}
