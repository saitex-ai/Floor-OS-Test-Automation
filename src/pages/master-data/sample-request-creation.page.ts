import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { SampleRequestCreationLocators } from '../../locators/master-data/sample-request-creation.locators';

export interface SampleRequestFieldValues {
  name: string;
  customer: string | RegExp;
  season?: string | RegExp;
  company: string | RegExp;
  /** "Costing required for this request" — defaults to off. */
  costingRequired?: boolean;
}

/**
 * The top-level Master Data module's Sample Request Creation screen
 * (/master-data/system-management/sample-request-creation). Owned by the
 * Master Data QA (shared module). Element locators live in
 * SampleRequestCreationLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Confirmed live against dev (2026-10-06) — see
 * test-cases/master-data/sample-request-creation/sample-request-creation-testcases.md
 * for the full narrative this page object is built from, including one
 * real app bug baked into the assertions below rather than papered over:
 * the list's own Status column renders a permanently blank badge on every
 * row, including a freshly created one (see expectStatusColumnBlank()).
 * The underlying Draft/Posted status is real — it just isn't rendered in
 * the list, only in the Edit modal's lock-state hint text.
 */
export class SampleRequestCreationPage extends BasePage {
  readonly locators: SampleRequestCreationLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SampleRequestCreationLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated('/master-data/system-management/sample-request-creation');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.createNewButton).toBeVisible();
  }

  /**
   * Fills the search box and waits for the grid's row count to settle
   * before returning — same fix as SizePage/ColorPage/UomPage/
   * TechpackTypePage: this grid only renders a bounded window of rows, so
   * a just-created row can be completely absent from the DOM on the
   * unfiltered list, and searching for it immediately after creation can
   * race the grid's own re-fetch.
   */
  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
    await this.waitForRowsToSettle();
  }

  /** Polls the main grid's row count until two consecutive reads agree, up to ~5s. */
  private async waitForRowsToSettle(): Promise<void> {
    const rows = this.page.getByRole('row');
    let previous = -1;
    for (let i = 0; i < 20; i++) {
      const current = await rows.count();
      if (current === previous) return;
      previous = current;
      await this.page.waitForTimeout(250);
    }
  }

  async openCreateModal(): Promise<void> {
    await this.locators.createNewButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /**
   * Fills whichever of Name/Customer/Season/Company/Costing are given, in
   * the currently-open New dialog. Season is only selectable once a
   * Customer is chosen (the screen's own hint: "Select a customer
   * first.") — pass both together when you need a real Season value.
   * Selecting a Customer resets any prior Season choice (confirmed live),
   * so always (re-)select Season after Customer in the same call.
   */
  async fillForm(values: Partial<SampleRequestFieldValues>): Promise<void> {
    if (values.name !== undefined) await this.locators.nameInput.fill(values.name);

    if (values.customer !== undefined) {
      await this.selectPicker('customer', values.customer);
    }
    if (values.season !== undefined) {
      await this.selectPicker('season', values.season);
    }
    if (values.company !== undefined) {
      await this.selectPicker('company', values.company);
    }
    if (values.costingRequired) {
      await this.locators.costingRequiredSwitch.click();
    }
  }

  private async selectPicker(
    field: 'customer' | 'season' | 'company',
    optionText: string | RegExp,
  ): Promise<void> {
    await this.locators.pickerTrigger(field).click();
    await this.locators.pickerOption(optionText).first().click();
  }

  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  /** Discards the open New dialog without saving. */
  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Searches by text first when it's a plain string — see search()'s doc on why. */
  async openRowForEdit(text: string | RegExp): Promise<void> {
    if (typeof text === 'string') await this.search(text);
    await this.locators.row(text).click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /**
   * Clicks the Edit modal's single header toggle icon — "Post <code>" on
   * a Draft request (moves it to Posted) or "Open <code>" on a Posted one
   * (confirmed live to exist as the icon's label; not confirmed whether it
   * actually reverts to Draft — see the test-cases file's Notes). No
   * confirmation dialog either way.
   */
  async clickPostOrOpenToggle(): Promise<void> {
    await this.locators.postOrOpenToggle.click();
  }

  /** Clicks "Delete <SR code>" then confirms on the nested "Delete <code>? ... cannot be undone." dialog. */
  async deleteRecord(): Promise<void> {
    await this.locators.deleteIconButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmButton.click();
  }

  // ---- Assertions -------------------------------------------------------

  /** Real toast text confirmed live: "Sample request created." (with a trailing period). */
  async expectCreatedToast(): Promise<void> {
    await expect(this.page.getByText('Sample request created.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Sample request updated." (with a trailing period). */
  async expectUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Sample request updated.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Sample request(s) deleted." — literal "(s)" even for one record. */
  async expectDeletedToast(): Promise<void> {
    await expect(this.page.getByText('Sample request(s) deleted.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * This screen blocks submission by disabling "Save" rather than showing
   * "Required" errors after a failed submit attempt (confirmed live,
   * contrast with Techpack Type) — assert on the button's disabled state.
   */
  async expectSaveDisabled(): Promise<void> {
    await expect(this.locators.saveButton).toBeDisabled();
  }

  async expectSaveEnabled(): Promise<void> {
    await expect(this.locators.saveButton).toBeEnabled();
  }

  /** Draft state: Customer/Season/Company locked, confirmed via the Edit modal's own hint text. */
  async expectLockedForDraft(): Promise<void> {
    await expect(
      this.locators.dialog.getByText('Customer, Season & Company are locked for a draft request.'),
    ).toBeVisible();
  }

  /** Posted state: Customer/Season/Company unlocked, confirmed via the Edit modal's own hint text. */
  async expectUnlockedForPosted(): Promise<void> {
    await expect(
      this.locators.dialog.getByText(
        /This request is Posted — Customer, Season & Company can be changed\./,
      ),
    ).toBeVisible();
  }

  /** Searches by text first when it's a plain string — see search()'s doc on why. */
  async expectRowVisible(text: string | RegExp): Promise<void> {
    if (typeof text === 'string') await this.search(text);
    await expect(this.locators.row(text).first()).toBeVisible();
  }

  async expectRowNotVisible(text: string | RegExp): Promise<void> {
    if (typeof text === 'string') await this.search(text);
    await expect(this.locators.row(text)).toHaveCount(0);
  }

  async expectRowCount(text: string | RegExp, count: number): Promise<void> {
    if (typeof text === 'string') await this.search(text);
    await expect(this.locators.row(text)).toHaveCount(count);
  }

  /**
   * KNOWN APP BUG (confirmed live 2026-10-06, re-checked after a 10s+
   * wait to rule out a slow load): the Status column renders a visually
   * blank pill for every row, including one created moments earlier in
   * the same test — never any text. Asserting the bug's current, real
   * behavior on purpose rather than papering over it; flip this
   * assertion (to a real status string) once the app fixes it.
   */
  async expectStatusColumnBlank(text: string | RegExp): Promise<void> {
    await expect(this.locators.statusCell(text)).toHaveText('');
  }
}
