import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { partial } from '../../../src/utils/test-annotations';
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
 * Known failures (details in the .md): dev doesn't render the crawl
 * detection at all — no crawl origin card, so no source/cohort, detection
 * date or detection summary on the tab (TC:1–5, TC:9); no Sales Pitch
 * Recommendation section (TC:7); no author on a saved review (TC:15).
 * Those TCs assert the story's behaviour and are marked `test.fail()`
 * with the reason and a link, so they flip to "unexpectedly passed" once
 * dev delivers it. The failing check is the last one in each test, so the
 * checks before it still run. No bug is logged for them (needs a bug or a
 * PO decision); the link is the ClickUp test case.
 */

const WEB_CRAWLED_LEADS = seed.webCrawledLeads;
type SeedLeadKey = keyof typeof WEB_CRAWLED_LEADS;

/** The AI sections dev renders for a Web Crawled Lead (2026-10-22): everything but Contact Info. */
const WEB_CRAWLED_AI_SECTIONS = DEV_AI_SECTION_TITLES.filter((t) => t !== 'Contact Info');

const NO_CRAWL_CARD =
  'Known failure: dev renders no crawl origin card — the stored crawl detection (source, cohort, detection ' +
  'date, summary) is in the tab data but not shown on the Lead Qualification tab. No bug logged; needs a ' +
  'bug or a PO decision';

/** Marks the test as a known failure: the reason plus the ClickUp test case it is tracked on. */
function knownFailure(reason: string, clickUpTestCase: string): void {
  test.fail(true, `${reason} (${clickUpTestCase})`);
}

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

/**
 * Resolves several seed Leads before any assertion runs, so a missing or
 * moved seed skips the test up front rather than after real checks have
 * passed. Leaves the last one open; open the others with
 * lq.openAndReadQualification().
 */
async function openSeedLeads<K extends SeedLeadKey>(
  lq: LeadQualificationPage,
  keys: readonly K[],
): Promise<Record<K, LeadQualificationData>> {
  const all = {} as Record<K, LeadQualificationData>;
  for (const key of keys) all[key] = await openSeedLead(lq, key);
  return all;
}

function detectionOf(data: LeadQualificationData): CrawlDetection {
  expect(data.crawlDetection, 'Lead has no stored crawl detection').toBeTruthy();
  return data.crawlDetection!;
}

/** Creates a Web Crawled Lead owned by this spec (no crawl detection, no AI dossier, no contact). */
async function createOwnWebCrawledLead(
  createCustomerPage: CreateCustomerPage,
): Promise<{ id: string; name: string }> {
  const ts = Date.now();
  const name = `Playwright Regression WebCrawled LQ ${ts}`;
  await createCustomerPage.openFromCrmHome();
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
  const id = await createCustomerPage.saveAndOpenDetail();
  return { id, name };
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
    const tc = 'https://app.clickup.com/t/z941abzh3x';
    await allure.tms(tc, 'TC:1 (ClickUp)');
    knownFailure(NO_CRAWL_CARD, tc);

    const data = await openSeedLead(lq, 'crawled');

    await test.step('The crawler-created Lead is a Web Crawled Lead at the Lead stage, with a stored crawl detection', async () => {
      expect(data.stageLabel).toBe('Lead');
      const detection = detectionOf(data);
      expect(detection.detectionSummary.length).toBeGreaterThan(0);
    });

    await test.step('Exactly one crawl card, and it is the first card, above Customer Info', async () => {
      await lq.expectCrawlCardFirst();
    });
  });

  test('TC:2 Verify the Crawl Card Names the Crawl Source or Cohort and Is Marked as the Origin', async ({
    leadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzh3y';
    await allure.tms(tc, 'TC:2 (ClickUp)');
    knownFailure(NO_CRAWL_CARD, tc);

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('The tab data holds the crawl source and cohort', async () => {
      expect(detection.sourceDomain).toMatch(/^https?:\/\//);
      expect(detection.intentLabel.trim()).not.toBe('');
    });

    await test.step('An "Origin"-marked crawl card names the crawled site or the cohort', async () => {
      await lq.expectCrawlCardNamesSource(detection);
    });
  });

  test('TC:3 Verify the Crawl Card Shows the Detection Date', async ({
    leadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzh3z';
    await allure.tms(tc, 'TC:3 (ClickUp)');
    knownFailure(NO_CRAWL_CARD, tc);

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('The tab data holds the detection date', async () => {
      expect(Number.isNaN(Date.parse(detection.detectedAt))).toBe(false);
    });

    await test.step('The crawl card shows the stored detection date', async () => {
      await lq.expectCrawlCardDate(detection);
    });
  });

  test('TC:4 Verify the Full Detection Summary, Including the Matched Signal, Is Shown Without Truncation', async ({
    leadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzh40';
    await allure.tms(tc, 'TC:4 (ClickUp)');
    knownFailure(NO_CRAWL_CARD, tc);

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step('Every summary line, incl. the matched signal, is on the crawl card in full', async () => {
      await lq.expectCrawlCardFullSummary(detection);
    });
  });

  test('TC:5 Verify the Crawl Card Cannot Be Edited', async ({ leadQualificationPage: lq }) => {
    const tc = 'https://app.clickup.com/t/z941abzh41';
    await allure.tms(tc, 'TC:5 (ClickUp)');
    knownFailure(NO_CRAWL_CARD, tc);
    test.slow();

    const data = await openSeedLead(lq, 'crawled');
    const detection = detectionOf(data);

    await test.step("The only editable box on the tab is the Manager's review", async () => {
      await lq.expectNoReplyComposer();
    });

    await test.step('The crawl card has no input, button or edit icon, and typing into it changes nothing', async () => {
      await lq.expectCrawlCardReadOnly();
    });

    await test.step('After a reload the card still shows the stored detection', async () => {
      const again = await lq.openAndReadQualification(WEB_CRAWLED_LEADS.crawled.id);
      expect(again.crawlDetection).toEqual(detection);
      await lq.expectCrawlCardFullSummary(detection);
    });
  });

  test('TC:6 Verify the Contact Info AI Section Is Not Shown on a Web Crawled Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh42', 'TC:6 (ClickUp)');
    test.slow();

    const keys = ['crawled', 'crawledRich'] as const;
    const leads = await openSeedLeads(lq, keys);

    // crawledRich is open; check it first, then reopen crawled.
    for (const key of [...keys].reverse()) {
      await test.step(`${WEB_CRAWLED_LEADS[key].name}: no Contact Info section although the AI found company contact details`, async () => {
        if (key !== keys[keys.length - 1])
          await lq.openAndReadQualification(WEB_CRAWLED_LEADS[key].id);
        // The dossier does carry contact pointers (company email/phone) —
        // the UI leaves them out, as the story asks.
        expect(leads[key].dossier?.payload?.contactInfo?.length ?? 0).toBeGreaterThan(0);
        await lq.expectAiSectionAbsent('Contact Info');
      });
    }
  });

  test('TC:7 Verify the AI Sections Open at Customer Info and Appear in Order', async ({
    leadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzh43';
    await allure.tms(tc, 'TC:7 (ClickUp)');
    knownFailure(
      'Known failure: the story lists a Sales Pitch Recommendation AI section; dev (and the prototype) ' +
        "don't show one (the dossier's pitch is empty). No bug logged; needs a bug or a PO decision",
      tc,
    );

    await openSeedLead(lq, 'crawledRich');

    await test.step('Customer Info, Financial Standpoint, Product Range and Business Compatibility Report, none blank', async () => {
      await lq.expectFirstCard('Customer Info');
      for (const title of WEB_CRAWLED_AI_SECTIONS) await lq.expectAiSectionNotBlank(title);
      await lq.expectAiSectionAbsent('Contact Info');
    });

    await test.step('Then Sales Pitch Recommendation (not blank), then the review card', async () => {
      await lq.expectAiSectionsInOrder([...WEB_CRAWLED_AI_SECTIONS, 'Sales Pitch Recommendation']);
      await lq.expectAiSectionNotBlank('Sales Pitch Recommendation');
    });
  });

  test('TC:8 Verify the AI Sections Are Generated from the Crawl Detection and Public Company Data', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh44', 'TC:8 (ClickUp)');
    test.slow();

    const keys = ['crawled', 'crawledRich'] as const;
    const leads = await openSeedLeads(lq, keys);

    await test.step('Financial Standpoint and Product Range carry public company data', async () => {
      // crawledRich is the one open now.
      await lq.expectAiSectionNotBlank("Customer's Financial Standpoint");
      await lq.expectAiSectionNotBlank("Customer's Product Range");
    });

    for (const key of [...keys].reverse()) {
      await test.step(`${WEB_CRAWLED_LEADS[key].name}: Customer Info and Business Compatibility Report reflect the crawl detection`, async () => {
        if (key !== keys[keys.length - 1])
          await lq.openAndReadQualification(WEB_CRAWLED_LEADS[key].id);
        const detection = detectionOf(leads[key]);
        const described = detection.detectionSummary.filter((line) => !/^[a-z ]+ fit: /.test(line));
        expect(described.length).toBeGreaterThan(0);
        await lq.expectAiSectionShowsPointers('Customer Info', described);
        await lq.expectCompatibilityFromDetection(detection);
      });
    }

    partial(
      'Whether the Financial Standpoint / Product Range facts are correct for the company (public data) is not checked — only that they are shown.',
    );
  });

  test('TC:9 Verify the Screen Makes Clear the Lead Came from Crawler Detection, Not Inbound Contact', async ({
    leadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzh45';
    await allure.tms(tc, 'TC:9 (ClickUp)');
    knownFailure(
      `${NO_CRAWL_CARD} — so nothing on the tab says the Lead came from the crawler (only the Overview tab does)`,
      tc,
    );

    await openSeedLead(lq, 'crawled');

    await test.step('Nothing on the tab implies the prospect contacted SAITEX or was answered', async () => {
      await lq.expectNoInboundContactWording();
    });

    await test.step('Overview: Origin Type Web Crawled, Created By CRM (the crawler)', async () => {
      await lq.expectOverviewShowsSystemOrigin('Web Crawled');
    });

    await test.step('The crawl card, marked as the origin, says the Lead was found by the crawler', async () => {
      await lq.expectCrawlCardSaysCrawler();
    });
  });

  test('TC:10 Verify No Web Form, Social Messages, Comments or Captured Posts Appear on a Web Crawled Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh46', 'TC:10 (ClickUp)');
    test.slow();

    const keys = ['crawled', 'crawledRich'] as const;
    const leads = await openSeedLeads(lq, keys);
    for (const key of keys) {
      if (leads[key].socialInteractions.length === 0) {
        partial(
          `Seed lead "${WEB_CRAWLED_LEADS[key].name}" no longer has captured social posts — the "posts not shown" half is not exercised for it.`,
        );
      }
    }

    for (const key of [...keys].reverse()) {
      await test.step(`${WEB_CRAWLED_LEADS[key].name}: no form card, no social sections, none of the captured posts shown`, async () => {
        if (key !== keys[keys.length - 1])
          await lq.openAndReadQualification(WEB_CRAWLED_LEADS[key].id);
        await lq.expectNoFormCard();
        await lq.expectNoSocialOriginContent(leads[key]);
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
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4b', 'TC:14 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(createCustomerPage);
    await lq.openAndReadQualification(lead.id);

    await test.step('Save with every field empty: four field errors, nothing saved', async () => {
      await lq.attemptSaveBlank();
      await lq.expectFieldValidationErrors();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test("TC:15 Verify a Saved Manager's Review Is Listed with Department, Reviewer, Score and Timestamp", async ({
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzh4c';
    await allure.tms(tc, 'TC:15 (ClickUp)');
    knownFailure(
      "Known failure: the AC asks for the review's author; dev shows the selected Manager only, with no " +
        'separate author ("saved by") on the row. No bug logged; needs a bug or a PO decision',
      tc,
    );
    test.slow();

    const lead = await createOwnWebCrawledLead(createCustomerPage);
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
      await lq.expectReviewRowVisible(saved);
      expect(await lq.newestReviewSavedTimestamp()).toMatch(/^Saved \d/);
      await lq.reloadOnTab();
      await lq.expectReviewCount(1);
      await lq.expectReviewRowVisible(saved);
    });

    await test.step('The row also shows who saved the review (the author)', async () => {
      await lq.expectReviewRowShowsAuthor(saved);
    });
  });

  test('TC:16 Verify All Recorded Reviews Are Listed', async ({
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4d', 'TC:16 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(createCustomerPage);
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
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4e', 'TC:17 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(createCustomerPage);
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
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4f', 'TC:18 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(createCustomerPage);
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
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4g', 'TC:19 (ClickUp)');
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
      const lead = await createOwnWebCrawledLead(createCustomerPage);
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
    createCustomerPage,
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzh4k', 'TC:22 (ClickUp)');
    test.slow();

    const lead = await createOwnWebCrawledLead(createCustomerPage);
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
