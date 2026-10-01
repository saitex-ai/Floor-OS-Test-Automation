import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { AiModeCopilotLocators } from '../../locators/techpack/ai-mode-copilot.locators';

/**
 * "New Techpack" — AI Mode (the "Saitex AI" copilot). Owned by the
 * Techpack QA.
 *
 * Element locators live in AiModeCopilotLocators (`this.locators`) — see
 * that file's own doc comment for the full account of the 2026-09-29
 * redesign (upload → explicit "Start extraction" → a real chat panel with
 * a "Current step" field-picking region). Worth knowing here:
 *
 * - **Season is still the same dependent field**: no options until
 *   Customer is picked, and not every Customer has a Season.
 * - **Sample Request is no longer required** (confirmed 2026-09-29 — a
 *   change from the previously-documented "required in AI Mode, unlike
 *   Classic" behavior). REQUIRED_FIELD_LABELS below reflects the current
 *   7, not 8.
 * - **"Create draft" reproducibly failed live 2026-09-29**: with all 7
 *   required fields genuinely filled, clicking it neither navigated
 *   anywhere nor showed any visible error — the whole panel silently
 *   reset every field back to empty. `createDraftExpectingResult()`
 *   surfaces this as its own real outcome, `'silently-reset'`, rather
 *   than hanging or throwing an opaque timeout.
 */
const REQUIRED_FIELD_LABELS = [
  'Techpack type',
  'Style #',
  'Customer',
  'Fabric',
  'Season',
  'Wash',
  'Product type',
] as const;

export class AiModeCopilotPage extends BasePage {
  readonly locators: AiModeCopilotLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AiModeCopilotLocators(page);
  }

  /** Navigate to the list, then open AI Mode via the split button's default action. */
  async openFromTechpacksList(): Promise<void> {
    await this.gotoAuthenticated(MODULES['techpack'].path);
    // Same "Loading Techpacks…" bundle-load wait as TechpackPage.expectLoaded()
    // — reproduced twice needing more than 60s on dev, not a one-off fluke.
    await expect(this.page.getByRole('heading', { name: 'TechPacks', level: 1 })).toBeVisible({
      timeout: 90_000,
    });
    await this.page.getByRole('button', { name: 'New Techpack' }).click();
    await expect(this.locators.heading).toBeVisible({ timeout: 30_000 });
  }

  /** Click the "Use the manual form" link on the upload screen itself (found 2026-09-25). */
  async useManualForm(): Promise<void> {
    await this.locators.useManualFormLink.click();
  }

  /** Sets the file input, then waits for it to appear as a real uploaded entry with "Start extraction" ready. */
  async uploadFile(file: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.locators.fileInput.setInputFiles(file);
    await this.locators.startExtractionButton.waitFor({ state: 'visible', timeout: 20_000 });
  }

  /** Clicks "Start extraction" — a real, separate step since the 2026-09-29 redesign (upload alone no longer starts it). */
  async startExtraction(): Promise<void> {
    await this.locators.startExtractionButton.click();
  }

  /**
   * Clicks "Start extraction" and resolves which way the handoff went:
   * - `'blocked'` — the immediate "Something went wrong starting the draft
   *   session. Please retry." text — confirmed live 2026-09-29 as what a
   *   genuinely invalid upload (e.g. a `.txt` file) hits right away.
   * - `'stuck'` — the real "Still waiting on the agent..." message with
   *   its own Retry button (confirmed live 2026-09-29 as a genuine
   *   intermediate state on a *valid* file, not always a dead end — it
   *   resolved into `'ready'` on its own without clicking Retry in one
   *   observed run, but may not always).
   * - `'ready'` — the chat panel's "Current step" region has a real
   *   field button to interact with.
   *
   * One generous shared timeout, raced — not a fixed cutoff — matching
   * this suite's own established lesson that this handoff's timing is
   * highly variable (previously 15s-60s+ for the old flow; not yet
   * fully characterized for this new one).
   */
  async waitForExtractionOutcome(timeout = 75_000): Promise<'blocked' | 'stuck' | 'ready'> {
    const race = (budget: number) =>
      Promise.race([
        this.locators.invalidFileErrorText
          .waitFor({ state: 'visible', timeout: budget })
          .then((): 'blocked' => 'blocked'),
        this.locators.agentStuckText
          .waitFor({ state: 'visible', timeout: budget })
          .then((): 'stuck' => 'stuck'),
        this.locators
          .fieldButton('Techpack type')
          .waitFor({ state: 'visible', timeout: budget })
          .then((): 'ready' => 'ready'),
        this.locators.pickExistingInsteadButton
          .waitFor({ state: 'visible', timeout: budget })
          .then((): 'ready' => 'ready'),
      ]);
    const first = await race(timeout);
    if (first !== 'stuck') return first;
    // A real user has a "Retry" button right here rather than giving up —
    // confirmed live 2026-09-29 that this state can resolve on its own,
    // but don't just wait passively a second time; use the app's own
    // recovery affordance the way a real user would.
    await this.locators.retryButton.click().catch(() => {});
    return race(timeout);
  }

  /** TC:4's assertion — an invalid file type is rejected up front, never reaching "Start extraction". */
  async expectInvalidFileErrorVisible(fileName: string): Promise<void> {
    await expect(this.locators.unsupportedFileMessage).toBeVisible();
    await expect(this.locators.unsupportedFileMessage).toContainText(fileName);
    await expect(this.locators.startExtractionButton).toHaveCount(0);
  }

  /**
   * Waits for the "Current step" field-picking panel to genuinely be
   * ready, transparently clicking through an intermediate prompt if one
   * appears first — see waitForExtractionOutcome()'s own doc comment for
   * why this isn't a single fixed wait.
   */
  async waitForPickAValueForm(timeout = 60_000): Promise<void> {
    await Promise.race([
      this.locators.fieldButton('Techpack type').waitFor({ state: 'visible', timeout }),
      this.locators.pickExistingInsteadButton.waitFor({ state: 'visible', timeout }),
    ]).catch(() => {});
    if (await this.locators.pickExistingInsteadButton.isVisible().catch(() => false)) {
      await this.locators.pickExistingInsteadButton.click();
    }
    await this.locators.fieldButton('Techpack type').waitFor({ state: 'visible', timeout });
  }

  /**
   * Selects a specific option by its leading code/token (e.g. "IAV0000008").
   * These comboboxes (cmdk-based) only render a default subset of options
   * until you type into their own search input.
   */
  private async selectComboboxOption(labelText: string, token: string): Promise<void> {
    await this.locators.fieldButton(labelText).click();
    const searchInput = this.page.locator('[cmdk-input]').last();
    await searchInput.fill(token);
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escaped}(?:\\s|$)`);
    await this.page
      .getByRole('listbox')
      .last()
      .getByRole('option', { name: pattern })
      .first()
      .click();
  }

  async selectFirstAvailableOption(labelText: string): Promise<string> {
    await this.locators.fieldButton(labelText).click();
    const firstOption = this.page.getByRole('listbox').last().getByRole('option').first();
    const text = await firstOption.innerText();
    await firstOption.click();
    return text;
  }

  /** Picks a random available option — see create-techpack.page.ts's identical
   * method for why "first available" isn't safe for a create that must succeed. */
  async selectRandomAvailableOption(labelText: string): Promise<string> {
    await this.locators.fieldButton(labelText).click();
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
   * True once a field's own "Search <noun>..." trigger button no longer
   * exists at all — confirmed live 2026-09-30 with a real, richer
   * techpack PDF: extraction can auto-pick some fields with enough
   * confidence that their placeholder button is simply gone, replaced by
   * a button showing the picked value's own label (e.g. "CARVE DESIGNS
   * CTC0000178" instead of "Search customers..."). A previous version of
   * this page object assumed every field always starts unfilled and hung
   * forever clicking a trigger that no longer existed once a field had
   * already been auto-filled this way.
   */
  async fieldIsFilled(labelText: string): Promise<boolean> {
    return (await this.locators.fieldButton(labelText).count()) === 0;
  }

  async comboboxHasNoOptions(labelText: string): Promise<boolean> {
    await this.locators.fieldButton(labelText).click();
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

  /** Each value is the option's leading code/token (e.g. "IAV0000008") — see selectComboboxOption(). */
  async fillDetails(
    details: Partial<Record<(typeof REQUIRED_FIELD_LABELS)[number], string>>,
  ): Promise<void> {
    for (const label of REQUIRED_FIELD_LABELS) {
      const value = details[label];
      if (value !== undefined) await this.selectComboboxOption(label, value);
    }
  }

  /**
   * Fills all 7 required fields (Customer before Season — see doc
   * comment). Sample Request is no longer required (see this file's doc
   * comment) and isn't touched here. Fields extraction already auto-picked
   * (see `fieldIsFilled()`'s doc comment) are left as-is, not re-picked —
   * there is no "clear and re-pick" affordance in this flow to override
   * them anyway.
   */
  async fillAllRequiredWithRandomAvailable(): Promise<Record<string, string>> {
    const picked: Record<string, string> = {};
    for (const label of REQUIRED_FIELD_LABELS) {
      if (await this.fieldIsFilled(label)) {
        picked[label] = '(pre-filled by extraction)';
        continue;
      }
      if (label === 'Season') {
        let hasSeason = !(await this.comboboxHasNoOptions('Season'));
        for (let attempt = 0; !hasSeason && attempt < 8; attempt++) {
          if (await this.fieldIsFilled('Customer')) {
            throw new Error(
              'Season has no options for the Customer extraction already auto-picked, and there is no way to change an extraction-filled field in this flow',
            );
          }
          picked['Customer'] = await this.selectRandomAvailableOption('Customer');
          hasSeason = !(await this.comboboxHasNoOptions('Season'));
        }
        if (!hasSeason) {
          throw new Error('Could not find a Customer with at least one Season after 8 attempts');
        }
      }
      picked[label] = await this.selectRandomAvailableOption(label);
    }
    return picked;
  }

  async createDraft(): Promise<void> {
    await this.locators.createDraftButton.click();
  }

  async expectCreateDraftDisabled(): Promise<void> {
    await expect(this.locators.createDraftButton).toBeDisabled();
  }

  async expectCreateDraftEnabled(): Promise<void> {
    await expect(this.locators.createDraftButton).toBeEnabled();
  }

  /**
   * Clicks "Create draft" and resolves what actually happened:
   * - `'created'` — the app navigated away from the blank copilot URL.
   * - `'duplicate'` — a "There's already a techpack" chat message.
   * - `'file-exists'` — the file-content dedup message.
   * - `'create-failed'` — **one of two real, reproducible failure symptoms
   *   found live 2026-09-29**: an explicit "I couldn't create the draft.
   *   Please try again." chat message with a "Regenerate" action — the
   *   picked field values stay visible/unchanged (confirmed via a full
   *   accessibility-tree dump showing all 7 still set).
   * - `'draft-with-warning'` — **a third real outcome, found live
   *   2026-09-30 with a real, richer techpack PDF**: the "Current step"
   *   region replaces itself with a completion card — "Draft `<ULID>`" /
   *   "✓ Done (EXTRACTION_FAILED)" / a real "Open Techpack" link to
   *   `/techpacks/drafts/<ULID>`. A real draft record was genuinely
   *   created (unlike the two failure symptoms below), just tagged with
   *   an extraction-status marker and requiring an explicit click rather
   *   than an automatic navigation.
   * - `'silently-reset'` — **found in a separate run**: none of the above
   *   happened, and the "Create draft" button is disabled again shortly
   *   after the click — the panel silently reset every field back to
   *   empty, with no visible error at all.
   * Both `'create-failed'` and `'silently-reset'` are genuine, reportable
   * bug findings — callers should treat either as a real result, not
   * retry past it as if it were a transient miss.
   */
  async createDraftExpectingResult(): Promise<
    | 'created'
    | 'duplicate'
    | 'file-exists'
    | 'create-failed'
    | 'draft-with-warning'
    | 'silently-reset'
  > {
    const blankUrl = this.page.url();
    await this.createDraft();
    // Generous window: on a large real PDF the reply ("This file is already
    // in floorOS…", the completion card, …) can take well over 25s.
    const wait = 90_000;
    const outcome = await Promise.race([
      this.page
        .waitForURL((url) => url.toString() !== blankUrl, { timeout: wait })
        .then((): 'created' => 'created')
        .catch(() => null),
      this.locators.duplicateMessage
        .waitFor({ state: 'visible', timeout: wait })
        .then((): 'duplicate' => 'duplicate')
        .catch(() => null),
      this.locators.fileAlreadyExistsMessage
        .waitFor({ state: 'visible', timeout: wait })
        .then((): 'file-exists' => 'file-exists')
        .catch(() => null),
      this.locators.createDraftFailedMessage
        .waitFor({ state: 'visible', timeout: wait })
        .then((): 'create-failed' => 'create-failed')
        .catch(() => null),
      this.locators.openTechpackLink
        .waitFor({ state: 'visible', timeout: wait })
        .then((): 'draft-with-warning' => 'draft-with-warning')
        .catch(() => null),
    ]);
    if (outcome) return outcome;
    // Before calling it a silent reset, re-check every known reply once more.
    if (await this.locators.fileAlreadyExistsMessage.first().isVisible()) return 'file-exists';
    if (await this.locators.duplicateMessage.first().isVisible()) return 'duplicate';
    if (await this.locators.createDraftFailedMessage.first().isVisible()) return 'create-failed';
    if (await this.locators.openTechpackLink.first().isVisible()) return 'draft-with-warning';
    const stillOnBlankUrl = this.page.url() === blankUrl;
    const disabledAgain = await this.locators.createDraftButton.isDisabled().catch(() => true);
    if (stillOnBlankUrl && disabledAgain) return 'silently-reset';
    throw new Error(
      'createDraftExpectingResult: none of created/duplicate/file-exists/create-failed/draft-with-warning/silently-reset could be confirmed',
    );
  }

  async expectFileAlreadyExistsVisible(): Promise<void> {
    await expect(this.locators.fileAlreadyExistsMessage).toBeVisible();
    await expect(this.locators.openExistingFileLink).toBeVisible();
  }
}
