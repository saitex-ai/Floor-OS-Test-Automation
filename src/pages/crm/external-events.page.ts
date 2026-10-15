import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  ExternalEventsLocators,
  EXTERNAL_EVENTS_LIST_PATH,
} from '../../locators/crm/external-events.locators';

/**
 * "Create External Event [created by user manually]" (CRM, Sprint 4 user
 * story). Owned by the CRM QA. Confirmed against the running app
 * (2026-09-25), including a full real create-to-save run — see
 * ExternalEventsLocators' class doc for the corrections that made to the
 * original ClickUp text.
 */
export interface ExternalEventDetails {
  title: string;
  venue: string;
  /** ISO date string, e.g. '2026-09-20' — native date input. */
  date: string;
  about: string;
  attendee: string;
  score: number;
  numberOfLeads: number;
  wentWell: string;
  couldBeBetter: string;
  attendNextEditions: string;
}

export class ExternalEventsPage extends BasePage {
  readonly locators: ExternalEventsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ExternalEventsLocators(page);
  }

  async openFromEventsList(): Promise<void> {
    await this.gotoAuthenticated(EXTERNAL_EVENTS_LIST_PATH);
    await this.locators.createEventButton.click();
  }

  /** Fills the whole form, including the three Feedback Form fields the ClickUp text omits from "mandatory" but the app enforces anyway. */
  async fill(details: ExternalEventDetails): Promise<void> {
    const l = this.locators;
    await l.titleInput.fill(details.title);
    await l.venueInput.fill(details.venue);
    await l.dateInput.fill(details.date);
    await l.aboutInput.fill(details.about);

    await l.attendeesButton.click();
    await l.attendeeOption(details.attendee).click();

    await l.scoreRadio(details.score).check();
    await l.numberOfLeadsInput.fill(String(details.numberOfLeads));
    await l.wentWellInput.fill(details.wentWell);
    await l.couldBeBetterInput.fill(details.couldBeBetter);
    await l.attendNextEditionsInput.fill(details.attendNextEditions);
  }

  async submit(): Promise<void> {
    await this.locators.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** SAITEX Attendees has no search/filter — confirmed a plain fixed-list pick. */
  async selectAttendee(name: string): Promise<void> {
    await this.locators.attendeesButton.click();
    await this.locators.attendeeOption(name).click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectConfirmDialogVisible(): Promise<void> {
    await expect(this.locators.confirmDialog).toBeVisible();
  }

  /** Confirmed against the running app: Submit alone does not persist the event — this second confirm step does, then redirects to the new event's own Details screen. */
  async confirmSaveEvent(): Promise<void> {
    await this.locators.saveEventButton.click();
  }

  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.locators.toast).toBeVisible();
    await expect(this.page).toHaveURL(/\/crm\/events\/[0-9a-f-]+/);
  }

  // ---------------------------------------------------------------------
  // List screen (CRM Sprint 3 — "External Events List screen")
  // ---------------------------------------------------------------------

  async openList(): Promise<void> {
    await this.gotoAuthenticated(EXTERNAL_EVENTS_LIST_PATH);
    await this.waitForCountsLoaded();
  }

  /**
   * Confirmed directly (2026-10-05): the status tab badges render "0" as
   * a brief placeholder before the real counts load, same idea as every
   * other debounce-race already found in this suite, just on a slower
   * clock — dev was observed taking up to ~8s under today's load. Reading
   * counts during that window (e.g. TC:6's tally) produces a real but
   * stale "0", not a locator problem. Polls for the "All" tab to show a
   * genuinely positive count instead of a fixed sleep, so this stays fast
   * when dev is fast and patient when it isn't.
   */
  async waitForCountsLoaded(): Promise<void> {
    await expect(async () => {
      const text = await this.locators.statusTab('All').innerText();
      expect(Number(text.replace(/\D/g, ''))).toBeGreaterThan(0);
    }).toPass({ timeout: 20_000 });
  }

  async expectListLoaded(): Promise<void> {
    await expect(this.locators.pageHeading).toBeVisible();
    await expect(this.locators.statusTab('All')).toBeVisible();
    await expect(this.locators.statusTab('Planning')).toBeVisible();
    await expect(this.locators.statusTab('To Attend')).toBeVisible();
    await expect(this.locators.statusTab('Attended')).toBeVisible();
    await expect(this.locators.searchInput).toBeVisible();
  }

  /**
   * Not Attending/Elapsed are tucked behind "+2 more", not top-level tabs —
   * confirmed against the running app. Confirmed directly (2026-09-25):
   * the table re-renders after a brief delay following the click — reading
   * rows immediately after this without a settle wait can catch the grid
   * mid-transition and return the wrong row/order (same debounce-race
   * class as search()'s wait, below).
   */
  async selectStatusTab(name: 'All' | 'Planning' | 'To Attend' | 'Attended'): Promise<void> {
    await this.locators.statusTab(name).click();
    await this.page.waitForTimeout(600);
  }

  async selectOverflowStatusTab(name: 'Not Attending' | 'Elapsed'): Promise<void> {
    await this.locators.moreStatusTabsButton.click();
    await this.page.getByRole('menuitem', { name: new RegExp(`^${name} \\d+$`) }).click();
    await this.page.waitForTimeout(600);
  }

  /** Confirmed against the running app: the live filter is debounced — a brief settle wait avoids reading the table mid-filter. */
  async search(query: string): Promise<void> {
    await this.locators.searchInput.fill(query);
    await this.page.waitForTimeout(600);
  }

  /** "AI Relevance" (and "Leads") are real columns but hidden by default — must be toggled on before they can be sorted on. */
  async showAiRelevanceColumn(): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeVisible();
    await this.locators.columnToggle('AI Relevance').click();
    await this.locators.applyColumnsButton.click();
  }

  async sortByAiRelevanceDescending(): Promise<void> {
    // One click sorts ascending, a second flips to descending — confirmed directly.
    await this.locators.aiRelevanceColumnHeader.click();
    await this.locators.aiRelevanceColumnHeader.click();
  }

  async openEventRow(title: string): Promise<void> {
    await this.locators.eventRow(title).click();
  }

  /** The FIRST (i.e. currently top-sorted) row in whatever the table is showing right now. */
  /** Whether the table currently showing (e.g. after selectStatusTab()) has at least one row. */
  async hasAnyRows(): Promise<boolean> {
    const rows = this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    return (await rows.count()) > 0;
  }

  async openFirstRow(): Promise<void> {
    await this.page
      .getByRole('row')
      .filter({ hasNot: this.page.getByRole('columnheader') })
      .first()
      .click();
  }

  // ---------------------------------------------------------------------
  // Details/workspace (CRM Sprint 3 — "External Event Details screen")
  // ---------------------------------------------------------------------

  /**
   * Finds a genuinely undecided, NOT-elapsed Planning event from the
   * List's Planning tab and opens it. Confirmed against the running app:
   * the AI-discovery seed pool of Planning events is FIXED (6 total in
   * this environment, several already "Planning · Elapsed") and NOT
   * replenishable — there is no UI path to create a fresh one (manually
   * "Create Event" always saves straight to Attended — see class doc).
   * Callers MUST treat a `null` return as "skip this test, the pool is
   * exhausted", not as a failure — the same "don't force a false
   * pass/fail on unowned/finite seed data" discipline as
   * biz-doc.page.ts's hasAnyRecords() and qualified-lead-to-prospect's
   * cross-module gaps.
   */
  async findFreshPlanningEvent(): Promise<string | null> {
    await this.openList();
    await this.selectStatusTab('Planning');
    const rows = this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).innerText();
      if (!text.includes('Elapsed')) {
        await rows.nth(i).click();
        await this.page.waitForURL(/\/crm\/events\/[0-9a-f-]+/);
        const match = this.page.url().match(/\/crm\/events\/([0-9a-f-]+)/);
        return match?.[1] ?? null;
      }
    }
    return null;
  }

  async openEventById(eventId: string): Promise<void> {
    await this.gotoAuthenticated(`/crm/events/${eventId}`);
  }

  /**
   * TC:1 — Feedback Form/Leads stay locked until the event is Attended.
   * Confirmed against the running app (2026-09-25): the tab buttons are
   * NOT HTML-disabled (toBeDisabled() always reads false, decided or
   * not) — clicking a locked tab is allowed, but its content is gated
   * behind "The Feedback Form/Leads tab opens once this event's status
   * is Attended." That gate text is what actually reflects lock state.
   */
  async expectFeedbackAndLeadsLocked(): Promise<void> {
    await this.locators.feedbackFormTabButton.click();
    await expect(
      this.page.getByText("The Feedback Form opens once this event's status is Attended."),
    ).toBeVisible();
    await this.locators.leadsTabButton.click();
    await expect(
      this.page.getByText("The Leads tab opens once this event's status is Attended."),
    ).toBeVisible();
  }

  /** TC:3 — the counterpart check once the event has transitioned to Attended: the same gate text must be gone. */
  async expectFeedbackAndLeadsUnlocked(): Promise<void> {
    await this.locators.feedbackFormTabButton.click();
    await expect(
      this.page.getByText("The Feedback Form opens once this event's status is Attended."),
    ).toBeHidden();
    await this.locators.leadsTabButton.click();
    await expect(
      this.page.getByText("The Leads tab opens once this event's status is Attended."),
    ).toBeHidden();
  }

  async decideToAttend(): Promise<void> {
    await this.locators.toAttendButton.click();
  }

  async markAttended(): Promise<void> {
    await this.locators.markAttendedButton.click();
  }

  async openFeedbackFormTab(): Promise<void> {
    await this.locators.feedbackFormTabButton.click();
  }

  async openLeadsTab(): Promise<void> {
    await this.locators.leadsTabButton.click();
  }

  /** TC:5 — confirms the registration link opens in a new tab, without asserting on that external page's own content. */
  async clickRegisterOnlineAndAwaitNewTab(): Promise<Page | null> {
    const newPagePromise = this.page
      .context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);
    await this.locators.registerOnlineLink.click();
    return newPagePromise;
  }

  async openDeclineDialog(): Promise<void> {
    await this.locators.notAttendingButton.click();
    await expect(this.locators.declineDialog).toBeVisible();
  }

  async attemptDeclineWithoutFilling(): Promise<void> {
    await this.locators.declineProceedButton.click();
  }

  async fillDeclineReason(reasonChip: string, detailedReason: string): Promise<void> {
    await this.locators.declineReasonButton.click();
    await this.locators.declineReasonOption(reasonChip).click();
    // Dismiss the reason popup by clicking the dialog's own heading — a
    // neutral point outside the popup (same idiom as
    // log-communication.page.ts's selectNotifyManager()).
    await this.locators.declineDialog.getByRole('heading').click();
    await this.locators.declineDetailedReasonInput.fill(detailedReason);
  }

  async confirmDecline(): Promise<void> {
    await this.locators.declineProceedButton.click();
  }

  async cancelDecline(): Promise<void> {
    await this.locators.declineCancelButton.click();
  }

  async expectStatus(status: string): Promise<void> {
    await expect(this.page.getByText(status, { exact: false }).first()).toBeVisible();
  }

  // ---------------------------------------------------------------------
  // Details/workspace — manually-created event (CRM Sprint 4 — "External
  // Events [created by user manually] Details screen")
  // ---------------------------------------------------------------------

  async openOverviewTab(): Promise<void> {
    await this.locators.overviewTabButton.click();
  }

  /**
   * TC:1 — the Overview tab's own event fields + its "System" section
   * (status, created/updated on/by). Checked against the whole tab body
   * rather than per-field locators, matching this app's plain label/value
   * block layout. Confirmed directly (2026-09-29, on the Log a
   * Communication screen's own equivalent labels — the same component
   * family): this label casing is NOT stable across runs — a CSS
   * text-transform timing race can render it all-caps in one run, Title
   * Case in another, on the identical screen — so these match
   * case-insensitively rather than pinning to one literal casing.
   */
  async expectOverviewShows(fields: {
    title: string;
    venue: string;
    about: string;
    status: string;
  }): Promise<void> {
    const body = this.page.locator('main').last();
    await expect(body).toContainText(fields.title);
    await expect(body).toContainText(fields.venue);
    await expect(body).toContainText(fields.about);
    await expect(body).toContainText(/system/i);
    await expect(body).toContainText(fields.status);
    await expect(body).toContainText(/created on/i);
    await expect(body).toContainText(/created by/i);
    await expect(body).toContainText(/updated on/i);
    await expect(body).toContainText(/updated by/i);
  }

  /** TC:4 — opens the event's own "Create Customer" lead-capture link from its Leads tab (pre-links eventId via query params). Does NOT complete the save — see class doc: the resulting form's "Origin" field is confirmed permanently disabled while still required, blocking Save through this entry point in this environment. */
  async openCreateCustomerFromLeads(): Promise<void> {
    await this.locators.createCustomerLeadLink.click();
  }

  // ---------------------------------------------------------------------
  // List screen (CRM Sprint 5 — "Build External Events List with Web
  // Crawling"). Confirmed against dev (2026-10-15):
  // - Free-text search matches Event title, Type and the Schedule/venue
  //   text (case-insensitive, partial) — NOT Status, Created By or the
  //   event's id.
  // - "Filters" opens an inline panel with Type + Country dropdowns and an
  //   explicit Apply; an applied filter shows as a removable chip
  //   ("Type: Trade Fair") and the status tab counts re-scope to it.
  //   Status filtering is the status tabs themselves.
  // - Sorting cycles asc -> desc -> asc (never back to unsorted).
  // - Column visibility/order, sort, and layout ("viewMode") are persisted
  //   per BROWSER in localStorage key "crm-events-list-prefs-v1" — not
  //   server-side. Every Playwright test gets a fresh context, so nothing
  //   leaks between tests, but specs still reset what they change.
  // ---------------------------------------------------------------------

  /** The "of N" total from the "Showing 1 to X of N" pagination summary. */
  async readPaginationTotal(): Promise<number> {
    const text = await this.locators.paginationSummary.innerText();
    const match = text.match(/of (\d+)/);
    expect(match, `unexpected pagination summary: "${text}"`).not.toBeNull();
    return Number(match![1]);
  }

  /** A top-level status tab's live count badge (e.g. "All 57" -> 57). */
  async readStatusTabCount(name: 'All' | 'Planning' | 'To Attend' | 'Attended'): Promise<number> {
    const text = await this.locators.statusTab(name).innerText();
    return Number(text.replace(/\D/g, ''));
  }

  /** Visible column header labels, in on-screen order (excluding the select-all checkbox column). */
  async readColumnLabels(): Promise<string[]> {
    const labels = await this.locators.columnHeaders.allInnerTexts();
    return labels.map((l) => l.trim()).filter((l) => l.length > 0);
  }

  /** Every visible row's value in one column, read by that column's on-screen position. */
  async readColumnValues(label: string): Promise<string[]> {
    const headers = (await this.locators.columnHeaders.allInnerTexts()).map((l) => l.trim());
    const index = headers.indexOf(label);
    expect(
      index,
      `column "${label}" is not visible (headers: ${headers.join(', ')})`,
    ).toBeGreaterThan(-1);
    const rows = await this.locators.dataRows.all();
    const values: string[] = [];
    for (const row of rows) {
      values.push((await row.getByRole('cell').nth(index).innerText()).trim());
    }
    return values;
  }

  /** Waits until the pagination total stops at `expected` — the grid refetches asynchronously after a search/filter/tab change. */
  async expectPaginationTotal(expected: number): Promise<void> {
    await expect.poll(() => this.readPaginationTotal(), { timeout: 15_000 }).toBe(expected);
  }

  async openFiltersPanel(): Promise<void> {
    if ((await this.locators.filtersButton.getAttribute('aria-pressed')) !== 'true') {
      await this.locators.filtersButton.click();
    }
    await expect(this.locators.filterTypeButton).toBeVisible();
  }

  async closeFiltersPanel(): Promise<void> {
    if ((await this.locators.filtersButton.getAttribute('aria-pressed')) === 'true') {
      await this.locators.filtersButton.click();
    }
    await expect(this.locators.filterTypeButton).toBeHidden();
  }

  /** Filters panel -> Type dropdown -> pick one type -> Apply, then collapses the panel. */
  async filterByType(type: string): Promise<void> {
    await this.openFiltersPanel();
    await this.locators.filterTypeButton.click();
    await this.locators.filterTypeOption(type).click();
    await this.page.keyboard.press('Escape');
    await expect(this.locators.filterTypeListbox).toBeHidden();
    await this.locators.filterApplyButton.click();
    await expect(this.locators.removeFilterChip(`Type: ${type}`)).toBeVisible();
    await this.closeFiltersPanel();
    await this.page.waitForTimeout(600);
  }

  /** Removes one applied filter via its chip's "x" (e.g. "Type: Trade Fair"). */
  async removeFilter(label: string): Promise<void> {
    await this.locators.removeFilterChip(label).click();
    await expect(this.locators.removeFilterChip(label)).toBeHidden();
    await this.page.waitForTimeout(600);
  }

  /** Clicks a column header's sort button once (asc on first click, then toggles asc/desc). */
  async clickColumnSort(label: string): Promise<void> {
    await this.locators.columnSortButton(label).click();
    await this.page.waitForTimeout(800);
  }

  async openColumnsDialog(): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeVisible();
  }

  async toggleColumn(columnName: string): Promise<void> {
    await this.locators.columnToggle(columnName).click();
  }

  /**
   * Drag-and-drop reorder in the Columns dialog: drops `columnName` onto
   * `targetColumn`'s position. The list is a pointer-sensor sortable, so a
   * plain dragTo() is not enough — the pointer must move a few px to
   * activate the drag before travelling, confirmed directly.
   */
  async dragColumnOnto(columnName: string, targetColumn: string): Promise<void> {
    const source = await this.locators.columnDragHandle(columnName).boundingBox();
    const target = await this.locators.columnDragHandle(targetColumn).boundingBox();
    expect(source && target, 'column drag handles must be visible').toBeTruthy();
    const sx = source!.x + source!.width / 2;
    const sy = source!.y + source!.height / 2;
    await this.page.mouse.move(sx, sy);
    await this.page.mouse.down();
    await this.page.mouse.move(sx, sy - 10, { steps: 5 });
    await this.page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2 - 5, {
      steps: 20,
    });
    await this.page.mouse.up();
    // Let the drop animation finish — clicking Apply mid-animation was
    // confirmed to leave the dialog open (the click lands on the moving item).
    await this.page.waitForTimeout(500);
  }

  /** Column order as listed in the open Columns dialog (first item is the locked "Event"). */
  async readColumnsDialogOrder(): Promise<string[]> {
    const items = await this.locators.columnsDialog.getByRole('listitem').allInnerTexts();
    return items.map((t) =>
      t
        .replace(/\s+/g, ' ')
        .replace(/ locked$/, '')
        .trim(),
    );
  }

  async applyColumns(): Promise<void> {
    await this.locators.applyColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeHidden();
  }

  /** Confirmed directly: "Reset to default" applies immediately (Apply goes back to disabled) — only Close is needed afterward. */
  async resetColumnsToDefault(): Promise<void> {
    // Tolerate being called with the dialog still open (e.g. from a
    // cleanup block after a failed step).
    if (!(await this.locators.columnsDialog.isVisible())) {
      await this.openColumnsDialog();
    }
    await this.locators.resetColumnsButton.click();
    await expect(this.locators.applyColumnsButton).toBeDisabled();
    await this.locators.closeColumnsDialogButton.click();
    await expect(this.locators.columnsDialog).toBeHidden();
  }

  async switchLayout(layout: 'No split' | 'Vertical split' | 'Horizontal split'): Promise<void> {
    const button = {
      'No split': this.locators.noSplitButton,
      'Vertical split': this.locators.verticalSplitButton,
      'Horizontal split': this.locators.horizontalSplitButton,
    }[layout];
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  /** Ticks one row's checkbox in a table layout. */
  async selectRow(title: string): Promise<void> {
    await this.locators.rowCheckbox(title).check();
  }

  /** Re-opens the list via a full browser reload (the "come back later" half of a persistence check). */
  async reloadList(): Promise<void> {
    await this.page.reload();
    await this.waitForCountsLoaded();
  }

  // ---------------------------------------------------------------------
  // Planning tab (CRM Sprint 5 — "External Event Planning"). Confirmed
  // against dev 2026-10-15:
  // - No non-elapsed Planning event exists on dev (the Planning tab holds
  //   only "Planning · Elapsed" AI events, which have no status buttons),
  //   and a manual "Create Event" is always born "Other"/Attended — so
  //   the To Attend transition cannot be exercised on an event we own.
  //   Everything here is READ-ONLY against AI events; nothing below
  //   changes any event's status.
  // - Event types present on dev: Trade Fair, Exhibition, Fashion Show
  //   (AI) and Other (manual). No "Sales Summit" event exists.
  // - A failed/empty AI artifact renders the card anyway with
  //   "Unfortunately, no relevant information is available for the
  //   <section> online." — including the Contact Details card.
  // ---------------------------------------------------------------------

  /** Opens the List on any status tab, including the two behind "+2 more". */
  async openStatusTab(tab: EventStatusTab): Promise<void> {
    await this.openList();
    if (tab === 'Not Attending' || tab === 'Elapsed') {
      await this.selectOverflowStatusTab(tab);
    } else {
      await this.selectStatusTab(tab);
    }
  }

  /** The live count shown on a List status tab's badge (List must be open on a tab where `tab` is a top-level button). */
  async statusTabCount(tab: 'All' | 'Planning' | 'To Attend' | 'Attended'): Promise<number> {
    const text = await this.locators.statusTab(tab).innerText();
    return Number(text.replace(/\D/g, ''));
  }

  /** Shows up to 100 rows per page so every event (57 on dev) fits on one page. */
  async showMaxRowsPerPage(): Promise<void> {
    await this.locators.rowsPerPageCombobox.click();
    await this.page.getByRole('option', { name: '100', exact: true }).click();
    await this.page.waitForTimeout(800);
  }

  /** Reads one List row's cells: [checkbox/blank, Event, Type, Status, Created By, Schedule]. */
  async readRow(row: Locator): Promise<EventRowData> {
    const cells = await row.getByRole('cell').allInnerTexts();
    return {
      title: (cells[1] ?? '').trim(),
      type: (cells[2] ?? '').trim(),
      status: (cells[3] ?? '').trim(),
    };
  }

  /** Every body row currently in the table, read as data. */
  async readAllRows(): Promise<EventRowData[]> {
    const rows = this.locators.tableRows();
    const count = await rows.count();
    const out: EventRowData[] = [];
    for (let i = 0; i < count; i++) out.push(await this.readRow(rows.nth(i)));
    return out;
  }

  /**
   * Clicks a List row and waits for its Details screen. Retries the click
   * — same table-hydration race already seen on the Alerts list (a first
   * click can land before the row's handler attaches and silently not
   * navigate).
   */
  async openRow(row: Locator): Promise<EventRowData> {
    const data = await this.readRow(row);
    await expect(async () => {
      if (!/\/crm\/events\/[0-9a-f-]{36}/.test(this.page.url())) await row.click();
      await this.page.waitForURL(/\/crm\/events\/[0-9a-f-]{36}/, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await this.waitForDetailsLoaded();
    return data;
  }

  /** Opens the first AI-generated (non-"Other") event on a List status tab; `null` if the tab has none. */
  async openFirstAiEventInTab(tab: EventStatusTab, index = 0): Promise<EventRowData | null> {
    await this.openStatusTab(tab);
    const rows = this.locators.aiEventRows();
    if ((await rows.count()) <= index) return null;
    return this.openRow(rows.nth(index));
  }

  /**
   * Walks the AI events on the given List tabs (read-only — just opens
   * each one) and stops on the first whose Details screen satisfies
   * `predicate`. Returns its row data, or `null` if none does.
   */
  async findAiEvent(
    predicate: () => Promise<boolean>,
    tabs: EventStatusTab[] = ['Planning', 'To Attend', 'Not Attending', 'Attended'],
  ): Promise<EventRowData | null> {
    for (const tab of tabs) {
      await this.openStatusTab(tab);
      const count = await this.locators.aiEventRows().count();
      for (let i = 0; i < count; i++) {
        if (i > 0) await this.openStatusTab(tab);
        const data = await this.openRow(this.locators.aiEventRows().nth(i));
        if (await predicate()) return data;
      }
    }
    return null;
  }

  /** On the All tab (100 rows/page), opens the first event whose Type column is exactly `type`; `null` if there is none. */
  async openFirstEventOfType(type: string): Promise<EventRowData | null> {
    await this.openStatusTab('All');
    await this.showMaxRowsPerPage();
    const rows = this.locators.rowsOfType(type);
    if ((await rows.count()) === 0) return null;
    return this.openRow(rows.first());
  }

  async waitForDetailsLoaded(): Promise<void> {
    await expect(this.locators.eventTitleHeading).toBeVisible({ timeout: 30_000 });
    await expect(this.locators.sectionHeading('System')).toBeVisible({ timeout: 30_000 });
  }

  async eventTitle(): Promise<string> {
    return (await this.locators.eventTitleHeading.innerText()).trim();
  }

  async headerStatus(): Promise<string> {
    return (await this.locators.eventHeaderStatus.innerText()).trim();
  }

  /** The "<type>" segment of "Event: External Event · <type> · <date> · <venue>". */
  async headerEventType(): Promise<string> {
    const line = await this.locators.eventTypeLine.innerText();
    return (line.split(' · ')[1] ?? '').trim();
  }

  async hasRegisterOnline(): Promise<boolean> {
    return (await this.locators.registerOnlineLink.count()) > 0;
  }

  async sectionText(name: string): Promise<string> {
    return (await this.locators.sectionCard(name).innerText()).trim();
  }

  /** True when the card shows the AI "Unfortunately, no relevant information…" placeholder instead of content. */
  async isSectionPlaceholder(name: string): Promise<boolean> {
    return (
      (await this.locators.sectionCard(name).locator(this.locators.aiPlaceholderText).count()) > 0
    );
  }

  async hasAnyPlaceholderSection(): Promise<boolean> {
    return (await this.locators.aiPlaceholderText.count()) > 0;
  }

  /** Each named section is shown, tagged "Generated by AI", and has real body text beyond its heading (not the failure placeholder). */
  async expectSectionsWithContent(sections: readonly string[]): Promise<void> {
    for (const name of sections) {
      const card = this.locators.sectionCard(name);
      await expect(card, `section "${name}"`).toBeVisible();
      await expect(card).toContainText('Generated by AI');
      const body = (await card.innerText()).replace(name, '').replace('Generated by AI', '').trim();
      expect(body.length, `section "${name}" should have content`).toBeGreaterThan(0);
      await expect(card.locator(this.locators.aiPlaceholderText)).toHaveCount(0);
    }
  }

  /** System card shows `label` followed by `value` (label casing is CSS-uppercased, so case-insensitive). */
  async expectSystemField(label: string, value: string | RegExp): Promise<void> {
    const v = typeof value === 'string' ? escapeRegExp(value) : value.source;
    await expect(this.locators.sectionCard('System')).toContainText(
      new RegExp(`${escapeRegExp(label)}\\s*${v}`, 'i'),
    );
  }

  /** The System card has no editable controls at all. */
  async expectSystemReadOnly(): Promise<void> {
    const card = this.locators.sectionCard('System');
    await expect(
      card.locator('input, textarea, select, [role="combobox"], [contenteditable="true"]'),
    ).toHaveCount(0);
  }

  /** No To Attend / Mark Attended / Not Attending decision button at all. */
  async expectNoStatusButtons(): Promise<void> {
    await expect(this.locators.toAttendButton).toHaveCount(0);
    await expect(this.locators.markAttendedButton).toHaveCount(0);
    await expect(this.locators.notAttendingButton).toHaveCount(0);
  }

  /** The post-"To Attend" decision state: Mark Attended + Not Attending, and no To Attend. */
  async expectToAttendDecisionButtons(): Promise<void> {
    await expect(this.locators.markAttendedButton).toBeVisible();
    await expect(this.locators.markAttendedButton).toBeEnabled();
    await expect(this.locators.notAttendingButton).toBeVisible();
    await expect(this.locators.notAttendingButton).toBeEnabled();
    await expect(this.locators.toAttendButton).toHaveCount(0);
  }

  async registerOnlineHref(): Promise<string> {
    return (await this.locators.registerOnlineLink.getAttribute('href')) ?? '';
  }

  /** Creates a manual ("Other") event end-to-end through the create form and lands on its Details screen. */
  async createManualEvent(details: ExternalEventDetails): Promise<void> {
    await this.openFromEventsList();
    await this.fill(details);
    await this.submit();
    await this.expectConfirmDialogVisible();
    await this.confirmSaveEvent();
    await this.expectSavedSuccessfully();
    // Lands on ?tab=feedback (no System card there), so only wait for the title.
    await expect(this.locators.eventTitleHeading).toBeVisible({ timeout: 30_000 });
  }

  /** Plain navigation with no SSO redemption — for the unauthenticated-access check. */
  async gotoUnauthenticated(path: string): Promise<void> {
    await this.goto(path);
  }

  /** The FloorOS "Sign in" gate is shown and no event data is rendered. */
  async expectSignInGateWithoutEventData(eventTitle: RegExp): Promise<void> {
    await expect(this.locators.signInButton).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(eventTitle)).toHaveCount(0);
    await expect(this.locators.sectionHeading('System')).toHaveCount(0);
  }

  /** Clicking Sign in without a session goes to the Keycloak (SSO) credential form. */
  async expectSignInLeadsToSsoLogin(): Promise<void> {
    await this.locators.signInButton.click();
    await expect(this.page).toHaveURL(/\/auth\/realms\/[^/]+\/protocol\/openid-connect\/auth/, {
      timeout: 30_000,
    });
    await expect(this.locators.ssoPasswordInput).toBeVisible();
  }
}

export type EventStatusTab =
  'All' | 'Planning' | 'To Attend' | 'Attended' | 'Not Attending' | 'Elapsed';

export interface EventRowData {
  title: string;
  type: string;
  status: string;
}

/** The AI planning sections dev renders on the Planning tab (Sprint 5). */
export const PLANNING_AI_SECTIONS = [
  'External Event Summary',
  'Participant Summary',
  'Visitor Summary',
  'External Event Schedule',
  "External Event's Contact Details",
] as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
