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
  //
  // Corrected 2026-09-28: confirmed live on uat that the modal no longer
  // shows a separate "View existing" + disabled "Create new revision"
  // button pair — it now shows the Techpack Code, "Latest Revision: Rev N
  // · <Status>", an informational "Approve revision N of <code> before
  // branching a new revision." line, and a single "Open" button. Whether
  // a real "Create new revision" button ever appears once the existing
  // revision IS approved (rather than just being hidden here, as opposed
  // to disabled) isn't confirmed — `createNewRevisionButton` is kept in
  // case it does, but don't assume it's always present.
  readonly duplicateExistsModal: Locator;
  readonly openExistingButton: Locator;
  readonly createNewRevisionButton: Locator;

  // "Add new value" flow on a required combobox (confirmed on Techpack
  // Type — see create-techpack-classic.md's TC:9 and ClickUp z941abxb20).
  // Reached by searching a listbox for a value that doesn't exist yet;
  // the listbox then offers this button alongside "No <label>s match."/
  // "Browse all in table". The resulting dialog's own Code field has no
  // visible max-length constraint or character counter — confirmed live
  // it accepts a 25-char code with no error (the server's real limit is
  // 20), which is the bug this locator set exists to demonstrate.
  readonly addNewValueButton: Locator;
  readonly addTechpackTypeDialog: Locator;
  readonly addTechpackTypeCodeInput: Locator;
  readonly addTechpackTypeNameInput: Locator;
  readonly addTechpackTypeAddButton: Locator;

  // The raw, unformatted AJV/JSON-Schema validation error this bug
  // eventually surfaces at "Create techpack" once the over-length value
  // is submitted — a sonner toast (same convention as CRM's own
  // `[data-sonner-toast]`, see create-customer.locators.ts) whose body is
  // literally a JSON array, e.g.
  // `[{"instancePath":"/techpackTypeCode",...,"keyword":"maxLength",...}]`.
  readonly rawJsonErrorToast: Locator;
  readonly noTechpackTypesMatchText: Locator;

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
    this.openExistingButton = this.duplicateExistsModal.getByRole('button', { name: 'Open' });
    this.createNewRevisionButton = this.duplicateExistsModal.getByRole('button', {
      name: 'Create new revision',
    });

    this.addNewValueButton = page.getByRole('button', { name: 'Add new value' });
    this.addTechpackTypeDialog = page.getByRole('dialog', { name: 'Add techpack type' });
    this.addTechpackTypeCodeInput = this.addTechpackTypeDialog.getByRole('textbox', {
      name: 'Code *',
    });
    this.addTechpackTypeNameInput = this.addTechpackTypeDialog.getByRole('textbox', {
      name: 'Name *',
    });
    this.addTechpackTypeAddButton = this.addTechpackTypeDialog.getByRole('button', { name: 'Add' });

    this.noTechpackTypesMatchText = page.getByText('No techpack types match.');
    this.rawJsonErrorToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: 'instancePath' });
  }

  /** Locates a field's trigger button by walking up from its (unlinked) label text. */
  /** A combobox option whose accessible name matches, in the open listbox. */
  comboboxOption(name: RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  /** Text anywhere on the form, e.g. an uploaded file's name. */
  text(content: string): Locator {
    return this.page.getByText(content);
  }

  fieldTrigger(labelText: string): Locator {
    return this.page.getByText(labelText, { exact: true }).locator('xpath=..').getByRole('button');
  }
}
