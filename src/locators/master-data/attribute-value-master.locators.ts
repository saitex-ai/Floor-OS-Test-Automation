import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Attribute
 * Value Master screen, under Inventory Item Management
 * (/master-data/inventory-item-management/attribute-values). No actions or
 * assertions here, see
 * src/pages/master-data/attribute-value-master.page.ts for those.
 *
 * Confirmed directly against dev (2026-10-08) via real `ariaSnapshot()`
 * dumps and real create/edit/delete/deactivate round-trips
 * (`TCAV.../TCAVST...`-prefixed, all cleaned up via the real Delete flow
 * before finishing) — see test-cases/master-data/attribute-value-master/
 * attribute-value-master-testcases.md for the full narrative. This is the
 * richest of the three Inventory Item Management screens: a genuine
 * Draft/Approved/Rejected/Inactive approval workflow (same general shape as
 * TechpackTypeLocators), a real permanent-delete action, and a working
 * inline deactivate control — unlike its two sibling screens (Attribute
 * Master, Product Service Master), which have neither.
 *
 * Shape notes worth knowing before touching this file:
 * - Dialog-based, not routed — "Add Value"/row-click open a modal `dialog`
 *   ("Add Value"/"Edit Value") with no URL change.
 * - "Attribute Code" is picked via a nested grid-picker dialog ("Select
 *   Parent Attribute") — the same AG-grid-style component shape as
 *   Attribute Master's/Product Service Master's own "Pick item category"
 *   picker, just sourced from Attribute Master's 28 real attributes instead
 *   of the 174 item categories.
 * - The list's **Status column cell is itself a clickable `button`**
 *   (confirmed live, title "Change record status") — the one screen of the
 *   three where Status is interactive, not a read-only cell. Clicking it
 *   opens a small `menu` with a single "Change to Inactive" item (when
 *   Approved), which itself opens a confirmation `alertdialog` ("Change
 *   record status?" / "This record will be set to Inactive." / "Set to
 *   Inactive").
 * - The Edit dialog carries a "Delete <code>" button (top-left) — a real,
 *   permanent delete confirmed via a full round trip, with its own
 *   "Delete <code>?" `alertdialog` ("This permanently deletes <code>. This
 *   action cannot be undone."). Use only on throwaway test data.
 * - Opening a **Draft** record's Edit dialog (via the "Masters needing
 *   review" panel's "Review" button, or by clicking its row directly) adds
 *   two extra buttons not present on an Approved record's dialog: "Reject"
 *   and "Approve & make active" — confirmed live, same embedded-approval
 *   shape as TechpackTypeLocators' rejectButton/approveAndMakeActiveButton.
 * - User Attribute Value Code is confirmed live to be force-uppercased and
 *   capped at 20 characters (both silent — no inline warning for either).
 */
export class AttributeValueMasterLocators {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly addValueButton: Locator;
  readonly uploadButton: Locator;

  // "Masters needing review" panel (Draft items awaiting approval)
  readonly reviewRegion: Locator;

  // Add/Edit dialog (shared shape for both — only one open at a time)
  readonly dialog: Locator;
  readonly attributeValueCodeInput: Locator;
  readonly pickParentAttributeButton: Locator;
  readonly pickParentAttributeInput: Locator;
  readonly userAttributeValueCodeInput: Locator;
  readonly descriptionInput: Locator;
  readonly activeCheckbox: Locator;
  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly requiredError: Locator;
  readonly deleteButton: Locator;
  readonly rejectButton: Locator;
  readonly approveAndMakeActiveButton: Locator;

  // Nested "Select Parent Attribute" picker dialog
  readonly parentAttributePickerDialog: Locator;
  readonly parentAttributeFilterInput: Locator;

  // Permanent-delete confirmation — role="alertdialog", not "dialog" (same pattern as UoM/Techpack Type)
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteConfirmCancelButton: Locator;

  // Inline per-row "Change record status" menu + its own confirmation alertdialog
  readonly statusMenu: Locator;
  readonly changeToInactiveMenuItem: Locator;
  readonly changeStatusConfirmDialog: Locator;
  readonly setToInactiveButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Attribute Value Master' });
    this.searchInput = page.getByPlaceholder(/search by code, description or attribute name/i);
    this.addValueButton = page.getByRole('button', { name: 'Add Value' });
    this.uploadButton = page.getByRole('button', { name: 'Upload attribute values' });

    this.reviewRegion = page.getByRole('region', { name: /masters needing review/i });

    this.dialog = page.getByRole('dialog', { name: /^(Add Value|Edit Value)$/ });
    // exact: true matters here — "Attribute Value Code" is otherwise a
    // substring of "User Attribute Value Code *" too (Playwright's default
    // name match is substring, case-insensitive), which would make this
    // locator a strict-mode violation (confirmed by inspection of both
    // fields' real accessible names).
    this.attributeValueCodeInput = this.dialog.getByRole('textbox', {
      name: 'Attribute Value Code',
      exact: true,
    });
    this.pickParentAttributeButton = this.dialog.getByRole('button', {
      name: 'Pick parent attribute',
    });
    this.pickParentAttributeInput = this.dialog.getByRole('textbox', {
      name: 'Pick parent attribute',
    });
    this.userAttributeValueCodeInput = this.dialog.getByRole('textbox', {
      name: /^User Attribute Value Code/,
    });
    // Scoped to the dialog — the list grid behind it has its own resizable-
    // column handle aria-labeled "Resize Description column", which would
    // substring-match an unscoped locator (same trap documented on Techpack
    // Type's/Sample Request Creation's own locators files).
    this.descriptionInput = this.dialog.getByRole('textbox', { name: 'Description' });
    // Same unnamed-checkbox shape as Product Service Master's own "Status"
    // field (confirmed live) — "Active" is a separate adjacent text node,
    // not this checkbox's accessible name. This dialog has exactly one
    // checkbox total, so selecting it positionally is safe.
    this.activeCheckbox = this.dialog.getByRole('checkbox');
    this.createButton = this.dialog.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.requiredError = this.dialog.locator('p', { hasText: 'Required' });
    this.deleteButton = this.dialog.getByRole('button', { name: /^Delete/ });
    this.rejectButton = this.dialog.getByRole('button', { name: 'Reject', exact: true });
    this.approveAndMakeActiveButton = this.dialog.getByRole('button', {
      name: 'Approve & make active',
    });

    this.parentAttributePickerDialog = page.getByRole('dialog', {
      name: 'Select Parent Attribute',
    });
    this.parentAttributeFilterInput = this.parentAttributePickerDialog.getByRole('textbox', {
      name: 'Filter Attribute ID',
    });

    // Matched on the confirm dialog's own body copy ("This permanently
    // deletes <code>. This action cannot be undone.") rather than its
    // "Delete <code>?" heading — confirmed live more reliable, same
    // convention as UomLocators/TechpackTypeLocators.
    this.deleteConfirmDialog = page
      .getByRole('alertdialog')
      .filter({ hasText: /permanently deletes/i });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Delete',
      exact: true,
    });
    this.deleteConfirmCancelButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Cancel',
    });

    this.statusMenu = page.getByRole('menu');
    this.changeToInactiveMenuItem = this.statusMenu.getByRole('menuitem', {
      name: 'Change to Inactive',
    });
    this.changeStatusConfirmDialog = page.getByRole('alertdialog', {
      name: 'Change record status?',
    });
    this.setToInactiveButton = this.changeStatusConfirmDialog.getByRole('button', {
      name: 'Set to Inactive',
    });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  /** One of the All/Draft/Approved/Inactive/Rejected tab buttons, matched on its live count suffix. */
  tab(name: 'All' | 'Draft' | 'Approved' | 'Inactive' | 'Rejected'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${name}\\s*\\d`) });
  }

  /**
   * A list row anchored on any cell containing the given value code/
   * description/attribute text.
   *
   * Matched case-insensitively on purpose — confirmed via a real,
   * reproduced automation failure: User Attribute Value Code is
   * force-uppercased server-side on save (see TC:12), so a mixed-case code
   * used to create/search for a record (e.g. a human-readable test prefix
   * like "TCAVLock...") never literally appears in the grid; the cell
   * actually renders "TCAVLOCK...". A case-sensitive regex here found 0
   * rows even though the app's own search box had already correctly
   * filtered the grid down to the exact matching row (confirmed directly:
   * row count was 1, but the cell-text regex still didn't match it).
   */
  row(text: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(escapeRegExp(text), 'i') }),
    });
  }

  /** The Status-column cell of a given row — this is a clickable `button` here, unlike the other two screens. */
  statusButton(text: string): Locator {
    return this.row(text).getByRole('button');
  }

  rowCheckbox(text: string): Locator {
    return this.row(text).getByRole('checkbox');
  }

  /**
   * A row inside the "Select Parent Attribute" picker grid containing the
   * given Attribute ID. `hasText` (not `.filter({ has: <gridcell> })`) on
   * purpose — confirmed live (2026-10-08) this grid's row/gridcell elements
   * aren't true DOM descendants of one another (same virtualized
   * AG-grid-style shared component as Attribute Master's/Product Service
   * Master's own "Select Item Category" picker — a `.filter({ has })`
   * reliably finds 0 rows there even though the inner gridcell locator
   * resolves fine on its own; `hasText` reads the row's computed text
   * instead of checking DOM containment, and does find it). Safe as a
   * plain substring: the "Filter Attribute ID" column filter already
   * narrows the grid to the one matching row.
   */
  parentAttributePickerRow(attributeId: string): Locator {
    return this.parentAttributePickerDialog.getByRole('row').filter({ hasText: attributeId });
  }

  /** A "Masters needing review" panel item (code/description/attribute text) and its inline quick actions. */
  reviewListItem(text: string): Locator {
    return this.reviewRegion.getByRole('listitem').filter({ hasText: text });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
