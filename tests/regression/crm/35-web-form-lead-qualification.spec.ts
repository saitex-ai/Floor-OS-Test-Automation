import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { partial } from '../../../src/utils/test-annotations';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import {
  DEV_AI_SECTION_TITLES,
  type LeadQualificationData,
  type LeadQualificationPage,
} from '../../../src/pages/crm/lead-qualification.page';
import seed from '../../../src/data/crm/seed-records.data.json';

/**
 * CRM — [Origin Type = Web Form] Lead Qualification (Sprint 5).
 *
 * Source of truth: ClickUp test-case set https://app.clickup.com/t/z941abytdu
 * (user story https://app.clickup.com/t/86eye4dta). Confirmed against dev
 * on 2026-10-15 — see test-cases/crm/web-form-lead-qualification.md.
 *
 * The test web form (unusual-dev-store.myshopify.com/pages/contact) is
 * password-protected and the password isn't available to automation, so
 * no new submission can be made. Display TCs therefore run READ-ONLY
 * against EXISTING Web Form Leads on dev that were created by real form
 * ingestion (`createdBy: "web-ingest"`), using the tab's own GET
 * `/lead-qualification` payload (the request the UI makes) as the record
 * of what was submitted. The submission-dependent halves of TC:1/3/6/19/20
 * are recorded as a "partial" annotation on the TC's own test.
 *
 * TCs that write (save/edit a review, convert) run on a Web Form Lead this
 * spec creates itself through Create Customer (Origin Type "Web Form",
 * Origin "Contact Us Form"). Such a lead has no form card (no submission)
 * and no AI dossier — dev only has dossiers on leads seeded by
 * `ai-lead-engine` on 2026-09-18 / 2026-10-12. So TC:12's "apply an
 * enhancement" can't be done on a lead we own: recorded as a "partial"
 * annotation, with the non-writing part (AI Chatbot + Markup tool
 * reachable) automated.
 *
 * Headline dev findings (details in the .md):
 * - BUG: genuine Web Form submissions get NO AI dossier: the tab shows "No
 *   dossier for this account yet" (TC:9/10, ClickUp z941abywgu).
 * - Dev renders "Business Compatibility Report" and NO "Sales Pitch
 *   Recommendation" card, although the dossier payload carries `pitch`
 *   pointers (TC:10).
 * - The empty-edit error reads "A review and a score are both required"
 *   (TC:15). The "Manager's review and score saved" / "Review updated"
 *   confirmations are shown since 2026-10-23 (TC:14/15).
 * - Acknowledgement email isn't traceable from the Lead: Communication >
 *   Emails is empty for an ingested Web Form Lead (TC:19).
 */

/**
 * Existing Web Form Leads on dev (src/data/crm/seed-records.data.json),
 * all used READ-ONLY — nothing in this spec writes to them.
 */
const WEB_FORM_LEADS = seed.webFormLeads;
type SeedLeadKey = keyof typeof WEB_FORM_LEADS;

const SUBMISSION_UNAVAILABLE =
  'the test web form (https://unusual-dev-store.myshopify.com/pages/contact) is password-protected and ' +
  'the password is not available to automation, so no new submission can be made.';

/**
 * Opens a seed Web Form Lead's Lead Qualification tab and returns the
 * tab's own GET payload — or skips the test, naming the record, when it no
 * longer exists or (where the data file gives a "stage") has left the
 * stage this spec relies on.
 */
async function openSeedLead(
  lq: LeadQualificationPage,
  key: SeedLeadKey,
): Promise<LeadQualificationData> {
  const lead = WEB_FORM_LEADS[key];
  const data = await lq.tryOpenAndReadQualification(lead.id);
  test.skip(
    data === null,
    `Seed Web Form Lead "${lead.name}" (${lead.id}) no longer exists on this environment — ` +
      'replace webFormLeads.' +
      key +
      ' in src/data/crm/seed-records.data.json.',
  );
  const expectedStage = (lead as { stage?: string }).stage;
  test.skip(
    expectedStage !== undefined && data!.stageLabel !== expectedStage,
    `Seed Web Form Lead "${lead.name}" (${lead.id}) is now at stage "${data!.stageLabel}", not "${expectedStage}" — ` +
      'replace webFormLeads.' +
      key +
      ' in src/data/crm/seed-records.data.json.',
  );
  return data!;
}

/** Creates a Web Form Lead owned by this spec (no submission, so no form card / AI dossier). */
async function createOwnWebFormLead(
  page: Page,
  createCustomerPage: CreateCustomerPage,
): Promise<{ id: string; name: string }> {
  const ts = Date.now();
  const name = `Playwright Regression WebForm LQ ${ts}`;
  await createCustomerPage.openFromCrmHome();
  await createCustomerPage.fillProfile({
    name,
    email: `pw-regression-wf-lq-${ts}@example.com`,
    city: 'Coimbatore',
    country: 'India',
    originType: 'Web Form',
    origin: 'Contact Us Form',
    buyer: 'Fabric',
    crmStage: 'Lead',
  });
  await createCustomerPage.saveAndOpenDetail();
  return { id: page.url().split('/').pop()!, name };
}

test.describe('CRM - [Origin Type = Web Form] Lead Qualification', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('[Origin Type = Web Form] Lead Qualification');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify Web Form Lead Opens with the Submitted Form as the First Card', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytdw', 'TC:1 (ClickUp)');

    await test.step('An ingested Web Form Lead has Origin Type Web Form and opens with its form card first', async () => {
      const data = await openSeedLead(lq, 'allFields');
      expect(data.originTypeLabel).toBe('Web Form');
      expect(data.stageLabel).toBe('Lead');
      await lq.expectFormCardIsFirstCard(lq.latestSubmission(data).originLabel);
    });

    await test.step('Where AI sections exist, the form card sits above all of them', async () => {
      const data = await openSeedLead(lq, 'formAndDossier');
      await lq.expectFormCardIsFirstCard(lq.latestSubmission(data).originLabel);
      const titles = await lq.cardTitlesInOrder();
      for (const section of DEV_AI_SECTION_TITLES) {
        expect(titles.indexOf(section)).toBeGreaterThan(0);
      }
    });

    partial(
      `Checked on existing ingested Web Form Leads; opening the Lead created by a NEW submission is not exercised: ${SUBMISSION_UNAVAILABLE}`,
    );
  });

  test('TC:2 Verify Form Card Names the Form Type and Is Marked as Origin', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytdx', 'TC:2 (ClickUp)');

    await test.step('Contact Us Form lead: title "Contact Us Form" + Origin badge', async () => {
      const data = await openSeedLead(lq, 'allFields');
      expect(data.originLabel).toBe('Contact Us Form');
      await lq.expectFormCardTitleAndOriginBadge('Contact Us Form');
    });

    await test.step('Sign Up Form lead: title "Sign Up Form" + Origin badge', async () => {
      const data = await openSeedLead(lq, 'emailOnly');
      expect(data.originLabel).toBe('Sign Up Form');
      await lq.expectFormCardTitleAndOriginBadge('Sign Up Form');
    });
  });

  test('TC:3 Verify Submission Source and Date Are Shown on the Form Card', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytdy', 'TC:3 (ClickUp)');

    for (const key of ['allFields', 'emailOnly'] as const) {
      await test.step(`Source site and the stored submission date/time are shown (${WEB_FORM_LEADS[key].name})`, async () => {
        const data = await openSeedLead(lq, key);
        // Every ingested card on dev reads "Submitted via saitex.com",
        // although the ClickUp test form lives on
        // unusual-dev-store.myshopify.com — see the .md (uncertain).
        await lq.expectFormCardSourceAndSubmittedAt(lq.latestSubmission(data));
      });
    }

    partial(
      `The shown date is checked against the stored submission time; matching it to the time of our own submission is not exercised: ${SUBMISSION_UNAVAILABLE}`,
    );
  });

  test('TC:4 Verify All Submitted Fields Are Shown As Submitted', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytdz', 'TC:4 (ClickUp)');

    // Partial vs ClickUp: uses an existing all-fields submission instead
    // of submitting "Priya Raman / Universal Standard" (store password).
    await test.step("Name, Company's Name, Email, Phone and Subject each match the stored submission exactly", async () => {
      const data = await openSeedLead(lq, 'allFields');
      const { formData } = lq.latestSubmission(data);
      for (const key of [
        'sender_name',
        'company_name',
        'sender_email',
        'sender_phone',
        'subject',
      ]) {
        expect(formData[key], `fixture lead lost its "${key}"`).toBeTruthy();
      }
      await lq.expectFormCardFieldsMatch(formData);
    });
  });

  test('TC:5 Verify Blank Submitted Fields Are Omitted from the Form Card', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyte0', 'TC:5 (ClickUp)');

    await test.step('Email-only Sign Up submission: only Email is shown', async () => {
      const data = await openSeedLead(lq, 'emailOnly');
      const { formData } = lq.latestSubmission(data);
      expect(Object.keys(formData)).toEqual(['sender_email']);
      await lq.expectFormCardFieldsMatch(formData);
      await lq.expectNoBlankPlaceholders();
    });

    await test.step('Contact Us submission without Phone: no Phone row, no placeholder', async () => {
      const data = await openSeedLead(lq, 'noPhone');
      const { formData } = lq.latestSubmission(data);
      expect(formData.sender_phone ?? '').toBe('');
      await lq.expectFormCardFieldsMatch(formData);
      await lq.expectNoBlankPlaceholders();
    });
  });

  test('TC:6 Verify the Full Message Is Shown Separately and Not Truncated', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyte1', 'TC:6 (ClickUp)');

    await test.step('Message renders in its own Message block, in full, unclamped', async () => {
      const data = await openSeedLead(lq, 'allFields');
      const { formData } = lq.latestSubmission(data);
      expect(formData.message).toBeTruthy();
      await lq.expectFullMessageShownSeparately(formData.message!);
    });

    // No existing dev submission has a long, multi-line message with &, %,
    // quotes or accents (all 30+ were checked).
    partial(
      `A long multi-line message with special characters is not exercised: ${SUBMISSION_UNAVAILABLE}`,
    );
  });

  test('TC:7 Verify Form Card Renders Correctly Without a Message or Phone Number', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyte2', 'TC:7 (ClickUp)');

    await test.step('Submission with no Message and no Phone: no Message area, no Phone row', async () => {
      const data = await openSeedLead(lq, 'emailOnly');
      const { formData } = lq.latestSubmission(data);
      expect(formData.message ?? '').toBe('');
      expect(formData.sender_phone ?? '').toBe('');
      await lq.expectFormCardTitleAndOriginBadge(data.originLabel);
      await lq.expectFormCardFieldsMatch(formData);
      await lq.expectNoMessageArea();
      await lq.expectNoBlankPlaceholders();
    });
  });

  test('TC:8 Verify Submitted Form Content Is Read-Only', async ({ leadQualificationPage: lq }) => {
    await allure.tms('https://app.clickup.com/t/z941abyte9', 'TC:8 (ClickUp)');

    const data = await openSeedLead(lq, 'allFields');
    const { formData } = lq.latestSubmission(data);

    await test.step('No editable control or edit icon on the card; typing into a value changes nothing', async () => {
      await lq.expectFormCardReadOnly();
      await lq.expectFormCardFieldsMatch(formData);
      await lq.expectFullMessageShownSeparately(formData.message!);
    });

    await test.step('After a reload the card still shows exactly what was submitted', async () => {
      await lq.reloadOnTab();
      await lq.expectFormCardFieldsMatch(formData);
      await lq.expectFullMessageShownSeparately(formData.message!);
    });
  });

  test('TC:9 Verify Contact Info AI Section Is Present for a Web Form Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytea', 'TC:9 (ClickUp)');

    await test.step('Web Form record with a dossier: Contact Info is the first AI section, right under the form card', async () => {
      await openSeedLead(lq, 'formAndDossier');
      const titles = await lq.cardTitlesInOrder();
      expect(titles[1]).toBe('Contact Info');
      await lq.expectAiSectionWithContent('Contact Info');
    });

    await test.step('Web Form Lead (Lead stage) with a dossier: Contact Info is the first card', async () => {
      await openSeedLead(lq, 'leadWithDossier');
      expect((await lq.cardTitlesInOrder())[0]).toBe('Contact Info');
      await lq.expectAiSectionWithContent('Contact Info');
    });

    await test.step('BUG: a genuinely submitted Web Form Lead has no dossier — "No dossier for this account yet"', async () => {
      // Every web-ingest lead on dev has `dossier: null`; only leads seeded
      // by ai-lead-engine (2026-09-18 / 2026-10-12) have AI sections.
      // Logged as https://app.clickup.com/t/z941abywgu. Fails once fixed.
      const data = await openSeedLead(lq, 'noPhone');
      expect(data.dossier).toBeNull();
      await lq.expectAiSectionAbsent('Contact Info');
      await lq.expectNoDossierEmptyState();
    });
  });

  test('TC:10 Verify AI Qualification Sections Are Generated from the Submitted Form', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyteb', 'TC:10 (ClickUp)');

    await test.step('Dev renders five AI sections, each with content', async () => {
      await openSeedLead(lq, 'leadWithDossier');
      for (const title of DEV_AI_SECTION_TITLES) await lq.expectAiSectionWithContent(title);
    });

    await test.step('BUG: story\'s "Compatibility" is titled "Business Compatibility Report", and there is no "Sales Pitch Recommendation" section', async () => {
      // Matches the prototype, not the story. The dossier payload DOES
      // carry `pitch` pointers — the UI just doesn't render them.
      await lq.expectAiSectionAbsent('Compatibility');
      await lq.expectAiSectionAbsent('Sales Pitch Recommendation');
    });

    await test.step('BUG: AI sections are not generated from a genuine form submission', async () => {
      // "Content reflects the submitted form" can't hold: no dossier is
      // generated for form submissions (see TC:9, z941abywgu).
      const data = await openSeedLead(lq, 'allFields');
      expect(data.dossier).toBeNull();
      for (const title of DEV_AI_SECTION_TITLES) await lq.expectAiSectionAbsent(title);
      await lq.expectNoDossierEmptyState();
    });
  });

  test('TC:11 Verify No Social Media Origin Sections Appear on a Web Form Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytec', 'TC:11 (ClickUp)');

    await test.step('Ingested Web Form Lead: only the form card is the origin, no social sections', async () => {
      const data = await openSeedLead(lq, 'allFields');
      await lq.expectFormCardIsFirstCard(data.originLabel);
      await lq.expectNoSocialOriginContent(data);
    });

    await test.step('Web Form record that ALSO has stored social posts: none of them render', async () => {
      const data = await openSeedLead(lq, 'formAndDossier');
      if (data.socialInteractions.length === 0) {
        // Seed drift, not a UI result: record it rather than skip the
        // ingested-lead check above, which did run.
        partial(
          `Not checked: seed lead "${WEB_FORM_LEADS.formAndDossier.name}" (${WEB_FORM_LEADS.formAndDossier.id}) no longer ` +
            'has stored social posts — replace webFormLeads.formAndDossier in src/data/crm/seed-records.data.json.',
        );
        return;
      }
      await lq.expectFormCardIsFirstCard(lq.latestSubmission(data).originLabel);
      await lq.expectNoSocialOriginContent(data);
    });
  });

  test('TC:12 Verify an AI Pointer Can Be Refined with the AI Chatbot Markup Tool', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyted', 'TC:12 (ClickUp)');

    await test.step('AI Chatbot opens on a Web Form Lead and the Markup tool can be switched on (nothing sent)', async () => {
      await openSeedLead(lq, 'leadWithDossier');
      await lq.openAiChatbot();
      await lq.turnOnMarkupTool();
      await lq.expectAiChatbotAcceptsInput();
    });

    await test.step('How an enhanced pointer is marked (existing enhanced record, read-only)', async () => {
      await openSeedLead(lq, 'convertedWithDossier');
      await lq.expectEnhancedPointersMarked();
    });

    partial(
      'Applying an enhancement and checking it persists is not exercised: it writes to the AI dossier. Only pre-existing ' +
        'seeded leads have a dossier (leads this suite can create get none — "AI lead engine ... integration is pending"), ' +
        "and this suite doesn't modify data it didn't create.",
    );
  });

  test("TC:13 Verify Manager's Review and Score Mandatory Field Validation", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytee', 'TC:13 (ClickUp)');
    test.slow();

    const lead = await createOwnWebFormLead(page, createCustomerPage);
    await lq.openAndReadQualification(lead.id);

    await test.step('Save with Department, Manager, Score and Review all empty', async () => {
      await lq.attemptSaveBlank();
    });

    await test.step('Each field shows its error and nothing is saved', async () => {
      // All four errors match ClickUp, incl. "Score (1–10) required".
      await lq.expectFieldValidationErrors();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test("TC:14 Verify a Saved Manager's Review Is Listed with Its Details", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytef', 'TC:14 (ClickUp)');
    test.slow();

    const lead = await createOwnWebFormLead(page, createCustomerPage);
    await lq.openAndReadQualification(lead.id);
    const review = {
      department: 'Fabric Mill',
      manager: 'Alice Planner',
      score: 8,
      review: `Web Form lead review ${Date.now()} — strong fit for the denim programme.`,
    };

    await test.step('Save a review: "Manager\'s review and score saved" is confirmed and the form clears', async () => {
      await lq.submitReview(review);
      await lq.expectConfirmation('saved');
      await lq.expectReviewCount(1);
      await lq.expectReviewFormCleared();
    });

    await test.step('The review lists department, manager, score and a timestamp — and survives a reload', async () => {
      // The row shows the selected Manager only; there is no separate
      // "author" — and Managers' notification isn't checked here.
      await lq.expectReviewRowVisible(review);
      expect(await lq.newestReviewSavedTimestamp()).toMatch(/^Saved \d/);
      await lq.reloadOnTab();
      await lq.expectReviewCount(1);
      await lq.expectReviewRowVisible(review);
    });
  });

  test("TC:15 Verify an Existing Manager's Review Can Be Edited", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytej', 'TC:15 (ClickUp)');
    test.slow();

    const lead = await createOwnWebFormLead(page, createCustomerPage);
    await lq.openAndReadQualification(lead.id);
    const review = {
      department: 'Costing',
      manager: 'Alice Planner',
      score: 6,
      review: `Original Web Form review ${Date.now()}`,
    };
    await lq.submitReview(review);
    await lq.expectReviewRowVisible(review);
    const savedAt = await lq.newestReviewSavedTimestamp();

    await test.step('Edit the review text and score: "Review updated" is confirmed and the row updates in place with a refreshed timestamp', async () => {
      const updated = { score: 9, review: `Edited Web Form review ${Date.now()}` };
      await lq.editMostRecentReview(updated);
      await lq.expectConfirmation('updated');
      await lq.expectReviewCount(1);
      await lq.expectReviewRowVisible({ ...review, ...updated });
      expect(await lq.newestReviewSavedTimestamp()).not.toBe(savedAt);
    });

    await test.step('Saving the edit with an empty review is blocked', async () => {
      // Dev's wording: "A review and a score are both required" (ClickUp:
      // "Review is required").
      await lq.attemptSaveEditedReviewWithEmptyText();
      await lq.expectReviewCount(1);
    });
  });

  test("TC:16 Verify Conversion Is Blocked Until a Manager's Review and Score Exists", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytek', 'TC:16 (ClickUp)');
    test.slow();

    const lead = await createOwnWebFormLead(page, createCustomerPage);
    await lq.openAndReadQualification(lead.id);

    await test.step('Convert is disabled with the reason on hover', async () => {
      // Dev: "At least one Manager's Review and Score must exist." (ClickUp:
      // "At least 1 Manager's Review and Score must exist").
      await lq.expectConvertDisabledWithRequirementNote();
    });

    await test.step('Clicking it does nothing; the Lead stays at Lead', async () => {
      await lq.attemptConvertWhileDisabled();
      await lq.reloadOnTab();
      await lq.expectStageIsLead();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test('TC:17 Verify a Web Form Lead Converts to a Qualified Lead After a Review', async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytem', 'TC:17 (ClickUp)');
    test.slow();

    const lead = await createOwnWebFormLead(page, createCustomerPage);
    await lq.openAndReadQualification(lead.id);
    const review = {
      department: 'Sales',
      manager: 'Alice Planner',
      score: 8,
      review: `Ready to qualify ${Date.now()}`,
    };

    await test.step('Convert enables once a review is saved', async () => {
      await lq.expectConvertDisabledWithRequirementNote();
      await lq.submitReview(review);
      await lq.expectConvertEnabled();
    });

    await test.step('Converting moves the Lead to Qualified Lead, on the record and in the Customers list', async () => {
      await lq.convertToQualifiedLead();
      await lq.expectStageIsQualifiedLead();
      await lq.expectReviewRowVisible(review);
      await lq.expectCustomersListStage(lead.name, 'Qualified Lead');
    });

    // "Form card still stored, unchanged" can't apply to a lead created via
    // Create Customer (it has no submission); it is checked on an already
    // converted ingested Web Form record in TC:18.
  });

  test('TC:18 Verify the Qualification Screen Is Read-Only After the Lead Leaves the Lead Stage', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytep', 'TC:18 (ClickUp)');

    await test.step('Converted ingested Web Form record: form card and reviews still readable', async () => {
      const data = await openSeedLead(lq, 'convertedWithForm');
      expect(data.stageLabel).not.toBe('Lead');
      const submission = lq.latestSubmission(data);
      await lq.expectFormCardIsFirstCard(submission.originLabel);
      await lq.expectFormCardFieldsMatch(submission.formData);
      await lq.expectReviewCount(data.reviews.length);
    });

    await test.step('No review input, no Save, no review edit, no Convert', async () => {
      await lq.expectQualificationInputsUnavailable();
    });

    await test.step('Converted record with an AI dossier: AI sections still readable, inputs still absent', async () => {
      const data = await openSeedLead(lq, 'convertedWithDossier');
      expect(data.stageLabel).not.toBe('Lead');
      for (const title of DEV_AI_SECTION_TITLES) await lq.expectAiSectionWithContent(title);
      await lq.expectQualificationInputsUnavailable();
    });

    // AI Chatbot on a Qualified Lead: skipped on request (2026-10-21). The
    // Assistant button no longer shows on a Qualified Lead on dev, and the
    // intended behaviour there is still being confirmed with the team.
    partial(
      'AI Chatbot on a Qualified Lead not checked (skipped on request, 2026-10-21): the Assistant button is not shown on dev.',
    );
  });

  test('TC:19 Verify the Acknowledgement Email Is Sent and Traceable from the Lead', async ({
    leadQualificationPage: lq,
    customerCommunicationPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyteq', 'TC:19 (ClickUp)');

    await test.step("BUG: an ingested Web Form Lead's Communication > Emails holds no acknowledgement email", async () => {
      await openSeedLead(lq, 'noPhone');
      await customerCommunicationPage.openFromCustomerDetail(WEB_FORM_LEADS.noPhone.id);
      await customerCommunicationPage.selectSubTab('emails');
      await customerCommunicationPage.expectEmailsEmptyState();
    });

    partial(
      `Receipt in the submitter's inbox is not exercised: ${SUBMISSION_UNAVAILABLE} It also needs the submitter's mailbox, which automation doesn't have.`,
    );
  });

  test('TC:20 Verify Each Web Form Submission Creates Its Own Lead with Its Own Form Card', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyter', 'TC:20 (ClickUp)');

    const a = await test.step('Lead A shows only its own submission', async () => {
      const data = await openSeedLead(lq, 'allFields');
      const submission = lq.latestSubmission(data);
      await lq.expectFormCardFieldsMatch(submission.formData);
      await lq.expectFullMessageShownSeparately(submission.formData.message!);
      await lq.expectFormCardSourceAndSubmittedAt(submission);
      return submission;
    });

    await test.step('Lead B shows only its own submission, nothing from Lead A', async () => {
      const data = await openSeedLead(lq, 'allFieldsOther');
      const submission = lq.latestSubmission(data);
      expect(submission.formData.company_name).not.toBe(a.formData.company_name);
      await lq.expectFormCardFieldsMatch(submission.formData);
      await lq.expectFullMessageShownSeparately(submission.formData.message!);
      await lq.expectFormCardSourceAndSubmittedAt(submission);
      await lq.expectFormCardNotContaining([a.formData.company_name!, a.formData.sender_email!]);
    });

    await test.step('Observed: repeat submissions from the same company land on ONE lead, which shows only the latest card', async () => {
      const data = await openSeedLead(lq, 'twoSubmissions');
      expect(data.webFormSubmissions.length).toBeGreaterThan(1);
      const latest = lq.latestSubmission(data);
      await lq.expectFormCardIsFirstCard(latest.originLabel);
      await lq.expectFormCardFieldsMatch(latest.formData);
      await lq.expectFormCardSourceAndSubmittedAt(latest);
    });

    partial(
      `Checked on existing ingested Leads; two new back-to-back submissions are not exercised: ${SUBMISSION_UNAVAILABLE}`,
    );
  });
});
