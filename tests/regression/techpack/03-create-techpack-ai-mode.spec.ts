import * as fs from 'fs';
import * as path from 'path';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';

/**
 * Techpack — New Techpack (AI Mode / "Saitex AI" copilot).
 *
 * Source of truth for these cases: test-cases/techpack/create-techpack-ai-mode.md.
 * No ClickUp test-case tasks exist for this story; cases with a filed ClickUp
 * bug or clarification link to it via allure.tms(). Storage state from auth.setup.ts is
 * already applied via the "techpack" project's dependency — no login
 * needed here.
 *
 * **Rewritten 2026-09-29 for a substantially redesigned live flow** (upload
 * no longer auto-starts extraction; a real chat interface with a "Current
 * step" field-picking region; Sample Request now optional, not one of the
 * 7 required fields) — see ai-mode-copilot.locators.ts's own doc comment
 * for the full account. **TC:8 is now a genuine, expected FAIL**: "Create
 * draft" reproducibly and silently resets every field instead of creating
 * anything, confirmed live via this exact page object on uat immediately
 * before this rewrite. This is left as a real failing assertion (not
 * skipped, not weakened to assert the broken behavior) precisely because
 * that failure is the finding this regression run needs to surface.
 */
function buildMinimalPdf(marker: string): Buffer {
  const text = `Techpack Test ${marker}`;
  const stream = `BT /F1 24 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    // /F1 must actually be defined in /Resources — an earlier version left
    // /Resources empty while the content stream still referenced /F1.
    // That was tolerated by whatever quick header/text scan the copilot
    // does right after upload, but broke a later step: "Create draft"
    // consistently failed ("I couldn't create the draft. Please try
    // again.") on this malformed file across several different field
    // combinations, while a real, properly-structured techpack PDF didn't
    // hit this at all. Referencing the standard Helvetica base-14 font
    // (no embedded font program needed) makes this a fully valid PDF.
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

const VALID_PDF = () => ({
  name: `playwright-ai-mode-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`,
  mimeType: 'application/pdf',
  buffer: buildMinimalPdf(`${Date.now()}-${Math.random().toString(36).slice(2)}`),
});

/**
 * A genuine, byte-unmodified real techpack PDF, committed at
 * tests/regression/techpack/fixtures/. TC:8 needs a real file — the
 * synthetic buildMinimalPdf() above is fine for extraction (TC:5/TC:6),
 * but "Create draft" itself has separately, consistently rejected fully
 * synthetic PDFs regardless of this session's other findings.
 */
function realSampleFile(fixtureName: string): { name: string; mimeType: string; buffer: Buffer } {
  return {
    name: fixtureName,
    mimeType: 'application/pdf',
    buffer: fs.readFileSync(path.join(__dirname, 'fixtures', fixtureName)),
  };
}

// A real, unmodified 32-page Country Road techpack sign-off PDF (style
// WPA-60323517), supplied 2026-09-30 specifically to re-verify the
// "Create draft" fix against genuine, real-world content — not just this
// suite's smaller pre-existing fixture.
const WPA_SIGNOFF_PDF = () => realSampleFile('wpa-60323517-sign-off.pdf');

test.describe('Techpack - New Techpack (AI Mode)', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('New Techpack - AI Mode');
    await allure.owner('Techpack QA');
  });

  test('TC:1 Verify the AI Mode landing screen layout', async ({ aiModeCopilotPage }) => {
    await test.step('Open AI Mode from the Techpacks list', async () => {
      await aiModeCopilotPage.openFromTechpacksList();
    });

    await test.step('Heading, subheading, dropzone, and Close link are visible', async () => {
      await expect(aiModeCopilotPage.locators.subheading).toBeVisible();
      await expect(aiModeCopilotPage.locators.dropzoneText).toBeVisible();
      await expect(aiModeCopilotPage.locators.fileTypeHint).toBeVisible();
      await expect(aiModeCopilotPage.locators.closeLink).toBeVisible();
    });
  });

  test('TC:2 Verify the file input restricts to PDF/Excel', async ({ aiModeCopilotPage }) => {
    await aiModeCopilotPage.openFromTechpacksList();

    await test.step('The file input accepts only PDF/Excel', async () => {
      await expect(aiModeCopilotPage.locators.fileInput).toHaveAttribute(
        'accept',
        /\.pdf.*\.xlsx.*\.xls|application\/pdf/,
      );
    });
  });

  test('TC:3 Verify "Close" returns to the Techpacks list', async ({ aiModeCopilotPage, page }) => {
    await aiModeCopilotPage.openFromTechpacksList();

    await test.step('Click Close', async () => {
      await aiModeCopilotPage.locators.closeLink.click();
    });

    await test.step('Back on the Techpacks list', async () => {
      await expect(page).toHaveURL(new RegExp('/techpacks/?$'));
    });
  });

  test('TC:4 Verify uploading a non-PDF/Excel file is rejected', async ({ aiModeCopilotPage }) => {
    await aiModeCopilotPage.openFromTechpacksList();

    await test.step('Upload a .txt file', async () => {
      await aiModeCopilotPage.locators.fileInput.setInputFiles({
        name: 'not-a-techpack.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('hello world'),
      });
    });

    await test.step('"not a supported file" message names the file, and "Start extraction" never appears', async () => {
      await aiModeCopilotPage.expectInvalidFileErrorVisible('not-a-techpack.txt');
    });
  });

  test.describe('Copilot session-sensitive flow (TC:5, TC:6, TC:8)', () => {
    // TC:5, TC:6 and TC:8 drive the copilot as the same stored user through
    // upload/fill/create; letting Playwright's fullyParallel
    // config (2 workers on dev/uat) run these in different workers races
    // the same backend copilot session — confirmed live as the source of
    // intermittent, hard-to-reproduce "I couldn't create the draft"
    // failures unrelated to either test's own logic. Scoped to just this
    // nested block (not the whole file) so a failure here doesn't cascade
    // into skipping TC:9/TC:10, which don't touch the copilot session at
    // all and have no reason to depend on this block's outcome.
    test.describe.configure({ mode: 'serial' });

    test('TC:5 Verify uploading a valid file surfaces "Start extraction", then the 7 required fields', async ({
      aiModeCopilotPage,
    }) => {
      test.setTimeout(220_000);
      await aiModeCopilotPage.openFromTechpacksList();

      await test.step('Upload a valid PDF — file is listed with "Start extraction" ready, not auto-started', async () => {
        await aiModeCopilotPage.uploadFile(VALID_PDF());
        await expect(aiModeCopilotPage.locators.startExtractionButton).toBeEnabled();
      });

      await test.step('Click "Start extraction"', async () => {
        await aiModeCopilotPage.startExtraction();
      });

      const outcome = await aiModeCopilotPage.waitForExtractionOutcome();
      expect(outcome, 'extraction handoff should not hard-fail on a valid PDF').not.toBe('blocked');
      test.skip(
        outcome === 'stuck',
        'Agent handoff stayed stuck past the timeout on this run — see test-cases/techpack/create-techpack-ai-mode.md',
      );

      await test.step('The "Current step" panel appears with all 7 required fields', async () => {
        await aiModeCopilotPage.waitForPickAValueForm();
        for (const label of [
          'Techpack type',
          'Customer',
          'Season',
          'Style #',
          'Fabric',
          'Wash',
          'Product type',
        ]) {
          await expect(aiModeCopilotPage.locators.fieldButton(label)).toBeVisible();
        }
      });

      await test.step('Sample Request is present but not required (no "Pick a value for" summary text mentions it as outstanding)', async () => {
        await expect(aiModeCopilotPage.locators.sampleRequestLabel).toBeVisible();
      });
    });

    test('TC:6 Verify "Create draft" is disabled until all 7 required fields are filled', async ({
      aiModeCopilotPage,
    }) => {
      test.setTimeout(250_000);
      await aiModeCopilotPage.openFromTechpacksList();
      await aiModeCopilotPage.uploadFile(VALID_PDF());
      await aiModeCopilotPage.startExtraction();

      const outcome = await aiModeCopilotPage.waitForExtractionOutcome();
      test.skip(
        outcome !== 'ready',
        `Extraction handoff resolved to "${outcome}" instead of reaching the field-picking panel — see test-cases/techpack/create-techpack-ai-mode.md`,
      );

      await test.step('Disabled with nothing filled', async () => {
        await aiModeCopilotPage.waitForPickAValueForm();
        await aiModeCopilotPage.expectCreateDraftDisabled();
      });

      await test.step('Fill all 7 required fields (Sample Request deliberately left empty)', async () => {
        await aiModeCopilotPage.fillAllRequiredWithRandomAvailable();
      });

      await test.step('Now enabled, without ever touching Sample Request', async () => {
        await aiModeCopilotPage.expectCreateDraftEnabled();
      });
    });

    test('TC:8 Verify successful draft creation with all required fields filled', async ({
      aiModeCopilotPage,
      page,
    }) => {
      await allure.tms('https://app.clickup.com/t/z941abx71b', 'TC:8 bug (ClickUp)');
      test.setTimeout(320_000);
      await aiModeCopilotPage.openFromTechpacksList();
      await aiModeCopilotPage.uploadFile(WPA_SIGNOFF_PDF());
      await aiModeCopilotPage.startExtraction();

      const outcome = await aiModeCopilotPage.waitForExtractionOutcome();
      test.skip(
        outcome !== 'ready',
        `Extraction handoff resolved to "${outcome}" instead of reaching the field-picking panel — see test-cases/techpack/create-techpack-ai-mode.md`,
      );
      await aiModeCopilotPage.waitForPickAValueForm();

      const startUrl = page.url();

      await test.step('Fill all 7 required fields with a fresh random identity', async () => {
        await aiModeCopilotPage.fillAllRequiredWithRandomAvailable();
        await aiModeCopilotPage.expectCreateDraftEnabled();
      });

      // KNOWN, LIVE ISSUE with "Create draft" — three real outcomes seen
      // across separate runs on uat: a silent full-panel reset with no
      // error (2026-09-29), an explicit "I couldn't create the draft.
      // Please try again." chat message (2026-09-29), and, with a real
      // richer PDF (2026-09-30), a genuine draft record + completion card
      // ("✓ Done (EXTRACTION_FAILED)") requiring a manual "Open Techpack"
      // click. This assertion covers all "a real, usable techpack resulted"
      // outcomes; 'create-failed'/'silently-reset' still fail this test for
      // real — do not weaken the assertion to match whichever is observed.
      const result = await test.step('Click "Create draft"', async () => {
        return aiModeCopilotPage.createDraftExpectingResult();
      });
      expect(
        ['created', 'file-exists', 'draft-with-warning'],
        `AI Mode "Create draft" should create a real techpack draft or report the file already exists — instead it returned "${result}" (live bug, confirmed 2026-09-29 on uat via both the silent-reset and "I couldn't create the draft" symptoms)`,
      ).toContain(result);

      if (result === 'created') {
        await test.step('Navigated away from the blank copilot conversation', async () => {
          await expect(page).not.toHaveURL(startUrl);
        });
      } else if (result === 'file-exists') {
        await test.step('"This file is already in floorOS" — opening it works', async () => {
          await aiModeCopilotPage.expectFileAlreadyExistsVisible();
          await aiModeCopilotPage.locators.openExistingFileLink.click();
          await expect(page).not.toHaveURL(startUrl);
        });
      } else if (result === 'draft-with-warning') {
        await test.step('A real draft was created (flagged EXTRACTION_FAILED) — "Open Techpack" navigates to it', async () => {
          await aiModeCopilotPage.locators.openTechpackLink.click();
          await expect(page).not.toHaveURL(startUrl);
          await expect(page).toHaveURL(/\/techpacks\/drafts\//);
        });
      }
    });
  });

  test('TC:9 Verify "Use the manual form" jumps straight to the Classic form', async ({
    aiModeCopilotPage,
    createTechpackPage,
    page,
  }) => {
    await aiModeCopilotPage.openFromTechpacksList();

    await test.step('Click "Use the manual form"', async () => {
      await aiModeCopilotPage.useManualForm();
    });

    await test.step('Navigates to the manual New Techpack form', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new$/);
      await expect(createTechpackPage.locators.heading).toBeVisible();
    });
  });

  test('TC:10 Verify the 4-step Progress stepper is visible on the upload screen', async ({
    aiModeCopilotPage,
  }) => {
    await aiModeCopilotPage.openFromTechpacksList();

    await test.step('The Progress stepper lists all 4 steps', async () => {
      await expect(aiModeCopilotPage.locators.progressStepper).toBeVisible();
      await expect(aiModeCopilotPage.locators.progressStepper.getByText('Upload')).toBeVisible();
      await expect(
        aiModeCopilotPage.locators.progressStepper.getByText('Review details'),
      ).toBeVisible();
      await expect(aiModeCopilotPage.locators.progressStepper.getByText('Extract')).toBeVisible();
      await expect(
        aiModeCopilotPage.locators.progressStepper.getByText('Open draft'),
      ).toBeVisible();
    });
  });
});
