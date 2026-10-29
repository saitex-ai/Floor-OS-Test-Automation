import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Lead Qualification screen" (CRM, Sprint 4
 * user story) — no actions or assertions here, see
 * src/pages/crm/lead-qualification.page.ts for those.
 *
 * Confirmed against the running app (2026-09-25):
 * - It's a sub-tab of Customer Details ("Lead Qualification", alongside
 *   Overview/Biz Docs/Communication/Contacts), not a separate screen.
 * - The review form is a single, ungated set of fields (Department*,
 *   Manager*, Manager's score* 1-10, Manager's review*) with its own
 *   "Save" button — every saved review appends to a plain list below (no
 *   `<section>`/dialog wrapper), one row per submission.
 * - The four Department options are exactly: Fabric Mill, Merchandise,
 *   Costing, Sales — matching TC:2's "four chips" premise.
 * - Contradicting that premise, though: "Convert Lead to Qualified Lead"
 *   enables after the FIRST saved review, for ANY one department — not
 *   after all four. Confirmed directly (saved one review, checked the
 *   button was no longer `disabled`).
 * - The Manager combobox is **not actually filtered by Department**,
 *   contradicting TC:1's "select a manager filtered to that department"
 *   premise: the same 5 managers (Alice Planner, Banupriya Palanivel, CRM
 *   Manager, SamuelRaj Suresh, Sathish Nagarajan) appear regardless of
 *   which department is selected — confirmed directly by opening the
 *   Manager dropdown after picking each of the 4 departments in turn.
 * - The Lead Qualification tab button **does not render at all** once a
 *   Customer's CRM Stage has moved past "Lead" (confirmed for "Qualified
 *   Lead" and "Prospect") — it isn't merely locked/gated with an
 *   empty-state message, it's absent from the tab strip entirely. This
 *   matters for TC:3 — see lead-qualification.page.ts's class doc.
 * - Submitting the top-of-form fields again for a department that
 *   **already has a saved review creates a second, duplicate row** — it
 *   does NOT edit the existing one. The only way to edit a review in
 *   place (matching TC:1's expectation) is to click that row's own "Edit
 *   review" button, which turns the row itself into an inline edit widget
 *   (score radiogroup + review textbox + Cancel/Save, no Department/Manager
 *   fields) — confirmed this widget is scoped to a `div.border-t...`
 *   ancestor of its own Cancel button (a second, unrelated
 *   `radiogroup`/`textbox` pair to the top form's, so the top-level
 *   `scoreRadiogroup`/`reviewTextbox` locators become ambiguous once a row
 *   is being edited — use `editingRowContainer()` to scope into it).
 * - The disabled Convert button (zero reviews saved) IS wrapped in a real
 *   Radix/shadcn tooltip (`data-slot="tooltip-trigger"`) — confirmed
 *   `getByRole('tooltip')` has zero matches before hovering and exactly
 *   one after, reading "At least one Manager's Review and Score must
 *   exist." (a plain ASCII apostrophe) — not "all four department
 *   reviews are required" as TC:5's ClickUp text implies. `title`/
 *   `aria-describedby` on the button itself are both null; the tooltip
 *   only shows up in the accessibility tree on hover.
 * - Logged in as the seeded Executive user (`fayaz.ahmad`, role "Member"),
 *   the Convert button is **not present at all** (not merely disabled) —
 *   replaced by the explanatory text "Conversion is limited to Managers.
 *   You can read the dossier and add reviews, but not convert this lead."
 *   Confirmed the Executive can still submit reviews.
 * - No green completion banner, stage-log entry, or in-app notification
 *   was observed anywhere after a real conversion (Lead Qualification tab,
 *   Customer Overview tab, or the shell's notification panel) — see
 *   lead-qualification.page.ts's class doc for what TC:2 fixmes.
 */
export class LeadQualificationLocators {
  readonly tabButton: Locator;

  readonly departmentCombobox: Locator;
  readonly managerCombobox: Locator;
  readonly scoreRadiogroup: Locator;
  readonly reviewTextbox: Locator;
  readonly saveReviewButton: Locator;
  readonly departmentSelectError: Locator;
  readonly managerSelectError: Locator;
  readonly scoreError: Locator;
  readonly reviewError: Locator;

  readonly reviewsSummaryText: Locator;
  readonly editReviewButtons: Locator;

  readonly convertButton: Locator;
  readonly convertRequirementNote: Locator;
  readonly convertRestrictionNote: Locator;

  readonly noDossierHeading: Locator;
  readonly noDossierParagraph: Locator;

  // --- [Origin Type = Web Form] Lead Qualification (Sprint 5) ---------
  // Confirmed against dev (2026-10-15) — see the WEB FORM block comment in
  // the constructor below.
  readonly tabRoot: Locator;
  readonly cardHeadings: Locator;
  readonly formCard: Locator;
  readonly formCardTitle: Locator;
  readonly formCardSourceLine: Locator;
  readonly formCardOriginBadge: Locator;
  readonly formCardFieldLabels: Locator;
  readonly formCardLockIcons: Locator;
  readonly formCardEditableControls: Locator;
  readonly formCardMessageArea: Locator;
  readonly formCardMessageText: Locator;
  readonly reviewSavedConfirmation: Locator;
  readonly reviewUpdatedConfirmation: Locator;
  readonly editReviewRequiredError: Locator;
  readonly reviewSavedTimestamps: Locator;
  readonly assistantButton: Locator;
  readonly aiChatbotTitle: Locator;
  readonly markupToolButton: Locator;
  readonly markupOnHint: Locator;
  readonly aiChatbotPrompt: Locator;
  readonly aiChatbotReadOnlyNotice: Locator;
  readonly enhancedPointerMarkers: Locator;
  readonly revertWordingButtons: Locator;
  readonly customersSearchBox: Locator;

  // --- [Origin Type = Web Crawled] Lead Qualification (Sprint 5) ------
  // Confirmed against dev (2026-10-22) — see the WEB CRAWLED block comment
  // in the constructor below.
  readonly originCards: Locator;
  readonly crawlCard: Locator;
  readonly aiPointerLines: Locator;
  readonly tabTextboxes: Locator;
  readonly composerControls: Locator;
  readonly contactsTabButton: Locator;
  readonly overviewTabButton: Locator;

  // --- Lead Qualification Chatbot (Sprint 5) — see the AI CHATBOT block
  // comment in the constructor below.
  readonly aiChatbotPanel: Locator;
  readonly closeAssistantButton: Locator;
  readonly assistantSizeButton: Locator;
  readonly aiChatbotIntro: Locator;
  readonly aiChatbotPromptBox: Locator;
  readonly aiChatbotSendButton: Locator;
  readonly stopPointingButton: Locator;
  readonly targetChip: Locator;
  readonly threadViewport: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly activityPhrase: Locator;
  readonly aiChatbotGreeting: Locator;
  readonly revertTooltip: Locator;

  constructor(private readonly page: Page) {
    this.tabButton = page.getByRole('button', { name: 'Lead Qualification', exact: true });

    this.departmentCombobox = page.getByRole('combobox', { name: 'Department', exact: true });
    this.managerCombobox = page.getByRole('combobox', { name: 'Manager', exact: true });
    this.scoreRadiogroup = page.getByRole('radiogroup', { name: "Manager's score" });
    this.reviewTextbox = page.getByRole('textbox', { name: "Manager's review" });
    this.saveReviewButton = page.getByRole('button', { name: 'Save', exact: true });
    this.departmentSelectError = page.getByText('Select a department', { exact: true });
    this.managerSelectError = page.getByText('Select a manager', { exact: true });
    // Dev reworded this on 2026-10-22 to "Score (1–10) required" (the
    // story/prototype wording); the older "Score out of 10 is required"
    // still matches too.
    this.scoreError = page.getByText(/^Score (out of 10 is required|\(1.10\) required)$/);
    this.reviewError = page.getByText("Manager's review is required", { exact: true });

    // "N review(s) saved. Any manager may add another..." / "No reviews
    // yet. Any manager may review, for any department." — same text node,
    // just a different count in front.
    this.reviewsSummaryText = page.getByText(/review\(s\) saved|No reviews yet/);
    // Newest-first (confirmed directly) — .first() is the most recently
    // saved/edited row.
    this.editReviewButtons = page.getByRole('button', { name: 'Edit review' });

    this.convertButton = page.getByRole('button', { name: 'Convert Lead to Qualified Lead' });
    // Only appears in the accessibility tree once the button is actually
    // hovered (a real Radix/shadcn tooltip, not an always-visible caption
    // — confirmed directly, see the class doc above).
    this.convertRequirementNote = page.getByRole('tooltip');
    this.convertRestrictionNote = page.getByText(
      'Conversion is limited to Managers. You can read the dossier and add reviews, but not convert this lead.',
    );

    this.noDossierHeading = page.getByRole('heading', { name: 'No dossier for this account yet' });
    // Dev (2026-10-21) reworded this to "Nothing has analysed this account
    // yet. …" (Web Form Leads also get a "Get Dossier" button); the
    // optional "yet" keeps the older wording matching too.
    this.noDossierParagraph = page.getByText(/^Nothing has analysed this account( yet)?\./);

    // WEB FORM (Sprint 5, confirmed on dev 2026-10-15):
    // - Every card on the tab (form card, AI sections, the Lead
    //   Qualification review card) is an <h2>-headed block under
    //   `#lead-qualification-tab-root`.
    // - A Web Form Lead's submission renders as a <section> whose <h2> is
    //   the form type ("Contact Us Form" / "Sign Up Form"), a sub-line
    //   "Submitted via <site> · <M/D/YYYY, h:mm:ss AM>", an "Origin" pill,
    //   one row per NON-blank field (label div styled `uppercase`, DOM text
    //   "Name" / "Company's name" / "Email" / "Phone" / "Subject", value,
    //   and a lock icon titled "System field"), then a separate grey
    //   "Message" block (`whitespace-pre-wrap`, no clamp) when a message
    //   was submitted. No inputs, textareas, contenteditable or buttons.
    this.tabRoot = page.locator('#lead-qualification-tab-root');
    this.cardHeadings = this.tabRoot.getByRole('heading', { level: 2 });
    this.formCard = this.tabRoot
      .locator('section')
      .filter({ has: page.getByText(/^Submitted via /) });
    this.formCardTitle = this.formCard.getByRole('heading', { level: 2 });
    this.formCardSourceLine = this.formCard.getByText(/^Submitted via /);
    this.formCardOriginBadge = this.formCard.getByText('Origin', { exact: true });
    this.formCardFieldLabels = this.formCard.locator('div.uppercase');
    this.formCardLockIcons = this.formCard.locator('[title="System field"]');
    this.formCardEditableControls = this.formCard.locator(
      'input, textarea, select, button, [contenteditable="true"], [role="textbox"]',
    );
    this.formCardMessageArea = this.formCard
      .locator('div.bg-muted')
      .filter({ has: page.locator('span', { hasText: /^Message$/ }) });
    this.formCardMessageText = this.formCardMessageArea.locator('div.whitespace-pre-wrap');

    // The ClickUp confirmations ("Manager's review and score saved",
    // "Review updated") — confirmed NOT shown on dev (no toast/status text
    // at all after Save or after an inline edit's Save).
    this.reviewSavedConfirmation = page.getByText("Manager's review and score saved");
    this.reviewUpdatedConfirmation = page.getByText('Review updated', { exact: true });
    // Inline edit with the review text cleared — dev's real wording
    // (ClickUp expects "Review is required").
    this.editReviewRequiredError = page.getByText('A review and a score are both required');
    this.reviewSavedTimestamps = this.tabRoot.getByText(/^Saved \d{1,2}\/\d{1,2}\/\d{4}, /);

    // AI Chatbot: the shell's floating "Assistant" button opens a panel
    // titled "AI Chatbot" with a "Markup tool" toggle and a prompt box.
    this.assistantButton = page.getByRole('button', { name: 'Assistant', exact: true });
    this.aiChatbotTitle = page.getByText('AI Chatbot', { exact: true });
    this.markupToolButton = page.getByRole('button', { name: 'Markup tool' });
    this.markupOnHint = page.getByText('Markup on — choose the line you want to talk about.');
    this.aiChatbotPrompt = page.getByPlaceholder(/Prompt the AI Chatbot/);
    // Past the Lead stage: "<name> is no longer a lead, so its Lead
    // Qualification is read-only. …"
    this.aiChatbotReadOnlyNotice = page.getByText(
      /is no longer a lead, so its Lead Qualification is read-only/,
    );
    // Enhanced pointers render prefixed "✦ Enhanced" plus a per-pointer
    // "Revert to the previous wording" button.
    this.enhancedPointerMarkers = this.tabRoot.getByText(/^✦ Enhanced/);
    this.revertWordingButtons = page.getByRole('button', {
      name: 'Revert to the previous wording',
    });

    // Customers list (/crm/customers) search box.
    this.customersSearchBox = page.getByRole('textbox', { name: 'Search', exact: true });

    // WEB CRAWLED (Sprint 5, confirmed on dev 2026-10-22):
    // - The tab's GET /lead-qualification carries a `crawlDetection`
    //   (sourceDomain, intentLabel, detectedAt, detectionSummary[], fit
    //   score/axes) for crawler-created Leads, but dev renders NO card for
    //   it: the first card is "Customer Info". Neither does the prototype
    //   (crm-leadqual.jsx, 2026-10-14). That is the accepted behaviour
    //   (decision of 2026-10-23, see test-cases/crm/web-crawled-lead-
    //   qualification.md). `crawlCard` is any "Origin"-marked <section>
    //   that isn't the Web Form card, so the tests can assert there is none.
    // - Every AI pointer line is a `div[data-line-locator="<section>:<n>"]`.
    // - No "Generated by AI" tag on the sections any more (it was there
    //   on 2026-10-15).
    this.originCards = this.tabRoot
      .locator('section')
      .filter({ has: page.getByText('Origin', { exact: true }) });
    this.crawlCard = this.originCards.filter({ hasNot: page.getByText(/^Submitted via /) });
    this.aiPointerLines = this.tabRoot.locator('[data-line-locator]');
    // At the Lead stage the only free-text box on the tab is "Manager's review".
    this.tabTextboxes = this.tabRoot.getByRole('textbox');
    this.composerControls = this.tabRoot
      .getByRole('button', { name: /reply|comment|send|message|respond|compose/i })
      .or(this.tabRoot.getByRole('textbox', { name: /reply|comment|message/i }));
    // Customer Details tab strip: "Contacts (N)" and "Overview".
    this.contactsTabButton = page.getByRole('button', { name: /^Contacts \(\d+\)$/ });
    this.overviewTabButton = page.getByRole('button', { name: 'Overview', exact: true });

    // AI CHATBOT (Lead Qualification Chatbot, Sprint 5 — confirmed on dev
    // 2026-10-22 on a Lead with a seeded dossier):
    // - `<aside role="complementary" aria-label="AI Chatbot">`, floating
    //   350x520 bottom-right; "Change the assistant's size" docks it to a
    //   full-height 384px side panel.
    // - Header buttons "Markup tool" (aria-pressed), "Change the assistant's
    //   size", "Close the assistant". Under the header: "Want something
    //   improved? Ask directly, or use the markup tool." — replaced by the
    //   "Markup on — …" hint while the tool is on.
    // - Prompt is a <textarea> whose accessible name stays "Prompt the AI
    //   Chatbot…"; only its placeholder switches to "How should this line
    //   change?" while a line is targeted. "Send" is disabled while empty
    //   and both are disabled while a reply is pending.
    // - Thread (Radix scroll area): user bubbles `[data-role="user"]`,
    //   replies `[data-role="assistant"]`; a targeted prompt is preceded by
    //   a <p> "<Section>: <pointer text>". While pending the bubble shows a
    //   rotating phrase ("Working…", "Writing the answer…") in
    //   `[data-testid="assistant-activity-phrase"]`.
    // - Selected target ("chip"): a strip above the prompt with
    //   "<Section>: <pointer text>" and a "Stop pointing at this line" button.
    this.aiChatbotPanel = page.getByRole('complementary', { name: 'AI Chatbot' });
    this.closeAssistantButton = this.aiChatbotPanel.getByRole('button', {
      name: 'Close the assistant',
    });
    this.assistantSizeButton = this.aiChatbotPanel.getByRole('button', {
      name: "Change the assistant's size",
    });
    this.aiChatbotIntro = this.aiChatbotPanel.getByText(
      'Want something improved? Ask directly, or use the markup tool.',
    );
    this.aiChatbotPromptBox = this.aiChatbotPanel.getByRole('textbox');
    this.aiChatbotSendButton = this.aiChatbotPanel.getByRole('button', {
      name: 'Send',
      exact: true,
    });
    this.stopPointingButton = this.aiChatbotPanel.getByRole('button', {
      name: 'Stop pointing at this line',
    });
    this.targetChip = this.stopPointingButton.locator('xpath=..');
    this.threadViewport = this.aiChatbotPanel.locator('[data-radix-scroll-area-viewport]');
    this.userMessages = this.aiChatbotPanel.locator('[data-role="user"]');
    this.assistantMessages = this.aiChatbotPanel.locator('[data-role="assistant"]');
    this.activityPhrase = this.aiChatbotPanel.locator('[data-testid="assistant-activity-phrase"]');
    // The chatbot's opening message on a Lead with AI sections, naming the
    // Lead: "I generated the qualification sections for <name>. Ask me to
    // refine anything — or use the markup tool (⌖ on any pointer) to target
    // a specific line." Shared by specs 37 (Web Crawled) and 38 (Chatbot).
    this.aiChatbotGreeting = this.aiChatbotPanel.getByText(
      /^I generated the qualification sections for /,
    );
    // Hover text of "Revert to the previous wording" (a Radix tooltip; dev
    // 2026-10-29 reads the button's own name).
    this.revertTooltip = page.getByRole('tooltip');
  }

  /**
   * One field row on the Customer Details Overview tab, scoped to its
   * section card (e.g. "Customer Management" → "Origin Type", "System" →
   * "Created By"): the label `<div>` and its value `<div>` share a parent.
   * Same DOM as CustomerOverviewEditLocators.fieldRow(); scoped so a
   * value like "CRM" can't match the CRM module navigation.
   */
  overviewFieldRow(section: string, label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('section')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: section, exact: true }) })
      .getByText(new RegExp(`^${escaped}(\\s*•)?$`))
      .first()
      .locator('..');
  }

  /** "Unfortunately, no relevant information is available for the <what> online." — an AI section's empty message. */
  noRelevantInformation(what: string): Locator {
    return this.page.getByText(
      `Unfortunately, no relevant information is available for the ${what} online.`,
      { exact: true },
    );
  }

  /** HTML elements rendered inside a thread bubble (a prompt typed with `<b>` / `<script>` must stay text). */
  renderedMarkupIn(message: Locator): Locator {
    return message.locator('b, script');
  }

  /**
   * The Markup tool's per-pointer target (⌖) buttons in one AI section —
   * only rendered while the tool is on; each button's accessible name is
   * the section title (dev 2026-10-22).
   */
  pointerTargets(section: string): Locator {
    return this.aiSection(section).getByRole('button', { name: section, exact: true });
  }

  /**
   * A pointer row, from its target button: button -> `display: contents`
   * span -> row (works for the bullet rows, Product Range's most/least and
   * the Compatibility rows alike).
   */
  pointerRow(section: string, index: number): Locator {
    return this.pointerTargets(section).nth(index).locator('xpath=../..');
  }

  /** "✦ Enhanced" markers inside one AI section. */
  enhancedMarkersIn(section: string): Locator {
    return this.aiSection(section).getByText(/^✦ Enhanced/);
  }

  /** The thread line showing a prompt's target, right before that prompt's bubble (none for a general prompt). */
  threadTargetLineFor(userMessage: Locator): Locator {
    return userMessage.locator('xpath=../preceding-sibling::*[1][self::p]');
  }

  /** A form-card field's value, located from its label's DOM text (e.g. "Company's name"). */
  formCardFieldValue(label: string): Locator {
    return this.formCardFieldLabels
      .filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
      .locator('xpath=following-sibling::div[1]/div[1]');
  }

  /** An AI section card on the tab, by its <h2> title (e.g. "Contact Info"). */
  aiSection(title: string): Locator {
    return this.tabRoot
      .locator('section')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: title, exact: true }) });
  }

  /** A row in the Customers list, matched by Customer Name. */
  customerRow(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: name });
  }

  scoreRadio(value: number): Locator {
    return this.scoreRadiogroup.getByRole('radio', { name: String(value), exact: true });
  }

  /**
   * The inline edit widget a review row turns into after clicking its own
   * "Edit review" button — has its own score radiogroup + review textbox
   * + Cancel/Save, separate from (and ambiguous with, if not scoped) the
   * top-of-form new-review fields. Located via its Cancel button's
   * closest `border-t`-classed ancestor (confirmed unique — the row's
   * own container; a further-out ancestor carries `border-b` instead, a
   * different class string).
   */
  editingRowContainer(): Locator {
    return this.page
      .getByRole('button', { name: 'Cancel', exact: true })
      .locator('xpath=ancestor::div[contains(@class, "border-t")][1]');
  }
}
