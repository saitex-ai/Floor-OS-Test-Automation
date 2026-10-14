import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New sample request" creation wizard
 * (/sample-development/sample-requests/new) — no actions or assertions
 * here, see src/pages/sample-development/create-sample-request.page.ts
 * for those. Confirmed against the running app (2026-10-05) while
 * verifying the Save-fails-with-500 bug (z941abxfk4, fixed) — these are
 * the real fields confirmed to actually block Save across the 8-step
 * wizard, not every field on it. Step 1 (Techpack) already defaults to
 * "No techpack for this style", and Steps 5-8 (Leg tube, Additional
 * info, 3D view, Costing request) all default to "No" — none of those
 * need a locator here.
 */
export class CreateSampleRequestLocators {
  readonly heading: Locator;

  // Request-level (always visible, above the per-style wizard)
  readonly buyer: Locator;
  readonly season: Locator;

  // Step 2 — Style details
  readonly styleNumber: Locator;
  readonly deliverableType: Locator;
  readonly garmentType: Locator;
  readonly typeOfSample: Locator;
  readonly washLevel: Locator;
  readonly buyerDeliveryDateButton: Locator;

  // Step 3 — Fabric
  readonly fabric: Locator;

  // Step 4 — Sizes & quantity. The available Waist chips are specific to
  // whichever Inseam is picked (confirmed live: not every Inseam has
  // every Waist), so this is a collection — the page object picks
  // whichever one actually renders, not a fixed name.
  readonly inseam: Locator;
  readonly waistChips: Locator;
  readonly addSizesButton: Locator;
  readonly buyerQuantity: Locator;

  readonly continueButton: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    // Re-confirmed live (2026-10-06): the heading reads "Create sample
    // request", not "New sample request" as it did on 2026-10-05 — a dev
    // redeploy changed the copy between sessions, not a locator mistake.
    this.heading = page.getByRole('heading', { name: 'Create sample request', level: 1 });

    this.buyer = page.getByRole('combobox', { name: 'Buyer', exact: true });
    this.season = page.getByRole('combobox', { name: 'Season', exact: true });

    this.styleNumber = page.getByRole('combobox', { name: 'Style number', exact: true });
    this.deliverableType = page.getByRole('combobox', { name: 'Deliverable type', exact: true });
    this.garmentType = page.getByRole('combobox', { name: 'Garment type', exact: true });
    this.typeOfSample = page.getByRole('combobox', { name: 'Type of sample', exact: true });
    this.washLevel = page.getByRole('combobox', { name: 'Wash level', exact: true });
    this.buyerDeliveryDateButton = page.getByRole('button', { name: 'Buyer delivery date *' });

    // Re-confirmed live (2026-10-06): the accessible name is "Fabric
    // code", not bare "Fabric" — a separate, optional "Used for" combobox
    // sits alongside it on the same row, same redeploy that changed the
    // page heading (see this.heading above).
    this.fabric = page.getByRole('combobox', { name: 'Fabric code', exact: true });

    this.inseam = page.getByRole('combobox', { name: 'Inseam', exact: true });
    // Re-confirmed live (2026-10-06): chips now render as the bare waist
    // number ("30", "31", ...), no more "W" prefix — same redeploy as
    // this.heading/this.fabric above. Keeping the optional trailing "*"
    // match (unconfirmed-size marker per the screen's own legend) in case
    // it still appears on some seed data. MUST be scoped to the
    // `[data-testid="waist-chips"]` container — confirmed live this same
    // bare-digit accessible name also matches the Styles tab's own index
    // badge (e.g. a style tab literally named "1"), which sits earlier in
    // the DOM, so an unscoped getByRole here silently resolved `.first()`
    // to that badge instead of a real waist chip (a real, confirmed bug,
    // not a style preference) — plain role/name alone can't disambiguate.
    this.waistChips = page
      .locator('[data-testid="waist-chips"]')
      .getByRole('button', { name: /^\d+\*?$/ });
    // Re-confirmed live (2026-10-06): reads plain "Add size", with no
    // count, regardless of how many chips are selected — the "N sizes"
    // format this previously matched no longer appears.
    this.addSizesButton = page.getByRole('button', { name: 'Add size', exact: true });
    // Re-confirmed live (2026-10-06): now a plain text input (role
    // "textbox"), not a number input — same redeploy as the other
    // Sizes & Quantity changes above. Accessible name unchanged.
    this.buyerQuantity = page.getByRole('textbox', { name: 'Buyer quantity' });

    this.continueButton = page.getByRole('button', { name: 'Continue' });
    // Confirmed live: the label is "Save & trigger" (referencing the
    // auto-triggered Techpack/SO/Consumption tasks), not plain "Save".
    this.saveButton = page.getByRole('button', { name: /^Save/ });
  }

  /** An option inside whichever combobox popover is currently open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  /** The first enabled (selectable) day in whichever date-picker calendar is open. */
  firstEnabledDate(): Locator {
    return this.page.locator('[role="grid"] button:not([disabled])').first();
  }
}
