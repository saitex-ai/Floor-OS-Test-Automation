import * as allure from 'allure-js-commons';
import type { Page } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { partial } from '../../../src/utils/test-annotations';
import type { CreateCustomerPage } from '../../../src/pages/crm/create-customer.page';
import {
  SOCIAL_MEDIA_POST_AI_SECTIONS,
  type SocialLeadQualificationData,
  type SocialMediaLeadQualificationPage,
  type SocialPost,
} from '../../../src/pages/crm/social-media-lead-qualification.page';
import seed from '../../../src/data/crm/social-media-leads.data.json';

/**
 * CRM — [Origin Type = Social Media Post] Lead Qualification (Sprint 5).
 *
 * Source of truth: ClickUp test-case set https://app.clickup.com/t/z941abzjg7
 * (user story https://app.clickup.com/t/86eye4dtz, notification subtask
 * https://app.clickup.com/t/86eypejnd). Written against dev on 2026-10-23 —
 * see test-cases/crm/social-media-lead-qualification.md.
 *
 * Display TCs run READ-ONLY on the existing Social Media Post records in
 * src/data/crm/social-media-leads.data.json (Nudie Jeans: the only one with
 * a captured post; Testing Two: no post). Both are Qualified Leads — dev
 * has no Social Media Post Lead at the Lead stage with a captured post —
 * so the display TCs record that as `partial`. The tab's own GET
 * `/lead-qualification` payload is the record of what was captured.
 *
 * TCs that write (save reviews, convert) run on a Social Media Post Lead
 * this spec creates through Create Customer ("Playwright Regression
 * SocialMedia LQ <ts>", Origin "Instagram Post", CRM Stage Lead). Such a
 * Lead has no captured post and no AI sections.
 *
 * Nothing is sent to a social channel: "View on the platform" only opens
 * the post in a new tab, which is closed untouched.
 *
 * Known failures (TC:3 capture date, TC:7 View on the platform not
 * clickable past the Lead stage, TC:10 AI sections not drawing on the
 * post) assert the story/prototype behaviour and are marked `test.fail()`
 * with the reason and the ClickUp test case (no bug logged: needs a bug
 * or a PO decision). The failing check is the last one in each test.
 */

const SEED = seed;
type SeedKey = 'withPost' | 'noPost';

const NO_LEAD_STAGE_POST =
  'Dev (2026-10-23) has no Social Media Post Lead at the Lead stage with a captured post; ' +
  'checked on Nudie Jeans, which is already a Qualified Lead.';

/** Marks the test as a known failure: the reason plus the ClickUp test case it is tracked on. */
function knownFailure(reason: string, clickUpTestCase: string): void {
  test.fail(true, `${reason} (${clickUpTestCase})`);
}

/** Opens a seed record's Lead Qualification tab, or skips (naming it) when it's gone or has moved stage. */
async function openSeed(
  lq: SocialMediaLeadQualificationPage,
  key: SeedKey,
): Promise<SocialLeadQualificationData> {
  const record = SEED[key];
  const replace = ` — replace "${key}" in src/data/crm/social-media-leads.data.json.`;
  const data = await lq.openSocialLead(record.id);
  test.skip(
    data === null,
    `Seed record "${record.name}" (${record.id}) no longer exists${replace}`,
  );
  test.skip(
    data!.stageLabel !== record.stage,
    `Seed record "${record.name}" is now at stage "${data!.stageLabel}", not "${record.stage}"${replace}`,
  );
  test.skip(
    key === 'withPost' && data!.socialInteractions.length === 0,
    `Seed record "${record.name}" has no captured post any more${replace}`,
  );
  expect(data!.originTypeLabel).toBe('Social Media Post');
  return data!;
}

function firstPost(data: SocialLeadQualificationData): SocialPost {
  expect(data.socialInteractions.length, 'Lead has no captured post').toBeGreaterThan(0);
  return data.socialInteractions[0]!;
}

/** Creates a Social Media Post Lead owned by this spec (no captured post, no AI sections). */
async function createOwnSocialMediaPostLead(
  page: Page,
  createCustomerPage: CreateCustomerPage,
  lq: SocialMediaLeadQualificationPage,
): Promise<{ id: string; name: string }> {
  const ts = Date.now();
  const name = `Playwright Regression SocialMedia LQ ${ts}`;
  await createCustomerPage.openFromCrmHome();
  await lq.waitForCreateCustomerForm();
  await createCustomerPage.fillProfile({
    name,
    email: `pw-regression-smp-lq-${ts}@example.com`,
    city: 'Coimbatore',
    country: 'India',
    originType: 'Social Media Post',
    origin: 'Instagram Post',
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

test.describe('CRM - [Origin Type = Social Media Post] Lead Qualification', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('[Origin Type = Social Media Post] Lead Qualification');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify a Social Media Post Lead Opens with the Posts Card as the First Card', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjg8', 'TC:1 (ClickUp)');

    const data = await openSeed(lq, 'withPost');

    await test.step('The record is a Social Media Post Lead with a captured post', async () => {
      expect(data.originTypeLabel).toBe('Social Media Post');
      firstPost(data);
    });

    await test.step('Exactly one Posts card, first on the tab, above Customer Info', async () => {
      await lq.expectPostsCardIsFirstCard();
      await expect(lq.locators.cardHeadings.nth(1)).toHaveText('Customer Info');
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:2 Verify the Posts Card Is Marked as the Origin of the Lead', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjg9', 'TC:2 (ClickUp)');

    await openSeed(lq, 'withPost');

    await test.step('Titled "Posts" with the Origin badge; no AI section carries it', async () => {
      await lq.expectPostsCardMarkedOrigin();
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:3 Verify Each Captured Post Shows the Author, Handle, Channel and Date', async ({
    socialMediaLeadQualificationPage: lq,
    socialMediaListeningPage: listening,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzjga';
    await allure.tms(tc, 'TC:3 (ClickUp)');
    knownFailure(
      "Known failure: the story asks for the date the post was captured; dev shows the post's own posted " +
        'date and stores no capture date. No bug logged; needs a bug or a PO decision',
      tc,
    );

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);

    await test.step('Initials avatar, author name, then "@handle · Channel · date"', async () => {
      await lq.expectPostAuthorLine(lq.postEntry(0), post);
    });

    await test.step('Same author, handle and channel as on Social Media Listening', async () => {
      await listening.open();
      await listening.expectPostRow(post, SEED.withPost.name);
    });

    await test.step('The date shown is when the post was captured', async () => {
      await lq.readSocialLead(SEED.withPost.id);
      await lq.expectPostShowsCaptureDate(lq.postEntry(0), post);
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:4 Verify the Complete Post Text Is Shown Without Truncation', async ({
    socialMediaLeadQualificationPage: lq,
    socialMediaListeningPage: listening,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgc', 'TC:4 (ClickUp)');

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);

    await test.step('The full post text, word for word, with no ellipsis, clamp or "see more"', async () => {
      await lq.expectFullPostText(lq.postEntry(0), post);
    });

    await test.step('Same text as the post details on Social Media Listening', async () => {
      await listening.gotoPost(post);
      await listening.expectPostDetails(post, {
        name: SEED.withPost.name,
        code: SEED.withPost.code,
        stage: SEED.withPost.stage,
      });
      expect(await listening.postDetailsText()).toBe(post.content.text.trim());
    });

    partial(
      `Only a short post is available on dev (${post.content.text.length} characters); ` +
        'no post over ~250 characters to check long-text truncation. ' +
        NO_LEAD_STAGE_POST,
    );
  });

  test('TC:5 Verify the Relevancy Reasoning Is Shown Separately from the Post Text', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgd', 'TC:5 (ClickUp)');

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);

    await test.step('A shaded "Relevancy" block under the post text holds the reasoning only', async () => {
      expect(post.relevancy.length).toBeGreaterThan(0);
      await lq.expectRelevancySeparate(lq.postEntry(0), post);
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:6 Verify the Captured Post and Its Metadata Cannot Be Edited', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgg', 'TC:6 (ClickUp)');

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);

    await test.step('No inputs or edit icons; typing over author, text and relevancy changes nothing', async () => {
      await lq.expectPostReadOnly(lq.postEntry(0), post);
    });

    await test.step('After a reload the post shows the same values', async () => {
      const again = await lq.readSocialLead(SEED.withPost.id);
      expect(again.socialInteractions).toEqual(data.socialInteractions);
      await lq.expectPostAuthorLine(lq.postEntry(0), post);
      await lq.expectFullPostText(lq.postEntry(0), post);
    });

    partial(
      `${NO_LEAD_STAGE_POST} On a Qualified Lead the whole tab is read-only, so this does not show ` +
        'that the Posts card itself is read-only at the Lead stage.',
    );
  });

  test('TC:7 Verify View on the Platform Opens the Post in a New Tab and Leaves CRM Intact', async ({
    page,
    socialMediaLeadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzjgh';
    await allure.tms(tc, 'TC:7 (ClickUp)');
    knownFailure(
      'Known failure: past the Lead stage the Lead Qualification tab has pointer-events: none, so a user ' +
        "can't click View on the platform, although viewing the post is not a change. No bug logged; " +
        'needs a bug or a PO decision',
      tc,
    );

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);
    const crmUrl = page.url();

    await test.step('The post opens on its channel in a new tab (closed without interacting)', async () => {
      const popup = await lq.openPostOnPlatform(lq.postEntry(0));
      await expect.poll(() => popup.url(), { timeout: 30_000 }).toContain(post.content.url);
      await popup.close();
    });

    await test.step("The CRM tab stays on the same Lead's Lead Qualification tab", async () => {
      expect(page.url()).toBe(crmUrl);
      await lq.expectPostsCardIsFirstCard();
      await lq.expectFullPostText(lq.postEntry(0), post);
    });

    await test.step('A user can click View on the platform (the steps above activate it programmatically)', async () => {
      await lq.expectViewOnPlatformClickable(lq.postEntry(0));
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:8 Verify No Comment or Message Action Is Offered on the Post', async ({
    page,
    createCustomerPage,
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgj', 'TC:8 (ClickUp)');
    test.slow();

    const data = await openSeed(lq, 'withPost');

    await test.step('The only action on the post is View on the platform; no sent comments or messages', async () => {
      expect(firstPost(data).responses).toEqual([]);
      await lq.expectOnlyViewOnPlatformAction();
    });

    await test.step("At the Lead stage the only text box on the tab is the Manager's review", async () => {
      const lead = await createOwnSocialMediaPostLead(page, createCustomerPage, lq);
      await lq.readSocialLead(lead.id);
      await lq.expectOnlyViewOnPlatformAction();
      await lq.expectOnlyReviewTextbox();
    });

    partial(
      `${NO_LEAD_STAGE_POST} The Lead-stage check uses a Lead this spec creates, which has no captured post.`,
    );
  });

  test('TC:9 Verify the Contact Info AI Section Is Not Shown and the AI Sections Start at Customer Info', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgk', 'TC:9 (ClickUp)');

    const data = await openSeed(lq, 'withPost');

    await test.step('No Contact Info section, although the AI found company contact details', async () => {
      expect(data.dossier?.payload?.contactInfo?.length ?? 0).toBeGreaterThan(0);
      await lq.expectAiSectionAbsent('Contact Info');
    });

    await test.step('Customer Info is the first AI section, directly below the Posts card', async () => {
      await lq.expectPostsCardIsFirstCard();
      await expect(lq.locators.cardHeadings.nth(1)).toHaveText('Customer Info');
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:10 Verify the AI Sections Appear in Order and Draw on the Captured Post', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    const tc = 'https://app.clickup.com/t/z941abzjgm';
    await allure.tms(tc, 'TC:10 (ClickUp)');
    knownFailure(
      "Known failure: the AI sections don't draw on the captured post — Customer Info is the crawl " +
        'detection summary word for word, and the post\'s topic ("One Wash", rinse) is in no AI section. ' +
        'No bug logged; needs a bug or a PO decision',
      tc,
    );

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);

    await test.step('Posts, Customer Info, Financial Standpoint, Product Range, Business Compatibility Report, then the review card', async () => {
      await lq.expectCardsInOrder(SOCIAL_MEDIA_POST_AI_SECTIONS);
      await lq.expectAiSectionsGenerated(SOCIAL_MEDIA_POST_AI_SECTIONS);
      await lq.expectOverallCompatibilityScore();
    });

    await test.step('The sections are about the brand that published the post', async () => {
      await expect(lq.social.aiSection('Customer Info')).toContainText(
        post.content.author.handle.replace(/^@/, ''),
        { ignoreCase: true },
      );
    });

    await test.step("The sections reflect the captured post's topic (One Wash / rinse)", async () => {
      await lq.expectAiSectionsMentionAny(['One Wash', 'rinse']);
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:11 Verify No Web Form or Crawl Detection Section Appears on a Social Media Post Lead', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgn', 'TC:11 (ClickUp)');

    const data = await openSeed(lq, 'withPost');

    await test.step('No web-form, crawl, Messages or Comments card; Posts is the only origin card', async () => {
      // Nudie Jeans has a stored crawl detection: it must not be rendered.
      expect(data.crawlDetection).toBeTruthy();
      expect(data.webFormSubmissions).toEqual([]);
      await lq.expectNoOtherOriginContent(data);
    });

    partial(NO_LEAD_STAGE_POST);
  });

  test('TC:12 Verify the Relevancy Reasoning Can Be Refined with the AI Chatbot Markup Tool', async () => {
    test.fixme(
      true,
      'Needs a Social Media Post Lead at the Lead stage with a captured post, and dev has none (2026-10-23): ' +
        'Nudie Jeans is a Qualified Lead (no Assistant button), and a Lead created through Create Customer has no post. ' +
        'An enhancement is a write, so it is not tried on records this suite did not create.',
    );
    await allure.tms('https://app.clickup.com/t/z941abzjgp', 'TC:12 (ClickUp)');
  });

  test('TC:13 Verify an AI Section Pointer Can Be Refined and Is Marked Enhanced', async ({
    page,
    createCustomerPage,
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgq', 'TC:13 (ClickUp)');
    test.slow();

    const lead = await createOwnSocialMediaPostLead(page, createCustomerPage, lq);
    const data = await lq.readSocialLead(lead.id);

    await test.step('AI Chatbot opens on a Social Media Post Lead with its greeting, and the Markup tool switches on (nothing sent)', async () => {
      expect(data.originTypeLabel).toBe('Social Media Post');
      await lq.openAiChatbot();
      await lq.expectAiChatbotGreeting(lead.name);
      await lq.turnOnMarkupTool();
      await lq.expectAiChatbotAcceptsInput();
    });

    partial(
      'Refining a Customer Info pointer, the "✦ Enhanced" mark and its persistence are not exercised: a Social Media ' +
        'Post Lead created by this suite gets no AI sections (no dossier, state "idle"), and the records that have them ' +
        '(Nudie Jeans, Testing Two) are Qualified Leads this suite does not modify.',
    );
  });

  test('TC:14 Verify the Posts Card States That No Posts Have Been Captured', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgr', 'TC:14 (ClickUp)');

    const data = await openSeed(lq, 'noPost');

    await test.step('Posts is still first, with the Origin badge', async () => {
      expect(data.socialInteractions).toEqual([]);
      await lq.expectPostsCardIsFirstCard();
      await lq.expectPostsCardMarkedOrigin();
    });

    await test.step('It reads "No posts captured yet." with no empty post shell or button', async () => {
      await lq.expectNoPostsCaptured();
    });

    await test.step('The AI sections still render below it', async () => {
      await lq.expectCardsInOrder(SOCIAL_MEDIA_POST_AI_SECTIONS);
      await lq.expectAiSectionsGenerated(SOCIAL_MEDIA_POST_AI_SECTIONS);
    });
  });

  test('TC:15 Verify Every Captured Post Is Listed When the Lead Has More Than One', async () => {
    test.fixme(
      true,
      'Dev (2026-10-23) has no Social Media Post Lead with two or more captured posts (Nudie Jeans has one); ' +
        'posts are only captured by Social Media Listening, which a test cannot trigger.',
    );
    await allure.tms('https://app.clickup.com/t/z941abzjgt', 'TC:15 (ClickUp)');
  });

  test("TC:16 Verify Manager's Review and Score Mandatory Field Validation", async ({
    page,
    createCustomerPage,
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgu', 'TC:16 (ClickUp)');
    test.slow();

    const lead = await createOwnSocialMediaPostLead(page, createCustomerPage, lq);
    await lq.readSocialLead(lead.id);

    await test.step('Save with every field empty: four field errors, nothing saved', async () => {
      await lq.expectReviewsHeader('No reviews yet. Any manager may review, for any department.');
      await lq.attemptSaveBlank();
      await lq.expectReviewFieldErrors();
      await lq.expectReviewsHeader('No reviews yet. Any manager may review, for any department.');
    });
  });

  test('TC:17 Verify a Saved Review Is Listed with Department, Manager, Score and Timestamp', async ({
    page,
    createCustomerPage,
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgv', 'TC:17 (ClickUp)');
    test.slow();

    const lead = await createOwnSocialMediaPostLead(page, createCustomerPage, lq);
    await lq.readSocialLead(lead.id);
    const first = review(
      'Sales',
      'Alice Planner',
      7,
      'Social Media Post lead review — denim wash fit.',
    );
    const second = review('Fabric Mill', 'CRM Manager', 8, 'Second Social Media Post review');

    await test.step('Save a review: listed with manager, department, "7 / 10", Saved timestamp; the form clears', async () => {
      await lq.submitReview(first);
      await lq.expectReviewCount(1);
      await lq.expectReviewFormCleared();
      await lq.expectReviewRowVisible(first);
      expect(await lq.newestReviewSavedTimestamp()).toMatch(/^Saved \d/);
    });

    await test.step('Add a second review for another department; header reads 2 review(s) saved', async () => {
      await lq.submitReview(second);
      await lq.expectReviewCount(2);
      await lq.expectReviewFormCleared();
      await lq.expectReviewsHeader(
        '2 review(s) saved. Any manager may add another, for any department.',
      );
    });

    await test.step('Both reviews are still listed after a reload', async () => {
      await lq.reloadOnTab();
      await lq.expectReviewCount(2);
      await lq.expectReviewRowVisible(first);
      await lq.expectReviewRowVisible(second);
    });
  });

  test("TC:18 Verify Conversion Is Blocked Until a Manager's Review Exists", async ({
    page,
    createCustomerPage,
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgw', 'TC:18 (ClickUp)');
    test.slow();

    const lead = await createOwnSocialMediaPostLead(page, createCustomerPage, lq);
    await lq.readSocialLead(lead.id);

    await test.step('Convert is disabled, with the reason on hover', async () => {
      await lq.expectConvertDisabledWithRequirementNote();
    });

    await test.step('Clicking it does nothing; the Lead stays at Lead', async () => {
      await lq.attemptConvertWhileDisabled();
      const after = await lq.readSocialLead(lead.id);
      expect(after.stageLabel).toBe('Lead');
      await lq.expectStageIsLead();
      await lq.expectNoReviewsEmptyState();
    });
  });

  test("TC:19 Verify the Lead Converts to Qualified Lead After a Manager's Review", async ({
    page,
    createCustomerPage,
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgx', 'TC:19 (ClickUp)');
    test.slow();

    const lead = await createOwnSocialMediaPostLead(page, createCustomerPage, lq);
    await lq.readSocialLead(lead.id);
    const saved = review('Merchandise', 'Alice Planner', 8, 'Ready to qualify');

    await test.step('Convert enables once a review is saved', async () => {
      await lq.submitReview(saved);
      await lq.expectReviewCount(1);
      await lq.expectConvertEnabled();
    });

    await test.step('Converting moves the Lead to Qualified Lead, in the header and on Overview', async () => {
      await lq.convertToQualifiedLead();
      await lq.expectStageIsQualifiedLead();
      const after = await lq.readSocialLead(lead.id);
      expect(after.stageLabel).toBe('Qualified Lead');
      await lq.expectOverviewCrmStage('Qualified Lead');
    });

    await test.step('The Posts card and the saved review are kept', async () => {
      await lq.expectPostsCardIsFirstCard();
      await lq.expectNoPostsCaptured();
      await lq.expectReviewCount(1);
      await lq.expectReviewRowVisible(saved);
    });

    partial(
      'The Lead this suite creates has no captured post and no AI sections, so "kept unchanged" is checked on the ' +
        'empty Posts card and the review only.',
    );
  });

  test('TC:20 Verify the Screen Is Read-Only After the Lead Leaves the Lead Stage', async ({
    socialMediaLeadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgy', 'TC:20 (ClickUp)');

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);

    await test.step('The Posts card, every AI section and the saved reviews are readable', async () => {
      await lq.expectFullPostText(lq.postEntry(0), post);
      await expect(lq.social.relevancyText(lq.postEntry(0))).toHaveText(post.relevancy.join(' '));
      for (const title of SOCIAL_MEDIA_POST_AI_SECTIONS) await lq.expectAiSectionWithContent(title);
      expect(data.reviews.length).toBeGreaterThan(0);
      await lq.expectReviewCount(data.reviews.length);
    });

    await test.step('No review form, Save, review edit or Convert', async () => {
      await lq.expectQualificationInputsUnavailable();
    });

    await test.step('No Assistant (AI Chatbot) button, and no comment or message can be sent', async () => {
      await lq.expectAssistantNotOffered();
      await lq.expectOnlyViewOnPlatformAction();
      await expect(lq.social.tabRoot.getByRole('textbox')).toHaveCount(0);
    });
  });

  test('TC:21 Verify the Lead Opens on Lead Qualification from Its Post on Social Media Listening', async ({
    page,
    socialMediaLeadQualificationPage: lq,
    socialMediaListeningPage: listening,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzjgz', 'TC:21 (ClickUp)');

    const data = await openSeed(lq, 'withPost');
    const post = firstPost(data);
    const lead = SEED.withPost;

    await test.step('Social Media Listening: open the post', async () => {
      await listening.open();
      await listening.openPost(post, lead.name);
    });

    await test.step('Post details show the post, View Post on Social Media, AI relevancy reasoning and the Lead card', async () => {
      await listening.expectPostDetails(post, {
        name: lead.name,
        code: lead.code,
        stage: lead.stage,
      });
    });

    await test.step('Clicking the Lead opens its Lead Qualification tab with the same post', async () => {
      await listening.openLeadFromPostDetails();
      await expect(page).toHaveURL(new RegExp(`/crm/customers/${lead.id}\\?tab=leadqual`));
      await lq.expectPostsCardIsFirstCard();
      await lq.expectFullPostText(lq.postEntry(0), post);
      await lq.expectPostAuthorLine(lq.postEntry(0), post);
    });
  });

  test('TC:22 Verify CRM Users Are Notified When a Lead Is Created from a Social Media Post', async () => {
    test.fixme(
      true,
      'Needs Social Media Listening to capture a new relevant post that raises a new Social Media Post Lead; ' +
        'a test cannot trigger a capture, and none happened on dev during the run (no "New lead captured" ' +
        "notification on 2026-10-23). The Managers' mailbox is not reachable from the suite either.",
    );
    await allure.tms('https://app.clickup.com/t/z941abzjh0', 'TC:22 (ClickUp)');
  });
});
