import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for "New Techpack" — AI Mode (`/techpacks/new/copilot`),
 * the Dashboard's "Create New". No actions or assertions here, see
 * src/pages/techpack/ai-mode-copilot.page.ts for those.
 *
 * Rewritten for the FloorOS redesign (2026-10-22), from the live screens on
 * uat, 2026-10-23 and 2026-10-30. The screen has three states:
 *
 * 1. **Landing.** A drop zone (`button "Add reference photos or tech pack
 *    files"`) that lists attached files as list items (name, size, "header
 *    comes from this one" / "Take the header from this", "Remove <name>"), a
 *    description box, Voice input, the "Add files" (+) menu, the "What to
 *    create" radios and "Generate".
 * 2. **Chat** (`?cid=<id>`, after Generate with a document). A "Progress"
 *    region (01 Upload … 04 Open draft), the conversation, and the
 *    assistant's cards as list items: an optional "A few items aren’t in
 *    master data yet" question, then the "Review details" card with the 7
 *    required pickers, Sample Request, Remark, Cancel and "Create draft".
 *    Each picker is the button that follows its label; it opens a dialog
 *    of options.
 * 3. **Running Workflow** (`?run=<id>&draft=<id>`, after Generate with
 *    photos only): 01 Reviewing / 02 Building / 03 Polishing, then the new
 *    techpack's view opens.
 */
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class AiModeCopilotLocators {
  /** The landing's h1. */
  readonly heading: Locator;
  readonly breadcrumbHomeLink: Locator;
  readonly closeButton: Locator;

  // Landing: files
  readonly dropzone: Locator;
  readonly fileInput: Locator;
  readonly emptyDropzoneText: Locator;
  readonly moreFilesDropzoneText: Locator;
  readonly attachedFiles: Locator;
  readonly removeFileButtons: Locator;
  /** Shown once two or more documents are attached. */
  readonly pickHeaderDocumentText: Locator;
  readonly unsupportedFileMessage: Locator;
  readonly photoLimitMessage: Locator;
  readonly documentOnPhotosMessage: Locator;
  readonly photoUnusableMessage: Locator;
  readonly rendersFromViewerHint: Locator;

  // Landing: description, voice, menu, options, Generate
  readonly descriptionInput: Locator;
  readonly voiceInputButton: Locator;
  readonly stopVoiceInputButton: Locator;
  readonly addFilesButton: Locator;
  readonly addFilesOrPhotosMenuItem: Locator;
  readonly createVisualizeMenuItem: Locator;
  readonly moreToolsMenuItem: Locator;
  readonly manualFormMenuItem: Locator;
  readonly uploadTechpackFileMenuItem: Locator;
  /** The most recently opened (sub)menu. */
  readonly openMenu: Locator;
  /** The open (sub)menu's items that aren't disabled. */
  readonly enabledMenuItems: Locator;
  readonly whatToCreateGroup: Locator;
  readonly generateButton: Locator;
  readonly generatingButton: Locator;

  // Chat
  readonly progressRegion: Locator;
  readonly useManualFormLink: Locator;
  readonly conversation: Locator;
  readonly masterDataQuestion: Locator;
  readonly pickExistingButton: Locator;
  readonly pickExistingReply: Locator;
  /** The latest "Review details" card. */
  readonly reviewCard: Locator;
  /** The card's summary counts, each its own element: "3 inferred", "3 to verify", "1 to pick". */
  readonly reviewCardSummary: Locator;
  /** A Verify field's hint, 'Header says "…".' */
  readonly headerSaysHints: Locator;
  readonly pickValueLine: Locator;
  readonly remarkInput: Locator;
  readonly cardCancelButton: Locator;
  readonly createDraftButton: Locator;
  readonly cancelledText: Locator;
  readonly draftCreatedText: Locator;
  /** "✓ Done (<status>)" once extraction ends: READY, or e.g. EXTRACTION_FAILED. */
  readonly draftDoneText: Locator;
  readonly openTechpackLink: Locator;
  readonly fileAlreadyExistsMessage: Locator;
  readonly openExistingFileLink: Locator;
  readonly createDraftFailedMessage: Locator;
  readonly destructiveActionRefusal: Locator;
  /** The open picker's options (a card picker opens a dialog). */
  readonly pickerOptions: Locator;
  readonly pickerBrowseAllButton: Locator;
  readonly pickerAddNewButton: Locator;
  readonly browseAllDialog: Locator;

  // Chat composer and reply actions
  readonly composerInput: Locator;
  readonly attachAFileButton: Locator;
  readonly sendMessageButton: Locator;
  readonly copyReplyButtons: Locator;
  readonly regenerateButtons: Locator;
  readonly goodResponseButtons: Locator;
  readonly badResponseButtons: Locator;
  readonly feedbackThanksToast: Locator;

  /** The shell top bar's "Ask FloorOS AI" button, which opens the conversations panel. */
  readonly askFloorOsAiButton: Locator;
  /** Any "Create draft" button on the page, including one in the Ask FloorOS AI panel. */
  readonly anyCreateDraftButton: Locator;
  /** The draft's view (`/techpacks/view/{id}`): Tech Pack Information › Description. */
  readonly viewDescriptionInput: Locator;
  /** The techpack view's h1 (its name). */
  readonly viewHeading: Locator;

  // Running Workflow (photos only)
  readonly runningWorkflowText: Locator;
  readonly notAGarmentMessage: Locator;
  readonly generationFailedMessage: Locator;

  // Upload techpack (/techpacks/uploads/new)
  readonly uploadHeading: Locator;
  readonly uploadLimitsText: Locator;
  readonly uploadUnsupportedFormatText: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main').last();

    this.heading = page.getByRole('heading', {
      name: 'Got any ideas we could work on today?',
      level: 1,
    });
    this.breadcrumbHomeLink = page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: 'Tech Pack & BOM' });
    this.closeButton = main.getByRole('button', { name: 'Close' });

    this.dropzone = page.getByRole('button', { name: 'Add reference photos or tech pack files' });
    this.fileInput = page.locator('input[type="file"]').first();
    this.emptyDropzoneText = page.getByText('Drop your files here to start creating.');
    this.moreFilesDropzoneText = page.getByText('Drop more files here, or use + to add them.');
    this.attachedFiles = this.dropzone.getByRole('listitem');
    this.removeFileButtons = main.getByRole('button', { name: /^Remove / });
    this.pickHeaderDocumentText = page.getByText(/^Pick the techpack document/);
    // The advice after the dash changed on uat on 2026-10-30 ("upload a PDF or
    // Excel (.xlsx, .xls)" → "add reference photos (JPG, PNG, WebP) or a tech
    // pack document (PDF, XLSX, XLS)"), so only the stable part is matched.
    this.unsupportedFileMessage = page.getByText(/" is not a supported file - /);
    this.photoLimitMessage = page.getByText(
      'Only 4 reference photos can be used. The others were left out.',
    );
    this.documentOnPhotosMessage = page.getByText(
      'Remove the staged photos to upload a tech pack document.',
    );
    this.photoUnusableMessage = page.getByText('A photo is too small or too large to use.');
    this.rendersFromViewerHint = page.getByText(
      'Drawings and renders can be generated from the viewer after the tech pack is created.',
    );

    this.descriptionInput = page.getByRole('textbox', { name: /Describe what you/ });
    this.voiceInputButton = page.getByRole('button', { name: 'Voice input', exact: true });
    this.stopVoiceInputButton = page.getByRole('button', { name: 'Stop voice input' });
    this.addFilesButton = page.getByRole('button', { name: 'Add files', exact: true });
    this.addFilesOrPhotosMenuItem = page.getByRole('menuitem', { name: 'Add files or photos' });
    this.createVisualizeMenuItem = page.getByRole('menuitem', { name: /^Create Visualize/ });
    this.moreToolsMenuItem = page.getByRole('menuitem', { name: /^More tools/ });
    this.manualFormMenuItem = page.getByRole('menuitem', { name: 'Manual form' });
    this.uploadTechpackFileMenuItem = page.getByRole('menuitem', {
      name: 'Upload a tech pack file',
    });
    this.openMenu = page.getByRole('menu').last();
    this.enabledMenuItems = this.openMenu.locator('[role="menuitem"]:not([aria-disabled="true"])');
    this.whatToCreateGroup = page.getByRole('radiogroup', { name: 'What to create' });
    this.generateButton = page.getByRole('button', { name: 'Generate', exact: true });
    this.generatingButton = page.getByRole('button', { name: 'Generating…' });

    this.progressRegion = page.getByRole('region', { name: 'Progress' });
    this.useManualFormLink = page.getByRole('link', { name: 'Use the manual form' });
    this.conversation = main;
    this.masterDataQuestion = page
      .getByRole('listitem')
      .filter({ hasText: 'A few items aren’t in master data yet' })
      .last();
    this.pickExistingButton = page.getByRole('button', { name: /^No, I.ll pick existing$/ }).last();
    this.pickExistingReply = page.getByText(
      'No problem — pick from existing or leave the missing fields blank.',
    );
    this.reviewCard = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('button', { name: 'Create draft' }) })
      .last();
    this.reviewCardSummary = this.reviewCard.getByText(/^\d+ (inferred|to verify|to pick)$/);
    this.headerSaysHints = this.reviewCard.getByText(/^Header says "/);
    this.pickValueLine = this.reviewCard.getByText(/^Pick a value for:/);
    this.remarkInput = this.reviewCard.getByRole('textbox', { name: 'Remark' });
    this.cardCancelButton = this.reviewCard.getByRole('button', { name: 'Cancel' });
    this.createDraftButton = this.reviewCard.getByRole('button', { name: 'Create draft' });
    this.cancelledText = page.getByText('✕ Cancelled draft creation');
    this.draftCreatedText = page.getByText(/^Draft \w+ created/).last();
    this.draftDoneText = page.getByText(/^✓ Done \(\w+\)$/).last();
    this.openTechpackLink = page.getByRole('link', { name: 'Open Techpack' }).last();
    this.fileAlreadyExistsMessage = page.getByText('This file is already in floorOS');
    this.openExistingFileLink = page.getByTestId('open-existing-techpack-link');
    this.createDraftFailedMessage = page.getByText(/I couldn.t create the draft/i);
    this.destructiveActionRefusal = page.getByText(/can.t take destructive actions/i);
    this.pickerOptions = page.getByRole('dialog').last().getByRole('option');
    this.pickerBrowseAllButton = page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: 'Browse all in table' });
    this.pickerAddNewButton = page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: /^Add new / });
    this.browseAllDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /^Select / }),
    });

    this.composerInput = page.getByRole('textbox', { name: /Ask anything/ });
    this.attachAFileButton = page.getByRole('button', { name: 'Attach a file' });
    this.sendMessageButton = page.getByRole('button', { name: 'Send message' });
    this.copyReplyButtons = main.getByRole('button', { name: 'Copy', exact: true });
    this.regenerateButtons = main.getByRole('button', { name: 'Regenerate', exact: true });
    this.goodResponseButtons = main.getByRole('button', { name: 'Good response', exact: true });
    this.badResponseButtons = main.getByRole('button', { name: 'Bad response', exact: true });
    this.feedbackThanksToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'Thanks for the feedback' });

    this.askFloorOsAiButton = page.getByRole('button', { name: 'Ask FloorOS AI' });
    this.anyCreateDraftButton = page.getByRole('button', { name: 'Create draft' });
    this.viewDescriptionInput = page.getByRole('textbox', { name: 'Description', exact: true });
    this.viewHeading = page.getByRole('heading', { level: 1 }).first();

    this.runningWorkflowText = page.getByText('Running Workflow');
    this.notAGarmentMessage = page.getByText('These photos do not look like a garment.');
    this.generationFailedMessage = page.getByText('Generation failed. Try again.').last();

    this.uploadHeading = page.getByRole('heading', { name: 'Upload techpack' });
    this.uploadLimitsText = page.getByText('Supports .xlsx, .xlsm, .csv, .pdf ≤ 200 MB.');
    this.uploadUnsupportedFormatText = page.getByText(/^Unsupported format: /);
  }

  /** An attached file's list item in the drop zone, by file name. */
  attachedFile(fileName: string): Locator {
    return this.attachedFiles.filter({ hasText: fileName });
  }

  /** The "Remove <file name>" button beside an attached file. */
  removeFileButton(fileName: string): Locator {
    return this.page.getByRole('button', { name: `Remove ${fileName}`, exact: true });
  }

  /** A "What to create" option: "Tech Pack", "Technical Drawing" or "3D Renders". */
  whatToCreate(option: string): Locator {
    return this.whatToCreateGroup.getByRole('radio', { name: option });
  }

  /**
   * A Review details picker, by its label ("Techpack type", "Customer",
   * "Season", "Style #", "Fabric", "Wash", "Product type", "Sample
   * Request"): the button right after the `<label>`.
   */
  cardField(label: string): Locator {
    return this.cardFieldLabel(label).locator('xpath=following::button[1]');
  }

  /** A Review details field's `<label>`. */
  cardFieldLabel(label: string): Locator {
    return this.reviewCard
      .locator('label')
      .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) });
  }

  /** The tag badge beside a field's label: "Inferred", "Verify" or "To pick" (none on Sample Request). */
  cardFieldTag(label: string): Locator {
    return this.cardFieldLabel(label).locator(
      'xpath=following-sibling::span[@data-slot="badge"][1]',
    );
  }

  /** A Dashboard row button for an AI draft, "DRAFT/<first 12 characters of its id>". */
  dashboardDraftButton(draftId: string): Locator {
    return this.page.getByRole('button', { name: `DRAFT/${draftId.slice(0, 12)}` });
  }
}
