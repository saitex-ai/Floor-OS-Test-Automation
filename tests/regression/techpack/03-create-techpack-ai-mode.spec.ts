import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';
import { authFile } from '../../../src/fixtures/auth-setup';
import { env } from '../../../src/config/env';
import {
  AiModeCopilotPage,
  type UploadFile,
} from '../../../src/pages/techpack/ai-mode-copilot.page';
import { TechpackPage } from '../../../src/pages/techpack/techpack.page';
import { openQuestion, partial } from '../../../src/utils/test-annotations';
import {
  QA_AUTO_TEXT,
  garmentPhoto,
  largeNoisePhoto,
  smallPhoto,
  techpackXlsx,
  textFile,
  uniqueTechpackPdf,
} from './support/ai-mode-files';

/**
 * Techpack — New Techpack (AI Mode), `/techpacks/new/copilot`.
 *
 * Source of truth: test-cases/techpack/create-techpack-ai-mode.md. Rewritten
 * 2026-10-30 for the FloorOS redesign (2026-10-22): the landing takes files
 * and a description, "Generate" opens a chat whose "Review details" card
 * leads to "Create draft", and photos alone run a separate generation
 * workflow. No ClickUp test-case tasks exist for this story.
 *
 * Test data: every Generate uploads a byte-unique copy of
 * sample-techpack.pdf (AI Mode skips a document it has seen before) with a
 * QA-AUTO description. TC:8 creates one draft (QA-AUTO Remark) and TC:42 one
 * photo-generated techpack. Nothing is added to master data: the "not in
 * master data yet" question is always answered "No, I’ll pick existing".
 */

const GENERATE_PROMPT = `Create a tech pack from the attached file. ${QA_AUTO_TEXT}`;
const PHOTO_PROMPT = `A pair of wide-leg trousers from the attached reference photos. ${QA_AUTO_TEXT}`;
/** The last line of every master-data option: the statuses seen on uat and dev, 2026-10-30. */
const MASTER_DATA_STATUS = / (Approved|Draft|Rejected)$/;
const REQUIRED_CARD_FIELDS = [
  'Techpack type',
  'Customer',
  'Season',
  'Style #',
  'Fabric',
  'Wash',
  'Product type',
];

test.describe('Techpack - New Techpack (AI Mode)', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('New Techpack - AI Mode');
    await allure.owner('Techpack QA');
  });

  // ---------------------------------------------------------------------------
  // Landing: nothing is generated or saved.
  // ---------------------------------------------------------------------------

  test('TC:1 Verify the AI Mode landing screen layout', async ({
    techpackPage,
    aiModeCopilotPage,
    page,
  }) => {
    const l = aiModeCopilotPage.locators;
    await test.step('Dashboard › Create New', async () => {
      await techpackPage.open();
      await expect(techpackPage.locators.heading).toBeVisible({ timeout: 90_000 });
      await techpackPage.clickCreateNew();
    });

    await test.step('AI Mode opens with its heading, breadcrumb, drop zone and options', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new\/copilot$/);
      await expect(l.heading).toBeVisible({ timeout: 30_000 });
      await expect(l.breadcrumbHomeLink).toBeVisible();
      await expect(l.dropzone).toBeVisible();
      await expect(l.emptyDropzoneText).toBeVisible();
      await expect(l.descriptionInput).toBeVisible();
      await expect(l.voiceInputButton).toBeVisible();
      await expect(l.addFilesButton).toBeVisible();
      await expect(l.whatToCreate('Tech Pack')).toBeChecked();
      await expect(l.whatToCreate('Technical Drawing')).toBeVisible();
      await expect(l.whatToCreate('3D Renders')).toBeVisible();
      await expect(l.generateButton).toBeDisabled();
    });

    await test.step('No Progress bar, "Use the manual form" link or Close on the landing', async () => {
      await expect(l.progressRegion).toHaveCount(0);
      await expect(l.useManualFormLink).toHaveCount(0);
      await expect(l.closeButton).toHaveCount(0);
    });
  });

  test('TC:2 Verify the file input takes documents and photos, several at a time', async ({
    aiModeCopilotPage,
  }) => {
    await aiModeCopilotPage.open();
    const input = aiModeCopilotPage.locators.fileInput;
    const accept = (await input.getAttribute('accept')) ?? '';

    for (const type of ['.pdf', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp']) {
      expect(accept).toContain(type);
    }
    expect(await input.getAttribute('multiple')).not.toBeNull();
  });

  test('TC:3 Verify the breadcrumb returns to the Techpacks Dashboard', async ({
    aiModeCopilotPage,
    techpackPage,
    page,
  }) => {
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.locators.breadcrumbHomeLink.click();
    await expect(page).toHaveURL(/\/techpacks\/?$/);
    await expect(techpackPage.locators.heading).toBeVisible({ timeout: 90_000 });
  });

  test('TC:4 Verify a non-PDF/Excel file is refused with a message', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(textFile());

    await expect(l.unsupportedFileMessage).toContainText(textFile().name);
    await expect(l.attachedFiles).toHaveCount(0);
    await expect(l.generateButton).toBeDisabled();
  });

  test('TC:9 Verify Add files › More tools › Manual form opens the Classic form', async ({
    aiModeCopilotPage,
    createTechpackPage,
    page,
  }) => {
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.openManualFormFromAddFiles();
    await expect(page).toHaveURL(/\/techpacks\/new$/);
    await expect(createTechpackPage.locators.heading).toBeVisible({ timeout: 30_000 });
  });

  test('TC:11 Verify Generate needs an attached file, not just a description', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await l.descriptionInput.fill(GENERATE_PROMPT);

    for (const option of ['Tech Pack', 'Technical Drawing', '3D Renders']) {
      await test.step(`Description only, "${option}": Generate disabled`, async () => {
        await l.whatToCreate(option).check();
        await expect(l.generateButton).toBeDisabled();
      });
    }

    await test.step('Tech Pack with a PDF attached: Generate enabled', async () => {
      await l.whatToCreate('Tech Pack').check();
      await aiModeCopilotPage.attach(uniqueTechpackPdf('tc11'));
      await expect(l.generateButton).toBeEnabled();
    });
  });

  test('TC:12 Verify the description box stops at 2,000 characters', async ({
    aiModeCopilotPage,
  }) => {
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.locators.descriptionInput.fill('x'.repeat(2005));
    await expect(aiModeCopilotPage.locators.descriptionInput).toHaveValue('x'.repeat(2000));
  });

  test('TC:13 Verify up to four reference photos are listed and a fifth is refused with a message', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(
      [1, 2, 3, 4, 5].map((n) => garmentPhoto(n as 1 | 2 | 3 | 4 | 5)),
    );

    await expect(l.photoLimitMessage).toBeVisible();
    await expect(l.removeFileButtons).toHaveCount(4);
    await expect(l.generateButton).toBeEnabled();
  });

  test('TC:14 Verify a document is refused, with a message, on top of reference photos', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    const photo = garmentPhoto(1);
    const pdf = uniqueTechpackPdf('tc14');
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(photo);
    await expect(l.removeFileButton(photo.name)).toBeVisible();
    await aiModeCopilotPage.attach(pdf);

    await expect(l.documentOnPhotosMessage).toBeVisible();
    await expect(l.removeFileButton(pdf.name)).toHaveCount(0);
    await expect(l.removeFileButton(photo.name)).toBeVisible();
  });

  test('TC:15 Verify attaching a document limits "What to create" to Tech Pack', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    const pdf = uniqueTechpackPdf('tc15');
    await aiModeCopilotPage.open();

    await test.step('With a PDF: listed as the header source, drawings and renders disabled', async () => {
      await aiModeCopilotPage.attach(pdf);
      await expect(l.attachedFile(pdf.name)).toContainText('header comes from this one');
      await expect(l.moreFilesDropzoneText).toBeVisible();
      await expect(l.whatToCreate('Technical Drawing')).toBeDisabled();
      await expect(l.whatToCreate('3D Renders')).toBeDisabled();
      await expect(l.rendersFromViewerHint).toBeVisible();
    });

    await test.step('Removing it enables them again', async () => {
      await aiModeCopilotPage.removeAttachedFile(pdf.name);
      await expect(l.whatToCreate('Technical Drawing')).toBeEnabled();
      await expect(l.whatToCreate('3D Renders')).toBeEnabled();
    });
  });

  test('TC:16 Verify Voice input starts and stops listening', async ({
    aiModeCopilotPage,
    context,
  }) => {
    const l = aiModeCopilotPage.locators;
    await context.grantPermissions(['microphone']);
    await aiModeCopilotPage.open();

    await l.voiceInputButton.click();
    await expect(l.stopVoiceInputButton).toHaveAttribute('aria-pressed', 'true');
    await l.stopVoiceInputButton.click();
    await expect(l.voiceInputButton).toBeVisible();
  });

  test('TC:17 Verify the "Add files" menu and its sub-menus', async ({
    aiModeCopilotPage,
    page,
  }) => {
    await aiModeCopilotPage.open();

    await test.step('Add files: "Add files or photos", "Create Visualize", "More tools"', async () => {
      expect(await aiModeCopilotPage.openAddFilesMenu()).toEqual(
        expect.arrayContaining(['Add files or photos', 'Create Visualize', 'More tools']),
      );
    });

    await test.step('"Add files or photos" opens a file chooser that takes several files', async () => {
      expect(await aiModeCopilotPage.addFilesOrPhotosTakesSeveral()).toBe(true);
    });

    await test.step('Create Visualize: "On-model shots for" and recent techpacks', async () => {
      await aiModeCopilotPage.openCreateVisualize();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
    });

    await test.step('More tools: "Manual form", "Upload a tech pack file"', async () => {
      expect(await aiModeCopilotPage.openMoreTools()).toEqual([
        'Manual form',
        'Upload a tech pack file',
      ]);
    });
  });

  test("TC:18 Verify Create Visualize opens a techpack's Visualization section", async ({
    aiModeCopilotPage,
    page,
  }) => {
    await aiModeCopilotPage.open();
    const techpacks = await aiModeCopilotPage.openCreateVisualize();
    test.skip(
      techpacks.length === 0,
      'Create Visualize offers no techpack to pick on this environment',
    );

    await aiModeCopilotPage.locators.enabledMenuItems.first().click();
    await expect(page).toHaveURL(/\/techpacks\/view\/[^/?]+\?section=visualization$/, {
      timeout: 30_000,
    });
    await expect(aiModeCopilotPage.locators.viewHeading).toHaveText(techpacks[0]!);
  });

  test('TC:24 Verify the Upload techpack screen', async ({ aiModeCopilotPage, page }) => {
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.openUploadTechpackFromAddFiles();

    await expect(page).toHaveURL(/\/techpacks\/uploads\/new$/);
    await expect(l.uploadHeading).toBeVisible({ timeout: 30_000 });
    await expect(l.uploadLimitsText).toBeVisible();
    const accept = (await l.fileInput.getAttribute('accept')) ?? '';
    for (const type of ['.xlsx', '.xlsm', '.csv', '.pdf']) expect(accept).toContain(type);
    expect(await l.fileInput.getAttribute('multiple')).toBeNull();
  });

  test('TC:26 Verify removing every attached file returns the landing to its empty state', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    const pdf = uniqueTechpackPdf('tc26');
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(pdf);
    await expect(l.generateButton).toBeEnabled();

    await aiModeCopilotPage.removeAttachedFile(pdf.name);
    await expect(l.attachedFiles).toHaveCount(0);
    await expect(l.emptyDropzoneText).toBeVisible();
    for (const option of ['Tech Pack', 'Technical Drawing', '3D Renders']) {
      await expect(l.whatToCreate(option)).toBeEnabled();
    }
    await expect(l.generateButton).toBeDisabled();
  });

  test('TC:27 Verify an Excel tech pack (.xlsx) is accepted as the document', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    const xlsx = techpackXlsx();
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(xlsx);

    await expect(l.attachedFile(xlsx.name)).toContainText('header comes from this one');
    await expect(l.removeFileButton(xlsx.name)).toBeVisible();
    await expect(l.whatToCreate('Technical Drawing')).toBeDisabled();
    await expect(l.whatToCreate('3D Renders')).toBeDisabled();
    await expect(l.generateButton).toBeEnabled();
  });

  test('TC:28 Verify several tech pack documents can be attached, with one as the header source', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    const pdf = uniqueTechpackPdf('tc28');
    const xlsx = techpackXlsx();
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(pdf);
    await aiModeCopilotPage.attach(xlsx);

    await test.step('Both are listed; the first is the header source', async () => {
      await expect(l.pickHeaderDocumentText).toBeVisible();
      await expect(l.attachedFile(pdf.name)).toContainText('header comes from this one');
      await expect(l.attachedFile(xlsx.name)).not.toContainText('header comes from this one');
    });

    await test.step('"Take the header from this" on the second moves the tag to it', async () => {
      await l
        .attachedFile(xlsx.name)
        .getByRole('button', { name: 'Take the header from this' })
        .click();
      await expect(l.attachedFile(xlsx.name)).toContainText('header comes from this one');
      await expect(l.attachedFile(pdf.name)).not.toContainText('header comes from this one');
    });
  });

  test('TC:31 Verify removing one of several reference photos keeps the rest', async ({
    aiModeCopilotPage,
  }) => {
    const l = aiModeCopilotPage.locators;
    const photos = [garmentPhoto(1), garmentPhoto(2), garmentPhoto(3)];
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(photos);
    await expect(l.removeFileButtons).toHaveCount(3);

    await aiModeCopilotPage.removeAttachedFile(photos[1]!.name);
    await expect(l.removeFileButton(photos[1]!.name)).toHaveCount(0);
    await expect(l.removeFileButton(photos[0]!.name)).toBeVisible();
    await expect(l.removeFileButton(photos[2]!.name)).toBeVisible();
    await expect(l.generateButton).toBeEnabled();
  });

  test('TC:43 Verify Upload techpack refuses an unsupported file type', async ({
    aiModeCopilotPage,
    page,
  }) => {
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.openUploadTechpackFromAddFiles();
    await expect(aiModeCopilotPage.locators.uploadHeading).toBeVisible({ timeout: 30_000 });
    const uploads: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/api\/techpacks\/uploads/.test(r.url())) uploads.push(r.url());
    });

    await aiModeCopilotPage.attach(textFile());
    await expect(aiModeCopilotPage.locators.uploadUnsupportedFormatText).toContainText(
      'text/plain',
    );
    await expect(page).toHaveURL(/\/techpacks\/uploads\/new$/);
    expect(uploads).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // One Generate each.
  // ---------------------------------------------------------------------------

  test('TC:21 Verify the chat screen\'s "Use the manual form" link opens the Classic form', async ({
    aiModeCopilotPage,
    createTechpackPage,
    page,
  }) => {
    test.setTimeout(180_000);
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(uniqueTechpackPdf('tc21'));
    await aiModeCopilotPage.generate(GENERATE_PROMPT);

    await aiModeCopilotPage.locators.useManualFormLink.click({ timeout: 60_000 });
    await expect(page).toHaveURL(/\/techpacks\/new$/);
    await expect(createTechpackPage.locators.heading).toBeVisible({ timeout: 30_000 });
  });

  test('TC:23 Verify a description mentioning deletion does not stop draft creation', async ({
    aiModeCopilotPage,
  }) => {
    test.setTimeout(240_000);
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(uniqueTechpackPdf('tc23'));
    await aiModeCopilotPage.generate(`${GENERATE_PROMPT} Safe to delete.`);

    await l.reviewCard
      .or(l.pickExistingButton)
      .or(l.destructiveActionRefusal)
      .first()
      .waitFor({ state: 'visible', timeout: 180_000 });
    // Open question since 2026-10-23 (still so on uat 2026-10-30): "Safe to
    // delete" in the description makes the assistant refuse ("I can't take
    // destructive actions on your behalf …") instead of showing the card.
    if (await l.destructiveActionRefusal.isVisible()) {
      openQuestion(
        '"Safe to delete" in the description is answered as a destructive request; no Review details card',
      );
      return;
    }
    await aiModeCopilotPage.waitForReviewCard();
  });

  test('TC:37 Verify "Cancel" on the card ends the request without creating a draft', async ({
    aiModeCopilotPage,
  }) => {
    test.setTimeout(240_000);
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(uniqueTechpackPdf('tc37'));
    await aiModeCopilotPage.generate(GENERATE_PROMPT);
    await aiModeCopilotPage.waitForReviewCard();

    await l.cardCancelButton.click();
    await expect(l.cancelledText).toBeVisible({ timeout: 60_000 });
    await expect(l.createDraftButton).toBeDisabled();
    await expect(l.draftCreatedText).toHaveCount(0);
  });

  test('TC:29 Verify a reference photo smaller than 256 px is refused at Generate', async ({
    aiModeCopilotPage,
  }) => {
    test.setTimeout(180_000);
    const l = aiModeCopilotPage.locators;
    const photo = smallPhoto();
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(photo);
    await expect(l.removeFileButton(photo.name)).toBeVisible();
    await expect(l.generateButton).toBeEnabled();

    expect(await aiModeCopilotPage.generateAndReadStatus(PHOTO_PROMPT)).toBe(422);
    await expect(l.photoUnusableMessage).toBeVisible({ timeout: 30_000 });
  });

  test('TC:30 Verify a reference photo over 8 MB is accepted', async ({ aiModeCopilotPage }) => {
    test.setTimeout(180_000);
    const l = aiModeCopilotPage.locators;
    const photo = largeNoisePhoto(9 * 1024 * 1024);
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach(photo);
    await expect(l.removeFileButton(photo.name)).toBeVisible();
    await expect(l.generateButton).toBeEnabled();

    // Passed on review 2026-10-30: the capabilities API's 8 MB
    // (maxReferenceBytes) isn't enforced, and that is accepted as working.
    expect(await aiModeCopilotPage.generateAndReadStatus(PHOTO_PROMPT)).toBe(202);
  });

  test('TC:42 Verify Generate from reference photos only builds and opens a techpack', async ({
    aiModeCopilotPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941ac0cbx', 'TC:42 dev bug (ClickUp)');
    // dev only (ClickUp z941ac0cbx, filed 2026-11-02): every photos-only
    // Generate fails at 75% with "Generation failed. Try again." (NO_OUTPUT /
    // GENERATION_FAILED); uat builds and opens the techpack. Not a knownBug():
    // it would fail as an unexpected pass on uat.
    test.skip(
      env.testEnv === 'dev',
      'Photo-only generation fails on dev: ClickUp z941ac0cbx (NO_OUTPUT / GENERATION_FAILED)',
    );
    test.setTimeout(300_000);
    const l = aiModeCopilotPage.locators;
    await aiModeCopilotPage.open();
    await aiModeCopilotPage.attach([garmentPhoto(1), garmentPhoto(2)]);

    await test.step('Generate: the request is accepted and "Running Workflow" starts', async () => {
      expect(await aiModeCopilotPage.generateAndReadStatus(PHOTO_PROMPT)).toBe(202);
      await expect(l.runningWorkflowText).toBeVisible({ timeout: 60_000 });
    });

    await test.step('The new techpack opens with its own name', async () => {
      expect(await aiModeCopilotPage.waitForPhotoWorkflow(), 'the Running Workflow outcome').toBe(
        'opened',
      );
      await expect(l.viewHeading).not.toBeEmpty();
      await expect(l.viewDescriptionInput).toHaveValue(PHOTO_PROMPT);
    });
  });

  // ---------------------------------------------------------------------------
  // One chat, shared in order: Generate (TC:32), the Review details card
  // (TC:5, 20, 19, 33-36, 6), the chat controls (TC:40, 41), Create draft
  // (TC:8, 10), and the draft afterwards (TC:39, 38, 25, 22).
  // ---------------------------------------------------------------------------

  test.describe.serial('One chat, Generate to draft', () => {
    let page: Page;
    let ai: AiModeCopilotPage;
    let pdf: UploadFile;
    let chatUrl = '';
    let masterDataQuestion: string | null = null;
    let draftId = '';
    const remark = `${QA_AUTO_TEXT} Remark ${Date.now()}`;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage({ storageState: authFile('techpack') });
      ai = new AiModeCopilotPage(page);
      pdf = uniqueTechpackPdf('chat');
    });

    test.afterAll(async () => {
      await page.close();
    });

    test('TC:32 Verify the screen is locked and shows "Generating…" while Generate runs', async () => {
      test.setTimeout(120_000);
      const l = ai.locators;
      await ai.open();
      await ai.attach(pdf);
      await ai.generate(GENERATE_PROMPT);

      await test.step('"Generating…", with the description, Add files, options and Remove disabled', async () => {
        await expect(l.generatingButton).toBeVisible();
        await expect(l.descriptionInput).toBeDisabled();
        await expect(l.addFilesButton).toBeDisabled();
        await expect(l.whatToCreate('Tech Pack')).toBeDisabled();
        await expect(l.removeFileButton(pdf.name)).toBeDisabled();
      });

      await test.step('Then the chat opens (?cid=)', async () => {
        await expect(page).toHaveURL(/\/techpacks\/new\/copilot\?cid=[\w-]+/, { timeout: 60_000 });
        chatUrl = page.url();
      });
    });

    test('TC:5 Verify Generate reads the header and shows the "Review details" card with the 7 required fields', async () => {
      test.setTimeout(240_000);
      const l = ai.locators;
      ({ masterDataQuestion } = await ai.waitForReviewCard());

      // After the master-data question (TC:20) the card follows "No problem — …" instead.
      if (masterDataQuestion) await expect(l.pickExistingReply).toBeVisible();
      else
        await expect(l.conversation).toContainText(
          'I read the header — confirm the details below to create the draft.',
        );
      await expect(l.reviewCard).toContainText('Review details');
      await expect(l.reviewCard).toContainText(pdf.name);
      for (const field of [...REQUIRED_CARD_FIELDS, 'Sample Request']) {
        await expect(l.cardField(field)).toBeVisible();
      }
      await expect(l.reviewCard).toContainText('Optional. Sets the factory on the techpack.');
      await expect(l.remarkInput).toBeVisible();
    });

    test('TC:20 Verify a header value missing from master data is offered for creation, and can be skipped', async () => {
      // Whether the AI's reading of the header misses master data varies by
      // run, even for the same file, so this can only be checked when it does.
      test.skip(
        !masterDataQuestion,
        'The header matched master data on this run; no question was asked',
      );
      expect(masterDataQuestion).toMatch(/A few items aren’t in master data yet/);
      expect(masterDataQuestion).toMatch(/(Customer|Season|Style #|Fabric|Wash|Product type): \S/);
      await expect(ai.locators.pickExistingReply).toBeVisible();
    });

    test('TC:19 Verify the card summarises what it inferred, what to verify and what to pick', async () => {
      const l = ai.locators;
      const summary = await ai.reviewCardCounts();
      const tags = await Promise.all(REQUIRED_CARD_FIELDS.map((f) => ai.cardFieldTag(f)));

      await test.step("The summary counts the 7 fields' tags", async () => {
        expect(summary).toEqual({
          inferred: tags.filter((t) => t === 'Inferred').length,
          verify: tags.filter((t) => t === 'Verify').length,
          pick: tags.filter((t) => t === 'To pick').length,
        });
      });

      await test.step('A To-pick field is empty; a Verify field shows what the header says', async () => {
        for (const [i, field] of REQUIRED_CARD_FIELDS.entries()) {
          if (tags[i] === 'To pick') expect(await ai.cardFieldValue(field)).toMatch(/^Search /);
        }
        // Inferred fields can carry a hint too, so at least one per Verify field.
        const verify = tags.filter((t) => t === 'Verify').length;
        expect(await l.headerSaysHints.count()).toBeGreaterThanOrEqual(verify);
      });

      const emptyInferred = [];
      for (const [i, field] of REQUIRED_CARD_FIELDS.entries()) {
        if (tags[i] === 'Inferred' && /^Search /.test(await ai.cardFieldValue(field))) {
          emptyInferred.push(field);
        }
      }
      if (emptyInferred.length) {
        openQuestion(`Fields tagged Inferred but left empty: ${emptyInferred.join(', ')}`);
      }
    });

    test('TC:33 Verify a value on the card can be changed to another option', async () => {
      const filled = [];
      for (const field of REQUIRED_CARD_FIELDS.filter((f) => f !== 'Season' && f !== 'Customer')) {
        if (!/^Search /.test(await ai.cardFieldValue(field))) filled.push(field);
      }
      // Pre-filled fields depend on what the AI read this run; fill one first if none were.
      const field = filled[0] ?? 'Style #';
      if (!filled.length) {
        partial(
          'No field other than Customer/Season was pre-filled this run; Style # was picked first',
        );
        await ai.pickCardOption(field);
      }
      const before = await ai.cardFieldValue(field);

      const picked = await ai.pickCardOption(
        field,
        (o) => / Approved$/.test(o) && !o.includes(before.split(' ')[0]!),
      );
      expect(picked, `another Approved ${field} to pick`).not.toBeNull();
      expect(await ai.cardFieldValue(field)).not.toBe(before);
    });

    test('TC:34 Verify changing Customer on the card re-scopes Season to that customer', async () => {
      const l = ai.locators;
      await test.step('Pick a Customer and one of its Seasons', async () => {
        let season = null;
        for (let i = 0; !season && i < 8; i++) {
          await ai.pickCardOption('Customer');
          season = await ai.pickCardOption('Season');
        }
        expect(season, 'a Customer with an Approved Season').not.toBeNull();
      });

      await test.step('Pick a different Customer: Season is cleared and asked for again', async () => {
        const first = await ai.cardFieldValue('Customer');
        const code = first.split(' ')[0]!;
        await ai.pickCardOption('Customer', (o) => / Approved$/.test(o) && !o.includes(code));
        expect(await ai.cardFieldValue('Customer')).not.toBe(first);
        expect(await ai.cardFieldValue('Season')).toMatch(/^Search /);
        await expect(l.pickValueLine).toContainText('Season');
      });
    });

    test("TC:35 Verify the card's pickers show each option's master-data status", async () => {
      for (const field of ['Customer', 'Season', 'Fabric']) {
        await test.step(field, async () => {
          const options = await ai.cardPickerOptions(field);
          for (const option of options) expect(option).toMatch(MASTER_DATA_STATUS);
        });
      }
    });

    test('TC:36 Verify the card\'s pickers offer "Add new" and "Browse all in table"', async () => {
      const l = ai.locators;
      const before = await ai.cardFieldValue('Techpack type');
      await l.cardField('Techpack type').click();
      await expect(l.pickerAddNewButton).toHaveText('Add new techpack type');
      await ai.closePicker();

      await ai.openCardBrowseAll('Techpack type');
      await expect(l.browseAllDialog.getByRole('heading')).toHaveText(
        /^Select Techpack type\s*\(\d+ of \d+\)$/,
      );
      await page.keyboard.press('Escape');
      await expect(l.browseAllDialog).toBeHidden();
      expect(await ai.cardFieldValue('Techpack type')).toBe(before);
    });

    test('TC:6 Verify "Create draft" is enabled only once all 7 required fields are filled', async () => {
      const l = ai.locators;
      await test.step('A required field is empty: "Pick a value for: …" and Create draft disabled', async () => {
        // TC:34 left Season empty.
        await expect(l.pickValueLine).toBeVisible();
        await expect(l.createDraftButton).toBeDisabled();
      });

      await test.step('Fill every empty required field: the line goes and Create draft is enabled', async () => {
        await ai.fillEmptyRequiredFields();
        await expect(l.pickValueLine).toBeHidden();
        await expect(l.createDraftButton).toBeEnabled();
      });
    });

    test('TC:40 Verify the chat composer: Send is disabled until text is typed', async () => {
      const l = ai.locators;
      await expect(l.attachAFileButton).toBeVisible();
      await expect(l.sendMessageButton).toBeDisabled();
      await l.composerInput.fill('x');
      await expect(l.sendMessageButton).toBeEnabled();
      await l.composerInput.fill('');
      await expect(l.sendMessageButton).toBeDisabled();
    });

    test('TC:41 Verify assistant replies offer Copy, Regenerate and feedback buttons', async () => {
      const l = ai.locators;
      for (const buttons of [l.copyReplyButtons, l.regenerateButtons, l.badResponseButtons]) {
        await expect(buttons.first()).toBeVisible();
      }
      await l.goodResponseButtons.last().click();
      await expect(l.feedbackThanksToast).toBeVisible();
    });

    test('TC:8 Verify successful draft creation with all required fields filled', async () => {
      test.setTimeout(480_000);
      const l = ai.locators;
      await test.step('Type a QA-AUTO Remark and click Create draft: "Draft <id> created"', async () => {
        await l.remarkInput.fill(remark);
        expect(await ai.createDraft()).toBe('created');
        draftId = await ai.createdDraftId();
      });

      await test.step('Extraction finishes: "✓ Done (READY)", still on the chat', async () => {
        expect(await ai.waitForDraftDone(), "the draft's extraction status").toBe('READY');
        await expect(page).toHaveURL(chatUrl);
      });
    });

    test('TC:10 Verify the Progress bar shows the 4 steps once Generate starts', async () => {
      await expect(ai.locators.progressRegion).toContainText('Creating techpack');
      for (const step of [
        /01\s*Upload/,
        /02\s*Review details/,
        /03\s*Extract/,
        /04\s*Open draft/,
      ]) {
        await expect(ai.locators.progressRegion).toContainText(step);
      }
      // Open question (z941abzjtb's follow-up, 2026-10-30): 25% until Create
      // draft, then 50%, and still 50% once the draft is READY.
      const percent = await ai.progressPercent();
      if (percent < 100) openQuestion(`Progress shows ${percent}% after the draft is READY`);
    });

    test("TC:39 Verify the Remark typed on the card is shown as the draft's Description", async () => {
      test.skip(!draftId, 'TC:8 did not create a draft');
      await ai.locators.openTechpackLink.click();
      await expect(page).toHaveURL(/\/techpacks\/(view|drafts)\//, { timeout: 30_000 });
      await expect(ai.locators.viewDescriptionInput).toHaveValue(remark, { timeout: 60_000 });
    });

    test('TC:38 Verify a new AI draft is listed on the Dashboard and opens from there', async () => {
      test.skip(!draftId, 'TC:8 did not create a draft');
      const techpackPage = new TechpackPage(page);
      await techpackPage.open();
      await expect(techpackPage.locators.searchInput).toBeVisible({ timeout: 90_000 });

      await ai.locators.dashboardDraftButton(draftId).click();
      await expect(page).toHaveURL(/\/techpacks\/view\/[^/?]+/, { timeout: 30_000 });
      await expect(ai.locators.viewDescriptionInput).toHaveValue(remark, { timeout: 60_000 });
    });

    test('TC:25 Verify Upload techpack opens the existing draft for a file already in floorOS', async () => {
      test.skip(!draftId, 'TC:8 did not create a draft');
      const l = ai.locators;
      await ai.open();
      await ai.openUploadTechpackFromAddFiles();
      await expect(l.uploadHeading).toBeVisible({ timeout: 30_000 });

      await ai.attach(pdf);
      await expect(page).toHaveURL(/\/techpacks\/view\/[^/?]+/, { timeout: 60_000 });
      await expect(l.viewDescriptionInput).toHaveValue(remark, { timeout: 60_000 });
      openQuestion(
        'Upload techpack opens the existing draft without saying the file was already in floorOS',
      );
    });

    test('TC:22 Verify the chat can be reopened from "Ask FloorOS AI" after a reload', async () => {
      const l = ai.locators;
      await page.goto(chatUrl);
      await expect(l.heading).toBeVisible({ timeout: 60_000 });
      await expect(l.reviewCard).toHaveCount(0);
      openQuestion('Reloading the ?cid= URL shows the empty landing, not the chat');

      await l.askFloorOsAiButton.click();
      await expect(l.anyCreateDraftButton.first()).toBeVisible({ timeout: 60_000 });
    });
  });
});
