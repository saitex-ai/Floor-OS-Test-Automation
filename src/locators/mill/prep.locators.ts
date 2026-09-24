import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Preparation production screen
 * (/mill/prep, "Warping, sizing & rope dyeing") — no actions or
 * assertions here, see src/pages/mill/prep.page.ts for those.
 */
export class PrepLocators {
  readonly heading: Locator;

  // Tabs
  readonly createDyeLotTab: Locator;
  readonly scanYarnTab: Locator;
  readonly loadBeamsTab: Locator;
  readonly ordersTab: Locator;

  // Create dye-lot tab
  readonly createDyeLotButton: Locator;

  // Scan yarn tab — reads "Scan lots into dye-lot" while the sheet is empty
  readonly scanLotsIntoDyeLotButton: Locator;
  readonly noDyeLotsAwaitingYarn: Locator;

  // Load beams tab
  readonly beamLengthInput: Locator;
  readonly scanEmptyBeamInput: Locator;
  readonly loadBeamsButton: Locator;
  readonly noDyeLotYet: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Warping, sizing & rope dyeing' });

    this.createDyeLotTab = page.getByRole('tab', { name: /^Create dye-lot/ });
    this.scanYarnTab = page.getByRole('tab', { name: /^Scan yarn/ });
    this.loadBeamsTab = page.getByRole('tab', { name: /^Load beams/ });
    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });

    this.createDyeLotButton = page.getByRole('button', { name: 'Create dye-lot' });

    this.scanLotsIntoDyeLotButton = page.getByRole('button', { name: 'Scan lots into dye-lot' });
    this.noDyeLotsAwaitingYarn = page.getByText('No dye-lots awaiting yarn');

    this.beamLengthInput = page.getByLabel('Beam length');
    this.scanEmptyBeamInput = page.getByLabel('Scan an empty beam');
    this.loadBeamsButton = page.getByRole('button', { name: 'Load beams', exact: true });
    this.noDyeLotYet = page.getByText('No dye-lot yet');
  }
}
