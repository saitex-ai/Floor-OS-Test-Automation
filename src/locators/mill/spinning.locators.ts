import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Spinning production screen
 * (/mill/spinning) — no actions or assertions here, see
 * src/pages/mill/spinning.page.ts for those. Tabs are Radix tabs whose
 * accessible name includes a count badge ("Laydown 3"), hence the
 * prefix regexes.
 */
export class SpinningLocators {
  readonly heading: Locator;

  // Tabs
  readonly mixingOrdersTab: Locator;
  readonly laydownTab: Locator;
  readonly yarnOutputTab: Locator;

  // Mixing orders tab → "New mixing order" card (starts at 60% / 40%)
  readonly firstRecipeUnitSelect: Locator;
  readonly secondRecipeUnitSelect: Locator;
  readonly firstRecipeShareInput: Locator;
  readonly cottonUnitOptions: Locator;
  readonly sharesTotalText: Locator;
  readonly sharesNot100Message: Locator;
  readonly createOrderButton: Locator;

  // Yarn output tab → "Production entry" card
  readonly productionEntryCard: Locator;
  readonly putAwayAndPrintButton: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Spinning' });

    this.mixingOrdersTab = page.getByRole('tab', { name: /^Mixing orders/ });
    this.laydownTab = page.getByRole('tab', { name: /^Laydown/ });
    this.yarnOutputTab = page.getByRole('tab', { name: /^Yarn output/ });

    this.firstRecipeUnitSelect = page.getByLabel('Recipe line 1 cotton unit');
    this.secondRecipeUnitSelect = page.getByLabel('Recipe line 2 cotton unit');
    this.firstRecipeShareInput = page.getByLabel('Recipe line 1 share');
    // A recipe line's cotton unit picker is a custom combobox: clicking it
    // opens a listbox of "GRD-… · {cotton} · {n} kg available" options.
    this.cottonUnitOptions = page.getByRole('listbox').getByRole('option');
    this.sharesTotalText = page.getByText(/Shares total \d+(\.\d+)?%/);
    this.sharesNot100Message = page.getByText(/The shares total .*not 100%/);
    this.createOrderButton = page.getByRole('button', { name: 'Create order' }).first();

    this.productionEntryCard = page.getByRole('heading', { name: 'Production entry' });
    this.putAwayAndPrintButton = page.getByRole('button', { name: 'Put away & print label' });
  }
}
