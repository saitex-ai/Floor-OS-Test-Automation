import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { LeadQualificationLocators } from '../../locators/crm/lead-qualification.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;
const CUSTOMERS_LIST_PATH = '/crm/customers';
/**
 * How long to wait for the Customer / lead-qualification reads. Dev's CRM
 * remote can sit on "Loading CRM…" for over 60 s (seen 2026-10-22).
 */
const LQ_READ_TIMEOUT = 120_000;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * "Lead Qualification screen" (CRM, Sprint 4 user story). Owned by the
 * CRM QA. Confirmed against the running app (2026-09-25) — see
 * LeadQualificationLocators' class doc for the corrections that made to
 * the original ClickUp text (notably: Convert enables after the FIRST
 * saved department review, not after all four; the Manager combobox isn't
 * actually filtered by Department; editing a review requires its own
 * "Edit review" button — resubmitting the top form duplicates instead).
 *
 * TC:2's "stage-log entry (actor/timestamp/trigger)", "notification
 * broadcast", and "green completion banner naming the conversion date and
 * acting user" were all checked for directly against a real conversion
 * (screenshots + full-body text dumps, immediately after the click and
 * polled for several seconds after) and **none of the three were
 * observed** — not on the Lead Qualification tab, not on the Customer's
 * Overview tab (which does show generic "Updated On"/"Updated By" fields,
 * but nothing naming the Lead Qualification conversion as the trigger),
 * and not in the shell's notification panel ("No notifications yet.",
 * same empty state qualified-lead-to-prospect.page.ts found for its own
 * conversion notification). What IS real and CRM-observable: the header
 * stage label and Overview's "CRM Stage" field both flip to "Qualified
 * Lead", and the saved review row(s) remain visible, unchanged, after
 * conversion (audit-relevant records are NOT wiped). See the spec file
 * for exactly which slice of TC:2 is asserted for real vs. `test.fixme()`'d.
 */
export interface QualificationReview {
  department: string;
  manager: string;
  score: number;
  review: string;
}

/**
 * One web-form submission as returned by the GET
 * `/api/crm/customers/:id/lead-qualification` read the Lead Qualification
 * tab itself makes (shape confirmed on dev 2026-10-15). `formData` only
 * carries the keys the submitter actually filled.
 */
export interface WebFormSubmission {
  id: string;
  originCode: string;
  originLabel: string;
  formData: Record<string, string | undefined>;
  submittedAt: string;
}

/**
 * The crawler's detection as returned by the same GET
 * `/lead-qualification` read, for a Lead the web crawler created (shape
 * confirmed on dev 2026-10-22). `null` for every other Lead, including a
 * "Web Crawled" Lead created by hand through Create Customer.
 */
export interface CrawlDetection {
  sourceDomain: string;
  intentLabel: string;
  detectedAt: string;
  detectionSummary: string[];
  fitScore: string | null;
  fitAxes: { name: string; value: number | null; why: string }[];
}

/** The subset of the tab's own lead-qualification read these tests use. */
export interface LeadQualificationData {
  accountId: string;
  stage: string;
  stageLabel: string;
  originType: string;
  originTypeLabel: string;
  originLabel: string;
  dossier: {
    generatedBy?: string;
    payload?: {
      contactInfo?: { text: string }[];
      customerInfo?: { points?: { text: string }[] };
    };
  } | null;
  reviews: unknown[];
  webFormSubmissions: WebFormSubmission[];
  crawlDetection?: CrawlDetection | null;
  socialInteractions: { content?: { text?: string } }[];
  conversion: unknown;
  /** Line locators of the pointers currently enhanced through the AI Chatbot (dev 2026-10-22). */
  enhancedLocators?: unknown[];
}

/**
 * Web-form `formData` keys -> the field label the form card renders (DOM
 * text; CSS upper-cases it on screen). `message` is NOT a field row — it
 * gets its own Message block.
 */
export const WEB_FORM_FIELD_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['sender_name', 'Name'],
  ['company_name', "Company's name"],
  ['sender_email', 'Email'],
  ['sender_phone', 'Phone'],
  ['subject', 'Subject'],
];

/** Every Web Form card on dev reads "Submitted via saitex.com · ..." (confirmed for all 30+ ingested leads). */
export const WEB_FORM_SOURCE_SITE = 'saitex.com';

/** The AI dossier sections dev actually renders (2026-10-15), in order. */
export const DEV_AI_SECTION_TITLES = [
  'Contact Info',
  'Customer Info',
  "Customer's Financial Standpoint",
  "Customer's Product Range",
  'Business Compatibility Report',
] as const;

/**
 * Dev's AI replies took 20–70 s on 2026-10-22 (slow shared env); a reply
 * that applies an enhancement runs the agent twice. Generous on purpose.
 */
export const AI_REPLY_TIMEOUT = 240_000;
/** After an enhancement/revert the tab re-reads its GET `/lead-qualification` (5–40 s on dev 2026-10-22). */
const UI_REFRESH_TIMEOUT = 120_000;
/** The assistant's streaming agent endpoint (POST, server-sent events). */
const ASSISTANT_RUN_URL = '**/api/assistant/agent/**';

/** A dossier as shown: each AI section's text, and each pointer's text per section. */
export interface DossierSnapshot {
  sections: Record<string, string>;
  pointers: Record<string, string[]>;
}

/** What the page applied for one refinement (the enhancement POST's request + response) and the AI's reply. */
export interface EnhancementResult {
  pointer: string;
  section: string;
  previousText: string;
  newText: string;
  enhancedAt: string;
  instruction: string;
  reply: string;
}

function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

export class LeadQualificationPage extends BasePage {
  readonly locators: LeadQualificationLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new LeadQualificationLocators(page);
  }

  async openFromCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.tabButton.click();
  }

  private async selectComboboxOption(name: string, optionText: string): Promise<void> {
    const trigger =
      name === 'Department' ? this.locators.departmentCombobox : this.locators.managerCombobox;
    await trigger.click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  /** Submits one department review — the minimum needed to unlock Convert. */
  async submitReview(details: QualificationReview): Promise<void> {
    await this.selectComboboxOption('Department', details.department);
    await this.selectComboboxOption('Manager', details.manager);
    await this.locators.scoreRadio(details.score).check();
    await this.locators.reviewTextbox.fill(details.review);
    await this.locators.saveReviewButton.click();
  }

  /** Attempts a Save with whatever fields are currently blank — used for TC:4. */
  async attemptSaveBlank(): Promise<void> {
    await this.locators.saveReviewButton.click();
  }

  /**
   * Edits the most-recently-saved review row in place (its "Edit review"
   * button, newest first) — the only real way to update an existing
   * review without creating a duplicate. See the class doc/locators'
   * class doc for why resubmitting the top form instead duplicates.
   */
  async editMostRecentReview(details: { score: number; review: string }): Promise<void> {
    await this.locators.editReviewButtons.first().click();
    const row = this.locators.editingRowContainer();
    const cancelButton = row.getByRole('button', { name: 'Cancel', exact: true });
    await row.getByRole('radio', { name: String(details.score), exact: true }).check();
    await row.getByRole('textbox').fill(details.review);
    await row.getByRole('button', { name: 'Save', exact: true }).click();
    // The row shows a transient "Saving…" state before collapsing back to
    // its read view (confirmed directly) — reading it immediately catches
    // that mid-transition, so wait for the edit widget to actually close.
    await cancelButton.waitFor({ state: 'hidden', timeout: 10_000 });
  }

  async expectReviewCount(n: number): Promise<void> {
    const pattern = n === 0 ? /No reviews yet/ : new RegExp(`^${n} review\\(s\\) saved`);
    await expect(this.locators.reviewsSummaryText).toHaveText(pattern);
  }

  /** Asserts a saved row renders with an avatar, department chip, score, and review text — TC:1's expected result. */
  async expectReviewRowVisible(details: QualificationReview): Promise<void> {
    const row = this.page.getByText(details.review, { exact: false }).locator('..');
    await expect(row).toContainText(details.manager);
    await expect(row).toContainText(details.department);
    await expect(row).toContainText(`${details.score} / 10`);
  }

  async expectFieldValidationErrors(): Promise<void> {
    await expect(this.locators.departmentSelectError).toBeVisible();
    await expect(this.locators.managerSelectError).toBeVisible();
    await expect(this.locators.scoreError).toBeVisible();
    await expect(this.locators.reviewError).toBeVisible();
    await expect(this.locators.departmentCombobox).toHaveAttribute('aria-invalid', 'true');
    await expect(this.locators.managerCombobox).toHaveAttribute('aria-invalid', 'true');
    await expect(this.locators.reviewTextbox).toHaveAttribute('aria-invalid', 'true');
  }

  async expectConvertEnabled(): Promise<void> {
    await expect(this.locators.convertButton).toBeEnabled();
  }

  /**
   * Zero-review Lead, logged in as a Manager: Convert is genuinely
   * HTML-disabled, and hovering it raises a real tooltip explaining why
   * (confirmed a real Radix tooltip — zero role=tooltip matches before
   * hover, exactly one after).
   */
  async expectConvertDisabledWithRequirementNote(): Promise<void> {
    await expect(this.locators.convertButton).toBeDisabled();
    await this.locators.convertButton.hover({ force: true });
    await expect(this.locators.convertRequirementNote).toBeVisible();
    await expect(this.locators.convertRequirementNote).toHaveText(
      "At least one Manager's Review and Score must exist.",
    );
  }

  /** Logged in as an Executive: the Convert button doesn't render at all — replaced by an explicit role-restriction note. */
  async expectConvertLockedForExecutive(): Promise<void> {
    await expect(this.locators.convertButton).toHaveCount(0);
    await expect(this.locators.convertRestrictionNote).toBeVisible();
  }

  async convertToQualifiedLead(): Promise<void> {
    await this.locators.convertButton.click();
  }

  /** The Customer Details header's own CRM Stage text — confirmed against the running app: reads "Qualified Lead Active ..." right after a successful conversion. */
  async expectStageIsQualifiedLead(): Promise<void> {
    await expect(this.page.getByText(/^Qualified Lead\b/).first()).toBeVisible();
  }

  /** The AI-dossier panel's empty state — visible for any Lead with no dossier yet (see class doc: this is the one genuinely reachable empty state, since the tab itself is absent once CRM Stage moves past Lead). */
  async expectNoDossierEmptyState(): Promise<void> {
    await expect(this.locators.noDossierHeading).toBeVisible();
    await expect(this.locators.noDossierParagraph).toBeVisible();
  }

  /** The reviews list's own empty state, for a genuinely fresh Lead with zero saved reviews. */
  async expectNoReviewsEmptyState(): Promise<void> {
    await expect(this.locators.reviewsSummaryText).toHaveText(/No reviews yet/);
  }

  // =====================================================================
  // [Origin Type = Web Form] Lead Qualification (Sprint 5)
  // =====================================================================

  /**
   * Opens a Customer's Lead Qualification tab and returns the tab's own
   * GET `/lead-qualification` payload (read-only — the very request the UI
   * makes to render the tab). Used as the "what was submitted" oracle for
   * existing Web Form Leads, since the test store's form can't be
   * submitted from here (password-protected).
   */
  async openAndReadQualification(customerId: string): Promise<LeadQualificationData> {
    const response = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.url().endsWith(`/customers/${customerId}/lead-qualification`) &&
        r.ok(),
      { timeout: LQ_READ_TIMEOUT },
    );
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.tabButton.click();
    const data = (await (await response).json()) as LeadQualificationData;
    await expect(this.locators.cardHeadings.first()).toBeVisible();
    return data;
  }

  /**
   * Same as openAndReadQualification(), but for a pre-existing (seed)
   * record that may have been removed: returns `null` when the Customer's
   * own GET answers non-2xx. Confirmed on dev (2026-10-21): an unknown id
   * gets a 404 and the screen stays on "Loading customer…" (no tab to click).
   */
  async tryOpenAndReadQualification(
    customerId: string,
    timeout = LQ_READ_TIMEOUT,
  ): Promise<LeadQualificationData | null> {
    const customer = this.page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith(`/api/crm/customers/${customerId}`),
      { timeout },
    );
    // Body read as soon as the response lands: the tab re-reads this
    // endpoint, and a later read can find the first body already gone.
    const qualification = this.page
      .waitForResponse(
        (r) =>
          r.request().method() === 'GET' &&
          r.url().endsWith(`/customers/${customerId}/lead-qualification`) &&
          r.ok(),
        { timeout },
      )
      .then((r) => r.json() as Promise<LeadQualificationData>);
    // Only awaited when the record exists (or when the page loads at all) —
    // keep a rejected wait from going unhandled.
    qualification.catch(() => undefined);
    customer.catch(() => undefined);
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    if (!(await customer).ok()) return null;
    await this.locators.tabButton.click({ timeout });
    const data = await qualification;
    await expect(this.locators.cardHeadings.first()).toBeVisible({ timeout });
    return data;
  }

  /**
   * tryOpenAndReadQualification(), tried once more when the first attempt
   * times out. On 2026-10-22 dev's shell sometimes took longer than
   * gotoAuthenticated()'s fixed 60 s to show the signed-in shell; a second
   * navigation then loaded normally.
   */
  async tryOpenAndReadQualificationPatiently(
    customerId: string,
    timeout: number,
  ): Promise<LeadQualificationData | null> {
    try {
      return await this.tryOpenAndReadQualification(customerId, timeout);
    } catch (e) {
      if (!String(e).includes('Timeout')) throw e;
      return this.tryOpenAndReadQualification(customerId, timeout);
    }
  }

  /** Revert buttons on enhanced AI pointers are present and enabled (nothing is clicked). */
  async expectRevertWordingAvailable(): Promise<void> {
    await expect(this.locators.revertWordingButtons.first()).toBeEnabled();
  }

  /** The form card shows none of the given values (e.g. another Lead's company/email). */
  async expectFormCardNotContaining(values: string[]): Promise<void> {
    for (const value of values) await expect(this.locators.formCard).not.toContainText(value);
  }

  /** Reload the page and return to the Lead Qualification tab. */
  async reloadOnTab(timeout?: number): Promise<void> {
    await this.page.reload();
    await this.locators.tabButton.click({ timeout });
    await expect(this.locators.cardHeadings.first()).toBeVisible({ timeout });
  }

  /** The newest submission (the one the form card shows — confirmed: only one card renders even when several are stored). */
  latestSubmission(data: LeadQualificationData): WebFormSubmission {
    const sorted = [...data.webFormSubmissions].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
    expect(sorted.length, 'Lead has no stored web-form submission').toBeGreaterThan(0);
    return sorted[0]!;
  }

  async cardTitlesInOrder(): Promise<string[]> {
    return (await this.locators.cardHeadings.allInnerTexts()).map((t) => t.trim());
  }

  /** Exactly one form card, and it is the first card on the tab (above every AI section). */
  async expectFormCardIsFirstCard(formType: string): Promise<void> {
    await expect(this.locators.formCard).toHaveCount(1);
    await expect(this.locators.cardHeadings.first()).toHaveText(formType);
  }

  /** Title = the form type, plus the "Origin" pill. */
  async expectFormCardTitleAndOriginBadge(formType: string): Promise<void> {
    await expect(this.locators.formCardTitle).toHaveText(formType);
    await expect(this.locators.formCardOriginBadge).toBeVisible();
  }

  /**
   * "Submitted via <site> · <date, time>" — the date/time must equal the
   * stored `submittedAt`, rendered in the browser's own locale/time zone
   * (the same `toLocaleString('en-US')` shape the card uses, e.g.
   * "10/13/2026, 3:23:43 PM").
   */
  async expectFormCardSourceAndSubmittedAt(submission: WebFormSubmission): Promise<void> {
    const expectedWhen = await this.page.evaluate(
      (iso) => new Date(iso).toLocaleString('en-US'),
      submission.submittedAt,
    );
    const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();
    await expect(this.locators.formCardSourceLine).toBeVisible();
    const actual = normalise(await this.locators.formCardSourceLine.innerText());
    expect(actual).toBe(normalise(`Submitted via ${WEB_FORM_SOURCE_SITE} · ${expectedWhen}`));
  }

  /**
   * Every filled field is shown exactly as stored, and every blank one is
   * omitted entirely (no row, no "—", no placeholder) — the card's label
   * list equals the filled fields, in the form's own order.
   */
  async expectFormCardFieldsMatch(formData: WebFormSubmission['formData']): Promise<void> {
    const expectedLabels: string[] = [];
    for (const [key, label] of WEB_FORM_FIELD_LABELS) {
      const value = formData[key];
      if (isFilled(value)) {
        expectedLabels.push(label);
        await expect(this.locators.formCardFieldValue(label)).toHaveText(value.trim());
      } else {
        await expect(this.locators.formCardFieldValue(label)).toHaveCount(0);
      }
    }
    await expect(this.locators.formCardFieldLabels).toHaveText(expectedLabels);
  }

  /** No empty value cells and no dash/"N/A"-style placeholders anywhere on the card. */
  async expectNoBlankPlaceholders(): Promise<void> {
    // textContent, not innerText: the labels are CSS-uppercased on screen.
    const labels = await this.locators.formCardFieldLabels.allTextContents();
    for (const label of labels) {
      const value = (await this.locators.formCardFieldValue(label.trim()).innerText()).trim();
      expect(value, `field "${label}" is rendered empty or as a placeholder`).not.toMatch(
        /^(|-|—|–|N\/A|n\/a|null|undefined)$/,
      );
    }
  }

  /**
   * The message renders in its own Message block (outside the field grid),
   * in full: exact text, `white-space: pre-wrap`, no line clamp / ellipsis,
   * and no clipped overflow.
   */
  async expectFullMessageShownSeparately(message: string): Promise<void> {
    await expect(this.locators.formCardMessageArea).toHaveCount(1);
    await expect(this.locators.formCardMessageText).toHaveText(message.trim());
    const style = await this.locators.formCardMessageText.evaluate((el) => {
      const cs = el.ownerDocument.defaultView!.getComputedStyle(el);
      return {
        whiteSpace: cs.whiteSpace,
        textOverflow: cs.textOverflow,
        lineClamp: cs.getPropertyValue('-webkit-line-clamp'),
        clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
      };
    });
    expect(style.whiteSpace).toBe('pre-wrap');
    expect(style.textOverflow).not.toBe('ellipsis');
    expect(['', 'none']).toContain(style.lineClamp);
    expect(style.clipped).toBe(false);
    // Separate from the structured fields: not one of the label rows.
    await expect(this.locators.formCardFieldValue('Message')).toHaveCount(0);
  }

  async expectNoMessageArea(): Promise<void> {
    await expect(this.locators.formCardMessageArea).toHaveCount(0);
  }

  /**
   * Read-only: no input/textarea/contenteditable/button (so no edit pen)
   * inside the card, every field carries the "System field" lock icon, and
   * clicking into a value and typing/pasting changes nothing.
   */
  async expectFormCardReadOnly(): Promise<void> {
    await expect(this.locators.formCardEditableControls).toHaveCount(0);
    const labelCount = await this.locators.formCardFieldLabels.count();
    await expect(this.locators.formCardLockIcons).toHaveCount(labelCount);
    const firstLabel = (
      (await this.locators.formCardFieldLabels.first().textContent()) ?? ''
    ).trim();
    const value = this.locators.formCardFieldValue(firstLabel);
    const before = await value.innerText();
    await value.click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.type('overwritten by test');
    await this.page.keyboard.press('Backspace');
    await expect(value).toHaveText(before);
  }

  /** An AI section is present, tagged "Generated by AI", and has real content beyond its heading. */
  async expectAiSectionWithContent(title: string): Promise<void> {
    const section = this.locators.aiSection(title);
    await expect(section).toHaveCount(1);
    await expect(section).toContainText('Generated by AI');
    const text = (await section.innerText()).replace(title, '').replace('Generated by AI', '');
    expect(text.trim().length, `"${title}" has no content`).toBeGreaterThan(10);
  }

  async expectAiSectionAbsent(title: string): Promise<void> {
    await expect(this.locators.aiSection(title)).toHaveCount(0);
  }

  /** No social-media origin content: no Posts/Social/Comments cards, and none of the stored social post texts are rendered. */
  async expectNoSocialOriginContent(data: LeadQualificationData): Promise<void> {
    const titles = await this.cardTitlesInOrder();
    for (const t of titles) {
      expect(t).not.toMatch(/post|social|comment|linkedin|facebook|instagram|captured/i);
    }
    for (const interaction of data.socialInteractions) {
      const text = interaction.content?.text;
      if (text) await expect(this.page.getByText(text, { exact: false })).toHaveCount(0);
    }
  }

  async openAiChatbot(): Promise<void> {
    await this.locators.assistantButton.click();
    await expect(this.locators.aiChatbotTitle).toBeVisible();
  }

  /** Turning the Markup tool on — UI state only, nothing is sent or saved. */
  async turnOnMarkupTool(): Promise<void> {
    await this.locators.markupToolButton.click();
    await expect(this.locators.markupOnHint).toBeVisible();
  }

  /** On a record past the Lead stage the chatbot says the qualification is read-only. */
  async expectAiChatbotReadOnlyNotice(): Promise<void> {
    await expect(this.locators.aiChatbotReadOnlyNotice).toBeVisible();
  }

  async expectAiChatbotAcceptsInput(): Promise<void> {
    await expect(this.locators.markupToolButton).toBeEnabled();
    await expect(this.locators.aiChatbotPrompt).toBeEditable();
  }

  /** Enhanced pointers carry the "✦ Enhanced" marker and a revert button each. */
  async expectEnhancedPointersMarked(): Promise<void> {
    const count = await this.locators.enhancedPointerMarkers.count();
    expect(count).toBeGreaterThan(0);
    await expect(this.locators.revertWordingButtons).toHaveCount(count);
  }

  /** The "Manager's review and score saved" / "Review updated" confirmation is shown. */
  async expectConfirmation(which: 'saved' | 'updated'): Promise<void> {
    const target =
      which === 'saved'
        ? this.locators.reviewSavedConfirmation
        : this.locators.reviewUpdatedConfirmation;
    await expect(target.first()).toBeVisible();
  }

  /** After a successful Save the new-review form resets to its placeholders. */
  async expectReviewFormCleared(): Promise<void> {
    await expect(this.locators.departmentCombobox).toContainText('Select department');
    await expect(this.locators.managerCombobox).toContainText('Select manager');
    await expect(this.locators.reviewTextbox).toHaveValue('');
  }

  async newestReviewSavedTimestamp(): Promise<string> {
    return (await this.locators.reviewSavedTimestamps.first().innerText()).trim();
  }

  /** Inline edit of the newest review with its text cleared — dev blocks it with its own wording. */
  async attemptSaveEditedReviewWithEmptyText(): Promise<void> {
    await this.locators.editReviewButtons.first().click();
    const row = this.locators.editingRowContainer();
    await row.getByRole('textbox').fill('');
    await row.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(this.locators.editReviewRequiredError).toBeVisible();
    await row.getByRole('button', { name: 'Cancel', exact: true }).click();
  }

  /** Clicking the disabled Convert (forced past actionability) leaves the Lead at Lead. */
  async attemptConvertWhileDisabled(): Promise<void> {
    await expect(this.locators.convertButton).toBeDisabled();
    await this.locators.convertButton.click({ force: true });
  }

  async expectStageIsLead(): Promise<void> {
    await expect(this.page.getByText('Lead', { exact: true }).first()).toBeVisible();
    await expect(this.locators.convertButton).toBeVisible();
  }

  /** Past the Lead stage: no new-review form, no Save, no per-review edit, no Convert. */
  async expectQualificationInputsUnavailable(): Promise<void> {
    await expect(this.locators.departmentCombobox).toHaveCount(0);
    await expect(this.locators.managerCombobox).toHaveCount(0);
    await expect(this.locators.reviewTextbox).toHaveCount(0);
    await expect(this.locators.saveReviewButton).toHaveCount(0);
    await expect(this.locators.editReviewButtons).toHaveCount(0);
    await expect(this.locators.convertButton).toHaveCount(0);
  }

  /** The Customers list row for `name` shows `stage` in its CRM Stage column. */
  async expectCustomersListStage(name: string, stage: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.locators.customersSearchBox.fill(name);
    const row = this.locators.customerRow(name);
    await expect(row).toHaveCount(1, { timeout: 20_000 });
    await expect(row).toContainText(stage);
  }

  // =====================================================================
  // [Origin Type = Web Crawled] Lead Qualification (Sprint 5)
  // =====================================================================

  /** The first card on the tab has this title. */
  async expectFirstCard(title: string): Promise<void> {
    await expect(this.locators.cardHeadings.first()).toHaveText(title);
  }

  /** The tab's cards, top to bottom, are exactly these AI sections followed by the "Lead Qualification" review card. */
  async expectAiSectionsInOrder(titles: readonly string[]): Promise<void> {
    await expect(this.locators.cardHeadings).toHaveText([...titles, 'Lead Qualification']);
  }

  /**
   * No crawl card (TC:1–5, TC:9, TC:22): no "Origin"-marked card at all —
   * a Web Crawled Lead has no form card either. Accepted dev behaviour
   * (2026-10-23); call after the tab has loaded (openAndReadQualification()
   * waits for the first card).
   */
  async expectNoOriginCard(): Promise<void> {
    await expect(this.locators.cardHeadings.first()).toBeVisible();
    await expect(this.locators.originCards).toHaveCount(0);
  }

  /** This text appears nowhere on the (loaded) Lead Qualification tab. */
  async expectTabDoesNotShow(text: string): Promise<void> {
    await expect(this.locators.cardHeadings.first()).toBeVisible();
    await expect(this.locators.tabRoot).not.toContainText(text);
  }

  /** The stored detection date appears nowhere on the (loaded) tab, in any of the app's date shapes (TC:3). */
  async expectDetectionDateNotShown(detection: CrawlDetection): Promise<void> {
    await expect(this.locators.cardHeadings.first()).toBeVisible();
    const renderings = await this.detectionDateRenderings(detection.detectedAt);
    await expect(this.locators.tabRoot).not.toContainText(
      new RegExp(renderings.map(escapeRegExp).join('|')),
    );
  }

  /**
   * The detection summary reaches the tab through the AI sections (TC:4):
   * each descriptive line is a Customer Info pointer, in full, and each
   * matched signal ("product fit: <reason>") shows its reason in Business
   * Compatibility Report, with the detection's fit score.
   */
  async expectDetectionSummaryInAiSections(detection: CrawlDetection): Promise<void> {
    const signal = /^[a-z ]+ fit: (.+)$/;
    const described = detection.detectionSummary.filter((line) => !signal.test(line));
    const reasons = detection.detectionSummary
      .map((line) => signal.exec(line)?.[1])
      .filter((reason): reason is string => !!reason);
    expect(described.length, 'detection has no descriptive line').toBeGreaterThan(0);
    expect(reasons.length, 'detection has no matched-signal line').toBeGreaterThan(0);
    await this.expectAiSectionShowsPointers('Customer Info', described);
    const compatibility = this.locators.aiSection('Business Compatibility Report');
    for (const reason of reasons) await expect(compatibility).toContainText(reason);
    await this.expectCompatibilityFromDetection(detection);
  }

  /** The detection date in the shapes the app uses elsewhere (e.g. "10/21/2026", "Oct 21, 2026", "21 Oct 2026"). */
  private async detectionDateRenderings(iso: string): Promise<string[]> {
    return this.page.evaluate((value) => {
      const d = new Date(value);
      return [
        d.toLocaleDateString('en-US'),
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      ];
    }, iso);
  }

  /** An AI section is present and shows something beyond its title (pointers, or its "no relevant information" message). */
  async expectAiSectionNotBlank(title: string): Promise<void> {
    const section = this.locators.aiSection(title);
    await expect(section).toHaveCount(1);
    await expect
      .poll(async () => (await section.innerText()).replace(title, '').trim().length, {
        message: `"${title}" is blank`,
      })
      .toBeGreaterThan(10);
  }

  /** The AI section shows each of these pointer texts. */
  async expectAiSectionShowsPointers(title: string, texts: string[]): Promise<void> {
    const section = this.locators.aiSection(title);
    for (const text of texts) {
      await expect(section.locator('[data-line-locator]').filter({ hasText: text })).toHaveCount(1);
    }
  }

  /** "Unfortunately, no relevant information is available for the <what> online." inside the named AI section. */
  async expectNoRelevantInformation(title: string, what: string): Promise<void> {
    const section = this.locators.aiSection(title);
    await expect(section.filter({ has: this.locators.noRelevantInformation(what) })).toHaveCount(1);
  }

  /**
   * Business Compatibility Report is built from the crawl's fit scoring:
   * its overall score is the detection's fit score, and every scored fit
   * axis shows its reason (e.g. "material match on denim, indigo, cotton").
   */
  async expectCompatibilityFromDetection(detection: CrawlDetection): Promise<void> {
    const section = this.locators.aiSection('Business Compatibility Report');
    await expect(section).toContainText('OVERALL COMPATIBILITY', { ignoreCase: true });
    if (detection.fitScore !== null) await expect(section).toContainText(detection.fitScore);
    const scored = detection.fitAxes.filter((axis) => axis.value !== null);
    expect(scored.length, 'detection has no scored fit axis').toBeGreaterThan(0);
    for (const axis of scored) await expect(section).toContainText(axis.why);
  }

  /** Nothing on the tab says or implies the prospect contacted SAITEX or was answered. */
  async expectNoInboundContactWording(): Promise<void> {
    await expect(this.locators.tabRoot).not.toContainText(
      /submitted via|auto-?reply|acknowledg|replied|reply sent|contacted us|thank you for/i,
    );
  }

  /** No reply/comment/message composer: the only free-text box on the tab is "Manager's review". */
  async expectNoReplyComposer(): Promise<void> {
    await expect(this.locators.composerControls).toHaveCount(0);
    await expect(this.locators.tabTextboxes).toHaveCount(1);
    await expect(this.locators.reviewTextbox).toBeVisible();
  }

  /** The Customer Details tab strip reads "Contacts (n)". */
  async expectContactCount(n: number): Promise<void> {
    await expect(this.locators.contactsTabButton).toHaveText(`Contacts (${n})`);
  }

  /**
   * Overview tab: Customer Management's Origin Type reads the given label
   * (e.g. "Web Crawled") and System's Created By reads "CRM" (the
   * crawler). Goes back to the Lead Qualification tab afterwards.
   */
  async expectOverviewShowsSystemOrigin(originTypeLabel: string): Promise<void> {
    await this.locators.overviewTabButton.click();
    await expect(this.locators.overviewFieldRow('Customer Management', 'Origin Type')).toHaveText(
      new RegExp(`^Origin Type\\s*${escapeRegExp(originTypeLabel)}$`),
    );
    await expect(this.locators.overviewFieldRow('System', 'Created By')).toHaveText(
      /^Created By\s*CRM$/,
    );
    await this.locators.tabButton.click();
    await expect(this.locators.cardHeadings.first()).toBeVisible();
  }

  /**
   * The saved review row names the selected Manager as the reviewer, with
   * no separate author ("saved by …") — accepted dev behaviour (TC:15).
   */
  async expectReviewRowHasNoSeparateAuthor(details: QualificationReview): Promise<void> {
    const row = this.page.getByText(details.review, { exact: false }).locator('..');
    await expect(row).toContainText(details.manager);
    await expect(row).not.toContainText(
      /\b(saved|reviewed|added|written|recorded) by\b|\bauthor\b/i,
    );
  }

  /** The AI Chatbot's opening message on a Lead with AI sections. */
  async expectAiChatbotGreeting(customerName: string): Promise<void> {
    await expect(this.locators.aiChatbotGreeting).toContainText(customerName);
  }

  /** No submitted web-form card on the tab. */
  async expectNoFormCard(): Promise<void> {
    await expect(this.locators.formCard).toHaveCount(0);
  }

  /** At the Lead stage: the Manager's review box takes input and the Convert action is shown. */
  async expectReviewAndConvertAvailable(): Promise<void> {
    await expect(this.locators.reviewTextbox).toBeEditable();
    await expect(this.locators.convertButton).toBeVisible();
  }

  async expectConvertDisabled(): Promise<void> {
    await expect(this.locators.convertButton).toBeDisabled();
  }

  /** "Web Crawled" Lead with no detection: no crawl card. */
  async expectNoCrawlCard(): Promise<void> {
    await expect(this.locators.crawlCard).toHaveCount(0);
  }

  // --- Lead Qualification Chatbot (Sprint 5) -----------------------------
  // Confirmed on dev 2026-10-22 against the seeded Lead with a dossier —
  // see LeadQualificationLocators' AI CHATBOT block for the DOM. A targeted
  // prompt makes the agent call its `crm__lq_enhance_line` tool, which the
  // page applies with POST `/api/crm/customers/:id/lead-dossier/enhancements`
  // ({locator, section, previousText, newText, instruction}); "Revert to
  // the previous wording" posts `.../enhancements/revert`. After either,
  // the tab re-reads GET `/lead-qualification` before the pointer changes
  // on screen — on slow dev that alone took 5–40 s.

  async isAssistantButtonShown(): Promise<boolean> {
    return (await this.locators.assistantButton.count()) > 0;
  }

  async closeAiChatbot(): Promise<void> {
    await this.locators.closeAssistantButton.click();
    await expect(this.locators.aiChatbotPanel).toBeHidden();
    await expect(this.locators.assistantButton).toBeVisible();
  }

  /** Panel open with its opening message naming the Lead and every control TC:1 lists. */
  async expectChatbotOpenedFor(leadName: string): Promise<void> {
    await expect(this.locators.aiChatbotPanel).toBeVisible();
    await expect(this.locators.aiChatbotOpeningMessage(leadName)).toBeVisible();
    await expect(this.locators.aiChatbotOpeningMessage(leadName)).toContainText(
      'use the markup tool (⌖ on any pointer) to target a specific line',
    );
    await expect(this.locators.markupToolButton).toBeVisible();
    await expect(this.locators.closeAssistantButton).toBeVisible();
    await expect(this.locators.aiChatbotPromptBox).toBeEditable();
    await expect(this.locators.aiChatbotPromptBox).toHaveAttribute(
      'placeholder',
      'Prompt the AI Chatbot…',
    );
    await expect(this.locators.aiChatbotSendButton).toBeVisible();
  }

  /** Switches the Markup tool to the given state and checks the toggle + hint follow. */
  async setMarkupTool(on: boolean): Promise<void> {
    const pressed = (await this.locators.markupToolButton.getAttribute('aria-pressed')) === 'true';
    if (pressed !== on) await this.locators.markupToolButton.click();
    await expect(this.locators.markupToolButton).toHaveAttribute('aria-pressed', String(on));
    if (on) {
      await expect(this.locators.markupOnHint).toBeVisible();
    } else {
      await expect(this.locators.markupOnHint).toBeHidden();
    }
  }

  /** No ⌖ target control on any pointer, in any AI section. */
  async expectNoTargetControls(): Promise<void> {
    for (const section of DEV_AI_SECTION_TITLES) {
      await expect(this.locators.pointerTargets(section)).toHaveCount(0);
    }
  }

  /**
   * Every pointer in every AI section has a ⌖ target control. Bullet rows
   * (`[data-line-locator]`) and Compatibility rows (one per score ring,
   * minus the "Overall compatibility" ring) are counted from the DOM;
   * Product Range's pointers are its Most/Least expensive lines (the
   * category chips and product images aren't pointers).
   */
  async expectTargetControlsOnEveryPointer(): Promise<void> {
    for (const section of DEV_AI_SECTION_TITLES) {
      const targets = this.locators.pointerTargets(section);
      const box = this.locators.aiSection(section);
      if (section === 'Business Compatibility Report') {
        const rings = await box.getByRole('img', { name: /^Score .* out of 10$/ }).count();
        await expect(targets).toHaveCount(rings - 1);
      } else if (section === "Customer's Product Range") {
        await expect(targets).toHaveCount(2);
      } else {
        await expect(targets).toHaveCount(await box.locator('[data-line-locator]').count());
      }
      expect(await targets.count(), `"${section}" has no pointers`).toBeGreaterThan(0);
    }
  }

  /** Every target control's accessible name — dev uses the section title. */
  async expectTargetControlsLabelled(): Promise<void> {
    for (const section of DEV_AI_SECTION_TITLES) {
      const targets = this.locators.pointerTargets(section);
      const n = await targets.count();
      for (let i = 0; i < n; i++) await expect(targets.nth(i)).toHaveAccessibleName(section);
    }
  }

  async pointerText(section: string, index: number): Promise<string> {
    return (await this.locators.pointerRow(section, index).innerText()).replace(/\s+/g, ' ').trim();
  }

  /**
   * Snapshot of the dossier as shown: each AI section's full text, and (via
   * the Markup tool's target rows) each pointer's text. Needs the chatbot
   * open; leaves the Markup tool off.
   */
  async snapshotDossier(): Promise<DossierSnapshot> {
    const snapshot: DossierSnapshot = { sections: {}, pointers: {} };
    await this.setMarkupTool(true);
    for (const section of DEV_AI_SECTION_TITLES) {
      const n = await this.locators.pointerTargets(section).count();
      const texts: string[] = [];
      for (let i = 0; i < n; i++) texts.push(await this.pointerText(section, i));
      snapshot.pointers[section] = texts;
    }
    await this.setMarkupTool(false);
    snapshot.sections = await this.sectionTexts();
    return snapshot;
  }

  async sectionTexts(): Promise<Record<string, string>> {
    const texts: Record<string, string> = {};
    for (const section of DEV_AI_SECTION_TITLES) {
      texts[section] = (await this.locators.aiSection(section).innerText())
        .replace(/\s+/g, ' ')
        .trim();
    }
    return texts;
  }

  /** Every section reads exactly as in the snapshot, except the ones named. */
  async expectSectionsUnchanged(snapshot: DossierSnapshot, except: string[] = []): Promise<void> {
    const now = await this.sectionTexts();
    for (const section of DEV_AI_SECTION_TITLES) {
      if (except.includes(section)) continue;
      expect(now[section], `"${section}" changed`).toBe(snapshot.sections[section]);
    }
  }

  async expectNoEnhancedMarkers(): Promise<void> {
    await expect(this.locators.enhancedPointerMarkers).toHaveCount(0);
    await expect(this.locators.revertWordingButtons).toHaveCount(0);
  }

  /**
   * Targets pointer `index` of `section` with the Markup tool (switched on
   * first) and checks the target chip. `how`: a mouse click, or Enter /
   * Space on the focused control. Returns the pointer text the chip shows.
   */
  async targetPointer(
    section: string,
    index: number,
    how: 'click' | 'Enter' | 'Space' = 'Enter',
  ): Promise<string> {
    await this.setMarkupTool(true);
    const rowText = await this.pointerText(section, index);
    const target = this.locators.pointerTargets(section).nth(index);
    if (how === 'click') {
      await target.click();
    } else {
      await target.focus();
      await this.page.keyboard.press(how);
    }
    return this.expectTargetChip(section, rowText);
  }

  /**
   * Exactly one target strip, reading "<Section>: <pointer text>" (for the
   * Product Range / Compatibility rows the row also carries its label or
   * score, so the chip's text is checked to be part of `rowText`), with its
   * clear button; the prompt asks how the line should change. Returns the
   * chip's pointer text.
   */
  async expectTargetChip(section: string, rowText: string): Promise<string> {
    await expect(this.locators.stopPointingButton).toHaveCount(1);
    await expect(this.locators.targetChip).toContainText(`${section}: `);
    const chip = (await this.locators.targetChip.innerText()).replace(/\s+/g, ' ').trim();
    const pointer = chip.slice(`${section}: `.length);
    expect(chip.startsWith(`${section}: `), `target chip "${chip}"`).toBe(true);
    expect(pointer.length).toBeGreaterThan(0);
    expect(rowText, `target chip "${chip}" names the targeted pointer`).toContain(pointer);
    await expect(this.locators.aiChatbotPromptBox).toHaveAttribute(
      'placeholder',
      'How should this line change?',
    );
    return pointer;
  }

  async expectNoTargetChip(): Promise<void> {
    await expect(this.locators.stopPointingButton).toHaveCount(0);
    await expect(this.locators.aiChatbotPromptBox).toHaveAttribute(
      'placeholder',
      'Prompt the AI Chatbot…',
    );
  }

  async clearTarget(): Promise<void> {
    await this.locators.stopPointingButton.click();
    await this.expectNoTargetChip();
  }

  async typePrompt(text: string): Promise<void> {
    await this.locators.aiChatbotPromptBox.fill(text);
  }

  /** Types the prompt and sends it with the Send button or the Enter key. */
  async sendPrompt(text: string, via: 'button' | 'Enter' = 'button'): Promise<void> {
    await this.typePrompt(text);
    if (via === 'button') {
      await this.locators.aiChatbotSendButton.click();
    } else {
      await this.locators.aiChatbotPromptBox.press('Enter');
    }
  }

  /**
   * Waits until `count` replies are in the thread and nothing is pending
   * (no activity phrase, prompt enabled again). AI replies on dev took
   * 20–70 s on 2026-10-22, so this allows up to AI_REPLY_TIMEOUT.
   */
  async waitForReplies(count: number): Promise<void> {
    await expect(this.locators.assistantMessages).toHaveCount(count, {
      timeout: AI_REPLY_TIMEOUT,
    });
    await expect(this.locators.activityPhrase).toHaveCount(0, { timeout: AI_REPLY_TIMEOUT });
    await expect(this.locators.aiChatbotPromptBox).toBeEnabled({ timeout: AI_REPLY_TIMEOUT });
  }

  /** Sends a prompt and waits for its reply; returns the reply's text. */
  async askAndWaitForReply(text: string, via: 'button' | 'Enter' = 'button'): Promise<string> {
    const before = await this.locators.assistantMessages.count();
    await this.sendPrompt(text, via);
    await this.waitForReplies(before + 1);
    return this.locators.assistantMessages.last().innerText();
  }

  /**
   * Sends a refinement for the currently targeted pointer, waits for the
   * page to apply the AI's rewrite (the enhancement POST) and for the reply.
   */
  async refineTargetedPointer(prompt: string): Promise<EnhancementResult> {
    const applied = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        /\/lead-dossier\/enhancements$/.test(new URL(r.url()).pathname),
      { timeout: AI_REPLY_TIMEOUT },
    );
    applied.catch(() => undefined);
    const reply = await this.askAndWaitForReply(prompt);
    const response = await applied;
    expect(response.ok(), `enhancement POST answered ${response.status()}`).toBe(true);
    const request = response.request().postDataJSON() as { instruction?: string };
    const record = (await response.json()) as Omit<EnhancementResult, 'reply' | 'instruction'>;
    return { ...record, instruction: request.instruction ?? '', reply };
  }

  /** Counts the enhancement POSTs the page makes from now on (e.g. to prove a prompt didn't refine anything). */
  trackEnhancementRequests(): () => number {
    let n = 0;
    this.page.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        /\/lead-dossier\/enhancements$/.test(new URL(r.url()).pathname)
      ) {
        n++;
      }
    });
    return () => n;
  }

  /**
   * After a refinement: exactly `markers` "✦ Enhanced" pointer(s) in
   * `section`, which now shows `newText`, while its other pointers still
   * read as before.
   */
  async expectPointerEnhanced(
    snapshot: DossierSnapshot,
    section: string,
    index: number,
    newText: string,
  ): Promise<void> {
    const box = this.locators.aiSection(section);
    await expect(this.locators.enhancedMarkersIn(section)).toHaveCount(1, {
      timeout: UI_REFRESH_TIMEOUT,
    });
    await expect(box).toContainText(newText);
    const others = (snapshot.pointers[section] ?? []).filter((_, i) => i !== index);
    for (const other of others) await expect(box).toContainText(other, { useInnerText: true });
  }

  async expectThreadMessages(userTexts: string[]): Promise<void> {
    await expect(this.locators.userMessages).toHaveText(userTexts);
  }

  /** Bubble roles top to bottom, e.g. ['user', 'assistant', ...]. */
  async threadRolesInOrder(): Promise<string[]> {
    return this.locators.aiChatbotPanel
      .locator('[data-role="user"], [data-role="assistant"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-role') ?? ''));
  }

  /** The target line shown above user prompt `index` (0-based), or null for a general prompt. */
  async threadTargetOf(index: number): Promise<string | null> {
    const line = this.locators.threadTargetLineFor(this.locators.userMessages.nth(index));
    if ((await line.count()) === 0) return null;
    return (await line.innerText()).replace(/\s+/g, ' ').trim();
  }

  async threadScrollState(): Promise<{ top: number; height: number; client: number }> {
    return this.locators.threadViewport.evaluate((el) => ({
      top: el.scrollTop,
      height: el.scrollHeight,
      client: el.clientHeight,
    }));
  }

  async scrollThreadToTop(): Promise<void> {
    await this.locators.threadViewport.evaluate((el) => el.scrollTo({ top: 0 }));
    await expect.poll(async () => (await this.threadScrollState()).top).toBe(0);
  }

  /**
   * The newest message is scrolled into view: the bottom edge of the last
   * bubble sits inside the thread's visible area. (Dev keeps the content's
   * 16px bottom padding below it, so "scrollTop at the very end" is not the
   * criterion.)
   */
  async expectThreadScrolledToBottom(): Promise<void> {
    const last = this.locators.aiChatbotPanel
      .locator('[data-role="user"], [data-role="assistant"]')
      .last();
    await expect
      .poll(async () => {
        const view = await this.locators.threadViewport.boundingBox();
        const msg = await last.boundingBox();
        if (!view || !msg) return false;
        const bottom = msg.y + msg.height;
        return bottom <= view.y + view.height + 1 && bottom >= view.y;
      })
      .toBe(true);
  }

  /** The pending state: activity phrase showing, prompt and Send both unavailable. */
  async expectReplyPending(): Promise<string> {
    await expect(this.locators.activityPhrase).toBeVisible();
    await expect(this.locators.aiChatbotPromptBox).toBeDisabled();
    await expect(this.locators.aiChatbotSendButton).toBeDisabled();
    return this.locators.activityPhrase.innerText();
  }

  /** Makes the assistant's agent request fail at the network layer (nothing reaches the AI service). */
  async failAssistantRequests(): Promise<void> {
    await this.page.route(ASSISTANT_RUN_URL, (route) => route.abort('failed'));
  }

  async restoreAssistantRequests(): Promise<void> {
    await this.page.unroute(ASSISTANT_RUN_URL);
  }

  /** Tooltip text of the first "Revert to the previous wording" button (hover). */
  async revertTooltipText(): Promise<string> {
    await this.locators.revertWordingButtons.first().hover();
    const tip = this.page.getByRole('tooltip');
    await expect(tip).toBeVisible();
    return (await tip.innerText()).trim();
  }

  /**
   * Reverts every enhanced pointer on the tab through "Revert to the
   * previous wording", one at a time, waiting for each revert POST and for
   * the screen to drop that marker. Returns the pointer texts (and errors)
   * it could NOT revert — empty when everything was restored.
   */
  async revertAllEnhancements(): Promise<string[]> {
    const failed: string[] = [];
    for (let guard = 0; guard < 12; guard++) {
      const buttons = this.locators.revertWordingButtons;
      const count = await buttons.count();
      if (count === 0) break;
      const row = buttons.first().locator('xpath=..');
      const label = (await row.innerText()).replace(/\s+/g, ' ').trim();
      try {
        const reverted = this.page.waitForResponse(
          (r) =>
            r.request().method() === 'POST' &&
            new URL(r.url()).pathname.endsWith('/lead-dossier/enhancements/revert'),
          { timeout: UI_REFRESH_TIMEOUT },
        );
        await buttons.first().click();
        const response = await reverted;
        if (!response.ok()) throw new Error(`revert POST answered ${response.status()}`);
        await expect(buttons).toHaveCount(count - 1, { timeout: UI_REFRESH_TIMEOUT });
      } catch (e) {
        failed.push(`${label} (${String(e).split('\n')[0]})`);
        break;
      }
    }
    return failed;
  }

  /**
   * Keyboard only: from the first target control, Tab moves through every
   * other target control in page order (no other focus stop in between).
   */
  async expectTabMovesThroughTargets(): Promise<void> {
    const all: Locator[] = [];
    for (const section of DEV_AI_SECTION_TITLES) {
      const targets = this.locators.pointerTargets(section);
      const n = await targets.count();
      for (let i = 0; i < n; i++) all.push(targets.nth(i));
    }
    expect(all.length).toBeGreaterThan(1);
    await all[0]!.focus();
    for (const next of all.slice(1)) {
      await this.page.keyboard.press('Tab');
      await expect(next).toBeFocused();
    }
  }

  /** Still on the Lead Qualification tab with every AI section rendered. */
  async expectQualificationScreenIntact(): Promise<void> {
    await expect(this.locators.tabButton).toBeVisible();
    for (const section of DEV_AI_SECTION_TITLES) {
      await expect(this.locators.aiSection(section)).toBeVisible();
    }
  }

  /** Total "✦ Enhanced" markers on the tab. */
  async enhancedMarkerCount(): Promise<number> {
    return this.locators.enhancedPointerMarkers.count();
  }

  /** Text of every pointer currently marked "✦ Enhanced" (marker's parent line). */
  async enhancedPointerTexts(): Promise<string[]> {
    return this.locators.enhancedPointerMarkers.evaluateAll((els) =>
      els.map((e) => (e.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim()),
    );
  }

  /**
   * User prompt `index` shows its target "<Section>: <pointer>" above it.
   * Dev cuts a long pointer short with "…", so the shown text must be the
   * pointer itself or its start followed by "…".
   */
  async expectThreadTarget(index: number, section: string, pointer: string): Promise<void> {
    const shown = await this.threadTargetOf(index);
    expect(shown, `prompt ${index + 1} shows its target`).not.toBeNull();
    expect(shown!.startsWith(`${section}: `), `target line "${shown}"`).toBe(true);
    const text = shown!.slice(`${section}: `.length);
    if (text.endsWith('…')) {
      expect(pointer.startsWith(text.slice(0, -1).trimEnd()), `target line "${shown}"`).toBe(true);
    } else {
      expect(text).toBe(pointer);
    }
  }
}
