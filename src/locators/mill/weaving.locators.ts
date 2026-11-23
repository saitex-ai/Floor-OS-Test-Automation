import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Weaving production screen
 * (/mill/weaving) — no actions or assertions here, see
 * src/pages/mill/weaving.page.ts for those.
 */
export class WeavingLocators {
  readonly heading: Locator;

  // Tabs: Consume inputs / Orders / Production. Redesigned on dev (2026-11):
  // Orders is now an orders table with its own All / Fulfilled / Running /
  // Open status tabs, and the "Record Output" button moved to Production.
  readonly consumeInputsTab: Locator;
  readonly ordersTab: Locator;
  readonly productionTab: Locator;

  // Consume inputs tab: Loom, Warp beam and Weft yarn cards (the "Weaving
  // order" card is gone; the loom scan box now sits in the Loom card).
  readonly noOpenOrders: Locator;
  readonly loomCard: Locator;
  readonly warpBeamCard: Locator;
  readonly weftYarnCard: Locator;
  readonly scanLoomInput: Locator;
  readonly conesToConsumeInput: Locator;
  readonly scanWeftYarnInput: Locator;

  // Production tab → "Record Output" popup: the loom is scanned first, and
  // only then does the output length field open (WV-01-01).
  readonly recordOutputButton: Locator;
  readonly recordOutputDialog: Locator;
  readonly recordOutputScanLoomInput: Locator;
  readonly outputLengthInput: Locator;
  readonly recordOutputCloseButton: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Weaving' });

    this.consumeInputsTab = page.getByRole('tab', { name: /^Consume inputs/ });
    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });
    this.productionTab = page.getByRole('tab', { name: /^Production/ });

    this.noOpenOrders = page.getByText('No open orders');
    this.loomCard = page.getByRole('heading', { name: 'Loom', exact: true });
    this.warpBeamCard = page.getByRole('heading', { name: 'Warp beam' });
    this.weftYarnCard = page.getByRole('heading', { name: 'Weft yarn' });
    this.scanLoomInput = page.getByLabel('Scan the loom');
    this.conesToConsumeInput = page.getByLabel('Cones to consume');
    this.scanWeftYarnInput = page.getByLabel('Scan weft yarn');

    this.recordOutputButton = page.getByRole('button', { name: 'Record Output' });
    this.recordOutputDialog = page.getByRole('dialog', { name: 'Record Output' });
    this.recordOutputScanLoomInput = this.recordOutputDialog.getByLabel('Scan the loom');
    this.outputLengthInput = this.recordOutputDialog.getByLabel(/Output length/i);
    this.recordOutputCloseButton = this.recordOutputDialog.getByRole('button', { name: 'Close' });
  }
}
