import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { CreateTechpackLocators } from '../../locators/techpack/create-techpack.locators';

/**
 * "New Techpack" — Classic (manual form). Owned by the Techpack QA.
 *
 * Element locators live in CreateTechpackLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them. Worth
 * knowing:
 *
 * - This form is only reliably reachable via in-app navigation (List page ->
 *   "New Techpack" chevron -> "Classic"), matching CRM's own
 *   `openFromCrmHome()` convention — a hard `goto('/techpacks/new')` was
 *   observed to redirect-loop in ad-hoc testing. openFromTechpacksList()
 *   below always goes through the list first.
 * - **Season is a dependent field: it has no options until Customer is
 *   selected first.** Confirmed by checking Season in isolation (empty)
 *   then again right after picking a Customer (populated, real values).
 *   This is a real cascading-dropdown relationship, not missing seed
 *   data — REQUIRED_COMBOBOX_LABELS below is ordered with Customer before
 *   Season for exactly this reason; don't reorder it, and don't check
 *   Season's options before a Customer has been picked.
 * - **Customer + Season + Style + Fabric + Wash is a real uniqueness key
 *   server-side** — confirmed by hitting the "Techpack already exists"
 *   modal for real: "A techpack with this combination of Customer,
 *   Season, Style, Fabric and Wash has already been created," showing
 *   the existing techpack's code, its latest revision/status, and
 *   "View existing" / "Create new revision" (the latter disabled until
 *   that existing revision is approved). Techpack Type and Product Type
 *   are NOT part of this identity. Because this modal is a pre-save
 *   confirmation (not a hard error), and "first available option" picks
 *   the same value every run, fillAllRequiredWithFirstAvailable() will
 *   reliably collide with whatever a previous run already created —
 *   use fillAllRequiredWithRandomAvailable() instead for any test that
 *   needs the create to actually succeed.
 */
export interface TechpackCreateDetails {
  techpackType?: string | RegExp;
  style?: string | RegExp;
  customer?: string | RegExp;
  sampleRequest?: string | RegExp;
  fabric?: string | RegExp;
  season?: string | RegExp;
  wash?: string | RegExp;
  productType?: string | RegExp;
  description?: string;
}

const REQUIRED_COMBOBOX_LABELS = [
  'Techpack Type*',
  'Style*',
  'Customer*',
  'Fabric*',
  'Season*',
  'Wash*',
  'Product Type*',
] as const;

export class CreateTechpackPage extends BasePage {
  readonly locators: CreateTechpackLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CreateTechpackLocators(page);
  }

  /** Navigate to the list, then open the Classic form via the split-button menu. */
  async openFromTechpacksList(): Promise<void> {
    await this.gotoAuthenticated(MODULES['techpack'].path);
    // Same "Loading Techpacks…" bundle-load wait as TechpackPage.expectLoaded()
    // — reproduced twice needing more than 60s on dev, not a one-off fluke.
    await expect(this.page.getByRole('heading', { name: 'TechPacks', level: 1 })).toBeVisible({
      timeout: 90_000,
    });
    await this.page.getByRole('button', { name: 'More options' }).first().click();
    await this.page.getByRole('menuitem', { name: /Classic/ }).click();
    await expect(this.locators.heading).toBeVisible({ timeout: 30_000 });
  }

  private async selectComboboxOption(
    labelText: string,
    optionText: string | RegExp,
  ): Promise<void> {
    await this.locators.fieldTrigger(labelText).click();
    await this.page.getByRole('listbox').last().getByRole('option', { name: optionText }).click();
  }

  /** Picks whatever the first available option is — dev's seed data is real/messy, so
   * most tests don't care which specific option, only that picking one works. */
  async selectFirstAvailableOption(labelText: string): Promise<string> {
    await this.locators.fieldTrigger(labelText).click();
    const firstOption = this.page.getByRole('listbox').last().getByRole('option').first();
    const text = await firstOption.innerText();
    await firstOption.click();
    return text;
  }

  /**
   * Picks a random available option instead of always the first. Use this
   * (not selectFirstAvailableOption) for the Customer/Season/Style/Fabric/
   * Wash fields whenever a test needs a techpack to actually get created —
   * that five-field combination is a real uniqueness key server-side (see
   * this class's doc comment on the "Techpack already exists" modal), so
   * always picking "first available" deterministically collides with
   * whatever a previous run already created.
   */
  async selectRandomAvailableOption(labelText: string): Promise<string> {
    await this.locators.fieldTrigger(labelText).click();
    const listbox = this.page.getByRole('listbox').last();
    const options = listbox.getByRole('option');
    await options.first().waitFor({ state: 'visible', timeout: 20_000 });
    const count = await options.count();
    const index = Math.floor(Math.random() * count);
    const chosen = options.nth(index);
    const text = await chosen.innerText();
    await chosen.click();
    return text;
  }

  /**
   * True if a field's combobox currently has no options to pick. count()
   * doesn't auto-wait — give the listbox a real window to populate (its
   * options can load asynchronously) before concluding it's empty.
   *
   * Careful with Season specifically: it has no options until Customer
   * is selected first (a real cascading-dropdown relationship, confirmed
   * against the app — see this class's doc comment). Calling this on
   * Season before a Customer is picked will always report "no options,"
   * which is not the same thing as the reference data being missing.
   */
  async comboboxHasNoOptions(labelText: string): Promise<boolean> {
    await this.locators.fieldTrigger(labelText).click();
    const listbox = this.page.getByRole('listbox').last();
    const gotAnOption = await listbox
      .getByRole('option')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    await this.page.keyboard.press('Escape');
    return !gotAnOption;
  }

  async fillDetails(details: TechpackCreateDetails): Promise<void> {
    if (details.techpackType !== undefined)
      await this.selectComboboxOption('Techpack Type*', details.techpackType);
    if (details.style !== undefined) await this.selectComboboxOption('Style*', details.style);
    if (details.customer !== undefined)
      await this.selectComboboxOption('Customer*', details.customer);
    if (details.sampleRequest !== undefined)
      await this.selectComboboxOption('Sample Request', details.sampleRequest);
    if (details.fabric !== undefined) await this.selectComboboxOption('Fabric*', details.fabric);
    if (details.season !== undefined) await this.selectComboboxOption('Season*', details.season);
    if (details.wash !== undefined) await this.selectComboboxOption('Wash*', details.wash);
    if (details.productType !== undefined)
      await this.selectComboboxOption('Product Type*', details.productType);
    if (details.description !== undefined) await this.locators.descriptionTextarea.fill(details.description);
  }

  /** Fills all 7 required combobox fields, each with whatever its first available option is. */
  async fillAllRequiredWithFirstAvailable(): Promise<void> {
    for (const label of REQUIRED_COMBOBOX_LABELS) {
      await this.selectFirstAvailableOption(label);
    }
  }

  /**
   * Fills all 7 required combobox fields, each with a random available
   * option — use this instead of fillAllRequiredWithFirstAvailable() for
   * any test that needs the create to actually succeed (see
   * selectRandomAvailableOption()'s doc comment on why "first available"
   * reliably collides on repeat runs). Order matters: Customer must be
   * picked before Season, since Season has no options until a Customer is
   * selected — REQUIRED_COMBOBOX_LABELS is already ordered for this.
   *
   * Not every Customer has at least one Season (confirmed: picking one at
   * random can land on "0 seasons" for that customer). When that happens,
   * this re-picks a different random Customer and checks again, up to 8
   * tries, rather than failing outright.
   */
  async fillAllRequiredWithRandomAvailable(): Promise<Record<string, string>> {
    const picked: Record<string, string> = {};
    for (const label of REQUIRED_COMBOBOX_LABELS) {
      if (label === 'Season*') {
        let hasSeason = !(await this.comboboxHasNoOptions('Season*'));
        for (let attempt = 0; !hasSeason && attempt < 8; attempt++) {
          picked['Customer*'] = await this.selectRandomAvailableOption('Customer*');
          hasSeason = !(await this.comboboxHasNoOptions('Season*'));
        }
        if (!hasSeason) {
          throw new Error('Could not find a Customer with at least one Season after 8 attempts');
        }
      }
      picked[label] = await this.selectRandomAvailableOption(label);
    }
    return picked;
  }

  async uploadTechpackFile(file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<void> {
    await this.locators.techpackFileInput.setInputFiles(file);
  }

  async uploadOtherAttachment(file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<void> {
    await this.locators.otherAttachmentsInput.setInputFiles(file);
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  /**
   * Clicks Create and resolves what actually happened: 'created' (the
   * form is gone — the record was made and the app navigated to it) or
   * 'duplicate' (the "Techpack already exists" modal, which overlays the
   * still-mounted form rather than replacing it). If neither happens
   * within the window, this re-picks a fresh random identity and retries
   * — dev's shared reference data includes at least one invalid entry
   * (a Techpack Type code over the server's 20-character limit, seen as
   * a raw JSON schema-validation toast) that a client-side combobox
   * doesn't pre-validate against. That's a data-quality problem with
   * dev's shared data, not something a test should work around by
   * hand-picking "safe" options — retrying with different random values
   * sidesteps it without masking a real duplicate-detection failure.
   */
  async createExpectingResult(maxAttempts = 5): Promise<'created' | 'duplicate'> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.create();
      const outcome = await Promise.race([
        this.locators.createButton
          .waitFor({ state: 'hidden', timeout: 15_000 })
          .then((): 'created' => 'created')
          .catch(() => null),
        this.locators.duplicateExistsModal
          .waitFor({ state: 'visible', timeout: 15_000 })
          .then((): 'duplicate' => 'duplicate')
          .catch(() => null),
      ]);
      if (outcome) return outcome;
      if (attempt < maxAttempts - 1) {
        await this.fillAllRequiredWithRandomAvailable();
      }
    }
    throw new Error(
      `createExpectingResult: neither success nor duplicate after ${maxAttempts} attempts`,
    );
  }

  /** Clicks Cancel and, if the form has unsaved input, confirms "Discard & leave". */
  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
    const promptShown = await this.locators.discardChangesModal.isVisible().catch(() => false);
    if (promptShown) await this.locators.discardAndLeaveButton.click();
  }

  /**
   * Reads the footer status. Once every requirement is met, the footer
   * stops saying "N of 7 fields filled" and switches to "Ready to
   * create" instead — reported here as filled === total in that case,
   * rather than throwing on a status string that has changed shape.
   */
  async fieldsFilledCount(): Promise<{ filled: number; total: number }> {
    if (await this.locators.readyToCreateText.isVisible().catch(() => false)) {
      return { filled: 7, total: 7 };
    }
    const text = await this.locators.fieldsFilledText.innerText();
    const match = text.match(/(\d+) of (\d+) fields filled/);
    if (!match) throw new Error(`Could not parse fields-filled count out of "${text}"`);
    return { filled: Number(match[1]), total: Number(match[2]) };
  }

  async expectFormSectionsVisible(): Promise<void> {
    await expect(this.locators.identificationSection).toBeVisible();
    await expect(this.locators.productionSection).toBeVisible();
    await expect(this.locators.lifecycleSection).toBeVisible();
    await expect(this.locators.operationsSection).toBeVisible();
    await expect(this.locators.documentsSection).toBeVisible();
  }

  async expectCreateDisabled(): Promise<void> {
    await expect(this.locators.createButton).toBeDisabled();
  }

  async expectCreateEnabled(): Promise<void> {
    await expect(this.locators.createButton).toBeEnabled();
  }

  async expectDuplicateModalVisible(): Promise<void> {
    await expect(this.locators.duplicateExistsModal).toBeVisible();
  }

  /** Reads the existing techpack's code shown in the "Techpack already exists" modal. */
  async duplicateModalExistingCode(): Promise<string> {
    return this.locators.duplicateExistsModal.getByText(/^TP\d+-\d+$/).innerText();
  }

  /**
   * Confirms a successful create(): the app navigates straight to the new
   * techpack's own detail/canvas view (confirmed:
   * `/techpacks/canvas/{id}` on dev — same route-shape difference from
   * local as techpack-list.spec.ts's TC:10 handles), showing its real
   * Techpack Code, and it loads without the "Could not load
   * techpack"/stuck-"Opening canvas…" issues legacy seed records show.
   */
  async expectCreatedSuccessfully(): Promise<void> {
    await expect(this.page).toHaveURL(/\/techpacks\/(canvas\/)?[^/]+$/, { timeout: 30_000 });
    await expect(this.page).not.toHaveURL(/\/techpacks\/new$/);
    await expect(this.page.getByText(/^TP\d+-\d+$/).first()).toBeVisible({ timeout: 30_000 });
  }

  /** Reads the real Techpack Code off the detail/canvas view right after a successful create(). */
  async currentTechpackCode(): Promise<string> {
    return this.page
      .getByText(/^TP\d+-\d+$/)
      .first()
      .innerText();
  }
}
