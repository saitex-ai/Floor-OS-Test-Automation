import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Preparation production screen
 * (/mill/prep, "Warping, sizing & rope dyeing") — no actions or
 * assertions here, see src/pages/mill/prep.page.ts for those.
 */
export class PrepLocators {
  readonly heading: Locator;

  // Tabs (mill CR round, 2026-10: Scan yarn (default) / Load beams /
  // Orders / Production).
  readonly scanYarnTab: Locator;
  readonly loadBeamsTab: Locator;
  readonly ordersTab: Locator;
  readonly productionTab: Locator;

  // Orders tab → tick an order's row checkbox and the selection bar offers
  // "Create dye-lot" (PR-01-01); orders now arrive via "Pull from SAP".
  readonly orderRowCheckboxes: Locator;
  readonly createDyeLotButton: Locator;
  readonly clearSelectionButton: Locator;
  readonly pullFromSapButton: Locator;

  // Scan yarn tab — reads "Scan lots into dye-lot" while the sheet is empty
  readonly scanLotsIntoDyeLotButton: Locator;
  readonly noDyeLotsAwaitingYarn: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Warping, sizing & rope dyeing' });

    this.scanYarnTab = page.getByRole('tab', { name: /^Scan yarn/ });
    this.loadBeamsTab = page.getByRole('tab', { name: /^Load beams/ });
    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });
    this.productionTab = page.getByRole('tab', { name: /^Production/ });

    this.orderRowCheckboxes = page.getByRole('checkbox', { name: /^Select row/ });
    this.createDyeLotButton = page.getByRole('button', { name: 'Create dye-lot' });
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.pullFromSapButton = page.getByRole('button', { name: 'Pull from SAP' });

    this.scanLotsIntoDyeLotButton = page.getByRole('button', { name: 'Scan lots into dye-lot' });
    this.noDyeLotsAwaitingYarn = page.getByText('No dye-lots awaiting yarn');
  }
}
