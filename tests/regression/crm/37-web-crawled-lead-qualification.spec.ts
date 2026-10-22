import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { devGap, partial } from '../../../src/utils/test-annotations';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import {
  DEV_AI_SECTION_TITLES,
  type CrawlDetection,
  type LeadQualificationData,
  type LeadQualificationPage,
} from '../../../src/pages/crm/lead-qualification.page';
import seed from '../../../src/data/crm/seed-records.data.json';

/**
 * CRM — [Origin Type = Web Crawled] Lead Qualification (Sprint 5).
 *
 * Source of truth: ClickUp test-case set https://app.clickup.com/t/z941abzh3w
 * (user story https://app.clickup.com/t/86eye4dtr). Written against dev on
 * 2026-10-22 — see test-cases/crm/web-crawled-lead-qualification.md.
 *
 * Display TCs run READ-ONLY on Web Crawled Leads the crawler created on
 * dev (Created By "CRM"), using the tab's own GET `/lead-qualification`
 * payload (the request the UI makes) as the record of what was detected.
 * Nothing in this spec writes to them.
 *
 * TCs that write (save reviews, convert) run on a Web Crawled Lead this
 * spec creates itself through Create Customer. Such a Lead has no crawl
 * detection and no AI dossier, so the AI Chatbot "apply an enhancement"
 * step of TC:13 can't be done on a Lead we own (recorded as partial).
 *
 * Headline dev findings (details in the .md): dev doesn't render the crawl
 * detection at all — no crawl origin card, so no source/cohort, detection
 * date or detection summary on the tab (TC:1–5, TC:9). Those steps are
 * titled "Dev gap", assert what dev does today, and carry a `dev-gap`
 * annotation; they fail once the card ships, to be switched over then.
 */

const WEB_CRAWLED_LEADS = seed.webCrawledLeads;
type SeedLeadKey = keyof typeof WEB_CRAWLED_LEADS;

/** The AI sections dev renders for a Web Crawled Lead (2026-10-22): everything but Contact Info. */
const WEB_CRAWLED_AI_SECTIONS = DEV_AI_SECTION_TITLES.filter((t) => t !== 'Contact Info');

const NO_CRAWL_CARD =
  'Dev (2026-10-22) renders no crawl origin card: the stored crawl detection (source, cohort, detection date, ' +
  'summary) is in the tab data but not shown anywhere on the Lead Qualification tab.';

/**
 * Opens a seed Web Crawled record's Lead Qualification tab and returns the
 * tab's own GET payload — or skips the test, naming the record, when it no
 * longer exists, has left the stage the data file gives, or (for a
 * crawler-created Lead) has no stored crawl detection.
 */
async function openSeedLead(
  lq: LeadQualificationPage,
  key: SeedLeadKey,
): Promise<LeadQualificationData> {
  const lead = WEB_CRAWLED_LEADS[key];
  const replace = ` — replace webCrawledLeads.${key} in src/data/crm/seed-records.data.json.`;
  const data = await lq.tryOpenAndReadQualification(lead.id);
  test.skip(
    data === null,
    `Seed Web Crawled record "${lead.name}" (${lead.id}) no longer exists on this environment${replace}`,
  );
  test.skip(
    data!.stageLabel !== lead.stage,
    `Seed Web Crawled record "${lead.name}" (${lead.id}) is now at stage "${data!.stageLabel}", not "${lead.stage}"${replace}`,
  );
  test.skip(
    key !== 'converted' && !data!.crawlDetection,
    `Seed Web Crawled Lead "${lead.name}" (${lead.id}) has no stored crawl detection${replace}`,
  );
  expect(data!.originTypeLabel).toBe('Web Crawled');
  return data!;
}

function detectionOf(data: LeadQualificationData): CrawlDetection {
  expect(data.crawlDetection, 'Lead has no stored crawl detection').toBeTruthy();
  return data.crawlDetection!;
}

/** Creates a Web Crawled Lead owned by this spec (no crawl detection, no AI dossier, no contact). */
async function createOwnWebCrawledLead(
  page: Page,
  createCustomerPage: CreateCustomerPage,
  lq: LeadQualificationPage,
): Promise<{ id: string; name: string }> {
  const ts = Date.now();
  const name = `Playwright Regression WebCrawled LQ ${ts}`;
  await createCustomerPage.openFromCrmHome();
  await lq.waitForCreateCustomerForm();
  await createCustomerPage.fillProfile({
    name,
    email: `pw-regression-wc-lq-${ts}@example.com`,
    city: 'Coimbatore',
    country: 'India',
    originType: 'Web Crawled',
    origin: 'Established Brand',
    buyer: 'Fabric',
    crmStage: 'Lead',
  });
  await createCustomerPage.saveAndOpenDetail();
  return { id: page.url().split('/').pop()!, name };
}

const review = (department: string, manager: string, score: number, text: string) => ({
  department,
  manager,
  score,
  review: `${text} ${Date.now()}`,
});

test.describe('CRM - [Origin Type = Web Crawled] Lead Qualification', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('[Origin Type = Web Crawled] Lead Qualification');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify a Web Crawled Lead Opens with the Crawl Detection Card as the First Card', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh3x', 'TC:1 (ClickUp)');

    const data = await openSeedLead(lq, 'crawled');

    await test.step('The crawler-created Lead is a Web Crawled Lead at the Lead stage, with a stored crawl detection', async () => {
      expect(data.stageLabel).toBe('Lead');
      const detection = detectionOf(data);
      expect(detection.detectionSummary.length).toBeGreaterThan(0);
    });

    await test.step('Dev gap: no crawl card is shown — the first card is Customer Info', async () => {
      devGap(NO_CRAWL_CARD + ' The first card is "Customer Info".');
      await lq.expectNoCrawlCardRendered(detectionOf(data));
      await lq.expectFirstCard('Customer Info');
    });
  });

  test('TC:2 Verify the Crawl Card Names the Crawl Source or Cohort and Is Marked as the Origin', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh3y', 'TC:2 (ClickUp)');

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('The tab data holds the crawl source and cohort', async () => {
      expect(detection.sourceDomain).toMatch(/^https?:\/\//);
      expect(detection.intentLabel.trim()).not.toBe('');
    });

    await test.step('Dev gap: neither the crawled site nor the cohort is shown, and no card is marked Origin', async () => {
      devGap(
        `${NO_CRAWL_CARD} Not shown: source "${detection.sourceDomain}", cohort "${detection.intentLabel}", "Origin" marker.`,
      );
      await lq.expectNoCrawlCardRendered(detection);
    });
  });

  test('TC:3 Verify the Crawl Card Shows the Detection Date', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh3z', 'TC:3 (ClickUp)');

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('The tab data holds the detection date', async () => {
      expect(Number.isNaN(Date.parse(detection.detectedAt))).toBe(false);
    });

    await test.step('Dev gap: the detection date is not shown on the tab', async () => {
      devGap(`${NO_CRAWL_CARD} Not shown: detection date ${detection.detectedAt}.`);
      await lq.expectNoCrawlCardRendered(detection);
    });
  });

  test('TC:4 Verify the Full Detection Summary, Including the Matched Signal, Is Shown Without Truncation', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh40', 'TC:4 (ClickUp)');

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('Dev gap: the detection summary is not shown as such — its matched-signal lines appear nowhere', async () => {
      devGap(
        `${NO_CRAWL_CARD} The company-description lines of the summary do show up as Customer Info pointers, ` +
          'but the matched-signal lines ("product fit: …") are not shown as written.',
      );
      await lq.expectNoCrawlCardRendered(detection);
      await lq.expectDetectionSignalLinesNotShown(detection);
    });
  });

  test('TC:5 Verify the Crawl Card Cannot Be Edited', async ({ leadQualificationPage: lq }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh41', 'TC:5 (ClickUp)');
    test.slow();

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('Dev gap: there is no crawl card to check', async () => {
      devGap(`${NO_CRAWL_CARD} The card's read-only treatment can't be checked until it's shown.`);
      await lq.expectNoCrawlCardRendered(detection);
    });

    await test.step("The only editable box on the tab is the Manager's review, and the stored detection is unchanged after a reload", async () => {
      await lq.expectNoReplyComposer();
      const again = await lq.openAndReadQualification(WEB_CRAWLED_LEADS.crawled.id);
      expect(again.crawlDetection).toEqual(detection);
    });
  });

  test('TC:6 Verify the Contact Info AI Section Is Not Shown on a Web Crawled Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh42', 'TC:6 (ClickUp)');
    test.slow();

    for (const key of ['crawled', 'crawledRich'] as const) {
      await test.step(`${WEB_CRAWLED_LEADS[key].name}: no Contact Info section although the AI found company contact details`, async () => {
        const data = await openSeedLead(lq, key);
        // The dossier does carry contact pointers (company email/phone) —
        // the UI leaves them out, as the story asks.
        expect(data.dossier?.payload?.contactInfo?.length ?? 0).toBeGreaterThan(0);
        await lq.expectAiSectionAbsent('Contact Info');
        await lq.expectFirstCard('Customer Info');
      });
    }
  });

  test('TC:7 Verify the AI Sections Open at Customer Info and Appear in Order', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh43', 'TC:7 (ClickUp)');

    await openSeedLead(lq, 'crawledRich');

    await test.step('Customer Info, Financial Standpoint, Product Range, Business Compatibility Report, then the review card', async () => {
      await lq.expectAiSectionsInOrder(WEB_CRAWLED_AI_SECTIONS);
    });

    await test.step('No section is blank', async () => {
      for (const title of WEB_CRAWLED_AI_SECTIONS) await lq.expectAiSectionNotBlank(title);
    });

    await test.step('As on dev: "Business Compatibility Report" (story: "Compatibility"), no "Sales Pitch Recommendation"', async () => {
      // Same as the prototype; the story lists Sales Pitch Recommendation —
      // flagged in the .md for confirmation.
      await lq.expectAiSectionAbsent('Compatibility');
      await lq.expectAiSectionAbsent('Sales Pitch Recommendation');
    });
  });

  test('TC:8 Verify the AI Sections Are Generated from the Crawl Detection and Public Company Data', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh44', 'TC:8 (ClickUp)');
    test.slow();

    for (const key of ['crawled', 'crawledRich'] as const) {
      await test.step(`${WEB_CRAWLED_LEADS[key].name}: Customer Info and Business Compatibility Report reflect the crawl detection`, async () => {
        const data = await openSeedLead(lq, key);
        const detection = detectionOf(data);
        const described = detection.detectionSummary.filter((line) => !/^[a-z ]+ fit: /.test(line));
        expect(described.length).toBeGreaterThan(0);
        await lq.expectAiSectionShowsPointers('Customer Info', described);
        await lq.expectCompatibilityFromDetection(detection);
      });
    }

    await test.step('Financial Standpoint and Product Range carry public company data', async () => {
      await openSeedLead(lq, 'crawledRich');
      await lq.expectAiSectionNotBlank("Customer's Financial Standpoint");
      await lq.expectAiSectionNotBlank("Customer's Product Range");
    });

    partial(
      'Whether the Financial Standpoint / Product Range facts are correct for the company (public data) is not checked — only that they are shown.',
    );
  });

  test('TC:9 Verify the Screen Makes Clear the Lead Came from Crawler Detection, Not Inbound Contact', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh45', 'TC:9 (ClickUp)');

    const data = await openSeedLead(lq, 'crawled');

    await test.step('Nothing on the tab implies the prospect contacted SAITEX or was answered', async () => {
      await lq.expectNoInboundContactWording();
    });

    await test.step('Dev gap: nothing on the tab says the Lead came from the crawler', async () => {
      devGap(
        `${NO_CRAWL_CARD} Only the Overview tab says Origin Type "Web Crawled", Created By "CRM".`,
      );
      await lq.expectNoCrawlCardRendered(detectionOf(data));
    });

    await test.step('Overview: Origin Type Web Crawled, created by the system (CRM)', async () => {
      await lq.expectOverviewShowsSystemOrigin('Web Crawled');
    });
  });

  test('TC:10 Verify No Web Form, Social Messages, Comments or Captured Posts Appear on a Web Crawled Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh46', 'TC:10 (ClickUp)');
    test.slow();

    for (const key of ['crawled', 'crawledRich'] as const) {
      await test.step(`${WEB_CRAWLED_LEADS[key].name}: no form card, no social sections, none of the captured posts shown`, async () => {
        const data = await openSeedLead(lq, key);
        if (data.socialInteractions.length === 0) {
          partial(
            `Seed lead "${WEB_CRAWLED_LEADS[key].name}" no longer has captured social posts — the "posts not shown" half is not exercised for it.`,
          );
        }
        await lq.expectNoFormCard();
        await lq.expectNoSocialOriginContent(data);
      });
    }
  });

  test('TC:11 Verify No Reply, Comment or Message Composer Is Offered on a Web Crawled Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh47', 'TC:11 (ClickUp)');

    await openSeedLead(lq, 'crawled');

    await test.step("No Reply / Comment / Send control; the only text box is the Manager's review", async () => {
      await lq.expectNoReplyComposer();
    });
  });

  test('TC:12 Verify No Automated Acknowledgement Is Sent to the Prospect', async ({
    leadQualificationPage: lq,
    customerCommunicationPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh49', 'TC:12 (ClickUp)');
    test.slow();

    await openSeedLead(lq, 'crawled');

    await test.step('Communication: nothing logged and no email involving the customer', async () => {
      await customerCommunicationPage.openFromCustomerDetail(WEB_CRAWLED_LEADS.crawled.id);
      await customerCommunicationPage.expectLoggedCommunicationsEmptyState();
      await customerCommunicationPage.selectSubTab('emails');
      await customerCommunicationPage.expectEmailsEmptyState();
    });

    partial(
      "The prospect's own inbox can't be checked; only that the Lead records no acknowledgement or other communication.",
    );
  });

  test('TC:13 Verify an AI Pointer Can Be Refined with the AI Chatbot Markup Tool and Is Marked Enhanced', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4a', 'TC:13 (ClickUp)');
    test.fixme(
      true,
      "Dev run 2026-10-22: the Lead Qualification read for HIMDENIM didn't arrive within 120 s (CRM stuck loading), so the AI Chatbot step never ran. Passed in the earlier probe; re-enable once dev is responsive.",
    );

    await test.step('AI Chatbot opens on a Web Crawled Lead and the Markup tool can be switched on (nothing sent)', async () => {
      await openSeedLead(lq, 'crawled');
      await lq.openAiChatbot();
      await lq.expectAiChatbotGreeting(WEB_CRAWLED_LEADS.crawled.name);
      await lq.turnOnMarkupTool();
      await lq.expectAiChatbotAcceptsInput();
    });

    partial(
      'Applying an enhancement, the "✦ Enhanced" mark and its persistence are not exercised: that writes to the AI dossier, ' +
        "the Web Crawled Leads with AI sections are shared crawler-created records this suite doesn't modify, and a Lead " +
        'this suite creates gets no AI sections ("Get Dossier" returned nothing within 5 min on 2026-10-22).',
    );
  });

  test("TC:14 Verify Manager's Review and Score Mandatory Field Validation", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4b', 'TC:14 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
    await lq.openAndReadQualification(lead.id);

    await test.step('Save with every field empty: four field errors, nothing saved', async () => {
      await lq.attemptSaveBlank();
      await lq.expectFieldValidationErrors();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test("TC:15 Verify a Saved Manager's Review Is Listed with Department, Reviewer, Score and Timestamp", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4c', 'TC:15 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
    await lq.openAndReadQualification(lead.id);
    const saved = review(
      'Fabric Mill',
      'Alice Planner',
      8,
      'Web Crawled lead review — strong denim fit.',
    );

    await test.step('Save a review; the form clears', async () => {
      await lq.submitReview(saved);
      await lq.expectReviewCount(1);
      await lq.expectReviewFormCleared();
    });

    await test.step('The row shows manager, department, score, timestamp and text — and survives a reload', async () => {
      // Dev shows the selected Manager only; there's no separate author.
      await lq.expectReviewRowVisible(saved);
      expect(await lq.newestReviewSavedTimestamp()).toMatch(/^Saved \d/);
      await lq.reloadOnTab();
      await lq.expectReviewCount(1);
      await lq.expectReviewRowVisible(saved);
    });
  });

  test('TC:16 Verify All Recorded Reviews Are Listed', async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4d', 'TC:16 (ClickUp)');
    test.fixme(
      true,
      "Dev run 2026-10-22: Create Customer never loaded — the shell sat on its sign-in gate for 60 s while opening /crm/customers, so the test Lead couldn't be created. Not a functional result; re-enable once dev is responsive.",
    );
    test.slow();

    const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
    await lq.openAndReadQualification(lead.id);
    const first = review('Costing', 'Alice Planner', 6, 'First Web Crawled review');
    const second = review('Sales', 'CRM Manager', 9, 'Second Web Crawled review');

    await test.step('Save two reviews for different departments and managers', async () => {
      await lq.submitReview(first);
      await lq.expectReviewCount(1);
      await lq.submitReview(second);
      await lq.expectReviewCount(2);
    });

    await test.step('Both are listed with their own details', async () => {
      await lq.expectReviewRowVisible(first);
      await lq.expectReviewRowVisible(second);
      await lq.reloadOnTab();
      await lq.expectReviewCount(2);
    });
  });

  test("TC:17 Verify Conversion Is Blocked Until a Manager's Review and Score Exists", async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4e', 'TC:17 (ClickUp)');
    test.fixme(
      true,
      'Dev run 2026-10-22: page.goto /crm/customers failed with net::ERR_NETWORK_CHANGED while creating the test Lead. Not a functional result; re-enable once dev is responsive.',
    );
    test.slow();

    const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
    await lq.openAndReadQualification(lead.id);

    await test.step('Convert is disabled with the reason on hover', async () => {
      await lq.expectConvertDisabledWithRequirementNote();
    });

    await test.step('Clicking it does nothing; the Lead stays at Lead', async () => {
      await lq.attemptConvertWhileDisabled();
      await lq.reloadOnTab();
      await lq.expectStageIsLead();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test('TC:18 Verify a Web Crawled Lead Converts to a Qualified Lead After a Review', async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4f', 'TC:18 (ClickUp)');
    test.fixme(
      true,
      'Dev run 2026-10-22: dev timed out (locator.waitFor 60 s on the shell sign-in gate) while creating the test Lead. Not a functional result; re-enable once dev is responsive.',
    );
    test.slow();

    const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
    await lq.openAndReadQualification(lead.id);
    const saved = review('Sales', 'Alice Planner', 8, 'Ready to qualify');

    await test.step('Convert enables once a review is saved', async () => {
      await lq.expectConvertDisabledWithRequirementNote();
      await lq.submitReview(saved);
      await lq.expectConvertEnabled();
    });

    await test.step('Converting moves the Lead to Qualified Lead, on the record and in the Customers list', async () => {
      await lq.convertToQualifiedLead();
      await lq.expectStageIsQualifiedLead();
      await lq.expectReviewRowVisible(saved);
      await lq.expectCustomersListStage(lead.name, 'Qualified Lead');
    });
  });

  test('TC:19 Verify a Web Crawled Lead with No Identifiable Contact Qualifies and Converts on Company Information Alone', async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4g', 'TC:19 (ClickUp)');
    test.fixme(
      true,
      "Dev run 2026-10-22: the lead-qualification read for CURVJEANS LLC didn't arrive within 120 s, then the shell sign-in gate timed out (60 s). Not a functional result; re-enable once dev is responsive.",
    );
    test.slow();

    await test.step('Crawler-created Lead with no contact: company AI sections, review form and Convert are all there', async () => {
      await openSeedLead(lq, 'noContact');
      await lq.expectContactCount(0);
      await lq.expectAiSectionsInOrder(WEB_CRAWLED_AI_SECTIONS);
      await lq.expectAiSectionNotBlank('Customer Info');
      await lq.expectReviewAndConvertAvailable();
      await lq.expectConvertDisabledWithRequirementNote();
    });

    await test.step('A Web Crawled Lead with no contact converts after one review', async () => {
      const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
      await lq.openAndReadQualification(lead.id);
      await lq.expectContactCount(0);
      await lq.submitReview(review('Merchandise', 'Alice Planner', 7, 'Company-level fit only'));
      await lq.expectConvertEnabled();
      await lq.convertToQualifiedLead();
      await lq.expectStageIsQualifiedLead();
    });
  });

  test('TC:20 Verify the Qualification Screen Is Read-Only After the Lead Leaves the Lead Stage', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4h', 'TC:20 (ClickUp)');

    const data = await openSeedLead(lq, 'converted');

    await test.step('AI sections and saved reviews are still readable', async () => {
      expect(data.reviews.length).toBeGreaterThan(0);
      for (const title of WEB_CRAWLED_AI_SECTIONS) await lq.expectAiSectionNotBlank(title);
      await lq.expectAiSectionAbsent('Contact Info');
      await lq.expectReviewCount(data.reviews.length);
    });

    await test.step('No review input, no Save, no review edit, no Convert', async () => {
      await lq.expectQualificationInputsUnavailable();
    });

    // Team rule: AI Chatbot availability on a Qualified Lead is not part of this check.
  });

  test('TC:21 Verify AI Sections with No Public Data Show the No-Information Message', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4j', 'TC:21 (ClickUp)');
    test.fixme(
      true,
      "Dev run 2026-10-22: twice the Kings Of Indigo page didn't load in time (lead-qualification read > 120 s, then the shell sign-in gate > 60 s). Not a functional result — a manual look on dev showed both no-information messages; re-enable once dev is responsive.",
    );

    const data = await openSeedLead(lq, 'sparse');

    await test.step('Customer Info and Financial Standpoint show their no-information message', async () => {
      expect(data.dossier?.payload?.customerInfo?.points ?? []).toHaveLength(0);
      await lq.expectNoRelevantInformation('Customer Info', 'Customer Info');
      await lq.expectNoRelevantInformation(
        "Customer's Financial Standpoint",
        "Customer's Financial Standpoint",
      );
    });

    await test.step('Every section still has content, and the Lead can still be reviewed', async () => {
      await lq.expectAiSectionsInOrder(WEB_CRAWLED_AI_SECTIONS);
      for (const title of WEB_CRAWLED_AI_SECTIONS) await lq.expectAiSectionNotBlank(title);
      await lq.expectReviewAndConvertAvailable();
    });
  });

  test('TC:22 Verify a Web Crawled Lead Without a Stored Crawl Detection Shows No Crawl Card and No AI Sections Yet', async ({
    page,
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4k', 'TC:22 (ClickUp)');
    test.fixme(
      true,
      'Dev run 2026-10-22: dev timed out (locator.waitFor 60 s on the shell sign-in gate) while creating the test Lead. Not a functional result; re-enable once dev is responsive.',
    );
    test.slow();

    const lead = await createOwnWebCrawledLead(page, createCustomerPage, lq);
    const data = await lq.openAndReadQualification(lead.id);

    await test.step('No crawl detection, no crawl card, no Contact Info, and the no-dossier empty state', async () => {
      expect(data.originTypeLabel).toBe('Web Crawled');
      expect(data.crawlDetection ?? null).toBeNull();
      await lq.expectNoCrawlCard();
      await lq.expectAiSectionAbsent('Contact Info');
      await lq.expectNoDossierEmptyState();
    });

    await test.step('The review card and a disabled Convert are still shown', async () => {
      await lq.expectNoReviewsEmptyState();
      await lq.expectConvertDisabled();
    });
  });
});
