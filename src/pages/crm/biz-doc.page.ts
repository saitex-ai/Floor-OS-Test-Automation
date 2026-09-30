import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  BIZ_DOC_TYPES,
  BizDocLocators,
  type BizDocType,
} from '../../locators/crm/biz-doc.locators';

export { BIZ_DOC_TYPES, type BizDocType } from '../../locators/crm/biz-doc.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Biz Doc" (CRM, Sprint 2 user story) — a READ-ONLY viewing journey.
 * Owned by the CRM QA.
 *
 * Confirmed against the running app (2026-09-23): the three icons —
 * Sample Requests, Tech Packs, Quotes — live ONLY under a Customer
 * Details screen's own "Biz Docs" sub-tab. There is no CRM Home entry
 * point (the ClickUp text's assumption), and no separate "List screen" —
 * clicking an icon toggles it and loads a data table in place on the same
 * page. See biz-doc.locators.ts's class doc for the full list of
 * corrections this made to the original best-guess file.
 *
 * These entity types are created and owned by OTHER floorOS modules
 * upstream — CRM here is purely a read-only consumer/viewer. This
 * framework has no way to guarantee seed data exists for any one of them
 * in a fresh environment, so hasAnyRecords() must always be checked
 * before openFirstRecord() — never assume a row exists.
 */
export class BizDocPage extends BasePage {
  readonly locators: BizDocLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new BizDocLocators(page);
  }

  /** The only entry point — an existing Customer's Details screen, Biz Docs sub-tab. */
  async openFromCustomerDetails(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.bizDocsTabButton.click();
  }

  /**
   * Same navigation, without clicking the Biz Docs tab — for the RBAC
   * negative test (TC:5), where that tab is expected to be ABSENT for the
   * signed-in role. Clicking a button that may not exist would just
   * become the test's own failure instead of the thing being asserted.
   *
   * Confirmed against the running app: `canBizDocs` (customer-detail-
   * page.tsx) is a `useCan()` permission check that is FAIL-CLOSED —
   * false, and the tab absent, for EVERY role until the PolicySet
   * resolves async. A bare `expect(bizDocsTabButton).toBeHidden()` right
   * after navigation is a false positive: it can succeed on its very
   * first poll, before the permission check has answered either way (a
   * Manager's tab, checked too early, "passes" as hidden too — verified
   * directly). Waiting for an UNGATED tab first (Communication, present
   * for every role) proves the tab bar itself has rendered, so a
   * follow-on check of Biz Docs reflects the resolved permission, not a
   * loading gap.
   */
  async openFromCustomerDetailsWithoutTab(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.communicationTabButton.waitFor({ state: 'visible' });
  }

  /** FR-1/AC-1: all three icons are visible on the Biz Docs sub-tab. */
  async expectAllIconsVisible(): Promise<void> {
    for (const docType of BIZ_DOC_TYPES) {
      await expect(this.locators.bizDocIcon(docType)).toBeVisible();
    }
  }

  /** FR-2–FR-6/AC-2: clicking an icon loads that doc type's data table in place. */
  async openList(docType: BizDocType): Promise<void> {
    await this.locators.bizDocIcon(docType).click();
  }

  /** No separate "List screen" exists — confirms the icon is now the active/pressed one. */
  async expectListScreenVisible(docType: BizDocType): Promise<void> {
    await expect(this.locators.bizDocIcon(docType)).toHaveAttribute('aria-pressed', 'true');
  }

  /**
   * Whether the currently-open type's data table shows at least one
   * record row. These entity types are owned by other floorOS modules —
   * this framework has no way to guarantee seed data for any of them, so
   * the "click a record" drill-down (FR-7/AC-3) must ask this first
   * rather than assume a row exists, and skip cleanly (with a clear
   * reason) when it doesn't.
   */
  async hasAnyRecords(): Promise<boolean> {
    return (await this.locators.recordRows().count()) > 0;
  }

  /** FR-7/AC-3: clicking a record on a List screen opens its Details screen. */
  async openFirstRecord(): Promise<void> {
    await this.locators.recordRows().first().click();
  }

  /** UNCONFIRMED — see biz-doc.locators.ts's class doc: never exercised, no environment customer has Biz Doc data yet. */
  async expectDetailsScreenVisible(): Promise<void> {
    await expect(this.locators.detailsHeading).toBeVisible();
  }

  /**
   * Read-only check (TC:4): no Create/Edit/Delete/Save/Update control
   * should be present anywhere on the Biz Docs sub-tab — this journey
   * only ever views records that other modules own.
   */
  async expectListReadOnly(): Promise<void> {
    const container = this.locators.listContainer();
    await expect(this.locators.readOnlyControlButtons(container)).toHaveCount(0);
  }

  /** Read-only check (TC:4), Details screen equivalent of expectListReadOnly(). UNCONFIRMED — see expectDetailsScreenVisible(). */
  async expectDetailsReadOnly(): Promise<void> {
    const container = this.locators.detailsContainer();
    await expect(this.locators.readOnlyControlButtons(container)).toHaveCount(0);
  }
}
