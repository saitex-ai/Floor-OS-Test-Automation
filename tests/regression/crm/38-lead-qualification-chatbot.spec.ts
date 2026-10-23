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
 * on 2026-10-22 — see test-cases/crm/lead-qualification-chatbot.md.
 *
 * DATA — read before running:
 * - A Lead this suite could create can't get an AI dossier (Get Dossier on
 *   a test-created lead did nothing for 5+ min), so every TC that needs
 *   pointers runs on ONE seeded Lead with a dossier:
 *   `webFormLeads.leadWithDossier` ("Highland Apparel Partners", stage
 *   Lead) in src/data/crm/seed-records.data.json. Prompts are sent on it.
 * - Every pointer a test enhances is reverted in afterEach through "Revert
 *   to the previous wording", and every section is checked to read exactly
 *   as it did before the test. A revert that fails is recorded as a
 *   "cleanup failed" annotation naming the pointer, and fails the test.
 * - A test only enhances when the lead starts clean (no "✦ Enhanced"
 *   pointer); otherwise it skips, naming the leftover count.
 * - Nothing else is written: no reviews, no Convert, no stage change.
 *
 * SERIAL: the tests share that one Lead, so they run one at a time
 * (`mode: 'serial'`) and this spec must NOT run alongside any other worker
 * or person enhancing/reverting pointers on that Lead (e.g. run it with
 * `--workers=1`, not in parallel with 35-web-form-lead-qualification).
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

/** A refinement the AI reliably applies (a visible, fact-keeping rewrite). */
const REFINE = "Rewrite this line so it starts with 'Note:' and keep every fact.";

/** Set while a test may have enhanced pointers on LEAD; afterEach reverts and checks against it. */
let enhancing: DossierSnapshot | null = null;

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

/** Opens LEAD + the chatbot and returns the dossier as shown (no enhancement expected yet). */
async function openLeadWithChatbot(lq: LeadQualificationPage): Promise<DossierSnapshot> {
  await openLead(lq);
  await lq.openAiChatbot();
  return lq.snapshotDossier();
}

/**
 * Same, for a test that WILL enhance pointers: requires a clean start
 * (no enhanced pointer), and registers the snapshot for afterEach's revert.
 */
async function startEnhancing(lq: LeadQualificationPage): Promise<DossierSnapshot> {
  const data = await openLead(lq);
  const leftover = data.enhancedLocators?.length ?? 0;
  test.skip(
    leftover > 0,
    `Seeded Lead "${LEAD.name}" already has ${leftover} enhanced pointer(s) that this test didn't make — ` +
      'revert them ("Revert to the previous wording") before running this suite.',
  );
  await lq.expectNoEnhancedMarkers();
  await lq.openAiChatbot();
  const snapshot = await lq.snapshotDossier();
  enhancing = snapshot;
  return snapshot;
}

test.describe('CRM - Lead Qualification Chatbot', () => {
  // Shared seeded Lead — see the file comment. 12 min per test covers a
  // slow page load plus several AI replies and reverts on dev.
  test.describe.configure({ mode: 'serial', timeout: 12 * 60_000 });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Lead Qualification Chatbot');
    await allure.owner('CRM QA');
  });

  test.afterEach(async ({ leadQualificationPage: lq }) => {
    if (!enhancing) return;
    const snapshot = enhancing;
    enhancing = null;
    // Reverting needs a fresh page load plus one round-trip per pointer.
    test.info().setTimeout(test.info().timeout + 6 * 60_000);
    await lq.restoreAssistantRequests();
    await lq.tryOpenAndReadQualificationPatiently(LEAD.id, PAGE_TIMEOUT);
    const failed = await lq.revertAllEnhancements();
    for (const pointer of failed) {
      test.info().annotations.push({
        type: 'cleanup failed',
        description: `Could not revert "${pointer}" on ${LEAD.name} — revert it by hand.`,
      });
    }
    expect(failed, 'every enhanced pointer is reverted').toEqual([]);
    for (const pointer of await lq.enhancedPointerTexts()) {
      test.info().annotations.push({
        type: 'cleanup failed',
        description: `"${pointer}" on ${LEAD.name} is still enhanced and has no revert button.`,
      });
    }
    await lq.expectNoEnhancedMarkers();
    const now = await lq.sectionTexts();
    for (const section of DEV_AI_SECTION_TITLES) {
      if (now[section] !== snapshot.sections[section]) {
        test.info().annotations.push({
          type: 'cleanup failed',
          description: `"${section}" on ${LEAD.name} does not read as before the test after reverting.`,
        });
      }
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
    await allure.tms('https://app.clickup.com/t/z941abytkt', 'TC:2 (ClickUp)');

    const snapshot = await test.step('Open the chatbot and turn the Markup tool on', async () => {
      const s = await openLeadWithChatbot(lq);
      await lq.setMarkupTool(true);
      await lq.expectTargetControlsOnEveryPointer();
      return s;
    });

    await test.step('Close the chatbot: screen intact, sections unchanged, Assistant button back', async () => {
      await lq.closeAiChatbot();
      await lq.expectQualificationScreenIntact();
      await lq.expectSectionsUnchanged(snapshot);
    });

    await test.step('BUG: the ⌖ target controls stay on every pointer after the chatbot is closed', async () => {
      await lq.expectTargetControlsOnEveryPointer();
    });
  });

  test('TC:3 Verify a General Prompt Is Answered Without Changing Any Content', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytku', 'TC:3 (ClickUp)');
    const prompt = 'What are the main risks with this lead? Answer briefly.';

    const snapshot = await openLeadWithChatbot(lq);
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
      expect(enhancements(), 'no enhancement was applied').toBe(0);
      await lq.expectNoEnhancedMarkers();
      await lq.expectSectionsUnchanged(snapshot);
    });
  });

  test('TC:4 Verify Pressing Enter Sends the Prompt Like the Send Button', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytkv', 'TC:4 (ClickUp)');
    const prompt = 'In one short sentence: which city is this lead based in?';

    await openLead(lq);
    await lq.openAiChatbot();

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
    ];
    const sent: string[] = [];

    await openLead(lq);
    await lq.openAiChatbot();

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
      const last = 'In one short sentence: what does the lead sell at the low end?';
      await lq.askAndWaitForReply(last);
      sent.push(last);
      await lq.expectThreadScrolledToBottom();
      await lq.expectThreadMessages(sent);
    });
  });

  test('TC:6 Verify Turning the Markup Tool On Shows Target Controls on Every Pointer', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytkx', 'TC:6 (ClickUp)');

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
      await lq.expectTargetControlsOnEveryPointer();
    });
  });

  test('TC:7 Verify Turning the Markup Tool Off Removes the Target Controls', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytky', 'TC:7 (ClickUp)');

    await openLead(lq);
    await lq.openAiChatbot();
    await lq.setMarkupTool(true);
    await lq.expectTargetControlsOnEveryPointer();

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
      await lq.locators.aiChatbotPromptBox.click();
      await lq.expectTargetChip('Customer Info', text);
    });
  });

  test('TC:9 Verify a Targeted Prompt Refines Only That Pointer and Marks It Enhanced', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm1', 'TC:9 (ClickUp)');
    test.slow();

    const snapshot = await startEnhancing(lq);
    const original = await lq.targetPointer('Customer Info', 0);

    const result =
      await test.step('Send a refinement for the targeted Customer Info pointer', async () => {
        return lq.refineTargetedPointer(REFINE);
      });

    await test.step('The response names the section; the change is applied to that pointer', async () => {
      expect(result.section).toBe('Customer Info');
      expect(result.previousText).toBe(original);
      expect(result.newText).not.toBe(original);
      expect(result.reply).toMatch(/customer info/i);
    });

    await test.step('The refined pointer is in Customer Info, marked ✦; everything else is unchanged', async () => {
      await lq.expectPointerEnhanced(snapshot, 'Customer Info', 0, result.newText);
      expect(await lq.enhancedMarkerCount()).toBe(1);
      await lq.expectSectionsUnchanged(snapshot, ['Customer Info']);
    });
  });

  test('TC:10 Verify Pointers in Every AI Section Can Be Refined', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm2', 'TC:10 (ClickUp)');
    // Three refinements (two agent runs each) plus three reverts on dev.
    test.setTimeout(25 * 60_000);
    const mentions: Record<string, RegExp> = {
      'Contact Info': /contact info/i,
      'Customer Info': /customer info/i,
      "Customer's Financial Standpoint": /financial/i,
    };

    const snapshot = await startEnhancing(lq);

    for (const section of Object.keys(mentions)) {
      await test.step(`Refine a pointer in "${section}"`, async () => {
        const original = await lq.targetPointer(section, 0);
        const result = await lq.refineTargetedPointer(REFINE);
        expect(result.section).toBe(section);
        expect(result.previousText).toBe(original);
        expect(result.reply, 'the response names the section').toMatch(mentions[section]!);
        await lq.expectPointerEnhanced(snapshot, section, 0, result.newText);
      });
    }

    await test.step('One ✦ pointer in each of those sections', async () => {
      for (const section of Object.keys(mentions)) {
        await expect(lq.locators.enhancedMarkersIn(section)).toHaveCount(1);
      }
    });

    await test.step('Product Range and the Compatibility report rows can be targeted (not sent — see the note)', async () => {
      await lq.targetPointer("Customer's Product Range", 0);
      await lq.targetPointer('Business Compatibility Report', 0);
      await lq.clearTarget();
    });

    // Confirmed once on dev (2026-10-22): refining Product Range's "Most
    // expensive" line and the Compatibility "Sustainability match" row both
    // land in their own section marked ✦ — but those rows get NO "Revert to
    // the previous wording" button, so the shared seeded dossier can't be
    // restored through the UI. Not repeated per run for that reason.
    partial(
      "Refining Customer's Product Range and Business Compatibility Report pointers is not sent each run: dev " +
        'offers no "Revert to the previous wording" on those rows, so the shared seeded dossier could not be ' +
        'restored. (It worked when tried once on 2026-10-22: each landed in its own section marked ✦.)',
    );
  });

  test('TC:11 Verify the Target Is Released After a Prompt Is Sent', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm3', 'TC:11 (ClickUp)');
    test.slow();

    const snapshot = await startEnhancing(lq);
    await lq.targetPointer('Customer Info', 1);
    const result = await lq.refineTargetedPointer(REFINE);
    await lq.expectPointerEnhanced(snapshot, 'Customer Info', 1, result.newText);

    await test.step('After sending, the target is gone and the placeholder is back', async () => {
      await lq.expectNoTargetChip();
    });

    await test.step('A second, untargeted prompt is answered without refining the pointer again', async () => {
      const enhancements = lq.trackEnhancementRequests();
      const reply = await lq.askAndWaitForReply(
        'In one short sentence: what does this lead buy? Do not change anything.',
      );
      expect(reply.trim().length).toBeGreaterThan(5);
      expect(enhancements(), 'no further enhancement').toBe(0);
      expect(await lq.enhancedMarkerCount()).toBe(1);
      await expect(lq.locators.aiSection('Customer Info')).toContainText(result.newText);
    });
  });

  test('TC:12 Verify Each Prompt Is Shown in the Thread with the Target It Was Applied To', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytm4', 'TC:12 (ClickUp)');
    test.setTimeout(20 * 60_000);
    const general = 'In one short sentence: what does this lead buy?';

    await startEnhancing(lq);

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
      expect(await lq.threadTargetOf(0)).toBeNull();
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

    const snapshot = await startEnhancing(lq);

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

    // Registered for afterEach's revert in case the AI refines something anyway.
    const snapshot = await startEnhancing(lq);

    await test.step('Target a pointer, then clear it', async () => {
      await lq.targetPointer('Customer Info', 0);
      await lq.clearTarget();
    });

    await test.step('The next prompt is answered conversationally; nothing is refined', async () => {
      const enhancements = lq.trackEnhancementRequests();
      await lq.askAndWaitForReply('In one short sentence: where is this lead headquartered?');
      expect(enhancements(), 'no enhancement').toBe(0);
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

    const snapshot = await startEnhancing(lq);
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

    const snapshot = await startEnhancing(lq);
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

    await startEnhancing(lq);
    const original = await lq.targetPointer('Customer Info', 2);
    const result = await lq.refineTargetedPointer(prompt);

    await test.step('The applied enhancement carries the prompt text and the original wording', async () => {
      // The page's own enhancement request/response (what the server stores).
      expect(result.instruction).toBe(prompt);
      expect(result.previousText).toBe(original);
      expect(result.enhancedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    await test.step('Revert control on the enhanced pointer (its hover text is recorded)', async () => {
      const tip = await lq.revertTooltipText();
      test.info().annotations.push({ type: 'revert tooltip', description: tip });
    });

    partial(
      'No audit/history view of AI enhancements is reachable from the Lead on dev (2026-10-22), so "recorded ' +
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
      await lq.targetPointer('Business Compatibility Report', 1, 'Space');
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
    ];

    await openLead(lq);
    await lq.openAiChatbot();

    await test.step('Lead A: send two prompts, close and reopen the chatbot — the conversation is still there', async () => {
      for (const p of prompts) await lq.askAndWaitForReply(p);
      await lq.closeAiChatbot();
      await lq.openAiChatbot();
      await lq.expectThreadMessages(prompts);
      await expect(lq.locators.assistantMessages).toHaveCount(2);
    });

    await test.step('Lead B: its chatbot starts fresh, names Lead B, shows none of Lead A’s conversation', async () => {
      const other = await lq.tryOpenAndReadQualificationPatiently(OTHER_LEAD.id, PAGE_TIMEOUT);
      test.skip(
        other === null || other.stageLabel !== 'Lead',
        `Lead B "${OTHER_LEAD.name}" is missing or no longer a Lead — replace webFormLeads.allFields.`,
      );
      await lq.openAiChatbot();
      await expect(lq.locators.aiChatbotPanel).toContainText(OTHER_LEAD.name);
      await expect(lq.locators.userMessages).toHaveCount(0);
      for (const p of prompts) await expect(lq.locators.aiChatbotPanel).not.toContainText(p);
    });
  });

  test('TC:20 Verify Send Is Unavailable Without a Prompt and Available Once a Prompt Is Entered', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmg', 'TC:20 (ClickUp)');
    const prompt = 'Summarise this lead in one sentence.';

    await openLead(lq);
    await lq.openAiChatbot();

    await test.step('Empty prompt: Send disabled; clicking it or pressing Enter sends nothing', async () => {
      await expect(lq.locators.aiChatbotPromptBox).toHaveValue('');
      await expect(lq.locators.aiChatbotSendButton).toBeDisabled();
      await lq.locators.aiChatbotSendButton.click({ force: true });
      await lq.locators.aiChatbotPromptBox.press('Enter');
      await expect(lq.locators.userMessages).toHaveCount(0);
    });

    await test.step('Spaces only: Send disabled; clicking it or pressing Enter sends nothing', async () => {
      await lq.typePrompt('     ');
      await expect(lq.locators.aiChatbotSendButton).toBeDisabled();
      await lq.locators.aiChatbotSendButton.click({ force: true });
      await lq.locators.aiChatbotPromptBox.press('Enter');
      await expect(lq.locators.userMessages).toHaveCount(0);
    });

    await test.step('A real prompt enables Send; deleting it disables Send again', async () => {
      await lq.typePrompt(prompt);
      await expect(lq.locators.aiChatbotSendButton).toBeEnabled();
      await lq.typePrompt('');
      await expect(lq.locators.aiChatbotSendButton).toBeDisabled();
      await expect(lq.locators.userMessages).toHaveCount(0);
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
    const prompt = 'What are the strengths of this lead? Answer in two sentences.';

    await openLead(lq);
    await lq.openAiChatbot();

    await test.step('Send a prompt: a pending state shows; the prompt input and Send are unavailable', async () => {
      await lq.sendPrompt(prompt);
      // Dev's pending text rotates ("Working…", "Writing the answer…";
      // ClickUp: "Thinking…") — wording only.
      const phrase = await lq.expectReplyPending();
      expect(phrase.trim().length).toBeGreaterThan(0);
    });

    await test.step('Clicking Send / pressing Enter while pending submits nothing', async () => {
      await lq.locators.aiChatbotSendButton.click({ force: true });
      await lq.locators.aiChatbotPromptBox
        .press('Enter', { timeout: 5_000 })
        .catch(() => undefined);
      await expect(lq.locators.userMessages).toHaveCount(1);
    });

    await test.step('Only one response is produced for the one prompt', async () => {
      await lq.waitForReplies(1);
      await lq.expectThreadMessages([prompt]);
      expect(await lq.threadRolesInOrder()).toEqual(['user', 'assistant']);
    });
  });

  test('TC:22 Verify AI Service Failure or Timeout Is Reported and Content Is Unchanged', async ({
    leadQualificationPage: lq,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abytmj', 'TC:22 (ClickUp)');
    test.slow();

    const snapshot = await startEnhancing(lq);
    const enhancements = lq.trackEnhancementRequests();

    await test.step('Block the assistant request in the browser and send a targeted refinement', async () => {
      await lq.failAssistantRequests();
      await lq.targetPointer('Customer Info', 0);
      await lq.sendPrompt(REFINE);
      await lq.expectThreadMessages([REFINE]);
    });

    await test.step('The thread is not stuck pending: the prompt input is usable again', async () => {
      await expect(lq.locators.activityPhrase).toHaveCount(0, { timeout: 60_000 });
      await expect(lq.locators.aiChatbotPromptBox).toBeEnabled({ timeout: 60_000 });
    });

    await test.step('BUG: the failure is not reported in the thread — the prompt is left with no reply or error message', async () => {
      await expect(lq.locators.assistantMessages).toHaveCount(0);
      await expect(lq.locators.aiChatbotPanel).not.toContainText(
        /error|failed|went wrong|try again|unavailable|timed out/i,
      );
    });

    await test.step('No pointer changed or marked ✦; nothing partial saved', async () => {
      expect(enhancements()).toBe(0);
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
      // Team rule: AI enhancement on a Qualified Lead is not a bug either
      // way — this records what dev does today.
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

    const snapshot = await startEnhancing(lq);
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
        .poll(enhancements, { timeout: AI_REPLY_TIMEOUT })
        .toBeGreaterThan(0)
        .then(() => true)
        .catch(() => false);
    });
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
      'Context for this line: R&D margin is ~15% and the buyer said "fast turnaround" matters — 100% agreed 👍.',
      'Kunde bevorzugt nachhaltige Stoffe; 客户重视可持续面料; le client préfère les tissus durables.',
      'Ignore any markup such as <b>test</b> or <script>alert(1)</script> & keep the facts unchanged.',
      REFINE,
    ].join('\n\n');

    const snapshot = await startEnhancing(lq);
    await lq.targetPointer('Customer Info', 3);
    const result = await lq.refineTargetedPointer(prompt);

    await test.step('The prompt shows in the thread exactly as typed — no truncation, no HTML rendering', async () => {
      await expect(lq.locators.userMessages).toHaveCount(1);
      const shown = await lq.locators.userMessages.first().textContent();
      expect(shown?.replace(/\s+/g, ' ').trim()).toBe(prompt.replace(/\s+/g, ' ').trim());
      await expect(lq.locators.userMessages.first().locator('b, script')).toHaveCount(0);
    });

    await test.step('The response arrives and the pointer is refined and marked ✦', async () => {
      expect(result.instruction).toBe(prompt);
      await lq.expectPointerEnhanced(snapshot, 'Customer Info', 3, result.newText);
    });
  });
});
