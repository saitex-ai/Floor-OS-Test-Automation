import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { LeadQualificationPage, type LeadQualificationData } from './lead-qualification.page';
import {
  SocialMediaLeadQualificationLocators,
  SocialMediaListeningLocators,
} from '../../locators/crm/social-media-lead-qualification.locators';

const SOCIAL_MEDIA_LISTENING_PATH = '/crm/social-media-listening';

/**
 * One captured post as returned by the tab's own GET
 * `/api/crm/customers/:id/lead-qualification` (`socialInteractions[]`,
 * shape confirmed on dev 2026-10-23).
 */
export interface SocialPost {
  id: string;
  kindCode: string;
  externalId: string;
  postedAt: string;
  content: {
    author: { name: string; handle: string };
    text: string;
    platform: string;
    url: string;
  };
  relevancy: string[];
  responses: unknown[];
}

/** The lead-qualification read, with the Social Media Post / crawl parts these tests use. */
export type SocialLeadQualificationData = Omit<LeadQualificationData, 'socialInteractions'> & {
  socialInteractions: SocialPost[];
  crawlDetection?: {
    sourceDomain: string;
    intentLabel: string;
    detectionSummary: string[];
  } | null;
  dossier: {
    generatedBy?: string;
    payload?: {
      contactInfo?: { text: string }[];
      customerInfo?: { points?: { text: string }[] };
    };
  } | null;
};

/** The AI sections dev renders below the Posts card (2026-10-23), in order. */
export const SOCIAL_MEDIA_POST_AI_SECTIONS = [
  'Customer Info',
  "Customer's Financial Standpoint",
  "Customer's Product Range",
  'Business Compatibility Report',
] as const;

/**
 * [Origin Type = Social Media Post] Lead Qualification (CRM Sprint 5).
 * Builds on LeadQualificationPage (review form, Convert, AI Chatbot) and
 * adds the Posts origin card. Kept in its own file so the shared Lead
 * Qualification page object stays untouched.
 */
export class SocialMediaLeadQualificationPage extends LeadQualificationPage {
  readonly social: SocialMediaLeadQualificationLocators;

  constructor(page: Page) {
    super(page);
    this.social = new SocialMediaLeadQualificationLocators(page);
  }

  async openSocialLead(customerId: string): Promise<SocialLeadQualificationData | null> {
    return (await this.tryOpenAndReadQualification(
      customerId,
    )) as SocialLeadQualificationData | null;
  }

  async readSocialLead(customerId: string): Promise<SocialLeadQualificationData> {
    return (await this.openAndReadQualification(customerId)) as SocialLeadQualificationData;
  }

  /** Waits for the Create Customer form (a slow dev can still be showing the Customers list). */
  async waitForCreateCustomerForm(): Promise<void> {
    await expect(this.page.getByRole('textbox', { name: 'Customer Name' })).toBeVisible({
      timeout: 90_000,
    });
  }

  postEntry(index = 0): Locator {
    return this.social.postEntries.nth(index);
  }

  /** Exactly one Posts card, and it is the first card on the tab, above Customer Info. */
  async expectPostsCardIsFirstCard(): Promise<void> {
    await expect(this.social.postsCard).toHaveCount(1);
    await expect(this.locators.cardHeadings.first()).toHaveText('Posts');
  }

  /** Titled "Posts", carries the Origin badge, and no other card on the tab does. */
  async expectPostsCardMarkedOrigin(): Promise<void> {
    await expect(this.social.postsCardTitle).toHaveText('Posts');
    await expect(this.social.postsCardOriginBadge).toBeVisible();
    await expect(this.social.originBadges).toHaveCount(1);
    for (const title of SOCIAL_MEDIA_POST_AI_SECTIONS) {
      await expect(this.social.aiSection(title).locator('[data-slot="badge"]')).toHaveCount(0);
    }
  }

  /** Cards on the tab, top to bottom: Posts, then these AI sections, then the review card. */
  async expectCardsInOrder(aiSections: readonly string[]): Promise<void> {
    await expect(this.locators.cardHeadings).toHaveText([
      'Posts',
      ...aiSections,
      'Lead Qualification',
    ]);
  }

  /** The browser's own rendering of a date, as the Posts card shows it (e.g. "10/21/2026, 12:36:46 PM"). */
  async localDateTime(iso: string): Promise<string> {
    return this.page.evaluate((value) => new Date(value).toLocaleString('en-US'), iso);
  }

  /** Initials avatar, author name, then "@handle · Channel · date" (the post's `postedAt`). */
  async expectPostAuthorLine(entry: Locator, post: SocialPost): Promise<void> {
    const initials = post.content.author.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
    await expect(this.social.postAvatar(entry)).toHaveText(initials);
    const when = await this.localDateTime(post.postedAt);
    const meta = `${post.content.author.handle} · ${post.content.platform} · ${when}`;
    await expect(this.social.postMetaLine(entry)).toHaveText(meta);
    await expect(this.social.postAuthorLine(entry)).toHaveText(
      `${post.content.author.name} ${meta}`,
    );
  }

  /** The post text word for word, with no clamp, ellipsis, clipping or "see more". */
  async expectFullPostText(entry: Locator, post: SocialPost): Promise<void> {
    const text = this.social.postText(entry);
    await expect(text).toHaveText(post.content.text.trim());
    const style = await text.evaluate((el) => {
      const cs = el.ownerDocument.defaultView!.getComputedStyle(el);
      return {
        textOverflow: cs.textOverflow,
        lineClamp: cs.getPropertyValue('-webkit-line-clamp'),
        clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
      };
    });
    expect(style.textOverflow).not.toBe('ellipsis');
    expect(['', 'none']).toContain(style.lineClamp);
    expect(style.clipped).toBe(false);
    await expect(entry.getByText(/see more|read more|show more/i)).toHaveCount(0);
  }

  /** A shaded "Relevancy" block under the post text, holding the reasoning and only that. */
  async expectRelevancySeparate(entry: Locator, post: SocialPost): Promise<void> {
    const block = this.social.relevancyBlock(entry);
    await expect(block).toHaveCount(1);
    await expect(block.locator(':scope > span').first()).toHaveText('Relevancy');
    await expect(this.social.relevancyText(entry)).toHaveText(post.relevancy.join(' ').trim());
    const background = await block.evaluate(
      (el) => el.ownerDocument.defaultView!.getComputedStyle(el).backgroundColor,
    );
    expect(background).not.toMatch(/^(rgba\(0, 0, 0, 0\)|transparent)$/);
    // Not mixed into the post text, and placed after it.
    await expect(this.social.postText(entry)).not.toContainText(post.relevancy[0]!);
    const order = await block.evaluate(
      (el) => el.previousElementSibling?.textContent?.trim() ?? '',
    );
    expect(order).toBe(post.content.text.trim());
  }

  /**
   * No input/textarea/contenteditable or edit icon on the Posts card, the
   * only button is "View on the platform", and typing over each value
   * changes nothing. Clicks are forced: past the Lead stage the tab has
   * `pointer-events: none`.
   */
  async expectPostReadOnly(entry: Locator, post: SocialPost): Promise<void> {
    await expect(this.social.postsCardEditableControls).toHaveCount(0);
    await expect(this.social.postsCardEditIcons).toHaveCount(0);
    await expect(this.social.postsCard.getByRole('button')).toHaveText(['View on the platform']);
    const targets = [
      this.social.postAuthorLine(entry),
      this.social.postText(entry),
      this.social.relevancyText(entry),
    ];
    for (const target of targets) {
      const before = await target.innerText();
      await target.click({ force: true });
      await this.page.keyboard.press('ControlOrMeta+A');
      await this.page.keyboard.type('overwritten by test');
      await expect(target).toHaveText(before);
    }
    await expect(this.social.postText(entry)).toHaveText(post.content.text.trim());
  }

  /**
   * Past the Lead stage "View on the platform" can't be clicked: the tab
   * is read-only (`pointer-events: none`), so the button gets no pointer
   * events. Accepted dev behaviour (2026-10-23, TC:7).
   */
  async expectViewOnPlatformNotClickable(entry: Locator): Promise<void> {
    const button = entry.getByRole('button', { name: 'View on the platform' });
    await expect(button).toBeVisible();
    const pointerEvents = await button.evaluate(
      (el) => el.ownerDocument.defaultView!.getComputedStyle(el).pointerEvents,
    );
    expect(pointerEvents).toBe('none');
  }

  /**
   * Activates "View on the platform" and returns the new tab. The click is
   * dispatched to the button: on the only dev record with a post (a
   * Qualified Lead) the tab has `pointer-events: none`, so a pointer click
   * can't reach it. The new tab is not interacted with.
   */
  async openPostOnPlatform(entry: Locator): Promise<Page> {
    const popup = this.page.context().waitForEvent('page');
    await entry.getByRole('button', { name: 'View on the platform' }).dispatchEvent('click');
    return popup;
  }

  /** The post's only action is View on the platform; no comment/message/reply/send or sent list. */
  async expectOnlyViewOnPlatformAction(): Promise<void> {
    await expect(this.social.postsCard.getByRole('button')).toHaveText(
      Array(await this.social.postEntries.count()).fill('View on the platform'),
    );
    await expect(
      this.social.tabRoot.getByRole('button', {
        name: /comment|message|reply|send|respond|compose/i,
      }),
    ).toHaveCount(0);
    await expect(this.social.postsCard.getByRole('textbox')).toHaveCount(0);
    // No sent-comments/messages list: once the captured post and relevancy
    // texts are set aside (they're the prospect's / AI's own words), the card
    // holds no such label.
    const cardText = await this.social.postsCard.innerText();
    const captured = [
      ...(await this.social.postsCard.locator('[data-line-locator$="/relevancy"]').allInnerTexts()),
      ...(await this.social.postEntries.evaluateAll((entries) =>
        entries.map(
          (e) =>
            e.querySelector('[data-line-locator$="/relevancy"]')?.previousElementSibling
              ?.textContent ?? '',
        ),
      )),
    ];
    const ownLabels = captured.reduce((text, part) => text.split(part).join(' '), cardText);
    expect(ownLabels).not.toMatch(/\b(sent|comments?|messages?|repl(y|ies)|responses?)\b/i);
  }

  /** The only text box on a Lead-stage tab is "Manager's review" (no composer anywhere). */
  async expectOnlyReviewTextbox(): Promise<void> {
    await expect(this.social.tabRoot.getByRole('textbox')).toHaveCount(1);
    await expect(this.locators.reviewTextbox).toBeVisible();
  }

  /** Each AI section is present, tagged "Generated by AI", and has content. */
  async expectAiSectionsGenerated(titles: readonly string[]): Promise<void> {
    for (const title of titles) await this.expectAiSectionWithContent(title);
  }

  /**
   * Customer Info is the crawler's description of the brand: each
   * descriptive line of the stored crawl detection (not the "… fit: …"
   * signals) is shown there (TC:10, accepted dev behaviour 2026-10-23).
   */
  async expectCustomerInfoShowsDetection(detectionSummary: string[]): Promise<void> {
    const described = detectionSummary.filter((line) => !/^[a-z ]+ fit: /.test(line));
    expect(described.length, 'crawl detection has no descriptive line').toBeGreaterThan(0);
    const section = this.social.aiSection('Customer Info');
    for (const line of described) await expect(section).toContainText(line);
  }

  async expectOverallCompatibilityScore(): Promise<void> {
    await expect(this.social.aiSection('Business Compatibility Report')).toContainText(
      'OVERALL COMPATIBILITY',
      { ignoreCase: true },
    );
  }

  /** The Posts card reads "No posts captured yet." with no post shell or button. */
  async expectNoPostsCaptured(): Promise<void> {
    await expect(this.social.noPostsMessage).toBeVisible();
    await expect(this.social.postEntries).toHaveCount(0);
    await expect(this.social.viewOnPlatformButtons).toHaveCount(0);
    await expect(this.social.postsCard.locator('span.rounded-full')).toHaveCount(0);
  }

  /**
   * No web-form card, no crawl card, no Messages/Comments cards: the only
   * Origin-marked card is Posts, and the stored crawl detection's cohort
   * and matched-signal lines are not shown.
   */
  async expectNoOtherOriginContent(data: SocialLeadQualificationData): Promise<void> {
    await expect(this.locators.formCard).toHaveCount(0);
    await expect(this.social.tabRoot).not.toContainText(/Submitted via /);
    await expect(this.social.inboundSocialCards).toHaveCount(0);
    await expect(this.social.originBadges).toHaveCount(1);
    await expect(this.social.postsCardOriginBadge).toHaveCount(1);
    const detection = data.crawlDetection;
    if (detection) {
      await expect(this.social.tabRoot).not.toContainText(detection.intentLabel);
      for (const line of detection.detectionSummary.filter((l) => /^[a-z ]+ fit: /.test(l))) {
        await expect(this.social.tabRoot.getByText(line, { exact: true })).toHaveCount(0);
      }
    }
  }

  /** Blank Save: dev's four field errors (score wording "Score (1–10) required"). */
  async expectReviewFieldErrors(): Promise<void> {
    await expect(this.locators.departmentSelectError).toBeVisible();
    await expect(this.locators.managerSelectError).toBeVisible();
    await expect(this.social.scoreRequiredError).toBeVisible();
    await expect(this.locators.reviewError).toBeVisible();
  }

  async expectReviewsHeader(text: string): Promise<void> {
    await expect(this.locators.reviewsSummaryText).toHaveText(text);
  }

  /** Overview tab's CRM Stage reads the given stage. */
  async expectOverviewCrmStage(stage: string): Promise<void> {
    await this.social.overviewTabButton.click();
    const field = this.page.getByText('CRM Stage', { exact: true }).first().locator('..');
    await expect(field).toContainText(stage);
    await this.locators.tabButton.click();
    await expect(this.locators.cardHeadings.first()).toBeVisible();
  }

  async expectAssistantNotOffered(): Promise<void> {
    await expect(this.locators.assistantButton).toHaveCount(0);
  }

  async expectAiChatbotGreeting(customerName: string): Promise<void> {
    await expect(this.social.aiChatbotGreeting).toContainText(customerName);
  }
}

/** CRM → Social Media Listening (list + post details), used read-only. */
export class SocialMediaListeningPage extends BasePage {
  readonly locators: SocialMediaListeningLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SocialMediaListeningLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(SOCIAL_MEDIA_LISTENING_PATH);
    await expect(this.locators.postRows.first()).toBeVisible({ timeout: 60_000 });
  }

  /** The list row for a post: author, handle and channel as captured. */
  async expectPostRow(post: SocialPost, customerName: string): Promise<void> {
    const row = this.locators.postRow(post.content.author.name).filter({ hasText: customerName });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(post.content.author.handle);
    await expect(row).toContainText(post.content.platform);
  }

  async openPost(post: SocialPost, customerName: string): Promise<void> {
    await this.locators
      .postRow(post.content.author.name)
      .filter({ hasText: customerName })
      .getByText(post.content.author.name, { exact: true })
      .click();
    await expect(this.page).toHaveURL(new RegExp(`${SOCIAL_MEDIA_LISTENING_PATH}/${post.id}$`));
  }

  async gotoPost(post: SocialPost): Promise<void> {
    await this.gotoAuthenticated(`${SOCIAL_MEDIA_LISTENING_PATH}/${post.id}`);
  }

  /** Post details: the post, View Post on Social Media, AI relevancy reasoning and the Lead card. */
  async expectPostDetails(
    post: SocialPost,
    lead: { name: string; code: string; stage: string },
  ): Promise<void> {
    const l = this.locators;
    await expect(l.detailHeading).toHaveText(post.content.author.name, { timeout: 60_000 });
    await expect(l.detailPostText).toHaveText(post.content.text.trim());
    await expect(l.viewPostOnSocialMediaButton).toBeVisible();
    await expect(l.relevancyReasoningSection).toContainText(post.relevancy[0]!);
    await expect(l.leadCardButton).toContainText(lead.name);
    await expect(l.leadCardButton).toContainText(lead.code);
    await expect(l.leadCardButton).toContainText(lead.stage);
  }

  /** Full post text on the details page (the list truncates it). */
  async postDetailsText(): Promise<string> {
    return (await this.locators.detailPostText.innerText()).trim();
  }

  async openLeadFromPostDetails(): Promise<void> {
    await this.locators.leadCardButton.click();
  }
}
