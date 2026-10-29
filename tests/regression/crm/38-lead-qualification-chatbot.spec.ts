import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { partial } from '../../../src/utils/test-annotations';
import {
  AI_REPLY_TIMEOUT,
  DEV_AI_SECTION_TITLES,
  type DossierSnapshot,
  type LeadQualificationData,
  type LeadQualificationPage,
} from '../../../src/pages/crm/lead-qualification.page';
import seed from '../../../src/data/crm/seed-records.data.json';

/**
 * CRM — Lead Qualification Chatbot (Sprint 5).
 *
 * Source of truth: ClickUp test-case set https://app.clickup.com/t/z941abytkq
 * (user story https://app.clickup.com/t/86eye4dt9). Confirmed against dev
 * on 2026-10-22 and re-checked 2026-10-29 — see
 * test-cases/crm/lead-qualification-chatbot.md.
 *
 * DATA — read before running. This suite writes to ONE seeded Lead, a
 * documented exception to "tests create their own data":
 * - A Lead this suite could create can't get an AI dossier (Get Dossier on
 *   a test-created lead did nothing for 5+ min), so every TC that needs
 *   pointers runs on `webFormLeads.leadWithDossier` ("Highland Apparel
 *   Partners", id 214abd8a-dab1-40bc-b4c8-2232855831cd, stage Lead) in
 *   src/data/crm/seed-records.data.json. Only that Lead receives prompts.
 * - Every test that sends a prompt (not only the ones expected to enhance)
 *   registers for afterEach's revert: if the AI enhances a pointer anyway,
 *   it is reverted through "Revert to the previous wording". afterEach then
 *   reloads the Lead and checks the API's `enhancedLocators` is `[]`, no
 *   "✦ Enhanced" marker is left, and every section reads exactly as before
 *   the test.
 * - A prompting test only starts on a clean Lead (no enhanced pointer).
 *   On a dirty Lead it skips, AND logs a console warning plus a "leftover
 *   enhancement" annotation naming the leftover pointers, so it is never
 *   silent. A failed revert in afterEach is reported the same way and
 *   fails the test. Clean the Lead with the recipe below before re-running.
 * - Prompts are tagged "[QA-AUTO] " so they read as automation in any
 *   prompt log (checked 2026-10-29: the tag does not stop the AI enhancing).
 * - Nothing else is written: no reviews, no Convert, no stage change.
 *
 * NO REVERT BUTTON on two sections: Customer's Product Range (its Most /
 * Least expensive lines) and Business Compatibility Report rows get no
 * "Revert to the previous wording" button when enhanced, so the suite never
 * sends a refinement to them (TC:10). They were enhanced ONCE on 2026-10-22
 * and restored with the revert API the button itself calls. The same recipe
 * cleans any leftover enhancement (from those sections, a failed revert or
 * an interrupted run):
 *
 *   # 1. Sign in to https://dev.flooros.app, open DevTools > Network, click
 *   #    any /api/crm/ request and copy its "Authorization" header value.
 *   TOKEN='Bearer <paste the token>'
 *   API=https://dev.flooros.app/api/crm/customers/214abd8a-dab1-40bc-b4c8-2232855831cd
 *   # 2. List what is still enhanced (line locators):
 *   curl -s -H "Authorization: $TOKEN" "$API/lead-qualification" | jq -r '.enhancedLocators[]'
 *   # 3. Revert each one, then repeat step 2 until it prints nothing:
 *   for L in $(curl -s -H "Authorization: $TOKEN" "$API/lead-qualification" | jq -r '.enhancedLocators[]'); do
 *     curl -s -X POST -H "Authorization: $TOKEN" -H 'Content-Type: application/json' \
 *       -d "{\"locator\":\"$L\"}" "$API/lead-dossier/enhancements/revert"; echo
 *   done
 *
 * (Body confirmed 2026-10-29: `{"locator":"<line locator>"}`, answered 200
 * with `{pointer, section, revertedTo, revertedAt}`.)
 *
 * SERIAL — the tests share that one Lead, so they run one at a time
 * (`mode: 'serial'`). NOTHING ELSE may run against "Highland Apparel
 * Partners" at the same time: no second run of this spec, no other spec or
 * worker using `leadWithDossier`, and no person prompting or reverting on
 * it. Run it on its own with `--workers=1`.
 *
 * KNOWN BUG: TC:2's ⌖ target controls stay on every pointer after the
 * chatbot is closed — https://app.clickup.com/t/z941ac05fc. TC:2 is split:
 * the checks dev passes are a normal test, and the failing check alone is
 * a `test.fail()` test with the same TC id and ClickUp link.
 *
 * KNOWN FAILURE (no bug logged yet): since the 2026-10-29 dev deploy the
 * Business Compatibility Report rows get no ⌖ target with the Markup tool
 * on. TC:2/6/7 check the other four sections; the Compatibility check is a
 * separate TC:6 `test.fail()` test. The same deploy hid "Send" until the
 * prompt has text and added "New chat" / earlier conversations — UI only.
 *
 * TIMEOUTS: dev took 35–60 s to render a Customer page and 20–70 s per AI
 * reply on 2026-10-22, hence the per-describe timeout below and the long
 * waits inside the page object (AI_REPLY_TIMEOUT etc.).
 */

const LEAD = seed.webFormLeads.leadWithDossier;
/** Lead B for TC:19 — any other Lead; only its chatbot is opened (nothing sent). */
const OTHER_LEAD = seed.webFormLeads.allFields;
/** A record already converted to Qualified Lead, with a dossier (TC:23, read-only). */
const CONVERTED = seed.webFormLeads.convertedWithDossier;

/** Opening a Customer page on dev took up to ~60 s on 2026-10-22 (slow "Loading CRM…"). */
const PAGE_TIMEOUT = 180_000;

/** Marks every prompt as automation's (see the file comment). */
const qa = (prompt: string): string => `[QA-AUTO] ${prompt}`;

/** A refinement the AI reliably applies (a visible, fact-keeping rewrite). */
const REFINE = qa("Rewrite this line so it starts with 'Note:' and keep every fact.");

/**
 * Sections whose pointers get a ⌖ target control on dev. Since the
 * 2026-10-29 dev deploy the Business Compatibility Report rows have none
 * (5 scored rows, 0 targets; they had one each on 2026-10-22) — that check
 * is the TC:6 known-failure test below, so it can't hide the other checks.
 */
const TARGETABLE_SECTIONS = DEV_AI_SECTION_TITLES.filter(
  (s) => s !== 'Business Compatibility Report',
);
const TC6 = 'https://app.clickup.com/t/z941abytkx';

/** ClickUp TC:2, shared by its passing test and its known-bug test. */
const TC2 = 'https://app.clickup.com/t/z941abytkt';
const TC2_BUG = 'https://app.clickup.com/t/z941ac05fc';

/** Set while a test may have enhanced pointers on LEAD; afterEach reverts and checks against it. */
let prompting: DossierSnapshot | null = null;

/**
 * Makes leftover enhancements on LEAD visible: a console warning and an
 * annotation per pointer, pointing at the cleanup recipe in the file comment.
 */
function reportLeftovers(type: string, what: string, pointers: string[]): void {
  const message =
    `${what} on "${LEAD.name}" (${LEAD.id}): ${pointers.map((p) => `"${p}"`).join(', ')}. ` +
    'Clean the Lead with the revert recipe in the header of 38-lead-qualification-chatbot.spec.ts before the next run.';
  console.warn(`[38-lead-qualification-chatbot] ${type}: ${message}`);
  test.info().annotations.push({ type, description: message });
}

async function openLead(lq: LeadQualificationPage): Promise<LeadQualificationData> {
  const data = await lq.tryOpenAndReadQualificationPatiently(LEAD.id, PAGE_TIMEOUT);
  test.skip(
    data === null,
    `Seeded Lead "${LEAD.name}" (${LEAD.id}) no longer exists — replace webFormLeads.leadWithDossier ` +
      'in src/data/crm/seed-records.data.json.',
  );
  test.skip(
    data!.stageLabel !== LEAD.stage,
    `Seeded Lead "${LEAD.name}" is now at stage "${data!.stageLabel}", not "${LEAD.stage}" — replace ` +
      'webFormLeads.leadWithDossier in src/data/crm/seed-records.data.json.',
  );
  test.skip(data!.dossier === null, `Seeded Lead "${LEAD.name}" has no AI dossier any more.`);
  return data!;
}

/** Opens LEAD + the chatbot and returns the dossier as shown (for a test that sends nothing). */
async function openLeadWithChatbot(lq: LeadQualificationPage): Promise<DossierSnapshot> {
  await openLead(lq);
  await lq.openAiChatbot();
  return lq.snapshotDossier();
}

/**
 * For EVERY test that sends a prompt (whether or not it expects an
 * enhancement): requires a clean start (no enhanced pointer), opens the
 * chatbot, and registers the snapshot for afterEach's revert and check.
 */
async function startPrompting(lq: LeadQualificationPage): Promise<DossierSnapshot> {
  const data = await openLead(lq);
  const leftover = (data.enhancedLocators ?? []).map(String);
  if (leftover.length > 0) {
    const shown = await lq.enhancedPointerTexts();
    reportLeftovers('leftover enhancement', 'Enhanced before this test started', [
      ...shown,
      ...leftover.map((l) => `line locator ${l}`),
    ]);
  }
  test.skip(
    leftover.length > 0,
    `Seeded Lead "${LEAD.name}" already has ${leftover.length} enhanced pointer(s) that this test didn't ` +
      "make — clean it with the revert recipe in this file's header before running this suite.",
  );
  await lq.expectNoEnhancedMarkers();
  await lq.openAiChatbot();
  const snapshot = await lq.snapshotDossier();
  prompting = snapshot;
  return snapshot;
}

test.describe('CRM - Lead Qualification Chatbot', () => {
  // Shared seeded Lead — see the file comment: serial, and nothing else may
  // run against that Lead meanwhile. 12 min per test covers a slow page
  // load plus several AI replies and reverts on dev.
  test.describe.configure({ mode: 'serial', timeout: 12 * 60_000 });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Lead Qualification Chatbot');
    await allure.owner('CRM QA');
  });

  test.afterEach(async ({ leadQualificationPage: lq }) => {
    if (!prompting) return;
    const snapshot = prompting;
    prompting = null;
    // Reverting needs two fresh page loads plus one round-trip per pointer.
    test.info().setTimeout(test.info().timeout + 8 * 60_000);
    await lq.restoreAssistantRequests();
    await lq.tryOpenAndReadQualificationPatiently(LEAD.id, PAGE_TIMEOUT);
    const failed = await lq.revertAllEnhancements();
    if (failed.length > 0) reportLeftovers('cleanup failed', 'Could not revert', failed);
    expect(failed, 'every enhanced pointer is reverted').toEqual([]);

    // Re-read from the server: catches an enhancement with no revert button
    // (Product Range / Compatibility) as well as one the screen missed.
    const after = await lq.tryOpenAndReadQualificationPatiently(LEAD.id, PAGE_TIMEOUT);
    const left = (after?.enhancedLocators ?? []).map(String);
    const shown = await lq.enhancedPointerTexts();
    if (left.length > 0 || shown.length > 0) {
      reportLeftovers('cleanup failed', 'Still enhanced after reverting', [
        ...shown,
        ...left.map((l) => `line locator ${l}`),
      ]);
    }
    expect(left, 'the API lists no enhanced pointer').toEqual([]);
    await lq.expectNoEnhancedMarkers();
    const now = await lq.sectionTexts();
    const changed = DEV_AI_SECTION_TITLES.filter((s) => now[s] !== snapshot.sections[s]);
    if (changed.length > 0) {
      reportLeftovers('cleanup failed', 'Sections not reading as before the test', changed);
    }
    expect(now, 'every section reads as before the test').toEqual(snapshot.sections);
  });

  test('TC:1 Verify AI Chatbot Opens with an Opening Message Naming the Lead', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytkr', 'TC:1 (ClickUp)');

    await test.step('Open the Lead Qualification tab and click the Assistant button', async () => {
      await openLead(lq);
      await lq.openAiChatbot();
    });

    await test.step('Panel opens with the opening message naming the Lead, Markup tool, close, prompt and Send', async () => {
      // Dev labels the launcher "Assistant" and the button "Send" (ClickUp:
      // "Open AI Chatbot" / "Send prompt") — wording only.
      await lq.expectChatbotOpenedFor(LEAD.name);
    });
  });

  test('TC:2 Verify Closing the Chatbot Keeps the Qualification Screen Intact', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms(TC2, 'TC:2 (ClickUp)');

    const snapshot = await test.step('Open the chatbot and turn the Markup tool on', async () => {
      const s = await openLeadWithChatbot(lq);
      await lq.setMarkupTool(true);
      await lq.expectTargetControlsOnEveryPointer(TARGETABLE_SECTIONS);
      return s;
    });

    await test.step('Close the chatbot: screen intact, sections unchanged, Assistant button back', async () => {
      await lq.closeAiChatbot();
      await lq.expectQualificationScreenIntact();
      await lq.expectSectionsUnchanged(snapshot);
    });
  });

  test('TC:2 Verify Closing the Chatbot Keeps the Qualification Screen Intact — Known Bug: Target Controls Stay After Closing', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms(TC2, 'TC:2 (ClickUp)');
    await allure.issue(TC2_BUG, 'ClickUp bug z941ac05fc');
    test.info().annotations.push({ type: 'issue', description: TC2_BUG });
    // Only the failing check lives here; TC:2's passing checks are the test above.
    test.fail(
      true,
      'Known bug: the ⌖ target controls stay on every pointer after the chatbot is closed — https://app.clickup.com/t/z941ac05fc',
    );

    await openLead(lq);
    await lq.openAiChatbot();
    await lq.setMarkupTool(true);
    await expect(lq.locators.pointerTargets('Customer Info').first()).toBeVisible();
    await lq.closeAiChatbot();

    await test.step('After the chatbot is closed, no pointer shows a ⌖ target control', async () => {
      await lq.expectNoTargetControls();
    });
  });

  test('TC:3 Verify a General Prompt Is Answered Without Changing Any Content', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytku', 'TC:3 (ClickUp)');
    const prompt = qa(
      'What are the main risks with this lead? Answer briefly; do not change anything.',
    );

    const snapshot = await startPrompting(lq);
    const enhancements = lq.trackEnhancementRequests();

    await test.step('Send a general question with no target', async () => {
      await lq.expectNoTargetChip();
      const reply = await lq.askAndWaitForReply(prompt);
      expect(reply.trim().length, 'the AI answered').toBeGreaterThan(20);
    });

    await test.step('The prompt and the answer are in the thread', async () => {
      await lq.expectThreadMessages([prompt]);
      expect(await lq.threadRolesInOrder()).toEqual(['user', 'assistant']);
    });

    await test.step('No pointer changed and none is marked ✦', async () => {
      // Judged on the page's own enhancement requests, not the reply's wording.
      await lq.expectNoEnhancementWithin(enhancements);
      enhancements.dispose();
      await lq.expectNoEnhancedMarkers();
      await lq.expectSectionsUnchanged(snapshot);
    });
  });

  test('TC:4 Verify Pressing Enter Sends the Prompt Like the Send Button', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytkv', 'TC:4 (ClickUp)');
    const prompt = qa('In one short sentence: which city is this lead based in?');

    await startPrompting(lq);

    await test.step('Type a prompt and press Enter', async () => {
      await lq.sendPrompt(prompt, 'Enter');
    });

    await test.step('The prompt is in the thread, the input clears and an answer follows', async () => {
      await lq.expectThreadMessages([prompt]);
      await expect(lq.locators.aiChatbotPromptBox).toHaveValue('');
      await lq.waitForReplies(1);
      expect(await lq.threadRolesInOrder()).toEqual(['user', 'assistant']);
    });
  });

  test('TC:5 Verify Messages Appear in Order and the Thread Scrolls to the Latest', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytkw', 'TC:5 (ClickUp)');
    // Up to 9 AI round trips at 20–70 s each on dev.
    test.setTimeout(20 * 60_000);
    const prompts = [
      'In one short sentence: what does this lead buy?',
      'In one short sentence: where is the lead based?',
      'In one short sentence: what is the payment risk?',
      'In one short sentence: what is the overall compatibility score?',
      'In one short sentence: which product categories are listed?',
      'In one short sentence: what is the sourcing model?',
      'In one short sentence: what is the revenue trend?',
      'In one short sentence: what is the best outreach window?',
    ].map(qa);
    const sent: string[] = [];

    await startPrompting(lq);

    await test.step('Send prompts (at least 6) until the thread needs scrolling', async () => {
      for (const prompt of prompts) {
        await lq.askAndWaitForReply(prompt);
        sent.push(prompt);
        await lq.expectThreadScrolledToBottom();
        const s = await lq.threadScrollState();
        if (sent.length >= 6 && s.height > s.client) break;
      }
      const s = await lq.threadScrollState();
      expect(s.height, 'thread overflows its panel').toBeGreaterThan(s.client);
    });

    await test.step('Prompts and answers alternate in the order sent, newest at the bottom', async () => {
      await lq.expectThreadMessages(sent);
      expect(await lq.threadRolesInOrder()).toEqual(sent.flatMap(() => ['user', 'assistant']));
    });

    await test.step('Scroll up, send one more: the thread scrolls down to the new message', async () => {
      await lq.scrollThreadToTop();
      const last = qa('In one short sentence: what does the lead sell at the low end?');
      await lq.askAndWaitForReply(last);
      sent.push(last);
      await lq.expectThreadScrolledToBottom();
      await lq.expectThreadMessages(sent);
    });
  });

  test('TC:6 Verify Turning the Markup Tool On Shows Target Controls on Every Pointer', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms(TC6, 'TC:6 (ClickUp)');

    await openLead(lq);
    await lq.openAiChatbot();

    await test.step('Before: no pointer shows a ⌖ target control', async () => {
      await expect(lq.locators.markupToolButton).toHaveAttribute('aria-pressed', 'false');
      await lq.expectNoTargetControls();
    });

    await test.step('Markup tool on: toggle pressed, instruction shown, ⌖ on every pointer of every section', async () => {
      // Dev's instruction reads "Markup on — choose the line you want to
      // talk about." (ClickUp: "Markup ON — click ⌖ on any pointer to
      // select it for enhancement.") — wording only.
      await lq.setMarkupTool(true);
      await lq.expectTargetControlsOnEveryPointer(TARGETABLE_SECTIONS);
    });
  });

  test('TC:6 Verify Turning the Markup Tool On Shows Target Controls on Every Pointer — Known Failure: No Target on Business Compatibility Report Rows', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms(TC6, 'TC:6 (ClickUp)');
    await openLead(lq);
    await lq.openAiChatbot();
    // Known failure since the 2026-10-29 dev deploy: with the Markup tool on,
    // the Business Compatibility Report rows show no ⌖ target (they did on
    // 2026-10-22). No bug ticket yet; tracked on the TC itself. Flips to
    // "unexpectedly passed" once the targets are back.
    test.fail(
      true,
      `No ⌖ target on the Business Compatibility Report rows since the 2026-10-29 dev deploy (${TC6}) — confirm with the team and log a bug.`,
    );
    await lq.setMarkupTool(true);

    await test.step('Every Business Compatibility Report row has a ⌖ target control', async () => {
      await lq.expectTargetControlsOnEveryPointer(['Business Compatibility Report']);
    });
  });

  test('TC:7 Verify Turning the Markup Tool Off Removes the Target Controls', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytky', 'TC:7 (ClickUp)');

    await openLead(lq);
    await lq.openAiChatbot();
    await lq.setMarkupTool(true);
    await lq.expectTargetControlsOnEveryPointer(TARGETABLE_SECTIONS);

    await test.step('Toggle off: not pressed, instruction gone, no ⌖ on any pointer', async () => {
      await lq.setMarkupTool(false);
      await expect(lq.locators.aiChatbotIntro).toBeVisible();
      await lq.expectNoTargetControls();
    });
  });

  test('TC:8 Verify Selecting a Pointer Attaches It as the Active Target', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm0', 'TC:8 (ClickUp)');

    await openLead(lq);
    await lq.openAiChatbot();

    const text = await test.step('Markup on, click ⌖ on a Customer Info pointer', async () => {
      return lq.targetPointer('Customer Info', 0, 'click');
    });

    await test.step('Target shows "Customer Info: <pointer>" with a clear button; prompt asks how the line should change', async () => {
      // Dev: clear button "Stop pointing at this line", placeholder "How
      // should this line change?" (ClickUp: "Clear target", "How should I
      // enhance this pointer?") — wording only.
      await lq.focusPrompt();
      await lq.expectTargetChip('Customer Info', text);
    });
  });

  test('TC:9 Verify a Targeted Prompt Refines Only That Pointer and Marks It Enhanced', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm1', 'TC:9 (ClickUp)');
    test.slow();

    const snapshot = await startPrompting(lq);
    const original = await lq.targetPointer('Customer Info', 0);
    const enhancements = lq.trackEnhancementRequests();

    const result =
      await test.step('Send a refinement for the targeted Customer Info pointer', async () => {
        return lq.refineTargetedPointer(REFINE);
      });

    await test.step('The change is applied to that pointer, in Customer Info only', async () => {
      // The section is read from the page's own enhancement request, not
      // from the AI's reply text (its wording varies run to run).
      expect(enhancements.sections()).toEqual(['Customer Info']);
      enhancements.dispose();
      expect(result.section).toBe('Customer Info');
      expect(result.previousText).toBe(original);
      expect(result.newText).not.toBe(original);
    });

    await test.step('The refined pointer is in Customer Info, marked ✦; everything else is unchanged', async () => {
      await lq.expectPointerEnhanced(snapshot, 'Customer Info', 0, result.newText);
      await lq.expectEnhancedMarkerCount(1);
      await lq.expectSectionsUnchanged(snapshot, ['Customer Info']);
    });
  });

  test('TC:10 Verify Pointers in Every AI Section Can Be Refined', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm2', 'TC:10 (ClickUp)');
    // Three refinements (two agent runs each) plus three reverts on dev.
    test.setTimeout(25 * 60_000);
    const sections = ['Contact Info', 'Customer Info', "Customer's Financial Standpoint"];

    const snapshot = await startPrompting(lq);

    for (const section of sections) {
      await test.step(`Refine a pointer in "${section}"`, async () => {
        const original = await lq.targetPointer(section, 0);
        const enhancements = lq.trackEnhancementRequests();
        const result = await lq.refineTargetedPointer(REFINE);
        expect(enhancements.sections(), 'the enhancement went to the targeted section').toEqual([
          section,
        ]);
        enhancements.dispose();
        expect(result.section).toBe(section);
        expect(result.previousText).toBe(original);
        await lq.expectPointerEnhanced(snapshot, section, 0, result.newText);
      });
    }

    await test.step('One ✦ pointer in each of those sections', async () => {
      for (const section of sections) {
        await expect(lq.locators.enhancedMarkersIn(section)).toHaveCount(1);
      }
    });

    await test.step('A Product Range line can be targeted (not sent — see the note)', async () => {
      // Compatibility rows have no ⌖ target on dev since 2026-10-29 — see
      // the TC:6 known-failure test.
      await lq.targetPointer("Customer's Product Range", 0);
      await lq.clearTarget();
    });

    // Confirmed once on dev (2026-10-22): refining Product Range's "Most
    // expensive" line and the Compatibility "Sustainability match" row both
    // land in their own section marked ✦ — but those rows get NO "Revert to
    // the previous wording" button, so the UI can't restore the shared
    // seeded dossier (the API recipe in the file comment can).
    partial(
      "Refining Customer's Product Range and Business Compatibility Report pointers is not sent each run: dev " +
        'offers no "Revert to the previous wording" on those rows, so the shared seeded dossier could only be ' +
        'restored through the revert API (recipe in the spec header). It worked when tried once on 2026-10-22: ' +
        'each landed in its own section marked ✦.',
    );
  });

  test('TC:11 Verify the Target Is Released After a Prompt Is Sent', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm3', 'TC:11 (ClickUp)');
    test.slow();

    const snapshot = await startPrompting(lq);
    await lq.targetPointer('Customer Info', 1);
    const result = await lq.refineTargetedPointer(REFINE);
    await lq.expectPointerEnhanced(snapshot, 'Customer Info', 1, result.newText);

    await test.step('After sending, the target is gone and the placeholder is back', async () => {
      await lq.expectNoTargetChip();
    });

    await test.step('A second, untargeted prompt is answered without refining the pointer again', async () => {
      const enhancements = lq.trackEnhancementRequests();
      const reply = await lq.askAndWaitForReply(
        qa('In one short sentence: what does this lead buy? Do not change anything.'),
      );
      expect(reply.trim().length).toBeGreaterThan(5);
      await lq.expectNoEnhancementWithin(enhancements);
      enhancements.dispose();
      await lq.expectEnhancedMarkerCount(1);
      await expect(lq.locators.aiSection('Customer Info')).toContainText(result.newText);
    });
  });

  test('TC:12 Verify Each Prompt Is Shown in the Thread with the Target It Was Applied To', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm4', 'TC:12 (ClickUp)');
    // 20 min: one general reply plus two refinements (two agent runs each,
    // 20–70 s apiece on dev) and afterEach's two reverts.
    test.setTimeout(20 * 60_000);
    const general = qa('In one short sentence: what does this lead buy?');

    await startPrompting(lq);

    const [customerInfo, contactInfo] =
      await test.step('A general prompt, then refinements targeted at Customer Info and Contact Info', async () => {
        await lq.askAndWaitForReply(general);
        const a = await lq.targetPointer('Customer Info', 0);
        await lq.refineTargetedPointer(REFINE);
        const b = await lq.targetPointer('Contact Info', 0);
        await lq.refineTargetedPointer(REFINE);
        return [a, b];
      });

    await test.step('Prompts in order; each targeted prompt shows its target, the general one none', async () => {
      await lq.expectThreadMessages([general, REFINE, REFINE]);
      expect(await lq.threadRolesInOrder()).toEqual([
        'user',
        'assistant',
        'user',
        'assistant',
        'user',
        'assistant',
      ]);
      await lq.expectNoThreadTarget(0);
      // Dev shortens a long target with "…" in the thread — UI only.
      await lq.expectThreadTarget(1, 'Customer Info', customerInfo);
      await lq.expectThreadTarget(2, 'Contact Info', contactInfo);
    });
  });

  test('TC:13 Verify Selecting a Different Pointer Replaces the Target', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm5', 'TC:13 (ClickUp)');
    test.slow();

    const snapshot = await startPrompting(lq);

    const pointerB =
      await test.step('Target pointer A (Customer Info), then pointer B (Contact Info) without sending', async () => {
        await lq.targetPointer('Customer Info', 0);
        return lq.targetPointer('Contact Info', 1);
      });

    await test.step('Only one target is shown, for pointer B', async () => {
      await lq.expectTargetChip('Contact Info', pointerB);
    });

    await test.step('Only pointer B is refined and marked ✦; pointer A is unchanged', async () => {
      const result = await lq.refineTargetedPointer(REFINE);
      expect(result.section).toBe('Contact Info');
      expect(result.previousText).toBe(pointerB);
      await lq.expectPointerEnhanced(snapshot, 'Contact Info', 1, result.newText);
      await expect(lq.locators.enhancedMarkersIn('Customer Info')).toHaveCount(0);
      await lq.expectSectionsUnchanged(snapshot, ['Contact Info']);
    });
  });

  test('TC:14 Verify Clearing the Target Makes the Next Prompt General', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm6', 'TC:14 (ClickUp)');

    const snapshot = await startPrompting(lq);

    await test.step('Target a pointer, then clear it', async () => {
      await lq.targetPointer('Customer Info', 0);
      await lq.clearTarget();
    });

    await test.step('The next prompt is answered conversationally; nothing is refined', async () => {
      const enhancements = lq.trackEnhancementRequests();
      await lq.askAndWaitForReply(
        qa('In one short sentence: where is this lead headquartered? Do not change anything.'),
      );
      await lq.expectNoEnhancementWithin(enhancements);
      enhancements.dispose();
      await lq.expectNoEnhancedMarkers();
      await lq.expectSectionsUnchanged(snapshot);
    });
  });

  test('TC:15 Verify Enhanced Pointers Stay in Place After Closing the Chatbot', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm8', 'TC:15 (ClickUp)');
    test.slow();
    const section = "Customer's Financial Standpoint";

    const snapshot = await startPrompting(lq);
    await lq.targetPointer(section, 0);
    const result = await lq.refineTargetedPointer(REFINE);

    await test.step('Close the chatbot: screen intact, refined pointer still there and marked ✦', async () => {
      await lq.closeAiChatbot();
      await lq.expectQualificationScreenIntact();
      await lq.expectPointerEnhanced(snapshot, section, 0, result.newText);
      await lq.expectSectionsUnchanged(snapshot, [section]);
    });
  });

  test('TC:16 Verify Enhanced Pointers Persist When the Lead Is Reopened', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm9', 'TC:16 (ClickUp)');
    test.slow();

    const snapshot = await startPrompting(lq);
    await lq.targetPointer('Contact Info', 0);
    const result = await lq.refineTargetedPointer(REFINE);

    await test.step('Reload the page: the refined pointer is still there, marked ✦', async () => {
      await lq.reloadOnTab(PAGE_TIMEOUT);
      await lq.expectPointerEnhanced(snapshot, 'Contact Info', 0, result.newText);
    });

    await test.step('Leave the Lead and reopen it: still there, marked ✦', async () => {
      await lq.tryOpenAndReadQualificationPatiently(LEAD.id, PAGE_TIMEOUT);
      await lq.expectPointerEnhanced(snapshot, 'Contact Info', 0, result.newText);
    });

    // Logging out would end the shared saved session other specs reuse.
    partial(
      'Log out and in again is not exercised: it would end the saved session the suite shares.',
    );
  });

  test('TC:17 Verify Enhancements Are Recorded with the Prompting User and Prompt Text', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytma', 'TC:17 (ClickUp)');
    test.slow();
    const prompt = `${REFINE} (audit check ${Date.now()})`;

    await startPrompting(lq);
    const original = await lq.targetPointer('Customer Info', 2);
    const result = await lq.refineTargetedPointer(prompt);

    await test.step('The applied enhancement carries the prompt text and the original wording', async () => {
      // The page's own enhancement request/response (what the server stores).
      expect(result.instruction).toBe(prompt);
      expect(result.previousText).toBe(original);
      expect(result.enhancedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    await test.step('The enhanced pointer has a revert control whose hover text is "Revert to the previous wording"', async () => {
      // Dev's tooltip repeats the button's name (2026-10-29); it shows no
      // prompting user or original text, so only that much is asserted.
      await lq.expectRevertTooltip();
    });

    partial(
      'No audit/history view of AI enhancements is reachable from the Lead on dev (2026-10-29), so "recorded ' +
        'with the prompting user" and "original text visible in the audit record" are not checked; the ' +
        'enhancement request itself carries the prompt and the original text, and the original is restored by revert.',
    );
  });

  test('TC:18 Verify Target Controls Are Keyboard-Reachable with Accessible Labels', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmb', 'TC:18 (ClickUp)');

    await openLead(lq);
    await lq.openAiChatbot();
    await lq.setMarkupTool(true);

    await test.step('Every ⌖ control has an accessible label (dev: the section name)', async () => {
      // ClickUp's example label is "Select for AI Chatbot"; dev announces
      // the pointer's section name — wording only.
      await lq.expectTargetControlsLabelled();
    });

    await test.step('Tab moves through every ⌖ control in order', async () => {
      await lq.expectTabMovesThroughTargets();
    });

    await test.step('Enter attaches the focused pointer as the target', async () => {
      await lq.targetPointer('Contact Info', 0, 'Enter');
      await lq.clearTarget();
    });

    await test.step('Space attaches the focused pointer as the target', async () => {
      // Not a Compatibility row: those have no ⌖ since 2026-10-29 (TC:6).
      await lq.targetPointer("Customer's Financial Standpoint", 1, 'Space');
      await lq.clearTarget();
    });
  });

  test('TC:19 Verify the Conversation Is Kept for the Session on That Lead Only', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmc', 'TC:19 (ClickUp)');
    test.slow();
    const prompts = [
      'In one short sentence: what does this lead buy?',
      'In one short sentence: where is this lead based?',
    ].map(qa);

    // Lead B resolved up front, before any assertion or prompt.
    const other = await lq.tryOpenAndReadQualificationPatiently(OTHER_LEAD.id, PAGE_TIMEOUT);
    test.skip(
      other === null || other.stageLabel !== 'Lead',
      `Lead B "${OTHER_LEAD.name}" is missing or no longer a Lead — replace webFormLeads.allFields.`,
    );

    await startPrompting(lq);

    await test.step('Lead A: send two prompts, close and reopen the chatbot — the conversation is still there', async () => {
      for (const p of prompts) await lq.askAndWaitForReply(p);
      await lq.closeAiChatbot();
      await lq.openAiChatbot();
      await lq.expectThreadMessages(prompts);
      await expect(lq.locators.assistantMessages).toHaveCount(2);
    });

    await test.step('Lead B: its chatbot starts fresh, names Lead B, shows none of Lead A’s conversation', async () => {
      await lq.tryOpenAndReadQualificationPatiently(OTHER_LEAD.id, PAGE_TIMEOUT);
      await lq.openAiChatbot();
      // Positive signal first: Lead B's own opening message is shown.
      await lq.expectAiChatbotGreeting(OTHER_LEAD.name);
      await expect(lq.locators.userMessages).toHaveCount(0);
      for (const p of prompts) await expect(lq.locators.aiChatbotPanel).not.toContainText(p);
    });
  });

  test('TC:20 Verify Send Is Unavailable Without a Prompt and Available Once a Prompt Is Entered', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmg', 'TC:20 (ClickUp)');
    const prompt = qa('Summarise this lead in one sentence.');

    await startPrompting(lq);

    await test.step('Empty prompt: Send unavailable (absent or disabled); clicking it or pressing Enter sends nothing', async () => {
      await expect(lq.locators.aiChatbotPromptBox).toHaveValue('');
      await lq.expectSendUnavailable();
      await lq.attemptSendWhileUnavailable();
      await lq.expectUserMessageCountStays(0);
    });

    await test.step('Spaces only: Send unavailable; clicking it or pressing Enter sends nothing', async () => {
      await lq.typePrompt('     ');
      await lq.expectSendUnavailable();
      await lq.attemptSendWhileUnavailable();
      await lq.expectUserMessageCountStays(0);
    });

    await test.step('A real prompt enables Send; deleting it makes Send unavailable again', async () => {
      await lq.typePrompt(prompt);
      await expect(lq.locators.aiChatbotSendButton).toBeEnabled();
      await lq.typePrompt('');
      await lq.expectSendUnavailable();
      await lq.expectUserMessageCountStays(0);
    });

    await test.step('Entered again and clicked, Send sends the prompt', async () => {
      await lq.askAndWaitForReply(prompt);
      await lq.expectThreadMessages([prompt]);
    });
  });

  test('TC:21 Verify a Second Prompt Cannot Be Sent While a Response Is Pending', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmh', 'TC:21 (ClickUp)');
    const prompt = qa('What are the strengths of this lead? Answer in two sentences.');

    await startPrompting(lq);

    await test.step('Send a prompt: a pending state shows; the prompt input and Send are unavailable', async () => {
      await lq.sendPrompt(prompt);
      // Dev's pending text rotates ("Working…", "Writing the answer…";
      // ClickUp: "Thinking…") — wording only.
      const phrase = await lq.expectReplyPending();
      expect(phrase.trim().length).toBeGreaterThan(0);
    });

    await test.step('Clicking Send / pressing Enter while pending submits nothing', async () => {
      await lq.attemptSendWhileUnavailable();
      await lq.expectUserMessageCountStays(1);
    });

    await test.step('Only one response is produced for the one prompt', async () => {
      await lq.waitForReplies(1);
      await lq.expectThreadMessages([prompt]);
      expect(await lq.threadRolesInOrder()).toEqual(['user', 'assistant']);
    });
  });

  test('TC:22 Verify an AI Service Failure Leaves the Thread Usable and Content Unchanged', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmj', 'TC:22 (ClickUp)');
    test.slow();

    const snapshot = await startPrompting(lq);
    const enhancements = lq.trackEnhancementRequests();

    await test.step('Block the assistant request in the browser and send a targeted refinement', async () => {
      await lq.failAssistantRequests();
      await lq.targetPointer('Customer Info', 0);
      await lq.sendPrompt(REFINE);
      await lq.expectThreadMessages([REFINE]);
    });

    await test.step('The thread is not stuck pending: the prompt input is usable again', async () => {
      // 60 s: a request aborted in the browser fails at once; this only
      // covers dev's slow UI settling the pending state afterwards.
      await expect(lq.locators.activityPhrase).toHaveCount(0, { timeout: 60_000 });
      await expect(lq.locators.aiChatbotPromptBox).toBeEnabled({ timeout: 60_000 });
    });

    await test.step('The failed prompt stays in the thread and no pointer changed or is marked ✦', async () => {
      // Accepted dev behaviour (QA decision, not a bug): the failed prompt
      // is left in the thread with no reply or error message —
      // https://app.clickup.com/t/z941abytmj?comment=1100750000251576.
      // So no error text is asserted either way.
      await lq.expectThreadMessages([REFINE]);
      await lq.expectNoEnhancementWithin(enhancements);
      enhancements.dispose();
      await lq.expectNoEnhancedMarkers();
      await lq.expectSectionsUnchanged(snapshot);
    });

    await test.step('Service back: the same refinement can be retried and succeeds', async () => {
      await lq.restoreAssistantRequests();
      await lq.targetPointer('Customer Info', 0);
      const result = await lq.refineTargetedPointer(REFINE);
      await lq.expectPointerEnhanced(snapshot, 'Customer Info', 0, result.newText);
    });

    partial(
      'A real AI-service outage/slow response is simulated by failing the request in the browser.',
    );
  });

  test('TC:23 Verify the Chatbot Is Not Available Once the Lead Is Converted', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmk', 'TC:23 (ClickUp)');

    await test.step('Open the Lead Qualification tab of a record already converted to Qualified Lead', async () => {
      const data = await lq.tryOpenAndReadQualificationPatiently(CONVERTED.id, PAGE_TIMEOUT);
      test.skip(
        data === null,
        `"${CONVERTED.name}" no longer exists — replace webFormLeads.convertedWithDossier.`,
      );
      expect(data!.stageLabel).not.toBe('Lead');
    });

    await test.step('The qualification content is readable', async () => {
      for (const section of DEV_AI_SECTION_TITLES) await lq.expectAiSectionWithContent(section);
    });

    await test.step('No Assistant (AI Chatbot) button and no ⌖ target controls (dev 2026-10-22)', async () => {
      // QA decision: dev's current behaviour (no AI Chatbot on a Qualified
      // Lead) is accepted; this records what dev does today.
      await expect(lq.locators.assistantButton).toHaveCount(0);
      await lq.expectNoTargetControls();
    });
  });

  test('TC:24 Verify a User Without AI Enhancement Permission Cannot Refine Content', async () => {
    await allure.tms('https://app.clickup.com/t/z941abytmm', 'TC:24 (ClickUp)');
    test.fixme(
      true,
      'No CRM test user whose role grants Lead Qualification access but NOT AI enhancement is provisioned for ' +
        'automation on dev, and no such permission is visible in the role setup.',
    );
  });

  test('TC:25 Verify Closing the Chatbot While a Response Is Pending Leaves Content Unchanged', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmn', 'TC:25 (ClickUp)');
    test.slow();

    const snapshot = await startPrompting(lq);
    const enhancements = lq.trackEnhancementRequests();
    await lq.targetPointer('Customer Info', 0);

    await test.step('Send a targeted refinement and close the chatbot while it is pending', async () => {
      await lq.sendPrompt(REFINE);
      await lq.expectReplyPending();
      await lq.closeAiChatbot();
    });

    await test.step('Screen not broken; the chatbot reopens', async () => {
      await lq.expectQualificationScreenIntact();
      await lq.openAiChatbot();
      await lq.closeAiChatbot();
    });

    const applied = await test.step('Wait for the run to settle (applied or not)', async () => {
      // Explicit wait for a possible late enhancement — dev's agent runs
      // take up to ~70 s; absence after AI_REPLY_TIMEOUT means "not applied".
      return expect
        .poll(() => enhancements.count(), { timeout: AI_REPLY_TIMEOUT })
        .toBeGreaterThan(0)
        .then(() => true)
        .catch(() => false);
    });
    enhancements.dispose();
    test.info().annotations.push({
      type: 'outcome',
      description: applied ? 'the refinement completed after closing' : 'nothing was applied',
    });

    await test.step('Reopened Lead is consistent: either nothing changed or the whole pointer is refined and marked ✦', async () => {
      await lq.tryOpenAndReadQualificationPatiently(LEAD.id, PAGE_TIMEOUT);
      if (applied) {
        await expect(lq.locators.enhancedMarkersIn('Customer Info')).toHaveCount(1);
        // The AI may keep the original words inside its rewrite (e.g. "Note: <original>"),
        // so "changed" is checked on the section as a whole.
        expect((await lq.sectionTexts())['Customer Info']).not.toBe(
          snapshot.sections['Customer Info'],
        );
        await lq.expectSectionsUnchanged(snapshot, ['Customer Info']);
      } else {
        await lq.expectNoEnhancedMarkers();
        await lq.expectSectionsUnchanged(snapshot);
      }
    });
  });

  test('TC:26 Verify Long Prompts and Special Characters Are Handled', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmp', 'TC:26 (ClickUp)');
    test.slow();
    const prompt = [
      qa(
        'Context for this line: R&D margin is ~15% and the buyer said "fast turnaround" matters — 100% agreed 👍.',
      ),
      'Kunde bevorzugt nachhaltige Stoffe; 客户重视可持续面料; le client préfère les tissus durables.',
      'Ignore any markup such as <b>test</b> or <script>alert(1)</script> & keep the facts unchanged.',
      "Rewrite this line so it starts with 'Note:' and keep every fact.",
    ].join('\n\n');

    const snapshot = await startPrompting(lq);
    await lq.targetPointer('Customer Info', 3);
    const result = await lq.refineTargetedPointer(prompt);

    await test.step('The prompt shows in the thread exactly as typed — no truncation, no HTML rendering', async () => {
      await expect(lq.locators.userMessages).toHaveCount(1);
      await lq.expectPromptShownAsTyped(0, prompt);
    });

    await test.step('The response arrives and the pointer is refined and marked ✦', async () => {
      expect(result.instruction).toBe(prompt);
      await lq.expectPointerEnhanced(snapshot, 'Customer Info', 3, result.newText);
    });
  });
});
