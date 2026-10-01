import * as fs from 'fs';
import * as path from 'path';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';

/**
 * Techpack — Canvas Review (the screen landed on right after creating a techpack).
 *
 * Source of truth for these cases: test-cases/techpack/canvas-review.md.
 * No ClickUp test-case tasks exist for this story; cases with a filed ClickUp
 * bug or clarification link to it via allure.tms().
 * Each test creates its own fresh techpack via the Classic form (see that file's notes on why:
 * legacy seed records have their own known load-reliability issues) — never a shared/legacy
 * record, and never reused across tests, since a couple of these cases (posting a comment)
 * mutate the record.
 */
test.describe('Techpack - Canvas Review', () => {
  test.beforeEach(async ({ createTechpackPage }, testInfo) => {
    // The create flow (list load + 7 random combobox picks, with Season's
    // own retry-for-a-customer-with-a-season loop + file upload + create)
    // can genuinely exceed the global 90s default on a slow dev day —
    // confirmed by intermittent "Target page, context or browser has been
    // closed" errors mid-beforeEach, which is what a test timeout firing
    // mid-await looks like, not a real app/browser crash. 180s still
    // wasn't always enough (the Season retry loop's worst case can run
    // long on a slow day) — matching create-techpack.spec.ts's own TC:8
    // (which does two full create attempts) at 300s, even though this
    // only does one, for headroom.
    testInfo.setTimeout(300_000);
    await allure.epic('Techpack');
    await allure.feature('Canvas Review');
    await allure.owner('Techpack QA');

    await createTechpackPage.openFromTechpacksList();
    await createTechpackPage.fillAllRequiredWithRandomAvailable();
    await createTechpackPage.uploadTechpackFile({
      name: 'sample-techpack.pdf',
      mimeType: 'application/pdf',
      buffer: fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-techpack.pdf')),
    });
    const outcome = await createTechpackPage.createExpectingResult();
    if (outcome !== 'created') {
      throw new Error(`beforeEach: expected a fresh techpack to be created, got: ${outcome}`);
    }
    await createTechpackPage.expectCreatedSuccessfully();
  });

  test('TC:1 Verify the canvas layout right after creating a techpack', async ({ canvasPage }) => {
    await canvasPage.expectLoaded();

    await test.step('Toolbar controls are visible', async () => {
      await expect(canvasPage.locators.backButton).toBeVisible();
      await expect(canvasPage.locators.fileViewToggle).toBeVisible();
      await expect(canvasPage.locators.standardViewToggle).toBeVisible();
      await expect(canvasPage.locators.addPinButton).toBeVisible();
      await expect(canvasPage.locators.openCommentsTabButton).toBeVisible();
      await expect(canvasPage.locators.hideResolvedButton).toBeVisible();
      await expect(canvasPage.locators.enterFullscreenButton).toBeVisible();
      await expect(canvasPage.locators.functionsButton).toBeVisible();
      await expect(canvasPage.locators.reportsButton).toBeVisible();
      await expect(canvasPage.locators.copyAsNewButton).toBeVisible();
      await expect(canvasPage.locators.forceReleaseButton).toBeVisible();
    });

    await test.step('Right panel tabs and sections are visible', async () => {
      await expect(canvasPage.locators.detailsTab).toBeVisible();
      await expect(canvasPage.locators.commentsTab).toBeVisible();
      await expect(canvasPage.locators.historyTab).toBeVisible();
      await expect(canvasPage.locators.detailsSectionHeader).toBeVisible();
      await expect(canvasPage.locators.headersSectionHeader).toBeVisible();
      await expect(canvasPage.locators.uploadsSectionHeader).toBeVisible();
      await expect(canvasPage.locators.operationsSectionHeader).toBeVisible();
    });
  });

  test("TC:2 Verify the Details section's lifecycle metadata for a fresh techpack", async ({
    createTechpackPage,
    canvasPage,
  }) => {
    const createdCode = await createTechpackPage.currentTechpackCode();

    await test.step('Techpack Code matches the one just created', async () => {
      expect(await canvasPage.detailsTechpackCode()).toBe(createdCode);
    });

    await test.step('Rev and Lock Status reflect a brand-new record', async () => {
      expect(await canvasPage.fieldRowText('Rev')).toContain('Rev 0');
      expect(await canvasPage.fieldRowText('Lock Status')).toContain('UNLOCKED');
    });

    // Status is either "Draft" or "Open" for a freshly-created techpack —
    // confirmed NOT to reliably correlate with whether the Headers summary
    // shows a pending field (an earlier version of this test assumed
    // "pending exists" <=> "Draft", which live evidence directly
    // contradicted: a run showed 0 pending fields yet Status "Draft", and
    // another showed a pending field yet Status "Open"). Whatever actually
    // drives this isn't understood yet — see canvas-review.md's notes —
    // so only assert Status is a valid value for a brand-new record,
    // rather than predicting which one.
    await test.step('Status is a valid pre-Approved value', async () => {
      const statusText = await canvasPage.fieldRowText('Status');
      expect(statusText).toMatch(/Draft|Open/);
    });

    await test.step('Approved Date and Approver are both unset', async () => {
      expect(await canvasPage.fieldRowText('Approved Date')).toContain('—');
      expect(await canvasPage.fieldRowText('Approver')).toContain('—');
    });
  });

  test('TC:3 Verify the Headers section lists every filled identity field with approval status', async ({
    canvasPage,
  }) => {
    await expect(canvasPage.locators.headersApprovalSummary).toBeVisible();

    for (const label of [
      'Techpack Type',
      'Customer',
      'Season',
      'Style',
      'Fabric',
      'Wash',
      'Product Type',
    ]) {
      const status = await canvasPage.headerFieldStatus(label);
      expect(['Approved', 'Pending']).toContain(status);
    }
  });

  test('TC:4 Verify the Uploads section lists the uploaded techpack document', async ({
    canvasPage,
  }) => {
    await expect(canvasPage.uploadedFile('sample-techpack.pdf')).toBeVisible();
    await expect(canvasPage.locators.techpackUploadTag).toBeVisible();
  });

  test('TC:5 Verify the Operations section mirrors what was set at creation', async ({
    canvasPage,
  }) => {
    // Not asserting the checkboxes' enabled/disabled state or the table's
    // total row count here — see canvas-review.md's notes: a techpack that
    // starts fully-approved (Status "Open") showed a much larger table
    // (34 checkboxes, mostly enabled) than one still in Draft, suggesting
    // Operations may become editable once Open rather than always being a
    // fixed, read-only 4-row table. What's reliably true regardless is
    // that the 4 rows entered at creation are still shown with their data.
    const table = canvasPage.locators.operationsTable;
    await expect(table).toBeVisible();

    for (const service of ['EMBROIDRY', 'PRINTING', 'EMBOSSING', 'WASHTYPE']) {
      await expect(table.getByText(service, { exact: true })).toBeVisible();
    }
  });

  test('TC:6 Verify posting a comment on a field', async ({ canvasPage }) => {
    const commentText = `QA field comment ${Date.now()}`;
    await canvasPage.postFieldComment('Season', commentText);
    // The submitted textarea can stay populated after Enter alongside the
    // newly-rendered comment itself — both legitimately contain the text,
    // so .first() just confirms presence rather than requiring exactly one.
    await expect(canvasPage.locators.text(commentText).first()).toBeVisible();
  });

  test('TC:7 Verify a posted field comment appears in the aggregated Comments tab', async ({
    canvasPage,
  }) => {
    const commentText = `QA aggregated comment ${Date.now()}`;
    await canvasPage.postFieldComment('Season', commentText);

    await canvasPage.locators.commentsTab.click();
    await expect(canvasPage.locators.text(commentText).first()).toBeVisible();
  });

  test("TC:8 Verify the Comments tab's empty state before any comment exists", async ({
    canvasPage,
  }) => {
    await canvasPage.locators.commentsTab.click();
    await expect(canvasPage.locators.commentsTabEmptyState).toBeVisible();
  });

  test('TC:9 Verify the Functions menu reflects the Draft-to-Open-to-Approved lifecycle gating', async ({
    canvasPage,
  }) => {
    // Whether "Move to Open" or "Approve" is the current actionable item
    // depends on the record's actual Draft/Open sub-state, which isn't
    // reliably predictable up front (see TC:2 and canvas-review.md's
    // notes) — a record can even start fully approved (Status "Open") and
    // apparently not show "Move to Open" as a listed item at all in that
    // case. So this only asserts what's true regardless of that sub-state:
    // at least one of the two early-lifecycle actions is listed, and the
    // two actions gated on "Approved" — a stage no fresh record has
    // reached — show their blocking reason.
    const items = await canvasPage.functionsMenuItems();
    expect(items.some((i) => /Move to Open/.test(i) || /^Approve/.test(i))).toBeTruthy();
    expect(
      items.some(
        (i) =>
          /Create new Techpack Rev/.test(i) && /Available once this revision is Approved/.test(i),
      ),
    ).toBeTruthy();
    expect(
      items.some(
        (i) => /Lock techpack/.test(i) && /Only an Approved techpack can be locked/.test(i),
      ),
    ).toBeTruthy();
  });

  test("TC:10 Verify the Reports menu's Techpack Report is gated on Approved status", async ({
    canvasPage,
  }) => {
    const items = await canvasPage.reportsMenuItems();
    expect(
      items.some(
        (i) => /Techpack Report/.test(i) && /Available once this revision is Approved/.test(i),
      ),
    ).toBeTruthy();
  });

  test('TC:11 Verify "Copy as New" opens the Classic form pre-filled from the existing techpack', async ({
    createTechpackPage,
    canvasPage,
    page,
  }) => {
    const createdCode = await createTechpackPage.currentTechpackCode();
    await canvasPage.locators.copyAsNewButton.click();
    await expect(page).toHaveURL(new RegExp(`/techpacks/new\\?from=${createdCode}`));
  });

  test('TC:12 Verify the History tab is reachable', async ({ canvasPage }) => {
    await canvasPage.locators.historyTab.click();
    await expect(canvasPage.locators.historyTab).toHaveAttribute('aria-selected', 'true');
  });

  test('TC:13 Verify adding a pin annotation drops a marker and surfaces in the Comments tab', async ({
    canvasPage,
  }) => {
    // A click at a fixed point must land on rendered document content, not a
    // still-loading placeholder — see canvas-review.md's notes on the PDF viewer.
    await canvasPage.waitForDocumentRendered();

    const pinText = `QA pin annotation ${Date.now()}`;
    await canvasPage.postPinAnnotation(pinText);

    await test.step('A numbered annotation marker appears on the canvas', async () => {
      await expect(canvasPage.locators.annotationOverlay).toBeVisible();
      await expect(
        canvasPage.locators.annotationOverlay.getByRole('button', { name: /Annotation by/ }),
      ).toBeVisible();
    });

    await test.step('The pin appears in the aggregated Comments tab', async () => {
      await canvasPage.locators.commentsTab.click();
      await expect(canvasPage.locators.text(pinText)).toBeVisible();
    });
  });

  test('TC:14 Verify "Cancel Pin" exits placement mode without creating an annotation', async ({
    canvasPage,
  }) => {
    await canvasPage.locators.addPinButton.click();
    await expect(canvasPage.locators.cancelPinButton).toBeVisible();

    await canvasPage.cancelPinMode();

    await expect(canvasPage.locators.addPinButton).toBeVisible();
    await canvasPage.locators.commentsTab.click();
    // No pin was ever placed, so the empty state (and un-badged tab name,
    // asserted implicitly by commentsTab's own prefix-match locator still
    // resolving) should still be showing.
    await expect(canvasPage.locators.commentsTabEmptyState).toBeVisible();
  });

  test('TC:15 Verify "Re-extract" and "Ask about this techpack" do not appear on a Classic-created techpack\'s canvas', async ({
    canvasPage,
  }) => {
    // Confirmed live (2026-09): a Classic-form-created techpack's toolbar
    // only ever shows Back, File/Standard toggle, page nav, zoom, Add Pin,
    // Open comments tab, Hide resolved, Enter fullscreen, Functions,
    // Reports, Copy as New, Force release — no "Re-extract" or "Ask about
    // this techpack" anywhere on the page. Those two actions were only
    // ever observed on one AI-extracted seed record during early manual
    // exploration — see canvas-review.md's notes and TC:16 (the same
    // check against an AI-Mode-created record) for the full account of
    // whether they're AI-Mode-exclusive or genuinely seed-data-only.
    await expect(canvasPage.locators.anyReExtractText).toHaveCount(0);
    await expect(canvasPage.locators.anyAskAboutTechpackText).toHaveCount(0);
  });

  test('TC:18 Verify the toolbar\'s "Open comments tab" icon actually switches the sidebar to the Comments tab', async ({
    canvasPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxb8f', 'TC:18 bug (ClickUp)');
    await canvasPage.locators.historyTab.click();
    await expect(canvasPage.locators.historyTab).toHaveAttribute('aria-selected', 'true');

    await canvasPage.locators.openCommentsTabButton.click();
    // ClickUp z941abxb8f documented this icon as a no-op when the sidebar
    // was already on History as of 2026-09-29 (the click didn't switch to
    // Comments). Asserted here as what SHOULD happen regardless (matching
    // 03-create-techpack-ai-mode.spec.ts's TC:8 "assert correct behavior"
    // pattern), but **live re-verification this session (2026-09-30, 3
    // independent runs) found this now consistently switches the sidebar
    // to Comments as expected** — this assertion is a genuine current
    // PASS, not a known-bug placeholder. Flag z941abxb8f for re-triage/
    // closure, same as z941abxb80 (TC:17) — don't assume this doc's own
    // 2026-09-29 notes are still current without re-checking.
    await expect(canvasPage.locators.commentsTab).toHaveAttribute('aria-selected', 'true');
  });
});

/**
 * Separate describe block (own setup, no Classic-form beforeEach) — this
 * one case needs an AI-Mode-created record specifically, not a Classic one.
 * Uses the exact same creation approach as ai-mode.spec.ts's own TC:8
 * (proven reliable there) rather than the Classic-form fixture.
 */
test.describe('Techpack - Canvas Review (AI Mode)', () => {
  // Playwright requires the first param to be an object-destructuring
  // pattern even when unused, hence the disable below.
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(300_000);
    await allure.epic('Techpack');
    await allure.feature('Canvas Review');
    await allure.owner('Techpack QA');
  });

  test('TC:16 Verify "Re-extract" and "Ask about this techpack" appear on an AI-Mode-created techpack\'s canvas', async ({
    aiModeCopilotPage,
    canvasPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abx71b', 'TC:16 bug (ClickUp)');
    await aiModeCopilotPage.openFromTechpacksList();
    // The real Country Road sign-off PDF the user supplied — the same file
    // AI Mode TC:8 uses. sample-techpack.pdf goes down the "items aren't in
    // master data yet → pick existing" path, where Create draft still fails.
    await aiModeCopilotPage.uploadFile({
      name: 'wpa-60323517-sign-off.pdf',
      mimeType: 'application/pdf',
      buffer: fs.readFileSync(path.join(__dirname, 'fixtures', 'wpa-60323517-sign-off.pdf')),
    });
    // Upload no longer auto-starts extraction (AI Mode redesign, 2026-09-29).
    await aiModeCopilotPage.startExtraction();

    const outcome = await aiModeCopilotPage.waitForExtractionOutcome();
    expect(outcome, 'AI Mode extraction should reach the field-picking panel').toBe('ready');

    await aiModeCopilotPage.waitForPickAValueForm();
    await aiModeCopilotPage.fillAllRequiredWithRandomAvailable();
    const startUrl = page.url();
    const result = await aiModeCopilotPage.createDraftExpectingResult();
    expect(['created', 'file-exists', 'draft-with-warning']).toContain(result);
    if (result === 'file-exists') {
      await aiModeCopilotPage.locators.openExistingFileLink.click();
    } else if (result === 'draft-with-warning') {
      await aiModeCopilotPage.locators.openTechpackLink.click();
    }
    await page.waitForURL((url) => url.toString() !== startUrl, { timeout: 30_000 });
    // An AI-created draft's canvas can take well over the default to settle.
    await canvasPage.expectLoaded(60_000);

    // Confirmed live 2026-09-10 by reading an existing AI-created record's
    // toolbar (Creator "copilot"): these two actions ARE genuinely
    // AI-Mode-exclusive, present here and absent from every Classic-created
    // record (TC:15) — not seed-data-only as originally suspected. See
    // canvas-review.md's notes for the full account, including why
    // creating a *brand-new* AI-mode draft for this check is itself
    // sometimes unreliable (a pre-existing "Create draft" backend
    // flakiness, already documented for ai-mode.spec.ts's TC:7 — not a new
    // problem introduced here).
    await expect(canvasPage.locators.reExtractButton).toBeVisible({ timeout: 20_000 });
    await expect(canvasPage.locators.askAboutTechpackButton).toBeVisible();
  });
});

/**
 * Separate describe block — TC:17 deliberately targets canvas IDs that
 * don't correspond to any real record, so it skips the fresh-Classic-
 * techpack beforeEach every other case in this file uses.
 */
test.describe('Techpack - Canvas Review (Invalid Canvas ID)', () => {
  // Playwright requires the first param to be an object-destructuring
  // pattern even when unused, hence the disable below.
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    // expectNotFoundForInvalidId() waits up to 30s for the real end state —
    // give this test itself some headroom above the global 60s (uat)
    // default for two of those.
    testInfo.setTimeout(120_000);
    await allure.epic('Techpack');
    await allure.feature('Canvas Review');
    await allure.owner('Techpack QA');
  });

  test('TC:17 Verify an invalid canvas ID shows a proper "not found" page, not an empty canvas', async ({
    canvasPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxb80', 'TC:17 clarification (ClickUp)');
    // ClickUp z941abxb80 — previously reported as opening an empty canvas
    // with a developer hint ("No PDF attached. Pass ?pdf=<url> to
    // preview.") instead of a real error. Confirmed live 2026-09-29/30:
    // this no longer reproduces on uat — both a malformed ID and a
    // well-formed-but-nonexistent UUID now show a proper "Canvas not
    // found" page. This is a real, currently-passing assertion of fixed
    // behavior, not a known-bug placeholder. See
    // expectNotFoundForInvalidId()'s own doc comment for a debugging note
    // worth reading before touching this again (a real locator bug, not
    // environment flakiness, was the actual cause of this test's early
    // failures).
    await test.step('A malformed (non-UUID) canvas ID shows "Canvas not found"', async () => {
      await canvasPage.expectNotFoundForInvalidId('not-a-uuid');
    });

    await test.step('A well-formed but nonexistent UUID also shows "Canvas not found"', async () => {
      await canvasPage.expectNotFoundForInvalidId('11111111-2222-3333-4444-555555555555');
    });
  });
});

/**
 * Separate, serial describe block — TC:19 (Force Release) and TC:20
 * (self-approval) each perform a one-way lifecycle action (TC:20's Approve
 * makes the record permanently read-only), so they deliberately share ONE
 * fresh, disposable techpack created once by TC:19, rather than each test
 * creating (and permanently altering) its own — the same "disposable
 * techpack" shorthand this suite's own live-exploration session used for
 * exactly this reason (see canvas-review.md's notes; "disposable" is this
 * repo's own testing shorthand, not a real product status or feature).
 * Each test still gets its own fresh `page` (Playwright fixtures are
 * per-test) — techpackCode is the hand-off between them, and `.serial`
 * ensures TC:20 never runs against a record TC:19 failed to produce.
 */
test.describe('Techpack - Canvas Review (Force Release + Approve)', () => {
  test.describe.serial('TC:19/TC:20 — shared disposable techpack', () => {
    let techpackCode = '';

    // Playwright requires the first param to be an object-destructuring
    // pattern even when unused, hence the disable below.
    // eslint-disable-next-line no-empty-pattern
    test.beforeEach(async ({}, testInfo) => {
      testInfo.setTimeout(300_000);
      await allure.epic('Techpack');
      await allure.feature('Canvas Review');
      await allure.owner('Techpack QA');
    });

    test('TC:19 Verify the "Force release" flow and its resulting banner', async ({
      createTechpackPage,
      canvasPage,
    }) => {
      await allure.tms('https://app.clickup.com/t/z941abwh0u', 'TC:19 bug (ClickUp)');
      await createTechpackPage.openFromTechpacksList();
      await createTechpackPage.fillAllRequiredWithRandomAvailable();
      await createTechpackPage.uploadTechpackFile({
        name: 'sample-techpack.pdf',
        mimeType: 'application/pdf',
        buffer: fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-techpack.pdf')),
      });
      const outcome = await createTechpackPage.createExpectingResult();
      expect(outcome).toBe('created');
      await createTechpackPage.expectCreatedSuccessfully();
      techpackCode = await createTechpackPage.currentTechpackCode();

      const creatorName = (await canvasPage.fieldRowText('Creator')).split('\n').pop()!.trim();

      await test.step('"Release lock" stays disabled unless both Reason and the literal "RELEASE" are filled', async () => {
        await canvasPage.locators.forceReleaseButton.click();
        await expect(canvasPage.locators.forceReleaseDialog).toBeVisible();
        await expect(canvasPage.locators.forceReleaseConfirmButton).toBeDisabled();

        await canvasPage.locators.forceReleaseReasonInput.fill(
          'QA regression: gating check (Reason only)',
        );
        await expect(canvasPage.locators.forceReleaseConfirmButton).toBeDisabled();

        // Clear Reason, fill only the RELEASE confirm text — the two
        // conditions are independent, so this should stay disabled too.
        await canvasPage.locators.forceReleaseReasonInput.fill('');
        await canvasPage.locators.forceReleaseConfirmInput.fill('RELEASE');
        await expect(canvasPage.locators.forceReleaseConfirmButton).toBeDisabled();

        await canvasPage.locators.forceReleaseCancelButton.click();
        await expect(canvasPage.locators.forceReleaseDialog).toBeHidden();
      });

      await test.step('Confirming with both fields filled releases the lock and shows a banner', async () => {
        await canvasPage.forceRelease(`QA regression force-release check ${Date.now()}`);
        await expect(canvasPage.locators.forceReleaseBanner).toBeVisible({ timeout: 15_000 });
      });

      await test.step("The banner shows the releasing user's resolved name, not a raw backend UUID", async () => {
        // ClickUp z941abwh0u / z941abxb3u documented this banner showing
        // a raw UUID ("Canvas lock force-released by
        // 217754ed-5b13-430a-a1fc-b36a32e3f243") as of 2026-09-29 — the
        // same UUID also found unresolved in the Export CSV bug
        // (techpack-list.md's TC:19). Asserted here as what SHOULD
        // happen regardless (matching 03-create-techpack-ai-mode.spec
        // .ts's TC:8 "assert correct behavior" pattern), but **live
        // re-verification this session (2026-09-30, 4 independent
        // force-releases) found this now consistently resolves to the
        // real user name ("Canvas lock force-released by Alice
        // Planner.") — this assertion is a genuine current PASS, not a
        // known-bug placeholder. Flag z941abwh0u/z941abxb3u for
        // re-triage/closure, same as z941abxb80 (TC:17) — don't assume
        // this doc's own 2026-09-29 notes are still current without
        // re-checking. No permission-negative case is included here —
        // per the user, there is no business rule restricting who can
        // force-release whose lock, so this only checks the flow/gating
        // and the banner's name resolution, both self-triggered.
        await expect(canvasPage.locators.forceReleaseBanner).toContainText(creatorName);
      });
    });

    test('TC:20 Verify a techpack\'s own creator can approve their own submission ("self-approval")', async ({
      techpackPage,
      canvasPage,
    }) => {
      await allure.tms('https://app.clickup.com/t/z941abxb7p', 'TC:20 clarification (ClickUp)');
      expect(techpackCode, 'TC:19 must have created a shared disposable techpack first').not.toBe(
        '',
      );

      await techpackPage.open();
      await techpackPage.expectLoaded();
      await techpackPage.search(techpackCode);
      await techpackPage.openRow(techpackCode);
      await canvasPage.expectLoaded();

      const creatorName = (await canvasPage.fieldRowText('Creator')).split('\n').pop()!.trim();

      const result = await canvasPage.approveTechpack();
      test.skip(
        result === 'not-available',
        `Functions menu did not offer an enabled "Approve" for ${techpackCode} on this run — a ` +
          "fresh record's exact Draft/Open sub-state and per-field approval outcome isn't " +
          "reliably predictable, see canvas-review.md's notes.",
      );

      await test.step('A success toast confirms the approval', async () => {
        await expect(canvasPage.locators.text(new RegExp(`${techpackCode} approved`))).toBeVisible({
          timeout: 15_000,
        });
      });

      // Confirmed intended by the user (2026-09-30): this techpack's own
      // creator approving their own submission is allowed by design, not a
      // maker-checker gap to flag — so this asserts the success case for
      // real, not a permission-denial.
      await test.step('Status becomes Approved, and Approver == Creator (self-approval allowed by design)', async () => {
        await expect
          .poll(async () => (await canvasPage.fieldRowText('Status')).split('\n').pop()!.trim(), {
            timeout: 15_000,
          })
          .toBe('Approved');
        const approverName = (await canvasPage.fieldRowText('Approver')).split('\n').pop()!.trim();
        expect(approverName).toBe(creatorName);
      });
    });
  });
});
