import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for "New Techpack" — Classic (manual form). No
 * actions or assertions here, see src/pages/techpack/create-techpack.page.ts
 * for those. Confirmed against the real running form on dev.flooros.app
 * (dumped via ariaSnapshot()/outerHTML(), not guessed).
 *
 * Techpack Type / Style / Customer / Sample Request / Fabric / Season /
 * Wash / Product Type are all the same custom combobox: a `button` whose
 * accessible name is its own current value (placeholder text like "Search
 * styles..." until something is picked, then the picked value) — not a
 * stable name, and not a real `combobox` role, and its `<label>` has no
 * `for` attribute, so neither getByRole('combobox', {name}) nor
 * getByLabel() work here (unlike CRM's version of this same pattern).
 * fieldTrigger() locates each one by walking up from its label text to the
 * shared wrapper div instead — see the real DOM this was confirmed
 * against:
 *   <div class="space-y-2">
 *     <label>Style<span>*</span></label>
 *     <button aria-haspopup="listbox">Search styles...</button>
 *   </div>
 */
export class CreateTechpackLocators {
  readonly heading: Locator;
  readonly closeButton: Locator;

  readonly identificationSection: Locator;
  readonly productionSection: Locator;
  readonly lifecycleSection: Locator;
  readonly operationsSection: Locator;
  readonly documentsSection: Locator;

  readonly descriptionTextarea: Locator;
  readonly operationsTable: Locator;

  readonly techpackFileInput: Locator;
  readonly otherAttachmentsInput: Locator;
  readonly techpackFileDropzone: Locator;

  readonly fieldsFilledText: Locator;
  readonly readyToCreateText: Locator;
  readonly discardChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly createButton: Locator;

  // "Discard changes?" confirmation modal — shown on Cancel/"Discard
  // changes" once the form has any unsaved input.
  readonly discardChangesModal: Locator;
  readonly keepEditingButton: Locator;
  readonly discardAndLeaveButton: Locator;

  // "Techpack already exists" modal — shown on Create when the
  // Customer/Season/Style/Fabric/Wash combination matches an existing
  // techpack. See create-techpack.page.ts's doc comment.
  readonly duplicateExistsModal: Locator;
  readonly viewExistingButton: Locator;
  readonly createNewRevisionButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'New Techpack', level: 1 });
    this.closeButton = page.getByRole('button', { name: 'Close' });

    this.identificationSection = page.getByRole('heading', { name: 'Identification' });
    this.productionSection = page.getByRole('heading', { name: 'Production' });
    this.lifecycleSection = page.getByRole('heading', { name: 'Lifecycle' });
    this.operationsSection = page.getByRole('heading', { name: 'Operations' });
    this.documentsSection = page.getByRole('heading', { name: 'Documents' });

    this.descriptionTextarea = page.getByRole('textbox', { name: 'Description' });
    this.operationsTable = page.getByRole('table');

    // Two file inputs on the page: index 0 is the required techpack
    // document (accept="application/pdf,.pdf"), index 1 is the optional,
    // unrestricted "Other attachments" — confirmed via getAttribute(),
    // both are visually a styled dropzone button wrapping a hidden input.
    this.techpackFileInput = page.locator('input[type="file"]').nth(0);
    this.otherAttachmentsInput = page.locator('input[type="file"]').nth(1);
    this.techpackFileDropzone = page.getByRole('button', {
      name: /techpack document needed|PDF · exactly one/i,
    });

    // The footer status text switches from "N of 7 fields filled" to
    // "Ready to create" once every requirement (including the document)
    // is satisfied — confirmed against the real form, not guessed.
    this.fieldsFilledText = page.getByText(/of 7 fields filled/);
    this.readyToCreateText = page.getByText('Ready to create');
    this.discardChangesButton = page.getByRole('button', { name: 'Discard changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.createButton = page.getByRole('button', { name: 'Create techpack' });

    this.discardChangesModal = page.getByRole('dialog').filter({ hasText: 'Discard changes?' });
    this.keepEditingButton = this.discardChangesModal.getByRole('button', { name: 'Keep editing' });
    this.discardAndLeaveButton = this.discardChangesModal.getByRole('button', {
      name: 'Discard & leave',
    });

    this.duplicateExistsModal = page
      .getByRole('dialog')
      .filter({ hasText: 'Techpack already exists' });
    this.viewExistingButton = this.duplicateExistsModal.getByRole('button', {
      name: 'View existing',
    });
    this.createNewRevisionButton = this.duplicateExistsModal.getByRole('button', {
      name: 'Create new revision',
    });
  }

  /** Locates a field's trigger button by walking up from its (unlinked) label text. */
  fieldTrigger(labelText: string): Locator {
    return this.page.getByText(labelText, { exact: true }).locator('xpath=..').getByRole('button');
  }
}
