import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Finishing production screen
 * (/mill/finishing) — no actions or assertions here, see
 * src/pages/mill/finishing.page.ts for those.
 *
 * Redesigned on dev (seen 2026-11-10): the Consume inputs and Record
 * output tabs are gone. Only Orders (selected by default) and Production
 * tabs remain, and "Record output" is a header button that opens a popup
 * asking for the greige roll to be scanned first.
 */
export class FinishingLocators {
  readonly heading: Locator;

  // Tabs
  readonly ordersTab: Locator;
  readonly productionTab: Locator;

  // Header actions
  readonly pullFromSapButton: Locator;
  readonly recordOutputButton: Locator;

  // "Record output" popup — scan the greige roll; the finished length
  // field only appears once a roll has been scanned.
  readonly recordOutputDialog: Locator;
  readonly scanGreigeRollInput: Locator;
  readonly finishedLengthInput: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Finishing' });

    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });
    this.productionTab = page.getByRole('tab', { name: /^Production/ });

    this.pullFromSapButton = page.getByRole('button', { name: 'Pull from SAP' });
    this.recordOutputButton = page.getByRole('button', { name: 'Record output' });

    this.recordOutputDialog = page.getByRole('dialog', { name: 'Record output' });
    this.scanGreigeRollInput = this.recordOutputDialog.getByRole('textbox', {
      name: 'Scan the greige roll',
    });
    this.finishedLengthInput = this.recordOutputDialog.getByLabel(/Finished length/i);
  }
}
