import { type Page, expect } from '@playwright/test';
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
  async tryOpenAndReadQualification(customerId: string): Promise<LeadQualificationData | null> {
    const customer = this.page.waitForResponse(
      (r) => r.request().method() === 'GET' && r.url().endsWith(`/api/crm/customers/${customerId}`),
      { timeout: LQ_READ_TIMEOUT },
    );
    const qualification = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' &&
        r.url().endsWith(`/customers/${customerId}/lead-qualification`) &&
        r.ok(),
      { timeout: LQ_READ_TIMEOUT },
    );
    // Only awaited when the record exists — keep a rejected wait from going unhandled.
    qualification.catch(() => undefined);
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    if (!(await customer).ok()) return null;
    await this.locators.tabButton.click();
    const data = (await (await qualification).json()) as LeadQualificationData;
    await expect(this.locators.cardHeadings.first()).toBeVisible();
    return data;
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
  async reloadOnTab(): Promise<void> {
    await this.page.reload();
    await this.locators.tabButton.click();
    await expect(this.locators.cardHeadings.first()).toBeVisible();
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

  /**
   * Waits a few seconds for a confirmation that ClickUp expects but dev
   * doesn't show — returns whether it ever appeared (a toast can vanish,
   * so a single instant snapshot isn't enough).
   */
  async confirmationAppears(which: 'saved' | 'updated', timeout = 4_000): Promise<boolean> {
    const target =
      which === 'saved'
        ? this.locators.reviewSavedConfirmation
        : this.locators.reviewUpdatedConfirmation;
    return target
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
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
   * The crawl origin card (story/TC:1): exactly one "Origin"-marked card
   * that isn't the Web Form card, and it's the first card on the tab,
   * above Customer Info. Dev (2026-10-23) renders no such card.
   */
  async expectCrawlCardFirst(): Promise<void> {
    await expect(this.locators.crawlCard).toHaveCount(1);
    const title = await this.locators.crawlCard
      .getByRole('heading', { level: 2 })
      .first()
      .innerText();
    await expect(this.locators.cardHeadings.first()).toHaveText(title);
  }

  /** The crawl card names the crawled site or the crawl cohort (TC:2). */
  async expectCrawlCardNamesSource(detection: CrawlDetection): Promise<void> {
    await expect(this.locators.crawlCard).toHaveCount(1);
    const host = new URL(detection.sourceDomain).host.replace(/^www\./, '');
    await expect(this.locators.crawlCard).toContainText(
      new RegExp(`${escapeRegExp(host)}|${escapeRegExp(detection.intentLabel.trim())}`, 'i'),
    );
  }

  /** The crawl card shows the stored detection date, in one of the app's date shapes (TC:3). */
  async expectCrawlCardDate(detection: CrawlDetection): Promise<void> {
    await expect(this.locators.crawlCard).toHaveCount(1);
    const renderings = await this.detectionDateRenderings(detection.detectedAt);
    await expect(this.locators.crawlCard).toContainText(
      new RegExp(renderings.map(escapeRegExp).join('|')),
    );
  }

  /** Every detection-summary line, incl. the matched signal, is on the crawl card in full (TC:4). */
  async expectCrawlCardFullSummary(detection: CrawlDetection): Promise<void> {
    await expect(this.locators.crawlCard).toHaveCount(1);
    expect(
      detection.detectionSummary.some((line) => /^[a-z ]+ fit: /.test(line)),
      'detection has no matched-signal line',
    ).toBe(true);
    for (const line of detection.detectionSummary) {
      await expect(this.locators.crawlCard).toContainText(line);
    }
    await expect(this.locators.crawlCard.getByText(/^(see|show|read) more$/i)).toHaveCount(0);
  }

  /** The crawl card says the Lead came from the crawler (TC:9). */
  async expectCrawlCardSaysCrawler(): Promise<void> {
    await expect(this.locators.crawlCard).toHaveCount(1);
    await expect(this.locators.crawlCard).toContainText(/crawl/i);
  }

  /**
   * The crawl card is read-only (TC:5): no input, text area, button or
   * contenteditable on it, and typing into it changes nothing.
   */
  async expectCrawlCardReadOnly(): Promise<void> {
    const card = this.locators.crawlCard;
    await expect(card).toHaveCount(1);
    await expect(
      card.locator('input, textarea, button, [contenteditable=""], [contenteditable="true"]'),
    ).toHaveCount(0);
    const before = await card.innerText();
    await card.getByRole('heading', { level: 2 }).first().click();
    await this.page.keyboard.type('edited by playwright');
    await expect(card).toHaveText(before);
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

  /** The saved review row also names who saved it ("Saved by …" / author), separate from the selected Manager (TC:15). */
  async expectReviewRowShowsAuthor(details: QualificationReview): Promise<void> {
    const row = this.page.getByText(details.review, { exact: false }).locator('..');
    await expect(row).toContainText(/\b(saved|reviewed|added|written|recorded) by\b|\bauthor\b/i);
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
}
