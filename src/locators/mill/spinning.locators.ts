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

  // Mixing orders tab → "New mixing order" button, opens a popup (was an
  // always-visible card before the 2026-09 mill UI redesign; the default
  // view now shows the most recent real order's own recipe instead).
  readonly newMixingOrderButton: Locator;
  readonly firstRecipeItemSelect: Locator;
  readonly secondRecipeItemSelect: Locator;
  readonly firstRecipeShareInput: Locator;
  readonly recipeItemOptions: Locator;
  readonly sharesTotalText: Locator;
  readonly sharesNot100Message: Locator;
  readonly createOrderButton: Locator;
  readonly newMixingOrderDialog: Locator;

  // Yarn output tab → "Production entry" card (mill CR round, 2026-10:
  // "Put away & print label" became "Book output", enabled once a doffed
  // weight is entered), or "No blend on the line" until a laydown is closed.
  readonly productionEntryCard: Locator;
  readonly doffedKgInput: Locator;
  readonly bookOutputButton: Locator;
  readonly noBlendOnTheLine: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Spinning' });

    this.mixingOrdersTab = page.getByRole('tab', { name: /^Mixing orders/ });
    this.laydownTab = page.getByRole('tab', { name: /^Laydown/ });
    this.yarnOutputTab = page.getByRole('tab', { name: /^Yarn output/ });

    this.newMixingOrderButton = page.getByRole('button', { name: /New mixing order/i });
    // Since 2026-10-29 a recipe line picks a cotton or fiber item
    // ("Recipe line N item"), not a graded cotton unit ("… cotton unit").
    this.firstRecipeItemSelect = page.getByLabel('Recipe line 1 item');
    this.secondRecipeItemSelect = page.getByLabel('Recipe line 2 item');
    this.firstRecipeShareInput = page.getByLabel('Recipe line 1 share');
    // The item picker is a custom combobox: clicking it opens a listbox of
    // "COT-… · {item name}" options.
    this.recipeItemOptions = page.getByRole('listbox').getByRole('option');
    this.sharesTotalText = page.getByText(/Shares total \d+(\.\d+)?%/);
    this.sharesNot100Message = page.getByText(/The shares total .*not 100%/);
    this.createOrderButton = page.getByRole('button', { name: 'Create order' }).first();
    this.newMixingOrderDialog = page.getByRole('dialog', { name: 'New mixing order' });

    this.productionEntryCard = page.getByRole('heading', { name: 'Production entry' });
    this.doffedKgInput = page.getByRole('textbox', { name: 'Doffed kg' });
    this.bookOutputButton = page.getByRole('button', { name: 'Book output' });
    this.noBlendOnTheLine = page.getByText('No blend on the line');
  }
}
