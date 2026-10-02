import * as fs from 'fs';
import * as path from 'path';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';

/**
 * Techpack — New Techpack (Classic manual form).
 *
 * Source of truth for these cases: test-cases/techpack/create-techpack-classic.md.
 * No ClickUp test-case tasks exist for this story; cases with a filed ClickUp
 * bug or clarification link to it via allure.tms(). Storage state from auth.setup.ts is
 * already applied via the "techpack" project's dependency — no login
 * needed here. Verified against dev.flooros.app — see this file's test-case
 * doc for why (local blocks the happy path on unseeded Season data).
 */
const DUMMY_PDF = {
  name: `playwright-techpack-${Date.now()}.pdf`,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
};

/**
 * A genuine, byte-unmodified real techpack PDF, committed at
 * tests/regression/techpack/fixtures/. Used (not the synthetic DUMMY_PDF
 * above) for TC:9 to match how the bug was originally reproduced live.
 * `sample-techpack.pdf` is safe to reuse here: this Classic-form create
 * flow has no file-content dedup check (that's an AI-Mode-only behavior,
 * see create-techpack-ai-mode.md's notes), and it is already reused this way,
 * repeatedly and successfully, by 04-canvas-review.spec.ts and
 * 05-multi-user-presence.spec.ts's own beforeEach/setup blocks.
 */
const SAMPLE_TECHPACK_PDF = () => ({
  name: 'sample-techpack.pdf',
  mimeType: 'application/pdf',
  buffer: fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-techpack.pdf')),
});

test.describe('Techpack - New Techpack (Classic)', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('New Techpack - Classic');
    await allure.owner('Techpack QA');
  });

  test('TC:1 Verify navigation and layout of the Classic New Techpack form', async ({
    createTechpackPage,
  }) => {
    await test.step('Open the Classic form from the Techpacks list', async () => {
      await createTechpackPage.openFromTechpacksList();
    });

    await test.step('All five sections are visible', async () => {
      await createTechpackPage.expectFormSectionsVisible();
    });
  });

  test('TC:2 Verify "Create techpack" is disabled until all mandatory fields are filled', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    await test.step('Nothing filled in yet', async () => {
      await createTechpackPage.expectCreateDisabled();
      const { filled, total } = await createTechpackPage.fieldsFilledCount();
      expect(filled).toBe(0);
      expect(total).toBe(7);
    });
  });

  test('TC:3 Verify each required field selection increments the fields-filled counter', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    await test.step('Pick a Techpack Type', async () => {
      await createTechpackPage.selectFirstAvailableOption('Techpack Type*');
    });

    await test.step('Counter reads 1 of 7', async () => {
      const { filled, total } = await createTechpackPage.fieldsFilledCount();
      expect(filled).toBe(1);
      expect(total).toBe(7);
    });

    await test.step('Pick a Style too', async () => {
      await createTechpackPage.selectFirstAvailableOption('Style*');
    });

    await test.step('Counter reads 2 of 7', async () => {
      const { filled } = await createTechpackPage.fieldsFilledCount();
      expect(filled).toBe(2);
    });
  });

  test('TC:4 Verify the techpack document upload only accepts PDF', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    await test.step('The techpack file input is restricted to PDF', async () => {
      await expect(createTechpackPage.locators.techpackFileInput).toHaveAttribute(
        'accept',
        /application\/pdf|\.pdf/,
      );
    });

    await test.step('Uploading a PDF is accepted (file name reflected in the dropzone)', async () => {
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      await expect(createTechpackPage.locators.text(DUMMY_PDF.name)).toBeVisible();
    });
  });

  test('TC:5 Verify the Operations table lists the four default service rows', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    await test.step('EMBROIDRY, PRINTING, EMBOSSING, WASHTYPE rows are present', async () => {
      for (const service of ['EMBROIDRY', 'PRINTING', 'EMBOSSING', 'WASHTYPE']) {
        await expect(
          createTechpackPage.locators.operationsTable.getByRole('row', {
            name: new RegExp(service),
          }),
        ).toBeVisible();
      }
    });

    await test.step('WASHTYPE\'s "Active" checkbox is locked on', async () => {
      const washtypeRow = createTechpackPage.locators.operationsTable.getByRole('row', {
        name: /WASHTYPE/,
      });
      const activeCheckbox = washtypeRow.getByRole('checkbox', { name: 'Active' });
      await expect(activeCheckbox).toBeChecked();
      await expect(activeCheckbox).toBeDisabled();
    });
  });

  test('TC:6 Verify Cancel discards the draft and returns to the Techpacks list', async ({
    createTechpackPage,
    page,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    await test.step('Fill something in, then Cancel', async () => {
      await createTechpackPage.selectFirstAvailableOption('Techpack Type*');
      await createTechpackPage.cancel();
    });

    await test.step('Back on the Techpacks list', async () => {
      await expect(page).toHaveURL(new RegExp('/techpacks/?$'));
    });
  });

  test('TC:7 Verify successful creation with all required fields and a techpack document', async ({
    createTechpackPage,
    page,
  }) => {
    test.setTimeout(120000);
    await createTechpackPage.openFromTechpacksList();

    await test.step('Fill every required field with a random available option', async () => {
      // Random, not "first available" — Customer/Season/Style/Fabric/Wash
      // together are a real uniqueness key server-side (see
      // create-techpack.page.ts's doc comment), so always picking the
      // same "first" option collides with whatever a previous run
      // already created.
      await createTechpackPage.fillAllRequiredWithRandomAvailable();
    });

    await test.step('Upload the required techpack document', async () => {
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
    });

    await test.step('All 7 fields filled and Create techpack is enabled', async () => {
      const { filled, total } = await createTechpackPage.fieldsFilledCount();
      expect(filled).toBe(total);
      await createTechpackPage.expectCreateEnabled();
    });

    await test.step('Submit (retrying with a fresh identity on a collision with an existing techpack)', async () => {
      let result = await createTechpackPage.createExpectingResult();
      for (let i = 0; result === 'duplicate' && i < 3; i++) {
        await page.keyboard.press('Escape');
        await createTechpackPage.fillAllRequiredWithRandomAvailable();
        result = await createTechpackPage.createExpectingResult();
      }
      expect(result).toBe('created');
    });

    await test.step('The techpack is created successfully', async () => {
      await createTechpackPage.expectCreatedSuccessfully();
    });
  });

  test('TC:8 Verify the duplicate-identity "Techpack already exists" modal', async ({
    createTechpackPage,
    canvasPage,
  }) => {
    // This test does two full create attempts, each of which can itself
    // retry several times (a random Customer with 0 Seasons, or dev's
    // known invalid Techpack Type value — see create() 's doc comment).
    // 180s wasn't always enough on a run where step 1 needed several
    // retries; 300s gives real headroom for a worst-case combination.
    test.setTimeout(300000);

    const identity = await test.step('Create a techpack with a random identity', async () => {
      await createTechpackPage.openFromTechpacksList();
      const picked = await createTechpackPage.fillAllRequiredWithRandomAvailable();
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      const result = await createTechpackPage.createExpectingResult();
      // On the rare chance this random identity already existed, that IS
      // the case this test wants — just reuse the picked identity as-is
      // rather than creating a new one.
      if (result === 'created') {
        await createTechpackPage.expectCreatedSuccessfully();
      }
      return picked;
    });

    // Each picked value is the option's full multi-line innerText (e.g.
    // "SS002\nSS002\nSS002\nApproved") — its accessible name collapses
    // those newlines to spaces, so re-matching on the raw string isn't
    // reliable as-is.
    //
    // An earlier version of this matched on just the *first line* only,
    // anchored to the start of the name (to dodge a substring collision:
    // dev's shared data has codes like "ASFAFS" that contain a shorter
    // code like "AFS" as a substring). That itself turned out unsafe a
    // different way, confirmed live on uat 2026-09-28: `innerText`'s line
    // breaks reflect the option's own *visual* wrapping, not necessarily
    // its semantic structure — a single two-word code ("PHOTO SHOOT")
    // can render its two words on separate visual lines, making
    // `value.split('\n')[0]` capture just "PHOTO" instead of the full
    // code. Anchored to "start of name" alone, that fragment then
    // matched *two* genuinely different real options that both happen to
    // start with "PHOTO" (a real strict-mode "resolved to 2 elements"
    // failure, not a flake).
    //
    // Fixed by normalizing the *entire* captured value (collapse every
    // run of whitespace, including embedded newlines, to one space —
    // matching how the accessible name itself is computed) and anchoring
    // to the full string (`^...$`), not just its first line/token. Two
    // genuinely different options being identical across their *entire*
    // multi-field text is not a realistic collision the way a shared
    // leading word is.
    const fullValuePattern = (value: string | undefined) => {
      if (!value) throw new Error('Expected a picked identity value to be present');
      const normalized = value.replace(/\s+/g, ' ').trim();
      const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`^${escaped}$`);
    };

    await test.step('Attempt to create the exact same identity again', async () => {
      await createTechpackPage.openFromTechpacksList();
      await createTechpackPage.fillDetails({
        techpackType: fullValuePattern(identity['Techpack Type*']),
        style: fullValuePattern(identity['Style*']),
        customer: fullValuePattern(identity['Customer*']),
        fabric: fullValuePattern(identity['Fabric*']),
        season: fullValuePattern(identity['Season*']),
        wash: fullValuePattern(identity['Wash*']),
        productType: fullValuePattern(identity['Product Type*']),
      });
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      await createTechpackPage.create();
    });

    await test.step('"Techpack already exists" modal appears, naming the identity fields', async () => {
      await createTechpackPage.expectDuplicateModalVisible();
      await expect(createTechpackPage.locators.duplicateExistsModal).toContainText(
        /Customer, Season, Style, Fabric and Wash/,
      );
      const existingCode = await createTechpackPage.duplicateModalExistingCode();
      expect(existingCode).toMatch(/^TP\d+-\d+$/);
    });

    await test.step('The modal explains branching a new revision needs the existing one approved first', async () => {
      // Corrected 2026-09-28: confirmed live on uat the modal no longer
      // shows a separate disabled "Create new revision" button here —
      // it's replaced by this informational line and a single "Open"
      // action. If a "Create new revision" button ever does render
      // (e.g. once the existing revision is Approved), it should still
      // be disabled in this specific Draft/unapproved case — check
      // conditionally rather than assuming either way.
      await expect(
        createTechpackPage.locators.duplicateExistsModal.getByText(
          /before branching a new revision/i,
        ),
      ).toBeVisible();
      if (await createTechpackPage.locators.createNewRevisionButton.count()) {
        await expect(createTechpackPage.locators.createNewRevisionButton).toBeDisabled();
      }
    });

    await test.step('"Open" opens the existing techpack successfully', async () => {
      await createTechpackPage.locators.openExistingButton.click();
      // The canvas bundle + PDF can take well over the default 15s to settle on uat/dev.
      await expect(canvasPage.locators.loadErrorText).toBeHidden({ timeout: 30000 });
      await expect(canvasPage.locators.openingCanvasText).toBeHidden({ timeout: 30000 });
    });
  });

  test('TC:9 Verify the "Add new value" dialog on a required combobox enforces the same length limit the server does', async ({
    createTechpackPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxb20', 'TC:9 bug (ClickUp)');
    // Confirmed bug, ClickUp z941abxb20 (see test-case doc's own notes):
    // the "Add techpack type" dialog has no client-side length check, so
    // this flow can run all the way to filling the remaining 6 fields,
    // uploading a real PDF, and clicking "Create techpack" — budgeted
    // generously like TC:7/TC:8 do for that same shape of flow.
    test.setTimeout(180_000);
    await createTechpackPage.openFromTechpacksList();

    // Never saved — probed and dismissed — so each run leaves no new invalid
    // master data behind (earlier runs of this test each did; see
    // probeAddNewValueDialog()).
    const longCode = `PWTC9${Date.now()}`.padEnd(25, 'X').slice(0, 25);
    // A 25-char value already saved to uat's master data by the original
    // 2026-09-29 repro of this bug — reused for the server-side half.
    const EXISTING_INVALID_CODE = 'PWTEST0928LOWERCASE25ABCX';

    await test.step('Search the Techpack Type combobox for a code that does not exist', async () => {
      await createTechpackPage.searchComboboxForNewValue('Techpack Type*', longCode);
      await expect(createTechpackPage.locators.noTechpackTypesMatchText).toBeVisible({
        timeout: 10_000,
      });
      await expect(createTechpackPage.locators.addNewValueButton).toBeVisible();
    });

    const dialogOutcome =
      await test.step('Fill a 25-character Code/Name in "Add new value" and check the dialog stops it (not saved)', async () =>
        createTechpackPage.probeAddNewValueDialog(longCode, `PW TC9 ${Date.now()}`));

    const createOutcome =
      await test.step(`Select the existing over-length value "${EXISTING_INVALID_CODE}", fill the other 6 fields, upload a PDF, and Create`, async () => {
        await page.keyboard.press('Escape');
        const exists = await createTechpackPage.selectExistingValue(
          'Techpack Type*',
          EXISTING_INVALID_CODE,
        );
        test.skip(
          !exists,
          `"${EXISTING_INVALID_CODE}" is no longer in uat master data — server-side half can't be checked`,
        );
        await createTechpackPage.fillAllRequiredWithRandomAvailable(['Techpack Type*']);
        await createTechpackPage.uploadTechpackFile(SAMPLE_TECHPACK_PDF());
        return createTechpackPage.createOnceExpectingResult();
      });

    if (createOutcome === 'raw-json-error') {
      await test.step('Document the raw AJV/JSON-Schema error toast (the confirmed downstream impact)', async () => {
        await expect(createTechpackPage.locators.rawJsonErrorToast).toContainText(/maxLength/);
      });
    }

    expect
      .soft(
        createOutcome,
        `Create with an over-length Techpack Type should show a human-readable error, not a raw ` +
          `AJV/JSON-Schema toast (ClickUp z941abxb20). Real outcome: "${createOutcome}".`,
      )
      .not.toBe('raw-json-error');
    expect(
      dialogOutcome,
      `"Add techpack type" should reject or truncate a code over the server's 20-character limit ` +
        `before it can be saved (ClickUp z941abxb20: https://app.clickup.com/t/z941abxb20). Instead ` +
        `it kept the full ${longCode.length}-character code with Add enabled and no validation error.`,
    ).toBe('blocked');
  });
});
