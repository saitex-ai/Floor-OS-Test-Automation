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
    // 90 s: on dev the Create Customer form can take over a minute to replace
    // the Customers list after "Create Customer" is clicked.
    await expect(this.social.createCustomerNameInput).toBeVisible({ timeout: 90_000 });
  }

  postEntry(index = 0): Locator {
    return this.social.postEntries.nth(index);
  }

  /** Exactly one Posts card, and it is the first card on the tab, above Customer Info. */
  async expectPostsCardIsFirstCard(): Promise<void> {
    await expect(this.social.postsCard).toHaveCount(1);
    await expect(this.locators.cardHeadings.first()).toHaveText('Posts');
  }

  /** The card right below Posts (the first AI section) has this title. */
  async expectCardBelowPosts(title: string): Promise<void> {
    await expect(this.locators.cardHeadings.nth(1)).toHaveText(title);
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
    await expect(this.social.relevancyLabel(entry)).toHaveCount(1);
    await this.expectRelevancyText(entry, post);
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

  /** The Relevancy block's reasoning reads the post's stored relevancy. */
  async expectRelevancyText(entry: Locator, post: SocialPost): Promise<void> {
    await expect(this.social.relevancyText(entry)).toHaveText(post.relevancy.join(' ').trim());
  }

  /**
   * The Posts card offers no way to edit the post: no
   * input/textarea/select/contenteditable/textbox and no edit icon, and its
   * only button is "View on the platform". Nothing is typed into the card,
   * so the seed record is never touched. The post text is checked first, so
   * the negative checks run on a rendered card.
   */
  async expectPostReadOnly(entry: Locator, post: SocialPost): Promise<void> {
    await expect(this.social.postText(entry)).toHaveText(post.content.text.trim());
    await expect(this.social.postsCard.getByRole('button')).toHaveText(['View on the platform']);
    await expect(this.social.postsCardEditableControls).toHaveCount(0);
    await expect(this.social.postsCardEditIcons).toHaveCount(0);
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
   * NOT A USER PATH: fires a click event on "View on the platform" from code
   * and returns the new tab, only to check which URL the button opens. Past
   * the Lead stage (the only dev record with a post is a Qualified Lead) the
   * tab has `pointer-events: none`, so a user cannot click it; this bypasses
   * that on purpose. The new tab is not interacted with.
   */
  async openPostOnPlatformProgrammatically(entry: Locator): Promise<Page> {
    const popup = this.page.context().waitForEvent('page');
    await entry.getByRole('button', { name: 'View on the platform' }).dispatchEvent('click');
    return popup;
  }

  /**
   * The post's only action is View on the platform; no
   * comment/message/reply/send control or sent list. `postCount` is the
   * number of captured posts from the tab's API read: the card is first
   * waited on to show exactly that (each post, or "No posts captured yet."),
   * so the negative checks below never pass on a card that hasn't rendered.
   */
  async expectOnlyViewOnPlatformAction(postCount: number): Promise<void> {
    await expect(this.social.postEntries).toHaveCount(postCount);
    if (postCount === 0) await expect(this.social.noPostsMessage).toBeVisible();
    else await expect(this.social.postText(this.postEntry(0))).toBeVisible();
    await expect(this.social.postsCard.getByRole('button')).toHaveText(
      Array<string>(postCount).fill('View on the platform'),
    );
    await expect(this.social.composerButtons).toHaveCount(0);
    await expect(this.social.postsCard.getByRole('textbox')).toHaveCount(0);
    // No sent-comments/messages list: once the captured post and relevancy
    // texts are set aside (they're the prospect's / AI's own words), the card
    // holds no such label. Polled, and only after the card has rendered above.
    await expect
      .poll(() =>
        this.social.postsCard.evaluate((card) => {
          // Every text node of the card, space-joined, minus each post's
          // text and Relevancy block. (Structural type: the project has no DOM lib.)
          type TextNode = {
            nodeType: number;
            textContent: string | null;
            childNodes: { forEach(fn: (child: TextNode) => void): void };
            previousElementSibling?: TextNode | null;
          };
          const root = card as unknown as TextNode & {
            querySelectorAll(selector: string): { forEach(fn: (el: TextNode) => void): void };
          };
          const skip = new Set<TextNode | null | undefined>();
          root.querySelectorAll('[data-line-locator$="/relevancy"]').forEach((relevancy) => {
            skip.add(relevancy);
            skip.add(relevancy.previousElementSibling);
          });
          const parts: string[] = [];
          const walk = (node: TextNode): void => {
            if (skip.has(node)) return;
            if (node.nodeType === 3) parts.push(node.textContent ?? '');
            node.childNodes.forEach(walk);
          };
          walk(root);
          return parts.join(' ');
        }),
      )
      .not.toMatch(/\b(sent|comments?|messages?|repl(y|ies)|responses?)\b/i);
  }

  /** The only text box on a Lead-stage tab is "Manager's review" (no composer anywhere). */
  async expectOnlyReviewTextbox(): Promise<void> {
    await expect(this.locators.reviewTextbox).toBeVisible();
    await expect(this.locators.tabTextboxes).toHaveCount(1);
  }

  /**
   * Past the Lead stage the tab has no text box at all. The Posts card's
   * heading is waited on first so the count runs on a rendered tab.
   */
  async expectNoTextboxOnTab(): Promise<void> {
    await expect(this.social.postsCardTitle).toBeVisible();
    await expect(this.locators.tabTextboxes).toHaveCount(0);
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

  /** Overview tab's CRM Stage (Customer Management section) reads the given stage. */
  async expectOverviewCrmStage(stage: string): Promise<void> {
    await this.social.overviewTabButton.click();
    await expect(this.locators.overviewFieldRow('Customer Management', 'CRM Stage')).toContainText(
      stage,
    );
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
    // 60 s: dev's Social Media Listening list loads all captured posts before
    // it renders any row, which has taken 30 s+ on dev.
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
    // 60 s: the post details page fetches the post and its Lead before it
    // renders the heading, and is as slow as the list on dev.
    await expect(l.detailHeading).toHaveText(post.content.author.name, { timeout: 60_000 });
    await expect(l.detailPostText).toHaveText(post.content.text.trim());
    await expect(l.viewPostOnSocialMediaButton).toBeVisible();
    await expect(l.relevancyReasoningSection).toContainText(post.relevancy[0]!);
    await expect(l.leadCardButton).toContainText(lead.name);
    await expect(l.leadCardButton).toContainText(lead.code);
    await expect(l.leadCardButton).toContainText(lead.stage);
  }

  async openLeadFromPostDetails(): Promise<void> {
    await this.locators.leadCardButton.click();
  }
}
