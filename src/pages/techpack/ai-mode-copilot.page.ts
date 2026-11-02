import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AiModeCopilotLocators } from '../../locators/techpack/ai-mode-copilot.locators';

/** A file handed to an `<input type="file">` without touching the disk. */
export interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * The 7 Review details fields that must be filled before "Create draft".
 * Customer comes before Season: Season only lists the picked customer's
 * seasons, and some customers have none.
 */
const REQUIRED_CARD_FIELDS = [
  'Techpack type',
  'Customer',
  'Season',
  'Style #',
  'Fabric',
  'Wash',
  'Product type',
] as const;

/** A Review details picker that still shows its "Search …" placeholder is empty. */
const EMPTY_FIELD = /^Search /;

/**
 * "New Techpack" — AI Mode (`/techpacks/new/copilot`). Owned by the
 * Techpack QA. Element locators live in AiModeCopilotLocators
 * (`this.locators`); its doc comment describes the screen's three states
 * (landing, chat, Running Workflow) since the 2026-10-22 redesign.
 *
 * Worth knowing:
 * - AI Mode skips a document it has seen before, by its bytes, so a test
 *   that needs a fresh draft attaches a byte-unique PDF.
 * - The "not in master data yet" question before the Review details card
 *   depends on what the AI reads from the header on that run; it doesn't
 *   always appear for the same file. `waitForReviewCard()` answers it with
 *   "No, I’ll pick existing" (never "Yes, create": that writes master data).
 */
export class AiModeCopilotPage extends BasePage {
  readonly locators: AiModeCopilotLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AiModeCopilotLocators(page);
  }

  /**
   * Opens AI Mode directly and waits for the landing to be ready. The
   * landing renders before `GET /api/techpacks/generation/capabilities`
   * returns and, until then, takes documents only: a photo attached in that
   * moment is refused as "not a supported file" (seen on uat 2026-10-30
   * when the heading won the race by ~100 ms). So this waits for the
   * capabilities, and for photo types to reach the file input when they
   * are enabled.
   */
  async open(): Promise<void> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/techpacks/generation/capabilities',
        { timeout: 90_000 },
      ),
      this.gotoAuthenticated('/techpacks/new/copilot'),
    ]);
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    const capabilities = (await response.json().catch(() => ({}))) as {
      enabled?: boolean;
      acceptedMimeTypes?: string[];
    };
    if (
      capabilities.enabled &&
      capabilities.acceptedMimeTypes?.some((m) => m.startsWith('image/'))
    ) {
      await expect(this.locators.fileInput).toHaveAttribute('accept', /image\//);
    }
  }

  /**
   * Add files › More tools › Manual form. Submenus are opened by clicking
   * their item, not by hovering, which can close them on the way across.
   */
  async openManualFormFromAddFiles(): Promise<void> {
    await this.openMoreTools();
    await this.locators.manualFormMenuItem.click();
  }

  /** Add files › More tools › Upload a tech pack file (opens `/techpacks/uploads/new`). */
  async openUploadTechpackFromAddFiles(): Promise<void> {
    await this.openMoreTools();
    await this.locators.uploadTechpackFileMenuItem.click();
  }

  /** Opens Add files › More tools and returns the submenu's items. */
  async openMoreTools(): Promise<string[]> {
    await this.locators.addFilesButton.click();
    await this.locators.moreToolsMenuItem.click();
    await expect(this.locators.manualFormMenuItem).toBeVisible();
    return this.openMenuItems();
  }

  /**
   * Opens Add files › Create Visualize and returns the techpacks it offers
   * that can be picked (an entry can be disabled, seen on dev 2026-10-30).
   */
  async openCreateVisualize(): Promise<string[]> {
    await this.locators.addFilesButton.click();
    await this.locators.createVisualizeMenuItem.click();
    await expect(this.locators.openMenu).toContainText('On-model shots for');
    return (await this.locators.enabledMenuItems.allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
  }

  /** Opens the Add files menu and returns its items. */
  async openAddFilesMenu(): Promise<string[]> {
    await this.locators.addFilesButton.click();
    await expect(this.locators.addFilesOrPhotosMenuItem).toBeVisible();
    return this.openMenuItems();
  }

  private async openMenuItems(): Promise<string[]> {
    return (await this.locators.openMenu.getByRole('menuitem').allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
  }

  /** Attaches one or more files through the drop zone's file input. */
  async attach(files: UploadFile | UploadFile[]): Promise<void> {
    await this.locators.fileInput.setInputFiles(files);
  }

  async removeAttachedFile(fileName: string): Promise<void> {
    await this.locators.removeFileButton(fileName).click();
  }

  /** Fills the description box and clicks Generate. */
  async generate(description: string): Promise<void> {
    await this.locators.descriptionInput.fill(description);
    await this.locators.generateButton.click();
  }

  /**
   * Fills the description, clicks Generate and returns the status of the
   * `POST /api/techpacks/generations` it sends (a photos-only Generate:
   * 202 accepted, 422 for an unusable photo).
   */
  async generateAndReadStatus(description: string): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname === '/api/techpacks/generations',
        { timeout: 60_000 },
      ),
      this.generate(description),
    ]);
    return response.status();
  }

  /** Clicks Add files › "Add files or photos" and reports whether its file chooser takes several files. */
  async addFilesOrPhotosTakesSeveral(): Promise<boolean> {
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.locators.addFilesOrPhotosMenuItem.click(),
    ]);
    return chooser.isMultiple();
  }

  /**
   * Waits for the Review details card after a document Generate. If the
   * assistant first asks about values missing from master data, answers
   * "No, I’ll pick existing" and returns the question's text.
   */
  async waitForReviewCard(timeout = 180_000): Promise<{ masterDataQuestion: string | null }> {
    await this.locators.reviewCard
      .or(this.locators.pickExistingButton)
      .first()
      .waitFor({ state: 'visible', timeout });
    let masterDataQuestion: string | null = null;
    if (!(await this.locators.reviewCard.isVisible())) {
      masterDataQuestion = (await this.locators.masterDataQuestion.innerText())
        .replace(/\s+/g, ' ')
        .trim();
      await this.locators.pickExistingButton.click();
    }
    await expect(this.locators.reviewCard).toBeVisible({ timeout });
    return { masterDataQuestion };
  }

  /** The card's summary as counts; a count the card leaves out is 0. */
  async reviewCardCounts(): Promise<{ inferred: number; verify: number; pick: number }> {
    await expect(this.locators.reviewCardSummary.first()).toBeVisible();
    const parts = await this.locators.reviewCardSummary.allInnerTexts();
    const count = (word: string) =>
      Number(parts.find((p) => p.endsWith(word))?.match(/^\d+/)?.[0] ?? 0);
    return { inferred: count('inferred'), verify: count('to verify'), pick: count('to pick') };
  }

  /**
   * After a photos-only Generate, waits until the Running Workflow either
   * opens the new techpack ('opened') or reports "Generation failed. Try
   * again." ('failed').
   */
  async waitForPhotoWorkflow(timeout = 240_000): Promise<'opened' | 'failed'> {
    let outcome: 'opened' | 'failed' | 'running' = 'running';
    await expect
      .poll(
        async () => {
          if (/\/techpacks\/view\/[^/?]+/.test(this.page.url())) outcome = 'opened';
          else if (await this.locators.generationFailedMessage.isVisible()) outcome = 'failed';
          return outcome;
        },
        { timeout, intervals: [2_000] },
      )
      .not.toBe('running');
    return outcome as 'opened' | 'failed';
  }

  /**
   * Opens a Review details picker's "Browse all in table". With a long list
   * (187 techpack types on dev) the button sits below the viewport, where a
   * mouse click can't reach it, and Enter picks the highlighted option
   * instead; so the click is dispatched to the button itself.
   */
  async openCardBrowseAll(label: string): Promise<void> {
    await this.locators.cardField(label).click();
    await this.locators.pickerBrowseAllButton.dispatchEvent('click');
    await expect(this.locators.browseAllDialog).toBeVisible();
  }

  /** What a Review details picker shows: its value, or its "Search …" placeholder. */
  async cardFieldValue(label: string): Promise<string> {
    return (await this.locators.cardField(label).innerText()).replace(/\s+/g, ' ').trim();
  }

  /** A Review details field's tag: "Inferred", "Verify" or "To pick" ("" for none). */
  async cardFieldTag(label: string): Promise<string> {
    const tag = this.locators.cardFieldTag(label);
    return (await tag.count()) ? (await tag.innerText()).trim() : '';
  }

  /** Opens a Review details picker and returns its options' texts, then closes it. */
  async cardPickerOptions(label: string): Promise<string[]> {
    await this.locators.cardField(label).click();
    await this.locators.pickerOptions
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
    const texts = (await this.locators.pickerOptions.allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
    await this.closePicker();
    return texts;
  }

  /** Closes an open picker with Escape and waits for its options to go. */
  async closePicker(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.pickerOptions).toHaveCount(0);
  }

  /**
   * Picks an option in a Review details picker: the first option `match`
   * accepts, or a random Approved one. Returns the picked option's text, or
   * null (picker closed again) when nothing qualifies.
   */
  async pickCardOption(label: string, match?: (option: string) => boolean): Promise<string | null> {
    await this.locators.cardField(label).click();
    const options = this.locators.pickerOptions;
    await options
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});
    const texts = (await options.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    let index = -1;
    if (match) {
      index = texts.findIndex(match);
    } else {
      const approved = texts.flatMap((t, i) => (/ Approved$/.test(t) ? [i] : []));
      if (approved.length) index = approved[Math.floor(Math.random() * approved.length)]!;
    }
    if (index < 0) {
      await this.closePicker();
      return null;
    }
    await options.nth(index).click();
    await expect(options).toHaveCount(0);
    return texts[index]!;
  }

  /**
   * Fills every required Review details field that is still empty with a
   * random Approved value. When a customer has no seasons, picks another
   * customer (up to 8 times).
   */
  async fillEmptyRequiredFields(): Promise<void> {
    for (const label of REQUIRED_CARD_FIELDS) {
      if (!EMPTY_FIELD.test(await this.cardFieldValue(label))) continue;
      let picked = await this.pickCardOption(label);
      for (let i = 0; label === 'Season' && !picked && i < 8; i++) {
        await this.pickCardOption('Customer');
        picked = await this.pickCardOption('Season');
      }
      if (!picked) throw new Error(`No Approved option to pick for "${label}"`);
    }
  }

  /**
   * Clicks "Create draft" and returns what the chat answered: 'created'
   * ("Draft <id> created"), 'file-exists' ("This file is already in
   * floorOS") or 'failed' ("I couldn’t create the draft").
   */
  async createDraft(): Promise<'created' | 'file-exists' | 'failed'> {
    await this.locators.createDraftButton.click();
    const created = this.locators.draftCreatedText;
    const exists = this.locators.fileAlreadyExistsMessage;
    const failed = this.locators.createDraftFailedMessage;
    await created.or(exists).or(failed).first().waitFor({ state: 'visible', timeout: 120_000 });
    if (await created.isVisible()) return 'created';
    if (await exists.isVisible()) return 'file-exists';
    return 'failed';
  }

  /**
   * Waits for the draft's extraction to end and returns its status: "READY",
   * or what went wrong (e.g. "EXTRACTION_FAILED", seen on dev 2026-10-30).
   */
  async waitForDraftDone(timeout = 420_000): Promise<string> {
    await expect(this.locators.draftDoneText).toBeVisible({ timeout });
    return (await this.locators.draftDoneText.innerText()).match(/\((\w+)\)/)?.[1] ?? '';
  }

  /** The new draft's id, from the "Open Techpack" link (`/techpacks/drafts/{id}`). */
  async createdDraftId(): Promise<string> {
    const href = (await this.locators.openTechpackLink.getAttribute('href')) ?? '';
    const id = href.match(/\/techpacks\/drafts\/([^/?#]+)/)?.[1];
    if (!id) throw new Error(`No draft id in the "Open Techpack" link: "${href}"`);
    return id;
  }

  /** The Progress region's text, e.g. "Creating techpack 50% 01 Upload … 04 Open draft". */
  async progressText(): Promise<string> {
    return (await this.locators.progressRegion.innerText()).replace(/\s+/g, ' ').trim();
  }

  /** The percentage in the Progress region's "Creating techpack N%". */
  async progressPercent(): Promise<number> {
    const match = (await this.progressText()).match(/(\d+)%/);
    if (!match) throw new Error(`No percentage in the Progress region`);
    return Number(match[1]);
  }
}
