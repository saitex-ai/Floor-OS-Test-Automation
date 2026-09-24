import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ScanCreateLocators } from '../../locators/crm/scan-create.locators';

/** Customers list, under the CRM module (confirmed against the running app — see create-customer.page.ts). */
const CUSTOMERS_LIST_PATH = '/crm/customers';

/**
 * A real sample scan file (a rendered business card) this suite uses to
 * drive Start Scan end to end. Generated with Playwright's own Chromium
 * (`page.pdf()` over a small HTML business card) rather than a checked-in
 * binary asset — cheap to regenerate, and avoids committing an opaque PDF.
 *
 * Confirmed against the running app (2026-09-23): with this file, a real
 * scan reliably extracts all of Contact Name, Designation, Email, Phone,
 * City, Country (Contact side) and Customer Name, City, Country (Customer
 * side) — see scan-create.locators.ts's class doc.
 *
 * Operational note: after many consecutive real vision calls (e.g. running
 * this whole file back to back), the local Ollama server can get into a
 * state where a request never returns at all — confirmed directly, one
 * extraction call sat with no response for 4+ minutes; restarting Ollama
 * (`kill` the `ollama serve` process, then `OLLAMA_HOST=0.0.0.0 ollama
 * serve`) cleared it and the very next run passed normally. Not a code
 * bug — a resource-exhaustion characteristic of a CPU-only local model
 * under sustained back-to-back load.
 *
 * Getting a real scan to complete needed an environment fix, not just a
 * test fixture: `docker/litellm/config.yaml`'s `vision-default` binding
 * (svc-agent-extraction's `vision_complete` always calls this binding by
 * name — `ENABLE_LOCAL_VISION`, referenced only in comments, is not wired
 * up anywhere in code) pointed at a cloud model behind a placeholder
 * `OPENAI_API_KEY` (13 chars, confirmed not real), so every scan failed
 * silently ("No values could be read from this document"). Retargeted
 * that binding onto local Ollama (`qwen2.5vl:7b`) instead — the same
 * fix already applied to `reasoning-local` elsewhere in that file — using
 * litellm's native `ollama_chat/` provider (not the `openai/`+`/v1` shape
 * the other on-prem bindings use), because that's what actually accepts
 * `num_ctx`: the first attempt via `/v1` 400'd with
 * `ContextWindowExceededError` (Ollama's 4096-token default is smaller
 * than one real image+prompt request, confirmed at 5312 tokens). Also
 * raised `services/svc-crm/.env`'s `AGENT_EXTRACTION_TIMEOUT_MS` (default
 * 45s) to 90s — confirmed the local model, even warm, can take longer
 * than 45s on this hardware — with `AGENT_EXTRACTION_PRESIGNED_TTL_MS`
 * raised alongside it to keep svc-crm's own margin assertion satisfied.
 */
export const SAMPLE_SCAN_FILE_PATH = 'test-data/crm/sample-business-card.pdf';

/**
 * "Scan&Create Customer/Contact" (CRM, Sprint 2 user story). Owned by the
 * CRM QA.
 *
 * Confirmed against the running app (2026-09-23), including a full real
 * scan-to-save run — see ScanCreateLocators' class doc for the specific
 * corrections that made to the original ClickUp-text guesses, and
 * SAMPLE_SCAN_FILE_PATH's doc above for the environment fix that made a
 * real scan possible at all. `capturePhoto()` still can't be exercised
 * headlessly in this environment (no device camera) — that one action
 * remains a best-guess click only.
 */
export interface ContactProfileScanDetails {
  name?: string;
  designation?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
}

export interface CustomerProfileScanDetails {
  name?: string;
  email?: string;
  city?: string;
  country?: string;
}

/** No owner/businessProcess/assignee/referredBy — confirmed against the running app, this screen has none of those fields. */
export interface CustomerManagementScanDetails {
  crmStage?: string;
  originType?: string;
  origin?: string;
  buyer?: string;
}

export class ScanCreatePage extends BasePage {
  readonly locators: ScanCreateLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ScanCreateLocators(page);
  }

  /** "Scan & Create" lives inside the Customers list's "More actions" dropdown, not as its own button. */
  async openFromCustomersList(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.locators.moreActionsButton.click();
    await this.locators.scanCreateMenuItem.click();
  }

  /** TC:1 — upload/capture provisions are present before anything is scanned. */
  async expectScanProvisionsVisible(): Promise<void> {
    await expect(this.locators.fileUploadInput).toBeAttached();
    await expect(this.locators.capturePhotoButton).toBeVisible();
    await expect(this.locators.startScanButton).toBeVisible();
  }

  async uploadFile(filePath: string = SAMPLE_SCAN_FILE_PATH): Promise<void> {
    await this.locators.fileUploadInput.setInputFiles(filePath);
  }

  /**
   * Best-guess click only — camera capture cannot be exercised headlessly
   * in this environment (no device camera), so this makes no claim beyond
   * "the button exists and is clickable".
   */
  async capturePhoto(): Promise<void> {
    await this.locators.capturePhotoButton.click();
  }

  /**
   * Confirmed against the running app: a real extraction call against the
   * local vision model varies 35-90s+ run to run (cold or warm) — well
   * past Playwright's 5s default expect timeout. 150s matches
   * AGENT_EXTRACTION_TIMEOUT_MS's own budget (see SAMPLE_SCAN_FILE_PATH's
   * doc) — callers must set their own `test.setTimeout()` well above
   * this (test.slow()'s x3 alone isn't enough headroom), or the test's
   * OWN overall timeout fires first and cuts this wait off early
   * (confirmed: happened at the default x3 30s = 90s budget).
   *
   * A genuine "Scan failed" state (the agent didn't answer in time, or
   * errored) is a real, distinct outcome — included here so a caller gets
   * a clear failure message pointing at that heading, not a generic
   * "neither message appeared" timeout.
   */
  async startScan(): Promise<void> {
    await this.locators.startScanButton.click();
    await expect(
      this.locators.scanCompleteMessage
        .or(this.locators.noValuesReadMessage)
        .or(this.locators.scanFailedHeading),
    ).toBeVisible({ timeout: 150_000 });
    if (await this.locators.scanFailedHeading.isVisible().catch(() => false)) {
      throw new Error('Scan & Create reported "Scan failed" — see the alert text on screen for why.');
    }
  }

  /** TC:2 — post-scan fields render. There is no `<section>` wrapper (see class doc) — checked via a representative field from each of the three groups instead. */
  async expectPostScanSectionsVisible(): Promise<void> {
    await expect(this.locators.contactNameInput).toBeVisible();
    await expect(this.locators.customerNameInput).toBeVisible();
    await expect(this.locators.crmStageCombobox).toBeVisible();
  }

  /**
   * TC:2/TC:3 — asserts each given text-input Locator holds SOME value.
   * Pass the specific post-scan fields the caller wants to check.
   */
  async expectInputsPopulated(inputs: Locator[]): Promise<void> {
    for (const input of inputs) {
      await expect(input).not.toHaveValue('');
    }
  }

  /** TC:3 — edits a post-scan-populated Contact Profile field to prove it's editable (FR-5). */
  async fillContactProfile(details: ContactProfileScanDetails): Promise<void> {
    const l = this.locators;
    if (details.name !== undefined) await l.contactNameInput.fill(details.name);
    if (details.designation !== undefined) await l.designationInput.fill(details.designation);
    if (details.email !== undefined) await l.contactEmailInput.fill(details.email);
    if (details.phone !== undefined) await l.contactPhoneInput.fill(details.phone);
    if (details.city !== undefined) await l.contactCityInput.fill(details.city);
    if (details.country !== undefined)
      await this.selectComboboxOption(l.contactCountryCombobox, details.country);
  }

  /** TC:3/TC:4 — edits post-scan-populated Customer Profile fields (FR-5). */
  async fillCustomerProfile(details: CustomerProfileScanDetails): Promise<void> {
    const l = this.locators;
    if (details.name !== undefined) await l.customerNameInput.fill(details.name);
    if (details.email !== undefined) await l.customerEmailInput.fill(details.email);
    if (details.city !== undefined) await l.customerCityInput.fill(details.city);
    if (details.country !== undefined)
      await this.selectComboboxOption(l.customerCountryCombobox, details.country);
  }

  /** TC:4 — selects post-scan Customer Management dropdowns. Confirmed against the running app: exactly CRM Stage/Origin Type/Origin/Buyer exist — no Owner/Business Process/Assignee/Referred By on this screen. */
  async fillCustomerManagement(details: CustomerManagementScanDetails): Promise<void> {
    const l = this.locators;
    if (details.crmStage !== undefined)
      await this.selectComboboxOption(l.crmStageCombobox, details.crmStage);
    if (details.originType !== undefined)
      await this.selectComboboxOption(l.originTypeCombobox, details.originType);
    if (details.origin !== undefined)
      await this.selectComboboxOption(l.originCombobox, details.origin);
    if (details.buyer !== undefined)
      await this.selectComboboxOption(l.buyerCombobox, details.buyer);
  }

  /** Same shape as CreateCustomerPage's/CreateContactPage's — see those files for why both popup shapes are tried. */
  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }

  /** Selects the FIRST available option for a Customer Management dropdown, whatever it is — used where the real option set isn't seeded/predictable. */
  async selectFirstOption(combobox: Locator): Promise<string> {
    await combobox.click();
    const option = this.page.getByRole('option').first();
    const text = await option.innerText();
    await option.click();
    return text;
  }

  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** FR-7 — data-type errors highlighted on the respective fields. */
  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectDuplicateWarningVisible(): Promise<void> {
    await expect(this.locators.duplicateWarningModal).toBeVisible();
  }

  /**
   * Confirmed against the running app: Save does NOT open a "created
   * successfully" modal — it redirects straight to the new Customer's own
   * Details screen with a toast reading "{Customer} + {Contact} created
   * from scan". Checked via the toast (the modal this originally assumed
   * doesn't exist).
   */
  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.locators.toast).toBeVisible();
    await expect(this.page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
  }

  /**
   * FR-8 — Cancel sits to the LEFT of its sibling primary action.
   * Compared via bounding-box x position rather than DOM order, since
   * visual left/right is what the acceptance criterion actually means
   * and flex/grid layouts can reorder DOM vs. visual position.
   *
   * Pre-scan, "Save" doesn't exist yet (Contact Profile/Customer
   * Profile/Customer Management only render post-scan) — the only other
   * action button at that point is "Start scan", so TC:9 compares Cancel
   * against that instead.
   */
  async expectCancelLeftOf(otherButton: Locator): Promise<void> {
    const [cancelBox, otherBox] = await Promise.all([
      this.locators.cancelButton.boundingBox(),
      otherButton.boundingBox(),
    ]);
    expect(cancelBox, 'Cancel button should have a bounding box').not.toBeNull();
    expect(otherBox, 'Other button should have a bounding box').not.toBeNull();
    expect(cancelBox!.x).toBeLessThan(otherBox!.x);
  }

  async openNotificationsPanel(): Promise<void> {
    await this.locators.notificationsBellButton.click();
    await expect(this.locators.notificationsPanel).toBeVisible();
  }

  /** TC:6 — system notification listed under the Notification Bell (email delivery cannot be checked from the UI). */
  async expectNotificationVisible(text: string): Promise<void> {
    await expect(this.locators.notificationItem(text)).toBeVisible();
  }
}
