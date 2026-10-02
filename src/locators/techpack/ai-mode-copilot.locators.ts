import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for "New Techpack" — AI Mode (the "Saitex AI"
 * copilot). No actions or assertions here, see
 * src/pages/techpack/ai-mode-copilot.page.ts for those.
 *
 * **Substantially redesigned since 2026-09-25, confirmed live on uat
 * 2026-09-29** — this is now a real chat-based copilot interface, not a
 * simple upload-then-form flow:
 * 1. Upload no longer auto-starts extraction. A file appears in a small
 *    list with its own "Remove <name>" button, alongside a new, separate
 *    **"Start extraction"** button that must be clicked explicitly.
 * 2. Clicking it can first show a real "still working" state — "Uploading
 *    the file and opening the draft session…" / "Still waiting on the
 *    agent. The file may be large, or the agent could be unreachable. You
 *    can keep waiting, or retry the handoff." with its own "Retry" button.
 *    **Re-confirmed live 2026-09-29 that the older "Something went wrong
 *    starting the draft session. Please retry." text is NOT gone** — an
 *    earlier version of this comment wrongly assumed it had been replaced
 *    everywhere. It's a distinct, separate outcome: a genuinely invalid
 *    upload (e.g. a `.txt` file) hits it immediately, while a valid file
 *    that the agent can't pick up in time hits the "Still waiting..."
 *    text instead — kept as two separate locators (`invalidFileErrorText`
 *    vs `agentStuckText`) rather than merged into one.
 * 3. Once it resolves, the whole screen becomes a chat panel (a greeting,
 *    suggested prompts, the uploaded file as a message, an assistant
 *    reply) with a separate `region "Current step"` on the right holding
 *    the actual field-picking UI for the current step — a real ARIA
 *    landmark, not the old nested-div structure this file's `fieldTrigger`
 *    used to need. Each field now renders as flat siblings inside that
 *    region: a label/status text, then a button named literally
 *    `"Search <field>..."` (`techpack types`, `customers`, `seasons`,
 *    `style #s`, `fabrics`, `washs` — sic, a real typo in the app itself,
 *    not this file's — `product types`, `sample requests`).
 * 4. **Sample Request is no longer required here** — it shows without a
 *    "To pick" status, unlike the other 7 fields, and the panel's own
 *    "Pick a value for: ..." summary line omits it. A new optional
 *    "Remark" textbox was also added. This is a real behavior change from
 *    the previously-documented "Sample Request required in AI Mode,
 *    unlike Classic" finding — re-verify before assuming either way if
 *    this matters to a test.
 * 5. **"Create draft" reproducibly failed live 2026-09-29 — confirmed via
 *    two distinct, separately-observed symptoms of what looks like the
 *    same underlying break**:
 *    a) With all 7 required fields genuinely filled (confirmed via a full
 *       field-by-field read-back before clicking), clicking it did not
 *       navigate anywhere and did not show any visible error — the entire
 *       "Current step" panel silently reset every field back to "To
 *       pick", as if nothing had ever been selected. No toast, no banner,
 *       confirmed via repeated `ariaSnapshot()` dumps over 20s+ after the
 *       click.
 *    b) On a later run (same day, real fixture PDF, real filled fields
 *       still visible and NOT reset), the chat instead posted an explicit
 *       "I couldn't create the draft. Please try again." message with its
 *       own "Regenerate" action — a real, distinct failure surface, not a
 *       silent one.
 *    Both may be the same underlying gap as the already-filed "copilot
 *    service temporarily unavailable" ClickUp bug, or separate symptoms of
 *    it — either way, treat AI Mode's "Create draft" as currently broken
 *    until this is reconfirmed working, and expect either symptom on any
 *    given run.
 */
export class AiModeCopilotLocators {
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly progressStepper: Locator;
  readonly useManualFormLink: Locator;
  readonly closeLink: Locator;
  readonly fileInput: Locator;
  readonly dropzoneText: Locator;
  readonly fileTypeHint: Locator;
  readonly cancelButton: Locator;
  readonly duplicateMessage: Locator;
  readonly fileAlreadyExistsMessage: Locator;
  readonly openExistingFileLink: Locator;
  readonly pickExistingInsteadButton: Locator;
  readonly createDraftFailedMessage: Locator;
  readonly openTechpackLink: Locator;

  // Upload → Start extraction
  readonly uploadedFileEntry: Locator;
  readonly startExtractionButton: Locator;

  // Two distinct hard/soft failure states after "Start extraction" — see
  // this file's doc comment point 2 for why they're kept separate.
  readonly invalidFileErrorText: Locator;
  readonly unsupportedFileMessage: Locator;
  readonly agentWaitingText: Locator;
  readonly agentStuckText: Locator;
  readonly retryButton: Locator;

  // The chat panel + its own "Current step" field-picking region.
  readonly chatGreeting: Locator;
  readonly currentStepRegion: Locator;
  readonly createDraftButton: Locator;
  readonly pickAValueSummary: Locator;
  readonly sampleRequestLabel: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'New techpack', level: 1 });
    this.subheading = page.getByText('Upload the techpack files');
    this.progressStepper = page.getByRole('list', { name: 'Progress' });
    this.useManualFormLink = page.getByRole('link', { name: 'Use the manual form' });
    this.closeLink = page.getByRole('link', { name: 'Close' });

    this.fileInput = page.locator('input[type="file"]');
    this.dropzoneText = page.getByText('Drop your PDFs or Excel files here, or browse files');
    this.fileTypeHint = page.getByText('PDF or Excel (.xlsx, .xls)');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.duplicateMessage = page.getByText(/There's already a techpack/i);
    this.fileAlreadyExistsMessage = page.getByText('This file is already in floorOS');
    this.openExistingFileLink = page.getByTestId('open-existing-techpack-link');
    this.pickExistingInsteadButton = page.getByRole('button', { name: /pick existing/i });
    this.createDraftFailedMessage = page.getByText(/I couldn't create the draft/i);
    // The "Current step" region's completion card — confirmed live
    // 2026-09-30 with a real, richer PDF: "Draft <ULID>" / "✓ Done
    // (EXTRACTION_FAILED)" / a real "Open Techpack" link to
    // /techpacks/drafts/<ULID>. A genuine third outcome, distinct from
    // both previously-seen failure symptoms — the draft record itself
    // got created, just tagged with an extraction-status marker, and
    // needs an explicit click rather than an automatic navigation.
    this.openTechpackLink = page.getByRole('link', { name: 'Open Techpack' });

    this.uploadedFileEntry = page.getByRole('button', { name: /^Remove /i });
    this.startExtractionButton = page.getByRole('button', { name: 'Start extraction' });

    this.invalidFileErrorText = page.getByText(/Something went wrong starting the draft session/i);
    // Replaced the generic error above for invalid file types, confirmed live 2026-10-01.
    this.unsupportedFileMessage = page.getByText(
      /is not a supported file - upload a PDF or Excel/i,
    );
    this.agentWaitingText = page.getByText(/Uploading the file and opening the draft session/i);
    this.agentStuckText = page.getByText(/Still waiting on the agent/i);
    this.retryButton = page.getByRole('button', { name: 'Retry' });

    this.chatGreeting = page.getByText(/How can I help you today/i);
    this.currentStepRegion = page.getByRole('region', { name: 'Current step' });
    this.createDraftButton = this.currentStepRegion.getByRole('button', { name: 'Create draft' });
    this.sampleRequestLabel = page.getByText('Sample Request', { exact: true }).first();
    this.pickAValueSummary = this.currentStepRegion.getByText(/^Pick a value for:/);
  }

  /**
   * A field's own search-trigger button inside the "Current step" region,
   * e.g. `fieldButton('Techpack type')` → `button "Search techpack
   * types..."`. Confirmed live: these are flat siblings now, no ancestor
   * climbing needed (unlike this form's pre-2026-09-29 shape).
   */
  fieldButton(label: string): Locator {
    const plural: Record<string, string> = {
      'Techpack type': 'techpack types',
      Customer: 'customers',
      Season: 'seasons',
      'Style #': 'style #s',
      Fabric: 'fabrics',
      Wash: 'washs', // sic — a real typo in the app's own button text
      'Product type': 'product types',
      'Sample Request': 'sample requests',
    };
    const noun = plural[label];
    if (!noun) throw new Error(`No known field button mapping for "${label}"`);
    return this.currentStepRegion.getByRole('button', { name: `Search ${noun}...`, exact: true });
  }
}
