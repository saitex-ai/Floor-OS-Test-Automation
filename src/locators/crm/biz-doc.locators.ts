import { type Locator, type Page } from '@playwright/test';

/**
 * The Biz Doc entity types this journey covers (CRM, Sprint 2 user story
 * "Biz Docs", https://app.clickup.com/t/86eye4dtf). These entities are
 * created and owned by OTHER floorOS modules upstream — CRM only ever
 * displays them read-only (see biz-doc.page.ts's class doc).
 *
 * Confirmed against the running app: only these THREE are real, clickable
 * type toggles. The ClickUp text's "Sample Orders" and "Purchase Orders"
 * do not exist as distinct entries — there is a fourth item, "Orders", but
 * it renders as a non-interactive `note` (not a button/link) whose own
 * text says "Purchase Orders is not available in floorOS yet". It is
 * therefore not part of this read-only *viewing* journey at all.
 */
export const BIZ_DOC_TYPES = ['Sample Requests', 'Tech Packs', 'Quotes'] as const;

export type BizDocType = (typeof BIZ_DOC_TYPES)[number];

/**
 * Raw element locators for the Biz Doc read-only viewing journey — no
 * actions or assertions here, see src/pages/crm/biz-doc.page.ts for those.
 *
 * Confirmed against the running app (2026-09-23), correcting the
 * following guesses this file started with:
 *
 * - There is no "CRM Home" entry point at all. The three icons live ONLY
 *   under a Customer Details screen's own "Biz Docs" tab (a sub-tab
 *   alongside Overview / Lead Qualification / Communication / Contacts) —
 *   confirmed by reading the real page's accessibility tree, not by
 *   ClickUp text alone.
 * - Each icon's accessible name carries a live record count (e.g.
 *   "Sample Requests: 0"), not the bare type label — the old
 *   `exact: true` name match never matched any of them.
 * - Clicking an icon does not navigate to a separate "List screen" with
 *   its own `role="heading"`. It toggles that icon to `aria-pressed`
 *   and loads a data table (with search/filter/export controls) in place,
 *   on the SAME Customer Details page. There is no heading naming the doc
 *   type anywhere on this screen.
 * - The empty state reads "No records yet" (`emptyStateMessage`'s regex
 *   already covered this) with a table still present (header row, empty
 *   body) — `recordRows()` (row minus columnheader) still correctly
 *   counts zero.
 * - `listContainer()` no longer scopes to a heading's parent — there is
 *   none. Scoped to the whole page instead, matching this codebase's
 *   established fallback when no tighter real container exists.
 * - `detailsHeading`/`detailsContainer()` remain UNCONFIRMED: every
 *   customer available in this environment has zero Biz Doc records (they
 *   are seeded by other floorOS modules upstream), so `hasAnyRecords()`
 *   always skips before any Details screen is reached. Re-derive these
 *   once a customer with real Biz Doc data is available to click into.
 */
export class BizDocLocators {
  /** A Details screen's own heading, once a record row is clicked into. UNCONFIRMED — see class doc. */
  readonly detailsHeading: Locator;

  /** The Customer Details sub-tab that reveals the three icons below. */
  readonly bizDocsTabButton: Locator;
  /** An UNGATED Customer Details sub-tab (present for every role) — see openFromCustomerDetailsWithoutTab()'s doc. */
  readonly communicationTabButton: Locator;

  constructor(private readonly page: Page) {
    this.detailsHeading = page.getByRole('heading', { level: 1 });
    this.bizDocsTabButton = page.getByRole('button', { name: 'Biz Docs', exact: true });
    this.communicationTabButton = page.getByRole('button', { name: 'Communication', exact: true });
  }

  /**
   * One of the three Biz Doc type-toggle icons. Matched by a name PREFIX
   * (not exact) because the accessible name carries a live count suffix,
   * e.g. "Sample Requests: 0" — confirmed against the running app.
   */
  bizDocIcon(docType: BizDocType): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${docType}:`) });
  }

  /**
   * Every record row in the currently-open type's data table, minus the
   * header row. Deliberately not scoped to any particular record's text:
   * this journey can't assume any specific Biz Doc record is seeded (see
   * biz-doc.page.ts's class doc) — only that a row either exists or
   * doesn't.
   */
  recordRows(): Locator {
    return this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
  }

  /** Confirmed against the running app: the real empty-state copy. */
  emptyStateMessage(): Locator {
    return this.page.getByText(/no records yet/i);
  }

  /**
   * Scope for the read-only absence check (TC:4). No confirmed "list
   * panel" wrapper exists once a heading assumption is dropped — scoped to
   * the whole page, same reasoning as several other CRM locator files this
   * session (e.g. key-meeting-notes.locators.ts's detailDialog).
   */
  listContainer(): Locator {
    return this.page.locator('body');
  }

  /** Best-guess scope for the read-only absence check (TC:4) — see class doc. UNCONFIRMED. */
  detailsContainer(): Locator {
    return this.detailsHeading.locator('..');
  }

  /** Any Create/Edit/Delete/Save/Update control within a given container. */
  readOnlyControlButtons(container: Locator): Locator {
    return container.getByRole('button', { name: /^(Create|Edit|Delete|Save|Update)\b/i });
  }
}
