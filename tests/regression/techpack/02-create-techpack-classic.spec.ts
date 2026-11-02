import * as fs from 'fs';
import * as path from 'path';
import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';
import { knownBug } from '../../../src/utils/test-annotations';

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
const QA_AUTO_DESCRIPTION =
  'QA-AUTO — Techpack regression test data (pw-hybrid-framework). Safe to delete.';
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
const fullValuePattern = (value: string | undefined): RegExp => {
  if (!value) throw new Error('Expected a picked identity value to be present');
  const normalized = value.replace(/\s+/g, ' ').trim();
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Since the 2026-10-22 redesign the form restores unsaved input on
  // return, and an option that's already chosen is named "… Selected".
  return new RegExp(`^${escaped}( Selected)?$`);
};

/** An option's code: options read "name\ncode\nname\nstatus" since the 2026-10-22 redesign. */
const optionCode = (option: string): string =>
  option.split('\n').map((l) => l.trim())[1] ?? option.trim();

/** The last line of every master-data option (Classic TC:27): the statuses seen on uat and dev, 2026-10-30. */
const MASTER_DATA_STATUS = /^(Approved|Draft|Rejected)$/;

/** Style / Fabric / Wash / Product Type "Add new value" Code limit (Classic TC:31). */
const TECHPACK_ATTRIBUTE_CODE_MAX = 20;

/** Records every non-GET API call the page makes from now on, for cases that must save nothing. */
const watchWrites = (page: Page): string[] => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' && /\/(api|md-api)\//.test(r.url())) {
      writes.push(`${r.method()} ${r.url()}`);
    }
  });
  return writes;
};

test.describe('Techpack - New Techpack (Classic)', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('New Techpack - Classic');
    await allure.owner('Techpack QA');
  });

  test('TC:1 Verify navigation and layout of the Classic New Techpack form', async ({
    techpackPage,
    aiModeCopilotPage,
    createTechpackPage,
    page,
  }) => {
    await test.step('Dashboard › Create New › Add files › More tools › Manual form', async () => {
      // Since the 2026-10-22 redesign the Dashboard has no "New Techpack ›
      // Classic" menu; "Create New" opens AI Mode, which links to the form.
      await techpackPage.open();
      await techpackPage.expectLoaded();
      await techpackPage.clickCreateNew();
      await expect(aiModeCopilotPage.locators.heading).toBeVisible({ timeout: 30_000 });
      await aiModeCopilotPage.openManualFormFromAddFiles();
    });

    await test.step('The form opens with its heading, Back link, Close and five sections', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new$/);
      await expect(createTechpackPage.locators.heading).toBeVisible({ timeout: 30_000 });
      await expect(createTechpackPage.locators.backToTechpacksLink).toBeVisible();
      await expect(createTechpackPage.locators.closeButton).toBeVisible();
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
    techpackPage,
    createTechpackPage,
    canvasPage,
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
      await createTechpackPage.fillDetails({ description: QA_AUTO_DESCRIPTION });
    });

    await test.step('Upload the required techpack document', async () => {
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
    });

    await test.step('All 7 fields filled, "Ready to create", and Create techpack is enabled', async () => {
      const { filled, total } = await createTechpackPage.fieldsFilledCount();
      expect(filled).toBe(total);
      await expect(createTechpackPage.locators.readyToCreateText).toBeVisible();
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

    const code =
      await test.step('It opens the techpack view: h1 = the new code, with a "created" toast', async () => {
        await createTechpackPage.expectCreatedSuccessfully();
        await expect(page).toHaveURL(/\/techpacks\/view\/[^/]+$/);
        const created = await createTechpackPage.currentTechpackCode();
        expect(created).toMatch(/^TP\d{6}-\d{6}$/);
        await expect(techpackPage.locators.techpackHeading(created)).toBeVisible();
        await expect(createTechpackPage.locators.createdToast).toContainText(
          `Techpack ${created} created`,
        );
        return created;
      });

    // Open because every picked value is Approved master data (the random
    // picks prefer Approved values); one Draft value would leave it Draft
    // with "Move to Open — Pending approval: <field>".
    await test.step(`${code} is Open, not Draft (its canvas Details)`, async () => {
      await canvasPage.gotoCanvasById(createTechpackPage.currentTechpackId());
      await canvasPage.expectLoaded();
      expect(await canvasPage.fieldRowText('Status')).toContain('Open');
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
      await createTechpackPage.fillDetails({ description: QA_AUTO_DESCRIPTION });
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
    knownBug('z941abxb20');
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

  // ---------------------------------------------------------------------------
  // TC:22-41, added 2026-10-30 (see the test-case doc). TC:22-34 never save
  // anything; TC:35-41 create QA-AUTO techpacks.
  // ---------------------------------------------------------------------------

  test('TC:22 Verify "Create techpack" stays disabled with all 7 fields but no techpack PDF', async ({
    createTechpackPage,
  }) => {
    test.setTimeout(120_000);
    await createTechpackPage.openFromTechpacksList();

    await test.step('All 7 fields, no PDF: "7 of 7 fields filled · techpack document needed", Create disabled', async () => {
      await createTechpackPage.fillAllRequiredWithRandomAvailable();
      expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 7, total: 7 });
      await expect(createTechpackPage.locators.techpackDocumentNeededText).toBeVisible();
      await createTechpackPage.expectCreateDisabled();
    });

    await test.step('With the PDF: "Ready to create", Create enabled', async () => {
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      await expect(createTechpackPage.locators.readyToCreateText).toBeVisible();
      await createTechpackPage.expectCreateEnabled();
    });
  });

  test('TC:23 Verify removing the techpack PDF disables "Create techpack" again', async ({
    createTechpackPage,
  }) => {
    test.setTimeout(120_000);
    await createTechpackPage.openFromTechpacksList();
    await createTechpackPage.fillAllRequiredWithRandomAvailable();
    await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
    await expect(createTechpackPage.locators.readyToCreateText).toBeVisible();

    await test.step(`Remove ${DUMMY_PDF.name}`, async () => {
      await createTechpackPage.removeAttachedFile(DUMMY_PDF.name);
    });

    await test.step('The file is gone, "techpack document needed" is back and Create is disabled', async () => {
      await expect(createTechpackPage.locators.removeFileButton(DUMMY_PDF.name)).toBeHidden();
      await expect(createTechpackPage.locators.techpackDocumentNeededText).toBeVisible();
      await createTechpackPage.expectCreateDisabled();
    });
  });

  test('TC:24 Verify the techpack file takes exactly one PDF', async ({ createTechpackPage }) => {
    await createTechpackPage.openFromTechpacksList();
    const first = { ...DUMMY_PDF, name: `playwright-techpack-first-${Date.now()}.pdf` };
    const second = { ...DUMMY_PDF, name: `playwright-techpack-second-${Date.now()}.pdf` };

    await test.step('Attach one PDF, then a second one', async () => {
      await createTechpackPage.uploadTechpackFile(first);
      await expect(createTechpackPage.locators.removeFileButton(first.name)).toBeVisible();
      await createTechpackPage.uploadTechpackFile(second);
    });

    await test.step('Only the second is listed: it replaced the first', async () => {
      await expect(createTechpackPage.locators.removeFileButton(second.name)).toBeVisible();
      await expect(createTechpackPage.locators.removeFileButton(first.name)).toBeHidden();
    });
  });

  test('TC:25 Verify Sample Request is optional and does not move the fields-filled counter', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();
    test.skip(
      await createTechpackPage.comboboxHasNoOptions('Sample Request'),
      'No Sample Requests on this environment to pick from',
    );

    const picked = await test.step('Pick a Sample Request', async () =>
      createTechpackPage.selectFirstAvailableOption('Sample Request'));

    await test.step('The field shows it; the footer still reads "0 of 7 fields filled"', async () => {
      // The option reads "<name> <code> <name>"; the field shows "<code> <name>".
      expect(await createTechpackPage.fieldValue('Sample Request')).toContain(optionCode(picked));
      expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 0, total: 7 });
      await createTechpackPage.expectCreateDisabled();
    });
  });

  test('TC:26 Verify changing the Customer clears a Season that belongs to the old customer', async ({
    createTechpackPage,
  }) => {
    test.setTimeout(120_000);
    await createTechpackPage.openFromTechpacksList();

    const firstSeason = await test.step('Pick a Customer and one of its Seasons', async () => {
      await createTechpackPage.fillAllRequiredWithRandomAvailable([
        'Techpack Type*',
        'Style*',
        'Fabric*',
        'Wash*',
        'Product Type*',
      ]);
      expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 2, total: 7 });
      return createTechpackPage.fieldValue('Season*');
    });

    await test.step('Pick a different Customer', async () => {
      const firstCustomer = await createTechpackPage.fieldValue('Customer*');
      for (let i = 0; i < 5; i++) {
        await createTechpackPage.selectRandomAvailableOption('Customer*');
        if ((await createTechpackPage.fieldValue('Customer*')) !== firstCustomer) break;
      }
      expect(await createTechpackPage.fieldValue('Customer*')).not.toBe(firstCustomer);
    });

    await test.step('The old Season is cleared, unless it also belongs to the new customer', async () => {
      const season = await createTechpackPage.fieldValue('Season*');
      const newCustomerSeasons = (await createTechpackPage.pickerOptionTexts('Season*')).map((o) =>
        o.replace(/\s+/g, ' '),
      );
      if (season === firstSeason) {
        expect(newCustomerSeasons.some((o) => o.includes(firstSeason))).toBe(true);
      } else {
        expect(season).toBe('Search seasons...');
        expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 1, total: 7 });
      }
    });
  });

  test("TC:27 Verify picker options show each value's master-data status", async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();
    for (const label of [
      'Techpack Type*',
      'Style*',
      'Customer*',
      'Fabric*',
      'Wash*',
      'Product Type*',
    ]) {
      await test.step(`${label}: every option ends with its status`, async () => {
        const options = await createTechpackPage.pickerOptionTexts(label);
        expect(options.length).toBeGreaterThan(0);
        for (const option of options) {
          const status = option
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .pop();
          expect(status, `option "${option.replace(/\s+/g, ' ')}"`).toMatch(MASTER_DATA_STATUS);
        }
      });
    }
  });

  test('TC:28 Verify picking a row in "Browse all in table" fills the field', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    const styleId =
      await test.step('Style › Browse all in table › search a style id › click its row', async () =>
        createTechpackPage.pickFromBrowseAll('Style*', 'Item Attribute Value ID'));

    await test.step('Style shows it and the counter reads 1 of 7', async () => {
      expect(await createTechpackPage.fieldValue('Style*')).toContain(styleId);
      expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 1, total: 7 });
    });
  });

  test('TC:29 Verify a picker can be driven with the keyboard', async ({ createTechpackPage }) => {
    await createTechpackPage.openFromTechpacksList();

    const options = await test.step('Techpack Type: Arrow Down twice, then Enter', async () =>
      createTechpackPage.pickWithKeyboard('Techpack Type*', 2));

    await test.step('The third option is picked and the counter reads 1 of 7', async () => {
      // The first option starts highlighted.
      expect(await createTechpackPage.fieldValue('Techpack Type*')).toContain(
        optionCode(options[2]!),
      );
      expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 1, total: 7 });
    });
  });

  test('TC:30 Verify "Add new value" is offered on the right pickers only', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();
    for (const label of [
      'Techpack Type*',
      'Style*',
      'Customer*',
      'Fabric*',
      'Wash*',
      'Product Type*',
    ]) {
      await test.step(`${label}: "Add new value" and "Browse all in table"`, async () => {
        expect(await createTechpackPage.pickerOffersAddNewValue(label)).toBe(true);
      });
    }
    for (const label of ['Season*', 'Sample Request']) {
      await test.step(`${label}: only "Browse all in table"`, async () => {
        expect(await createTechpackPage.pickerOffersAddNewValue(label)).toBe(false);
      });
    }
  });

  test('TC:31 Verify the Style, Fabric, Wash and Product Type "Add new value" dialogs cap the code at 20 characters', async ({
    createTechpackPage,
    page,
  }) => {
    await createTechpackPage.openFromTechpacksList();
    const writes = watchWrites(page);
    const code25 = `PWTC31${Date.now()}`.padEnd(25, 'X').slice(0, 25);
    const dialogs: [string, string][] = [
      ['Style*', 'Add style'],
      ['Fabric*', 'Add fabric'],
      ['Wash*', 'Add wash'],
      ['Product Type*', 'Add product type'],
    ];
    for (const [label, title] of dialogs) {
      await test.step(`"${title}": a 25-character code is cut to 20 (then Cancel)`, async () => {
        expect(await createTechpackPage.addNewValueCodeKeptLength(label, title, code25)).toBe(
          TECHPACK_ATTRIBUTE_CODE_MAX,
        );
      });
    }
    await test.step('Nothing was saved', async () => {
      expect(writes).toEqual([]);
    });
  });

  test('TC:32 Verify "Add new value" needs both Code and Name, and Cancel adds nothing', async ({
    createTechpackPage,
    page,
  }) => {
    await createTechpackPage.openFromTechpacksList();
    const writes = watchWrites(page);

    await test.step('"Add techpack type": Add is enabled only with both Code and Name; then Cancel', async () => {
      await createTechpackPage.expectAddTechpackTypeNeedsCodeAndName('PWTC32', 'PW TC32 name');
    });

    await test.step('The field is unchanged and nothing was saved', async () => {
      expect(await createTechpackPage.fieldValue('Techpack Type*')).toBe(
        'Search techpack types...',
      );
      expect(writes).toEqual([]);
    });
  });

  test('TC:33 Verify an Operations "Value" refuses non-numeric text', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();

    await test.step('Typing "abc" into EMBROIDRY\'s Value keeps nothing', async () => {
      expect(await createTechpackPage.typeOperationValue('EMBROIDRY', 'abc')).toBe('');
    });

    await test.step('Typing "12.5" keeps it', async () => {
      expect(await createTechpackPage.typeOperationValue('EMBROIDRY', '12.5')).toBe('12.5');
    });
  });

  test('TC:34 Verify the Description box takes a long text in full', async ({
    createTechpackPage,
  }) => {
    await createTechpackPage.openFromTechpacksList();
    const long = `${QA_AUTO_DESCRIPTION} `.padEnd(5000, 'x');

    await test.step('Paste 5,000 characters into Description: all of them stay', async () => {
      await createTechpackPage.fillDetails({ description: long });
      await expect(createTechpackPage.locators.descriptionTextarea).toHaveValue(long);
    });
  });

  // TC:35-39 and TC:41 share one techpack, created in TC:35: TC:38/39 reuse
  // its identity with one field changed, TC:41 copies it.
  test.describe('Create flow (TC:35-TC:41)', () => {
    test.describe.configure({ mode: 'serial' });
    let created: { code: string; id: string; identity: Record<string, string> } | undefined;
    const OPERATION = { active: true, description: 'QA-AUTO op embroidery', value: '2' };

    test('TC:35 Verify Description, Sample Request and Operations are saved on the created techpack', async ({
      createTechpackPage,
      canvasPage,
    }) => {
      test.setTimeout(240_000);
      await createTechpackPage.openFromTechpacksList();

      const sampleRequest =
        await test.step('Fill all 7 fields, a Sample Request, Description and EMBROIDRY', async () => {
          const identity = await createTechpackPage.fillAllRequiredWithRandomAvailable();
          const sr = (await createTechpackPage.comboboxHasNoOptions('Sample Request'))
            ? undefined
            : await createTechpackPage.selectFirstAvailableOption('Sample Request');
          await createTechpackPage.fillDetails({ description: QA_AUTO_DESCRIPTION });
          await createTechpackPage.setOperation('EMBROIDRY', OPERATION);
          await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
          created = { code: '', id: '', identity };
          return sr;
        });

      await test.step('Create: 201 and "Techpack <code> created"', async () => {
        let { status, body } = await createTechpackPage.createAndReadResponse();
        // A random identity can, rarely, already exist: re-pick and retry.
        for (let i = 0; status === 409 && i < 3; i++) {
          await createTechpackPage.closePicker();
          created!.identity = await createTechpackPage.fillAllRequiredWithRandomAvailable();
          ({ status, body } = await createTechpackPage.createAndReadResponse());
        }
        expect(status).toBe(201);
        await createTechpackPage.expectCreatedSuccessfully();
        created!.code = String(body['techpackCode']);
        created!.id = createTechpackPage.currentTechpackId();
        await expect(createTechpackPage.locators.createdToast).toContainText(
          `Techpack ${created!.code} created`,
        );
      });

      const saved = await test.step('The canvas loads the saved techpack', async () => {
        const techpack = await canvasPage.gotoCanvasByIdAndReadTechpack(created!.id);
        await canvasPage.expectLoaded();
        return techpack;
      });

      await test.step('Description: saved and shown on the canvas', async () => {
        expect(saved['remark']).toBe(QA_AUTO_DESCRIPTION);
        await expect(canvasPage.locators.detailsDescriptionInput).toHaveValue(QA_AUTO_DESCRIPTION);
      });

      // Not test.skip(): that would also skip the Operations check below.
      if (sampleRequest) {
        await test.step('Sample Request: saved', async () => {
          expect(saved['sampleRequestId']).toBe(optionCode(sampleRequest));
        });
      }

      await test.step('EMBROIDRY: Active, its Description and Value 2 — saved and shown', async () => {
        const details = saved['details'] as Record<string, unknown>[];
        expect(details.find((d) => d['productServiceId'] === 'EMBROIDRY')).toMatchObject({
          activeFlag: true,
          value: OPERATION.value,
          remarks: OPERATION.description,
        });
        expect(await canvasPage.operationValues('EMBROIDRY')).toEqual({
          active: true,
          value: OPERATION.value,
          description: OPERATION.description,
        });
      });
    });

    test('TC:36 Verify the form starts clean after a successful create', async ({
      createTechpackPage,
    }) => {
      test.setTimeout(180_000);
      // The form autosaves to the browser, so this needs a create in its own
      // browser context; a new test's context always starts empty.
      await createTechpackPage.openFromTechpacksList();

      await test.step('Create a QA-AUTO techpack', async () => {
        await createTechpackPage.fillAllRequiredWithRandomAvailable();
        await createTechpackPage.fillDetails({ description: QA_AUTO_DESCRIPTION });
        await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
        await createTechpackPage.waitForAutosave();
        expect((await createTechpackPage.createAndReadResponse()).status).toBe(201);
        await createTechpackPage.expectCreatedSuccessfully();
      });

      await test.step('Open the form again: empty, no "Discard changes", no file', async () => {
        await createTechpackPage.openFromTechpacksList();
        expect(await createTechpackPage.fieldsFilledCount()).toEqual({ filled: 0, total: 7 });
        await expect(createTechpackPage.locators.techpackDocumentNeededText).toBeVisible();
        await expect(createTechpackPage.locators.discardChangesButton).toBeHidden();
        await expect(createTechpackPage.locators.removeFileButton(DUMMY_PDF.name)).toBeHidden();
        await expect(createTechpackPage.locators.descriptionTextarea).toHaveValue('');
      });
    });

    test('TC:37 Verify the new techpack is on the Dashboard, Open', async ({ techpackPage }) => {
      test.skip(!created?.code, 'TC:35 did not create a techpack');
      await techpackPage.open();
      // Not expectLoaded(): it waits for the status filter, which this test
      // doesn't use.
      await expect(techpackPage.locators.searchInput).toBeVisible({ timeout: 90_000 });

      await test.step(`Search ${created!.code}: its row shows status Open`, async () => {
        await techpackPage.search(created!.code);
        await techpackPage.expectCodeVisible(created!.code);
        expect(await techpackPage.rowCellTexts(created!.code)).toContain('Open');
      });
    });

    test('TC:38 Verify the duplicate key includes Techpack Type: the same 5 fields with another Techpack Type creates a new techpack', async ({
      createTechpackPage,
    }) => {
      test.skip(!created?.code, 'TC:35 did not create a techpack');
      test.setTimeout(180_000);
      const identity = created!.identity;
      await createTechpackPage.openFromTechpacksList();

      await test.step('Same Customer, Season, Style, Fabric, Wash and Product Type; a different Techpack Type', async () => {
        await createTechpackPage.fillDetails({
          style: fullValuePattern(identity['Style*']),
          customer: fullValuePattern(identity['Customer*']),
          fabric: fullValuePattern(identity['Fabric*']),
          season: fullValuePattern(identity['Season*']),
          wash: fullValuePattern(identity['Wash*']),
          productType: fullValuePattern(identity['Product Type*']),
          description: QA_AUTO_DESCRIPTION,
        });
        const originalType = optionCode(identity['Techpack Type*']!);
        let type = originalType;
        for (let i = 0; i < 5 && type === originalType; i++) {
          type = optionCode(await createTechpackPage.selectRandomAvailableOption('Techpack Type*'));
        }
        expect(type).not.toBe(originalType);
        await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      });

      await test.step('Create: a new techpack (201), no "Techpack already exists" modal', async () => {
        const { status, body } = await createTechpackPage.createAndReadResponse();
        expect(status).toBe(201);
        expect(body['techpackCode']).not.toBe(created!.code);
        await createTechpackPage.expectCreatedSuccessfully();
      });
    });

    test('TC:39 Verify changing one key field (Wash) avoids the duplicate and creates a new techpack', async ({
      createTechpackPage,
    }) => {
      test.skip(!created?.code, 'TC:35 did not create a techpack');
      test.setTimeout(180_000);
      const identity = created!.identity;
      await createTechpackPage.openFromTechpacksList();

      await test.step('The same identity with a different Wash', async () => {
        await createTechpackPage.fillDetails({
          techpackType: fullValuePattern(identity['Techpack Type*']),
          style: fullValuePattern(identity['Style*']),
          customer: fullValuePattern(identity['Customer*']),
          fabric: fullValuePattern(identity['Fabric*']),
          season: fullValuePattern(identity['Season*']),
          productType: fullValuePattern(identity['Product Type*']),
          description: QA_AUTO_DESCRIPTION,
        });
        const originalWash = optionCode(identity['Wash*']!);
        let wash = originalWash;
        for (let i = 0; i < 5 && wash === originalWash; i++) {
          wash = optionCode(await createTechpackPage.selectRandomAvailableOption('Wash*'));
        }
        expect(wash).not.toBe(originalWash);
        await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      });

      await test.step('Create: a new techpack (201), no modal', async () => {
        const { status, body } = await createTechpackPage.createAndReadResponse();
        expect(status).toBe(201);
        expect(body['techpackCode']).not.toBe(created!.code);
        await createTechpackPage.expectCreatedSuccessfully();
      });
    });

    test('TC:41 Verify "Copy as New" on the canvas pre-fills the form', async ({
      createTechpackPage,
      canvasPage,
      page,
    }) => {
      test.skip(!created?.code, 'TC:35 did not create a techpack');
      await canvasPage.gotoCanvasById(created!.id);
      await canvasPage.expectLoaded();

      await test.step('Click "Copy as New"', async () => {
        await canvasPage.locators.copyAsNewButton.click();
      });

      await test.step(`The form opens at ?from=${created!.code} with all 7 fields and the Description filled in`, async () => {
        await expect(page).toHaveURL(new RegExp(`/techpacks/new\\?from=${created!.code}$`));
        await expect(createTechpackPage.locators.heading).toBeVisible({ timeout: 30_000 });
        await expect
          .poll(async () => (await createTechpackPage.fieldsFilledCount()).filled, {
            timeout: 20_000,
          })
          .toBe(7);
        await expect(createTechpackPage.locators.descriptionTextarea).toHaveValue(
          QA_AUTO_DESCRIPTION,
        );
      });
    });
  });

  test('TC:40 Verify a duplicate of an Approved techpack offers a new revision', async ({
    createTechpackPage,
    canvasPage,
  }) => {
    // Waiting on the BA (2026-10-30): on uat the same identity as an Approved
    // techpack returns 409 and the app then creates "Draft revision 1 of
    // <code>" straight away, with no modal or confirmation. Whether that is
    // intended decides if this case passes as written or becomes a bug.
    test.fixme(
      true,
      'TC:40 waits on the BA: a duplicate of an Approved techpack creates a revision without asking',
    );
    test.setTimeout(300_000);
    await createTechpackPage.openFromTechpacksList();

    const identity = await test.step('Create a QA-AUTO techpack and approve it', async () => {
      const picked = await createTechpackPage.fillAllRequiredWithRandomAvailable();
      await createTechpackPage.fillDetails({ description: QA_AUTO_DESCRIPTION });
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      expect((await createTechpackPage.createAndReadResponse()).status).toBe(201);
      await createTechpackPage.expectCreatedSuccessfully();
      await canvasPage.gotoCanvasById(createTechpackPage.currentTechpackId());
      await canvasPage.expectLoaded();
      expect(await canvasPage.approveTechpack()).toBe('approved');
      return picked;
    });

    await test.step('The same identity again: "Techpack already exists" offers "Create new revision"', async () => {
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
      await createTechpackPage.expectDuplicateModalVisible();
      await expect(createTechpackPage.locators.duplicateExistsModal).toContainText(/Approved/);
      await expect(createTechpackPage.locators.createNewRevisionButton).toBeEnabled();
    });
  });
});
