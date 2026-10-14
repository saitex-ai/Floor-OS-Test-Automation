import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { CreateSampleRequestLocators } from '../../locators/sample-development/create-sample-request.locators';

export interface SampleRequestFieldValues {
  /** Live-sourced master data — defaults to the first real (non-placeholder) option when omitted. */
  buyer?: string | RegExp;
  season?: string | RegExp;
  styleNumber?: string | RegExp;
  deliverableType?: string | RegExp;
  garmentType?: string | RegExp;
  typeOfSample?: string | RegExp;
  washLevel?: string | RegExp;
  fabric?: string | RegExp;
  inseam?: string | RegExp;
  /** A real whole number as a string, e.g. "10". Defaults to "10". */
  buyerQuantity?: string;
}

/**
 * Dev's shared reference data includes some obviously-seeded
 * placeholder/test entries (confirmed live, same pattern this repo's
 * other live-sourced pickers already work around) — skipped by default
 * rather than picked, so a happy-path create doesn't depend on one
 * specific option staying available forever.
 */
const AVOID_PATTERNS = [
  /BROKEN/i,
  /AWAITING APPROVAL/i,
  /\bTEST\b/i,
  /AUTOMATION QA/i,
  /AUTOTEST/i,
];

/**
 * The "New sample request" wizard
 * (/sample-development/sample-requests/new) — Buyer + Season at the top,
 * then an 8-step per-style wizard (Techpack, Style details, Fabric,
 * Sizes & quantity, Leg tube, Additional info, 3D view, Costing
 * request). Confirmed live (2026-10-05): only 8 fields across the whole
 * wizard actually block Save — Buyer, Season, Style number, Deliverable
 * type, Garment type, Type of sample, Wash level, Buyer delivery date —
 * plus a real Fabric and a real Size row (Inseam + Waist + Buyer
 * quantity) on Steps 3-4. Steps 1 and 5-8 already default to "No" and
 * need no input; everything else on Step 2 (Wash type, Wash code,
 * Dyeing, Internal delivery date) is genuinely optional.
 *
 * This flow was the subject of z941abxfk4 ("Save fails with internal
 * server error (500)"), confirmed fixed 2026-10-05 before this page
 * object was written — every field/step here was confirmed against the
 * real, now-working create flow, not guessed from the ClickUp text.
 *
 * Owned by the Sample Development QA. Element locators live in
 * CreateSampleRequestLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class CreateSampleRequestPage extends BasePage {
  readonly locators: CreateSampleRequestLocators;

  /**
   * Each wizard step's own heading, confirmed live (2026-10-14). The wizard
   * stays on one URL, so these are what proves a "Continue" actually
   * advanced (see continueTo()).
   */
  static readonly STEPS = {
    techpack: 'Start from the techpack',
    styleDetails: 'Describe the style',
    fabric: 'Pick the main fabrics',
    sizes: 'Build the size breakdown',
    legTube: 'Is a leg tube required?',
    additionalInfo: 'Anything else from the buyer',
    view3d: 'Do you need a 3D view?',
    costing: 'Does this style need costing?',
  } as const;

  constructor(page: Page) {
    super(page);
    this.locators = new CreateSampleRequestLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(`${MODULES['sample-development'].path}/sample-requests/new`);
    await expect(this.locators.heading).toBeVisible({ timeout: 45_000 });
    await expect(this.locators.stepHeading(CreateSampleRequestPage.STEPS.techpack)).toBeVisible();
  }

  /**
   * Clicks "Continue" and waits for the next step's heading, so a click
   * that didn't advance (lost click, or validation blocking the step)
   * fails here, naming the step, instead of surfacing later as an
   * unrelated timeout.
   */
  private async continueTo(step: string): Promise<void> {
    await this.locators.continueButton.click();
    await expect(this.locators.stepHeading(step)).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Picks `value` in `combo` if given, otherwise the first real
   * (non-placeholder) option.
   *
   * The wait after opening is deliberate, not decorative: without it,
   * the popover's own list is still settling when the click fires and
   * the option node gets detached/replaced mid-click — confirmed live
   * 2026-10-05 (Buyer silently stayed unselected, which then left
   * Season's combobox disabled for the rest of the test). Same
   * settle-wait already documented in Planning's qualification-form.page.ts
   * for the identical race.
   *
   * The whole open-and-click is wrapped in a verify-and-retry loop: a
   * standalone repro of just this logic never reproduced the miss, but
   * the real suite still hit it again after the settle-wait was already
   * in place — i.e. an occasional click-swallow under the real test
   * runner's load, not a deterministic logic bug. Re-reading the
   * combobox's own text after the click (rather than trusting the click
   * resolved) is what actually detects that case.
   */
  private async pick(combo: Locator, value?: string | RegExp): Promise<string> {
    const attempts = 3;
    let lastSeen = '';
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await combo.click();
      await this.page.waitForTimeout(500);

      let picked: string;
      if (value) {
        const opt = this.locators.option(value).first();
        await opt.waitFor({ state: 'visible' });
        picked = (await opt.innerText()).trim();
        await opt.click();
      } else {
        const options = this.page.getByRole('option');
        await options.first().waitFor({ state: 'visible' });
        // One round trip for every option's text, not one per option.
        const texts = (await options.allInnerTexts()).map((t) => t.trim());
        const matchIndex = Math.max(
          0,
          texts.findIndex((t) => t && !AVOID_PATTERNS.some((p) => p.test(t))),
        );
        picked = texts[matchIndex] ?? '';
        await options.nth(matchIndex).click();
      }

      await this.page.waitForTimeout(300);
      const comboText = (await combo.innerText()).trim();
      // Compare against just the option's first line, not its full
      // innerText: confirmed live (2026-10-06, Style number) an option can
      // render its value on two stacked lines (e.g. a duplicated
      // code/description pair), while the combobox trigger only ever
      // echoes the first one back. Also accepted the other way round, so a
      // trigger that echoes a shorter form of the option (e.g. just its
      // code) isn't misread as a missed pick. Every trigger here is a
      // <button> whose text is the option's (confirmed live 2026-10-14).
      const pickedFirstLine = picked.split('\n')[0]!.trim();
      if (
        comboText &&
        (comboText.includes(pickedFirstLine) || pickedFirstLine.includes(comboText))
      ) {
        return picked;
      }
      lastSeen = `combobox reads "${comboText}" after clicking "${picked}"`;
      // Combobox didn't register the click (occasional miss under load) — close any
      // stray open popover and retry from scratch.
      await this.page.keyboard.press('Escape');
    }
    throw new Error(`pick(): ${lastSeen} (${attempts} attempts)`);
  }

  /** Buyer + Season — the only two request-level fields that block Save. Assignee already defaults to self. */
  async fillRequestDetails(
    values: Pick<SampleRequestFieldValues, 'buyer' | 'season'> = {},
  ): Promise<void> {
    await this.pick(this.locators.buyer, values.buyer);
    await this.pick(this.locators.season, values.season);
  }

  /** Step 1 (Techpack) already defaults to "No techpack for this style" — nothing to fill, just advance. */
  async continueFromTechpackStep(): Promise<void> {
    await this.continueTo(CreateSampleRequestPage.STEPS.styleDetails);
  }

  /** Step 2 (Style details) — the 6 fields confirmed live to block Save. */
  async fillStyleDetails(values: SampleRequestFieldValues = {}): Promise<void> {
    await this.pick(this.locators.styleNumber, values.styleNumber);
    await this.pick(this.locators.deliverableType, values.deliverableType);
    await this.pick(this.locators.garmentType, values.garmentType);
    await this.pick(this.locators.typeOfSample, values.typeOfSample);
    await this.pick(this.locators.washLevel, values.washLevel);

    // Buyer delivery date: the latest selectable day in the calendar's
    // current month. Only today onward is selectable (see
    // enabledDates()), so this is never in the past; it's today itself
    // only on a month's last day.
    await this.locators.buyerDeliveryDateButton.click();
    const latest = this.locators.enabledDates().last();
    await latest.waitFor({ state: 'visible' });
    await latest.click();

    await this.continueTo(CreateSampleRequestPage.STEPS.fabric);
  }

  /** Step 3 (Fabric) — at least one main fabric is required. */
  async fillFabric(values: Pick<SampleRequestFieldValues, 'fabric'> = {}): Promise<void> {
    await this.pick(this.locators.fabric, values.fabric);
    await this.continueTo(CreateSampleRequestPage.STEPS.sizes);
  }

  /**
   * Step 4 (Sizes & quantity) — picks whichever Waist chip actually
   * renders for the chosen Inseam (confirmed live: the available set is
   * inseam-specific, not fixed), adds it, and sets a Buyer quantity.
   * "Add size" only enables once at least one chip is selected (re-confirmed
   * live 2026-10-06: it never shows a count, just the bare label, however
   * many chips are picked).
   */
  async fillSizesAndQuantity(values: SampleRequestFieldValues = {}): Promise<void> {
    await this.pick(this.locators.inseam, values.inseam);
    // Same settle-wait as pick() — the Waist chip list re-renders async
    // once an Inseam is chosen.
    await this.page.waitForTimeout(500);
    const waistChip = this.locators.waistChips.and(this.page.locator(':not([disabled])')).first();
    await waistChip.waitFor({ state: 'visible' });
    await waistChip.click();
    await this.locators.addSizesButton.click();
    await this.locators.buyerQuantity.fill(values.buyerQuantity ?? '10');
    await this.continueTo(CreateSampleRequestPage.STEPS.legTube);
  }

  /**
   * Steps 5-8 (Leg tube, Additional info, 3D view, Costing request) all
   * default to "No" — just advance through each, waiting for every step's
   * heading. Step 8 is the last step and has no Continue button of its
   * own, only Save. `artStyle`, when given, fills Step 6's optional free-text
   * "Art style" — the wizard's only text field, used for the QA-AUTO tag.
   */
  async continueThroughRemainingSteps(artStyle?: string): Promise<void> {
    await this.continueTo(CreateSampleRequestPage.STEPS.additionalInfo);
    if (artStyle) await this.locators.artStyle.fill(artStyle);
    await this.continueTo(CreateSampleRequestPage.STEPS.view3d);
    await this.continueTo(CreateSampleRequestPage.STEPS.costing);
  }

  /**
   * Confirmed live (2026-10-06): clicking "Save & trigger" now opens a
   * "Submit this sample request?" confirmation dialog ("Yes, submit" /
   * "No, go back") before it actually saves — a new step since this page
   * object was first written, same redeploy as the rest of this file's
   * 2026-10-06 notes.
   */
  async save(): Promise<void> {
    await this.locators.saveButton.click();
    await this.locators.confirmSubmitButton.click();
  }

  /**
   * Confirms a successful save(): the app navigates to the new request's
   * own detail page at /sample-development/sample-requests/<id>, where
   * the ID is a real code like "Sample_2026_0012" — confirmed live,
   * unlike most other modules this isn't a UUID.
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sample-development\/sample-requests\/Sample_\d{4}_\d+$/, {
      timeout: 30_000,
    });
  }

  /** Reads the real Sample Request ID off the detail view right after a successful save(). */
  currentSampleRequestId(): string {
    return this.page.url().split('/').pop()!;
  }
}
