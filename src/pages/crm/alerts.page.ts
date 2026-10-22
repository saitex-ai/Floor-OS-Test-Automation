import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AlertsLocators, ALERTS_LIST_PATH } from '../../locators/crm/alerts.locators';
import { parseOutlookComposeUrl, type OutlookCompose } from '../../utils/outlook-compose';

/** Outlook web hosts the CRM's compose deep links point at (see outlook-compose.ts). */
const OUTLOOK_HOSTS =
  /^https:\/\/outlook\.(office\.com|cloud\.microsoft|office365\.com|live\.com)\//;

/**
 * "Alert Detail Screen" (CRM, Sprint 3 user story). Owned by the CRM QA.
 * Confirmed against the running app (2026-09-25) — see AlertsLocators'
 * class doc for the corrections that made to the original ClickUp text.
 *
 * TC:5 (Delete with Confirmation) is deliberately NOT exercised to
 * completion: alerts are entirely AI/system-generated with no "Create
 * Alert" path anywhere in the UI, and this environment's seed pool is a
 * FIXED set of 6 — confirmed directly (no create button exists). Actually
 * deleting one would permanently and irreversibly shrink that pool for
 * every other Alert test, with no way to restore it. `expectDeleteConfirmDialogVisible()`
 * verifies the confirmation gate itself exists and works; the test stops
 * there rather than completing a real, unrecoverable delete.
 */
export class AlertsPage extends BasePage {
  readonly locators: AlertsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AlertsLocators(page);
  }

  async openList(): Promise<void> {
    await this.gotoAuthenticated(ALERTS_LIST_PATH);
  }

  async openAlert(titleSubstring: string): Promise<void> {
    await this.locators.alertRow(titleSubstring).click();
  }

  /** Whichever of Check/Uncheck is currently showing (the button label flips with state — confirmed reversible both directions). */
  async toggleChecked(): Promise<void> {
    const uncheck = this.locators.uncheckButton;
    if (await uncheck.isVisible().catch(() => false)) {
      await uncheck.click();
    } else {
      await this.locators.checkButton.click();
    }
  }

  async expectStatusText(status: 'Checked' | 'Unchecked'): Promise<void> {
    await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible();
  }

  async openEmailInternallyDialog(): Promise<void> {
    await this.locators.emailInternallyButton.click();
    await expect(this.locators.emailDialog).toBeVisible();
  }

  async openEmailToCustomerDialog(): Promise<void> {
    await this.locators.emailToCustomerButton.click();
    await expect(this.locators.emailDialog).toBeVisible();
  }

  /** Attempts the Outlook handoff with whatever the dialog currently holds — used both for the real flow and for TC:7's blank-recipient validation. */
  async attemptRedirectToOutlook(): Promise<void> {
    await this.locators.redirectToOutlookButton.click();
  }

  async closeEmailDialog(): Promise<void> {
    await this.locators.emailCancelButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  /** TC:6 — confirms the Official Source link opens in a new tab, without asserting on that external page's own content (same un-attestable boundary as every other new-tab handoff in this app). */
  async clickOfficialSourceAndAwaitNewTab(): Promise<Page | null> {
    const newPagePromise = this.page
      .context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);
    await this.locators.officialSourceLink.click();
    return newPagePromise;
  }

  /** TC:5 — opens the delete confirmation gate. Does NOT confirm — see class doc. */
  async openDeleteConfirmDialog(): Promise<void> {
    await this.locators.deleteAlertButton.click();
  }

  async expectDeleteConfirmDialogVisible(): Promise<void> {
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
  }

  async cancelDelete(): Promise<void> {
    await this.locators.deleteCancelButton.click();
  }

  // ---------------------------------------------------------------------
  // Sprint 5 "Email an Alert" (32-email-an-alert.spec.ts) — confirmed
  // against dev 2026-10-15.
  // ---------------------------------------------------------------------

  /**
   * Opens the first Alert on the list and returns its title. Retries the
   * row click — same cold-load table-hydration race documented in
   * 24-alert-detail-screen.spec.ts's openFirstAlert(). Returns null when
   * no Alert is seeded (callers skip).
   */
  async openFirstAlertDetail(): Promise<string | null> {
    await this.openList();
    await expect(this.locators.pageHeading).toBeVisible({ timeout: 20_000 });
    const rows = this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    const hasRows = await rows
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasRows) return null;
    await expect(async () => {
      if (this.page.url().includes('/crm/alerts/')) return;
      await rows.first().click();
      await expect(this.locators.checkButton.or(this.locators.uncheckButton)).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 30_000 });
    await expect(this.locators.alertTitleHeading).toBeVisible();
    return (await this.locators.alertTitleHeading.innerText()).trim();
  }

  /** Re-opens an Alert's detail screen by URL (e.g. after visiting another CRM screen). */
  async openAlertByUrl(url: string): Promise<void> {
    await this.gotoAuthenticated(new URL(url).pathname);
    await expect(this.locators.emailToCustomerButton).toBeVisible({ timeout: 30_000 });
  }

  /** Everything the Alert detail screen shows (header, sections, System audit fields, Check/Uncheck state) — for "record unchanged" checks. */
  async captureAlertDetailText(): Promise<string> {
    await expect(this.locators.alertDetailContent).toBeVisible();
    return (await this.locators.alertDetailContent.innerText()).trim();
  }

  async expectAlertDetailUnchanged(before: string): Promise<void> {
    await expect.poll(() => this.captureAlertDetailText()).toBe(before);
  }

  /**
   * The To combobox is disabled ("Loading the CRM directory…" /
   * "Loading customers…") until its recipient list arrives — opening or
   * validating before that is racy.
   */
  async waitForRecipientsLoaded(): Promise<void> {
    await expect(this.locators.toCombobox).toBeEnabled({ timeout: 30_000 });
    await expect(this.locators.toCombobox).not.toContainText('Loading', { timeout: 30_000 });
  }

  async openRecipientList(field: 'To' | 'CC'): Promise<void> {
    const trigger = field === 'To' ? this.locators.toCombobox : this.locators.customerCcCombobox;
    await trigger.click();
    await expect(this.locators.recipientListbox(field)).toBeVisible();
  }

  /** Types into the open popover's search box (filters by Customer/person name or email). */
  async searchRecipients(query: string): Promise<void> {
    await this.locators.recipientSearchInput.fill(query);
  }

  async closeRecipientList(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.recipientSearchInput).toBeHidden();
  }

  /** Opens To/CC, searches for and ticks each email, then closes the popover. */
  async selectRecipients(field: 'To' | 'CC', emails: string[]): Promise<void> {
    await this.openRecipientList(field);
    for (const email of emails) {
      await this.searchRecipients(email);
      const option = this.locators.recipientOption(field, email);
      await option.click();
      await expect(option).toHaveAttribute('aria-selected', 'true');
    }
    await this.closeRecipientList();
    const trigger = field === 'To' ? this.locators.toCombobox : this.locators.customerCcCombobox;
    for (const email of emails) await expect(trigger).toContainText(email);
  }

  /** From shows "Name <email>" as plain text — no text box and no From picker in the dialog. */
  async expectFromIsReadOnly(): Promise<string> {
    const from = (await this.locators.emailFromValue.innerText()).trim();
    expect(from).toMatch(/^.+ <[^\s@<>]+@[^\s@<>]+>$/);
    await expect(this.locators.emailDialogTextboxes).toHaveCount(0);
    await expect(this.locators.emailFromCombobox).toHaveCount(0);
    return from;
  }

  async expectDialogError(text: string): Promise<void> {
    await expect(this.locators.emailDialogText(text)).toBeVisible();
  }

  /** Call only after expectDialogError() has shown the error that IS there. */
  async expectNoDialogError(text: string): Promise<void> {
    await expect(this.locators.emailDialogText(text)).toHaveCount(0);
  }

  /**
   * Of the given addresses, the ones the open dialog's To/CC list does NOT
   * offer — for checking seed directory users exist before using them.
   * Opens the list, searches each address, and closes it again.
   */
  async missingRecipients(field: 'To' | 'CC', emails: string[]): Promise<string[]> {
    await this.openRecipientList(field);
    const missing: string[] = [];
    for (const email of emails) {
      await this.searchRecipients(email);
      // The search filters an already-loaded list, so it settles at once:
      // either the option or the "No match" empty state shows.
      const option = this.locators.recipientOption(field, email);
      await expect(option.or(this.locators.recipientNoMatch(email)).first()).toBeVisible();
      if ((await option.count()) === 0) missing.push(email);
    }
    await this.searchRecipients('');
    await this.closeRecipientList();
    return missing;
  }

  /** The Customer's group header (its name) is shown in the open To list. */
  async expectRecipientGroupHeader(customerName: string): Promise<void> {
    await expect(
      this.locators.recipientGroup(customerName).getByText(customerName).first(),
    ).toBeVisible();
  }

  /**
   * A Customer with no email (and no Contacts) is listed in the open To
   * list as its own group with a "No email on file" label and no option to
   * select. Confirmed on dev 2026-10-21 (`p.crm-menu-group-empty` under the
   * group header).
   */
  async expectCustomerListedWithoutEmail(customerName: string): Promise<void> {
    const group = this.locators.recipientGroup(customerName);
    await expect(group).toBeVisible();
    await expect(group.getByText(customerName, { exact: true })).toBeVisible();
    await expect(group.getByText('No email on file', { exact: true })).toBeVisible();
    await expect(group.getByRole('option')).toHaveCount(0);
  }

  /** The option labels (accessible names) under one Customer group of the open To list, in rendered order. */
  async recipientGroupOptionNames(customerName: string): Promise<string[]> {
    const options = this.locators.recipientGroup(customerName).getByRole('option');
    const count = await options.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      // The accessible name ("<email> <name>") — textContent would glue the two spans together.
      const snapshot = await options.nth(i).ariaSnapshot();
      names.push(snapshot.match(/option "(.*)"/)?.[1] ?? snapshot);
    }
    return names;
  }

  async bodyPreviewText(): Promise<string> {
    return normaliseBody(await this.locators.emailBodyPreview.innerText());
  }

  /**
   * Clicks "Redirect to Outlook" and returns the decoded Outlook compose
   * deep link the CRM opened in a new tab. Outlook's hosts are stubbed for
   * this context first, so the tab never actually loads (or signs in to)
   * Outlook — the deep link itself is the CRM's whole contract. The tab is
   * closed before returning.
   */
  async redirectToOutlookAndCaptureCompose(): Promise<OutlookCompose> {
    const context = this.page.context();
    await context.route(OUTLOOK_HOSTS, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>Outlook (stubbed)</title>',
      }),
    );
    const newTab = context.waitForEvent('page', { timeout: 15_000 });
    await this.locators.redirectToOutlookButton.click();
    const tab = await newTab;
    await expect.poll(() => tab.url(), { timeout: 10_000 }).toMatch(OUTLOOK_HOSTS);
    const compose = parseOutlookComposeUrl(tab.url());
    await tab.close();
    return { ...compose, body: normaliseBody(compose.body) };
  }

  /** Popup closed and the "Redirected to Outlook" confirmation toast shown. */
  async expectRedirectedConfirmation(): Promise<void> {
    await expect(this.locators.redirectedToOutlookToast).toBeVisible();
    await expect(this.locators.emailDialog).toBeHidden();
  }

  /** Runs `action` and asserts no new tab/window opened during it (or within `settleMs` after). */
  async expectNoNewTabDuring(action: () => Promise<void>, settleMs = 2_000): Promise<void> {
    const opened: string[] = [];
    const onPage = (p: Page): void => {
      opened.push(p.url());
      void p.close().catch(() => undefined);
    };
    this.page.context().on('page', onPage);
    try {
      await action();
      // Deliberate fixed settle: proving a negative (no tab opens) needs a window to observe.
      await this.page.waitForTimeout(settleMs);
    } finally {
      this.page.context().off('page', onPage);
    }
    expect(opened, 'no Outlook tab should open').toEqual([]);
  }

  /** Clicks the dimmed overlay outside the Email dialog (a point left of the centred dialog). */
  async clickOutsideEmailDialog(): Promise<void> {
    const box = await this.locators.emailDialog.boundingBox();
    const y = box ? box.y + box.height / 2 : 300;
    await this.page.mouse.click(5, y);
  }
}

/** Newlines/whitespace normalised so the preview's innerText and the decoded deep-link body compare equal. */
function normaliseBody(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}
