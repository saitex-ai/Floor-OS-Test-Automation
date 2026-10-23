import { type Locator, type Page } from '@playwright/test';

/**
 * Raw locators for the Social-Media-Post-specific parts of the Lead
 * Qualification tab (CRM Sprint 5, [Origin Type = Social Media Post]).
 * The shared tab (review form, Convert, AI sections, AI Chatbot) stays in
 * lead-qualification.locators.ts; actions and assertions are in
 * src/pages/crm/social-media-lead-qualification.page.ts.
 *
 * Confirmed against dev (2026-10-23):
 * - A Social Media Post Lead's tab opens with a <section> whose <h2> is
 *   "Posts" and which carries an "Origin" badge (`data-slot="badge"`),
 *   above every AI section, even with no captured post.
 * - Each captured post is a direct child <div> of that section with: an
 *   initials avatar (e.g. "NJ"), the author's name in a `span.block`
 *   followed by a muted span "@handle · Channel · M/D/YYYY, h:mm:ss AM"
 *   (the post's own `postedAt` in the browser's locale), the post text in
 *   a <div>, a shaded Relevancy block
 *   (`data-line-locator="social_interaction/<id>/relevancy"`, label
 *   "Relevancy" plus the reasoning) and one "View on the platform" button.
 * - With no captured post the card reads "No posts captured yet." and
 *   nothing else.
 * - Past the Lead stage the whole tab root has `pointer-events: none`.
 */
export class SocialMediaLeadQualificationLocators {
  readonly tabRoot: Locator;
  readonly postsCard: Locator;
  readonly postsCardTitle: Locator;
  readonly postsCardOriginBadge: Locator;
  readonly originBadges: Locator;
  readonly postEntries: Locator;
  readonly noPostsMessage: Locator;
  readonly viewOnPlatformButtons: Locator;
  readonly postsCardEditableControls: Locator;
  readonly postsCardEditIcons: Locator;
  readonly inboundSocialCards: Locator;
  /** Dev's review-score error (2026-10-22 on): "Score (1–10) required". */
  readonly scoreRequiredError: Locator;
  readonly overviewTabButton: Locator;
  readonly aiChatbotGreeting: Locator;

  constructor(private readonly page: Page) {
    this.tabRoot = page.locator('#lead-qualification-tab-root');
    const postsHeading = page.getByRole('heading', { level: 2, name: 'Posts', exact: true });
    this.postsCard = this.tabRoot.locator('section').filter({ has: postsHeading });
    this.postsCardTitle = this.postsCard.getByRole('heading', { level: 2 });
    this.postsCardOriginBadge = this.postsCard.locator('[data-slot="badge"]', {
      hasText: /^Origin$/,
    });
    this.originBadges = this.tabRoot.locator('[data-slot="badge"]', { hasText: /^Origin$/ });
    this.viewOnPlatformButtons = this.postsCard.getByRole('button', {
      name: 'View on the platform',
    });
    this.postEntries = this.postsCard
      .locator(':scope > div')
      .filter({ has: page.locator('[data-line-locator$="/relevancy"]') });
    this.noPostsMessage = this.postsCard.getByText('No posts captured yet.', { exact: true });
    this.postsCardEditableControls = this.postsCard.locator(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    );
    this.postsCardEditIcons = this.postsCard.locator(
      '.lucide-pencil, .lucide-pen, .lucide-square-pen, .lucide-pencil-line, [aria-label*="Edit" i]',
    );
    // The legacy "Social Media" origin type renders Messages / Comments cards.
    this.inboundSocialCards = this.tabRoot
      .locator('section')
      .filter({ has: page.getByRole('heading', { level: 2, name: /^(Messages|Comments)$/ }) });
    this.scoreRequiredError = page.getByText(/^Score (\(1.10\) required|out of 10 is required)$/);
    this.overviewTabButton = page.getByRole('button', { name: 'Overview', exact: true });
    this.aiChatbotGreeting = page.getByText(/^I generated the qualification sections for /);
  }

  /** The n-th captured post's initials avatar. */
  postAvatar(entry: Locator): Locator {
    return entry.locator('span.rounded-full').first();
  }

  /** "Author Name @handle · Channel · date" — name and muted meta line together. */
  postAuthorLine(entry: Locator): Locator {
    return entry.locator('span.block').first();
  }

  /** The muted "@handle · Channel · date" part of the author line. */
  postMetaLine(entry: Locator): Locator {
    return this.postAuthorLine(entry).locator('span').first();
  }

  relevancyBlock(entry: Locator): Locator {
    return entry.locator('[data-line-locator$="/relevancy"]');
  }

  /** The reasoning text inside the Relevancy block (after the "Relevancy" label). */
  relevancyText(entry: Locator): Locator {
    return this.relevancyBlock(entry).locator(':scope > span').nth(1);
  }

  /** The post text: the <div> right before the Relevancy block. */
  postText(entry: Locator): Locator {
    return this.relevancyBlock(entry).locator('xpath=preceding-sibling::div[1]');
  }

  /** An AI section card by its <h2> title. */
  aiSection(title: string): Locator {
    return this.tabRoot
      .locator('section')
      .filter({ has: this.page.getByRole('heading', { level: 2, name: title, exact: true }) });
  }
}

/**
 * Social Media Listening (CRM sidebar): `/crm/social-media-listening` lists
 * the captured posts (Author, Post, Channel, Customer, CRM Stage, Posted);
 * clicking a row opens `/crm/social-media-listening/<interactionId>` with
 * a "Post" section (channel · date, text, "View Post on Social Media"),
 * an "AI relevancy reasoning" section and a "Lead" section whose button
 * names the Lead (name, "CTC… ·", CRM Stage, status). Confirmed on dev
 * 2026-10-23.
 */
export class SocialMediaListeningLocators {
  readonly postRows: Locator;
  readonly detailHeading: Locator;
  readonly detailPostSection: Locator;
  readonly detailPostText: Locator;
  readonly viewPostOnSocialMediaButton: Locator;
  readonly relevancyReasoningSection: Locator;
  readonly leadSection: Locator;
  readonly leadCardButton: Locator;

  constructor(private readonly page: Page) {
    this.postRows = page.getByRole('row').filter({ has: page.getByRole('cell') });
    this.detailHeading = page.getByRole('heading', { level: 1 });
    this.detailPostSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Post', exact: true }) });
    this.detailPostText = this.detailPostSection.locator(':scope > div').nth(1);
    this.viewPostOnSocialMediaButton = page.getByRole('button', {
      name: 'View Post on Social Media',
    });
    this.relevancyReasoningSection = page.locator('section').filter({
      has: page.getByRole('heading', { level: 2, name: 'AI relevancy reasoning', exact: true }),
    });
    this.leadSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Lead', exact: true }) });
    this.leadCardButton = this.leadSection.getByRole('button');
  }

  /** A post row on the list, by the post's author name. */
  postRow(author: string): Locator {
    return this.postRows.filter({ hasText: author });
  }
}
